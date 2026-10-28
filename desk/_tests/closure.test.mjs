// Final technical closure tests (Tasks 1–4 of the closure brief) — run with:  node --test desk/_tests/closure.test.mjs
// Fixed clock (TODAY); synthetic TEST-ONLY data in temporary repository copies only. Nothing here writes to the real tree.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { validateDataset, validateRepo } from '../_tools/validate.mjs';
import { MATERIAL_FIELDS, IDENTITY_FIELDS, evidenceFreshness, claimPublication } from '../assets/js/policy.js';
import { ROOT, TODAY, readJson, writeJson, tmpRepo, codes, cli, snap, OPP, PRJ, realSetup, publishedSetup, approveImages, pub, enableTestMarketGate } from './helpers.mjs';

const GATE_ON = { 'M-RISK-SEVERITY': 'INACTIVE', 'M-MARKET-GATE': 'ACTIVE' };
const GATE_OFF = { 'M-RISK-SEVERITY': 'INACTIVE', 'M-MARKET-GATE': 'INACTIVE' };
const PA = 'PRJ-T-A'; const PB = 'PRJ-T-B';
const base = (o = {}) => ({
  collections: {
    categories: [{ id: 'CAT-RE', key: 'real_estate', slug: 'real-estate', name: { en: 'Real Estate' }, activation: 'ACTIVE', is_illustrative: false }],
    markets: [{ id: 'MKT-T', slug: 't', name: 'T', country: 'TR', currency: 'TRY', category: 'real_estate', activation: 'ACTIVE', record_status: 'DRAFT', research_block_ids: [], evidence_ids: [], field_states: [], last_reviewed: null, is_illustrative: false, review: null }],
    districts: [{ id: 'DST-T-N', market_id: 'MKT-T', slug: 'n', name: 'North', admin_level: 'DISTRICT', record_status: 'DRAFT', research_block_ids: [], evidence_ids: [], field_states: [], is_illustrative: false, review: null }],
    developers: [{ id: 'DEV-T-A', name: 'Dev A', legal_entity_name: 'Dev A Ltd', verification_status: 'VERIFIED', record_status: 'DRAFT', summary: null, evidence_ids: [], field_states: [], is_illustrative: false, review: null }],
    sources: [{ id: 'SRC-T1', name: 'Registry', publisher: 'p', url: null, tier: 1, source_type: 'REGISTRY', accessed_at: null, is_illustrative: false },
      { id: 'SRC-T3', name: 'Developer kit', publisher: 'p', url: null, tier: 3, source_type: 'DEVELOPER_MATERIAL', accessed_at: null, is_illustrative: false },
      { id: 'SRC-T4', name: 'Listing', publisher: 'p', url: null, tier: 4, source_type: 'BROKER_LISTING', accessed_at: null, is_illustrative: false }],
    projects: [PA, PB].map(id => ({ id, category: 'real_estate', market_id: 'MKT-T', developer_id: 'DEV-T-A', name: id, slug: id.toLowerCase(), district_id: 'DST-T-N', area_id: null, delivery_status: 'UNDER_CONSTRUCTION', expected_delivery: '2028-06', asset_types: ['APARTMENT'], record_status: 'DRAFT', research_block_ids: [], evidence_ids: [], risk_ids: [], field_states: [], is_illustrative: false })),
    assets: [{ id: 'AST-T-A1', project_id: PA, unit_type: '2+1', unit_ref: null, gross_area_m2: 110, net_area_m2: null, delivery_status: null, evidence_ids: [], field_states: [], is_illustrative: false },
      { id: 'AST-T-B1', project_id: PB, unit_type: '3+1', unit_ref: null, gross_area_m2: null, net_area_m2: null, delivery_status: null, evidence_ids: [], field_states: [], is_illustrative: false }],
    opportunities: [{ id: 'OPP-T-A', category: 'real_estate', subject: { type: 'project', id: PA }, market_id: 'MKT-T', asset_id: 'AST-T-A1', title: { en: 't' }, summary: { en: 's' }, record_status: 'DRAFT', disclosure_ids: [], evidence_ids: [], risk_ids: [], field_states: [], last_verified: null, is_illustrative: false, review: null }],
    evidence: [], risks: [], conflicts: [], media: [], disclosures: [], research_blocks: [], ...o
  }
});
let n = 0;
const ev = (o) => ({ id: `EVD-T-${++n}`, source_id: 'SRC-T1', subject: { type: 'project', id: PA }, field: 'district_id', claim: { en: 'c' }, value: null, unit: null, currency: null, geography: 'T', period: null, evidence_class: 'FACT', verification_status: 'VERIFIED', source_tier: 1, retrieved_at: '2026-10-01', last_verified: null, conflict_ids: [], is_illustrative: false, ...o });
const run = (ds, mode = 'private', methods = GATE_ON) => validateDataset(ds, { mode, today: TODAY, methods });
const why = (r, id = 'OPP-T-A') => r.eligibility.opportunities[id];
const msgs = (r, code) => r.errors.filter(e => e.code === code).map(e => `${e.id}: ${e.msg}`);

// ================================================================== Task 1 — field-level evidence and publication safety
test('T1: every record field rendered on opportunity pages and in Compare is classified as material in the policy', () => {
  const rendered = new Set();
  const opp = fs.readFileSync(path.join(ROOT, 'desk/assets/js/opportunity.js'), 'utf8');
  for (const m of opp.matchAll(/\['[^']+', '(project|developer|asset)', \w+, '(\w+)'/g)) rendered.add(`${m[1]}.${m[2]}`);
  const cmp = fs.readFileSync(path.join(ROOT, 'desk/assets/js/compare.js'), 'utf8');
  for (const m of cmp.matchAll(/cell\('(project|developer|asset)', x\.\w+, '(\w+)'/g)) rendered.add(`${m[1]}.${m[2]}`);
  // values rendered directly (not through a fact row): developer name in Compare, delivery status and district on cards
  if (/x\.dev\.name/.test(cmp)) rendered.add('developer.name');
  const ui = fs.readFileSync(path.join(ROOT, 'desk/assets/js/ui.js'), 'utf8');
  if (/p\.delivery_status/.test(ui)) rendered.add('project.delivery_status');
  if (/d\.name/.test(ui)) rendered.add('project.district_id');
  assert.ok(rendered.size >= 10, `parsed ${rendered.size} rendered fields`);
  for (const f of rendered) { const [t, k] = f.split('.'); assert.ok((MATERIAL_FIELDS[t] || []).includes(k), `${f} is rendered but not a material field — its evidence would not be enforced`); }
  for (const [t, ks] of Object.entries(IDENTITY_FIELDS)) for (const k of ks) assert.ok(MATERIAL_FIELDS[t].includes(k), `identity field ${t}.${k} must be material`);
});

test('T1: a rendered value with no evidence, or only unverified / Tier 4 / hypothesis evidence, blocks publication', () => {
  // no evidence at all for the location, the developer name, the asset types
  const w0 = why(run(base()));
  for (const f of [`${PA}:district_id`, `${PA}:asset_types`, 'DEV-T-A:name', 'AST-T-A1:unit_type', 'AST-T-A1:gross_area_m2']) assert.ok(w0.includes(`${f} has no publishable evidence (no evidence)`), `${f}: ${w0.join(' | ')}`);
  // disallowed evidence does not count
  for (const o of [{ verification_status: 'UNVERIFIED' }, { source_id: 'SRC-T4', source_tier: 4, verification_status: 'SOURCE-REPORTED' }, { evidence_class: 'HYPOTHESIS' }]) {
    assert.ok(why(run(base({ evidence: [ev(o)] }))).includes(`${PA}:district_id has no publishable evidence (unverified or Tier 4 only)`), JSON.stringify(o));
  }
  // a qualified developer claim is enough for a non-identity field
  assert.ok(!why(run(base({ evidence: [ev({ source_id: 'SRC-T3', source_tier: 3, verification_status: 'DEVELOPER-CLAIM' })] }))).some(w => w.startsWith(`${PA}:district_id`)));
});

test('T1: the project–developer relationship is an identity field — a developer claim is not enough', () => {
  const rel = (o) => ev({ field: 'developer_id', evidence_class: 'LEGAL FACT', ...o });
  assert.ok(why(run(base())).includes('project–developer relationship not verified (Tier 1–3)'));
  assert.ok(why(run(base({ evidence: [rel({ source_id: 'SRC-T3', source_tier: 3, verification_status: 'DEVELOPER-CLAIM' })] }))).includes('project–developer relationship not verified (Tier 1–3)'));
  assert.ok(!why(run(base({ evidence: [rel()] }))).includes('project–developer relationship not verified (Tier 1–3)'));
});

test('T1: an empty rendered field needs an explicit missing-data state; "Not recorded" is not a control', () => {
  // asset AST-T-A1: net_area_m2 and delivery_status are empty, without a state
  const w = why(run(base()));
  for (const f of ['net_area_m2', 'delivery_status']) assert.ok(w.includes(`AST-T-A1:${f} is empty without an explicit missing-data state`), f);
  const ds = base(); ds.collections.assets[0].field_states = [{ field: 'net_area_m2', state: 'ACCESSIBLE BUT NOT YET COLLECTED', note: null }, { field: 'delivery_status', state: 'DATA NOT AVAILABLE', note: null }];
  assert.ok(!why(run(ds)).some(x => /AST-T-A1:(net_area_m2|delivery_status) is empty/.test(x)));
  // an empty project field (no expected delivery) likewise
  const d2 = base(); d2.collections.projects[0].expected_delivery = null;
  assert.ok(why(run(d2)).includes(`${PA}:expected_delivery is empty without an explicit missing-data state`));
});

test('T1: evidence must point to the right subject and field — mismatches never count and are reported', () => {
  // evidence about project B's location does not support project A's location
  const other = ev({ subject: { type: 'project', id: PB } });
  assert.ok(why(run(base({ evidence: [other] }))).includes(`${PA}:district_id has no publishable evidence (no evidence)`));
  // evidence about another field does not count either
  assert.ok(why(run(base({ evidence: [ev({ field: 'expected_delivery' })] }))).includes(`${PA}:district_id has no publishable evidence (no evidence)`));
  // listing another project's evidence on a record is a reference error (V03)
  const ds = base({ evidence: [other] }); ds.collections.projects[0].evidence_ids = [other.id];
  assert.ok(msgs(run(ds), 'V03').some(m => m.includes(`belongs to project ${PB}`)));
  // a field that does not exist on the subject (V06) and a subject id of the wrong type (V03)
  assert.ok(codes(run(base({ evidence: [ev({ field: 'price_per_m2' })] }))).includes('V06'));
  assert.ok(msgs(run(base({ evidence: [ev({ subject: { type: 'developer', id: PA } })] })), 'V03').some(m => m.includes(`${PA} is a projects record, expected developers`)));
});

test('T1: no unverified, hypothesis or Tier 4 claim is public — data, risk evidence and the runtime filter', () => {
  for (const o of [{ verification_status: 'UNVERIFIED' }, { evidence_class: 'HYPOTHESIS' }, { source_id: 'SRC-T4', source_tier: 4, verification_status: 'SOURCE-REPORTED' }]) assert.ok(codes(run(base({ evidence: [ev(o)] }), 'public')).includes('V20'), JSON.stringify(o));
  // risk evidence: the runtime shows risk evidence only through the claim policy
  const ui = fs.readFileSync(path.join(ROOT, 'desk/assets/js/ui.js'), 'utf8');
  assert.match(ui, /riskEvidence = \(D, r\) => \(r\.evidence_ids \|\| \[\]\)\.map\(id => D\.byId\(id\)\)\.filter\(e => e && isPublicClaim\(e\)\)/);
  assert.doesNotMatch(fs.readFileSync(path.join(ROOT, 'desk/assets/js/opportunity.js'), 'utf8'), /evidence_ids\.map\(x => D\.byId\(x\)\)/);
});

test('T1 (end to end): a package without location or relationship evidence cannot be approved; qualified claims stay qualified after export', () => {
  const s = realSetup({ mutate: (i) => { i.facts = i.facts.filter(f => !['F-DISTRICT', 'F-NET'].includes(f.key)); for (const f of i.facts) if (f.key === 'F-DEVREL') Object.assign(f, { source: 'S2', verification_status: 'DEVELOPER-CLAIM' }); } });
  try {
    assert.equal(cli(s.repo, ['ingest', '--package', s.base, ...s.S, '--apply']).code, 0);
    cli(s.repo, ['approve-disclosure', ...s.S, '--id', 'DSC-TST-ILLUSTRATIVE-RESIDENCE-A-01', '--by', 'owner']); approveImages(s);
    const r = cli(s.repo, ['approve', ...s.S, '--id', OPP, '--by', 'owner']);
    assert.notEqual(r.code, 0);
    assert.match(r.out, new RegExp(`${PRJ}:district_id has no publishable evidence`));
    assert.match(r.out, /project–developer relationship not verified/);
    assert.match(r.out, /AST-TST-ILLUSTRATIVE-RESIDENCE-A-A1:net_area_m2 is empty without an explicit missing-data state/);
  } finally { s.cleanup(); }
  const p = publishedSetup();
  try {
    const dn = pub(p.repo, 'evidence').filter(e => e.subject.type === 'developer' && e.field === 'name');
    assert.equal(dn.length, 1); assert.equal(claimPublication(dn[0]).status, 'QUALIFIED'); assert.equal(dn[0].verification_status, 'DEVELOPER-CLAIM');
    for (const f of ['district_id', 'developer_id', 'asset_types']) assert.ok(pub(p.repo, 'evidence').some(e => e.subject.id === PRJ && e.field === f), `${f} evidence exported`);
    assert.deepEqual(validateRepo(p.repo, { today: TODAY }).errors, []);
  } finally { p.cleanup(); }
});

// ================================================================== Task 2 — market gate reconciled (framework only, fail closed)
test('T2: the registry no longer claims the market gate is operational; no market is active or published', () => {
  const reg = readJson(path.join(ROOT, 'desk/data/methods.json')).methods.find(m => m.id === 'M-MARKET-GATE');
  assert.equal(reg.status, 'INACTIVE'); assert.equal(reg.validation_status, 'FRAMEWORK_ONLY'); assert.equal(reg.implemented, false); assert.equal(reg.documented, false);
  const mk = readJson(path.join(ROOT, 'desk/data/public/markets.json')).records;
  assert.deepEqual(mk.map(m => [m.id, m.activation]), [['MKT-IST', 'INACTIVE'], ['MKT-DXB', 'INACTIVE'], ['MKT-AUH', 'INACTIVE']]);
  const r = validateRepo(ROOT, { today: TODAY });
  assert.deepEqual(r.errors, []); assert.deepEqual(r.report.index.markets, []); assert.deepEqual(r.report.index.opportunities, []);
  assert.equal(r.report.methods['M-MARKET-GATE'], 'INACTIVE');
  // generated market pages label every market inactive / in research — never "Active"
  for (const slug of ['istanbul', 'dubai', 'abu-dhabi']) assert.doesNotMatch(fs.readFileSync(path.join(ROOT, 'desk/markets', slug, 'index.html'), 'utf8'), /Market · Active/);
});

test('T2: fail closed — activating a real market without an operational gate is a validation error (V21)', () => {
  const repo = tmpRepo();
  try {
    const mp = path.join(repo, 'desk/data/public/markets.json'); const mk = readJson(mp);
    mk.records[0].activation = 'ACTIVE'; writeJson(mp, mk);
    const e = validateRepo(repo, { today: TODAY }).errors;
    assert.ok(e.some(x => x.code === 'V21' && x.id === 'MKT-IST'), JSON.stringify(e.map(x => x.code)));
    // switching the registry entry on is refused while it has no implementation (M01)
    const rp = path.join(repo, 'desk/data/methods.json');
    fs.writeFileSync(rp, fs.readFileSync(rp, 'utf8').replace('"id": "M-MARKET-GATE", "name": "Market publication gate", "status": "INACTIVE", "documented": false, "validation_status": "FRAMEWORK_ONLY"', '"id": "M-MARKET-GATE", "name": "Market publication gate", "status": "ACTIVE", "documented": true, "validation_status": "RULES_APPROVED"'));
    assert.ok(validateRepo(repo, { today: TODAY }).errors.some(x => x.code === 'M01' && x.id === 'M-MARKET-GATE' && /no implementation/.test(x.msg)));
  } finally { fs.rmSync(repo, { recursive: true, force: true }); }
});

test('T2: an opportunity in a real market is never eligible while the gate is inactive or the registry is missing', () => {
  assert.ok(why(run(base(), 'private', GATE_OFF)).includes('market gate not operational (M-MARKET-GATE is framework only)'));
  assert.ok(why(validateDataset(base(), { mode: 'private', today: TODAY })).includes('market gate not operational (M-MARKET-GATE is framework only)'), 'no registry passed → fail closed');
  assert.ok(codes(run(base(), 'private', GATE_OFF)).includes('V21'));
  assert.ok(!why(run(base())).includes('market gate not operational (M-MARKET-GATE is framework only)'));
});

test('T2 (end to end): with the real registry a complete package can be ingested but never approved or exported', () => {
  const s = realSetup({ marketGate: false });
  try {
    assert.equal(cli(s.repo, ['ingest', '--package', s.base, ...s.S, '--apply']).code, 0);
    cli(s.repo, ['approve-disclosure', ...s.S, '--id', 'DSC-TST-ILLUSTRATIVE-RESIDENCE-A-01', '--by', 'owner']); approveImages(s);
    const before = snap(path.join(s.repo, 'desk'));
    const r = cli(s.repo, ['approve', ...s.S, '--id', OPP, '--by', 'owner']);
    assert.notEqual(r.code, 0); assert.match(r.out, /market gate not operational/);
    assert.notEqual(cli(s.repo, ['export', ...s.S, '--id', OPP]).code, 0);
    assert.deepEqual(snap(path.join(s.repo, 'desk')), before, 'nothing written to the public tree');
  } finally { s.cleanup(); }
});

// ================================================================== Task 3 — freshness controls (deterministic, no hidden clock)
test('T3: the review policy reads no clock; results depend only on the inputs; the ingestion report uses the same policy', () => {
  const src = fs.readFileSync(path.join(ROOT, 'desk/assets/js/policy.js'), 'utf8').replace(/\/\/[^\n]*/g, '');
  assert.doesNotMatch(src, /Date\.now|new Date\(\s*\)|performance\.now/);
  const e = ev({ field: 'delivery_status', retrieved_at: '2026-01-01' });
  assert.deepEqual(evidenceFreshness(e, '2026-10-27'), evidenceFreshness(e, '2026-10-27'));
  assert.equal(evidenceFreshness(e, '2026-10-27').state, 'EXPIRED'); // delivery status: expire after 180 days
  assert.equal(evidenceFreshness(e, '2026-03-01').state, 'CURRENT');
  assert.equal(evidenceFreshness(ev({ retrieved_at: '2026-02-30' }), TODAY).state, 'INVALID');
  const ing = fs.readFileSync(path.join(ROOT, 'desk/_tools/ingest.mjs'), 'utf8');
  assert.match(ing, /evidenceFreshness\(e, today/); assert.doesNotMatch(ing, /STALE_DAYS/);
  // no scheduled job exists, so stale-evidence alerts are not claimed anywhere as implemented
  for (const f of fs.readdirSync(path.join(ROOT, '.github/workflows'))) assert.doesNotMatch(fs.readFileSync(path.join(ROOT, '.github/workflows', f), 'utf8'), /^\s*schedule\s*:/m, f);
});

// ================================================================== Task 4 — entity identity and relationships
const second = (s, name, fn) => s.mkPkg(name, (i) => { for (const k of ['media', 'risks', 'disclosures', 'research_blocks', 'documents', 'unknowns', 'assets', 'opportunity']) delete i[k]; i.facts = []; fn(i); });

test('T4: a second package with the same developer or project name is refused as an unresolved identity — nothing is merged or written', () => {
  const s = publishedSetup({ exportIt: false });
  try {
    for (const [name, fn, rx] of [
      ['DUP-DEV', (i) => { i.project = { name: 'Another Residence', asset_types: ['APARTMENT'] }; delete i.district; }, /UNRESOLVED IDENTITY: developer "Illustrative Developer A" matches existing DEV-ILLUSTRATIVE-DEVELOPER-A/],
      ['DUP-DEV-CASE', (i) => { i.developer = { name: 'ILLUSTRATIVE  developer a' }; i.project = { name: 'Another Residence', asset_types: [] }; delete i.district; }, /UNRESOLVED IDENTITY: developer/],
      ['DUP-PRJ', (i) => { delete i.developer; delete i.district; }, /UNRESOLVED IDENTITY: project "Illustrative Residence A" matches existing PRJ-TST-ILLUSTRATIVE-RESIDENCE-A/],
      ['DUP-DST', (i) => { delete i.developer; i.project = { name: 'Another Residence', asset_types: [] }; }, /UNRESOLVED IDENTITY: district "Illustrative District North"/]
    ]) {
      const before = snap(s.store);
      const r = cli(s.repo, ['ingest', '--package', second(s, name, fn), ...s.S, '--apply']);
      assert.notEqual(r.code, 0, `${name}: ${r.out}`); assert.match(r.out, rx, name); assert.match(r.out, /nothing was written/);
      assert.deepEqual(snap(s.store), before, `${name}: store unchanged`);
    }
  } finally { s.cleanup(); }
});

test('T4: identity is linked by explicit ID (ref) or kept separate by explicit instruction (new) — never by name', () => {
  const s = publishedSetup({ exportIt: false });
  try {
    // ref → the existing developer and district; a new project
    let r = cli(s.repo, ['ingest', '--package', second(s, 'REF', (i) => { i.developer = { ref: 'DEV-ILLUSTRATIVE-DEVELOPER-A', name: 'Illustrative Developer A' }; i.district = { ref: 'DST-TST-ILLUSTRATIVE-DISTRICT-NORTH' }; i.project = { name: 'Another Residence', asset_types: [] }; }), ...s.S, '--apply']);
    assert.equal(r.code, 0, r.out); assert.match(r.out, /developer DEV-ILLUSTRATIVE-DEVELOPER-A — linked by explicit ref/);
    const devs = readJson(path.join(s.store, 'data/developers.json')).records;
    assert.equal(devs.length, 1);
    assert.equal(readJson(path.join(s.store, 'data/projects.json')).records.find(p => p.name === 'Another Residence').developer_id, 'DEV-ILLUSTRATIVE-DEVELOPER-A');
    // new → a separate developer record with a distinct ID; the validator reports the possible duplicate (W03), nothing merged
    r = cli(s.repo, ['ingest', '--package', second(s, 'NEW', (i) => { i.developer = { name: 'Illustrative Developer A', new: true }; i.district = { ref: 'DST-TST-ILLUSTRATIVE-DISTRICT-NORTH' }; i.project = { name: 'Third Residence', asset_types: [] }; }), ...s.S, '--apply']);
    assert.equal(r.code, 0, r.out); assert.match(r.out, /developer DEV-ILLUSTRATIVE-DEVELOPER-A-2 — new record by explicit instruction; same name as DEV-ILLUSTRATIVE-DEVELOPER-A \(not merged\)/);
    const ds = { collections: Object.fromEntries(['categories', 'markets', 'districts', 'areas', 'developers', 'projects', 'assets', 'opportunities', 'evidence', 'sources', 'conflicts', 'risks', 'research_blocks', 'media', 'disclosures'].map(c => { const f = path.join(s.store, 'data', `${c}.json`); return [c, fs.existsSync(f) ? readJson(f).records : []]; })) };
    const w = validateDataset(ds, { mode: 'private', today: TODAY, methods: GATE_ON }).warnings.filter(x => x.code === 'W03');
    assert.ok(w.some(x => x.id === 'DEV-ILLUSTRATIVE-DEVELOPER-A-2'), JSON.stringify(w));
    // re-ingesting the original package is a re-ingestion of the same records, not a guess
    r = cli(s.repo, ['ingest', '--package', s.base, ...s.S]);
    assert.match(r.out, /project PRJ-TST-ILLUSTRATIVE-RESIDENCE-A — created earlier by this same package \(re-ingestion\)/);
  } finally { s.cleanup(); }
});

test('T4: invalid or conflicting identity references are refused', () => {
  const s = publishedSetup({ exportIt: false });
  try {
    for (const [name, fn, rx] of [
      ['REF-MISSING', (i) => { i.developer = { ref: 'DEV-DOES-NOT-EXIST' }; delete i.district; i.project = { name: 'X', asset_types: [] }; }, /developer\.ref DEV-DOES-NOT-EXIST does not exist/],
      ['REF-TYPE', (i) => { i.developer = { ref: 'DST-TST-ILLUSTRATIVE-DISTRICT-NORTH' }; delete i.district; i.project = { name: 'X', asset_types: [] }; }, /developer\.ref DST-TST-ILLUSTRATIVE-DISTRICT-NORTH is not a developer record/],
      ['REF-BOTH', (i) => { i.developer = { ref: 'DEV-ILLUSTRATIVE-DEVELOPER-A', new: true }; }, /use either ref \(existing record\) or new/],
      ['REF-FORMAT', (i) => { i.project.ref = 'illustrative residence a'; }, /project\.ref must be an existing record ID/]
    ]) {
      const before = snap(s.store);
      const r = cli(s.repo, ['ingest', '--package', second(s, name, fn), ...s.S, '--apply']);
      assert.notEqual(r.code, 0, name); assert.match(r.out, rx, `${name}: ${r.out}`); assert.deepEqual(snap(s.store), before, name);
    }
    // the project already has a developer: a package naming another developer for it is refused (conflicting identity)
    let r = cli(s.repo, ['ingest', '--package', second(s, 'OTHER-DEV', (i) => { i.developer = { name: 'Completely Different Developer' }; delete i.district; i.project = { ref: PRJ, name: 'Illustrative Residence A' }; }), ...s.S, '--apply']);
    assert.notEqual(r.code, 0); assert.match(r.out, /differs from the project's existing developer DEV-ILLUSTRATIVE-DEVELOPER-A; not changed/);
    // a source matching an existing one by name and publisher but with another tier is not silently re-used
    r = cli(s.repo, ['ingest', '--package', second(s, 'SRC-TIER', (i) => { delete i.developer; delete i.district; i.project = { ref: PRJ, name: 'Illustrative Residence A' }; i.sources[0].tier = 3; }), ...s.S, '--apply']);
    assert.notEqual(r.code, 0); assert.match(r.out, /tier\/type differ/);
  } finally { s.cleanup(); }
});

test('T4: references are typed and stable; cross-project evidence, risk and media leakage is rejected', () => {
  const V03 = (ds) => msgs(run(ds), 'V03');
  // opportunity asset from another project; project developer pointing at a district; unknown id
  let ds = base(); ds.collections.opportunities[0].asset_id = 'AST-T-B1';
  assert.ok(V03(ds).some(m => /asset belongs to a different project/.test(m)));
  ds = base(); ds.collections.projects[0].developer_id = 'DST-T-N';
  assert.ok(V03(ds).some(m => /DST-T-N is a districts record, expected developers/.test(m)));
  ds = base(); ds.collections.projects[0].district_id = 'DST-T-GONE';
  assert.ok(V03(ds).some(m => /unresolved reference DST-T-GONE/.test(m)));
  // risk of project A citing evidence about project B
  const eb = ev({ subject: { type: 'project', id: PB }, field: 'delivery_status' });
  ds = base({ evidence: [eb], risks: [{ id: 'RSK-T-1', subject: { type: 'project', id: PA }, risk_type: 'OTHER', title: { en: 'r' }, cause: null, evidence_ids: [eb.id], severity: null, probability: null, horizon: null, controllability: null, mitigation: null, residual_uncertainty: null, status: 'OPEN', field_states: [], is_illustrative: false }] });
  assert.ok(V03(ds).some(m => m.includes(`is evidence about project ${PB}, outside this risk's project`)));
  // evidence of the opportunity's own asset and developer is inside the project and accepted
  const ea = ev({ subject: { type: 'asset', id: 'AST-T-A1' }, field: 'unit_type' });
  ds.collections.evidence.push(ea); ds.collections.risks[0].evidence_ids = [ea.id];
  assert.ok(!V03(ds).some(m => /outside this risk's project/.test(m)));
  // media bound to project A but stored under project B's folder, and one file used by two projects
  const med = (id, subj, p, sha) => ({ id, subject: { type: 'project', id: subj }, media_type: 'RENDERING', content_category: 'exterior', caption: { en: 'c' }, alt: { en: 'a' }, depicted_date: null, provenance: { source_id: 'SRC-T3', provided_by_role: 'x', received_at: '2026-10-01', media_kit_ref: null }, verification_status: 'DEVELOPER-CLAIM', permission: { status: 'GRANTED_WRITTEN', scope: ['desk_web'], evidence_ref: 'PRIV-1', granted_at: '2026-10-01', expires_at: null }, attribution: { required: false, text: null }, role: 'gallery', order: 0, file: { public_path: p, width: 1, height: 1, sha256: sha }, is_illustrative: false, review: null });
  ds = base({ media: [med('MED-T-A-001', PA, `desk/media/${PB}/MED-T-A-001.webp`, 'a'.repeat(64)), med('MED-T-B-001', PB, `desk/media/${PB}/MED-T-B-001.webp`, 'a'.repeat(64))] });
  const v11 = msgs(run(ds), 'V11');
  assert.ok(v11.some(m => m.startsWith('MED-T-A-001') && /file must be desk\/media\/PRJ-T-A\//.test(m)));
  assert.ok(v11.some(m => m.startsWith('MED-T-B-001') && /same image file as MED-T-A-001 of PRJ-T-A/.test(m)));
  // duplicate names are reported (W03) but never merged
  ds = base(); ds.collections.developers.push({ ...ds.collections.developers[0], id: 'DEV-T-A2', name: 'DEV  a' });
  const r = run(ds); assert.ok(r.warnings.some(x => x.code === 'W03' && x.id === 'DEV-T-A2'));
  assert.equal(r.eligibility.opportunities['OPP-T-A'].length > 0, true);
  assert.equal(ds.collections.developers.length, 2, 'validation never merges records');
});

test('T4: the committed fixture store links later packages by ID and records which package created each entity', () => {
  const idx = readJson(path.join(ROOT, 'desk/_fixtures/private/entity_index.json'));
  assert.equal(idx['FIX-PRJ-ILL-ILLUSTRATIVE-RESIDENCE-A'].created_by, 'FIX-PKG-A');
  assert.equal(idx['FIX-DST-ILL-ILLUSTRATIVE-DISTRICT-NORTH'].created_by, 'FIX-PKG-A');
  for (const p of ['FIX-PKG-A2', 'FIX-PKG-A3']) assert.equal(readJson(path.join(ROOT, `desk/_fixtures/packages/${p}/intake.json`)).project.ref, 'FIX-PRJ-ILL-ILLUSTRATIVE-RESIDENCE-A');
  assert.equal(readJson(path.join(ROOT, 'desk/_fixtures/packages/FIX-PKG-C/intake.json')).district.ref, 'FIX-DST-ILL-ILLUSTRATIVE-DISTRICT-NORTH');
  void enableTestMarketGate;
});

test('CI runs every node test suite in desk/_tests', () => {
  const wf = fs.readFileSync(path.join(ROOT, '.github/workflows/desk-validate.yml'), 'utf8');
  const cmd = (wf.match(/run: node --test ([^\n]+)/) || [])[1] || '';
  for (const f of fs.readdirSync(path.join(ROOT, 'desk/_tests')).filter(f => f.endsWith('.test.mjs'))) assert.ok(cmd.split(/\s+/).includes(`desk/_tests/${f}`), `${f} is not run in CI`);
});
