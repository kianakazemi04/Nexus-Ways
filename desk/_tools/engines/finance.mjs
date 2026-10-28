// Engine 5 — Rental & Financial Scenario (method contracts M-CASHFLOW, M-ROI, M-NPV, M-SCENARIOS, M-RETURN-VIEWS; version FIN-2).
// Pure, deterministic functions: no I/O, no clock, no defaults for economic inputs. Missing or unsupported inputs return
// an UNAVAILABLE / UNSUPPORTED result listing what is missing — never a number built on an assumption nobody recorded.
// Internal use only: these outputs are never exported to public data (publication PROHIBITED_IN_MVP, decision D-03).
//
// Conventions (FIN-2; FIN-1 results are unchanged for whole-year payments)
//   Periods: whole years t = 0 … N (N = horizon_years). t = 0 is the valuation date; each later flow is at the END of
//   its year. All amounts are in one currency (`currency`); convert beforehand with units.mjs (explicit dated rates).
//   Acquisition: an explicit list of payments {t, amount, label} (price instalments, taxes and closing costs). The total
//   of these payments is the total invested capital. A payment may fall within a year (t in years, e.g. 0.25 = month 3):
//   it is discounted at its exact time and shown in the cash-flow row of the year that contains it. Unlevered: financing
//   is not supported.
//   Rent: earned in years delivery_year+1 … N. Gross rent in the first rented year is rent.gross_annual and grows by
//   rent.growth_rate per year. Collected rent = gross × occupancy.
//   Operating costs: fixed_annual + pct_of_collected_rent × collected rent, in rented years only.
//   Rental tax: rental_income_rate × max(0, collected rent − operating costs).
//   Exit: at the end of year N, at exit.sale_price, or price × (1 + appreciation_rate)^N where price = acquisition.price.
//   Selling costs = gross sale × selling_cost_rate. Capital-gains tax = capital_gains_rate × max(0, net sale − total
//   invested).
//   CF_t = −payments_t + (collected rent − operating costs − rental tax)_t + net exit proceeds (t = N).
// Definitions
//   ROI (total, unlevered, after the taxes listed, undiscounted, over the whole horizon) = Σ CF_t / total invested.
//   Net rental yield (first rented year) = (collected rent − operating costs) / total invested — before tax. It is a
//   different quantity from ROI and is reported separately; neither is annualised.
//   NPV = Σ_{t=0..N} CF_t / (1 + r)^t, with r = discount.rate (payments at their exact times). r must be given with a
//   written basis; it is never taken from a mortgage rate, an inflation rate or a default.
//   IRR (annual) = the rate at which NPV = 0, found by bisection. Refused (AMBIGUOUS) when the time-ordered flows change
//   sign more than once (several rates may solve it) and UNAVAILABLE when no rate in (−99%, 1000%) solves it.
// Views (M-RETURN-VIEWS, optional, each an explicit recorded input with a written basis)
//   Real terms: views.inflation = {rate, basis}. Real ROI = Σ CF_t/(1+π)^t ÷ Σ payments_t/(1+π)^t; real IRR =
//   (1 + IRR)/(1 + π) − 1. In a high-inflation currency the nominal ROI alone is misleading; read the real view.
//   Home currency: views.home_currency = {code, spot, annual_change, basis}, spot = units of the analysis currency per
//   1 unit of the home currency at t = 0, assumed path spot·(1+annual_change)^t. Each flow is converted at its time;
//   home ROI and home IRR are computed on the converted flows. The path is an assumption, never a forecast.

export const FIN_VERSION = 'FIN-2';
const isNum = (v) => typeof v === 'number' && Number.isFinite(v);
const isRate = (v, { min = 0, max = 1 } = {}) => isNum(v) && v >= min && v <= max;

// -> { ok: true, inputs } | { ok: false, status: 'UNAVAILABLE'|'UNSUPPORTED', missing: [], invalid: [] }
export function checkInputs(x, { needDiscount = false } = {}) {
  const missing = []; const invalid = [];
  const need = (path, v, test, why) => { if (v === undefined || v === null) missing.push(path); else if (!test(v)) invalid.push(`${path}: ${why}`); };
  if (!x || typeof x !== 'object') return { ok: false, status: 'UNAVAILABLE', missing: ['inputs'], invalid };
  if (x.financing !== undefined && x.financing !== null) return { ok: false, status: 'UNSUPPORTED', missing, invalid: ['financing: leverage is not supported in FIN-1'] };
  need('currency', x.currency, (v) => /^[A-Z]{3}$/.test(v), 'ISO 4217 code');
  need('horizon_years', x.horizon_years, (v) => Number.isInteger(v) && v >= 1 && v <= 50, 'integer 1–50');
  need('delivery_year', x.delivery_year, (v) => Number.isInteger(v) && v >= 0 && (!Number.isInteger(x.horizon_years) || v < x.horizon_years), 'integer, 0 ≤ delivery_year < horizon');
  const a = x.acquisition || {};
  need('acquisition.price', a.price, (v) => isNum(v) && v > 0, 'positive number');
  need('acquisition.payments', a.payments, (v) => Array.isArray(v) && v.length > 0, 'non-empty list');
  for (const [i, p] of (Array.isArray(a.payments) ? a.payments : []).entries()) {
    if (!p || !isNum(p.t) || p.t < 0 || (Number.isInteger(x.horizon_years) && p.t > x.horizon_years)) invalid.push(`acquisition.payments[${i}].t: time in years within the horizon (0 ≤ t ≤ N; decimals allowed)`);
    if (!p || !isNum(p.amount) || p.amount < 0) invalid.push(`acquisition.payments[${i}].amount: number ≥ 0`);
  }
  const r = x.rent;
  if (r === undefined || r === null) missing.push('rent');
  else {
    need('rent.gross_annual', r.gross_annual, (v) => isNum(v) && v >= 0, 'number ≥ 0');
    need('rent.occupancy', r.occupancy, (v) => isRate(v), 'between 0 and 1');
    need('rent.growth_rate', r.growth_rate, (v) => isRate(v, { min: -0.9, max: 10 }), 'decimal rate');
  }
  const o = x.operating || {};
  need('operating.fixed_annual', o.fixed_annual, (v) => isNum(v) && v >= 0, 'number ≥ 0');
  need('operating.pct_of_collected_rent', o.pct_of_collected_rent, (v) => isRate(v), 'between 0 and 1');
  const tx = x.tax || {};
  need('tax.rental_income_rate', tx.rental_income_rate, (v) => isRate(v), 'between 0 and 1');
  need('tax.capital_gains_rate', tx.capital_gains_rate, (v) => isRate(v), 'between 0 and 1');
  const e = x.exit || {};
  if ((e.sale_price === undefined || e.sale_price === null) && (e.appreciation_rate === undefined || e.appreciation_rate === null)) missing.push('exit.sale_price or exit.appreciation_rate');
  if (e.sale_price !== undefined && e.sale_price !== null && e.appreciation_rate !== undefined && e.appreciation_rate !== null) invalid.push('exit: give sale_price or appreciation_rate, not both');
  if (e.sale_price !== undefined && e.sale_price !== null && !(isNum(e.sale_price) && e.sale_price >= 0)) invalid.push('exit.sale_price: number ≥ 0');
  if (e.appreciation_rate !== undefined && e.appreciation_rate !== null && !isRate(e.appreciation_rate, { min: -0.9, max: 10 })) invalid.push('exit.appreciation_rate: decimal rate');
  need('exit.selling_cost_rate', e.selling_cost_rate, (v) => isRate(v), 'between 0 and 1');
  if (needDiscount) {
    const d = x.discount || {};
    need('discount.rate', d.rate, (v) => isRate(v, { min: -0.5, max: 5 }), 'decimal rate');
    need('discount.basis', d.basis, (v) => typeof v === 'string' && v.trim().length >= 10, 'written basis for the rate (at least a sentence)');
  }
  const v = x.views || {};
  if (v.inflation !== undefined && v.inflation !== null) {
    need('views.inflation.rate', v.inflation.rate, (q) => isRate(q, { min: -0.5, max: 5 }), 'decimal rate');
    need('views.inflation.basis', v.inflation.basis, (q) => typeof q === 'string' && q.trim().length >= 10, 'written basis (index, period, source)');
  }
  if (v.home_currency !== undefined && v.home_currency !== null) {
    const h = v.home_currency;
    need('views.home_currency.code', h.code, (q) => /^[A-Z]{3}$/.test(q) && q !== x.currency, 'ISO 4217 code different from the analysis currency');
    need('views.home_currency.spot', h.spot, (q) => isNum(q) && q > 0, 'positive rate (analysis currency per 1 home unit)');
    need('views.home_currency.annual_change', h.annual_change, (q) => isRate(q, { min: -0.9, max: 10 }), 'decimal rate (0 = constant rate)');
    need('views.home_currency.basis', h.basis, (q) => typeof q === 'string' && q.trim().length >= 10, 'written basis (rate source and date, path assumption)');
  }
  if (missing.length || invalid.length) return { ok: false, status: 'UNAVAILABLE', missing, invalid };
  return { ok: true, inputs: x };
}

// Cash-flow table. -> { status: 'OK', currency, rows: [{t, payments, collected_rent, operating, rental_tax, exit_net, cf}], totals } | unavailable
export function cashFlows(x) {
  const c = checkInputs(x); if (!c.ok) return { status: c.status, missing: c.missing, invalid: c.invalid, version: FIN_VERSION };
  const N = x.horizon_years; const d = x.delivery_year;
  const pay = Array(N + 1).fill(0); for (const p of x.acquisition.payments) pay[Math.ceil(p.t - 1e-9)] += p.amount; // row of the year containing t
  const invested = pay.reduce((s, v) => s + v, 0);
  const grossSale = x.exit.sale_price ?? x.acquisition.price * Math.pow(1 + x.exit.appreciation_rate, N);
  const selling = grossSale * x.exit.selling_cost_rate;
  const exit = { gross_sale: grossSale, selling_costs: selling, capital_gains_tax: x.tax.capital_gains_rate * Math.max(0, grossSale - selling - invested) };
  exit.net = exit.gross_sale - exit.selling_costs - exit.capital_gains_tax;
  const rows = [];
  for (let t = 0; t <= N; t++) {
    const rented = t >= d + 1;
    const gross = rented ? x.rent.gross_annual * Math.pow(1 + x.rent.growth_rate, t - d - 1) : 0;
    const collected = gross * x.rent.occupancy;
    const operating = rented ? x.operating.fixed_annual + x.operating.pct_of_collected_rent * collected : 0;
    const rentalTax = x.tax.rental_income_rate * Math.max(0, collected - operating);
    const exitNet = t === N ? exit.net : 0;
    const cf = -pay[t] + collected - operating - rentalTax + exitNet;
    rows.push({ t, payments: pay[t], gross_rent: gross, collected_rent: collected, operating, rental_tax: rentalTax, exit_net: exitNet, cf });
  }
  return { status: 'OK', version: FIN_VERSION, currency: x.currency, rows, totals: { invested, net_cash_flow: rows.reduce((s, r) => s + r.cf, 0), exit } };
}

export function roi(x) {
  const cf = cashFlows(x); if (cf.status !== 'OK') return cf;
  return { status: 'OK', version: FIN_VERSION, metric: 'ROI', definition: 'total, unlevered, after rental and capital-gains tax, undiscounted, over the horizon', currency: x.currency, horizon_years: x.horizon_years, value: cf.totals.net_cash_flow / cf.totals.invested };
}

export function netRentalYield(x) {
  const cf = cashFlows(x); if (cf.status !== 'OK') return cf;
  const first = cf.rows.find(r => r.t === x.delivery_year + 1);
  return { status: 'OK', version: FIN_VERSION, metric: 'NET_RENTAL_YIELD_FIRST_RENTED_YEAR', definition: '(collected rent − operating costs) in the first rented year / total invested; before tax; not annualised ROI', year: first.t, value: (first.collected_rent - first.operating) / cf.totals.invested };
}

// Every flow at its exact time: operating and exit flows at year ends, payments at their own t.
export function timedFlows(x) {
  const cf = cashFlows(x); if (cf.status !== 'OK') return cf;
  const flows = cf.rows.map(r => ({ t: r.t, amount: r.cf + r.payments })).filter(f => f.amount !== 0);
  for (const p of x.acquisition.payments) if (p.amount) flows.push({ t: p.t, amount: -p.amount });
  flows.sort((a, b) => a.t - b.t);
  return { status: 'OK', flows, cf };
}
const pvAt = (flows, r) => flows.reduce((s, f) => s + f.amount / Math.pow(1 + r, f.t), 0);

export function npv(x) {
  const c = checkInputs(x, { needDiscount: true }); if (!c.ok) return { status: c.status, missing: c.missing, invalid: c.invalid, version: FIN_VERSION };
  const r = x.discount.rate;
  const value = pvAt(timedFlows(x).flows, r);
  return { status: 'OK', version: FIN_VERSION, metric: 'NPV', definition: 'Σ CF_t / (1+r)^t, end-of-year operating and exit flows, payments at their exact times, t = 0 undiscounted', currency: x.currency, discount_rate: r, discount_basis: x.discount.basis, value };
}

// Annual internal rate of return of a list of timed flows; refuses when the answer is not unique or does not exist.
export function irrOf(flows) {
  const nz = flows.filter(f => f.amount !== 0);
  if (!nz.some(f => f.amount < 0) || !nz.some(f => f.amount > 0)) return { status: 'UNAVAILABLE', reason: 'flows need at least one outflow and one inflow' };
  let changes = 0; for (let i = 1; i < nz.length; i++) if (Math.sign(nz[i].amount) !== Math.sign(nz[i - 1].amount)) changes++;
  if (changes > 1) return { status: 'AMBIGUOUS', reason: `cash flows change sign ${changes} times; more than one rate can solve NPV = 0, so no single IRR is reported` };
  let lo = -0.99, hi = 10; let flo = pvAt(nz, lo), fhi = pvAt(nz, hi);
  if (Math.sign(flo) === Math.sign(fhi)) return { status: 'UNAVAILABLE', reason: 'no rate between −99% and 1000% gives NPV = 0' };
  for (let k = 0; k < 200; k++) { const mid = (lo + hi) / 2; const fm = pvAt(nz, mid); if (Math.sign(fm) === Math.sign(flo)) { lo = mid; flo = fm; } else { hi = mid; fhi = fm; } if (hi - lo < 1e-12) break; }
  return { status: 'OK', value: (lo + hi) / 2 };
}

export function irr(x) {
  const c = checkInputs(x); if (!c.ok) return { status: c.status, missing: c.missing, invalid: c.invalid, version: FIN_VERSION };
  const r = irrOf(timedFlows(x).flows);
  return { ...r, version: FIN_VERSION, metric: 'IRR', definition: 'annual rate at which NPV = 0 (nominal, in the analysis currency); unlevered', currency: x.currency };
}

// Real-terms and home-currency views (M-RETURN-VIEWS). Each view needs its own recorded inputs; absent → not run.
export function returnViews(x) {
  const c = checkInputs(x); if (!c.ok) return { status: c.status, missing: c.missing, invalid: c.invalid, version: FIN_VERSION };
  const v = x.views || {}; const { flows } = timedFlows(x); const out = { status: 'OK', version: FIN_VERSION };
  const paid = (fl) => -fl.filter(f => f.amount < 0).reduce((s, f) => s + f.amount, 0);
  const nominalIrr = irrOf(flows);
  if (v.inflation) {
    const pi = v.inflation.rate; const real = flows.map(f => ({ t: f.t, amount: f.amount / Math.pow(1 + pi, f.t) }));
    out.real = { status: 'OK', inflation_rate: pi, basis: v.inflation.basis, roi: real.reduce((s, f) => s + f.amount, 0) / paid(real),
      irr: nominalIrr.status === 'OK' ? { status: 'OK', value: (1 + nominalIrr.value) / (1 + pi) - 1 } : nominalIrr,
      definition: 'flows deflated by (1+π)^t; real ROI = Σ deflated flows / Σ deflated payments; real IRR = (1+IRR)/(1+π) − 1' };
  } else out.real = { status: 'NOT RUN', missing: ['views.inflation'] };
  if (v.home_currency) {
    const h = v.home_currency; const home = flows.map(f => ({ t: f.t, amount: f.amount / (h.spot * Math.pow(1 + h.annual_change, f.t)) }));
    out.home = { status: 'OK', currency: h.code, spot: h.spot, annual_change: h.annual_change, basis: h.basis, invested: paid(home), net: home.reduce((s, f) => s + f.amount, 0),
      roi: home.reduce((s, f) => s + f.amount, 0) / paid(home), irr: irrOf(home),
      definition: `each flow converted at spot·(1+annual_change)^t ${x.currency} per ${h.code}; ROI and IRR on the converted flows` };
  } else out.home = { status: 'NOT RUN', missing: ['views.home_currency'] };
  return out;
}

// Deep merge for scenario overrides (objects merged key by key; arrays and scalars replaced).
export function mergeInputs(base, over) {
  if (over === undefined) return base;
  if (over === null || typeof over !== 'object' || Array.isArray(over) || base === null || typeof base !== 'object' || Array.isArray(base)) return over;
  const out = { ...base }; for (const [k, v] of Object.entries(over)) out[k] = mergeInputs(base[k], v); return out;
}

// Scenarios: base plus named overrides (e.g. favourable, adverse). Each scenario is computed from its own complete,
// recorded inputs; a scenario missing an input is UNAVAILABLE on its own.
export function scenarios(base, overrides = {}) {
  const out = {};
  for (const [name, over] of [['base', undefined], ...Object.entries(overrides)]) {
    const inputs = mergeInputs(base, over);
    const r = roi(inputs); const n = npv(inputs); const y = netRentalYield(inputs);
    out[name] = { inputs, overrides: over ?? null, roi: r, npv: n, irr: irr(inputs), views: returnViews(inputs), net_rental_yield: y, cash_flows: cashFlows(inputs) };
  }
  return { version: FIN_VERSION, currency: base && base.currency, scenarios: out };
}
