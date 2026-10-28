// Engine 7 — Comparison & Investment Fit (method contract M-INVESTMENT-FIT, version FIT-1). Internal only.
// Fit is a list of explicit criteria checked one by one: MATCH, NO_MATCH or CANNOT_CONFIRM (data missing). There is no
// score, no weight and no ranking. Missing data is never a match. Asset quality is not part of fit.
// Ranking (M-AREA-RANKING and any opportunity ranking) is not implemented: rank() always refuses.

export const FIT_VERSION = 'FIT-1';

// profile: { objectives?: [tag], horizon_years?: n, delivery_statuses?: [OFF_PLAN|UNDER_CONSTRUCTION|COMPLETED],
//            market_ids?: [id], excluded_risk_types?: [type], budget?: { max, currency } }
// opp:     { investor_objective_tags: [], delivery_status, expected_delivery ('YYYY-MM'), market_id, risk_types: [],
//            price?: { min, currency, evidence_id } (private), as_of: 'YYYY-MM-DD' }
export function investmentFit(profile, opp) {
  const crit = [];
  const add = (key, result, reason) => crit.push({ criterion: key, result, reason });
  if (!profile || !opp) return { status: 'UNAVAILABLE', version: FIT_VERSION, criteria: [], missing: [!profile && 'profile', !opp && 'opportunity'].filter(Boolean) };
  if (profile.objectives && profile.objectives.length) {
    const tags = opp.investor_objective_tags || [];
    if (!tags.length) add('objective', 'CANNOT_CONFIRM', 'opportunity has no objective tags');
    else add('objective', profile.objectives.some(o => tags.includes(o)) ? 'MATCH' : 'NO_MATCH', `profile ${profile.objectives.join(', ')} vs opportunity ${tags.join(', ')}`);
  }
  if (profile.market_ids && profile.market_ids.length) add('market', profile.market_ids.includes(opp.market_id) ? 'MATCH' : 'NO_MATCH', `market ${opp.market_id}`);
  if (profile.delivery_statuses && profile.delivery_statuses.length) {
    if (!opp.delivery_status) add('delivery_status', 'CANNOT_CONFIRM', 'delivery status not recorded');
    else add('delivery_status', profile.delivery_statuses.includes(opp.delivery_status) ? 'MATCH' : 'NO_MATCH', opp.delivery_status);
  }
  if (Number.isInteger(profile.horizon_years)) {
    if (!/^\d{4}-\d{2}$/.test(opp.expected_delivery || '') || !/^\d{4}-\d{2}-\d{2}$/.test(opp.as_of || '')) add('horizon', 'CANNOT_CONFIRM', 'expected delivery or as-of date not recorded');
    else {
      const [y, m] = opp.expected_delivery.split('-').map(Number); const [ay, am] = opp.as_of.split('-').map(Number);
      const monthsToDelivery = (y - ay) * 12 + (m - am);
      add('horizon', monthsToDelivery <= profile.horizon_years * 12 ? 'MATCH' : 'NO_MATCH', `delivery in ${monthsToDelivery} months; horizon ${profile.horizon_years} years`);
    }
  }
  if (profile.excluded_risk_types && profile.excluded_risk_types.length) {
    const hit = (opp.risk_types || []).filter(r => profile.excluded_risk_types.includes(r));
    add('risk_exclusions', hit.length ? 'NO_MATCH' : (opp.risk_types ? 'MATCH' : 'CANNOT_CONFIRM'), hit.length ? `documented risk types excluded by the profile: ${hit.join(', ')}` : 'no excluded risk type documented');
  }
  if (profile.budget) {
    const p = opp.price;
    if (!p || typeof p.min !== 'number' || !p.evidence_id) add('budget', 'CANNOT_CONFIRM', 'no internal price evidence');
    else if (p.currency !== profile.budget.currency) add('budget', 'CANNOT_CONFIRM', `price in ${p.currency}, budget in ${profile.budget.currency}; convert with a recorded rate first`);
    else add('budget', p.min <= profile.budget.max ? 'MATCH' : 'NO_MATCH', `lowest recorded price ${p.min} ${p.currency} (evidence ${p.evidence_id})`);
  }
  if (!crit.length) return { status: 'UNAVAILABLE', version: FIT_VERSION, criteria: [], missing: ['at least one profile criterion'] };
  const outcome = crit.some(c => c.result === 'NO_MATCH') ? 'NOT_SUITABLE' : crit.some(c => c.result === 'CANNOT_CONFIRM') ? 'INSUFFICIENT_DATA' : 'CRITERIA_MET';
  return { status: 'OK', version: FIT_VERSION, outcome, criteria: crit, note: 'Qualitative criteria only; no score, weight or ranking.' };
}

export function rank() {
  return { status: 'INACTIVE', reason: 'Ranking has no approved method contract (weights, normalisation, missing-data rules); it is intentionally not implemented.' };
}
