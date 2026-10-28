// Phase 2 (data integrity) tests — run with:  node --test desk/_tests/
// No partial writes: invalid packages write nothing; ingestion and export are all-or-nothing with rollback; an
// interrupted write is rolled back before anything else happens; and a full synthetic lifecycle (fixtures + a
// TEST-ONLY real store) runs ingest → validate → gate → disclosure approval → owner approval → export → build →
// public-tree validation. Synthetic data only; everything runs in temporary copies of the repository.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { validateRepo } from '../_tools/validate.mjs';
import { validatePackage } from '../_tools/ingest.mjs';
import { Txn, withTxn, recover } from '../_tools/txn.mjs';
import { enableTestMarketGate, seedTestMarketGate } from './helpers.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
import { TODAY } from './helpers.mjs';
const readJson = (p) => JSON.parse(fs.readFileSync(p, 'utf8'));
// B3: images are approved one by one; approve every image whose permission allows it (others are refused, as intended)
const approveImages = (run, repo, storeArgs, storeDir) => { const f = path.join(storeDir, 'data/media.json'); if (!fs.existsSync(f)) return []; return JSON.parse(fs.readFileSync(f, 'utf8')).records.map(m => [m.id, run(repo, ['approve-media', ...storeArgs, '--id', m.id, '--by', 'owner']).code]); };

const writeJson = (p, j) => fs.writeFileSync(p, JSON.stringify(j, null, 2) + '\n');
const tmp = (p) => fs.mkdtempSync(path.join(os.tmpdir(), p));
const codes = (r) => r.errors.map(e => e.code);
function tmpRepo() {
  const dir = tmp('desk-p2-');
  fs.cpSync(ROOT, dir, { recursive: true, filter: (src) => !src.includes(`${path.sep}.git${path.sep}`) && !src.endsWith(`${path.sep}.git`) });
  return dir;
}
const cli = (repo, args, env = {}) => {
  try { return { code: 0, out: execFileSync('node', [path.join(repo, 'desk/_tools/ingest.mjs'), ...args, '--today', TODAY], { cwd: repo, env: { ...process.env, ...env }, stdio: ['ignore', 'pipe', 'pipe'] }).toString() }; }
  catch (e) { return { code: e.status, out: String(e.stdout) + String(e.stderr) }; }
};
// content snapshot of a directory tree: { relative path: sha256 }
const snap = (d) => !fs.existsSync(d) ? {} : Object.fromEntries(fs.readdirSync(d, { recursive: true }).map(String).filter(f => fs.statSync(path.join(d, f)).isFile()).sort().map(f => [f, crypto.createHash('sha256').update(fs.readFileSync(path.join(d, f))).digest('hex')]));

// A TEST-ONLY real store next to a temporary repository, with a package derived from fixture A (as in desk.test.mjs).
function realSetup() {
  const repo = tmpRepo(); const store = tmp('desk-p2-store-');
  const mp = path.join(repo, 'desk/data/public/markets.json'); const mk = readJson(mp);
  const tst = { ...mk.records[0], id: 'MKT-TST', slug: 'test-market', name: 'TEST-ONLY market', activation: 'ACTIVE', record_status: 'PUBLISHED', review: { approved_by: 'owner', approved_at: TODAY, gate_version: 'MG-1' }, summary: { en: 'TEST-ONLY' }, research_block_ids: [], evidence_ids: [], field_states: [] };
  enableTestMarketGate(repo); seedTestMarketGate(repo, store, tst); mk.records.push(tst); writeJson(mp, mk);
  validateRepo(repo, { today: TODAY, writeIndex: true }); // baseline: a valid public tree with the TEST-ONLY market
  fs.mkdirSync(path.join(store, 'data'), { recursive: true });
  writeJson(path.join(store, 'data/markets.json'), { schema_version: '1.1', collection: 'markets', records: [tst] });
  const pkgs = tmp('desk-p2-pkgs-');
  const mkPkg = (name, mutate) => {
    const pkg = path.join(pkgs, name); fs.cpSync(path.join(repo, 'desk/_fixtures/packages/FIX-PKG-A'), pkg, { recursive: true });
    fs.rmSync(path.join(pkg, 'raw/plan-2plus1.svg'));
    const intake = readJson(path.join(pkg, 'intake.json'));
    intake.package_id = `TEST-${name}`; intake.market.slug = 'test-market';
    intake.media = intake.media.filter(m => !m.file.endsWith('.svg'));
    for (const m of intake.media) if (m.permission && m.permission.evidence_ref) m.permission.evidence_ref = m.permission.evidence_ref.replace('FIX', 'TST');
    for (const x of intake.permissions || []) x.id = x.id.replace('FIX', 'TST');
    if (mutate) mutate(intake, pkg);
    writeJson(path.join(pkg, 'intake.json'), intake);
    return pkg;
  };
  const base = mkPkg('PKG-1');
  execFileSync('python3', ['-c', "import sys,glob\nfrom PIL import Image,ImageDraw\nfor f in glob.glob(sys.argv[1]+'/raw/*'):\n  im=Image.open(f); ImageDraw.Draw(im).text((70,360),'TEST-ONLY P2',fill=(255,255,255)); im.save(f, exif=im.info.get('exif',b''))", base]);
  const cleanup = () => { for (const d of [repo, store, pkgs]) fs.rmSync(d, { recursive: true, force: true }); };
  return { repo, store, base, mkPkg, cleanup, S: ['--store', store] };
}
const OPP = 'OPP-TST-ILLUSTRATIVE-RESIDENCE-A';
const DSC1 = 'DSC-TST-ILLUSTRATIVE-RESIDENCE-A-01';
// a second package for the same project from another source (contradicting date → conflict), media-free
const updatePkg = (s, name = 'PKG-2', extra) => s.mkPkg(name, (i) => {
  i.sources = [{ key: 'S4', name: 'TEST-ONLY news report', publisher: 'TEST-ONLY News', url: null, tier: 2, source_type: 'MEDIA', accessed_at: '2026-10-26' }];
  i.facts = [{ key: 'F-D2', subject: 'project', field: 'expected_delivery', value: '2029-03', unit: 'date', claim: { en: 'Report states a later expected delivery.' }, source: 'S4', evidence_class: 'FACT', verification_status: 'SOURCE-REPORTED', geography: 'TEST', period: '2026-10' }];
  for (const k of ['media', 'risks', 'disclosures', 'research_blocks', 'documents', 'unknowns', 'assets']) delete i[k];
  delete i.developer; delete i.district; delete i.opportunity;
  i.project.ref = 'PRJ-TST-ILLUSTRATIVE-RESIDENCE-A'; // same project: linked by ID, never by its name (closure Task 4)
  if (extra) extra(i);
});

// ================================================================== 6. invalid packages write nothing
test('invalid packages are refused before anything is built or written, with clear messages', () => {
  const s = realSetup();
  try {
    const cases = [
      ['bad evidence class (audit E7)', (i) => { i.facts[0].evidence_class = 'FACTT'; }, /"FACTT" is not a valid evidence_class/],
      ['media without permission (audit B7)', (i) => { delete i.media[0].permission; i.permissions[0].media = i.permissions[0].media.filter(f => f !== i.media[0].file); }, /no permission covers this file/],
      ['media pointing at a permission that does not approve it', (i) => { i.media[0].permission = { from: i.permissions[0].id }; i.permissions[0].media = []; }, /does not approve it/],
      ['permission without a document', (i) => { i.permissions[0].document = 'docs/missing.txt'; }, /document docs\/missing.txt not found/],
      ['permission with an invented channel', (i) => { i.permissions[0].channels = ['billboards']; }, /"billboards" is not a valid permission_scope/],
      ['media listed without PUBLISH_MEDIA', (i) => { i.permissions[0].activities = ['PUBLISH_PROJECT_INFORMATION']; }, /does not include PUBLISH_MEDIA/],
      ['permission scope not a list', (i) => { i.media[0].permission.scope = 'desk_web'; }, /permission\.scope must be a list/],
      ['written permission without evidence', (i) => { i.media[0].permission.evidence_ref = null; }, /GRANTED_WRITTEN needs permission\.evidence_ref/],
      ['unknown source key', (i) => { i.facts[0].source = 'S9'; }, /source "S9" is not a declared source key/],
      ['risk cites an unknown fact (audit E6)', (i) => { i.risks[0].evidence_facts = ['F-NOPE']; }, /evidence fact "F-NOPE" is not a declared fact key/],
      ['HEIC image', (i, p) => { fs.writeFileSync(path.join(p, 'raw/x.heic'), 'x'); i.media[0].file = 'raw/x.heic'; }, /HEIC\/HEIF is not supported/],
      ['PDF as media', (i, p) => { fs.writeFileSync(path.join(p, 'raw/plan.pdf'), '%PDF-1.4'); i.media[0].file = 'raw/plan.pdf'; }, /PDF is not supported as media/],
      ['missing media file', (i) => { i.media[0].file = 'raw/none.jpg'; }, /file not found/],
      ['file outside the package', (i) => { i.media[0].file = '../../etc/hosts'; }, /must be inside the package folder/],
      ['bad disclosure kind', (i) => { i.disclosures[0].kind = 'FEE'; }, /"FEE" is not a valid disclosure_kind/]
    ];
    for (const [name, mutate, re] of cases) {
      const pkg = s.mkPkg(`BAD-${cases.findIndex(c => c[0] === name)}`, mutate);
      const before = snap(s.store);
      const r = cli(s.repo, ['ingest', '--package', pkg, ...s.S, '--apply']);
      assert.equal(r.code, 1, `${name}: ${r.out}`); assert.match(r.out, re, name);
      assert.match(r.out, /REFUSED — the package is invalid; nothing was written/, name);
      assert.deepEqual(snap(s.store), before, `${name}: store must be unchanged`);
    }
    // the base package itself is valid
    assert.deepEqual(validatePackage(readJson(path.join(s.base, 'intake.json')), s.base), []);
  } finally { s.cleanup(); }
});
test('errors found while building records (not in the package shape) also write nothing', () => {
  const s = realSetup();
  try {
    for (const [name, mutate, re] of [
      ['field that does not exist', (i) => { i.facts[0].field = 'no_such_field'; }, /field "no_such_field" does not exist/],
      ['corrupt image', (i, p) => { fs.writeFileSync(path.join(p, 'raw/broken.jpg'), 'not an image'); i.media[0].file = 'raw/broken.jpg'; }, /could not be processed/]
    ]) {
      const pkg = s.mkPkg(`BUILD-${name.length}`, mutate);
      const before = snap(s.store);
      const r = cli(s.repo, ['ingest', '--package', pkg, ...s.S, '--apply']);
      assert.equal(r.code, 1, `${name}: ${r.out}`); assert.match(r.out, re); assert.match(r.out, /NOT APPLIED/);
      assert.deepEqual(snap(s.store), before, `${name}: store must be unchanged`);
    }
  } finally { s.cleanup(); }
});

// ================================================================== 8. failure injection — ingestion
test('ingestion: a failure at any write stage leaves the previous valid store intact', () => {
  const s = realSetup();
  try {
    assert.equal(cli(s.repo, ['ingest', '--package', s.base, ...s.S, '--apply']).code, 0);
    const valid = snap(s.store);
    const pkg2 = updatePkg(s);
    // count the writes of a clean run in a scratch copy, so every write index is exercised
    const scratch = tmp('desk-p2-scratch-'); fs.cpSync(s.store, scratch, { recursive: true });
    assert.equal(cli(s.repo, ['ingest', '--package', pkg2, '--store', scratch, '--apply']).code, 0);
    const writes = Object.keys(snap(scratch)).filter(f => snap(scratch)[f] !== valid[f]).length;
    fs.rmSync(scratch, { recursive: true, force: true });
    assert.ok(writes >= 3, `expected several writes, saw ${writes}`);
    for (const point of ['ingest:after-media', ...Array.from({ length: writes }, (_, k) => `ingest:write:${k + 1}`), 'ingest:before-commit', 'ingest:commit']) {
      const r = cli(s.repo, ['ingest', '--package', pkg2, ...s.S, '--apply'], { DESK_FAULT: point });
      assert.notEqual(r.code, 0, point); assert.match(r.out, new RegExp(`injected fault at ${point}`));
      assert.deepEqual(snap(s.store), valid, `${point}: store must equal the previous valid state`);
    }
    // the same package then applies cleanly
    assert.equal(cli(s.repo, ['ingest', '--package', pkg2, ...s.S, '--apply']).code, 0);
    assert.notDeepEqual(snap(s.store), valid);
  } finally { s.cleanup(); }
});
test('ingestion: a crash mid-commit is rolled back automatically by the next command', () => {
  const s = realSetup();
  try {
    assert.equal(cli(s.repo, ['ingest', '--package', s.base, ...s.S, '--apply']).code, 0);
    const valid = snap(s.store);
    const r = cli(s.repo, ['ingest', '--package', updatePkg(s), ...s.S, '--apply'], { DESK_FAULT: 'crash:ingest:write:2' });
    assert.equal(r.code, 137, r.out);
    assert.ok(fs.existsSync(path.join(s.store, '_txn/journal.json')), 'journal left by the crash');
    assert.notDeepEqual(snap(s.store), valid, 'the crash left a half-written store');
    // any command that reads the store rolls the interrupted write back first
    cli(s.repo, ['gate', ...s.S]);
    assert.ok(!fs.existsSync(path.join(s.store, '_txn')));
    assert.deepEqual(snap(s.store), valid, 'rolled back to the previous valid state');
  } finally { s.cleanup(); }
});

// ================================================================== 7/8. export is all-or-nothing
function approvedSetup() {
  const s = realSetup();
  assert.equal(cli(s.repo, ['ingest', '--package', s.base, ...s.S, '--apply']).code, 0);
  assert.equal(cli(s.repo, ['approve-disclosure', ...s.S, '--id', DSC1, '--by', 'owner']).code, 0);
  approveImages(cli, s.repo, s.S, s.store);
  assert.equal(cli(s.repo, ['approve', ...s.S, '--id', OPP, '--by', 'owner']).code, 0);
  return s;
}
const deskSnap = (repo) => snap(path.join(repo, 'desk'));
test('export: a failure at any stage leaves public data, media, index and generated pages unchanged', () => {
  const s = approvedSetup();
  try {
    const before = deskSnap(s.repo);
    // count the writes of a clean export in a scratch copy of the repository
    const scratch = tmpRepo(); fs.cpSync(s.repo, scratch, { recursive: true });
    const ok = cli(scratch, ['export', ...s.S, '--id', OPP]); assert.equal(ok.code, 0, ok.out);
    const after = deskSnap(scratch);
    const changed = Object.keys({ ...before, ...after }).filter(f => before[f] !== after[f]);
    fs.rmSync(scratch, { recursive: true, force: true });
    assert.ok(changed.some(f => f.startsWith('data/public/')) && changed.some(f => f.startsWith('media/')) && changed.some(f => f.startsWith('opportunities/')), changed.join(', '));
    const points = ['export:stage', 'export:staged-build', ...Array.from({ length: changed.length }, (_, k) => `export:write:${k + 1}`), 'export:applied', 'export:commit'];
    for (const point of points) {
      const r = cli(s.repo, ['export', ...s.S, '--id', OPP], { DESK_FAULT: point });
      assert.notEqual(r.code, 0, point); assert.match(r.out, new RegExp(`injected fault at ${point}`));
      assert.deepEqual(deskSnap(s.repo), before, `${point}: public tree must equal the previous valid state`);
    }
    assert.deepEqual(validateRepo(s.repo, { today: TODAY }).errors, []);
  } finally { s.cleanup(); }
});
test('export: a staged result that fails validation changes nothing in the real tree', () => {
  const s = approvedSetup();
  try {
    // a pre-existing problem elsewhere in the repository (an unapproved parent-site edit) makes the staged result invalid
    fs.appendFileSync(path.join(s.repo, 'about/index.html'), '<!-- unapproved -->');
    const before = deskSnap(s.repo);
    const r = cli(s.repo, ['export', ...s.S, '--id', OPP]);
    assert.notEqual(r.code, 0); assert.match(r.out, /staged result does not validate; nothing was changed[^\n]*P01/);
    assert.deepEqual(deskSnap(s.repo), before);
  } finally { s.cleanup(); }
});
test('export: a crash mid-commit leaves a journal that blocks validation, and recovery restores the previous state', () => {
  const s = approvedSetup();
  try {
    const before = deskSnap(s.repo);
    const r = cli(s.repo, ['export', ...s.S, '--id', OPP], { DESK_FAULT: 'crash:export:write:3' });
    assert.equal(r.code, 137, r.out);
    assert.ok(codes(validateRepo(s.repo, { today: TODAY })).includes('F07'), 'an interrupted export can never pass CI');
    assert.equal(cli(s.repo, ['recover', ...s.S]).code, 0);
    assert.deepEqual(deskSnap(s.repo), before);
    assert.deepEqual(validateRepo(s.repo, { today: TODAY }).errors, []);
    // and a later export rolls back any leftover journal by itself and then succeeds
    cli(s.repo, ['export', ...s.S, '--id', OPP], { DESK_FAULT: 'crash:export:write:2' });
    const ok = cli(s.repo, ['export', ...s.S, '--id', OPP]); assert.equal(ok.code, 0, ok.out);
    assert.deepEqual(validateRepo(s.repo, { today: TODAY }).errors, []);
  } finally { s.cleanup(); }
});

// ================================================================== transaction primitive
test('txn: rollback restores replaced files, removes new files and new folders; journal recovery does the same', () => {
  const d = tmp('desk-p2-txn-');
  try {
    fs.writeFileSync(path.join(d, 'a.json'), 'old-a');
    assert.throws(() => withTxn(d, 't', (t) => { t.write(path.join(d, 'a.json'), 'new-a'); t.write(path.join(d, 'n/e/w.json'), 'x'); throw new Error('boom'); }), /boom/);
    assert.equal(fs.readFileSync(path.join(d, 'a.json'), 'utf8'), 'old-a');
    assert.ok(!fs.existsSync(path.join(d, 'n')), 'created folders removed');
    assert.ok(!fs.existsSync(path.join(d, '_txn')));
    // simulated crash: journal left open, then recovered
    const t = new Txn(d, 't'); t.write(path.join(d, 'a.json'), 'half'); t.write(path.join(d, 'b.json'), 'half');
    assert.equal(recover(d), 2);
    assert.equal(fs.readFileSync(path.join(d, 'a.json'), 'utf8'), 'old-a'); assert.ok(!fs.existsSync(path.join(d, 'b.json')));
    // paths outside the root are refused
    assert.throws(() => withTxn(d, 't', (x) => x.write(path.join(d, '..', 'escape.json'), 'x')), /outside the transaction root/);
    assert.throws(() => withTxn(d, 't', (x) => x.write(path.join(d, '_txn', 'j'), 'x')), /outside the transaction root/);
    withTxn(d, 't', (x) => x.write(path.join(d, 'a.json'), 'committed'));
    assert.equal(fs.readFileSync(path.join(d, 'a.json'), 'utf8'), 'committed'); assert.ok(!fs.existsSync(path.join(d, '_txn')));
  } finally { fs.rmSync(d, { recursive: true, force: true }); }
});

// ================================================================== 9. end-to-end synthetic lifecycle
// Jekyll-equivalent published tree for pages_check.py: drop folders/files whose name starts with "_" or "."
function publishedTree(repo) {
  const site = path.join(tmp('desk-p2-site-'), '_site');
  fs.cpSync(repo, site, { recursive: true, filter: (src) => path.relative(repo, src).split(path.sep).every(seg => !seg.startsWith('_') && !seg.startsWith('.')) || src === repo });
  fs.copyFileSync(path.join(repo, 'CNAME'), path.join(path.dirname(site), 'CNAME'));
  return site;
}
test('end-to-end: fixtures and a TEST-ONLY store through ingest → gate → approvals → export → build → public-tree checks', () => {
  const s = realSetup();
  const fx = path.join(s.repo, 'desk/_fixtures');
  try {
    // ---- fixtures: full lifecycle up to owner approval; fixtures can never be exported
    for (const d of ['data', 'media', 'private', 'reports']) fs.rmSync(path.join(fx, d), { recursive: true, force: true });
    fs.mkdirSync(path.join(fx, 'data'), { recursive: true });
    writeJson(path.join(fx, 'data/markets.json'), readJson(path.join(ROOT, 'desk/_fixtures/data/markets.json')));
    const F = ['--store', fx, '--fixture']; const FA = 'FIX-OPP-ILL-ILLUSTRATIVE-RESIDENCE-A';
    assert.equal(cli(s.repo, ['ingest', '--package', path.join(fx, 'packages/FIX-PKG-A'), ...F, '--apply']).code, 0);
    assert.deepEqual(validateRepo(s.repo, { today: TODAY }).errors, [], 'fixture store validates');
    assert.match(cli(s.repo, ['gate', ...F]).out, new RegExp(`${FA}: BLOCKED[^\\n]*legal review pending`));
    assert.equal(cli(s.repo, ['approve-disclosure', ...F, '--id', 'FIX-DSC-ILL-ILLUSTRATIVE-RESIDENCE-A-01', '--by', 'owner']).code, 0);
    approveImages(cli, s.repo, F, fx);
    assert.equal(cli(s.repo, ['approve', ...F, '--id', FA, '--by', 'owner']).code, 0);
    const pubBefore = deskSnap(s.repo);
    const fe = cli(s.repo, ['export', '--store', fx, '--id', FA]);
    assert.notEqual(fe.code, 0, 'fixture export must be refused'); assert.match(fe.out, /illustrative fixtures|desk\/_fixtures holds illustrative fixtures only/);
    assert.deepEqual(deskSnap(s.repo), pubBefore);

    // ---- TEST-ONLY real store: failure cases first
    assert.notEqual(cli(s.repo, ['export', ...s.S, '--id', OPP]).code, 0, 'export of an unknown / unapproved opportunity fails');
    const seeded = snap(path.join(s.store, 'data'));
    assert.equal(cli(s.repo, ['ingest', '--package', s.mkPkg('E2E-BAD', (i) => { i.facts[0].verification_status = 'MAYBE'; }), ...s.S, '--apply']).code, 1);
    assert.deepEqual(snap(path.join(s.store, 'data')), seeded, 'invalid package wrote nothing (only the seeded market and market-gate files exist)');
    assert.equal(Object.keys(seeded).length, 5);
    // ingest → validate → gate
    let r = cli(s.repo, ['ingest', '--package', s.base, ...s.S, '--apply']); assert.equal(r.code, 0, r.out);
    r = cli(s.repo, ['gate', ...s.S]); assert.match(r.out, new RegExp(`${OPP}: BLOCKED[^\\n]*${DSC1} \\(COMMISSION\\) legal review pending`)); assert.doesNotMatch(r.out, /✗/);
    assert.notEqual(cli(s.repo, ['approve', ...s.S, '--id', OPP, '--by', 'owner']).code, 0, 'owner approval refused while the disclosure is pending');
    assert.notEqual(cli(s.repo, ['export', ...s.S, '--id', OPP]).code, 0, 'export before approval refused');
    // disclosure approval → owner approval
    assert.equal(cli(s.repo, ['approve-disclosure', ...s.S, '--id', DSC1, '--by', 'owner']).code, 0);
    assert.equal(cli(s.repo, ['approve', ...s.S, '--id', OPP, '--by', 'reviewer']).code, 1, 'only the owner approves');
    approveImages(cli, s.repo, s.S, s.store);
  assert.equal(cli(s.repo, ['approve', ...s.S, '--id', OPP, '--by', 'owner']).code, 0);
    // export with an injected failure leaves everything as it was, then a clean export
    const pre = deskSnap(s.repo);
    assert.notEqual(cli(s.repo, ['export', ...s.S, '--id', OPP], { DESK_FAULT: 'export:applied' }).code, 0);
    assert.deepEqual(deskSnap(s.repo), pre);
    r = cli(s.repo, ['export', ...s.S, '--id', OPP]); assert.equal(r.code, 0, r.out);
    // build: the generated page exists and is current
    const page = path.join(s.repo, 'desk/opportunities', OPP.toLowerCase(), 'index.html');
    assert.match(fs.readFileSync(page, 'utf8'), new RegExp(`data-id="${OPP}"`));
    execFileSync('node', [path.join(s.repo, 'desk/_tools/build.mjs'), '--check'], { stdio: 'pipe' });
    // public-tree validation: repository validator, then the published-tree checker on a Jekyll-equivalent tree
    assert.deepEqual(validateRepo(s.repo, { today: TODAY }).errors, []);
    assert.deepEqual(readJson(path.join(s.repo, 'desk/data/public/published.json')).opportunities, [OPP]);
    const site = publishedTree(s.repo);
    try {
      let pc; try { pc = execFileSync('python3', [path.join(s.repo, 'desk/_tests/pages_check.py'), site], { stdio: ['ignore', 'pipe', 'pipe'] }).toString(); } catch (e) { assert.fail(String(e.stdout).split('\n').filter(l => l.startsWith('✗')).join('\n')); }
      assert.doesNotMatch(pc, /✗/);
      // fixtures never enter public output: no FIX- id and no illustrative record anywhere in the published tree
      for (const f of fs.readdirSync(path.join(site, 'desk'), { recursive: true }).map(String)) {
        const p = path.join(site, 'desk', f); if (!fs.statSync(p).isFile() || !/\.(json|html|js)$/.test(f)) continue;
        const t = fs.readFileSync(p, 'utf8');
        if (/\.(json|html)$/.test(f)) assert.ok(!/FIX-(OPP|PRJ|MED|EVD|DEV|SRC|DSC)-/.test(t), `fixture id in ${f}`);
        if (f.endsWith('.json')) assert.ok(!/"is_illustrative":\s*true/.test(t), `illustrative record in ${f}`);
      }
      assert.ok(!fs.existsSync(path.join(site, 'desk/_fixtures')) && !fs.existsSync(path.join(site, 'desk/_txn')));
    } finally { fs.rmSync(path.dirname(site), { recursive: true, force: true }); }
  } finally { s.cleanup(); }
});
