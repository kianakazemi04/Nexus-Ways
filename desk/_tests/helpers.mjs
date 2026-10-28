// Shared helpers for the Desk test suites (synthetic TEST-ONLY data in temporary copies of the repository).
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { validateRepo } from '../_tools/validate.mjs';
import { gateDataset } from './marketgate-data.mjs';
import { evaluateMarketGate, gateCertificate } from '../_tools/engines/marketgate.mjs';

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
// Test clock (audit C-18): a fixed date, moved forward only when the committed public research is dated later, so new
// research records never make the suites fail as "future-dated" (V18). Deterministic for a given commit.
const FIXED_TODAY = '2026-10-28';
function latestPublicDate() {
  let max = FIXED_TODAY; const dir = path.join(path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..'), 'desk/data/public');
  for (const f of fs.readdirSync(dir).filter(x => x.endsWith('.json') && x !== 'published.json')) {
    const s = fs.readFileSync(path.join(dir, f), 'utf8');
    for (const m of s.matchAll(/"(?:retrieved_at|last_verified|last_reviewed|accessed_at|published_at|approved_at)": "(\d{4}-\d{2}-\d{2})"/g)) if (m[1] > max) max = m[1];
  }
  return max;
}
export const TODAY = latestPublicDate();
export const readJson = (p) => JSON.parse(fs.readFileSync(p, 'utf8'));
export const writeJson = (p, j) => fs.writeFileSync(p, JSON.stringify(j, null, 2) + '\n');
export const tmp = (p) => fs.mkdtempSync(path.join(os.tmpdir(), p));
export const codes = (r) => r.errors.map(e => e.code);
export function tmpRepo(prefix = 'desk-t-') {
  const dir = tmp(prefix);
  fs.cpSync(ROOT, dir, { recursive: true, filter: (src) => !src.includes(`${path.sep}.git${path.sep}`) && !src.endsWith(`${path.sep}.git`) });
  return dir;
}
export const cli = (repo, args, env = {}, today = TODAY) => {
  try { return { code: 0, out: execFileSync('node', [path.join(repo, 'desk/_tools/ingest.mjs'), ...args, '--today', today], { cwd: repo, env: { ...process.env, ...env }, stdio: ['ignore', 'pipe', 'pipe'] }).toString() }; }
  catch (e) { return { code: e.status, out: String(e.stdout) + String(e.stderr) }; }
};
export const snap = (d, skip = () => false) => !fs.existsSync(d) ? {} : Object.fromEntries(fs.readdirSync(d, { recursive: true }).map(String).filter(f => !skip(f) && fs.statSync(path.join(d, f)).isFile()).sort().map(f => [f, crypto.createHash('sha256').update(fs.readFileSync(path.join(d, f))).digest('hex')]));
export const OPP = 'OPP-TST-ILLUSTRATIVE-RESIDENCE-A';
export const PRJ = 'PRJ-TST-ILLUSTRATIVE-RESIDENCE-A';
export const DSC1 = 'DSC-TST-ILLUSTRATIVE-RESIDENCE-A-01';
export const MED = (n) => `MED-TST-ILLUSTRATIVE-RESIDENCE-A-00${n}`;

// The market gate (M-MARKET-GATE, MG-1) is approved by the owner (28 Oct 2026). Lifecycle tests need one active market
// (MKT-TST, seeded below); tests of the unapproved state switch the registry off in a temporary copy.
// The registry entry is switched only inside a throw-away copy; nothing in the committed repository is changed.
function setTestMarketGate(repo, on) {
  const p = path.join(repo, 'desk/data/methods.json'); const t = fs.readFileSync(p, 'utf8');
  const re = /("id": "M-MARKET-GATE", "name": "Market publication gate", "status": ")(ACTIVE|INACTIVE)(", "documented": true, "validation_status": ")([A-Z_]+)(")/;
  if (!re.test(t)) throw new Error('M-MARKET-GATE registry entry not found');
  fs.writeFileSync(p, t.replace(re, (all, a, st, b, vs, c) => `${a}${on ? 'ACTIVE' : 'INACTIVE'}${b}${on ? 'RULES_APPROVED' : 'IMPLEMENTED_PENDING_OWNER_APPROVAL'}${c}`));
}
export const enableTestMarketGate = (repo) => setTestMarketGate(repo, true);
// simulates the state before the owner approved the MG-1 rules (registry INACTIVE): no real market can be activated
export const disableTestMarketGate = (repo) => setTestMarketGate(repo, false);
// The TEST-ONLY market MKT-TST passes a TEST-ONLY copy of the Istanbul configuration (in the temporary repository only,
// without per-opportunity requirements), with synthetic gate records and review records in the temporary store.
export function seedTestMarketGate(repo, store, tst) {
  const cp = path.join(repo, 'desk/_tools/market-gates/MG-1.json'); const cfg = readJson(cp);
  cfg.markets[tst.id] = { ...JSON.parse(JSON.stringify(cfg.markets['MKT-IST'])), name: 'TEST-ONLY market', test_only: true };
  cfg.markets[tst.id].publication.opportunity_requirements = [];
  writeJson(cp, cfg);
  const d = gateDataset(cfg, tst.id, TODAY, { tag: 'TSTMG' });
  fs.mkdirSync(path.join(store, 'data'), { recursive: true }); fs.mkdirSync(path.join(store, 'private'), { recursive: true });
  for (const c of ['districts', 'research_blocks', 'sources', 'evidence']) writeJson(path.join(store, `data/${c}.json`), { schema_version: '1.1', collection: c, records: d.collections[c] });
  writeJson(path.join(store, 'private/regulatory_reviews.json'), d.reviews);
  writeJson(path.join(store, 'private/entity_index.json'), d.provenance);
  // the public side of an activated market, as activate-market + export-market would leave it (D11/D12, PUB-2): the
  // market record with its certificate and the district names — never the research itself
  const g = evaluateMarketGate(cfg, tst.id, d.collections, { today: TODAY, now: `${TODAY}T00:00:00Z`, reviews: d.reviews, provenance: d.provenance });
  if (!g.pass) throw new Error(`TEST-ONLY market gate does not pass: ${g.reasons.map(r => r.code + ' ' + r.item).join('; ')}`);
  tst.gate_certificate = gateCertificate(cfg, g, d.reviews, TODAY);
  const f = path.join(repo, 'desk/data/public/districts.json'); const j = readJson(f);
  j.records = [...j.records, ...d.collections.districts.map(x => ({ ...x, research_block_ids: [], evidence_ids: [] }))].sort((a, b) => a.id.localeCompare(b.id)); writeJson(f, j);
}
// A TEST-ONLY real store beside a temporary repository, with a package derived from fixture A.
export function realSetup({ mutate, marketGate = true } = {}) {
  const repo = tmpRepo(); const store = tmp('desk-t-store-'); const pkgs = tmp('desk-t-pkgs-');
  const mp = path.join(repo, 'desk/data/public/markets.json'); const mk = readJson(mp);
  const tst = { ...mk.records[0], id: 'MKT-TST', slug: 'test-market', name: 'TEST-ONLY market', activation: 'ACTIVE', record_status: 'PUBLISHED', review: { approved_by: 'owner', approved_at: TODAY, gate_version: marketGate ? 'MG-1' : 'G3-v1' }, summary: { en: 'TEST-ONLY' }, research_block_ids: [], evidence_ids: [], field_states: [] };
  if (marketGate) { enableTestMarketGate(repo); seedTestMarketGate(repo, store, tst); } else disableTestMarketGate(repo);
  mk.records.push(tst); writeJson(mp, mk);
  if (marketGate) validateRepo(repo, { today: TODAY, writeIndex: true });
  fs.mkdirSync(path.join(store, 'data'), { recursive: true });
  writeJson(path.join(store, 'data/markets.json'), { schema_version: '1.1', collection: 'markets', records: [tst] });
  const mkPkg = (name, fn) => {
    const pkg = path.join(pkgs, name); fs.cpSync(path.join(repo, 'desk/_fixtures/packages/FIX-PKG-A'), pkg, { recursive: true });
    fs.rmSync(path.join(pkg, 'raw/plan-2plus1.svg'));
    const intake = readJson(path.join(pkg, 'intake.json'));
    intake.package_id = `TEST-${name}`; intake.market.slug = 'test-market';
    intake.media = intake.media.filter(m => !m.file.endsWith('.svg'));
    for (const m of intake.media) if (m.permission && m.permission.evidence_ref) m.permission.evidence_ref = m.permission.evidence_ref.replace('FIX', 'TST');
    for (const x of intake.permissions || []) x.id = x.id.replace('FIX', 'TST');
    if (fn) fn(intake, pkg);
    writeJson(path.join(pkg, 'intake.json'), intake);
    execFileSync('python3', ['-c', "import sys,glob\nfrom PIL import Image,ImageDraw\nfor f in glob.glob(sys.argv[1]+'/raw/*'):\n  im=Image.open(f); ImageDraw.Draw(im).text((70,390),'TEST-ONLY '+sys.argv[2],fill=(255,255,255)); im.save(f, exif=im.info.get('exif',b''))", pkg, name]);
    return pkg;
  };
  const base = mkPkg('PKG-1', mutate);
  const cleanup = () => { for (const d of [repo, store, pkgs]) fs.rmSync(d, { recursive: true, force: true }); };
  return { repo, store, base, mkPkg, cleanup, S: ['--store', store] };
}
export const approveImages = (s, only = null) => readJson(path.join(s.store, 'data/media.json')).records.filter(m => !only || only.includes(m.id)).map(m => [m.id, cli(s.repo, ['approve-media', ...s.S, '--id', m.id, '--by', 'owner']).code]);
// ingest + approve disclosure + images + owner approval (+ optional export)
export function publishedSetup({ mutate, exportIt = true } = {}) {
  const s = realSetup({ mutate });
  const must = (r, what) => { if (r.code !== 0) throw new Error(`${what} failed: ${r.out}`); return r; };
  must(cli(s.repo, ['ingest', '--package', s.base, ...s.S, '--apply']), 'ingest');
  must(cli(s.repo, ['approve-disclosure', ...s.S, '--id', DSC1, '--by', 'owner']), 'approve-disclosure');
  approveImages(s);
  must(cli(s.repo, ['approve', ...s.S, '--id', OPP, '--by', 'owner']), 'approve');
  if (exportIt) must(cli(s.repo, ['export', ...s.S, '--id', OPP]), 'export');
  return s;
}
export const deskSnap = (repo) => snap(path.join(repo, 'desk'), (f) => f.startsWith('_txn') || f === '_lock.json');
export const pub = (repo, c) => readJson(path.join(repo, 'desk/data/public', `${c}.json`)).records;
