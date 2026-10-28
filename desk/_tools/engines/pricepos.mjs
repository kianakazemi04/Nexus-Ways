// Engine 4 — Price position (method contract M-PRICE-POSITION, version PPO-1). Internal only.
// Places the subject's asking price per m² within the comparable range produced by CMP-1 (same price type, same area
// basis, same currency, unadjusted). It answers "where does this price sit against what we observed?", not "what is this
// unit worth?": it is never a valuation and never a fair value (M-FAIR-VALUE stays inactive; a valuation needs a licensed
// valuer). No result without an OK comparables summary and an evidenced subject price and area.
export const PPO_VERSION = 'PPO-1';

// Bands, in order. Boundaries are the interquartile range and the median of the eligible comparables.
export const BANDS = ['BELOW_RANGE', 'LOWER_HALF', 'UPPER_HALF', 'ABOVE_RANGE'];

// subject: { price: {value, ref}, area_m2: {value, ref}, currency, area_basis }  (price = total asking price of the unit)
// comparables: the result of selectComparables (CMP-1)
export function pricePosition(subject, comparables) {
  const missing = [];
  const okNum = (x) => x && typeof x.value === 'number' && x.value > 0 && typeof x.ref === 'string' && x.ref.length > 0;
  if (!subject || !okNum(subject.price)) missing.push('price_position.price {value, ref}');
  if (!subject || !okNum(subject.area_m2)) missing.push('price_position.area_m2 {value, ref}');
  if (!subject || !/^[A-Z]{3}$/.test(subject.currency || '')) missing.push('price_position.currency');
  if (!subject || !['GROSS', 'NET'].includes(subject.area_basis)) missing.push('price_position.area_basis');
  if (missing.length) return { status: 'UNAVAILABLE', version: PPO_VERSION, missing };
  if (!comparables || comparables.status !== 'OK') return { status: 'UNAVAILABLE', version: PPO_VERSION, missing: [`comparables ${comparables ? comparables.status : 'not run'}`] };
  if (comparables.currency !== subject.currency) return { status: 'UNAVAILABLE', version: PPO_VERSION, missing: [`currency ${subject.currency} ≠ comparables ${comparables.currency}`] };
  if (comparables.area_basis !== subject.area_basis) return { status: 'UNAVAILABLE', version: PPO_VERSION, missing: [`area basis ${subject.area_basis} ≠ comparables ${comparables.area_basis}`] };
  const ppm2 = subject.price.value / subject.area_m2.value;
  const { median, p25, p75 } = comparables.stats;
  const band = ppm2 < p25 ? 'BELOW_RANGE' : ppm2 <= median ? 'LOWER_HALF' : ppm2 <= p75 ? 'UPPER_HALF' : 'ABOVE_RANGE';
  const values = comparables.included.map(x => x.price_per_m2);
  const below = values.filter(v => v < ppm2).length;
  return {
    status: 'OK', version: PPO_VERSION, price_type: comparables.price_type, currency: subject.currency, area_basis: subject.area_basis,
    subject_price_per_m2: ppm2, refs: [subject.price.ref, subject.area_m2.ref],
    median, p25, p75, n: comparables.n, band,
    vs_median: (ppm2 - median) / median,
    share_of_comparables_below: below / values.length,
    note: `Position within ${comparables.n} unadjusted ${comparables.price_type} observations (CMP-1). Not a valuation and not a fair value.`
  };
}
