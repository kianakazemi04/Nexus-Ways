// Currency and unit conversion (method contract M-CONVERSION, version CNV-1). Pure and deterministic.
// FX: only explicit, dated rates from a recorded table are used — no live rates, no cross rates computed implicitly,
// no rate after the as-of date, no rate older than maxAgeDays. Each conversion returns the rate, date and source used.
// Area: square metres and square feet only (1 ft² = 0.09290304 m², exact by definition). Gross and net area are never
// converted into each other: that needs a documented building-specific ratio, which CNV-1 does not support.

export const CNV_VERSION = 'CNV-1';
export const M2_PER_SQFT = 0.09290304;
const DAY = 86400000;
const iso = (s) => typeof s === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(s) && !Number.isNaN(Date.parse(s + 'T00:00:00Z'));
const days = (a, b) => Math.round((Date.parse(b + 'T00:00:00Z') - Date.parse(a + 'T00:00:00Z')) / DAY);

export function convertArea(value, from, to) {
  if (typeof value !== 'number' || !Number.isFinite(value) || value < 0) return { status: 'UNAVAILABLE', reason: 'area must be a number ≥ 0' };
  const f = { m2: 1, sqft: M2_PER_SQFT };
  if (!(from in f) || !(to in f)) return { status: 'UNSUPPORTED', reason: `area unit ${from} → ${to} not supported (m2, sqft)` };
  return { status: 'OK', value: value * f[from] / f[to] };
}

// fxTable: [{ base: 'EUR', quote: 'TRY', rate: <quote per 1 base>, date: 'YYYY-MM-DD', source: '…' }]
export function fxRate(from, to, fxTable, { asOf, maxAgeDays = 7 } = {}) {
  if (from === to) return { status: 'OK', rate: 1, date: asOf || null, source: 'same currency' };
  if (!iso(asOf)) return { status: 'UNAVAILABLE', reason: 'asOf date required' };
  const cands = [];
  for (const r of fxTable || []) {
    if (!r || typeof r.rate !== 'number' || !(r.rate > 0) || !iso(r.date) || !r.source) continue;
    if (r.date > asOf || days(r.date, asOf) > maxAgeDays) continue;
    if (r.base === from && r.quote === to) cands.push({ rate: r.rate, date: r.date, source: r.source, inverted: false });
    else if (r.base === to && r.quote === from) cands.push({ rate: 1 / r.rate, date: r.date, source: r.source, inverted: true });
  }
  if (!cands.length) return { status: 'UNAVAILABLE', reason: `no recorded ${from}/${to} rate within ${maxAgeDays} days on or before ${asOf}` };
  cands.sort((a, b) => b.date.localeCompare(a.date));
  return { status: 'OK', ...cands[0] };
}

export function convertMoney(amount, from, to, fxTable, opts) {
  if (typeof amount !== 'number' || !Number.isFinite(amount)) return { status: 'UNAVAILABLE', reason: 'amount must be a number' };
  const r = fxRate(from, to, fxTable, opts); if (r.status !== 'OK') return r;
  return { status: 'OK', value: amount * r.rate, rate: r.rate, date: r.date, source: r.source, inverted: r.inverted || false };
}
