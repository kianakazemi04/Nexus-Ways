// Price position (PPO-1), risk severity (RSV-1) and client brief (CBR-1) — run with: node --test desk/_tests/analysis2.test.mjs
// Unit tests on the engines, then the full private path on the TEST-ONLY store: analysis file → decision report → brief
// in EN/TR/AR. The three methods run only when the registry marks them internally active (D-20).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { pricePosition, BANDS } from '../_tools/engines/pricepos.mjs';
import { assessSeverity, SEVERITY } from '../_tools/engines/severity.mjs';
import { selectComparables } from '../_tools/engines/comparables.mjs';
import { decisionReportFor, clientBriefFor } from '../_tools/ingest.mjs';
import { ROOT, TODAY, OPP, readJson, writeJson, publishedSetup, analysisDoc } from './helpers.mjs';

const REG = readJson(path.join(ROOT, 'desk/data/methods.json')).methods;
const ON = REG.map(m => ['M-PRICE-POSITION', 'M-RISK-SEVERITY', 'M-CLIENT-BRIEF'].includes(m.id) ? { ...m, internal: 'ACTIVE' } : m);
const cmp = (vals) => selectComparables({ currency: 'TRY', area_basis: 'GROSS', district_id: 'D1', as_of: '2026-10-01' },
  vals.map((v, i) => ({ id: `C${i}`, evidence_id: `E${i}`, price_type: 'TRANSACTION', price: v * 100, currency: 'TRY', area: 100, area_basis: 'GROSS', district_id: 'D1', observed_at: '2026-09-01' })),
  { price_type: 'TRANSACTION', max_age_days: 365, min_sample: 3 });

test('PPO-1: bands from the interquartile range and the median; difference from the median; never without evidence', () => {
  const c = cmp([100, 110, 120, 130, 140]); // p25 110, median 120, p75 130
  const at = (ppm2) => pricePosition({ price: { value: ppm2 * 100, ref: 'PRIVATE:P/F' }, area_m2: { value: 100, ref: 'EVD-A' }, currency: 'TRY', area_basis: 'GROSS' }, c);
  assert.deepEqual([105, 115, 125, 150].map(x => at(x).band), BANDS);
  const r = at(132); assert.equal(r.status, 'OK'); assert.ok(Math.abs(r.vs_median - 0.1) < 1e-12); assert.equal(r.share_of_comparables_below, 0.8); assert.match(r.note, /Not a valuation/);
  assert.equal(pricePosition({ price: { value: 1, ref: '' }, area_m2: { value: 1, ref: 'E' }, currency: 'TRY', area_basis: 'GROSS' }, c).status, 'UNAVAILABLE', 'price needs a reference');
  assert.equal(pricePosition({ price: { value: 1, ref: 'E' }, area_m2: { value: 1, ref: 'E' }, currency: 'USD', area_basis: 'GROSS' }, c).status, 'UNAVAILABLE', 'no silent currency mix');
  assert.equal(pricePosition({ price: { value: 1, ref: 'E' }, area_m2: { value: 1, ref: 'E' }, currency: 'TRY', area_basis: 'NET' }, c).status, 'UNAVAILABLE', 'same area basis only');
  assert.equal(pricePosition({ price: { value: 1, ref: 'E' }, area_m2: { value: 1, ref: 'E' }, currency: 'TRY', area_basis: 'GROSS' }, cmp([100, 110])).status, 'UNAVAILABLE', 'insufficient sample → no position');
});

test('RSV-1: label needs a rationale; unassessed stays NOT_ASSESSED; a risk without evidence cannot be LOW; unknown risks refused', () => {
  const risks = [{ id: 'R1', evidence: ['E1'] }, { id: 'R2', evidence: [] }, { id: 'R3', evidence: ['E3'] }];
  const r = assessSeverity(risks, { R1: { label: 'HIGH', rationale: 'Title not yet transferable before completion.' }, R2: { label: 'LOW', rationale: 'Minor snagging issues are expected.' }, R3: { label: 'MEDIUM', rationale: 'short' }, R9: { label: 'LOW', rationale: 'Does not exist on this opportunity.' } });
  assert.equal(r.labels.R1.label, 'HIGH'); assert.equal(r.labels.R1.meaning, SEVERITY.HIGH);
  assert.ok(r.errors.some(e => /R2: a risk without evidence cannot be LOW/.test(e)));
  assert.ok(r.errors.some(e => /R3.rationale is required/.test(e)));
  assert.ok(r.errors.some(e => /R9: no such risk/.test(e)));
  assert.equal(assessSeverity(risks, {}).labels.R2.label, 'NOT_ASSESSED');
});

test('registry: the three methods are documented, tested and awaiting approval (internal INACTIVE until the owner approves)', () => {
  for (const id of ['M-PRICE-POSITION', 'M-RISK-SEVERITY', 'M-CLIENT-BRIEF']) {
    const m = REG.find(x => x.id === id); assert.ok(m, id);
    assert.equal(m.status, 'INACTIVE', `${id} never runs in the public pipeline`); assert.ok(m.implemented && m.documented && m.contract && m.tests, id);
    assert.ok(['ACTIVE', 'INACTIVE'].includes(m.internal), id);
  }
  assert.equal(REG.find(x => x.id === 'M-FAIR-VALUE').internal, undefined, 'fair value stays unimplemented');
});

test('private path: analysis → decision report with price position and severity → client brief in EN/TR/AR; nothing public', () => {
  const s = publishedSetup();
  try {
    const before = fs.readdirSync(path.join(s.repo, 'desk/data/public')).map(f => fs.readFileSync(path.join(s.repo, 'desk/data/public', f), 'utf8')).join();
    const O = { storeDir: s.store, id: OPP, today: TODAY, repoRoot: s.repo };
    // inactive by default: no position, no brief
    const off = decisionReportFor({ ...O, write: false });
    assert.equal(off.report.position.status, 'INACTIVE'); assert.match(off.report.methods['M-PRICE-POSITION'], /awaiting approval/);
    assert.equal(clientBriefFor({ ...O, write: false }).ok, false, 'brief refused while M-CLIENT-BRIEF is inactive');
    const risks = off.report.risks.map(r => r.id); assert.ok(risks.length >= 1);
    const vals = [62000, 66000, 70000, 72000, 76000];
    const doc = analysisDoc({
      comparables: { subject: { currency: 'TRY', area_basis: 'GROSS', district_id: 'DST-TST-ILLUSTRATIVE-DISTRICT-NORTH' }, rules: { price_type: 'TRANSACTION', max_age_days: 365, min_sample: 5 },
        candidates: vals.map((v, i) => ({ id: `CMP-${i}`, evidence_id: 'EVD-TST-ILLUSTRATIVE-RESIDENCE-A-0001', price_type: 'TRANSACTION', price: { value: v * 100, ref: 'ASSUMPTION', note: 'TEST-ONLY transaction price' }, currency: 'TRY', area: { value: 100, ref: 'ASSUMPTION', note: 'TEST-ONLY area' }, area_basis: 'GROSS', district_id: 'DST-TST-ILLUSTRATIVE-DISTRICT-NORTH', observed_at: '2026-09-15' })) },
      price_position: { price: { value: 7654321, ref: 'PRIVATE:TEST-PKG-1/F-PRICE', note: 'TEST-ONLY list price for the whole unit' }, area_m2: { value: 110, ref: 'EVD-TST-ILLUSTRATIVE-RESIDENCE-A-0010' }, currency: 'TRY', area_basis: 'GROSS' },
      risk_severity: { [risks[0]]: { label: 'MEDIUM', rationale: 'Delivery delay would postpone rental income but not ownership.' } }
    });
    fs.mkdirSync(path.join(s.store, 'private/analysis'), { recursive: true });
    writeJson(path.join(s.store, 'private/analysis', `${OPP}.json`), doc);
    const on = decisionReportFor({ ...O, write: false, registry: ON });
    assert.ok(on.ok, JSON.stringify(on.errors));
    const pp = on.report.position; assert.equal(pp.status, 'OK', JSON.stringify(pp)); assert.equal(pp.band, 'LOWER_HALF'); // 7,654,321 / 110 = 69,585 per m², median 70,000
    assert.equal(on.report.risks.find(r => r.id === risks[0]).severity, 'MEDIUM');
    assert.match(on.markdown, /## 9a\. Price position \(PPO-1\)/);
    // an assumed price cannot be positioned
    const bad = JSON.parse(JSON.stringify(doc)); bad.price_position.price = { value: 1, ref: 'ASSUMPTION', note: 'guess' };
    writeJson(path.join(s.store, 'private/analysis', `${OPP}.json`), bad);
    assert.ok(decisionReportFor({ ...O, write: false, registry: ON }).errors.some(e => /price_position.price: ref must be evidence/.test(e)));
    writeJson(path.join(s.store, 'private/analysis', `${OPP}.json`), doc);
    for (const lang of ['en', 'tr', 'ar']) {
      const b = clientBriefFor({ ...O, lang, registry: ON });
      assert.ok(b.ok, JSON.stringify(b.errors));
      const md = fs.readFileSync(b.path, 'utf8');
      assert.ok(b.path.startsWith(s.store), 'written to the private store');
      assert.match(md, { en: /Investor brief/, tr: /Yatırımcı özeti/, ar: /ملخص للمستثمر/ }[lang]);
      assert.match(md, { en: /not a valuation/, tr: /değerleme değildir/, ar: /وليست تقييماً/ }[lang]);
      assert.match(md, { en: /may receive a commission/, tr: /komisyon/, ar: /عمولة/ }[lang], 'commission disclosure');
      assert.match(md, { en: /not investment, legal or tax advice/, tr: /tavsiyesi/, ar: /ليست استشارة/ }[lang], 'not-advice text');
      assert.doesNotMatch(md, /\b(?:EVD|RSK|PRJ|DEV|DST|OPP)-[A-Z0-9-]+/, `${lang}: no internal record IDs in a client document`);
      assert.doesNotMatch(md, /\b(recommend(ed)? (to )?buy|strong buy|guaranteed)\b/i, `${lang}: no recommendation or guarantee`);
    }
    assert.equal(fs.readdirSync(path.join(s.repo, 'desk/data/public')).map(f => fs.readFileSync(path.join(s.repo, 'desk/data/public', f), 'utf8')).join(), before, 'public tree unchanged');
  } finally { s.cleanup(); }
});

test('store snapshot (STP-1): pack → unpack round trip outside the repository; refuses the repository, non-empty targets and edited snapshots', async () => {
  const { pack, unpack } = await import('../_tools/storepack.mjs');
  const os = await import('node:os');
  const a = fs.mkdtempSync(path.join(os.tmpdir(), 'stp-a-')); const b = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'stp-b-')), 'store');
  try {
    fs.mkdirSync(path.join(a, 'data'), { recursive: true }); fs.mkdirSync(path.join(a, 'private/analysis'), { recursive: true }); fs.mkdirSync(path.join(a, 'media'), { recursive: true });
    writeJson(path.join(a, 'data/projects.json'), { records: [{ id: 'PRJ-X' }] }); writeJson(path.join(a, 'private/analysis/OPP-X.json'), { as_of: '2026-10-29' });
    fs.writeFileSync(path.join(a, 'media/x.webp'), 'binary'); fs.writeFileSync(path.join(a, '_lock.json'), '{}');
    const snap = pack(a); assert.deepEqual(Object.keys(snap.files).sort(), ['data/projects.json', 'private/analysis/OPP-X.json']);
    assert.equal(unpack(snap, b), 2); assert.deepEqual(readJson(path.join(b, 'data/projects.json')), { records: [{ id: 'PRJ-X' }] });
    assert.throws(() => unpack(snap, b), /not empty/);
    assert.throws(() => pack(path.join(ROOT, 'desk')), /inside \(or contains\) the public repository/);
    const bad = JSON.parse(JSON.stringify(snap)); bad.files['data/projects.json'] = '{}';
    assert.throws(() => unpack(bad, path.join(b, '..', 'other')), /checksum/);
    const evil = { ...snap, files: { '../../escape.json': '{}' } }; evil.sha256 = (await import('node:crypto')).createHash('sha256').update(JSON.stringify(evil.files)).digest('hex');
    assert.throws(() => unpack(evil, path.join(b, '..', 'evil')), /refused path/);
  } finally { fs.rmSync(a, { recursive: true, force: true }); fs.rmSync(path.dirname(b), { recursive: true, force: true }); }
});
