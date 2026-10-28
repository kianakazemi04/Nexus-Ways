// Phase 1 (P0) regression tests for the 27 Oct 2026 audit — run with:  node --test desk/_tests/
// Each test first reproduces the original defect (B1 pending disclosure dropped, B2 price in free text, B3 store
// inside the repository, B4 deployment not gated) and then asserts the safe behaviour.
// Synthetic TEST-ONLY data only; everything runs in temporary copies of the repository.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { validateDataset, validateRepo, commercialTextHits } from '../_tools/validate.mjs';
import { assertStorePath, StorePathError } from '../_tools/ingest.mjs';
import { enableTestMarketGate, seedTestMarketGate } from './helpers.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
import { TODAY } from './helpers.mjs';
const codes = (r) => r.errors.map(e => e.code);
const readJson = (p) => JSON.parse(fs.readFileSync(p, 'utf8'));
// B3: images are approved one by one; approve every image whose permission allows it (others are refused, as intended)
const approveImages = (run, repo, storeArgs, storeDir) => { const f = path.join(storeDir, 'data/media.json'); if (!fs.existsSync(f)) return []; return JSON.parse(fs.readFileSync(f, 'utf8')).records.map(m => [m.id, run(repo, ['approve-media', ...storeArgs, '--id', m.id, '--by', 'owner']).code]); };

const writeJson = (p, j) => fs.writeFileSync(p, JSON.stringify(j, null, 2) + '\n');
const tmp = (p) => fs.mkdtempSync(path.join(os.tmpdir(), p));
function tmpRepo() {
  const dir = tmp('desk-p0-');
  fs.cpSync(ROOT, dir, { recursive: true, filter: (src) => !src.includes(`${path.sep}.git${path.sep}`) && !src.endsWith(`${path.sep}.git`) });
  return dir;
}
const cli = (repo, args) => {
  try { return { code: 0, out: execFileSync('node', [path.join(repo, 'desk/_tools/ingest.mjs'), ...args, '--today', TODAY], { cwd: repo, stdio: ['ignore', 'pipe', 'pipe'] }).toString() }; }
  catch (e) { return { code: e.status, out: String(e.stdout) + String(e.stderr) }; }
};
const snapshotDir = (d) => Object.fromEntries(fs.readdirSync(d).map(f => [f, fs.readFileSync(path.join(d, f), 'utf8')]));

// A temporary real (non-fixture) store with a TEST-ONLY package derived from fixture A (as in desk.test.mjs).
function realStoreSetup({ mutate } = {}) {
  const repo = tmpRepo(); const store = tmp('desk-p0-store-');
  const mp = path.join(repo, 'desk/data/public/markets.json'); const mk = readJson(mp);
  const tst = { ...mk.records[0], id: 'MKT-TST', slug: 'test-market', name: 'TEST-ONLY market', activation: 'ACTIVE', record_status: 'PUBLISHED', review: { approved_by: 'owner', approved_at: TODAY, gate_version: 'MG-1' }, summary: { en: 'TEST-ONLY' }, research_block_ids: [], evidence_ids: [], field_states: [] };
  enableTestMarketGate(repo); seedTestMarketGate(repo, store, tst); mk.records.push(tst); writeJson(mp, mk);
  fs.mkdirSync(path.join(store, 'data'), { recursive: true });
  writeJson(path.join(store, 'data/markets.json'), { schema_version: '1.1', collection: 'markets', records: [tst] });
  const pkg = path.join(store, 'pkg'); fs.cpSync(path.join(repo, 'desk/_fixtures/packages/FIX-PKG-A'), pkg, { recursive: true });
  fs.rmSync(path.join(pkg, 'raw/plan-2plus1.svg'));
  const intake = readJson(path.join(pkg, 'intake.json'));
  intake.package_id = 'TEST-PKG-P0'; intake.market.slug = 'test-market';
  intake.media = intake.media.filter(m => !m.file.endsWith('.svg'));
  if (mutate) mutate(intake);
  execFileSync('python3', ['-c', "import sys,glob\nfrom PIL import Image,ImageDraw\nfor f in glob.glob(sys.argv[1]+'/raw/*'):\n  im=Image.open(f); ImageDraw.Draw(im).text((70,330),'TEST-ONLY P0',fill=(255,255,255)); im.save(f, exif=im.info.get('exif',b''))", pkg]);
  writeJson(path.join(pkg, 'intake.json'), intake);
  return { repo, store, pkg, cleanup: () => { fs.rmSync(repo, { recursive: true, force: true }); fs.rmSync(store, { recursive: true, force: true }); } };
}
const OPP = 'OPP-TST-ILLUSTRATIVE-RESIDENCE-A';
const DSC = (n) => `DSC-TST-ILLUSTRATIVE-RESIDENCE-A-0${n}`;

// ================================================================== B1 — every applicable disclosure must be approved
const base = () => ({
  collections: {
    categories: [{ id: 'CAT-RE', key: 'real_estate', slug: 'real-estate', name: { en: 'Real Estate' }, activation: 'ACTIVE', is_illustrative: false }],
    markets: [{ id: 'MKT-T', slug: 't', name: 'T', country: 'TR', currency: 'TRY', category: 'real_estate', activation: 'ACTIVE', record_status: 'DRAFT', research_block_ids: [], evidence_ids: [], field_states: [], last_reviewed: null, is_illustrative: false, review: null }],
    sources: [{ id: 'SRC-T1', name: 'n', publisher: 'p', url: null, tier: 2, source_type: 'OTHER', accessed_at: null, is_illustrative: false }],
    projects: [{ id: 'PRJ-T-A', category: 'real_estate', market_id: 'MKT-T', developer_id: null, name: 'A', slug: 'a', district_id: null, area_id: null, delivery_status: null, asset_types: [], record_status: 'DRAFT', research_block_ids: [], evidence_ids: [], risk_ids: [], field_states: [], is_illustrative: false }],
    opportunities: [{ id: 'OPP-T-A', category: 'real_estate', subject: { type: 'project', id: 'PRJ-T-A' }, market_id: 'MKT-T', asset_id: null, title: { en: 't' }, summary: { en: 's' }, record_status: 'DRAFT', disclosure_ids: [], evidence_ids: [], risk_ids: [], field_states: [], last_verified: null, is_illustrative: false, review: null }],
    disclosures: [], evidence: [], risks: [], conflicts: [], media: []
  }
});
const dsc = (id, kind, legal_review, extra = {}) => ({ id, subject: { type: 'opportunity', id: 'OPP-T-A' }, kind, text: { en: `${kind} text` }, legal_review, approved_at: legal_review === 'APPROVED' ? TODAY : null, is_illustrative: false, ...extra });
const gate = (ds, mode = 'private') => validateDataset(ds, { mode, today: TODAY, methods: { 'M-RISK-SEVERITY': 'INACTIVE', 'M-MARKET-GATE': 'ACTIVE' } });
const discReasons = (r) => r.eligibility.opportunities['OPP-T-A'].filter(w => /disclosure/.test(w));

test('B1 regression: an approved generic notice no longer covers a pending COMMISSION disclosure', () => {
  const ds = base();
  ds.collections.disclosures = [dsc('DSC-T-01', 'COMMISSION', 'PENDING'), dsc('DSC-T-02', 'LEGAL_NOTICE', 'APPROVED')];
  ds.collections.opportunities[0].disclosure_ids = ['DSC-T-01', 'DSC-T-02'];
  assert.deepEqual(discReasons(gate(ds)), ['disclosure DSC-T-01 (COMMISSION) legal review pending']);
  ds.collections.disclosures[0] = dsc('DSC-T-01', 'COMMISSION', 'APPROVED');
  assert.deepEqual(discReasons(gate(ds)), [], 'all approved → no disclosure reason');
});
test('B1: an unlinked disclosure recorded against the opportunity or its project still applies', () => {
  for (const subject of [{ type: 'opportunity', id: 'OPP-T-A' }, { type: 'project', id: 'PRJ-T-A' }]) {
    const ds = base();
    ds.collections.disclosures = [dsc('DSC-T-02', 'LEGAL_NOTICE', 'APPROVED'), dsc('DSC-T-03', 'CONFLICT_OF_INTEREST', 'PENDING', { subject })];
    ds.collections.opportunities[0].disclosure_ids = ['DSC-T-02'];
    const w = discReasons(gate(ds));
    assert.ok(w.includes('disclosure DSC-T-03 (CONFLICT_OF_INTEREST) legal review pending'), JSON.stringify(w));
    assert.ok(w.includes('disclosure DSC-T-03 applies to this opportunity but is not linked to it'));
  }
});
test('B1: no disclosure, a missing linked disclosure, and APPROVED without a date all block', () => {
  const ds = base(); assert.ok(discReasons(gate(ds)).includes('no disclosure recorded'));
  const d2 = base(); d2.collections.opportunities[0].disclosure_ids = ['DSC-T-09'];
  assert.ok(discReasons(gate(d2)).includes('linked disclosure DSC-T-09 is missing'));
  const d3 = base(); d3.collections.disclosures = [dsc('DSC-T-01', 'COMMISSION', 'APPROVED', { approved_at: null })]; d3.collections.opportunities[0].disclosure_ids = ['DSC-T-01'];
  assert.ok(discReasons(gate(d3)).includes('disclosure DSC-T-01 approved without a date'));
  assert.ok(codes(gate(d3, 'public')).includes('V17'));
});
test('B1 regression (end to end): approve and export are refused while a COMMISSION disclosure is pending; nothing is skipped', () => {
  const s = realStoreSetup({ mutate: (i) => i.disclosures.push({ kind: 'LEGAL_NOTICE', text: { en: 'TEST-ONLY generic legal notice.' } }) });
  try {
    const S = ['--store', s.store];
    assert.equal(cli(s.repo, ['ingest', '--package', s.pkg, ...S, '--apply']).code, 0);
    const pubDir = path.join(s.repo, 'desk/data/public'); const before = snapshotDir(pubDir);
    // original defect: only the generic notice approved → approve + export used to succeed and drop the commission disclosure
    assert.equal(cli(s.repo, ['approve-disclosure', ...S, '--id', DSC(2), '--by', 'owner']).code, 0);
    approveImages(cli, s.repo, S, s.store);
    let r = cli(s.repo, ['approve', ...S, '--id', OPP, '--by', 'owner']);
    assert.equal(r.code, 1, r.out); assert.match(r.out, new RegExp(`disclosure ${DSC(1)} \\(COMMISSION\\) legal review pending`));
    // even with the status forced by hand in the store, export refuses and writes nothing
    const op = path.join(s.store, 'data/opportunities.json'); const oj = readJson(op);
    Object.assign(oj.records.find(o => o.id === OPP), { record_status: 'PUBLISHED', review: { approved_by: 'owner', approved_at: TODAY, gate_version: 'G3-v1' } }); writeJson(op, oj);
    r = cli(s.repo, ['export', ...S, '--id', OPP]);
    assert.notEqual(r.code, 0); assert.match(r.out, /COMMISSION/);
    assert.deepEqual(snapshotDir(pubDir), before, 'public data unchanged after a refused export');
    // once the commission disclosure is approved too, both are exported — none skipped
    assert.equal(cli(s.repo, ['approve-disclosure', ...S, '--id', DSC(1), '--by', 'owner']).code, 0);
    assert.equal(cli(s.repo, ['approve', ...S, '--id', OPP, '--by', 'owner']).code, 0);
    r = cli(s.repo, ['export', ...S, '--id', OPP]); assert.equal(r.code, 0, r.out);
    assert.doesNotMatch(r.out, /legal review pending/);
    const pd = readJson(path.join(pubDir, 'disclosures.json')).records.map(d => [d.id, d.kind, d.legal_review]);
    assert.deepEqual(pd, [[DSC(1), 'COMMISSION', 'APPROVED'], [DSC(2), 'LEGAL_NOTICE', 'APPROVED']]);
    assert.deepEqual(readJson(path.join(pubDir, 'opportunities.json')).records[0].disclosure_ids, [DSC(1), DSC(2)]);
    assert.deepEqual(validateRepo(s.repo, { today: TODAY }).errors, []);
  } finally { s.cleanup(); }
});

// ================================================================== B2 — prices and commercial terms in free text
const POSITIVE = ['Units are offered from 5,000,000 TRY', 'Prices start at AED 2.1m', 'one-bedroom unit for Dh3.5m', 'a Dhs100bn masterplan', 'priced from $1.2M', 'US$10m+ homes', '€450,000 for a two-bedroom',
  '£1,250,000', '₺12.500.000', '12.500.000 ₺', '1,5 milyon TL', '4 bin TL kira', 'TL 4 milyon', 'fiyatı 12.500.000', 'starting from 2.5 million', '2 million dollars', 'AED 2,500 per sq ft',
  '~43,100/m²', '2,500 per sq ft', 'rental yield of 7%', '8% gross yield', 'guaranteed 6% return', '%5 komisyon', 'commission of 2%', '10% down payment', '%30 peşinat', '60/40 payment plan',
  'payment plan 60/40', '36 ay taksit', 'post-handover payment plan over 24 months', 'rent from 85,000 per year', 'kira getirisi %6', 'ROI 9.5%', 'SAR 3,000,000', '5 000 000 TRY', 'QAR 1.2 million'];
const NEGATIVE = ['Completion targeted Q2 2027', '2026-10-27', 'apartments from 300 m²', '92 units, apartments from 300 m²', '40-floor tower', 'EVD-IST-0001', 'see page 12', '2+1 and 3+1 layouts',
  '1.67 million square metres', '58,000 residents', 'Tier 4 source', 'TR10, 2023=100', 'built in 2015', '6 buildings and 11 blocks', 'Phase 2 of 4', 'construction 22% complete',
  'index rose 26.8% year on year', 'rent index up 35.5%', 'Frond O villas', 'the developer will try to deliver', 'Delivery in 36 months', 'Over 100 projects delivered', 'starting from 2027',
  'Sales from 27 Aug 2025', 'Lot 12 of 40', 'AED is the currency of the UAE', 'Nexus Ways may receive a commission from the developer if a purchase completes.', 'Gross area 145 m2 (GROSS)', '2,000 villas planned'];

test('B2: realistic price and commercial-term formats are detected', () => {
  for (const s of POSITIVE) assert.ok(commercialTextHits(s).length > 0, `not detected: ${s}`);
});
test('B2: harmless numbers (dates, dimensions, counts, progress, index changes, identifiers) are not blocked', () => {
  for (const s of NEGATIVE) assert.deepEqual(commercialTextHits(s), [], `false positive: ${s}`);
});
test('B2 regression: "Units are offered from 5,000,000 TRY" in a claim is a V16 error in public data and a gate reason in a store', () => {
  const ds = base();
  ds.collections.evidence.push({ id: 'EVD-T-1', source_id: 'SRC-T1', subject: { type: 'project', id: 'PRJ-T-A' }, field: null, claim: { en: 'Units are offered from 5,000,000 TRY' }, value: null, unit: null, currency: null, geography: 'T', period: null, evidence_class: 'FACT', verification_status: 'DEVELOPER-CLAIM', source_tier: 2, retrieved_at: '2026-10-01', conflict_ids: [], is_illustrative: false, source_url: 'https://example.org/dubai-us$-10m-report' });
  const pub = gate(ds, 'public');
  const v16 = pub.errors.filter(e => e.code === 'V16');
  assert.equal(v16.length, 1, JSON.stringify(v16)); assert.match(v16[0].msg, /claim\.en/); assert.doesNotMatch(v16[0].msg, /source_url/, 'links are not prose');
  const priv = gate(ds, 'private');
  assert.ok(!codes(priv).includes('V16'), 'private store may hold the text');
  assert.ok(priv.eligibility.opportunities['OPP-T-A'].includes('EVD-T-1 has a price or commercial term in free text'));
  // the same text in an opportunity summary, a risk title or a disclosure is caught too
  for (const [coll, mut] of [['opportunities', (r) => { r.summary = { en: 'Payment plan 60/40 available' }; }], ['projects', (r) => { r.description = { en: 'Studios priced from $250k' }; }]]) {
    const d = base(); mut(d.collections[coll][0]); assert.ok(codes(gate(d, 'public')).includes('V16'), coll);
  }
});
test('B2 regression (end to end): a price inside a claim blocks owner approval of a real-store package', () => {
  const s = realStoreSetup({ mutate: (i) => { i.facts.find(f => f.key === 'F-STATUS').claim = { en: 'Construction is under way. Units are offered from 5,000,000 TRY.' }; } });
  try {
    const S = ['--store', s.store];
    assert.equal(cli(s.repo, ['ingest', '--package', s.pkg, ...S, '--apply']).code, 0);
    assert.equal(cli(s.repo, ['approve-disclosure', ...S, '--id', DSC(1), '--by', 'owner']).code, 0);
    approveImages(cli, s.repo, S, s.store);
    const r = cli(s.repo, ['approve', ...S, '--id', OPP, '--by', 'owner']);
    assert.equal(r.code, 1, r.out); assert.match(r.out, /has a price or commercial term in free text/);
    assert.notEqual(cli(s.repo, ['export', ...S, '--id', OPP]).code, 0);
    // and if such text were ever committed to public data by hand, the repository validator fails (CI)
    const pubDir = path.join(s.repo, 'desk/data/public'); const pp = path.join(pubDir, 'categories.json'); const cj = readJson(pp);
    cj.records[0].description = { en: 'Homes from AED 2.1m' }; writeJson(pp, cj);
    assert.ok(codes(validateRepo(s.repo, { today: TODAY })).includes('V16'));
  } finally { s.cleanup(); }
});

// ================================================================== B3 — store paths inside the repository
test('B3 regression: every store path inside the repository is refused after resolution', () => {
  const repo = tmpRepo(); const outside = tmp('desk-p0-out-');
  try {
    fs.symlinkSync(path.join(repo, 'research-store-real'), path.join(outside, 'link-into-repo'));
    const inside = [
      repo, path.join(repo, 'research-store'), path.join(repo, 'desk/data'), path.join(repo, 'about'),
      path.join(repo, 'x', '..', 'research-store'), path.join(repo, 'desk', '..', 'private', 'nested', 'deeper'),
      path.join(outside, 'link-into-repo'), path.join(outside, 'link-into-repo', 'not-yet-created'),
      `${repo}${path.sep}.${path.sep}store`, path.join(repo, 'desk/_fixtures')
    ];
    fs.mkdirSync(path.join(repo, 'research-store-real'));
    for (const p of inside) assert.throws(() => assertStorePath(p, repo), StorePathError, p);
    for (const p of ['', '   ', null, undefined, 'a\0b']) assert.throws(() => assertStorePath(p, repo), StorePathError, String(p));
    assert.throws(() => assertStorePath(path.dirname(repo), repo), /must not contain the public repository/);
    assert.throws(() => assertStorePath(outside, repo, { fixture: true }), /--fixture requires/);
    // a store that itself contains a link into the repository is refused (readiness closure); remove it for the allowed cases
    assert.throws(() => assertStorePath(outside, repo), /into the public repository/); fs.unlinkSync(path.join(outside, 'link-into-repo'));
    // allowed: outside the repository (existing or not yet created) and, with --fixture, exactly desk/_fixtures
    assert.equal(assertStorePath(outside, repo), fs.realpathSync(outside));
    assert.ok(assertStorePath(path.join(outside, 'new', 'store'), repo).endsWith(path.join('new', 'store')));
    assert.equal(assertStorePath(path.join(repo, 'desk/_fixtures'), repo, { fixture: true }), fs.realpathSync(path.join(repo, 'desk/_fixtures')));
  } finally { fs.rmSync(repo, { recursive: true, force: true }); fs.rmSync(outside, { recursive: true, force: true }); }
});

test('B3 regression (readiness closure): a link inside the store that leads outside it is refused', () => {
  const repo = tmpRepo(); const store = tmp('desk-p0-store-'); const elsewhere = tmp('desk-p0-else-');
  try {
    fs.mkdirSync(path.join(store, 'data'));
    assert.equal(assertStorePath(store, repo), fs.realpathSync(store), 'a plain store is accepted');
    fs.mkdirSync(path.join(store, 'inner')); fs.symlinkSync(path.join(store, 'inner'), path.join(store, 'data', 'alias'));
    assert.equal(assertStorePath(store, repo), fs.realpathSync(store), 'a link that stays inside the store is accepted');
    fs.symlinkSync(path.join(repo, 'desk'), path.join(store, 'reports'));
    assert.throws(() => assertStorePath(store, repo), /reports leads outside the store into the public repository/);
    fs.unlinkSync(path.join(store, 'reports'));
    fs.mkdirSync(path.join(store, 'private', 'analysis'), { recursive: true }); fs.symlinkSync(elsewhere, path.join(store, 'private', 'analysis', 'x'));
    assert.throws(() => assertStorePath(store, repo), /leads outside the store/);
    fs.unlinkSync(path.join(store, 'private', 'analysis', 'x')); fs.symlinkSync(path.join(store, 'missing-target'), path.join(store, 'dangling'));
    assert.throws(() => assertStorePath(store, repo), /cannot be resolved safely/);
    // the CLI refuses before touching anything
    fs.unlinkSync(path.join(store, 'dangling')); fs.symlinkSync(path.join(repo, 'desk'), path.join(store, 'media'));
    const r = cli(repo, ['gate', '--store', store]); assert.notEqual(r.code, 0); assert.match(r.out, /leads outside the store/);
  } finally { for (const x of [repo, store, elsewhere]) fs.rmSync(x, { recursive: true, force: true }); }
});
test('B3 regression (CLI): a store at <repo>/research-store is refused for every command and nothing is written', () => {
  const repo = tmpRepo();
  try {
    const st = path.join(repo, 'research-store');
    const pkg = path.join(repo, 'desk/_fixtures/packages/FIX-PKG-A');
    for (const args of [['gate'], ['ingest', '--package', pkg, '--apply'], ['approve', '--id', OPP, '--by', 'owner'], ['approve-disclosure', '--id', DSC(1), '--by', 'owner'], ['export', '--id', OPP]]) {
      const r = cli(repo, [args[0], '--store', st, ...args.slice(1)]);
      assert.equal(r.code, 2, `${args[0]}: ${r.out}`); assert.match(r.out, /outside the public repository/);
    }
    assert.ok(!fs.existsSync(st), 'refused store directory must not be created');
    assert.equal(cli(repo, ['gate']).code, 2, 'missing --store is refused');
  } finally { fs.rmSync(repo, { recursive: true, force: true }); }
});

// ================================================================== B4 — deployment gated on validation (repository side)
test('B4: the gated deployment workflow deploys only main, only after validation and the Pages build pass', () => {
  const wf = fs.readFileSync(path.join(ROOT, '.github/workflows/desk-pages-deploy.yml'), 'utf8');
  const val = fs.readFileSync(path.join(ROOT, '.github/workflows/desk-validate.yml'), 'utf8');
  assert.match(val, /^\s+workflow_call:\s*$/m, 'validation workflow is reusable');
  assert.match(wf, /on:\n {2}push:\n {4}branches: \[main\]\n(?!\s+workflow_dispatch)/, 'triggered only by pushes to main');
  assert.doesNotMatch(wf, /workflow_dispatch|pull_request|schedule/, 'no manual or PR-triggered deployment');
  const job = (name) => { const m = wf.match(new RegExp(`\\n {2}${name}:\\n([\\s\\S]*?)(?=\\n {2}[a-z][\\w-]*:\\n|$)`)); assert.ok(m, `job ${name}`); return m[1]; };
  assert.match(job('validate'), /uses: \.\/\.github\/workflows\/desk-validate\.yml/);
  assert.match(job('build'), /needs: validate/); assert.match(job('build'), /if: github\.ref == 'refs\/heads\/main'/);
  assert.match(job('build'), /pages_check\.py _site/);
  assert.match(job('deploy'), /needs: \[validate, build\]/); assert.match(job('deploy'), /if: github\.ref == 'refs\/heads\/main'/);
  assert.match(job('deploy'), /actions\/deploy-pages@[0-9a-f]{40} # v4\.0\.5/);
  assert.ok(!/deploy-pages/.test(job('validate') + job('build')), 'only the deploy job deploys');
  // the validation workflow itself still runs every check the deployment depends on, and the P0 tests
  for (const step of ['node desk/_tools/validate.mjs', 'node desk/_tools/build.mjs --check', 'desk/_tests/p0.test.mjs', 'pages_check.py _site', 'ui_acceptance.py']) assert.ok(val.includes(step), step);
});
// Pinning policy: every third-party action in every workflow is pinned to a full 40-character commit SHA, with the
// release it corresponds to in a trailing comment. The approved pins are listed here, so any change to an action
// (or a new action) needs a deliberate update of this list after checking the SHA against the official repository.
// SHAs verified 2026-10-28 with `git ls-remote --tags https://github.com/actions/<name>` (lightweight tags, i.e. commit
// SHAs) and by fetching each commit from the official repository.
const APPROVED_ACTION_PINS = {
  'actions/checkout': ['11d5960a326750d5838078e36cf38b85af677262', 'v4.4.0'],
  'actions/setup-node': ['49933ea5288caeca8642d1e84afbd3f7d6820020', 'v4.4.0'],
  'actions/setup-python': ['a26af69be951a213d495a4c3e4e4022e16d87065', 'v5.6.0'],
  'actions/jekyll-build-pages': ['44a6e6beabd48582f863aeeb6cb2151cc1716697', 'v1.0.13'],
  'actions/upload-pages-artifact': ['56afc609e74202658d3ffba0e8f6dda462b719fa', 'v3.0.1'],
  'actions/deploy-pages': ['d6db90164ac5ed86f2b6aed7e0febac5b3c0c03e', 'v4.0.5']
};
function pinProblem(ref, rest) {
  if (ref.startsWith('./.github/workflows/')) return null; // local reusable workflow from the same commit
  const p = ref.match(/^([\w.-]+\/[\w.-]+)@([0-9a-f]{40})$/);
  if (!p) return `"${ref}" is not pinned to a full commit SHA`;
  const want = APPROVED_ACTION_PINS[p[1]];
  if (!want) return `${p[1]} is not an approved action`;
  if (p[2] !== want[0]) return `${p[1]} SHA differs from the approved pin — after reviewing the release, update APPROVED_ACTION_PINS in desk/_tests/p0.test.mjs in the same pull request`;
  if (!new RegExp(`^\\s+#\\s*${want[1].replace(/\./g, '\\.')}\\s*$`).test(rest)) return `${p[1]} needs the comment "# ${want[1]}"`;
  return null;
}
test('B4: every workflow action is pinned to an approved full commit SHA with a version comment', () => {
  const dir = path.join(ROOT, '.github/workflows'); let seen = 0;
  for (const f of fs.readdirSync(dir).filter(f => /\.ya?ml$/.test(f))) {
    for (const line of fs.readFileSync(path.join(dir, f), 'utf8').split('\n')) {
      const m = line.match(/^\s*(?:-\s+)?uses:\s*(\S+)(.*)$/); if (!m) continue;
      if (!m[1].startsWith('./')) seen++;
      const why = pinProblem(m[1], m[2]); assert.equal(why, null, `${f}: ${why}`);
    }
  }
  assert.equal(seen, 13, 'expected the 13 known third-party action references');
  // the policy check rejects what it should
  const sha = APPROVED_ACTION_PINS['actions/checkout'][0];
  for (const [ref, rest] of [['actions/checkout@v4', ''], ['actions/checkout@main', ''], ['actions/checkout@11d5960', ' # v4.4.0'], [`evil/checkout@${sha}`, ' # v4.4.0'],
    [`actions/checkout@${'0'.repeat(40)}`, ' # v4.4.0'], [`actions/checkout@${sha}`, ''], [`actions/checkout@${sha}`, ' # v4']])
    assert.notEqual(pinProblem(ref, rest), null, `${ref}${rest} must be rejected`);
  assert.equal(pinProblem(`actions/checkout@${sha}`, ' # v4.4.0'), null);
});
test('B4: a failing Desk validation is a non-zero exit (what blocks the gated deploy job)', () => {
  const repo = tmpRepo();
  try {
    const pp = path.join(repo, 'desk/data/public/categories.json'); const cj = readJson(pp);
    cj.records[0].description = { en: 'From AED 2.1m' }; writeJson(pp, cj);
    let code = 0; try { execFileSync('node', [path.join(repo, 'desk/_tools/validate.mjs')], { stdio: 'pipe' }); } catch (e) { code = e.status; }
    assert.equal(code, 1);
  } finally { fs.rmSync(repo, { recursive: true, force: true }); }
});
