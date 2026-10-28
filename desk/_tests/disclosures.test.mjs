// Standard disclosure templates (owner decision K-3, audit 28 Oct 2026) — run with: node --test desk/_tests/disclosures.test.mjs
// One owner approval of an exact standard text is reused for every opportunity; a changed text needs a new approval;
// until approved, template disclosures stay PENDING and block publication. TEST-ONLY data in temporary copies.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { realSetup, cli, readJson, writeJson, OPP, approveImages, ROOT } from './helpers.mjs';
import { commercialTextHits } from '../_tools/validate.mjs';

const TPL = readJson(path.join(ROOT, 'desk/_tools/disclosures/standard.json')).templates;
const withTemplates = (i) => { i.disclosures = [{ template: 'DT-COMMISSION-1' }, { template: 'DT-NOT-ADVICE-1' }]; };

test('standard texts exist in EN/TR/AR and carry no rate, amount or commercial term that the validator would block', () => {
  assert.deepEqual(TPL.map(t => [t.id, t.kind]), [['DT-COMMISSION-1', 'COMMISSION'], ['DT-NOT-ADVICE-1', 'LEGAL_NOTICE']]);
  for (const t of TPL) for (const l of ['en', 'tr', 'ar']) { assert.ok(t.text[l] && t.text[l].length > 60, `${t.id} ${l}`); assert.deepEqual(commercialTextHits(t.text[l]), [], `${t.id} ${l}`); }
});

test('before approval: template disclosures are PENDING and block approval; after one approval: reused as APPROVED', () => {
  const s = realSetup({ mutate: withTemplates });
  try {
    let r = cli(s.repo, ['ingest', '--package', s.base, ...s.S, '--apply']); assert.equal(r.code, 0, r.out);
    assert.match(r.out, /from template DT-COMMISSION-1: PENDING — template not approved yet/);
    let ds = readJson(path.join(s.store, 'data/disclosures.json')).records;
    assert.ok(ds.length === 2 && ds.every(d => d.legal_review === 'PENDING'));
    approveImages(s);
    r = cli(s.repo, ['approve', ...s.S, '--id', OPP, '--by', 'owner']); assert.equal(r.code, 1); assert.match(r.out, /legal review pending/);
    assert.notEqual(cli(s.repo, ['approve-disclosure-template', ...s.S, '--id', 'DT-COMMISSION-1']).code, 0, 'needs --by owner');
    assert.notEqual(cli(s.repo, ['approve-disclosure-template', ...s.S, '--id', 'DT-UNKNOWN', '--by', 'owner']).code, 0);
    for (const id of ['DT-COMMISSION-1', 'DT-NOT-ADVICE-1']) { r = cli(s.repo, ['approve-disclosure-template', ...s.S, '--id', id, '--by', 'owner', '--reference', 'TEST-ONLY owner review']); assert.equal(r.code, 0, r.out); }
    ds = readJson(path.join(s.store, 'data/disclosures.json')).records;
    assert.ok(ds.every(d => d.legal_review === 'APPROVED' && d.approved_at), 'existing PENDING disclosures with the same text are approved');
    r = cli(s.repo, ['approve', ...s.S, '--id', OPP, '--by', 'owner']); assert.equal(r.code, 0, r.out);
    // a second project reuses the approval directly
    const pkg2 = s.mkPkg('PKG-TPL-2', (i) => { withTemplates(i); i.project = { ...i.project, name: 'TEST-ONLY Residence Template Two', slug: 'test-only-residence-template-two' }; i.developer = { ref: 'DEV-ILLUSTRATIVE-DEVELOPER-A' }; i.district = { ref: readJson(path.join(s.store, 'data/projects.json')).records[0].district_id }; i.media = []; i.permissions = []; });
    r = cli(s.repo, ['ingest', '--package', pkg2, ...s.S, '--apply']); assert.equal(r.code, 0, r.out);
    assert.match(r.out, /from template DT-COMMISSION-1: APPROVED \(template approval/);
    const audit = readJson(path.join(s.store, 'private/audit_log.json'));
    assert.equal(audit.filter(a => a.action === 'approve-disclosure-template').length, 2);
  } finally { s.cleanup(); }
});

test('an approval binds the exact text: after the template text changes, new disclosures are PENDING again', () => {
  const s = realSetup({ mutate: withTemplates });
  try {
    assert.equal(cli(s.repo, ['approve-disclosure-template', ...s.S, '--id', 'DT-COMMISSION-1', '--by', 'owner']).code, 0);
    const f = path.join(s.repo, 'desk/_tools/disclosures/standard.json'); const j = readJson(f);
    j.templates[0].text.en += ' TEST-ONLY changed sentence.'; writeJson(f, j);
    const r = cli(s.repo, ['ingest', '--package', s.base, ...s.S, '--apply']); assert.equal(r.code, 0, r.out);
    assert.match(r.out, /from template DT-COMMISSION-1: PENDING/);
  } finally { s.cleanup(); }
});

test('a package may not mix a template with its own text, nor use an unknown template', () => {
  const s = realSetup({ mutate: (i) => { i.disclosures = [{ template: 'DT-COMMISSION-1', kind: 'COMMISSION', text: { en: 'x' } }, { template: 'DT-NOPE' }]; } });
  try {
    const r = cli(s.repo, ['ingest', '--package', s.base, ...s.S, '--apply']); assert.notEqual(r.code, 0);
    assert.match(r.out, /give a template or kind \+ text, not both/); assert.match(r.out, /unknown disclosure template DT-NOPE/);
  } finally { s.cleanup(); }
});
