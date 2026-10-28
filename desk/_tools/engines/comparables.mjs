// Engine 4 — Pricing & Comparable Analysis (method contract M-COMPARABLES, version CMP-1). Internal only.
// Selects comparable price observations for a subject and summarises price per square metre. It never adjusts prices,
// never produces a fair value (M-FAIR-VALUE stays inactive) and never mixes price types (asking, transaction, valuation).
// Every exclusion is listed with its reason. Fewer eligible observations than rules.min_sample → INSUFFICIENT_SAMPLE
// and no statistics at all.
import { convertArea, convertMoney } from './units.mjs';

export const CMP_VERSION = 'CMP-1';
export const PRICE_TYPES = ['ASKING', 'TRANSACTION', 'VALUATION'];
const iso = (s) => typeof s === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(s);
const days = (a, b) => Math.round((Date.parse(b + 'T00:00:00Z') - Date.parse(a + 'T00:00:00Z')) / 86400000);

// linear interpolation between closest ranks (type 7, as in common spreadsheet PERCENTILE)
export function quantile(sorted, q) {
  if (!sorted.length) return null;
  const h = (sorted.length - 1) * q; const lo = Math.floor(h); const hi = Math.ceil(h);
  return sorted[lo] + (h - lo) * (sorted[hi] - sorted[lo]);
}

// subject: { currency, area_basis: 'GROSS'|'NET', district_id, unit_type?, as_of }
// candidates: [{ id, evidence_id, price_type, price, currency, area, area_unit: 'm2'|'sqft', area_basis, district_id, unit_type, observed_at }]
// rules: { price_type, max_age_days, min_sample, same_district = true, same_unit_type = false }
export function selectComparables(subject, candidates, rules, fxTable = []) {
  const missing = [];
  if (!subject || !/^[A-Z]{3}$/.test(subject.currency || '')) missing.push('subject.currency');
  if (!subject || !['GROSS', 'NET'].includes(subject.area_basis)) missing.push('subject.area_basis');
  if (!subject || !iso(subject.as_of)) missing.push('subject.as_of');
  if (!rules || !PRICE_TYPES.includes(rules.price_type)) missing.push('rules.price_type');
  if (!rules || !Number.isInteger(rules.max_age_days) || rules.max_age_days < 1) missing.push('rules.max_age_days');
  if (!rules || !Number.isInteger(rules.min_sample) || rules.min_sample < 3) missing.push('rules.min_sample (integer ≥ 3)');
  if (missing.length) return { status: 'UNAVAILABLE', version: CMP_VERSION, missing };
  const sameDistrict = rules.same_district !== false;
  if (sameDistrict && !subject.district_id) return { status: 'UNAVAILABLE', version: CMP_VERSION, missing: ['subject.district_id'] };
  const included = []; const excluded = [];
  for (const c of candidates || []) {
    const why = [];
    if (!c || !c.id) { excluded.push({ id: null, reasons: ['no id'] }); continue; }
    if (!c.evidence_id) why.push('no evidence reference');
    if (c.price_type !== rules.price_type) why.push(`price type ${c.price_type || 'missing'} ≠ ${rules.price_type}`);
    if (!(typeof c.price === 'number' && c.price > 0)) why.push('price missing');
    if (!(typeof c.area === 'number' && c.area > 0)) why.push('area missing');
    if (c.area_basis !== subject.area_basis) why.push(`area basis ${c.area_basis || 'not stated'} ≠ ${subject.area_basis}`);
    if (sameDistrict && c.district_id !== subject.district_id) why.push('different district');
    if (rules.same_unit_type && subject.unit_type && c.unit_type !== subject.unit_type) why.push('different unit type');
    if (!iso(c.observed_at)) why.push('no observation date');
    else if (c.observed_at > subject.as_of) why.push('observed after the as-of date');
    else if (days(c.observed_at, subject.as_of) > rules.max_age_days) why.push(`older than ${rules.max_age_days} days`);
    let ppm2 = null; let fx = null;
    if (!why.length) {
      const a = convertArea(c.area, c.area_unit || 'm2', 'm2');
      const m = convertMoney(c.price, c.currency, subject.currency, fxTable, { asOf: c.observed_at, maxAgeDays: rules.fx_max_age_days ?? 7 });
      if (a.status !== 'OK') why.push(a.reason);
      if (m.status !== 'OK') why.push(`FX: ${m.reason}`);
      if (a.status === 'OK' && m.status === 'OK') { ppm2 = m.value / a.value; fx = c.currency === subject.currency ? null : { rate: m.rate, date: m.date, source: m.source }; }
    }
    if (why.length) excluded.push({ id: c.id, reasons: why }); else included.push({ id: c.id, evidence_id: c.evidence_id, price_per_m2: ppm2, fx });
  }
  const base = { version: CMP_VERSION, price_type: rules.price_type, currency: subject.currency, area_basis: subject.area_basis, n: included.length, min_sample: rules.min_sample, included, excluded, adjustments: 'none (CMP-1 applies no adjustments)' };
  if (included.length < rules.min_sample) return { status: 'INSUFFICIENT_SAMPLE', ...base, stats: null };
  const v = included.map(x => x.price_per_m2).sort((a, b) => a - b);
  return { status: 'OK', ...base, stats: { median: quantile(v, 0.5), p25: quantile(v, 0.25), p75: quantile(v, 0.75), min: v[0], max: v[v.length - 1] } };
}
