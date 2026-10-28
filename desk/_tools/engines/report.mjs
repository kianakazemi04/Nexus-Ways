// Engine 8 — Recommendation & Decision Report (method contract M-DECISION-REPORT, version RPT-1). Internal only.
// Assembles, for one opportunity, everything the other engines can support and nothing they cannot:
//   overview · evidence-backed facts (fact vs qualified claim) · domain assessments (Engines 2–3: evidence and research
//   status per intelligence domain) · findings (each with evidence) · risks · data gaps · method eligibility (Engine 1) ·
//   financial scenarios (Engine 5) · comparables (Engine 4) · investment fit (Engine 7) · limitations · next steps.
// Every statement carries the IDs it rests on. The report never contains a score, a ranking or a recommendation to
// buy: its "assessment" is the list of supported conclusions, unsupported areas and the reasons for both.
// A language model may draft the findings in the analysis file; this module only validates and assembles them.
import { claimPublication, evidenceFreshness, MATERIAL_FIELDS } from '../../assets/js/policy.js';
import { scenarios as runScenarios, FIN_VERSION } from './finance.mjs';
import { selectComparables } from './comparables.mjs';
import { investmentFit } from './fit.mjs';
import { exitReview } from './exit.mjs';
import { pricePosition } from './pricepos.mjs';
import { assessSeverity } from './severity.mjs';
import fs from 'node:fs';

// Internal engines run only when the method registry marks them internally active (D-20: no method runs before its
// methodology is approved). The registry is read from the repository.
const REG = (() => { try { return JSON.parse(fs.readFileSync(new URL('../../data/methods.json', import.meta.url), 'utf8')).methods; } catch { return []; } })();
export const internalActive = (id, reg) => ((reg || REG).find(m => m.id === id) || {}).internal === 'ACTIVE';

export const RPT_VERSION = 'RPT-1';
const DOMAIN_OF = { market: 'MARKET', district: 'DISTRICT', area: 'AREA', project: 'PROJECT_ASSET', asset: 'PROJECT_ASSET', developer: 'DEVELOPER', opportunity: 'PROJECT_ASSET' };
const same = (a, b) => a && b && a.type === b.type && a.id === b.id;
const isEmpty = (v) => v === null || v === undefined || v === '' || (Array.isArray(v) && !v.length);

// store: loaded store; gateWhy: gate reasons for the opportunity (from the validator); analysis: unwrapped (checkAnalysis)
export function decisionReport(store, oppId, { gateWhy = [], analysis = null, provenance = [], today, privateFacts = null, registry = REG }) {
  const C = (c) => store.collections[c] || [];
  const byId = new Map(); for (const recs of Object.values(store.collections)) for (const r of recs) byId.set(r.id, r);
  const o = byId.get(oppId); if (!o) return { status: 'UNAVAILABLE', reason: `${oppId} not found` };
  const p = o.subject && byId.get(o.subject.id); const dev = p && p.developer_id ? byId.get(p.developer_id) : null;
  const dist = p && p.district_id ? byId.get(p.district_id) : null; const asset = o.asset_id ? byId.get(o.asset_id) : null; const mk = byId.get(o.market_id);
  const subjects = [p && { type: 'project', rec: p }, dev && { type: 'developer', rec: dev }, asset && { type: 'asset', rec: asset }, { type: 'opportunity', rec: o }, dist && { type: 'district', rec: dist }, mk && { type: 'market', rec: mk }].filter(Boolean);
  const evFor = (type, id) => C('evidence').filter(e => same(e.subject, { type, id }));
  const srcType = (e) => (byId.get(e.source_id) || {}).source_type || null;
  const label = (e) => { const c = claimPublication(e); return c.status === 'ESTABLISHED' ? 'FACT (verified)' : c.status === 'QUALIFIED' ? `QUALIFIED — ${e.verification_status}, ${e.evidence_class}` : `NOT PUBLIC — ${c.reason}`; };

  // facts: every material field, with value, state and the evidence behind it
  const facts = [];
  for (const { type, rec } of subjects) for (const f of MATERIAL_FIELDS[type] || []) {
    const evs = evFor(type, rec.id).filter(e => e.field === f);
    const st = (rec.field_states || []).find(s => s.field === f);
    facts.push({ subject: `${type} ${rec.id}`, field: f, value: isEmpty(rec[f]) ? null : rec[f], state: isEmpty(rec[f]) ? (st ? st.state : 'NO VALUE AND NO STATE') : null,
      evidence: evs.map(e => ({ id: e.id, label: label(e), freshness: evidenceFreshness(e, today, srcType(e)).state, source: (byId.get(e.source_id) || {}).name || e.source_id })) });
  }
  // domain assessments (Engines 2–3): evidence and research status per intelligence domain — no judgement added here
  const domains = {};
  for (const { type, rec } of subjects) {
    const dom = DOMAIN_OF[type];
    const d = domains[dom] ||= { evidence: [], research_blocks: [] };
    for (const e of evFor(type, rec.id)) d.evidence.push({ id: e.id, subject: rec.id, field: e.field, claim: e.claim && e.claim.en, label: label(e) });
  }
  for (const b of C('research_blocks')) if (subjects.some(s => same(b.subject, { type: s.type, id: s.rec.id }))) (domains[b.domain] ||= { evidence: [], research_blocks: [] }).research_blocks.push({ id: b.id, research_closure: b.research_closure, data_completeness: b.data_completeness });
  const risks = C('risks').filter(r => subjects.some(s => same(r.subject, { type: s.type, id: s.rec.id }))).map(r => ({ id: r.id, type: r.risk_type, title: r.title && r.title.en, cause: r.cause && r.cause.en, mitigation: r.mitigation && r.mitigation.en, i18n: { title: r.title || null, mitigation: r.mitigation || null }, residual: r.residual_uncertainty && r.residual_uncertainty.en, evidence: r.evidence_ids, severity: 'not assessed (M-RISK-SEVERITY inactive)' }));
  const sevOn = internalActive('M-RISK-SEVERITY', registry);
  const conflicts = C('conflicts').filter(c => subjects.some(s => same(c.subject, { type: s.type, id: s.rec.id }))).map(c => ({ id: c.id, field: c.field, status: c.status, evidence: c.evidence_ids }));
  const gaps = facts.filter(f => f.value === null).map(f => `${f.subject}.${f.field}: ${f.state}`);
  const exit = exitReview({ collections: store.collections, subjects: subjects.map(s => ({ type: s.type, id: s.rec.id })), marketId: o.market_id, privateFacts: privateFacts || (store.private && store.private.private_facts) || [] });

  // engines on the private analysis inputs
  const A = analysis || {};
  let finance = { status: 'UNAVAILABLE', missing: ['analysis.finance'], version: FIN_VERSION };
  if (A.finance) finance = runScenarios(A.finance, A.scenarios || {});
  let comparables = { status: 'UNAVAILABLE', missing: ['analysis.comparables'] };
  if (A.comparables) comparables = selectComparables({ ...A.comparables.subject, as_of: (A.comparables.subject || {}).as_of || A.as_of }, A.comparables.candidates, A.comparables.rules, A.fx || []);
  const ppOn = internalActive('M-PRICE-POSITION', registry);
  const position = !ppOn ? { status: 'INACTIVE' } : A.price_position ? pricePosition(A.price_position, comparables) : { status: 'UNAVAILABLE', missing: ['analysis.price_position'] };
  const severity = sevOn ? assessSeverity(risks, A.risk_severity || {}) : { errors: [], labels: {} };
  if (sevOn) for (const r of risks) { const x = severity.labels[r.id]; if (x) { r.severity = x.label; r.severity_rationale = x.rationale; } }
  let fit = { status: 'UNAVAILABLE', missing: ['analysis.investor_profile'] };
  if (A.investor_profile) fit = investmentFit(A.investor_profile, { investor_objective_tags: o.investor_objective_tags, delivery_status: p && p.delivery_status, expected_delivery: p && p.expected_delivery, market_id: o.market_id, risk_types: risks.map(r => r.type), price: A.price_evidence ? { min: A.price_evidence.min, costs: typeof A.price_evidence.costs === 'number' ? A.price_evidence.costs : undefined, currency: A.price_evidence.currency, evidence_id: (provenance.find(x => x.path === '$.price_evidence.min') || {}).ref } : null, as_of: A.as_of });

  // Engine 1: method eligibility
  const methods = {
    'M-CASHFLOW/M-ROI': finance.scenarios ? (finance.scenarios.base.roi.status === 'OK' ? 'RUN' : `NOT RUN — missing ${[...(finance.scenarios.base.roi.missing || []), ...(finance.scenarios.base.roi.invalid || [])].join(', ')}`) : 'NOT RUN — no finance inputs',
    'M-RETURN-VIEWS (IRR, real terms, home currency)': finance.scenarios ? (finance.scenarios.base.roi.status !== 'OK' ? 'NOT RUN — finance inputs incomplete' : `IRR ${finance.scenarios.base.irr.status}; real view ${finance.scenarios.base.views.real.status === 'NOT RUN' ? 'NOT RUN — no recorded inflation input' : 'RUN'}; home-currency view ${finance.scenarios.base.views.home.status === 'NOT RUN' ? 'NOT RUN — no recorded FX path' : 'RUN'}`) : 'NOT RUN — no finance inputs',
    'M-NPV': finance.scenarios ? (finance.scenarios.base.npv.status === 'OK' ? 'RUN' : `NOT RUN — missing ${[...(finance.scenarios.base.npv.missing || []), ...(finance.scenarios.base.npv.invalid || [])].join(', ')}`) : 'NOT RUN — no finance inputs',
    'M-COMPARABLES': comparables.status === 'OK' ? 'RUN' : `NOT RUN — ${comparables.status}${comparables.missing ? ': ' + comparables.missing.join(', ') : comparables.n !== undefined ? ` (${comparables.n} of ${comparables.min_sample} required)` : ''}`,
    'M-INVESTMENT-FIT': fit.status === 'OK' ? 'RUN (qualitative criteria)' : 'NOT RUN — no investor profile',
    'M-EXIT-REVIEW': `RUN (qualitative; ${exit.not_available.length} of 4 liquidity inputs not available)`,
    'M-PRICE-POSITION': !ppOn ? 'INACTIVE — methodology awaiting approval' : position.status === 'OK' ? 'RUN' : `NOT RUN — ${(position.missing || []).join(', ')}`,
    'M-RISK-SEVERITY': !sevOn ? 'INACTIVE — methodology awaiting approval' : `RUN (${Object.values(severity.labels).filter(x => x.label !== 'NOT_ASSESSED').length} of ${risks.length} risks labelled)`,
    'M-FAIR-VALUE, M-AREA-RANKING, M-ASSET-QUALITY, M-LIQUIDITY': 'INACTIVE — no approved method'
  };
  const limitations = [];
  if (gateWhy.length) limitations.push(`Not publishable: ${gateWhy.join('; ')}`);
  if (gaps.length) limitations.push(`${gaps.length} material field(s) without a value`);
  if (conflicts.some(c => c.status === 'OPEN')) limitations.push('open source conflicts');
  if (!provenance.length && A.finance) limitations.push('financial inputs without provenance');
  const assumptions = provenance.filter(x => x.ref === 'ASSUMPTION');
  if (assumptions.length) limitations.push(`${assumptions.length} financial input(s) are assumptions, not evidence — scenario results are conditional on them`);
  const next = [];
  for (const w of gateWhy) next.push(`Resolve gate reason: ${w}`);
  for (const g of gaps) next.push(`Collect or state: ${g}`);
  if (finance.scenarios && finance.scenarios.base.roi.status !== 'OK') next.push('Complete the finance inputs listed under method eligibility');
  for (const x of exit.not_available) next.push(`Liquidity diligence: ${x.text}`);
  if (sevOn) { for (const e of severity.errors) limitations.push(`Risk severity refused: ${e}`); const na = risks.filter(r => r.severity === 'NOT_ASSESSED').length; if (na) next.push(`Assess severity of ${na} risk(s) (RSV-1)`); }
  if (comparables.status === 'INSUFFICIENT_SAMPLE') next.push(`Collect at least ${comparables.min_sample - comparables.n} more eligible ${comparables.price_type} observations`);

  return {
    status: 'OK', version: RPT_VERSION, internal: true, generated_for: today, opportunity: oppId,
    overview: { title: o.title && o.title.en, project: p && `${p.name} (${p.id})`, developer: dev && `${dev.name} (${dev.id})`, district: dist && `${dist.name} (${dist.id})`, market: mk && `${mk.name} (${mk.id}, ${mk.activation})`, record_status: o.record_status, publishable: gateWhy.length === 0 },
    facts, domains, findings: A.findings || [], risks, conflicts, gaps, methods, finance, comparables, position, fit, exit, provenance, limitations, next_steps: next,
    conclusion: gateWhy.length || gaps.length ? 'Assessment incomplete: see limitations and next steps. No recommendation is made on incomplete evidence.' : 'Evidence sufficient for publication review. Conclusions are limited to the supported findings above; no score or ranking is produced.'
  };
}

const n = (v, d = 2) => typeof v === 'number' ? v.toLocaleString('en-GB', { maximumFractionDigits: d, minimumFractionDigits: d }) : String(v);
const pct = (v) => typeof v === 'number' ? `${(v * 100).toFixed(2)}%` : String(v);
export function reportMarkdown(r) {
  if (r.status !== 'OK') return `# Decision report\n\nUnavailable: ${r.reason}\n`;
  const L = [];
  L.push(`# Decision report · ${r.opportunity}`, '', `**INTERNAL — not for publication.** Report ${r.version} · generated for ${r.generated_for}. Facts, estimates, assumptions and interpretations are labelled; every line cites its record IDs.`, '');
  L.push('## 1. Overview', '', ...Object.entries(r.overview).map(([k, v]) => `- **${k.replace(/_/g, ' ')}:** ${v ?? '—'}`), '');
  L.push('## 2. Facts and their evidence', '', '| Subject | Field | Value / state | Evidence |', '|---|---|---|---|');
  for (const f of r.facts) L.push(`| ${f.subject} | ${f.field} | ${f.value !== null ? JSON.stringify(f.value) : f.state} | ${f.evidence.map(e => `${e.id} — ${e.label}; ${e.freshness}; ${e.source}`).join('<br>') || 'none'} |`);
  L.push('', '## 3. Domain assessments (evidence and research status)', '');
  for (const [d, x] of Object.entries(r.domains)) L.push(`### ${d}`, '', `Research blocks: ${x.research_blocks.map(b => `${b.id} closure ${b.research_closure} / completeness ${b.data_completeness}`).join('; ') || 'none'}`, '', ...x.evidence.map(e => `- ${e.claim} — ${e.label} (${e.id})`), '');
  L.push('## 4. Findings', '', ...(r.findings.length ? r.findings.map(f => `- **${f.type}** [${f.class}] ${f.text} — ${f.refs.join(', ')}`) : ['- none recorded']), '');
  L.push('## 5. Risks', '', ...(r.risks.length ? r.risks.map(k => `- **${k.type}** ${k.title}${k.cause ? ` — cause: ${k.cause}` : ''}${k.mitigation ? `; mitigation: ${k.mitigation}` : ''}; severity ${k.severity}${k.severity_rationale ? ` (${k.severity_rationale})` : ''}; evidence ${k.evidence.join(', ') || 'none'}`) : ['- none documented']), '');
  L.push('## 6. Conflicts and data gaps', '', ...r.conflicts.map(c => `- ${c.id} ${c.field}: ${c.status} (${c.evidence.join(', ')})`), ...r.gaps.map(g => `- ${g}`), ...(r.conflicts.length || r.gaps.length ? [] : ['- none']), '');
  L.push('## 7. Method eligibility (Engine 1)', '', ...Object.entries(r.methods).map(([k, v]) => `- **${k}:** ${v}`), '');
  L.push(`## 8. Financial scenarios (internal; ${FIN_VERSION})`, '');
  if (!r.finance.scenarios) L.push(`Unavailable: ${(r.finance.missing || []).join(', ')}`, '');
  else for (const [name, s] of Object.entries(r.finance.scenarios)) {
    L.push(`### ${name}`, '');
    if (s.roi.status !== 'OK') { L.push(`Unavailable — missing: ${(s.roi.missing || []).join(', ') || '—'}; invalid: ${(s.roi.invalid || []).join(', ') || '—'}`, ''); continue; }
    L.push(`- ROI (${s.roi.definition}): **${pct(s.roi.value)}** — a total over the horizon, not an annual rate`, `- IRR (${s.irr.definition || 'annual'}): ${s.irr.status === 'OK' ? `**${pct(s.irr.value)} per year**` : `${s.irr.status} — ${s.irr.reason || ''}`}`, `- Net rental yield, first rented year (${s.net_rental_yield.definition}): ${pct(s.net_rental_yield.value)}`, `- NPV: ${s.npv.status === 'OK' ? `**${n(s.npv.value)} ${r.finance.currency}** at ${pct(s.npv.discount_rate)} — basis: ${s.npv.discount_basis}` : `unavailable (${(s.npv.missing || []).join(', ')})`}`);
    const V = s.views || {};
    if (V.real && V.real.status !== 'NOT RUN') L.push(`- Real terms (inflation ${pct(V.real.inflation_rate)} a year — ${V.real.basis}): real ROI **${pct(V.real.roi)}**; real IRR ${V.real.irr.status === 'OK' ? `**${pct(V.real.irr.value)} per year**` : V.real.irr.status}`);
    else L.push(`- Real terms: NOT RUN — no recorded inflation input${r.finance.currency === 'TRY' ? ' (in TRY the nominal figures above overstate the return; record views.inflation)' : ''}`);
    if (V.home && V.home.status !== 'NOT RUN') L.push(`- In ${V.home.currency} (spot ${V.home.spot} ${r.finance.currency}/${V.home.currency}, assumed change ${pct(V.home.annual_change)} a year — ${V.home.basis}): invested ${n(V.home.invested)} ${V.home.currency}, net ${n(V.home.net)} ${V.home.currency}, ROI **${pct(V.home.roi)}**; IRR ${V.home.irr.status === 'OK' ? `**${pct(V.home.irr.value)} per year**` : V.home.irr.status}`);
    else L.push('- Home-currency view: NOT RUN — no recorded FX path');
    L.push('');
    L.push('| t | payments | collected rent | operating | rental tax | exit net | cash flow |', '|---|---|---|---|---|---|---|', ...s.cash_flows.rows.map(x => `| ${x.t} | ${n(x.payments)} | ${n(x.collected_rent)} | ${n(x.operating)} | ${n(x.rental_tax)} | ${n(x.exit_net)} | ${n(x.cf)} |`), '');
  }
  L.push('Projections are conditional on the recorded inputs; they are not forecasts or guarantees.', '', '### Inputs and provenance', '', ...(r.provenance.length ? r.provenance.map(x => `- ${x.path} = ${x.value} — ${x.ref}${x.note ? ` (${x.note})` : ''}`) : ['- none']), '');
  L.push('## 9. Comparables (CMP-1)', '');
  if (r.comparables.status === 'OK') L.push(`${r.comparables.n} ${r.comparables.price_type} observations, ${r.comparables.area_basis} area, ${r.comparables.currency}/m²: median ${n(r.comparables.stats.median)}, interquartile ${n(r.comparables.stats.p25)}–${n(r.comparables.stats.p75)}. No adjustments; not a fair value.`, '');
  else L.push(`${r.comparables.status}${r.comparables.missing ? ': ' + r.comparables.missing.join(', ') : ` — ${r.comparables.n} eligible of ${r.comparables.min_sample} required`}`, '');
  for (const x of r.comparables.excluded || []) L.push(`- excluded ${x.id}: ${x.reasons.join('; ')}`);
  if (r.position && r.position.status !== 'INACTIVE') {
    L.push('', '## 9a. Price position (PPO-1)', '');
    if (r.position.status === 'OK') L.push(`Asking price ${n(r.position.subject_price_per_m2)} ${r.position.currency}/m² (${r.position.area_basis}; ${r.position.refs.join(', ')}) sits **${r.position.band.replace(/_/g, ' ').toLowerCase()}** of ${r.position.n} ${r.position.price_type} comparables: ${pct(r.position.vs_median)} against the median; ${pct(r.position.share_of_comparables_below)} of comparables are lower. ${r.position.note}`, '');
    else L.push(`Not run — ${(r.position.missing || []).join(', ')}`, '');
  }
  L.push('', '## 9b. Liquidity and exit (EXR-1, qualitative)', '', r.exit.statement, '');
  for (const x of r.exit.weakening) L.push(`- weakens: ${x.type} — ${x.text} (${x.ref})`);
  for (const x of r.exit.supporting) L.push(`- supports: ${x.text} (${x.ref})`);
  for (const x of r.exit.context) L.push(`- context: ${x.text} (${x.ref})`);
  for (const x of r.exit.not_available) L.push(`- DATA NOT AVAILABLE: ${x.text}`);
  L.push('', r.exit.note);
  L.push('', '## 10. Investment fit (FIT-2, qualitative)', '', ...(r.fit.status === 'OK' ? [`Outcome: **${r.fit.outcome}**`, ...r.fit.criteria.map(c => `- ${c.criterion} (${c.kind || 'HARD'}): ${c.result} — ${c.reason}`)] : ['Not run: no investor profile.']), '');
  L.push('## 11. Limitations', '', ...(r.limitations.length ? r.limitations.map(x => `- ${x}`) : ['- none recorded']), '', '## 12. Next steps', '', ...(r.next_steps.length ? r.next_steps.map(x => `- ${x}`) : ['- none']), '', '## Conclusion', '', r.conclusion, '');
  return L.join('\n');
}
