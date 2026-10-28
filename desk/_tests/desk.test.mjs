// Nexus Desk test suite — run with:  node --test desk/_tests/
// Uses only node:test. The lifecycle tests work in a temporary copy of the repository; nothing here writes to the real tree.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { validateDataset, validateRepo, schemaErrors } from '../_tools/validate.mjs';
import { enableTestMarketGate, seedTestMarketGate } from './helpers.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
import { TODAY } from './helpers.mjs';
const codes = (r) => r.errors.map(e => e.code);

function tmpRepo() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'desk-test-'));
  fs.cpSync(ROOT, dir, { recursive: true, filter: (src) => !src.includes(`${path.sep}.git${path.sep}`) && !src.endsWith(`${path.sep}.git`) });
  return dir;
}
const ingestCli = (repo, args) => {
  try { return { code: 0, out: execFileSync('node', [path.join(repo, 'desk/_tools/ingest.mjs'), ...args, '--today', TODAY], { cwd: repo }).toString() }; }
  catch (e) { return { code: e.status, out: String(e.stdout) + String(e.stderr) }; }
};
const readJson = (p) => JSON.parse(fs.readFileSync(p, 'utf8'));
// B3: images are approved one by one; approve every image whose permission allows it (others are refused, as intended)
const approveImages = (run, repo, storeArgs, storeDir) => { const f = path.join(storeDir, 'data/media.json'); if (!fs.existsSync(f)) return []; return JSON.parse(fs.readFileSync(f, 'utf8')).records.map(m => [m.id, run(repo, ['approve-media', ...storeArgs, '--id', m.id, '--by', 'owner']).code]); };

const writeJson = (p, j) => fs.writeFileSync(p, JSON.stringify(j, null, 2) + '\n');

// ------------------------------------------------------------------ the committed repository
test('repository validates cleanly (public data, fixtures, parent manifest, method registry)', () => {
  const r = validateRepo(ROOT, { today: TODAY });
  assert.deepEqual(r.errors, []);
  assert.equal(r.report.index.opportunities.length, 0, 'production must have no published opportunities yet');
});

test('generated pages are up to date with templates and data', () => {
  execFileSync('node', [path.join(ROOT, 'desk/_tools/build.mjs'), '--check']);
});

test('desk runtime uses no browser storage except the two keys shared with the company site (D-24)', () => {
  const ALLOWED = new Set(['nw-theme', 'nw-lang']);
  const sources = fs.readdirSync(path.join(ROOT, 'desk/assets/js')).map(f => [f, fs.readFileSync(path.join(ROOT, 'desk/assets/js', f), 'utf8')]);
  sources.push(['generated page head', fs.readFileSync(path.join(ROOT, 'desk/index.html'), 'utf8')]);
  for (const [f, t] of sources) {
    assert.ok(!/sessionStorage|indexedDB|document\.cookie/.test(t), `${f}: no session storage, IndexedDB or cookies`);
    for (const m of t.matchAll(/localStorage\.(\w+)\(([^)]*)\)/g)) assert.ok(['getItem', 'setItem'].includes(m[1]), `${f}: localStorage.${m[1]} not allowed`);
    assert.ok(!/localStorage\s*\[|localStorage\.(clear|removeItem|key)\b/.test(t), `${f}: only getItem/setItem`);
    // every key must be a literal from the allow-list (directly, or through the remember/g/s helpers)
    for (const m of t.matchAll(/(?:localStorage\.(?:getItem|setItem)|remember|\bg|\bs)\(\s*'([^']+)'/g)) assert.ok(ALLOWED.has(m[1]), `${f}: key "${m[1]}" not allowed`);
    for (const m of t.matchAll(/\b[KG]='([^']+)'/g)) assert.ok(ALLOWED.has(m[1]), `${f}: key "${m[1]}" not allowed`);
  }
});

test('production public data contains no illustrative record and no FIX- id', () => {
  for (const f of fs.readdirSync(path.join(ROOT, 'desk/data/public'))) {
    const t = fs.readFileSync(path.join(ROOT, 'desk/data/public', f), 'utf8');
    assert.ok(!/FIX-/.test(t), `${f} contains a FIX- id`);
    assert.ok(!/"is_illustrative":\s*true/.test(t), `${f} contains an illustrative record`);
  }
});

// ------------------------------------------------------------------ unit rules
const base = () => ({
  collections: {
    categories: [{ id: 'CAT-RE', key: 'real_estate', slug: 'real-estate', name: { en: 'Real Estate' }, activation: 'ACTIVE', is_illustrative: false }],
    markets: [{ id: 'MKT-T', slug: 't', name: 'T', country: 'TR', currency: 'TRY', category: 'real_estate', activation: 'INACTIVE', record_status: 'DRAFT', research_block_ids: [], evidence_ids: [], field_states: [], last_reviewed: null, is_illustrative: false, review: null }],
    sources: [{ id: 'SRC-T1', name: 'n', publisher: 'p', url: null, tier: 4, source_type: 'OTHER', accessed_at: null, is_illustrative: false }],
    projects: [{ id: 'PRJ-T-A', category: 'real_estate', market_id: 'MKT-T', developer_id: null, name: 'A', slug: 'a', district_id: null, area_id: null, delivery_status: null, asset_types: [], record_status: 'DRAFT', research_block_ids: [], evidence_ids: [], risk_ids: [], field_states: [], is_illustrative: false }],
    evidence: [], risks: [], conflicts: [], opportunities: [], media: []
  }
});
const ev = (o) => ({ id: 'EVD-T-1', source_id: 'SRC-T1', subject: { type: 'project', id: 'PRJ-T-A' }, field: null, claim: { en: 'c' }, value: null, unit: null, currency: null, geography: 'T', period: null, evidence_class: 'FACT', verification_status: 'UNVERIFIED', source_tier: 4, retrieved_at: '2026-10-01', conflict_ids: [], is_illustrative: false, ...o });
const run = (ds, mode = 'public') => validateDataset(ds, { mode, today: TODAY, methods: { 'M-RISK-SEVERITY': 'INACTIVE', 'M-MARKET-GATE': 'ACTIVE' } });

test('V00 schema allow-list rejects unknown fields (e.g. a price field)', () => {
  const ds = base(); ds.collections.projects[0].unit_price = 1;
  assert.ok(codes(run(ds)).includes('V00')); assert.ok(codes(run(ds)).includes('V08'));
});
test('V01 ids must carry the right prefix; FIX- iff illustrative', () => {
  const ds = base(); ds.collections.projects[0].id = 'PROJECT-1'; assert.ok(codes(run(ds)).includes('V01'));
  const d2 = base(); d2.collections.projects[0].is_illustrative = true; assert.ok(codes(run(d2)).includes('V01'));
});
test('V03 references must resolve to the right type', () => {
  const ds = base(); ds.collections.projects[0].market_id = 'SRC-T1'; assert.ok(codes(run(ds)).includes('V03'));
});
test('V03 evidence listed on a record must belong to that record (no cross-project leakage)', () => {
  const ds = base();
  ds.collections.projects.push({ ...ds.collections.projects[0], id: 'PRJ-T-B', slug: 'b', evidence_ids: ['EVD-T-1'] });
  ds.collections.evidence.push(ev());
  assert.ok(run(ds).errors.some(e => e.code === 'V03' && /belongs to project PRJ-T-A/.test(e.msg)));
});
test('V05 a field cannot have a value and a missing-data state; reviewable records need value or state', () => {
  const ds = base(); ds.collections.projects[0].field_states = [{ field: 'name', state: 'DATA NOT AVAILABLE' }];
  assert.ok(codes(run(ds)).includes('V05'));
  const d2 = base(); d2.collections.projects[0].record_status = 'READY_FOR_REVIEW';
  assert.ok(run(d2).errors.some(e => e.code === 'V05' && /developer_id/.test(e.msg)));
});
test('V06 evidence integrity: DATA NOT AVAILABLE carries no value; numbers need unit+period; m2 needs basis; index needs series', () => {
  for (const o of [{ evidence_class: 'DATA NOT AVAILABLE', value: 'x' }, { value: 3, unit: null }, { value: 3, unit: 'm2', period: '2026' }, { value: 3, unit: 'index', period: '2026' }]) {
    const ds = base(); ds.collections.evidence.push(ev(o)); assert.ok(codes(run(ds)).includes('V06'), JSON.stringify(o));
  }
});
test('V07 Tier 4 evidence cannot be VERIFIED', () => {
  const ds = base(); ds.collections.evidence.push(ev({ verification_status: 'VERIFIED' })); assert.ok(codes(run(ds)).includes('V07'));
});
test('V08 currency amounts and price/rent evidence are not publishable', () => {
  const ds = base(); ds.collections.evidence.push(ev({ currency: 'TRY', value: 5, unit: 'count', period: '2026' })); assert.ok(codes(run(ds)).includes('V08'));
  const d2 = base(); d2.collections.evidence.push(ev({ field: 'price_band' })); assert.ok(codes(run(d2)).includes('V08'));
});
test('V09 numeric probability is impossible; severity is blocked in public while its method is inactive', () => {
  const r = { id: 'RSK-T-1', subject: { type: 'project', id: 'PRJ-T-A' }, risk_type: 'OTHER', title: { en: 't' }, cause: null, evidence_ids: ['EVD-T-1'], severity: null, probability: 0.3, horizon: null, controllability: null, mitigation: null, residual_uncertainty: null, status: 'OPEN', field_states: [], is_illustrative: false };
  const ds = base(); ds.collections.evidence.push(ev()); ds.collections.risks.push(r); assert.ok(codes(run(ds)).includes('V00'));
  const d2 = base(); d2.collections.evidence.push(ev()); d2.collections.risks.push({ ...r, probability: null, severity: 'HIGH' }); assert.ok(codes(run(d2)).includes('V09'));
});
test('V14 personal data (email / phone) is rejected', () => {
  const ds = base(); ds.collections.projects[0].description = { en: 'call +90 532 000 00 00 or sales@example.com' };
  assert.ok(codes(run(ds)).includes('V14'));
});
test('V12 a PUBLISHED opportunity that fails the gate is an error; eligibility is computed, not hand-set', () => {
  const ds = base();
  ds.collections.opportunities.push({ id: 'OPP-T-A', category: 'real_estate', subject: { type: 'project', id: 'PRJ-T-A' }, market_id: 'MKT-T', asset_id: null, title: { en: 't' }, summary: { en: 's' }, record_status: 'PUBLISHED', disclosure_ids: [], evidence_ids: [], risk_ids: [], field_states: [], last_verified: null, is_illustrative: false, review: { approved_by: 'owner', approved_at: TODAY, gate_version: 'G3-v1' } });
  const r = run(ds); assert.ok(codes(r).includes('V12'));
  assert.ok(r.eligibility.opportunities['OPP-T-A'].includes('market inactive'));
});
test('schema: text fields are i18n objects with English required', () => {
  assert.ok(schemaErrors({ $ref: '#/$defs/text' }, { tr: 'x' }).length > 0);
  assert.equal(schemaErrors({ $ref: '#/$defs/text' }, { en: 'x', ar: 'y' }).length, 0);
});

// ------------------------------------------------------------------ full lifecycle with isolated fixtures
test('lifecycle: ingest → gate → approve → conflict re-blocks → cross-project media refused (fixtures)', () => {
  const repo = tmpRepo();
  try {
    const fx = path.join(repo, 'desk/_fixtures');
    for (const d of ['data', 'media', 'private', 'reports']) fs.rmSync(path.join(fx, d), { recursive: true, force: true });
    fs.mkdirSync(path.join(fx, 'data'), { recursive: true });
    writeJson(path.join(fx, 'data/markets.json'), readJson(path.join(ROOT, 'desk/_fixtures/data/markets.json')));
    const S = ['--store', fx, '--fixture'];
    const A = 'FIX-OPP-ILL-ILLUSTRATIVE-RESIDENCE-A';

    // 1–3: package A ingested with no code changes; ids created; facts routed; pricing private
    let r = ingestCli(repo, ['ingest', '--package', path.join(fx, 'packages/FIX-PKG-A'), ...S, '--apply']);
    assert.equal(r.code, 0, r.out);
    assert.match(r.out, /F-PRICE \(PRICING; currency amount\)/);
    assert.match(r.out, /stripped \(incl\. GPS\)/);
    const evidence = readJson(path.join(fx, 'data/evidence.json')).records;
    assert.ok(!evidence.some(e => e.currency !== null), 'no currency amount may enter evidence');
    assert.ok(readJson(path.join(fx, 'private/private_facts.json')).length === 1);
    // 6: media bound, hashed, metadata stripped
    const media = readJson(path.join(fx, 'data/media.json')).records;
    for (const m of media) {
      assert.ok(m.file.public_path.startsWith(`desk/_fixtures/media/${m.subject.id}/${m.id}.`));
      const buf = fs.readFileSync(path.join(repo, m.file.public_path));
      assert.ok(buf.indexOf(Buffer.from('Exif')) === -1 && buf.indexOf(Buffer.from('EXIF')) === -1, `${m.id} still has EXIF`);
    }
    // 8: complete package is blocked until owner approval; disclosure needs legal sign-off first
    assert.match(r.out, /Gate G3-v1 for FIX-OPP-ILL-ILLUSTRATIVE-RESIDENCE-A: BLOCKED/);
    assert.equal(ingestCli(repo, ['approve', ...S, '--id', A, '--by', 'owner']).code, 1);
    assert.equal(ingestCli(repo, ['approve-disclosure', ...S, '--id', 'FIX-DSC-ILL-ILLUSTRATIVE-RESIDENCE-A-01', '--by', 'owner']).code, 0);
    assert.equal(ingestCli(repo, ['approve', ...S, '--id', A, '--by', 'reviewer']).code, 1, 'only the owner can approve');
    approveImages(ingestCli, repo, S, fx);
    assert.equal(ingestCli(repo, ['approve', ...S, '--id', A, '--by', 'owner']).code, 0);
    // 2: re-ingesting the same package reuses ids and does not duplicate media
    r = ingestCli(repo, ['ingest', '--package', path.join(fx, 'packages/FIX-PKG-A'), ...S]);
    assert.match(r.out, /already ingested — skipped/);
    // 5: incomplete package B: gaps, Tier-4-only, stale and DD flagged; gate blocked with reasons
    r = ingestCli(repo, ['ingest', '--package', path.join(fx, 'packages/FIX-PKG-B'), ...S, '--apply']);
    assert.match(r.out, /PROFESSIONAL DD REQUIRED/);
    assert.match(r.out, /Tier 4 only: FIX-PRJ-ILL-ILLUSTRATIVE-RESIDENCE-B\.delivery_status/);
    assert.match(r.out, /Stale evidence[^\n]*FIX-EVD/);
    assert.match(r.out, /developer legal entity not verified/);
    assert.match(r.out, /no written permission/);
    // 4: contradicting update opens a conflict, does not overwrite, and withholds the published fixture
    r = ingestCli(repo, ['ingest', '--package', path.join(fx, 'packages/FIX-PKG-A2'), ...S, '--apply']);
    assert.equal(r.code, 0, r.out);
    assert.match(r.out, /"2028-06" vs "2029-03"/);
    assert.match(r.out, /set to WITHHELD/);
    assert.equal(readJson(path.join(fx, 'data/opportunities.json')).records.find(o => o.id === A).record_status, 'WITHHELD');
    assert.ok(readJson(path.join(fx, 'data/conflicts.json')).records.some(c => c.status === 'OPEN' && c.field === 'expected_delivery'));
    // 7: a package re-using another project's image is refused as a whole — nothing at all is written (Phase 2)
    const snap = (d) => Object.fromEntries(fs.readdirSync(d, { recursive: true }).filter(f => fs.statSync(path.join(d, f)).isFile()).map(f => [f, fs.readFileSync(path.join(d, f)).toString('base64')]));
    const before = snap(fx);
    r = ingestCli(repo, ['ingest', '--package', path.join(fx, 'packages/FIX-PKG-A3'), ...S, '--apply']);
    assert.equal(r.code, 1, r.out);
    assert.match(r.out, /identical file already attached to FIX-PRJ-ILL-ILLUSTRATIVE-RESIDENCE-B/);
    assert.match(r.out, /NOT APPLIED — \d+ blocking error\(s\); nothing was written/);
    assert.deepEqual(snap(fx), before, 'refused package must leave the store byte-identical');
    const proj = readJson(path.join(fx, 'data/projects.json')).records.find(p => p.id === 'FIX-PRJ-ILL-ILLUSTRATIVE-RESIDENCE-A');
    assert.equal(proj.expected_delivery, '2028-06', 'existing value must not be overwritten');
    // 10: whole repository still validates and production has nothing published
    const v = validateRepo(repo, { today: TODAY });
    assert.deepEqual(v.errors, []);
    assert.equal(v.report.index.opportunities.length, 0);
  } finally { fs.rmSync(repo, { recursive: true, force: true }); }
});

test('lifecycle: a real (non-fixture) store exports only approved, public-safe data (temporary TEST-ONLY records)', () => {
  const repo = tmpRepo();
  const store = fs.mkdtempSync(path.join(os.tmpdir(), 'desk-store-'));
  try {
    // temporary test market, active only inside this throw-away copy
    const mp = path.join(repo, 'desk/data/public/markets.json'); const mk = readJson(mp);
    const tst = { ...mk.records[0], id: 'MKT-TST', slug: 'test-market', name: 'TEST-ONLY market', activation: 'ACTIVE', record_status: 'PUBLISHED', review: { approved_by: 'owner', approved_at: TODAY, gate_version: 'MG-1' }, summary: { en: 'TEST-ONLY' }, research_block_ids: [], evidence_ids: [], field_states: [] };
    enableTestMarketGate(repo); seedTestMarketGate(repo, store, tst); mk.records.push(tst); writeJson(mp, mk);
    fs.mkdirSync(path.join(store, 'data'), { recursive: true });
    writeJson(path.join(store, 'data/markets.json'), { schema_version: '1.1', collection: 'markets', records: [tst] });
    // build a TEST-ONLY package from fixture A, renamed and stripped of FIX ids
    const pkg = path.join(store, 'pkg'); fs.cpSync(path.join(repo, 'desk/_fixtures/packages/FIX-PKG-A'), pkg, { recursive: true });
    fs.rmSync(path.join(pkg, 'raw/plan-2plus1.svg'));
    const intake = readJson(path.join(pkg, 'intake.json'));
    intake.package_id = 'TEST-PKG-1'; intake.market.slug = 'test-market';
    intake.media = intake.media.filter(m => !m.file.endsWith('.svg'));
    // make the TEST-ONLY images distinct from the committed fixtures (the validator rejects one image on two projects)
    execFileSync('python3', ['-c', "import sys,glob\nfrom PIL import Image,ImageDraw\nfor f in glob.glob(sys.argv[1]+'/raw/*'):\n  im=Image.open(f); ImageDraw.Draw(im).text((70,300),'TEST-ONLY COPY',fill=(255,255,255)); im.save(f, exif=im.info.get('exif',b''))", pkg]);
    writeJson(path.join(pkg, 'intake.json'), intake);
    const S = ['--store', store];
    let r = ingestCli(repo, ['ingest', '--package', pkg, ...S, '--apply']); assert.equal(r.code, 0, r.out);
    const opp = 'OPP-TST-ILLUSTRATIVE-RESIDENCE-A';
    assert.notEqual(ingestCli(repo, ['export', ...S, '--id', opp, '--repo', repo]).code, 0, 'export before approval must fail');
    ingestCli(repo, ['approve-disclosure', ...S, '--id', 'DSC-TST-ILLUSTRATIVE-RESIDENCE-A-01', '--by', 'owner']);
    approveImages(ingestCli, repo, S, store);
    assert.equal(ingestCli(repo, ['approve', ...S, '--id', opp, '--by', 'owner']).code, 0);
    // a real store inside the public repo is refused
    assert.equal(ingestCli(repo, ['gate', '--store', path.join(repo, 'desk/data')]).code, 2);
    r = ingestCli(repo, ['export', ...S, '--id', opp]);
    assert.equal(r.code, 0, r.out);
    assert.match(r.out, /skipped: [^\n]*legal|skipped: [^\n]*no written permission/);
    const pubDir = path.join(repo, 'desk/data/public');
    const idx = readJson(path.join(pubDir, 'published.json'));
    assert.deepEqual(idx.opportunities, [opp]);
    // leakage checks on the exported public projection
    const all = fs.readdirSync(pubDir).map(f => fs.readFileSync(path.join(pubDir, f), 'utf8')).join('\n');
    assert.ok(readJson(path.join(pubDir, 'evidence.json')).records.every(e => e.currency === null), 'no currency amount exported');
    assert.ok(!/price_list|Price list|PRIV-PERM-FIX-2/.test(all.replace(/"evidence_ref":\s*"PRIV-PERM-FIX-1"/g, '')), 'no private documents or restricted media exported');
    const pm = readJson(path.join(pubDir, 'media.json')).records;
    assert.ok(pm.every(m => m.permission.status === 'GRANTED_WRITTEN'), 'only written-permission media exported');
    assert.ok(!pm.some(m => ['CONSTRUCTION_PROGRESS', 'SITE_PLAN'].includes(m.media_type)), 'verbal/restricted media excluded');
    for (const m of pm) { const buf = fs.readFileSync(path.join(repo, m.file.public_path)); assert.equal(buf.indexOf(Buffer.from('EXIF')), -1); }
    let v = validateRepo(repo, { today: TODAY }); assert.deepEqual(v.errors, []);
    // 9: the exported opportunity gets its own generated page from the shared template, bound to its id only
    const page = fs.readFileSync(path.join(repo, 'desk/opportunities', opp.toLowerCase(), 'index.html'), 'utf8');
    assert.match(page, new RegExp(`data-id="${opp}"`));
    // 10: injected leaks are caught
    const inject = (fn, code) => { const snap = new Map(); fn(snap); const e = codes(validateRepo(repo, { today: TODAY })); for (const [f, t] of snap) t === null ? fs.rmSync(f, { force: true }) : fs.writeFileSync(f, t); assert.ok(e.includes(code), `expected ${code}, got ${e.join(',')}`); };
    const edit = (snap, f, fn) => { snap.set(f, fs.existsSync(f) ? fs.readFileSync(f, 'utf8') : null); fs.writeFileSync(f, fn(snap.get(f))); };
    inject(s => edit(s, path.join(pubDir, 'projects.json'), t => t.replace('"slug"', '"price_band": 1, "slug"')), 'V08');
    inject(s => edit(s, path.join(pubDir, 'projects.json'), t => t.replace('fictional residential project', 'project, contact sales@example.com')), 'V14');
    inject(s => edit(s, path.join(pubDir, 'sources.json'), t => t.replace('"id": "SRC-', '"id": "FIX-SRC-')), 'V04');
    inject(s => edit(s, path.join(repo, 'desk/media/stray.webp'), () => 'x'), 'F05');
    inject(s => edit(s, path.join(repo, 'desk/contract.pdf'), () => 'x'), 'F06');
    inject(s => edit(s, path.join(repo, '.nojekyll'), () => ''), 'F04');
    inject(s => edit(s, path.join(repo, 'about/index.html'), t => t + '<!-- change -->'), 'P01');
    inject(s => edit(s, path.join(pubDir, 'published.json'), t => t.replace('"opportunities": [', '"opportunities": ["OPP-X", ')), 'V12');
    inject(s => edit(s, path.join(repo, 'desk/data/methods.json'), t => t.replace('"id": "M-FAIR-VALUE", "name": "Fair value", "status": "INACTIVE"', '"id": "M-FAIR-VALUE", "name": "Fair value", "status": "ACTIVE"')), 'M01');
    v = validateRepo(repo, { today: TODAY }); assert.deepEqual(v.errors, [], 'injections must be fully reverted');
    // permission expiry withholds media at the next build
    const mp2 = path.join(pubDir, 'media.json'); const mj = readJson(mp2); mj.records[0].permission.expires_at = '2026-01-01'; writeJson(mp2, mj);
    assert.ok(codes(validateRepo(repo, { today: TODAY })).includes('F05'));
  } finally { fs.rmSync(repo, { recursive: true, force: true }); fs.rmSync(store, { recursive: true, force: true }); }
});
