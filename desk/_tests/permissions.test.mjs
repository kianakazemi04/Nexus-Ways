// Written project permission from the project's sales office (owner instruction, 28 Oct 2026) — run with:
//   node --test desk/_tests/permissions.test.mjs
// The owner works as a freelance agent with written permission from each project's sales office. A recorded permission
// satisfies the project's advertising/media authorization within its stated channels, activities, media and dates —
// and nothing beyond them. TEST-ONLY data in temporary copies.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { realSetup, publishedSetup, cli, readJson, OPP, DSC1, approveImages, TODAY } from './helpers.mjs';

const prepare = (mutate) => {
  const s = realSetup({ mutate });
  const r = cli(s.repo, ['ingest', '--package', s.base, ...s.S, '--apply']);
  if (r.code !== 0) { s.cleanup(); throw new Error(r.out); }
  cli(s.repo, ['approve-disclosure', ...s.S, '--id', DSC1, '--by', 'owner']);
  return s;
};
const approve = (s) => cli(s.repo, ['approve', ...s.S, '--id', OPP, '--by', 'owner']);
const perms = (s) => readJson(path.join(s.store, 'private/permissions.json'));
const media = (s) => readJson(path.join(s.store, 'data/media.json')).records;

test('a recorded sales-office permission is stored privately with its document hash and drives the media permissions', () => {
  const s = prepare((i) => { for (const m of i.media) if (i.permissions[0].media.includes(m.file)) delete m.permission; i.permissions[0].attribution_text = '© TEST-ONLY Developer'; });
  try {
    const p = perms(s); assert.equal(p.length, 1);
    assert.equal(p[0].id, 'PRIV-PERM-TST-1'); assert.match(p[0].document.sha256, /^[0-9a-f]{64}$/); assert.equal(p[0].issuer.role, 'DEVELOPER_SALES_OFFICE');
    const derived = media(s).filter(m => m.permission.evidence_ref === 'PRIV-PERM-TST-1');
    assert.ok(derived.length >= 3);
    for (const m of derived) { assert.equal(m.permission.status, 'GRANTED_WRITTEN'); assert.deepEqual(m.permission.scope, ['desk_web']); assert.equal(m.permission.granted_at, '2026-10-21'); }
    assert.ok(derived.some(m => m.attribution.required && m.attribution.text === '© TEST-ONLY Developer'), 'attribution required by the permission is carried');
    // the verbal and restricted images are not covered and keep their own (non-publishable) status
    assert.ok(media(s).some(m => m.permission.status === 'GRANTED_VERBAL'));
    approveImages(s); assert.equal(approve(s).code, 0, 'the permission satisfies the project authorization within its scope');
    // nothing about the permission reaches the public tree
    assert.equal(cli(s.repo, ['export', ...s.S, '--id', OPP]).code, 0);
    const pubText = JSON.stringify(readJson(path.join(s.repo, 'desk/data/public/media.json')));
    assert.ok(!pubText.includes('sales office') && !pubText.includes('permission-email'), 'no permission document or issuer details in public data');
  } finally { s.cleanup(); }
});

test('without a written project permission the opportunity cannot be approved', () => {
  const s = prepare((i) => { i.permissions = []; });
  try { approveImages(s); const r = approve(s); assert.equal(r.code, 1); assert.match(r.out, /project permission: no written project permission from the sales office recorded/); }
  finally { s.cleanup(); }
});

test('a permission is honoured only within its channels, activities and dates', () => {
  const cases = [
    ['expired', (x) => { x.valid_until = '2026-10-22'; }, /PRIV-PERM-TST-1 expired on 2026-10-22/],
    ['social media only', (x) => { x.channels = ['social']; }, /does not name the Desk website \(desk_web\)/],
    ['media only, no project information', (x) => { x.activities = ['PUBLISH_MEDIA']; }, /does not authorize PUBLISH_PROJECT_INFORMATION/],
    ['dated in the future', (x) => { x.granted_at = '2026-12-01'; }, /has no valid grant date/]
  ];
  for (const [name, spoil, re] of cases) {
    const s = prepare((i) => spoil(i.permissions[0]));
    try {
      approveImages(s); const r = approve(s); assert.equal(r.code, 1, name); assert.match(r.out, re, name);
    } finally { s.cleanup(); }
  }
});

test('images whose permission record is missing, expired or not for the Desk website are never publishable', () => {
  const s = prepare();
  try {
    const p = path.join(s.store, 'private/permissions.json'); const j = perms(s);
    j[0].channels = ['corporate_web']; // the e-mail allowed the company site only
    fs.writeFileSync(p, JSON.stringify(j, null, 2) + '\n');
    const res = approveImages(s);
    assert.ok(res.length && res.every(([, code]) => code !== 0), JSON.stringify(res));
    const g = cli(s.repo, ['gate', ...s.S]); assert.match(g.out, /project permission: PRIV-PERM-TST-1 does not name the Desk website/);
  } finally { s.cleanup(); }
});

test('the published lifecycle still works end to end with a permission recorded (regression)', () => {
  const s = publishedSetup();
  try { assert.ok(readJson(path.join(s.repo, 'desk/data/public/published.json')).opportunities.includes(OPP)); assert.equal(TODAY, '2026-10-28'); }
  finally { s.cleanup(); }
});

test('a permission received after ingestion is recorded with record-permission; it covers only the images it lists', () => {
  const s = prepare((i) => { i.permissions = []; for (const m of i.media) if (m.permission.status === 'GRANTED_WRITTEN') m.permission = { status: 'NOT_REQUESTED', scope: [], evidence_ref: null, granted_at: null, expires_at: null }; });
  try {
    assert.equal(approve(s).code, 1);
    const dir = path.join(s.store, 'incoming'); fs.mkdirSync(dir);
    fs.writeFileSync(path.join(dir, 'email.txt'), 'TEST-ONLY permission e-mail');
    const perm = { id: 'PRIV-PERM-TST-9', project_id: 'PRJ-TST-ILLUSTRATIVE-RESIDENCE-A', issuer: { name: 'TEST-ONLY sales office', role: 'DEVELOPER_SALES_OFFICE' }, document: 'email.txt', granted_at: '2026-10-25', valid_until: null, channels: ['desk_web'], activities: ['PUBLISH_PROJECT_INFORMATION', 'PUBLISH_MEDIA'], media: ['raw/exterior.jpg', 'raw/interior.png', 'raw/amenity.jpg'] };
    fs.writeFileSync(path.join(dir, 'perm.json'), JSON.stringify(perm));
    assert.notEqual(cli(s.repo, ['record-permission', ...s.S, '--file', path.join(dir, 'perm.json')]).code, 0, 'needs --by owner');
    const r = cli(s.repo, ['record-permission', ...s.S, '--file', path.join(dir, 'perm.json'), '--by', 'owner']); assert.equal(r.code, 0, r.out);
    const got = media(s).filter(m => m.permission.evidence_ref === 'PRIV-PERM-TST-9');
    assert.equal(got.length, 3);
    assert.ok(media(s).some(m => m.permission.status === 'GRANTED_VERBAL'), 'unlisted images are not changed');
    approveImages(s); assert.equal(approve(s).code, 0);
    assert.ok(readJson(path.join(s.store, 'private/audit_log.json')).some(a => a.action === 'record-permission'));
  } finally { s.cleanup(); }
});
