// Final acceptance suite (readiness closure, 28 Oct 2026) — run with:  node --test desk/_tests/acceptance.test.mjs
// One test per acceptance criterion (A1–A10) of the brief "Nexus Intelligence Desk — Final Readiness Closure".
// Synthetic, TEST-ONLY data only, in temporary copies of the repository and temporary stores: no real market is activated
// and nothing real is published. Each criterion names what it proves; other suites hold the detailed negative cases.
import { describe, test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { ROOT, TODAY, readJson, writeJson, cli, tmpRepo, realSetup, approveImages, OPP, PRJ, DSC1, deskSnap, pub, analysisDoc } from './helpers.mjs';
import { validateRepo } from '../_tools/validate.mjs';
import { MATERIAL_FIELDS } from '../assets/js/policy.js';
import { loadGateConfig, evaluateMarketGate } from '../_tools/engines/marketgate.mjs';
import { gateDataset, sub } from './marketgate-data.mjs';

const CFG = loadGateConfig();
const MARKETS = ['MKT-IST', 'MKT-DXB', 'MKT-AUH'];
const sourceOf = (repo, id) => pub(repo, 'sources').find(s => s.id === id);

describe('acceptance: one synthetic project through the whole pipeline', () => {
  let s; let afterIngest;
  before(() => { s = realSetup(); });
  after(() => s && s.cleanup());

  test('A1 — a synthetic project package is ingested into private storage only', () => {
    const before = deskSnap(s.repo);
    const r = cli(s.repo, ['ingest', '--package', s.base, ...s.S, '--apply']); assert.equal(r.code, 0, r.out);
    assert.ok(readJson(path.join(s.store, 'data/projects.json')).records.some(p => p.id === PRJ), 'project in the private store');
    const pf = readJson(path.join(s.store, 'private/private_facts.json'));
    assert.ok(pf.some(f => f.domain === 'PRICING'), 'price facts kept as private facts');
    assert.ok(fs.readdirSync(path.join(s.store, 'private')).length > 0);
    assert.deepEqual(deskSnap(s.repo), before, 'ingestion writes nothing to the public repository');
    afterIngest = before;
  });

  test('A6 — approved disclosures and per-image media decisions are required before approval', () => {
    let r = cli(s.repo, ['approve', ...s.S, '--id', OPP, '--by', 'owner']);
    assert.notEqual(r.code, 0); assert.match(r.out, /legal review pending|no publishable cover/);
    assert.equal(cli(s.repo, ['approve-disclosure', ...s.S, '--id', DSC1, '--by', 'owner']).code, 0);
    r = cli(s.repo, ['approve', ...s.S, '--id', OPP, '--by', 'owner']);
    assert.notEqual(r.code, 0, 'images still need their own decision'); assert.match(r.out, /no publishable cover|gallery/);
    assert.ok(approveImages(s).some(([, code]) => code === 0), 'images with a written permission can be approved');
    r = cli(s.repo, ['approve', ...s.S, '--id', OPP, '--by', 'owner']); assert.equal(r.code, 0, r.out);
    assert.deepEqual(deskSnap(s.repo), afterIngest, 'approval alone publishes nothing');
  });

  test('A3 — private financial outputs appear in the internal report and never in public output', () => {
    fs.mkdirSync(path.join(s.store, 'private/analysis'), { recursive: true });
    writeJson(path.join(s.store, 'private/analysis', `${OPP}.json`), analysisDoc());
    const r = cli(s.repo, ['report', ...s.S, '--id', OPP]); assert.equal(r.code, 0, r.out);
    const js = readJson(path.join(s.store, 'reports', `decision-${OPP}.json`));
    assert.equal(js.finance.scenarios.base.roi.status, 'OK'); assert.equal(js.finance.scenarios.base.npv.status, 'OK');
    assert.match(fs.readFileSync(path.join(s.store, 'reports', `decision-${OPP}.md`), 'utf8'), /INTERNAL — not for publication/);
    assert.equal(cli(s.repo, ['export', ...s.S, '--id', OPP]).code, 0);
    const publicText = fs.readdirSync(path.join(s.repo, 'desk'), { recursive: true }).map(String)
      .filter(f => /\.(json|html|js)$/.test(f) && !f.split(path.sep).some(x => x.startsWith('_')))
      .map(f => fs.readFileSync(path.join(s.repo, 'desk', f), 'utf8')).join('\n');
    assert.doesNotMatch(publicText, /7654321|7,654,321|7\.654\.321|INTERNAL — not for publication|PRIVATE:TEST-PKG-1|"roi"|"npv"|net_rental_yield/i);
    for (const pf of readJson(path.join(s.store, 'private/private_facts.json')).filter(f => typeof f.value === 'number' && f.value >= 1000)) assert.ok(!publicText.includes(String(pf.value)), `private figure ${pf.key} not public`);
  });

  test('A2 — every material public fact traces to evidence and a source locator', () => {
    let checked = 0;
    for (const [coll, type] of [['projects', 'project'], ['developers', 'developer'], ['assets', 'asset']]) for (const rec of pub(s.repo, coll)) for (const f of MATERIAL_FIELDS[type]) {
      const v = rec[f]; if (v === null || v === undefined || (Array.isArray(v) && !v.length) || v === '') continue;
      const evs = pub(s.repo, 'evidence').filter(e => e.subject && e.subject.type === type && e.subject.id === rec.id && e.field === f);
      assert.ok(evs.length, `${rec.id}:${f} has no public evidence`);
      assert.ok(evs.some(e => e.source_url || e.source_locator || (sourceOf(s.repo, e.source_id) || {}).url), `${rec.id}:${f} has no source URL or locator`);
      assert.ok(evs.every(e => sourceOf(s.repo, e.source_id)), `${rec.id}:${f} cites a source that is not public`);
      checked++;
    }
    assert.ok(checked >= 5, `${checked} material facts checked`);
  });

  test('A7 — the passing synthetic project traverses the full pipeline: validated, built in EN/TR/AR, indexed', () => {
    assert.deepEqual(validateRepo(s.repo, { today: TODAY }).errors, []);
    assert.deepEqual(readJson(path.join(s.repo, 'desk/data/public/published.json')).opportunities, [OPP]);
    for (const l of ['', 'tr/', 'ar/']) {
      const page = path.join(s.repo, `desk/${l}opportunities/${OPP.toLowerCase()}/index.html`);
      assert.ok(fs.existsSync(page), `${l || 'en/'} page`); assert.match(fs.readFileSync(page, 'utf8'), /<meta name="robots" content="index, follow">/);
    }
    execFileSync('node', [path.join(s.repo, 'desk/_tools/build.mjs'), '--check'], { stdio: 'pipe' });
  });

  test('A9 — withdrawal and market deactivation remove the public projection and keep the private audit', () => {
    let r = cli(s.repo, ['deactivate-market', ...s.S, '--id', 'MKT-TST', '--by', 'owner', '--reason', 'TEST-ONLY']);
    assert.notEqual(r.code, 0, 'refused while an opportunity is published'); assert.match(r.out, /withdraw them first/);
    r = cli(s.repo, ['withdraw', ...s.S, '--id', OPP, '--by', 'owner', '--reason', 'TEST-ONLY acceptance']); assert.equal(r.code, 0, r.out);
    for (const c of ['opportunities', 'projects', 'assets', 'media', 'disclosures', 'risks']) assert.ok(!pub(s.repo, c).some(x => JSON.stringify(x).includes('ILLUSTRATIVE-RESIDENCE-A')), `${c} cleared`);
    for (const l of ['', 'tr/', 'ar/']) assert.ok(!fs.existsSync(path.join(s.repo, `desk/${l}opportunities/${OPP.toLowerCase()}`)), `${l || 'en/'} page removed`);
    assert.ok(!fs.existsSync(path.join(s.repo, 'desk/media', PRJ)) || !fs.readdirSync(path.join(s.repo, 'desk/media', PRJ)).length, 'media removed');
    r = cli(s.repo, ['deactivate-market', ...s.S, '--id', 'MKT-TST', '--by', 'owner', '--reason', 'TEST-ONLY acceptance']); assert.equal(r.code, 0, r.out);
    const m = pub(s.repo, 'markets').find(x => x.id === 'MKT-TST'); assert.equal(m.activation, 'INACTIVE'); assert.equal(m.gate_certificate, null);
    const audit = readJson(path.join(s.store, 'private/audit_log.json')).map(a => a.action);
    for (const a of ['approve', 'export', 'withdraw', 'deactivate-market']) assert.ok(audit.includes(a), `audit keeps ${a}`);
    assert.ok(readJson(path.join(s.store, 'data/evidence.json')).records.length > 0, 'private research kept');
    assert.deepEqual(validateRepo(s.repo, { today: TODAY }).errors, []);
  });
});

test('A4 — missing statutory records (each market) and a missing sales-office permission block publication', () => {
  for (const id of MARKETS) {
    const d = gateDataset(CFG, id, TODAY);
    assert.equal(evaluateMarketGate(CFG, id, d.collections, { today: TODAY, reviews: d.reviews, provenance: d.provenance }).pass, true, `${id}: complete synthetic dataset passes`);
    const g = evaluateMarketGate(CFG, id, d.collections, { today: TODAY, reviews: [], provenance: d.provenance });
    assert.equal(g.pass, false); assert.ok(g.reasons.some(r => r.code === 'MG_REVIEW_MISSING'), `${id}: no statutory record → fails`);
    const other = MARKETS.find(x => x !== id); const foreign = gateDataset(CFG, other, TODAY).reviews;
    assert.equal(evaluateMarketGate(CFG, id, d.collections, { today: TODAY, reviews: foreign, provenance: d.provenance }).pass, false, `${id}: another market's reviews never count`);
  }
  const s = realSetup({ mutate: (i) => { i.permissions = []; } });
  try {
    assert.equal(cli(s.repo, ['ingest', '--package', s.base, ...s.S, '--apply']).code, 0);
    assert.equal(cli(s.repo, ['approve-disclosure', ...s.S, '--id', DSC1, '--by', 'owner']).code, 0);
    approveImages(s);
    const r = cli(s.repo, ['approve', ...s.S, '--id', OPP, '--by', 'owner']);
    assert.notEqual(r.code, 0); assert.match(r.out, /project permission|written permission/);
  } finally { s.cleanup(); }
});

test('A5 — invalid or stale evidence blocks the relevant market gate (Istanbul, Dubai, Abu Dhabi independently)', () => {
  for (const id of MARKETS) {
    const run = (mut) => { const d = JSON.parse(JSON.stringify(gateDataset(CFG, id, TODAY))); mut(d); return evaluateMarketGate(CFG, id, d.collections, { today: TODAY, reviews: d.reviews, provenance: d.provenance }); };
    const fx = CFG.markets[id].fx.reference; const lim = CFG.markets[id].statistics.find(s => s.key === fx).max_age_days;
    const stale = run((d) => { const e = d.collections.evidence.find(x => x.topic === fx); e.period = sub(TODAY, lim + 2); });
    assert.equal(stale.pass, false); assert.ok(stale.reasons.some(r => r.code === 'MG_STAT_STALE' || r.code === 'MG_FX'), `${id}: stale FX`);
    const unverified = run((d) => { for (const e of d.collections.evidence) if (e.subject.type === 'market') e.verification_status = 'SOURCE-REPORTED'; });
    assert.ok(unverified.reasons.some(r => r.code === 'MG_STAT_UNVERIFIED'), `${id}: secondary-source figures never pass`);
    const wrongSource = run((d) => { for (const s of d.collections.sources) s.publisher = 'TEST-ONLY News'; });
    assert.ok(wrongSource.reasons.some(r => r.code === 'MG_STAT_SOURCE'), `${id}: non-official publisher`);
    // other markets are unaffected by this market's failure
    for (const o of MARKETS.filter(x => x !== id)) { const d = gateDataset(CFG, o, TODAY); assert.equal(evaluateMarketGate(CFG, o, d.collections, { today: TODAY, reviews: d.reviews, provenance: d.provenance }).pass, true); }
  }
});

test('A8 — a failing validation or test prevents the gated deployment', () => {
  const dep = fs.readFileSync(path.join(ROOT, '.github/workflows/desk-pages-deploy.yml'), 'utf8');
  assert.match(dep, /validate:\n\s+uses: \.\/\.github\/workflows\/desk-validate\.yml/);
  assert.match(dep, /build:\n\s+needs: validate/); assert.match(dep, /deploy:\n\s+needs: \[validate, build\]/);
  assert.match(dep, /pages_check\.py _site/); assert.doesNotMatch(dep, /pull_request|workflow_run|continue-on-error/);
  const val = fs.readFileSync(path.join(ROOT, '.github/workflows/desk-validate.yml'), 'utf8');
  for (const step of ['node desk/_tools/validate.mjs', 'node desk/_tools/build.mjs --check', 'node --test ', 'pages_check.py _site', 'ui_acceptance.py']) assert.ok(val.includes(step), step);
  assert.doesNotMatch(val, /continue-on-error|\|\| true/);
  // the validator exits non-zero on a data error, so the reusable workflow fails and deploy never runs
  const repo = tmpRepo();
  try {
    const p = path.join(repo, 'desk/data/public/markets.json'); const j = readJson(p); j.records[0].price = 1; writeJson(p, j);
    let code = 0; try { execFileSync('node', [path.join(repo, 'desk/_tools/validate.mjs')], { stdio: 'pipe' }); } catch (e) { code = e.status; }
    assert.notEqual(code, 0, 'validate.mjs fails on a schema error');
  } finally { fs.rmSync(repo, { recursive: true, force: true }); }
});

test('A10 — English, Turkish and Arabic pages: language, direction, alternates, metadata, indexing and internal links', () => {
  const pages = fs.readdirSync(path.join(ROOT, 'desk'), { recursive: true }).map(String).filter(f => f.endsWith('.html') && !f.split(path.sep).some(x => x.startsWith('_')));
  const published = readJson(path.join(ROOT, 'desk/data/public/published.json')).opportunities.length;
  const per = { en: 0, tr: 0, ar: 0 };
  for (const f of pages) {
    const h = fs.readFileSync(path.join(ROOT, 'desk', f), 'utf8');
    const lang = f.startsWith('tr/') ? 'tr' : f.startsWith('ar/') ? 'ar' : 'en'; per[lang]++;
    assert.match(h, new RegExp(`<html lang="${lang}" dir="${lang === 'ar' ? 'rtl' : 'ltr'}">`), `${f}: lang/dir`);
    for (const l of ['en', 'tr', 'ar']) assert.match(h, new RegExp(`<link rel="alternate" hreflang="${l}" href="https://nexus-ways\\.com/desk/`), `${f}: hreflang ${l}`);
    assert.match(h, /<title>[^<]{5,}<\/title>/, `${f}: title`); assert.match(h, /<meta name="description" content="[^"]{10,}">/, `${f}: description`);
    const evergreen = /^(?:(?:tr|ar)\/)?(?:markets|intelligence)\//.test(f.replace(/\\/g, '/'));
    if (evergreen) assert.match(h, /<meta name="robots" content="index, follow">/, `${f}: Markets and Intelligence are indexable (K-4b)`);
    else if (!published) assert.match(h, /<meta name="robots" content="noindex, follow">/, `${f}: noindex while nothing is published (K-4)`);
    assert.match(h, /<link rel="canonical" href="https:\/\/nexus-ways\.com\/desk\//, `${f}: canonical`);
    for (const [, href] of h.matchAll(/href="(\/desk\/[^"#?]*)/g)) {
      const t = path.join(ROOT, href.endsWith('/') ? href + 'index.html' : href);
      assert.ok(fs.existsSync(t), `${f}: broken link ${href}`);
    }
  }
  assert.ok(per.en === per.tr && per.tr === per.ar && per.en >= 12, JSON.stringify(per));
});
