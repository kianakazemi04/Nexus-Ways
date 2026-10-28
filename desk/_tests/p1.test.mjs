// P0/P1 closure tests (B1–B7 of the closure brief) — run with:  node --test desk/_tests/p1.test.mjs
// Fixed clock everywhere (TODAY or explicit dates); synthetic TEST-ONLY data in temporary repository copies only.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { validateDataset, validateRepo } from '../_tools/validate.mjs';
import { evidenceFreshness, claimPublication, deriveLastVerified, reviewRule, REVIEW_POLICY } from '../assets/js/policy.js';
import { Txn, withTxn, recover, acquireLock, releaseLock, LockError, RecoveryConflictError, TxnError } from '../_tools/txn.mjs';
import { ROOT, TODAY, readJson, writeJson, tmp, codes, cli, snap, OPP, PRJ, DSC1, MED, realSetup, approveImages, publishedSetup, deskSnap, pub } from './helpers.mjs';

// ------------------------------------------------------------------ minimal datasets for unit rules
const base = (o = {}) => ({
  collections: {
    categories: [{ id: 'CAT-RE', key: 'real_estate', slug: 'real-estate', name: { en: 'Real Estate' }, activation: 'ACTIVE', is_illustrative: false }],
    markets: [{ id: 'MKT-T', slug: 't', name: 'T', country: 'TR', currency: 'TRY', category: 'real_estate', activation: 'ACTIVE', record_status: 'DRAFT', research_block_ids: [], evidence_ids: [], field_states: [], last_reviewed: null, is_illustrative: false, review: null }],
    sources: [{ id: 'SRC-T1', name: 'Registry', publisher: 'p', url: null, tier: 1, source_type: 'REGISTRY', accessed_at: null, is_illustrative: false },
      { id: 'SRC-T3', name: 'Developer kit', publisher: 'p', url: null, tier: 3, source_type: 'DEVELOPER_MATERIAL', accessed_at: null, is_illustrative: false },
      { id: 'SRC-T4', name: 'Listing', publisher: 'p', url: null, tier: 4, source_type: 'BROKER_LISTING', accessed_at: null, is_illustrative: false }],
    projects: [{ id: 'PRJ-T-A', category: 'real_estate', market_id: 'MKT-T', developer_id: null, name: 'A', slug: 'a', district_id: null, area_id: null, delivery_status: 'UNDER_CONSTRUCTION', expected_delivery: null, asset_types: [], record_status: 'DRAFT', research_block_ids: [], evidence_ids: [], risk_ids: [], field_states: [], is_illustrative: false }],
    opportunities: [{ id: 'OPP-T-A', category: 'real_estate', subject: { type: 'project', id: 'PRJ-T-A' }, market_id: 'MKT-T', asset_id: null, title: { en: 't' }, summary: { en: 's' }, record_status: 'DRAFT', disclosure_ids: [], evidence_ids: [], risk_ids: [], field_states: [], last_verified: null, is_illustrative: false, review: null }],
    evidence: [], risks: [], conflicts: [], media: [], disclosures: [], ...o
  }
});
const ev = (o) => ({ id: 'EVD-T-1', source_id: 'SRC-T3', subject: { type: 'project', id: 'PRJ-T-A' }, field: 'delivery_status', claim: { en: 'c' }, value: 'UNDER_CONSTRUCTION', unit: 'text', currency: null, geography: 'T', period: null, evidence_class: 'FACT', verification_status: 'DEVELOPER-CLAIM', source_tier: 3, retrieved_at: '2026-10-01', last_verified: null, conflict_ids: [], is_illustrative: false, ...o });
const run = (ds, mode = 'private', today = TODAY) => validateDataset(ds, { mode, today, methods: { 'M-RISK-SEVERITY': 'INACTIVE', 'M-MARKET-GATE': 'ACTIVE' } });
const why = (r, id = 'OPP-T-A') => r.eligibility.opportunities[id];

// ================================================================== B1 evidence freshness
test('B1: freshness states are deterministic for a fixed date (current, review due, expired, invalid, future)', () => {
  const e = ev({ retrieved_at: '2026-06-01' }); // project.delivery_status: review after 90, expire after 180 days
  assert.equal(reviewRule(e).review_after_days, 90);
  assert.equal(evidenceFreshness(e, '2026-07-01').state, 'CURRENT');
  assert.equal(evidenceFreshness(e, '2026-09-15').state, 'REVIEW_DUE');
  assert.equal(evidenceFreshness(e, '2026-12-15').state, 'EXPIRED');
  assert.equal(evidenceFreshness(ev({ retrieved_at: '2026-11-30' }), TODAY).state, 'INVALID', 'future date');
  assert.equal(evidenceFreshness(ev({ retrieved_at: '2026-02-30' }), TODAY).state, 'INVALID', 'impossible date');
  assert.equal(evidenceFreshness(ev({ retrieved_at: null }), TODAY).state, 'INVALID', 'no date');
  assert.equal(evidenceFreshness(ev({ retrieved_at: '2026-10-20', next_review_trigger: '2026-10-25' }), TODAY).state, 'REVIEW_DUE', 'review trigger passed');
  assert.equal(evidenceFreshness(ev({ retrieved_at: '2025-01-01', last_verified: '2026-10-20' }), TODAY).basis_kind, 'verified', 'verification date takes precedence');
  assert.throws(() => evidenceFreshness(e, '27/10/2026'), /invalid "today"/);
  // rule precedence: field > source type > class > default
  assert.equal(reviewRule(ev({ field: null, evidence_class: 'LEGAL FACT' }), 'OFFICIAL_STATISTICS'), REVIEW_POLICY.by_source_type.OFFICIAL_STATISTICS);
  assert.equal(reviewRule(ev({ field: null, evidence_class: 'LEGAL FACT' })), REVIEW_POLICY.by_class['LEGAL FACT']);
  assert.equal(reviewRule(ev({ field: null, evidence_class: 'FACT' })), REVIEW_POLICY.default);
});
test('B1: expired material evidence blocks new publication; review-due warns; non-material ageing never blocks', () => {
  const expired = base({ evidence: [ev({ retrieved_at: '2026-01-01' })] });
  assert.ok(why(run(expired)).includes('PRJ-T-A:delivery_status evidence expired — re-review required'));
  const due = base({ evidence: [ev({ retrieved_at: '2026-06-01' })] });
  const r = run(due);
  assert.ok(!why(r).some(w => /delivery_status evidence/.test(w)), 'review due does not block');
  assert.ok(r.warnings.some(w => w.code === 'W02' && /review due/.test(w.msg)));
  const nonMat = base({ evidence: [ev({ id: 'EVD-T-9', field: null, value: null, unit: null, retrieved_at: '2020-01-01' }), ev({ retrieved_at: '2026-10-20' })] });
  assert.ok(!why(run(nonMat)).some(w => /expired/.test(w)), 'entity-level claim age never blocks');
  const bad = base({ evidence: [ev({ retrieved_at: '2026-11-30' })] });
  assert.ok(codes(run(bad)).includes('V18'), 'future date is a validation error');
  assert.ok(why(run(bad)).some(w => /has no valid date/.test(w)));
});
test('B1: a published opportunity whose evidence ages is a warning (W01), not an automatic withdrawal (owner decision D4)', () => {
  const ds = base({ evidence: [ev({ retrieved_at: '2026-01-01' })] });
  Object.assign(ds.collections.opportunities[0], { record_status: 'PUBLISHED', review: { approved_by: 'owner', approved_at: TODAY, gate_version: 'G3-v1' } });
  const r = run(ds);
  assert.ok(r.warnings.some(w => w.code === 'W01' && /expired/.test(w.msg)));
  assert.ok(!r.errors.some(e => e.code === 'V12' && /expired/.test(e.msg)), 'V12 lists only non-freshness reasons');
});
test('B1: "last verified" comes from evidence verification dates only — never the approval date', () => {
  const pr = base().collections.projects[0];
  const evs = [ev({ last_verified: '2026-09-01' }), ev({ id: 'EVD-T-2', field: 'name', value: 'A', evidence_class: 'FACT', verification_status: 'VERIFIED', source_id: 'SRC-T1', source_tier: 1, last_verified: '2026-08-15' })];
  assert.equal(deriveLastVerified([{ type: 'project', rec: pr }], evs), '2026-08-15', 'oldest of the material fields');
  assert.equal(deriveLastVerified([{ type: 'project', rec: pr }], [evs[0]]), null, 'a material field without a verification date → null');
  const ds = base({ evidence: evs }); ds.collections.opportunities[0].last_verified = TODAY; // the old behaviour: approval date
  assert.ok(run(ds, 'public').errors.some(e => e.code === 'V19'), 'approval date as last verified is rejected');
  ds.collections.opportunities[0].last_verified = '2026-08-15';
  assert.ok(!run(ds, 'public').errors.some(e => e.code === 'V19'));
});
test('B1 (end to end): owner approval derives last verified from the package evidence, not today', () => {
  const s = realSetup({ mutate: (i) => { for (const f of i.facts) if (f.key === 'F-NAME' || f.key === 'F-STATUS' || f.key === 'F-DELIVERY') f.last_verified = '2026-10-25'; for (const f of i.facts) if (['F-TYPE', 'F-GROSS', 'F-NET', 'F-ADELIV', 'F-LEGAL', 'F-DEVREL', 'F-DISTRICT', 'F-DEVNAME', 'F-TYPES'].includes(f.key)) f.last_verified = '2026-10-23'; } });
  try {
    assert.equal(cli(s.repo, ['ingest', '--package', s.base, ...s.S, '--apply']).code, 0);
    cli(s.repo, ['approve-disclosure', ...s.S, '--id', DSC1, '--by', 'owner']); approveImages(s);
    const r = cli(s.repo, ['approve', ...s.S, '--id', OPP, '--by', 'owner']); assert.equal(r.code, 0, r.out);
    assert.match(r.out, /last verified: 2026-10-23/);
    assert.equal(readJson(path.join(s.store, 'data/opportunities.json')).records[0].last_verified, '2026-10-23');
    assert.equal(cli(s.repo, ['export', ...s.S, '--id', OPP]).code, 0);
    assert.equal(pub(s.repo, 'opportunities')[0].last_verified, '2026-10-23');
  } finally { s.cleanup(); }
});

// ================================================================== B2 claim publication controls
test('B2: claim policy — disallowed states are never public; qualified states carry a label', () => {
  const st = (o) => claimPublication(ev(o)).status;
  for (const [o, want] of [
    [{ verification_status: 'UNVERIFIED' }, 'NOT_PUBLIC'], [{ evidence_class: 'HYPOTHESIS', verification_status: 'VERIFIED', source_tier: 1 }, 'NOT_PUBLIC'],
    [{ source_tier: 4, verification_status: 'SOURCE-REPORTED' }, 'NOT_PUBLIC'], [{ source_tier: 4, verification_status: 'DEVELOPER-CLAIM' }, 'NOT_PUBLIC'],
    [{ verification_status: 'VERIFIED', source_tier: 1 }, 'ESTABLISHED'], [{ evidence_class: 'LEGAL FACT', verification_status: 'CORROBORATED', source_tier: 2 }, 'ESTABLISHED'],
    [{ verification_status: 'DEVELOPER-CLAIM' }, 'QUALIFIED'], [{ verification_status: 'SOURCE-REPORTED', source_tier: 2 }, 'QUALIFIED'],
    [{ evidence_class: 'PROJECTION', verification_status: 'VERIFIED', source_tier: 1 }, 'QUALIFIED'], [{ evidence_class: 'OPINION', verification_status: 'SOURCE-REPORTED', source_tier: 2 }, 'QUALIFIED']
  ]) assert.equal(st(o), want, JSON.stringify(o));
  // the policy never rewrites the record it judges
  const e = ev({ verification_status: 'UNVERIFIED' }); const before = JSON.stringify(e); claimPublication(e); assert.equal(JSON.stringify(e), before);
});
test('B2: a material field resting only on unverified or Tier 4 evidence blocks publication; a qualified developer claim does not', () => {
  for (const o of [{ verification_status: 'UNVERIFIED' }, { source_id: 'SRC-T4', source_tier: 4 }]) assert.ok(why(run(base({ evidence: [ev(o)] }))).includes('PRJ-T-A:delivery_status has no publishable evidence (unverified or Tier 4 only)'), JSON.stringify(o));
  assert.ok(why(run(base({ evidence: [] }))).includes('PRJ-T-A:delivery_status has no publishable evidence (no evidence)'), 'a displayed value with no evidence');
  assert.ok(!why(run(base({ evidence: [ev()] }))).some(w => /delivery_status/.test(w)), 'qualified developer claim is allowed');
  // public data may never contain a non-public claim (V20)
  assert.ok(codes(run(base({ evidence: [ev({ verification_status: 'UNVERIFIED' })] }), 'public')).includes('V20'));
  assert.ok(!codes(run(base({ evidence: [ev()] }), 'public')).includes('V20'));
});
test('B2 (end to end): an unverified Tier 4 claim stays private, is reported as held back, and never reaches public data', () => {
  const s = publishedSetup({ exportIt: false });
  try {
    const r = cli(s.repo, ['export', ...s.S, '--id', OPP]); assert.equal(r.code, 0, r.out);
    assert.match(r.out, /held back \(not public\): [^\n]*EVD-TST-ILLUSTRATIVE-RESIDENCE-A-\d+ \(unverified\)/);
    assert.ok(pub(s.repo, 'evidence').every(e => claimPublication(e).status !== 'NOT_PUBLIC'));
    assert.ok(readJson(path.join(s.store, 'data/evidence.json')).records.some(e => e.verification_status === 'UNVERIFIED'), 'kept in the private store, unchanged');
  } finally { s.cleanup(); }
});

// ================================================================== B3 per-asset media rights
test('B3: owner approval no longer approves images; each image needs its own decision', () => {
  const s = realSetup();
  try {
    assert.equal(cli(s.repo, ['ingest', '--package', s.base, ...s.S, '--apply']).code, 0);
    cli(s.repo, ['approve-disclosure', ...s.S, '--id', DSC1, '--by', 'owner']);
    let r = cli(s.repo, ['approve', ...s.S, '--id', OPP, '--by', 'owner']);
    assert.equal(r.code, 1); assert.match(r.out, /no publishable cover/);
    // per-image results: written permission approved; verbal and restricted refused with reasons
    const res = Object.fromEntries(approveImages(s));
    assert.equal(res[MED(1)], 0); assert.equal(res[MED(2)], 0); assert.equal(res[MED(3)], 0);
    r = cli(s.repo, ['approve-media', ...s.S, '--id', MED(4), '--by', 'owner']); assert.equal(r.code, 1); assert.match(r.out, /GRANTED_VERBAL, not written/);
    r = cli(s.repo, ['approve-media', ...s.S, '--id', MED(5), '--by', 'owner']); assert.equal(r.code, 1); assert.match(r.out, /RESTRICTED, not written[^\n]*scope does not include desk_web/);
    assert.equal(cli(s.repo, ['approve-media', ...s.S, '--id', MED(1), '--by', 'reviewer']).code, 1, 'owner only');
    assert.equal(cli(s.repo, ['approve', ...s.S, '--id', OPP, '--by', 'owner']).code, 0);
  } finally { s.cleanup(); }
});
test('B3: missing evidence reference, expired permission and a file bound to another project are refused per image', () => {
  const s = realSetup();
  try {
    assert.equal(cli(s.repo, ['ingest', '--package', s.base, ...s.S, '--apply']).code, 0);
    const mp = path.join(s.store, 'data/media.json'); const mj = readJson(mp);
    mj.records.find(m => m.id === MED(1)).permission.expires_at = '2026-10-01';
    mj.records.find(m => m.id === MED(2)).file.public_path = mj.records.find(m => m.id === MED(2)).file.public_path.replace(PRJ, 'PRJ-TST-OTHER');
    writeJson(mp, mj);
    let r = cli(s.repo, ['approve-media', ...s.S, '--id', MED(1), '--by', 'owner']); assert.equal(r.code, 1); assert.match(r.out, /permission expired on 2026-10-01/);
    r = cli(s.repo, ['approve-media', ...s.S, '--id', MED(2), '--by', 'owner']); assert.equal(r.code, 1); assert.match(r.out, /not bound to its own project/);
    mj.records.find(m => m.id === MED(3)).permission.evidence_ref = null; writeJson(mp, mj);
    r = cli(s.repo, ['approve-media', ...s.S, '--id', MED(3), '--by', 'owner']); assert.equal(r.code, 1); assert.match(r.out, /no reference to the private permission record/);
  } finally { s.cleanup(); }
});
test('B3: revoking one image removes only that image from the next export; a failed export after revocation changes nothing', () => {
  const s = publishedSetup();
  try {
    const pathOf = (id) => pub(s.repo, 'media').find(m => m.id === id).file.public_path;
    const p3 = pathOf(MED(3)); const p1 = pathOf(MED(1)); const p2 = pathOf(MED(2));
    assert.ok(fs.existsSync(path.join(s.repo, p3)));
    let r = cli(s.repo, ['revoke-media', ...s.S, '--id', MED(3), '--by', 'owner', '--reason', 'TEST-ONLY developer withdrew consent']);
    assert.equal(r.code, 0, r.out); assert.match(r.out, /still in the public tree: re-export/);
    assert.equal(cli(s.repo, ['revoke-media', ...s.S, '--id', MED(3), '--by', 'owner', '--reason', 'again']).out.includes('already revoked'), true, 'idempotent');
    const before = deskSnap(s.repo);
    assert.notEqual(cli(s.repo, ['export', ...s.S, '--id', OPP], { DESK_FAULT: 'export:applied' }).code, 0);
    assert.deepEqual(deskSnap(s.repo), before, 'failed export: revoked image still as before, nothing partial');
    r = cli(s.repo, ['export', ...s.S, '--id', OPP]); assert.equal(r.code, 0, r.out);
    assert.ok(!pub(s.repo, 'media').some(m => m.id === MED(3)) && !fs.existsSync(path.join(s.repo, p3)), 'revoked image and its file are gone');
    assert.ok(fs.existsSync(path.join(s.repo, p1)) && fs.existsSync(path.join(s.repo, p2)), 'unrelated permitted images stay');
    const audit = readJson(path.join(s.store, 'private/audit_log.json'));
    assert.ok(audit.some(a => a.action === 'revoke-media' && a.id === MED(3) && /withdrew consent/.test(a.reason) && /not authenticated/.test(a.actor)));
    assert.ok(readJson(path.join(s.store, 'data/media.json')).records.some(m => m.id === MED(3) && m.permission.status === 'REVOKED'), 'private record kept, marked revoked');
    assert.deepEqual(validateRepo(s.repo, { today: TODAY }).errors, []);
  } finally { s.cleanup(); }
});
test('B3: media from one project can never be attached to another project (validator V11)', () => {
  const ds = base({ media: [{ id: 'MED-T-1', subject: { type: 'project', id: 'PRJ-T-A' }, media_type: 'RENDERING', content_category: 'exterior', caption: { en: 'c' }, alt: { en: 'a' }, depicted_date: null, provenance: { source_id: 'SRC-T3', provided_by_role: 'x', received_at: TODAY, media_kit_ref: null }, verification_status: 'DEVELOPER-CLAIM', permission: { status: 'GRANTED_WRITTEN', scope: ['desk_web'], evidence_ref: 'PRIV-1', granted_at: null, expires_at: null }, attribution: { required: false, text: null }, role: 'cover', order: 0, file: { public_path: 'desk/media/PRJ-T-B/MED-T-1.webp', width: 1, height: 1, sha256: 'a'.repeat(64) }, is_illustrative: false, review: null }] });
  assert.ok(run(ds, 'public').errors.some(e => e.code === 'V11' && /desk\/media\/PRJ-T-A\/MED-T-1/.test(e.msg)));
});

// ================================================================== B4 withdrawal
test('B4: withdrawal removes the opportunity, its media, page and index entry; keeps the research record; is idempotent', () => {
  const s = publishedSetup();
  try {
    const page = path.join(s.repo, 'desk/opportunities', OPP.toLowerCase());
    assert.ok(fs.existsSync(page)); const evBefore = readJson(path.join(s.store, 'data/evidence.json')).records.length;
    assert.equal(cli(s.repo, ['withdraw', ...s.S, '--id', OPP, '--by', 'owner']).code, 1, '--reason required');
    let r = cli(s.repo, ['withdraw', ...s.S, '--id', OPP, '--by', 'owner', '--reason', 'TEST-ONLY material evidence under review']);
    assert.equal(r.code, 0, r.out);
    assert.deepEqual(readJson(path.join(s.repo, 'desk/data/public/published.json')).opportunities, [], 'index no longer lists it');
    for (const c of ['opportunities', 'projects', 'assets', 'evidence', 'media', 'disclosures', 'risks', 'research_blocks', 'developers', 'districts', 'sources']) assert.equal(pub(s.repo, c).length, 0, `${c} emptied`);
    assert.ok(!fs.existsSync(page), 'generated page removed');
    assert.ok(!fs.existsSync(path.join(s.repo, 'desk/media', PRJ)) || !fs.readdirSync(path.join(s.repo, 'desk/media', PRJ)).length, 'no orphan media');
    const so = readJson(path.join(s.store, 'data/opportunities.json')).records[0];
    assert.equal(so.record_status, 'WITHHELD'); assert.equal(so.review, null);
    assert.equal(readJson(path.join(s.store, 'data/evidence.json')).records.length, evBefore, 'evidence kept');
    assert.ok(readJson(path.join(s.store, 'private/audit_log.json')).some(a => a.action === 'withdraw' && a.id === OPP && a.was_public === true));
    assert.deepEqual(validateRepo(s.repo, { today: TODAY }).errors, []);
    // repeated withdrawal: no change, no error, nothing recreated
    const snapAfter = deskSnap(s.repo);
    r = cli(s.repo, ['withdraw', ...s.S, '--id', OPP, '--by', 'owner', '--reason', 'again']); assert.equal(r.code, 0); assert.match(r.out, /already withdrawn; nothing changed/);
    assert.deepEqual(deskSnap(s.repo), snapAfter);
    // re-export without a new approval is refused; with a new approval it works again
    r = cli(s.repo, ['export', ...s.S, '--id', OPP]); assert.notEqual(r.code, 0); assert.match(r.out, /not approved \(withheld or withdrawn: a new owner approval is required/);
    assert.equal(cli(s.repo, ['approve', ...s.S, '--id', OPP, '--by', 'owner']).code, 0);
    assert.equal(cli(s.repo, ['export', ...s.S, '--id', OPP]).code, 0);
    assert.ok(fs.existsSync(page));
  } finally { s.cleanup(); }
});
test('B4: an interrupted or failed withdrawal leaves no partial public tree, and a re-run completes it', () => {
  const s = publishedSetup();
  try {
    const before = deskSnap(s.repo);
    for (const point of ['withdraw:stage', 'withdraw:staged-build', 'withdraw:write:2', 'withdraw:rename:1', 'withdraw:applied', 'withdraw:commit']) {
      const r = cli(s.repo, ['withdraw', ...s.S, '--id', OPP, '--by', 'owner', '--reason', 'TEST-ONLY'], { DESK_FAULT: point });
      assert.notEqual(r.code, 0, point); assert.deepEqual(deskSnap(s.repo), before, `${point}: public tree unchanged`);
    }
    assert.equal(readJson(path.join(s.store, 'data/opportunities.json')).records[0].record_status, 'WITHHELD', 'store step done first (cannot be re-exported meanwhile)');
    const c = cli(s.repo, ['withdraw', ...s.S, '--id', OPP, '--by', 'owner', '--reason', 'TEST-ONLY'], { DESK_FAULT: 'crash:withdraw:write:3' });
    assert.equal(c.code, 137);
    assert.ok(codes(validateRepo(s.repo, { today: TODAY })).includes('F07'), 'half-done withdrawal can never pass CI');
    const r = cli(s.repo, ['withdraw', ...s.S, '--id', OPP, '--by', 'owner', '--reason', 'TEST-ONLY']); assert.equal(r.code, 0, r.out);
    assert.deepEqual(pub(s.repo, 'opportunities'), []); assert.deepEqual(validateRepo(s.repo, { today: TODAY }).errors, []);
  } finally { s.cleanup(); }
});

// ================================================================== B5 conflict resolution
function conflictSetup() {
  const s = publishedSetup();
  const u = s.mkPkg('PKG-2', (i) => { i.sources = [{ key: 'S4', name: 'TEST-ONLY report', publisher: 'TEST-ONLY News', url: null, tier: 2, source_type: 'MEDIA', accessed_at: '2026-10-26' }]; i.facts = [{ key: 'F-D2', subject: 'project', field: 'expected_delivery', value: '2029-03', unit: 'date', claim: { en: 'Later delivery reported.' }, source: 'S4', evidence_class: 'FACT', verification_status: 'SOURCE-REPORTED', geography: 'T', period: '2026-10' }]; for (const k of ['media', 'risks', 'disclosures', 'research_blocks', 'documents', 'unknowns', 'assets']) delete i[k]; delete i.developer; delete i.district; delete i.opportunity; i.project.ref = PRJ; });
  const r = cli(s.repo, ['ingest', '--package', u, ...s.S, '--apply']); if (r.code !== 0) throw new Error(r.out);
  const cf = readJson(path.join(s.store, 'data/conflicts.json')).records.find(c => c.status === 'OPEN');
  return { s, cf };
}
test('B5: EXPLAINED keeps both sides and the history; the conflict no longer blocks, nothing is erased', () => {
  const { s, cf } = conflictSetup();
  try {
    const evBefore = readJson(path.join(s.store, 'data/evidence.json')).records;
    let r = cli(s.repo, ['resolve-conflict', ...s.S, '--id', cf.id, '--by', 'owner', '--status', 'EXPLAINED']); assert.equal(r.code, 1, 'note required');
    r = cli(s.repo, ['resolve-conflict', ...s.S, '--id', cf.id, '--by', 'owner', '--status', 'EXPLAINED', '--note', 'TEST-ONLY: the report refers to phase 2']); assert.equal(r.code, 0, r.out);
    const c2 = readJson(path.join(s.store, 'data/conflicts.json')).records.find(c => c.id === cf.id);
    assert.equal(c2.status, 'EXPLAINED'); assert.deepEqual(c2.evidence_ids, cf.evidence_ids);
    assert.deepEqual(readJson(path.join(s.store, 'data/evidence.json')).records, evBefore, 'evidence untouched');
    assert.ok(readJson(path.join(s.store, 'private/audit_log.json')).some(a => a.action === 'resolve-conflict' && a.id === cf.id && a.status === 'EXPLAINED'));
    assert.doesNotMatch(cli(s.repo, ['gate', ...s.S]).out, new RegExp(`${OPP}: BLOCKED[^\\n]*open conflict`));
    assert.equal(cli(s.repo, ['resolve-conflict', ...s.S, '--id', cf.id, '--by', 'owner', '--status', 'EXPLAINED', '--note', 'x']).code, 1, 'cannot resolve twice');
  } finally { s.cleanup(); }
});
test('B5: RESOLVED applies the accepted value, records the previous one, keeps both evidence records; re-publication needs a new approval', () => {
  const { s, cf } = conflictSetup();
  try {
    const later = cf.evidence_ids.find(i => readJson(path.join(s.store, 'data/evidence.json')).records.find(e => e.id === i).value === '2029-03');
    assert.equal(cli(s.repo, ['resolve-conflict', ...s.S, '--id', cf.id, '--by', 'owner', '--status', 'RESOLVED', '--note', 'n', '--accept', 'EVD-NOT-IN-CONFLICT']).code, 1);
    const before = snap(s.store);
    assert.notEqual(cli(s.repo, ['resolve-conflict', ...s.S, '--id', cf.id, '--by', 'owner', '--status', 'RESOLVED', '--note', 'n', '--accept', later], { DESK_FAULT: 'store:write:1' }).code, 0);
    assert.deepEqual(snap(s.store), before, 'failed resolution leaves the store unchanged');
    const r = cli(s.repo, ['resolve-conflict', ...s.S, '--id', cf.id, '--by', 'owner', '--status', 'RESOLVED', '--note', 'TEST-ONLY: registry confirms the later date', '--accept', later]);
    assert.equal(r.code, 0, r.out);
    assert.equal(readJson(path.join(s.store, 'data/opportunities.json')).records[0].record_status, 'WITHHELD', 'the contradicting package already withheld it');
    assert.equal(readJson(path.join(s.store, 'data/projects.json')).records[0].expected_delivery, '2029-03');
    const a = readJson(path.join(s.store, 'private/audit_log.json')).find(x => x.action === 'resolve-conflict');
    assert.equal(a.previous_value, '2028-06'); assert.equal(a.new_value, '2029-03'); assert.equal(a.accepted, later);
    assert.equal(readJson(path.join(s.store, 'data/evidence.json')).records.filter(e => cf.evidence_ids.includes(e.id)).length, 2, 'both sides kept');
    assert.notEqual(cli(s.repo, ['export', ...s.S, '--id', OPP]).code, 0, 'changed value needs a new approval before export');
  } finally { s.cleanup(); }
});

// ================================================================== B6 locks, recovery safety, filesystem
test('B6: a live lock makes a second write fail clearly; a stale lock is cleared; a foreign lock needs unlock --force', () => {
  const s = realSetup();
  try {
    const lock = path.join(s.store, '_lock.json');
    writeJson(lock, { pid: process.pid, host: os.hostname(), label: 'test-holder', started_at: 'x' }); // this test process is alive
    const before = snap(s.store);
    let r = cli(s.repo, ['ingest', '--package', s.base, ...s.S, '--apply']);
    assert.equal(r.code, 1); assert.match(r.out, /another Nexus Desk operation holds the lock[^\n]*test-holder/);
    assert.deepEqual(snap(s.store), before, 'nothing written while locked');
    writeJson(lock, { pid: 2 ** 22 + 12345, host: os.hostname(), label: 'crashed', started_at: 'x' }); // no such process
    assert.equal(cli(s.repo, ['ingest', '--package', s.base, ...s.S, '--apply']).code, 0, 'stale lock on this machine is cleared');
    assert.ok(!fs.existsSync(lock), 'lock released after the command');
    writeJson(lock, { pid: 1, host: 'another-machine', label: 'remote', started_at: 'x' });
    assert.equal(cli(s.repo, ['approve-disclosure', ...s.S, '--id', DSC1, '--by', 'owner']).code, 1);
    assert.equal(cli(s.repo, ['unlock', ...s.S]).code, 2, 'unlock needs --force');
    assert.equal(cli(s.repo, ['unlock', ...s.S, '--force']).code, 0);
    assert.equal(cli(s.repo, ['approve-disclosure', ...s.S, '--id', DSC1, '--by', 'owner']).code, 0);
  } finally { s.cleanup(); }
});
test('B6: recovery never runs underneath a live operation and never overwrites content changed after a crash', () => {
  const s = realSetup();
  try {
    assert.equal(cli(s.repo, ['ingest', '--package', s.base, ...s.S, '--apply']).code, 0);
    assert.equal(cli(s.repo, ['approve-disclosure', ...s.S, '--id', DSC1, '--by', 'owner'], { DESK_FAULT: 'crash:store:rename:1' }).code, 137);
    // someone edits a journaled file after the crash
    const f = path.join(s.store, 'data/disclosures.json'); fs.appendFileSync(f, '\n');
    let r = cli(s.repo, ['gate', ...s.S]); assert.notEqual(r.code, 0); assert.match(r.out, /changed after the interrupted operation[^\n]*recovery refused/);
    assert.ok(fs.existsSync(path.join(s.store, '_txn/journal.json')), 'journal kept for a person to inspect');
    // a live operation's journal is not rolled back by a read
    const d = tmp('desk-t-live-');
    acquireLock(d, 'live'); const t = new Txn(d, 'live'); t.write(path.join(d, 'a.json'), 'x');
    const child = (() => { try { return execFileSync('node', ['-e', `import('${path.join(ROOT, 'desk/_tools/txn.mjs')}').then(m => { try { m.recover('${d}'); console.log('RECOVERED'); } catch (e) { console.log(e.constructor.name); } })`], { stdio: 'pipe' }).toString(); } catch (e) { return String(e.stdout); } })();
    assert.match(child, /LockError/); assert.ok(fs.existsSync(path.join(d, 'a.json')));
    t.rollback(); releaseLock(d); fs.rmSync(d, { recursive: true, force: true });
  } finally { s.cleanup(); }
});
test('B6: symbolic links, path traversal, failed renames and temporary files are handled safely', () => {
  const d = tmp('desk-t-fs-'); const out = tmp('desk-t-out-');
  try {
    fs.symlinkSync(out, path.join(d, 'link'));
    assert.throws(() => withTxn(d, 't', (x) => x.write(path.join(d, 'link', 'f.json'), 'x')), /symbolic link/);
    fs.writeFileSync(path.join(out, 'target.json'), 'outside'); fs.symlinkSync(path.join(out, 'target.json'), path.join(d, 'file.json'));
    assert.throws(() => withTxn(d, 't', (x) => x.write(path.join(d, 'file.json'), 'x')), /symbolic link/);
    assert.equal(fs.readFileSync(path.join(out, 'target.json'), 'utf8'), 'outside', 'nothing written outside the root');
    assert.throws(() => withTxn(d, 't', (x) => x.write(path.join(d, 'a', '..', '..', 'escape.json'), 'x')), TxnError);
    fs.writeFileSync(path.join(d, 'keep.json'), 'old');
    process.env.DESK_FAULT = 't:rename:2';
    try { assert.throws(() => withTxn(d, 't', (x) => { x.write(path.join(d, 'keep.json'), 'new'); x.write(path.join(d, 'new.json'), 'new'); }), /injected fault at t:rename:2/); }
    finally { delete process.env.DESK_FAULT; }
    assert.equal(fs.readFileSync(path.join(d, 'keep.json'), 'utf8'), 'old');
    assert.ok(!fs.existsSync(path.join(d, 'new.json')));
    assert.deepEqual(fs.readdirSync(d, { recursive: true }).map(String).filter(f => f.endsWith('.desk-tmp') || f.startsWith('_txn')), [], 'no temporary files or journal left');
  } finally { fs.rmSync(d, { recursive: true, force: true }); fs.rmSync(out, { recursive: true, force: true }); }
});
test('B6: ingestion with a failed rename rolls back completely; leftover locks or journals in desk/ fail validation (F07)', () => {
  const s = realSetup();
  try {
    const before = snap(s.store);
    const r = cli(s.repo, ['ingest', '--package', s.base, ...s.S, '--apply'], { DESK_FAULT: 'ingest:rename:3' });
    assert.notEqual(r.code, 0); assert.deepEqual(snap(s.store), before);
    fs.writeFileSync(path.join(s.repo, 'desk/_lock.json'), '{}');
    assert.ok(codes(validateRepo(s.repo, { today: TODAY })).includes('F07'));
  } finally { s.cleanup(); }
});

// ================================================================== B7 fixture-mode CI separation
test('B7: CI runs fixture-mode browser checks from the source tree, separately from the Pages build, with pinned actions', () => {
  const val = fs.readFileSync(path.join(ROOT, '.github/workflows/desk-validate.yml'), 'utf8');
  const m = val.match(/\n {2}fixture-browser-check:\n([\s\S]*?)(?=\n {2}[a-z][\w-]*:\n|$)/); assert.ok(m, 'fixture-browser-check job exists');
  assert.match(m[1], /needs: validate/); assert.match(m[1], /python3 desk\/_tests\/ui_acceptance\.py/);
  assert.doesNotMatch(m[1], /PAGES_MODE|jekyll-build-pages|upload-pages-artifact|deploy-pages/, 'fixture checks never touch the Pages build or deployment');
  const pb = val.match(/\n {2}pages-build-check:\n([\s\S]*?)(?=\n {2}[a-z][\w-]*:\n|$)/)[1];
  assert.match(pb, /PAGES_MODE: '1'/, 'production checks stay in Pages mode');
  const deploy = fs.readFileSync(path.join(ROOT, '.github/workflows/desk-pages-deploy.yml'), 'utf8');
  assert.doesNotMatch(deploy, /fixtures=1|ui_acceptance/, 'deployment never runs fixture mode');
});
