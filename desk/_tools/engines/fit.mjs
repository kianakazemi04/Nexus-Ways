// Engine 7 — Comparison & Investment Fit (method contract M-INVESTMENT-FIT, version FIT-2). Internal only.
// Fit is a list of explicit criteria checked one by one: MATCH, NO_MATCH or CANNOT_CONFIRM (data missing). There is no
// score, no weight and no ranking. Missing data is never a match. Asset quality is not part of fit.
// FIT-2 (audit C-06): each criterion is a HARD constraint unless the profile lists it in `preferences`. A preference
// that is not met is reported as DIFFERS_FROM_PREFERENCE and never makes the opportunity NOT_SUITABLE on its own.
// Budget is always a hard constraint; the budget check uses the lowest recorded price plus any recorded acquisition
// costs (profile.budget.includes_costs), so a price inside the budget with costs outside it is not a match.
// Ranking (M-AREA-RANKING and any opportunity ranking) is not implemented: rank() always refuses.

export const FIT_VERSION = 'FIT-2';

// profile: { objectives?: [tag], horizon_years?: n, delivery_statuses?: [OFF_PLAN|UNDER_CONSTRUCTION|COMPLETED],
//            market_ids?: [id], excluded_risk_types?: [type], budget?: { max, currency },
//            preferences?: ['objective'|'market'|'delivery_status'|'horizon'|'risk_exclusions'] }  (soft criteria)
// opp:     { investor_objective_tags: [], delivery_status, expected_delivery ('YYYY-MM'), market_id, risk_types: [],
//            price?: { min, currency, evidence_id, costs? } (private; costs = recorded acquisition costs), as_of }
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
    else {
      const costs = typeof p.costs === 'number' ? p.costs : 0;
      const total = p.min + costs;
      add('budget', total <= profile.budget.max ? 'MATCH' : 'NO_MATCH', `lowest recorded price ${p.min}${costs ? ` + recorded acquisition costs ${costs}` : ' (no acquisition costs recorded)'} = ${total} ${p.currency} vs budget ${profile.budget.max} (evidence ${p.evidence_id})`);
    }
  }
  if (!crit.length) return { status: 'UNAVAILABLE', version: FIT_VERSION, criteria: [], missing: ['at least one profile criterion'] };
  const soft = new Set((profile.preferences || []).filter(k => k !== 'budget'));
  for (const c of crit) { c.kind = soft.has(c.criterion) ? 'PREFERENCE' : 'HARD'; if (c.kind === 'PREFERENCE' && c.result === 'NO_MATCH') c.result = 'DIFFERS_FROM_PREFERENCE'; }
  const hardFail = crit.some(c => c.result === 'NO_MATCH');
  const unknown = crit.some(c => c.result === 'CANNOT_CONFIRM' && c.kind === 'HARD');
  const differs = crit.some(c => c.result === 'DIFFERS_FROM_PREFERENCE');
  const outcome = hardFail ? 'NOT_SUITABLE' : unknown ? 'INSUFFICIENT_DATA' : differs ? 'CRITERIA_MET_WITH_DIFFERENCES' : 'CRITERIA_MET';
  return { status: 'OK', version: FIT_VERSION, outcome, criteria: crit, note: 'Qualitative criteria only; no score, weight or ranking. HARD criteria decide suitability; PREFERENCE criteria are reported, never decisive.' };
}

export function rank() {
  return { status: 'INACTIVE', reason: 'Ranking has no approved method contract (weights, normalisation, missing-data rules); it is intentionally not implemented.' };
}
