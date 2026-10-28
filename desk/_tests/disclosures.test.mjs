// Standard disclosure templates (owner decision K-3, audit 28 Oct 2026) — run with: node --test desk/_tests/disclosures.test.mjs
// Both standard texts are adopted by the owner (28 Oct 2026) and reused as APPROVED; the adoption binds the exact text, so
// a changed text is PENDING again until approved. The approval command stays tested with the adoption removed.
// TEST-ONLY data in temporary copies.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { realSetup, cli, readJson, writeJson, OPP, approveImages, ROOT } from './helpers.mjs';
import { commercialTextHits } from '../_tools/validate.mjs';

const TPL = readJson(path.join(ROOT, 'desk/_tools/disclosures/standard.json')).templates;
const withTemplates = (i) => { i.disclosures = [{ template: 'DT-COMMISSION-1' }, { template: 'DT-NOT-ADVICE-1' }]; };
const withoutAdoption = (repo) => { const f = path.join(repo, 'desk/_tools/disclosures/standard.json'); const j = readJson(f); for (const t of j.templates) delete t.adopted; writeJson(f, j); };

test('adopted standard texts: disclosures from them are APPROVED at ingestion and do not block publication', () => {
  const s = realSetup({ mutate: withTemplates });
  try {
    let r = cli(s.repo, ['ingest', '--package', s.base, ...s.S, '--apply']); assert.equal(r.code, 0, r.out);
    assert.match(r.out, /from template DT-COMMISSION-1: APPROVED \(standard text adopted 2026-10-28\)/);
    assert.ok(readJson(path.join(s.store, 'data/disclosures.json')).records.every(d => d.legal_review === 'APPROVED' && d.approved_at === '2026-10-28'));
    approveImages(s);
    r = cli(s.repo, ['approve', ...s.S, '--id', OPP, '--by', 'owner']); assert.equal(r.code, 0, r.out);
  } finally { s.cleanup(); }
});

test('standard texts exist in EN/TR/AR and carry no rate, amount or commercial term that the validator would block', () => {
  assert.deepEqual(TPL.map(t => [t.id, t.kind]), [['DT-COMMISSION-1', 'COMMISSION'], ['DT-NOT-ADVICE-1', 'LEGAL_NOTICE']]);
  for (const t of TPL) for (const l of ['en', 'tr', 'ar']) { assert.ok(t.text[l] && t.text[l].length > 60, `${t.id} ${l}`); assert.deepEqual(commercialTextHits(t.text[l]), [], `${t.id} ${l}`); }
});

test('without adoption: template disclosures are PENDING and block approval; after one approval: reused as APPROVED', () => {
  const s = realSetup({ mutate: withTemplates });
  try {
    withoutAdoption(s.repo);
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

test('optional advertising permit: stored when given, absent otherwise, never required; shown on the opportunity page only when present', () => {
  const s = realSetup({ mutate: (i) => { withTemplates(i); i.opportunity = { ...(i.opportunity || {}), advertising_permit: 'TEST-ONLY 7123456' }; } });
  try {
    const r = cli(s.repo, ['ingest', '--package', s.base, ...s.S, '--apply']); assert.equal(r.code, 0, r.out);
    assert.equal(readJson(path.join(s.store, 'data/opportunities.json')).records[0].advertising_permit, 'TEST-ONLY 7123456');
    approveImages(s);
    assert.equal(cli(s.repo, ['approve', ...s.S, '--id', OPP, '--by', 'owner']).code, 0);
  } finally { s.cleanup(); }
  const s2 = realSetup({ mutate: withTemplates });
  try {
    assert.equal(cli(s2.repo, ['ingest', '--package', s2.base, ...s2.S, '--apply']).code, 0);
    assert.equal(readJson(path.join(s2.store, 'data/opportunities.json')).records[0].advertising_permit, null);
    approveImages(s2);
    assert.equal(cli(s2.repo, ['approve', ...s2.S, '--id', OPP, '--by', 'owner']).code, 0, 'no permit needed');
  } finally { s2.cleanup(); }
  const js = fs.readFileSync(path.join(ROOT, 'desk/assets/js/opportunity.js'), 'utf8');
  assert.match(js, /o\.advertising_permit \? `<p class="mut" data-ad-permit/);
});
