// Engine 6 — Liquidity & exit review (method contract M-EXIT-REVIEW, version EXR-1). Internal only. Qualitative.
// Lists what the evidence says about the ability to resell or let, and what is missing. It produces NO liquidity rating,
// time-to-sell or discount estimate (M-LIQUIDITY stays inactive): market transaction counts describe activity depth,
// not the liquidity of a specific unit, and are reported as context only.
export const EXR_VERSION = 'EXR-1';
const same = (a, b) => a && b && a.type === b.type && a.id === b.id;
// what a liquidity statement would need; each is DATA NOT AVAILABLE unless private observations exist
const NEEDED = [
  ['RESALE_TRANSACTIONS', 'Resale transactions of comparable completed units in the same project or district (registry or broker records)'],
  ['TIME_ON_MARKET', 'Time on market / time to sell for comparable units'],
  ['RESALE_DISCOUNT', 'Resale price relative to developer launch price for delivered projects of the same developer'],
  ['RENTAL_ABSORPTION', 'Rental demand: time to let and vacancy for comparable units']
];

// ctx: { collections, subjects: [{type, id}], marketId, privateFacts: [] }
export function exitReview({ collections, subjects, marketId, privateFacts = [] }) {
  const C = (k) => (collections && collections[k]) || [];
  const mine = (x) => subjects.some(s => same(x.subject, s));
  const weakening = []; const supporting = []; const context = [];
  for (const r of C('risks').filter(mine)) {
    if (['LIQUIDITY_EXIT', 'CURRENCY_FX', 'MARKET'].includes(r.risk_type)) weakening.push({ ref: r.id, type: r.risk_type, text: (r.title && r.title.en) || r.id, evidence: r.evidence_ids || [] });
  }
  for (const b of C('research_blocks').filter(x => x.domain === 'LIQUIDITY' && (mine(x) || same(x.subject, { type: 'market', id: marketId })))) {
    (b.research_closure === 'YES' ? supporting : context).push({ ref: b.id, text: `Liquidity research block on ${b.subject.type} ${b.subject.id}: closure ${b.research_closure}, completeness ${b.data_completeness}` });
  }
  for (const e of C('evidence').filter(x => same(x.subject, { type: 'market', id: marketId }) && /SALES|TX|FOREIGN/.test(x.topic || ''))) {
    context.push({ ref: e.id, text: `Market activity (${e.topic}, ${e.period}): ${e.value} ${e.unit} — ${e.verification_status}; activity depth, not unit liquidity` });
  }
  const priv = privateFacts.filter(f => f.domain === 'LIQUIDITY');
  const notAvailable = []; const available = [];
  for (const [key, text] of NEEDED) {
    const got = priv.filter(f => f.key === key || f.liquidity_kind === key);
    if (got.length) available.push({ key, text, observations: got.length });
    else notAvailable.push({ key, text, state: 'DATA NOT AVAILABLE' });
  }
  return {
    status: 'OK', version: EXR_VERSION, supporting, weakening, context, available, not_available: notAvailable,
    statement: notAvailable.length === NEEDED.length
      ? 'Exit and liquidity cannot be assessed: no resale, time-on-market, resale-discount or rental-absorption evidence is recorded. Only market activity context and documented risks are available.'
      : `Partial evidence: ${available.map(a => a.key).join(', ')} recorded; ${notAvailable.map(a => a.key).join(', ') || 'nothing'} missing. No liquidity estimate is produced.`,
    note: 'Qualitative only; no numeric liquidity rating, time-to-sell or discount estimate (M-LIQUIDITY inactive).'
  };
}
