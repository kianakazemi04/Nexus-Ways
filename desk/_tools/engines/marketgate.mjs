// MGE-1 — shared market-gate engine (owner decision D3, 28 Oct 2026). Zero dependencies.
//
// One engine evaluates every market against its OWN configuration (desk/_tools/market-gates/MG-1.json). Nothing in the
// engine is specific to Istanbul, Dubai or Abu Dhabi: every market rule — research blocks, named statistics, accepted
// publishers, units, periods, freshness, FX convention, legal-review topics and opportunity requirements — lives in the
// configuration. The engine only computes; it never activates a market (see `activate-market` in ingest.mjs) and never
// treats evidence as legal approval: legal review comes only from the private regulatory-review records.
//
//   evaluateMarketGate(config, marketId, collections, { today, now, reviews, provenance })
//     → { gate_version, engine_version, market_id, evaluated_at, pass, reasons: [{ code, item, detail }], blocks,
//         statistics, reviews, publication }
//   opportunityRequirementReasons(config, marketId, project, collections, { today, reviews }) → string[]
//
// Freshness rules are tied to each source's publication rhythm (documented per statistic); no statistic has a pass
// value — the gate checks that evidence exists, is official, verified, traceable, current and unconflicted.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { claimPublication, evidenceFreshness, isIsoDate } from '../../assets/js/policy.js';

export const ENGINE_VERSION = 'MGE-1';
const HERE = path.dirname(fileURLToPath(import.meta.url));
export const CONFIG_PATH = path.join(HERE, '../market-gates/MG-1.json');
export function loadGateConfig(file = CONFIG_PATH) {
  try { return JSON.parse(fs.readFileSync(file, 'utf8')); }
  catch (e) { return { error: `market-gate configuration unreadable: ${e.message}` }; }
}

const DAY = 86400000;
const days = (a, b) => Math.round((Date.parse(b + 'T00:00:00Z') - Date.parse(a + 'T00:00:00Z')) / DAY);
const norm = (s) => String(s || '').trim().toLowerCase().normalize('NFKD').replace(/[̀-ͯ]/g, '');
const RANK = { NO: 0, PARTIAL: 1, YES: 2 };
const sameRef = (a, b) => !!a && !!b && a.type === b.type && a.id === b.id;
export const REVIEW_STATUS = ['PENDING', 'IN_REVIEW', 'COMPLETE', 'WITHDRAWN'];
export const REVIEW_OUTCOME = ['CLEAR', 'CONDITIONS', 'NOT_APPLICABLE', 'BLOCKING'];
const DOC = { MARKET: 1, MACRO_FX: 1, DEVELOPER: 1, PROJECT_ASSET: 1, RISK: 1, DISTRICT: 1 };

// End date of an observation period in one of the configured formats (YYYY, YYYY-Qn, YYYY-MM, YYYY-MM-DD).
export function periodEnd(period, formats) {
  if (typeof period !== 'string') return { ok: false, why: 'no observation period' };
  const allowed = String(formats || '').split('|');
  const lastOfMonth = (y, m) => new Date(Date.UTC(y, m, 0)).toISOString().slice(0, 10);
  let m;
  if ((m = period.match(/^(\d{4})-(\d{2})-(\d{2})$/)) && allowed.includes('YYYY-MM-DD')) return isIsoDate(period) ? { ok: true, end: period } : { ok: false, why: `invalid date ${period}` };
  if ((m = period.match(/^(\d{4})-(\d{2})$/)) && allowed.includes('YYYY-MM') && +m[2] >= 1 && +m[2] <= 12) return { ok: true, end: lastOfMonth(+m[1], +m[2]) };
  if ((m = period.match(/^(\d{4})-Q([1-4])$/)) && allowed.includes('YYYY-Q[1-4]')) return { ok: true, end: lastOfMonth(+m[1], +m[2] * 3) };
  if ((m = period.match(/^(\d{4})-H([12])$/)) && allowed.includes('YYYY-H[1-2]')) return { ok: true, end: lastOfMonth(+m[1], +m[2] * 6) };
  if ((m = period.match(/^(\d{4})$/)) && allowed.includes('YYYY')) return { ok: true, end: `${m[1]}-12-31` };
  return { ok: false, why: `period "${period}" is not in the accepted format ${formats}` };
}

// Shape check of the configuration itself: a market with no rules must never pass by being empty.
export function configProblems(cfg, marketId) {
  const out = [];
  if (!cfg || cfg.error) return [cfg && cfg.error || 'no market-gate configuration'];
  if (!cfg.version || !cfg.markets) return ['configuration has no version or markets'];
  const m = cfg.markets[marketId];
  if (!m) return [`market ${marketId} has no gate configuration (${cfg.version})`];
  if (!m.scope || !Array.isArray(m.scope.categories) || !m.scope.categories.length || !m.scope.asset_class) out.push('scope (categories, asset class) not defined');
  if (!m.country || !m.currency) out.push('country or currency not defined');
  const doms = new Set((m.research_blocks || []).map(b => b.domain));
  for (const d of ['MARKET', 'MACRO_FX', 'DEVELOPER', 'PROJECT_ASSET', 'RISK']) if (!doms.has(d)) out.push(`required research block ${d} not configured`);
  for (const b of m.research_blocks || []) if (!DOC[b.domain] || !b.why || !Array.isArray(b.closure) || !(b.completeness_min in RANK) || !(b.max_age_days > 0)) out.push(`research block ${b.domain} incompletely configured`);
  if (!m.districts || !(m.districts.min_closed >= 1)) out.push('district/location research requirement not configured');
  const stats = m.statistics || [];
  if (!stats.some(s => s.required)) out.push('no required statistic configured');
  const keys = new Set();
  for (const s of stats) {
    if (keys.has(s.key)) out.push(`statistic ${s.key} configured twice`); keys.add(s.key);
    for (const k of ['key', 'name', 'why', 'unit', 'period_format', 'geography', 'fallback']) if (!s[k]) out.push(`statistic ${s.key || '?'}: ${k} missing`);
    if (!(s.max_age_days > 0)) out.push(`statistic ${s.key}: freshness limit missing`);
    if (!s.accepted_sources || !(s.accepted_sources.publishers || []).length || !(s.accepted_sources.source_types || []).length) out.push(`statistic ${s.key}: accepted sources missing`);
  }
  if (!m.fx || !m.fx.reference || !stats.some(s => s.key === m.fx.reference && s.kind === 'fx' && s.required)) out.push('FX reference statistic not configured as a required fx statistic');
  if (!m.fx || m.fx.currency !== m.currency || !m.fx.convention) out.push('FX convention not defined for the market currency');
  const rr = m.regulatory_review || {};
  if (!(rr.topics || []).length || !(rr.reviewer_roles || []).length || !(rr.max_age_days > 0)) out.push('regulatory review topics, reviewer roles or validity not configured');
  if (!m.publication || !m.publication.financial_figures) out.push('publication restrictions not configured');
  for (const r of (m.publication && m.publication.opportunity_requirements) || []) if (r.basis_review && !(rr.topics || []).some(t => t.key === r.basis_review)) out.push(`requirement ${r.key}: basis review ${r.basis_review} is not a configured review topic`);
  return out;
}

// The latest review record for a topic (by reviewed_at, then recorded sequence), and why it does not count.
export function reviewState(rr, marketId, topicKey, reviews, today) {
  const mine = (reviews || []).filter(r => r && r.market_id === marketId && r.topic === topicKey);
  if (!mine.length) return { ok: false, code: 'MG_REVIEW_MISSING', detail: 'no legal/regulatory review recorded', review: null };
  const r = mine.slice().sort((a, b) => String(a.reviewed_at || '').localeCompare(String(b.reviewed_at || '')) || (a.seq || 0) - (b.seq || 0)).pop();
  const bad = [];
  if (!REVIEW_STATUS.includes(r.status)) bad.push(`unknown status ${r.status}`);
  if (r.recorded_by !== 'owner') bad.push('not recorded by the owner');
  if (!r.reference || !String(r.reference).trim()) bad.push('no review reference');
  if (bad.length) return { ok: false, code: 'MG_REVIEW_INVALID', detail: bad.join('; '), review: r };
  if (r.status !== 'COMPLETE') return { ok: false, code: 'MG_REVIEW_INCOMPLETE', detail: `review ${r.status}`, review: r };
  if (!REVIEW_OUTCOME.includes(r.outcome)) return { ok: false, code: 'MG_REVIEW_INVALID', detail: `COMPLETE review without a valid outcome (${r.outcome})`, review: r };
  const roles = ((rr.topics || []).find(t => t.key === topicKey) || {}).accepted_roles || rr.reviewer_roles || [];
  if (!r.reviewer || !roles.includes(r.reviewer_role)) return { ok: false, code: 'MG_REVIEWER', detail: `reviewer role ${r.reviewer_role || 'none'} is not accepted (${roles.join(', ')})`, review: r };
  if (!isIsoDate(r.reviewed_at) || r.reviewed_at > today) return { ok: false, code: 'MG_REVIEW_INVALID', detail: `review date ${r.reviewed_at || 'missing'} invalid or in the future`, review: r };
  if (days(r.reviewed_at, today) > rr.max_age_days) return { ok: false, code: 'MG_REVIEW_EXPIRED', detail: `review dated ${r.reviewed_at} is older than ${rr.max_age_days} days`, review: r };
  if (r.valid_until && (!isIsoDate(r.valid_until) || r.valid_until < today)) return { ok: false, code: 'MG_REVIEW_EXPIRED', detail: `review valid until ${r.valid_until}`, review: r };
  if (r.outcome === 'BLOCKING') return { ok: false, code: 'MG_REVIEW_BLOCKING', detail: `counsel concluded the activity is not permitted as configured${r.conditions && r.conditions.length ? ': ' + r.conditions.join('; ') : ''}`, review: r };
  return { ok: true, code: null, detail: null, review: r };
}

export function evaluateMarketGate(cfg, marketId, collections, { today, now = null, reviews = [], provenance = null } = {}) {
  if (!isIsoDate(today)) throw new Error(`evaluateMarketGate: invalid "today" ${today}`);
  const reasons = []; const R = (code, item, detail) => reasons.push({ code, item, detail });
  const out = { gate_version: cfg && cfg.version || null, engine_version: ENGINE_VERSION, market_id: marketId, evaluated_at: now || `${today}T00:00:00Z`, today, pass: false, reasons, blocks: [], statistics: [], reviews: [], publication: null };
  const C = (k) => (collections && collections[k]) || [];
  for (const p of configProblems(cfg, marketId)) R('MG_CONFIG', marketId, p);
  if (reasons.length) return out;
  const m = cfg.markets[marketId];
  const market = C('markets').find(x => x.id === marketId);
  const real = !String(marketId).startsWith('FIX-');
  if (!market) { R('MG_SCOPE', marketId, 'market record not found'); return out; }
  // 1 — scope and eligible asset class
  if (!m.scope.categories.includes(market.category)) R('MG_SCOPE', marketId, `category ${market.category} is outside the configured scope (${m.scope.categories.join(', ')})`);
  if (market.country !== m.country) R('MG_SCOPE', marketId, `country ${market.country} ≠ configured ${m.country}`);
  if (market.currency !== m.currency) R('MG_SCOPE', marketId, `currency ${market.currency} ≠ configured ${m.currency}`);
  if (real && market.is_illustrative) R('MG_SCOPE', marketId, 'illustrative market record');
  // 8 — mandatory gaps recorded on the market itself
  for (const s of market.field_states || []) if (['DATA NOT AVAILABLE', 'ACCESSIBLE BUT NOT YET COLLECTED', 'PROFESSIONAL DD REQUIRED'].includes(s.state)) R('MG_GAP', `${marketId}:${s.field}`, `recorded gap: ${s.state}`);

  const srcOf = (e) => C('sources').find(s => s.id === e.source_id) || null;
  const openConflict = (e) => C('conflicts').filter(c => c.status === 'OPEN' && ((c.evidence_ids || []).includes(e.id) || (e.conflict_ids || []).includes(c.id)));
  const trace = (e) => {
    const t = []; const s = srcOf(e);
    if (!s) t.push(`source ${e.source_id} not found`);
    if (real && (e.is_illustrative || (s && s.is_illustrative))) t.push('illustrative evidence or source');
    if (!e.source_url && !e.source_locator && !(s && s.url)) t.push('no URL or locator to the source');
    if (!isIsoDate(e.retrieved_at) || e.retrieved_at > today) t.push(`retrieval date ${e.retrieved_at || 'missing'} invalid or in the future`);
    if (['VERIFIED', 'CORROBORATED'].includes(e.verification_status) && !isIsoDate(e.last_verified)) t.push('verified without a verification date');
    if (provenance && !provenance[e.id]) t.push('no provenance record (entity index) — owner of the evidence unknown');
    return t;
  };

  // 2 / 7 — market-level research blocks: closure and completeness are independent states
  const block = (subject, domain, rule, item) => {
    const b = C('research_blocks').find(x => sameRef(x.subject, subject) && x.domain === domain);
    const st = { item, domain, subject: subject.id, id: b ? b.id : null, research_closure: b ? b.research_closure : null, data_completeness: b ? b.data_completeness : null, last_reviewed: b ? b.last_reviewed : null, ok: false, problems: [] };
    const P = (code, d) => st.problems.push({ code, detail: d });
    if (!b) P('MG_BLOCK_MISSING', `no ${domain} research block`);
    else {
      if (real && b.is_illustrative) P('MG_TRACE', 'illustrative research block');
      if (!rule.closure.includes(b.research_closure)) P('MG_BLOCK_NOT_CLOSED', `Research Closure ${b.research_closure} (required: ${rule.closure.join('/')})`);
      if (RANK[b.data_completeness] === undefined || RANK[b.data_completeness] < RANK[rule.completeness_min]) P('MG_COMPLETENESS', `Data Completeness ${b.data_completeness} (minimum ${rule.completeness_min})`);
      if (!isIsoDate(b.last_reviewed) || b.last_reviewed > today) P('MG_BLOCK_STALE', `last reviewed ${b.last_reviewed || 'never'}`);
      else if (days(b.last_reviewed, today) > rule.max_age_days) P('MG_BLOCK_STALE', `last reviewed ${b.last_reviewed}, older than ${rule.max_age_days} days`);
    }
    st.ok = !st.problems.length; return st;
  };
  for (const rule of m.research_blocks) {
    const st = block({ type: 'market', id: marketId }, rule.domain, rule, `${marketId}:${rule.domain}`);
    out.blocks.push(st); for (const p of st.problems) R(p.code, st.item, p.detail);
  }
  // district / location research: at least N districts of this market with a closed, current DISTRICT block
  const dists = C('districts').filter(d => d.market_id === marketId);
  const dRule = { closure: m.districts.closure, completeness_min: m.districts.completeness_min, max_age_days: m.districts.max_age_days };
  const dStates = dists.map(d => block({ type: 'district', id: d.id }, m.districts.domain || 'DISTRICT', dRule, `${d.id}:DISTRICT`));
  out.blocks.push(...dStates);
  const closedD = dStates.filter(s => s.ok).length;
  if (closedD < m.districts.min_closed) R('MG_DISTRICTS', marketId, `${closedD} district(s) with closed, current location research; ${m.districts.min_closed} required${dStates.length ? ' — ' + dStates.filter(s => !s.ok).map(s => `${s.subject}: ${s.problems.map(p => p.detail).join(', ')}`).join('; ') : ''}`);

  // 3 / 4 / 5 — named statistics (FX included): official source, verification, unit, period, geography, freshness,
  // traceability, conflicts. A statistic passes when at least one evidence record passes every rule; two passing
  // records for the same period with different values are an unrecorded conflict.
  for (const s of m.statistics) {
    const cands = C('evidence').filter(e => sameRef(e.subject, { type: 'market', id: marketId }) && e.topic === s.key);
    const st = { key: s.key, kind: s.kind || 'statistic', required: !!s.required, evidence_id: null, value: null, period: null, age_days: null, status: 'MISSING', problems: [] };
    if (!cands.length) {
      st.status = s.required ? 'MISSING' : 'ABSENT_OPTIONAL';
      if (s.required) R(s.kind === 'fx' ? 'MG_FX' : 'MG_STAT_MISSING', s.key, `no evidence recorded — fallback: ${s.fallback}`);
      out.statistics.push(st); continue;
    }
    const evals = cands.map(e => {
      const p = []; const P = (code, d) => p.push({ code, detail: d });
      const src = srcOf(e); const a = s.accepted_sources;
      if (src) {
        const pubOk = a.publishers.some(x => norm(x) === norm(src.publisher));
        if (!pubOk) P('MG_STAT_SOURCE', `publisher "${src.publisher}" is not accepted (${a.publishers.join(' / ')})`);
        if (!a.source_types.includes(src.source_type)) P('MG_STAT_SOURCE', `source type ${src.source_type} is not accepted (${a.source_types.join('/')})`);
      }
      if (!(e.source_tier <= (a.max_tier || 1))) P('MG_STAT_SOURCE', `Tier ${e.source_tier} (maximum Tier ${a.max_tier || 1})`);
      if (!(s.accepted_verification || ['VERIFIED', 'CORROBORATED']).includes(e.verification_status)) P('MG_STAT_UNVERIFIED', `verification ${e.verification_status}`);
      if (e.evidence_class !== (s.evidence_class || 'FACT')) P('MG_STAT_UNVERIFIED', `evidence class ${e.evidence_class} (required ${s.evidence_class || 'FACT'})`);
      if (e.value === null || e.value === undefined || e.value === '') P('MG_STAT_MISSING', 'evidence has no value');
      if (e.unit !== s.unit) P('MG_STAT_UNIT', `unit ${e.unit} (required ${s.unit})`);
      if (e.currency !== null && e.currency !== undefined) P('MG_STAT_UNIT', 'statistic carries a currency amount; gate statistics are counts, indices, rates or ratios only');
      if (norm(e.geography) !== norm(s.geography)) P('MG_STAT_GEO', `geography "${e.geography}" (required "${s.geography}")`);
      const pe = periodEnd(e.period, s.period_format); let age = null;
      if (!pe.ok) P('MG_STAT_PERIOD', pe.why);
      else if (pe.end > today) P('MG_STAT_PERIOD', `observation period ${e.period} ends after ${today}`);
      else { age = days(pe.end, today); if (age > s.max_age_days) P('MG_STAT_STALE', `observation period ${e.period} ended ${age} days ago (limit ${s.max_age_days})`); }
      for (const t of trace(e)) P('MG_TRACE', t);
      for (const c of openConflict(e)) P('MG_CONFLICT', `open conflict ${c.id}`);
      return { e, p, age };
    });
    const good = evals.filter(x => !x.p.length).sort((a, b) => a.age - b.age);
    if (good.length) {
      const best = good[0];
      const clash = good.filter(x => x.e.period === best.e.period && String(x.e.value) !== String(best.e.value));
      Object.assign(st, { evidence_id: best.e.id, value: best.e.value, period: best.e.period, age_days: best.age, status: 'PASS' });
      if (clash.length) { st.status = 'CONFLICT'; st.problems.push({ code: 'MG_CONFLICT', detail: `unrecorded conflict: ${[best, ...clash].map(x => `${x.e.id}=${x.e.value}`).join(' vs ')} for ${best.e.period}` }); }
    } else {
      // report the most recent candidate's problems (all of them), so the owner sees exactly what to fix
      const latest = evals.slice().sort((a, b) => String(b.e.period).localeCompare(String(a.e.period)))[0];
      Object.assign(st, { evidence_id: latest.e.id, value: latest.e.value, period: latest.e.period, age_days: latest.age, status: 'FAIL', problems: latest.p });
    }
    if (st.problems.length && (s.required || st.status === 'CONFLICT' || st.status === 'FAIL')) {
      // an optional statistic that is recorded must still be correct: a wrong or stale optional figure is not ignored
      for (const p of st.problems) R(p.code, s.key, p.detail);
      if (s.kind === 'fx') R('MG_FX', s.key, `FX reference not usable — ${m.fx.convention}`);
    }
    out.statistics.push(st);
  }
  // 8 — any open material conflict on the market or its districts blocks the gate
  const scope = [{ type: 'market', id: marketId }, ...dists.map(d => ({ type: 'district', id: d.id }))];
  for (const c of C('conflicts').filter(c => c.status === 'OPEN' && scope.some(s => sameRef(s, c.subject)))) R('MG_CONFLICT', c.id, `open conflict on ${c.subject.type} ${c.subject.id}${c.field ? ':' + c.field : ''}`);

  // 6 — legal / regulatory review: separate records per market and topic; evidence never substitutes for review
  for (const t of m.regulatory_review.topics) {
    const r = reviewState(m.regulatory_review, marketId, t.key, reviews, today);
    out.reviews.push({ topic: t.key, ok: r.ok, code: r.code, detail: r.detail, status: r.review ? r.review.status : null, outcome: r.review ? r.review.outcome : null, reference: r.review ? r.review.reference : null, reviewed_at: r.review ? r.review.reviewed_at : null, conditions: r.review && r.review.outcome === 'CONDITIONS' ? (r.review.conditions || []) : [] });
    if (!r.ok) R(r.code, t.key, r.detail);
  }
  // 9 — market-specific publication eligibility and restrictions
  out.publication = {
    categories: m.publication.categories, financial_figures: m.publication.financial_figures,
    conditions: out.reviews.filter(r => r.conditions.length).map(r => ({ topic: r.topic, conditions: r.conditions })),
    opportunity_requirements: (m.publication.opportunity_requirements || []).map(q => ({ key: q.key, name: q.name, applies_when: q.when || 'always', mode: q.mode, basis_review: q.basis_review || null }))
  };
  out.pass = reasons.length === 0;
  return out;
}

// Per-opportunity requirements of the market (e.g. DLD project registration, ADREC registration, TKGM title status).
// Evidence must be ESTABLISHED (CP-1), from an accepted registry/regulator source, and not expired (RP-1). A requirement
// with a basis review is waived only by a COMPLETE, valid review whose outcome is NOT_APPLICABLE; without the private
// review records (public validation) it always applies — fail closed.
export function opportunityRequirementReasons(cfg, marketId, project, collections, { today, reviews = null } = {}) {
  if (!cfg || cfg.error || !cfg.markets || !cfg.markets[marketId]) return [`market ${marketId} has no gate configuration`];
  const m = cfg.markets[marketId]; const why = [];
  const C = (k) => (collections && collections[k]) || [];
  for (const q of (m.publication && m.publication.opportunity_requirements) || []) {
    if (q.when && q.when.delivery_status && project.delivery_status && !q.when.delivery_status.includes(project.delivery_status)) continue;
    if (q.basis_review && reviews) {
      const r = reviewState(m.regulatory_review, marketId, q.basis_review, reviews, today);
      if (r.ok && r.review.outcome === 'NOT_APPLICABLE') continue;
    }
    const ok = C('evidence').some(e => {
      if (!sameRef(e.subject, { type: 'project', id: project.id }) || e.topic !== q.key) return false;
      if (claimPublication(e).status !== (q.claim_status || 'ESTABLISHED')) return false;
      const src = C('sources').find(s => s.id === e.source_id); if (!src) return false;
      const a = q.accepted_sources || {};
      if (a.source_types && !a.source_types.includes(src.source_type)) return false;
      if (a.max_tier && !(e.source_tier <= a.max_tier)) return false;
      if (a.publishers && !a.publishers.some(x => norm(x) === norm(src.publisher))) return false;
      if (!String(marketId).startsWith('FIX-') && (e.is_illustrative || src.is_illustrative)) return false;
      const f = evidenceFreshness(e, today, src.source_type);
      return f.state === 'CURRENT' || f.state === 'REVIEW_DUE';
    });
    if (!ok) why.push(`market requirement ${q.key} not evidenced (${q.name}; ESTABLISHED registry/regulator evidence required)`);
  }
  return why;
}

// Plain-text summary of one evaluation for the owner (private report).
export function gateMarkdown(g, cfg) {
  const m = cfg && cfg.markets && cfg.markets[g.market_id];
  const L = [`# Market gate — ${m ? m.name : g.market_id} (${g.market_id})`, '', `Gate ${g.gate_version} · engine ${g.engine_version} · evaluated ${g.evaluated_at}`, '', `**Result: ${g.pass ? 'PASS — eligible for owner activation decision' : 'FAIL — market stays INACTIVE'}**`, ''];
  if (g.reasons.length) { L.push('## Failure reasons', ''); for (const r of g.reasons) L.push(`- \`${r.code}\` ${r.item} — ${r.detail}`); L.push(''); }
  L.push('## Research blocks', '', '| Item | Closure | Completeness | Last reviewed | OK |', '|---|---|---|---|---|');
  for (const b of g.blocks) L.push(`| ${b.item} | ${b.research_closure ?? '—'} | ${b.data_completeness ?? '—'} | ${b.last_reviewed ?? '—'} | ${b.ok ? 'yes' : 'no'} |`);
  L.push('', '## Statistics', '', '| Key | Required | Status | Evidence | Period | Age (days) |', '|---|---|---|---|---|---|');
  for (const s of g.statistics) L.push(`| ${s.key} | ${s.required ? 'yes' : 'no'} | ${s.status} | ${s.evidence_id ?? '—'} | ${s.period ?? '—'} | ${s.age_days ?? '—'} |`);
  L.push('', '## Legal / regulatory review', '', '| Topic | Status | Outcome | Reference | OK |', '|---|---|---|---|---|');
  for (const r of g.reviews) L.push(`| ${r.topic} | ${r.status ?? 'none'} | ${r.outcome ?? '—'} | ${r.reference ?? '—'} | ${r.ok ? 'yes' : 'no'} |`);
  if (g.publication) {
    L.push('', '## Publication restrictions', '', `- Financial figures: ${g.publication.financial_figures}`, `- Categories: ${g.publication.categories.join(', ')}`);
    for (const q of g.publication.opportunity_requirements) L.push(`- Per opportunity: ${q.key} — ${q.name}${q.applies_when !== 'always' ? ` (when ${JSON.stringify(q.applies_when)})` : ''}`);
    for (const c of g.publication.conditions) L.push(`- Counsel conditions (${c.topic}): ${c.conditions.join('; ')}`);
  }
  L.push('', 'Research references are not legal approval. Activation requires an owner decision after this report.');
  return L.join('\n') + '\n';
}
