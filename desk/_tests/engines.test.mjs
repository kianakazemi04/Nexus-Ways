// Decision-engine tests (Engines 4, 5, 7, 8 and the analysis handoff) — run with:  node --test desk/_tests/engines.test.mjs
// Financial results are checked three ways: hand-calculated values written below, an independent second implementation
// (Horner evaluation, separate cash-flow loop) and exact textbook cases. Synthetic TEST-ONLY data only.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { cashFlows, roi, npv, netRentalYield, scenarios, checkInputs, irr, irrOf, returnViews, timedFlows } from '../_tools/engines/finance.mjs';
import { convertArea, convertMoney, fxRate, M2_PER_SQFT } from '../_tools/engines/units.mjs';
import { selectComparables, quantile } from '../_tools/engines/comparables.mjs';
import { investmentFit, rank } from '../_tools/engines/fit.mjs';
import { checkAnalysis } from '../_tools/engines/analysis.mjs';
import { METHOD_TEXT } from '../_tools/method-texts.mjs';
import { methodState } from '../_tools/pages-content.mjs';
import { readJson, writeJson, cli, OPP, PRJ, publishedSetup, deskSnap, pub, ROOT, analysisDoc } from './helpers.mjs';

const close = (a, b, eps = 1e-6) => assert.ok(Math.abs(a - b) <= eps * Math.max(1, Math.abs(b)), `${a} ≠ ${b}`);
// reference case (TRY, 5 years, rent from year 1, 10% rent growth, 20% appreciation a year, 2% selling costs)
const BASE = () => ({
  currency: 'TRY', horizon_years: 5, delivery_year: 0,
  acquisition: { price: 1000000, payments: [{ t: 0, amount: 1000000, label: 'price' }, { t: 0, amount: 40000, label: 'title fee and costs' }] },
  rent: { gross_annual: 60000, occupancy: 0.9, growth_rate: 0.10 },
  operating: { fixed_annual: 5000, pct_of_collected_rent: 0.10 },
  tax: { rental_income_rate: 0.15, capital_gains_rate: 0 },
  exit: { appreciation_rate: 0.20, selling_cost_rate: 0.02 },
  discount: { rate: 0.08, basis: 'TEST-ONLY required return stated by the investor profile' }
});

// ================================================================== Engine 5: cash flows, ROI, NPV, scenarios
// FIN-2 additions — independently hand-checked
test('FIN-2: a payment within a year is discounted at its exact time; whole-year results are unchanged', () => {
  const x = { ...BASE(), acquisition: { price: 1000000, payments: [{ t: 0, amount: 520000 }, { t: 0.5, amount: 520000 }] } };
  const rows = cashFlows(x).rows; assert.equal(rows[1].payments, 520000, 'a mid-year payment is shown in the row of the year that contains it');
  // hand: NPV = base NPV + 520000 − 520000/1.08^0.5 (the second half moved from t = 0 to t = 0.5)
  close(npv(x).value, npv(BASE()).value + 520000 - 520000 / Math.pow(1.08, 0.5), 1e-9);
  close(roi(x).value, roi(BASE()).value, 1e-12, 'ROI is undiscounted: timing within the horizon does not change it');
  assert.equal(checkInputs({ ...BASE(), acquisition: { price: 1, payments: [{ t: 6, amount: 1 }] } }).ok, false, 'beyond the horizon is refused');
});

test('FIN-2: IRR — textbook cases are exact; several sign changes are refused, never guessed', () => {
  close(irrOf([{ t: 0, amount: -100 }, { t: 1, amount: 110 }]).value, 0.10, 1e-9);
  close(irrOf([{ t: 0, amount: -100 }, { t: 2, amount: 121 }]).value, 0.10, 1e-9);
  // annuity: −1000 now, 400 a year for 3 years → IRR solves Σ 400/(1+r)^t = 1000
  const a = irrOf([{ t: 0, amount: -1000 }, { t: 1, amount: 400 }, { t: 2, amount: 400 }, { t: 3, amount: 400 }]).value;
  close(400 / (1 + a) + 400 / (1 + a) ** 2 + 400 / (1 + a) ** 3, 1000, 1e-9);
  assert.equal(irrOf([{ t: 0, amount: -100 }, { t: 1, amount: 230 }, { t: 2, amount: -132 }]).status, 'AMBIGUOUS');
  assert.equal(irrOf([{ t: 0, amount: 100 }, { t: 1, amount: 10 }]).status, 'UNAVAILABLE');
  // the engine's IRR sets its own NPV to zero
  const r = irr(BASE()); assert.equal(r.status, 'OK');
  close(npv({ ...BASE(), discount: { rate: r.value, basis: 'TEST-ONLY discount at the IRR itself' } }).value, 0, 1e-6);
});

test('FIN-2: real-terms and home-currency views (hand calculation); not run without recorded inputs', () => {
  const s = { currency: 'TRY', horizon_years: 2, delivery_year: 0, acquisition: { price: 100, payments: [{ t: 0, amount: 100 }] }, rent: { gross_annual: 0, occupancy: 0, growth_rate: 0 }, operating: { fixed_annual: 0, pct_of_collected_rent: 0 }, tax: { rental_income_rate: 0, capital_gains_rate: 0 }, exit: { sale_price: 169, selling_cost_rate: 0 },
    views: { inflation: { rate: 0.30, basis: 'TEST-ONLY annual CPI assumption for the check' }, home_currency: { code: 'USD', spot: 40, annual_change: 0.25, basis: 'TEST-ONLY spot and depreciation path for the check' } } };
  const v = returnViews(s);
  close(roi(s).value, 0.69, 1e-12);                            // nominal: 169/100 − 1
  close(v.real.roi, 169 / 1.69 / 100 - 1, 1e-12);              // deflated by 1.3² = 1.69 → 0% real
  close(v.real.irr.value, 1.3 / 1.3 - 1, 1e-9);                // nominal IRR 30% → real 0%
  close(v.home.invested, 100 / 40, 1e-12);                     // 2.5 USD
  close(v.home.net, 169 / (40 * 1.25 ** 2) - 2.5, 1e-12);      // 169/62.5 − 2.5 = 0.204 USD
  close(v.home.roi, (169 / 62.5) / 2.5 - 1, 1e-12);            // 8.16%
  close(v.home.irr.value, Math.sqrt((169 / 62.5) / 2.5) - 1, 1e-9);
  const none = returnViews(BASE()); assert.equal(none.real.status, 'NOT RUN'); assert.equal(none.home.status, 'NOT RUN');
  assert.equal(checkInputs({ ...s, views: { inflation: { rate: 0.3 } } }).ok, false, 'a view without a written basis is refused');
  assert.equal(checkInputs({ ...s, views: { home_currency: { code: 'TRY', spot: 1, annual_change: 0, basis: 'TEST-ONLY same currency' } } }).ok, false);
});

test('ANL-2: an FX rate must come from a recorded evidence or private fact, with the same value and date', () => {
  const store = { collections: { evidence: [{ id: 'EVD-FX', value: 41.25, period: '2026-10-27' }] }, private: { private_facts: [] } };
  const doc = (fx) => ({ opportunity_id: 'OPP-X', as_of: '2026-10-28', fx: [fx] });
  assert.ok(checkAnalysis(doc({ base: 'USD', quote: 'TRY', rate: 41.25, date: '2026-10-27', source: 'CBRT', ref: 'EVD-FX' }), store, 'OPP-X').ok);
  assert.ok(checkAnalysis(doc({ base: 'TRY', quote: 'USD', rate: 1 / 41.25, date: '2026-10-27', source: 'CBRT', ref: 'EVD-FX' }), store, 'OPP-X').ok, 'the inverse quotation is accepted');
  const e = (fx) => checkAnalysis(doc(fx), store, 'OPP-X').errors.join(' ');
  assert.match(e({ base: 'USD', quote: 'TRY', rate: 41.25, date: '2026-10-27', source: 'CBRT' }), /ref required/);
  assert.match(e({ base: 'USD', quote: 'TRY', rate: 40, date: '2026-10-27', source: 'CBRT', ref: 'EVD-FX' }), /differs from EVD-FX/);
  assert.match(e({ base: 'USD', quote: 'TRY', rate: 41.25, date: '2026-10-20', source: 'CBRT', ref: 'EVD-FX' }), /differs from the observation date/);
  assert.match(e({ base: 'USD', quote: 'TRY', rate: 41.25, date: '2026-10-27', source: 'x', ref: 'ASSUMPTION' }), /ref required/);
});

test('readiness closure (FIN-2): zero investment, invalid rates, sign patterns and zero discount never give an indefensible number', () => {
  const zero = { ...BASE(), acquisition: { price: 1000000, payments: [{ t: 0, amount: 0 }] } };
  for (const r of [roi(zero), netRentalYield(zero), irr(zero), npv(zero)]) { assert.equal(r.status, 'UNAVAILABLE'); assert.equal(r.value, undefined); }
  assert.ok(checkInputs(zero).invalid.some(m => /total invested must be greater than 0/.test(m)));
  for (const bad of [{ rent: { gross_annual: 1, occupancy: -0.1, growth_rate: 0 } }, { tax: { rental_income_rate: 1.2, capital_gains_rate: 0 } }, { operating: { fixed_annual: -1, pct_of_collected_rent: 0 } }, { exit: { appreciation_rate: -0.95, selling_cost_rate: 0 } }, { discount: { rate: -1, basis: 'TEST-ONLY impossible discount rate' } }, { horizon_years: 0 }, { currency: 'try' }]) {
    const x = { ...BASE(), ...bad }; assert.notEqual(npv(x).status, 'OK', JSON.stringify(bad));
  }
  // negative-only flows: no IRR exists → UNAVAILABLE, never a number
  const loss = { ...BASE(), rent: { gross_annual: 0, occupancy: 0, growth_rate: 0 }, exit: { sale_price: 0, selling_cost_rate: 0 } };
  assert.equal(irr(loss).status, 'UNAVAILABLE'); assert.ok(roi(loss).value < 0, 'ROI of a total loss is reported as a loss');
  close(roi(loss).value, (-1040000 - 5000 * 5) / 1040000, 1e-12);
  // zero discount rate is allowed with a basis and equals the undiscounted sum
  const r0 = npv({ ...BASE(), discount: { rate: 0, basis: 'TEST-ONLY zero rate stated for the identity check' } });
  close(r0.value, cashFlows(BASE()).totals.net_cash_flow, 1e-9);
  // a basis is explicit in every NPV result
  assert.match(npv(BASE()).discount_basis, /TEST-ONLY/);
});

test('readiness closure (ANL-2): stale or future FX rows and silent currency mixing are refused', () => {
  const store = { collections: { evidence: [{ id: 'EVD-FX', value: 41.25, period: '2026-10-20' }, { id: 'EVD-FX2', value: 41.3, period: '2026-10-27' }, { id: 'EVD-FUT', value: 41.4, period: '2026-10-30' }] },
    private: { private_facts: [{ package_id: 'PKG', key: 'price_usd', value: 100000, currency: 'USD' }, { package_id: 'PKG', key: 'price_try', value: 4125000, currency: 'TRY' }] } };
  const A = (value) => ({ value, ref: 'ASSUMPTION', note: 'TEST-ONLY structural input for the check' });
  const fin = (price) => ({ currency: 'TRY', horizon_years: A(1), delivery_year: A(0), acquisition: { price, payments: [{ t: 0, amount: price }] } });
  const run = (doc) => checkAnalysis({ opportunity_id: 'OPP-X', as_of: '2026-10-28', ...doc }, store, 'OPP-X');
  assert.match(run({ fx: [{ base: 'USD', quote: 'TRY', rate: 41.25, date: '2026-10-20', source: 'CBRT', ref: 'EVD-FX' }] }).errors.join(' '), /8 days older than the analysis date \(CNV-1 maximum 7\)/);
  assert.match(run({ fx: [{ base: 'USD', quote: 'TRY', rate: 41.4, date: '2026-10-30', source: 'CBRT', ref: 'EVD-FUT' }] }).errors.join(' '), /after the analysis date/);
  // a USD price used in a TRY analysis: refused without an fx row, refused without a note, accepted with both
  const usd = { value: 4130000, ref: 'PRIVATE:PKG/price_usd' };
  assert.match(run({ finance: fin(usd) }).errors.join(' '), /is in USD, the analysis is in TRY; record the USD\/TRY rate/);
  const fx = [{ base: 'USD', quote: 'TRY', rate: 41.3, date: '2026-10-27', source: 'CBRT', ref: 'EVD-FX2' }];
  assert.match(run({ fx, finance: fin({ ...usd }) }).errors.join(' '), /differs from PRIVATE:PKG\/price_usd|add a note/);
  const noted = { ...usd, note: 'TEST-ONLY 100,000 USD × 41.30 (CBRT 27 Oct 2026, fx[0])' };
  assert.deepEqual(run({ fx, finance: fin(noted) }).errors, []);
  // same currency: no fx row needed
  assert.deepEqual(run({ finance: fin({ value: 4125000, ref: 'PRIVATE:PKG/price_try' }) }).errors, []);
});

test('FIN-1 cash flows match a hand calculation, year by year', () => {
  const cf = cashFlows(BASE()); assert.equal(cf.status, 'OK');
  // net rent after operating costs and 15% tax = 0.765 × collected − 4,250 (collected = 54,000 × 1.1^(t−1))
  const want = [-1040000, 37060, 41191, 45735.1, 50733.61, 56231.971 + 2488320 * 0.98];
  cf.rows.forEach((r, t) => close(r.cf, want[t]));
  close(cf.totals.invested, 1040000); close(cf.totals.exit.gross_sale, 2488320); close(cf.totals.exit.selling_costs, 49766.4);
});

test('ROI and net rental yield are separate, defined quantities (hand calculation)', () => {
  close(roi(BASE()).value, 1629505.281 / 1040000);
  const y = netRentalYield(BASE()); assert.equal(y.year, 1); close(y.value, 43600 / 1040000);
  assert.match(roi(BASE()).definition, /unlevered.*undiscounted/); assert.match(y.definition, /not annualised ROI/);
});

test('NPV equals an independent Horner evaluation, and textbook cases are exact', () => {
  const x = BASE(); const rows = cashFlows(x).rows;
  let h = 0; for (let t = rows.length - 1; t >= 0; t--) h = h / (1 + x.discount.rate) + rows[t].cf; // Σ CF_t/(1+r)^t, evaluated backwards
  close(npv(x).value, h, 1e-9);
  // invest 100 at t0, receive 110 at t1, r = 10% → NPV 0, ROI 10%
  const s = { currency: 'TRY', horizon_years: 1, delivery_year: 0, acquisition: { price: 100, payments: [{ t: 0, amount: 100 }] }, rent: { gross_annual: 0, occupancy: 0, growth_rate: 0 }, operating: { fixed_annual: 0, pct_of_collected_rent: 0 }, tax: { rental_income_rate: 0, capital_gains_rate: 0 }, exit: { sale_price: 110, selling_cost_rate: 0 }, discount: { rate: 0.10, basis: 'TEST-ONLY textbook case for discounting' } };
  close(npv(s).value, 0, 1e-12); close(roi(s).value, 0.10, 1e-12);
  // discount rate 0 → NPV equals the undiscounted net cash flow
  close(npv({ ...x, discount: { rate: 0, basis: 'TEST-ONLY zero rate identity check' } }).value, cashFlows(x).totals.net_cash_flow);
});

test('cash-flow timing: instalments, delivery delay and end-of-year discounting', () => {
  const x = { ...BASE(), delivery_year: 2, acquisition: { price: 1000000, payments: [{ t: 0, amount: 300000 }, { t: 1, amount: 400000 }, { t: 2, amount: 340000 }] } };
  const r = cashFlows(x).rows;
  assert.deepEqual(r.map(z => z.payments), [300000, 400000, 340000, 0, 0, 0]);
  assert.deepEqual(r.map(z => z.collected_rent > 0), [false, false, false, true, true, true], 'rent starts the year after delivery');
  close(r[3].collected_rent, 54000); // first rented year at the first-year rent level
  // moving the same payment later raises NPV by exactly the discounting difference
  const a = npv(BASE()).value; const later = npv({ ...BASE(), acquisition: { price: 1000000, payments: [{ t: 0, amount: 1000000 }, { t: 1, amount: 40000 }] } }).value;
  close(later - a, 40000 - 40000 / 1.08);
});

test('missing or unsupported inputs never produce a number', () => {
  const noRent = { ...BASE(), rent: null };
  for (const r of [roi(noRent), npv(noRent), netRentalYield(noRent)]) { assert.equal(r.status, 'UNAVAILABLE'); assert.ok(r.missing.includes('rent')); assert.equal(r.value, undefined); }
  const noBasis = { ...BASE(), discount: { rate: 0.08 } };
  assert.equal(roi(noBasis).status, 'OK', 'ROI does not need a discount rate');
  assert.equal(npv(noBasis).status, 'UNAVAILABLE'); assert.ok(npv(noBasis).missing.includes('discount.basis'));
  assert.equal(npv({ ...BASE(), discount: null }).status, 'UNAVAILABLE');
  assert.equal(roi({ ...BASE(), financing: { loan: 500000, rate: 0.3 } }).status, 'UNSUPPORTED');
  assert.ok(checkInputs({ ...BASE(), exit: { sale_price: 1, appreciation_rate: 0.1, selling_cost_rate: 0 } }).invalid.some(m => /not both/.test(m)));
  assert.ok(checkInputs({ ...BASE(), rent: { gross_annual: 60000, occupancy: 1.4, growth_rate: 0 } }).invalid.some(m => /occupancy/.test(m)));
  assert.ok(checkInputs({ ...BASE(), tax: { rental_income_rate: 0.15 } }).missing.includes('tax.capital_gains_rate'), 'a zero tax rate must be stated, not assumed');
});

test('scenarios: each computed from its own recorded inputs; an incomplete override is unavailable on its own', () => {
  const s = scenarios(BASE(), { adverse: { rent: { occupancy: 0.7 }, exit: { appreciation_rate: 0.05 } }, favourable: { rent: { growth_rate: 0.15 } }, broken: { rent: { occupancy: null } } }).scenarios;
  assert.equal(s.base.roi.status, 'OK'); close(s.base.roi.value, roi(BASE()).value);
  assert.equal(s.adverse.inputs.rent.gross_annual, 60000, 'overrides merge into the base inputs');
  assert.ok(s.adverse.roi.value < s.base.roi.value && s.favourable.roi.value > s.base.roi.value);
  close(s.adverse.roi.value, roi({ ...BASE(), rent: { ...BASE().rent, occupancy: 0.7 }, exit: { ...BASE().exit, appreciation_rate: 0.05 } }).value);
  assert.equal(s.broken.roi.status, 'UNAVAILABLE');
});

// ================================================================== conversions and Engine 4: comparables
const FX = [{ base: 'EUR', quote: 'TRY', rate: 40, date: '2026-10-20', source: 'TEST-ONLY central bank table' }, { base: 'USD', quote: 'TRY', rate: 34, date: '2026-09-01', source: 'TEST-ONLY old rate' }, { base: 'GBP', quote: 'TRY', rate: 45, date: '2026-10-30', source: 'TEST-ONLY future rate' }];
test('units and FX: exact area factor, dated rates only, inverse pairs, no stale or future rates', () => {
  close(convertArea(1000, 'sqft', 'm2').value, 92.90304, 1e-12); close(convertArea(1, 'm2', 'sqft').value, 1 / M2_PER_SQFT, 1e-12);
  assert.equal(convertArea(10, 'm2', 'acre').status, 'UNSUPPORTED');
  const m = convertMoney(100, 'EUR', 'TRY', FX, { asOf: '2026-10-25' }); close(m.value, 4000); assert.equal(m.source, 'TEST-ONLY central bank table');
  close(convertMoney(4000, 'TRY', 'EUR', FX, { asOf: '2026-10-25' }).value, 100);
  assert.equal(fxRate('USD', 'TRY', FX, { asOf: '2026-10-25' }).status, 'UNAVAILABLE', 'stale rate');
  assert.equal(fxRate('GBP', 'TRY', FX, { asOf: '2026-10-25' }).status, 'UNAVAILABLE', 'rate dated after the as-of date');
  assert.equal(fxRate('EUR', 'USD', FX, { asOf: '2026-10-25' }).status, 'UNAVAILABLE', 'no implicit cross rates');
});

const cand = (id, o = {}) => ({ id, evidence_id: `EVD-${id}`, price_type: 'TRANSACTION', price: 5000000, currency: 'TRY', area: 100, area_unit: 'm2', area_basis: 'NET', district_id: 'DST-A', unit_type: '2+1', observed_at: '2026-09-01', ...o });
const SUBJ = { currency: 'TRY', area_basis: 'NET', district_id: 'DST-A', unit_type: '2+1', as_of: '2026-10-25' };
const RULES = { price_type: 'TRANSACTION', max_age_days: 180, min_sample: 5 };
test('comparables: eligibility rules, conversions, exclusion reasons and statistics', () => {
  const cs = [cand('C1', { price: 4000000 }), cand('C2', { price: 4500000 }), cand('C3'), cand('C4', { price: 5500000 }),
    cand('C5', { price: 150000, currency: 'EUR', observed_at: '2026-10-20' }), // 150,000 × 40 / 100 = 60,000 TRY/m²
    cand('C6', { area: 1076.391041670972, area_unit: 'sqft' }), // exactly 100 m² → 50,000
    cand('X1', { price_type: 'ASKING' }), cand('X2', { area_basis: 'GROSS' }), cand('X3', { district_id: 'DST-B' }), cand('X4', { observed_at: '2025-01-01' }),
    cand('X5', { currency: 'USD', observed_at: '2026-10-01' }), cand('X6', { evidence_id: null }), cand('X7', { observed_at: '2026-11-01' })];
  const r = selectComparables(SUBJ, cs, RULES, FX);
  assert.equal(r.status, 'OK'); assert.equal(r.n, 6);
  const v = r.included.map(x => x.price_per_m2).sort((a, b) => a - b);
  for (const [a, b] of v.map((x, i) => [x, [40000, 45000, 50000, 50000, 55000, 60000][i]])) close(a, b);
  close(r.stats.median, 50000); close(r.stats.p25, 46250); close(r.stats.p75, 53750); // linear interpolation, hand-checked
  const why = Object.fromEntries(r.excluded.map(x => [x.id, x.reasons.join('; ')]));
  assert.match(why.X1, /price type ASKING/); assert.match(why.X2, /area basis GROSS/); assert.match(why.X3, /different district/);
  assert.match(why.X4, /older than 180 days/); assert.match(why.X5, /FX: no recorded USD\/TRY rate/); assert.match(why.X6, /no evidence reference/); assert.match(why.X7, /after the as-of date/);
  assert.equal(r.included.find(x => x.id === 'C5').fx.source, 'TEST-ONLY central bank table');
  assert.match(r.adjustments, /no adjustments/);
  close(quantile([1, 2, 3, 4], 0.5), 2.5);
});

test('comparables: too few eligible observations → INSUFFICIENT_SAMPLE and no statistics; missing rules → unavailable', () => {
  const r = selectComparables(SUBJ, [cand('C1'), cand('C2'), cand('C3'), cand('C4'), cand('X1', { price_type: 'ASKING' })], RULES, FX);
  assert.equal(r.status, 'INSUFFICIENT_SAMPLE'); assert.equal(r.n, 4); assert.equal(r.stats, null);
  assert.equal(selectComparables(SUBJ, [cand('C1')], { ...RULES, price_type: undefined }).status, 'UNAVAILABLE');
  assert.equal(selectComparables(SUBJ, [cand('C1')], { ...RULES, min_sample: 1 }).status, 'UNAVAILABLE', 'a sample of one is never a comparable set');
});

// ================================================================== Engine 7: investment fit (qualitative), ranking inactive
test('investment fit: explicit criteria only; missing data is never a match; no score; ranking refuses', () => {
  const opp = { investor_objective_tags: ['long_term_hold'], delivery_status: 'UNDER_CONSTRUCTION', expected_delivery: '2028-06', market_id: 'MKT-IST', risk_types: ['CONSTRUCTION_DELIVERY'], as_of: '2026-10-25' };
  let f = investmentFit({ objectives: ['long_term_hold'], market_ids: ['MKT-IST'], horizon_years: 3 }, opp);
  assert.equal(f.outcome, 'CRITERIA_MET'); assert.equal(f.score, undefined);
  f = investmentFit({ horizon_years: 1 }, opp); assert.equal(f.outcome, 'NOT_SUITABLE'); assert.match(f.criteria[0].reason, /20 months/);
  f = investmentFit({ budget: { max: 6000000, currency: 'TRY' } }, opp); assert.equal(f.outcome, 'INSUFFICIENT_DATA', 'no price evidence → cannot confirm, never a match');
  f = investmentFit({ budget: { max: 6000000, currency: 'TRY' } }, { ...opp, price: { min: 5000000, currency: 'TRY', evidence_id: 'PRIVATE:X/F-PRICE' } }); assert.equal(f.outcome, 'CRITERIA_MET');
  f = investmentFit({ budget: { max: 100000, currency: 'EUR' } }, { ...opp, price: { min: 5000000, currency: 'TRY', evidence_id: 'PRIVATE:X/F-PRICE' } }); assert.equal(f.criteria[0].result, 'CANNOT_CONFIRM');
  f = investmentFit({ excluded_risk_types: ['CONSTRUCTION_DELIVERY'] }, opp); assert.equal(f.outcome, 'NOT_SUITABLE');
  assert.equal(investmentFit({}, opp).status, 'UNAVAILABLE');
  assert.equal(rank().status, 'INACTIVE');
  // FIT-2: preferences never decide suitability; a hard criterion does; budget includes recorded costs and stays hard
  f = investmentFit({ delivery_statuses: ['OFF_PLAN'], preferences: ['delivery_status'] }, opp);
  assert.equal(f.outcome, 'CRITERIA_MET_WITH_DIFFERENCES'); assert.equal(f.criteria[0].result, 'DIFFERS_FROM_PREFERENCE'); assert.equal(f.criteria[0].kind, 'PREFERENCE');
  assert.equal(investmentFit({ delivery_statuses: ['OFF_PLAN'] }, opp).outcome, 'NOT_SUITABLE', 'the same criterion as a hard constraint');
  f = investmentFit({ budget: { max: 5100000, currency: 'TRY' }, preferences: ['budget'] }, { ...opp, price: { min: 5000000, costs: 200000, currency: 'TRY', evidence_id: 'PRIVATE:X/F-PRICE' } });
  assert.equal(f.outcome, 'NOT_SUITABLE', 'price within budget, price + costs outside → not suitable; budget cannot be made a preference');
  assert.match(f.criteria[0].reason, /\+ recorded acquisition costs 200000 = 5200000/);
  f = investmentFit({ objectives: ['income'], preferences: ['objective'], delivery_statuses: ['COMPLETED'] }, { ...opp, investor_objective_tags: [] });
  assert.equal(f.outcome, 'NOT_SUITABLE', 'an unknown preference does not hide a failed hard criterion');
});

// ================================================================== analysis handoff + Engine 8 decision report (end to end)
test('analysis handoff: every number needs provenance; findings need evidence; bad files are refused with reasons', () => {
  const s = publishedSetup({ exportIt: false });
  try {
    const store = { collections: Object.fromEntries(fs.readdirSync(path.join(s.store, 'data')).map(f => [f.replace('.json', ''), readJson(path.join(s.store, 'data', f)).records])), private: { private_facts: readJson(path.join(s.store, 'private/private_facts.json')) } };
    assert.ok(checkAnalysis(analysisDoc(), store, OPP).ok, JSON.stringify(checkAnalysis(analysisDoc(), store, OPP).errors));
    const bad = analysisDoc(); bad.finance.rent.gross_annual = 360000; bad.finance.tax.rental_income_rate = { value: 0.15, ref: 'ASSUMPTION' }; bad.finance.acquisition.price = { value: 1, ref: 'EVD-DOES-NOT-EXIST' };
    bad.findings.push({ type: 'STRENGTH', class: 'INTERPRETATION', text: 'Prime location.', refs: [] });
    bad.finance.acquisition.payments[0].amount = { value: 999, ref: 'PRIVATE:TEST-PKG-1/F-PRICE' };
    const e = checkAnalysis(bad, store, OPP).errors.join('\n');
    assert.match(e, /rent\.gross_annual: bare number 360000/); assert.match(e, /ASSUMPTION needs a written note/); assert.match(e, /EVD-DOES-NOT-EXIST" not found/); assert.match(e, /finding without evidence is not reported/); assert.match(e, /value 999 differs from PRIVATE:TEST-PKG-1\/F-PRICE \(1\); add a note/);
    assert.match(checkAnalysis(analysisDoc({ opportunity_id: 'OPP-OTHER' }), store, OPP).errors.join(), /≠/);
  } finally { s.cleanup(); }
});

test('decision report (end to end): private, traceable, runs only supported methods, and never reaches public data', () => {
  const s = publishedSetup();
  try {
    const before = deskSnap(s.repo);
    // a refused analysis writes nothing
    const badPath = path.join(s.store, 'bad-analysis.json'); const bad = analysisDoc(); bad.finance.rent.gross_annual = 360000; writeJson(badPath, bad);
    let r = cli(s.repo, ['report', ...s.S, '--id', OPP, '--analysis', badPath]);
    assert.equal(r.code, 1); assert.match(r.out, /analysis refused — nothing written/); assert.ok(!fs.existsSync(path.join(s.store, 'reports', `decision-${OPP}.md`)));
    // the default private location is used
    fs.mkdirSync(path.join(s.store, 'private/analysis'), { recursive: true }); writeJson(path.join(s.store, 'private/analysis', `${OPP}.json`), analysisDoc());
    r = cli(s.repo, ['report', ...s.S, '--id', OPP]); assert.equal(r.code, 0, r.out);
    const md = fs.readFileSync(path.join(s.store, 'reports', `decision-${OPP}.md`), 'utf8');
    const js = readJson(path.join(s.store, 'reports', `decision-${OPP}.json`));
    assert.match(md, /INTERNAL — not for publication/);
    for (const h of ['Overview', 'Facts and their evidence', 'Domain assessments', 'Findings', 'Risks', 'Conflicts and data gaps', 'Method eligibility', 'Financial scenarios', 'Comparables', 'Investment fit', 'Limitations', 'Next steps']) assert.match(md, new RegExp(`## \\d+\\. ${h}`), h);
    assert.equal(js.finance.scenarios.base.roi.status, 'OK'); assert.equal(js.finance.scenarios.adverse.roi.status, 'OK');
    assert.ok(js.finance.scenarios.adverse.roi.value < js.finance.scenarios.base.roi.value);
    close(js.finance.scenarios.base.npv.value, npv(js.finance.scenarios.base.inputs).value);
    assert.match(md, /Project identity confirmed in the title registry\. — EVD-TST-ILLUSTRATIVE-RESIDENCE-A-0001/);
    assert.match(md, /\$\.finance\.acquisition\.price = 7654321 — PRIVATE:TEST-PKG-1\/F-PRICE/);
    assert.match(md, /financial input\(s\) are assumptions, not evidence/);
    assert.match(md, /- IRR \(annual rate/); assert.match(md, /not an annual rate/);
    assert.match(md, /Real terms \(inflation 30\.00% a year/); assert.match(md, /Home-currency view: NOT RUN/);
    assert.equal(js.finance.scenarios.base.views.real.status, 'OK');
    assert.match(md, /M-COMPARABLES:\*\* NOT RUN — UNAVAILABLE: analysis\.comparables/);
    assert.match(md, /M-FAIR-VALUE, M-AREA-RANKING, M-ASSET-QUALITY, M-LIQUIDITY:\*\* INACTIVE/);
    assert.match(md, /M-RISK-SEVERITY:\*\* INACTIVE — methodology awaiting approval/); assert.match(md, /M-PRICE-POSITION:\*\* INACTIVE — methodology awaiting approval/);
    assert.equal(js.fit.outcome, 'CRITERIA_MET'); assert.equal(js.fit.criteria.length, 2);
    assert.doesNotMatch(md, /\bscore\b(?! or ranking)|\brank(ed|ing)? \d/i);
    for (const f of js.facts) for (const e of f.evidence) assert.ok(e.id && e.label, 'every fact cites its evidence');
    // nothing about the report, the private price or the analysis reached the public tree
    assert.deepEqual(deskSnap(s.repo), before, 'the report writes only to the private store');
    const all = fs.readdirSync(path.join(s.repo, 'desk'), { recursive: true }).map(String).filter(f => /\.(json|html|js)$/.test(f) && !f.startsWith('_')).map(f => fs.readFileSync(path.join(s.repo, 'desk', f), 'utf8')).join('\n');
    assert.doesNotMatch(all, /7654321|7,654,321|INTERNAL — not for publication|PRIVATE:TEST-PKG-1/i);
    assert.ok(pub(s.repo, 'opportunities').length === 1, 'publication state unchanged by the report');
  } finally { s.cleanup(); }
});

// ================================================================== PUB-2: public pages are decision-first and minimal
test('PUB-2: internal financial, pricing and fit methods are implemented and never public', () => {
  const reg = readJson(path.join(ROOT, 'desk/data/methods.json')).methods;
  for (const id of ['M-CASHFLOW', 'M-ROI', 'M-NPV', 'M-SCENARIOS', 'M-COMPARABLES', 'M-INVESTMENT-FIT']) {
    const m = reg.find(x => x.id === id); assert.equal(m.status, 'INACTIVE', id); assert.equal(m.internal, 'ACTIVE', id); assert.equal(m.publication, 'PROHIBITED_IN_MVP', id);
  }
});
test('PUB-2: no generated page shows market figures, gate details, legal-review topics or internal identifiers', () => {
  const reg = readJson(path.join(ROOT, 'desk/data/methods.json')).methods;
  const pages = fs.readdirSync(path.join(ROOT, 'desk'), { recursive: true }).map(String).filter(f => f.endsWith('.html') && !f.split(path.sep).some(x => x.startsWith('_')));
  // visible text only: method ids may appear in data attributes (they come from the public registry), never as copy
  // Owner instruction 28 Oct 2026: market pages carry an official overview (counts and changes) and buying rules, each
  // linked to its government source. Those two sections are the only exception; they are checked in site.test.mjs.
  const official = (h) => h.replace(/<section class="sec" aria-labelledby="(?:ov|ru)-h" data-market-(?:overview|rules)="[^"]+">[\s\S]*?<\/section>/g, '');
  const visible = (h) => official(h).replace(/<script[\s\S]*?<\/script>/g, '').replace(/<[^>]+>/g, ' ');
  const banned = [/\bMG-1\b/, /\bMGE-1\b/, /\b(?:FIN|CMP|CNV|FIT|RPT|OPC|ANL)-\d\b/, /Trakheesi|Madhmoun|yetki belgesi|brokerage authority/i, /\b(?:IST|DXB|AUH)-(?:AGENT|ONLINE|OFFPLAN)/, /\d[\d,.]*\s?%/];
  for (const f of pages) {
    const raw = fs.readFileSync(path.join(ROOT, 'desk', f), 'utf8'); const h = visible(raw);
    for (const re of banned) assert.doesNotMatch(h, re, `${f}: ${re}`);
    for (const m of reg) assert.ok(!h.includes(m.id), `${f}: method id ${m.id} in visible text`);
    assert.doesNotMatch(raw, /data-gate=|data-stat=|data-topic=/, `${f}: internal gate attributes`);
  }
  // no market or district research in the public tree (V22); sources named on the pages are names only
  for (const c of ['evidence', 'research_blocks', 'conflicts']) assert.ok(!readJson(path.join(ROOT, `desk/data/public/${c}.json`)).records.some(r => r.subject && ['market', 'district'].includes(r.subject.type)), c);
  for (const lang of ['', 'tr/', 'ar/']) {
    const ev = fs.readFileSync(path.join(ROOT, `desk/${lang}intelligence/index.html`), 'utf8');
    assert.match(ev, /data-split="public"/); assert.match(ev, /data-split="private"/);
    const mi = fs.readFileSync(path.join(ROOT, `desk/${lang}markets/index.html`), 'utf8');
    for (const id of ['MKT-IST', 'MKT-DXB', 'MKT-AUH']) assert.match(mi, new RegExp(`data-sources="${id}"`), `${lang}: sources of ${id}`);
    const mk = fs.readFileSync(path.join(ROOT, `desk/${lang}markets/dubai/index.html`), 'utf8');
    assert.match(mk, /data-market-status="preparing"/); assert.match(mk, /data-req="DXB-PROJECT-REGISTRATION"/);
    for (const page of [official(mk), mi, ev]) assert.doesNotMatch(page, /<a [^>]*href="https:\/\/(?!nexus-ways\.com|calendly)/, `${lang}: no outbound source links`);
  }
});

test('Markets & Intelligence (brief 28 Oct): statuses come from the market records and the method registry, in EN/TR/AR', () => {
  const reg = readJson(path.join(ROOT, 'desk/data/methods.json')).methods;
  const markets = readJson(path.join(ROOT, 'desk/data/public/markets.json')).records;
  for (const lang of ['', 'tr/', 'ar/']) {
    const mi = fs.readFileSync(path.join(ROOT, `desk/${lang}markets/index.html`), 'utf8');
    for (const m of markets) {
      const want = m.activation === 'ACTIVE' && m.gate_certificate && m.review ? 'open' : 'preparing';
      assert.match(mi, new RegExp(`data-market-card="${m.id}" data-market-status="${want}"`), `${lang}${m.id} card`);
      assert.match(mi, new RegExp(`data-gate-market="${m.id}" data-market-status="${want}"`), `${lang}${m.id} gate row`);
      assert.match(mi, new RegExp(`src="/desk/assets/img/markets/${m.slug}\\.svg" alt="[^"]{40,}"`), `${lang}${m.id} illustration with alt text`);
    }
    for (const n of [1, 2, 3]) assert.match(mi, new RegExp(`data-evidence-state="${n}"`));
    const ip = fs.readFileSync(path.join(ROOT, `desk/${lang}intelligence/index.html`), 'utf8');
    const got = Object.fromEntries([...ip.matchAll(/<details class="mth" data-method="([^"]+)" data-state="([^"]+)">/g)].map(m => [m[1], m[2]]));
    assert.deepEqual(got, Object.fromEntries(reg.map(m => [m.id, methodState(m)])), `${lang}intelligence: one card per registry method, with its registry state`);
    for (const m of reg.filter(x => ['M-FAIR-VALUE', 'M-AREA-RANKING', 'M-RISK-SEVERITY', 'M-LIQUIDITY', 'M-ASSET-QUALITY', 'M-YIELD-RETURNS'].includes(x.id))) assert.equal(got[m.id], 'inactive', `${m.id} never shown as active`);
    assert.match(ip, /<div class="mfilt" role="group"[^>]*hidden>/, 'the filter is hidden until its script runs (no inert controls)');
    assert.match(ip, /src="\/desk\/assets\/js\/intel\.js/);
    assert.doesNotMatch(ip, /Run analysis|Get (an )?investment recommendation/i);
  }
  // every registry method has its public text in all three languages, and nothing else is described
  for (const lang of ['en', 'tr', 'ar']) {
    assert.deepEqual(Object.keys(METHOD_TEXT[lang]).sort(), reg.map(m => m.id).sort(), `${lang}: method texts match the registry`);
    for (const [id, t] of Object.entries(METHOD_TEXT[lang])) { assert.equal(t.length, 4, id); assert.ok(t.every(x => typeof x === 'string' && x.length), id); }
  }
});
