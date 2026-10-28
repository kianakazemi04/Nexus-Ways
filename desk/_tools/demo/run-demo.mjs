#!/usr/bin/env node
// DEMONSTRATION RUN — clearly labelled demonstration data, not a real project or real research.
// Runs the complete Claude project workflow on the illustrative package FIX-PKG-A (renamed TEST-ONLY) inside a
// throw-away copy of the repository and a throw-away private store:
//   package → ingest (facts, developer claims, permissions, images) → gate → decision report with financial analysis
//   → second project → comparison / research queue → owner approvals → export → build → public page checks.
// Nothing touches the real repository. Outputs (reports, public record, logs) are copied to --out.
//   node desk/_tools/demo/run-demo.mjs --out <dir>
import fs from 'node:fs';
import path from 'node:path';
import { publishedSetup, cli, readJson, writeJson, OPP, PRJ, TODAY } from '../../_tests/helpers.mjs';

const out = path.resolve(process.argv.includes('--out') ? process.argv[process.argv.indexOf('--out') + 1] : 'demo-out');
fs.mkdirSync(out, { recursive: true });
const log = []; const step = (t, r) => { log.push(`## ${t}\n\n\`\`\`\n${(r && r.out ? r.out : String(r || '')).trim()}\n\`\`\`\n`); return r; };
const analysis = {
  opportunity_id: OPP, as_of: TODAY,
  fx: [],
  finance: {
    currency: 'TRY', horizon_years: { value: 5, ref: 'ASSUMPTION', note: 'DEMO investor horizon' }, delivery_year: { value: 2, ref: 'ASSUMPTION', note: 'DEMO delivery two years after purchase (developer claim)' },
    acquisition: { price: { value: 7654321, ref: 'PRIVATE:TEST-PKG-1/F-PRICE', note: 'DEMO price-list line' }, payments: [{ t: 0, amount: { value: 7654321, ref: 'PRIVATE:TEST-PKG-1/F-PRICE', note: 'DEMO full payment at signing' }, label: 'price' }] },
    rent: { gross_annual: { value: 360000, ref: 'ASSUMPTION', note: 'DEMO rent quote' }, occupancy: { value: 0.9, ref: 'ASSUMPTION', note: 'DEMO 10% vacancy' }, growth_rate: { value: 0.3, ref: 'ASSUMPTION', note: 'DEMO nominal TRY rent growth' } },
    operating: { fixed_annual: { value: 20000, ref: 'ASSUMPTION', note: 'DEMO building fees' }, pct_of_collected_rent: { value: 0.1, ref: 'ASSUMPTION', note: 'DEMO management fee' } },
    tax: { rental_income_rate: { value: 0.15, ref: 'ASSUMPTION', note: 'DEMO flat rate; a real case needs tax advice' }, capital_gains_rate: { value: 0, ref: 'ASSUMPTION', note: 'DEMO exemption assumption' } },
    exit: { appreciation_rate: { value: 0.25, ref: 'ASSUMPTION', note: 'DEMO nominal price growth' }, selling_cost_rate: { value: 0.03, ref: 'ASSUMPTION', note: 'DEMO agency and title costs' } },
    discount: { rate: { value: 0.35, ref: 'ASSUMPTION', note: 'DEMO investor required nominal TRY return' }, basis: 'Investor required nominal return in TRY (DEMO)' },
    views: { inflation: { rate: { value: 0.3, ref: 'ASSUMPTION', note: 'DEMO annual inflation near the recorded September 2026 CPI' }, basis: 'DEMO assumption: 30% a year, close to TÜİK annual CPI for Sep 2026 as reported' },
      home_currency: { code: 'USD', spot: { value: 41, ref: 'ASSUMPTION', note: 'DEMO USD/TRY spot, not a CBRT figure' }, annual_change: { value: 0.2, ref: 'ASSUMPTION', note: 'DEMO assumed lira depreciation a year' }, basis: 'DEMO spot and depreciation path; not a forecast' } }
  },
  scenarios: { adverse: { rent: { occupancy: { value: 0.7, ref: 'ASSUMPTION', note: 'DEMO weak letting market' } } }, favourable: { exit: { appreciation_rate: { value: 0.3, ref: 'ASSUMPTION', note: 'DEMO stronger price growth' } } } },
  findings: [{ type: 'STRENGTH', class: 'FACT', text: 'Project identity confirmed in the (illustrative) title registry record.', refs: ['EVD-TST-ILLUSTRATIVE-RESIDENCE-A-0001'] }],
  investor_profile: { objectives: ['long_term_hold'], horizon_years: 5 }
};

const s = publishedSetup();
try {
  fs.mkdirSync(path.join(s.store, 'private/analysis'), { recursive: true });
  writeJson(path.join(s.store, 'private/analysis', `${OPP}.json`), analysis);
  step('Decision report — demonstration project A (approved and exported)', cli(s.repo, ['report', ...s.S, '--id', OPP]));
  const pkg2 = s.mkPkg('PKG-TWO', (i) => { i.project = { ...i.project, name: 'TEST-ONLY Residence Two', slug: 'test-only-residence-two' }; i.developer = { ref: 'DEV-ILLUSTRATIVE-DEVELOPER-A' }; i.district = { ref: readJson(path.join(s.store, 'data/projects.json')).records[0].district_id }; i.media = []; i.permissions = []; i.opportunity = { ...(i.opportunity || {}), title: { en: 'TEST-ONLY Residence Two' } }; });
  step('Ingest — demonstration project Two (no permission, no images)', cli(s.repo, ['ingest', '--package', pkg2, ...s.S, '--apply']));
  const two = readJson(path.join(s.store, 'data/opportunities.json')).records.map(o => o.id).find(id => id !== OPP);
  step('Decision report — demonstration project Two', cli(s.repo, ['report', ...s.S, '--id', two]));
  step('Comparison and research queue', cli(s.repo, ['compare', ...s.S, '--ids', `${OPP},${two}`]));
  step('Publication gate', cli(s.repo, ['gate', ...s.S]));
  // independent check: recompute the base case by hand from the analysis inputs (not from the engine's cash flows)
  const js = readJson(path.join(s.store, 'reports', `decision-${OPP}.json`)); const base = js.finance.scenarios.base;
  const v = (o) => o.value; const F = analysis.finance; const N = v(F.horizon_years), D = v(F.delivery_year), P = v(F.acquisition.price), r = v(F.discount.rate);
  let flows = [], invested = P;
  for (let t = 0; t <= N; t++) {
    let cf = t === 0 ? -P : 0;
    if (t >= D + 1) { const gross = v(F.rent.gross_annual) * (1 + v(F.rent.growth_rate)) ** (t - D - 1); const col = gross * v(F.rent.occupancy); const op = v(F.operating.fixed_annual) + v(F.operating.pct_of_collected_rent) * col; cf += col - op - v(F.tax.rental_income_rate) * Math.max(0, col - op); }
    if (t === N) { const sale = P * (1 + v(F.exit.appreciation_rate)) ** N; const sc = sale * v(F.exit.selling_cost_rate); cf += sale - sc - v(F.tax.capital_gains_rate) * Math.max(0, sale - sc - invested); }
    flows.push(cf);
  }
  const handNpv = flows.reduce((a, cf, t) => a + cf / (1 + r) ** t, 0); const handRoi = flows.reduce((a, b) => a + b, 0) / invested;
  log.push(`## Independent calculation check (base case)\n\nHand-computed cash flows (TRY, t = 0…${N}): ${flows.map(x => x.toFixed(2)).join('; ')}\n\n| Metric | Engine (FIN-1) | Hand calculation | Difference |\n|---|---|---|---|\n| NPV | ${base.npv.value.toFixed(2)} | ${handNpv.toFixed(2)} | ${(base.npv.value - handNpv).toExponential(2)} |\n| ROI | ${(base.roi.value * 100).toFixed(4)}% | ${(handRoi * 100).toFixed(4)}% | ${(base.roi.value - handRoi).toExponential(2)} |\n\nAdverse ROI ${(js.finance.scenarios.adverse.roi.value * 100).toFixed(2)}% < base ${(base.roi.value * 100).toFixed(2)}% (occupancy 70% instead of 90%).\n`);
  if (Math.abs(base.npv.value - handNpv) > 1e-6 || Math.abs(base.roi.value - handRoi) > 1e-12) throw new Error('engine and hand calculation disagree');
  for (const f of fs.readdirSync(path.join(s.store, 'reports'))) fs.copyFileSync(path.join(s.store, 'reports', f), path.join(out, f));
  const pub = (c) => readJson(path.join(s.repo, 'desk/data/public', `${c}.json`)).records;
  writeJson(path.join(out, 'public-record.json'), { note: 'DEMONSTRATION — what export wrote to the public tree of the throw-away copy', published: readJson(path.join(s.repo, 'desk/data/public/published.json')), opportunities: pub('opportunities'), projects: pub('projects'), media: pub('media') });
  const pageDir = path.join(s.repo, 'desk/opportunities'); const slug = fs.readdirSync(pageDir).find(d => d !== 'preview' && d !== 'index.html');
  if (slug) fs.copyFileSync(path.join(pageDir, slug, 'index.html'), path.join(out, 'public-page.html'));
  const leaks = JSON.stringify(fs.readdirSync(path.join(s.repo, 'desk/data/public')).map(f => fs.readFileSync(path.join(s.repo, 'desk/data/public', f), 'utf8'))).match(/7654321|360000|PRIVATE:|decision report/gi);
  log.push(`## Private/public separation\n\nPrivate price, rent and report strings found in the public tree: ${leaks ? leaks.join(', ') : 'none'}\n`);
  fs.writeFileSync(path.join(out, 'demo-log.md'), `# Nexus Desk — demonstration run (${TODAY})\n\nDEMONSTRATION DATA ONLY. Illustrative package FIX-PKG-A renamed TEST-ONLY; not a real project, not real research.\n\n${log.join('\n')}`);
  console.log(`demo written to ${out}; public page: ${slug || 'none'}; leaks: ${leaks ? leaks.length : 0}`);
} finally { s.cleanup(); }
