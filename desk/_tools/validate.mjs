#!/usr/bin/env node
// Nexus Desk data validator — schema v1.1, gate G3-v1.
// Zero dependencies (Node >= 18). Lives in an underscore folder, so GitHub Pages (Jekyll) does not publish it.
//
//   node desk/_tools/validate.mjs                    validate everything; exit 1 on any error
//   node desk/_tools/validate.mjs --write-index      also (re)write desk/data/public/published.json
//   node desk/_tools/validate.mjs --update-parent-manifest   ONLY in an approved parent-site commit
//
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { evidenceFreshness, claimPublication, isPublicClaim, deriveLastVerified, MATERIAL_FIELDS, IDENTITY_FIELDS, isIsoDate } from '../assets/js/policy.js';
import { loadGateConfig, evaluateMarketGate, opportunityRequirementReasons, certificateState } from './engines/marketgate.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
export const SCHEMA = JSON.parse(fs.readFileSync(path.join(HERE, '../_schema/schema-v1.1.json'), 'utf8'));
export const GATE_VERSION = SCHEMA['x-gate-version'];
const DEFS = SCHEMA.$defs;

export const COLLECTIONS = {
  categories: 'CAT', markets: 'MKT', districts: 'DST', areas: 'ARE', developers: 'DEV', projects: 'PRJ',
  assets: 'AST', opportunities: 'OPP', evidence: 'EVD', sources: 'SRC', conflicts: 'CNF', risks: 'RSK',
  research_blocks: 'RB', media: 'MED', disclosures: 'DSC'
};
const PREFIX_TO_COLL = Object.fromEntries(Object.entries(COLLECTIONS).map(([c, p]) => [p, c]));
const TYPE_TO_COLL = { market: 'markets', district: 'districts', area: 'areas', developer: 'developers', project: 'projects', asset: 'assets', opportunity: 'opportunities' };
const REVIEWABLE = new Set(['READY_FOR_REVIEW', 'PUBLISHED']);
const STRONG = new Set(['VERIFIED', 'CORROBORATED']);

// Fields that must be valued or carry an explicit missing-data state once a record is READY_FOR_REVIEW/PUBLISHED.
export const REQUIRED_AT_REVIEW = {
  projects: ['developer_id', 'district_id', 'delivery_status', 'expected_delivery'],
  developers: ['legal_entity_name'],
  assets: ['unit_type', 'gross_area_m2', 'net_area_m2', 'delivery_status'],
  opportunities: ['summary']
};

// Defence in depth on top of the schema allow-list: keys that must never appear in public data (D-03).
const DENY_KEY = /(^|_)(price|prices|yield|roi|irr|score|scores|rank|ranking|fair_value|cap_rate|appreciation|forecast|return|returns|commission|rent|rents|probability_pct)(_|$)/i;
const DENY_FIELD_PATH = /(price|rent|yield|roi|score|rank|fair_value|forecast|commission)/i;
const EMAIL = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i;
const PHONE = /(\+|\b00)\d[\d\s().-]{7,}\d/;

// ---------------------------------------------------------------- V16 free-text pricing / commercial terms (audit B2)
// Field names alone are not enough: a price can sit inside a claim, summary or description. These patterns look for
// money amounts (currency code/symbol/word next to a number), per-area prices, and commercial terms carrying a rate
// (yield, return, commission, discount, down payment, payment plan). Dates, dimensions, unit counts, percentages of
// construction progress and record identifiers are deliberately not matched (see the negative tests).
const NUM = String.raw`\d{1,3}(?:[.,   ]\d{3})+(?:[.,]\d+)?|\d+(?:[.,]\d+)?`;
const MAG = String.raw`(?:\s?(?:k|K|m|M|mn|mln|bn|b|B|million|billion|thousand|milyon|milyar|bin|mio\.?)\b)?`;
const CODE = String.raw`(?:USD|EUR|GBP|TRY|TL|AED|SAR|QAR|KWD|BHD|OMR|CHF|RUB|CNY|JPY|INR|Dhs?|DH)`;
const SYM = String.raw`(?:(?:US|C|A|NZ|HK|S)?\$|[€£₺₽¥﷼])`;
const MONEYWORD = String.raw`(?:dollars?|euros?|pounds sterling|sterling|lira|liras|dirhams?|riyals?|dolar|avro|sterlin)`;
const RATE = String.raw`(?:\d+(?:[.,]\d+)?\s?%|%\s?\d+(?:[.,]\d+)?|\d+(?:[.,]\d+)?\s?per ?cent)`;
const COMMERCIAL = String.raw`(?:yields?|returns?|ROI|IRR|cap rate|getiri(?:si)?|commissions?|komisyon(?:u)?|discounts?|indirim(?:i)?|down ?payments?|downpayments?|deposits?|peşinat|kapora|appreciation|değer artışı|rental income|kira geliri)`;
const PLAN = String.raw`(?:payment plans?|ödeme plan[ıi]|post-handover|installments?|instalments?|taksit(?:le)?)`;
const PRICEWORD = String.raw`(?:prices?|priced|pricing|asking|starting (?:from|at)|fiyat(?:ı|lar|ları)?|başlayan|rent(?:al)?s?|kira(?:sı)?)`;
const PRICE_PATTERNS = [
  ['currency symbol and amount', new RegExp(String.raw`${SYM}\s?(?:${NUM})${MAG}`, 'u')],
  ['currency code and amount', new RegExp(String.raw`(?<![A-Za-z])${CODE}\.?\s?(?:${NUM})${MAG}(?![A-Za-z0-9])`, 'u')],
  ['amount and currency code', new RegExp(String.raw`(?<![A-Za-z0-9])(?:${NUM})${MAG}\s?${CODE}(?![A-Za-z])`, 'u')],
  ['amount and currency symbol', new RegExp(String.raw`(?<![A-Za-z0-9])(?:${NUM})${MAG}\s?[€£₺₽¥﷼]`, 'u')],
  ['amount and currency word', new RegExp(String.raw`(?<![A-Za-z0-9])(?:${NUM})${MAG}\s?${MONEYWORD}\b`, 'iu')],
  ['price per area', new RegExp(String.raw`(?<![A-Za-z0-9])(?:${NUM})\s?(?:/|per)\s?(?:sq\.? ?ft|sqft|square (?:foot|feet|metres?|meters?)|m2|m²|sqm)(?![A-Za-z])`, 'iu')],
  ['commercial term with a rate', new RegExp(String.raw`${COMMERCIAL}\W{0,3}(?:\S+\s){0,3}?${RATE}|${RATE}\W{0,3}(?:\S+\s){0,3}?${COMMERCIAL}`, 'iu')],
  ['payment plan terms', new RegExp(String.raw`${PLAN}\W{0,3}(?:\S+\s){0,3}?(?:\d{1,2}\s?/\s?\d{1,2}|${RATE}|\d+\s?(?:months?|ay))|(?:\d{1,2}\s?/\s?\d{1,2}|\d+\s?(?:months?|ay))\W{0,3}(?:\S+\s){0,2}?${PLAN}`, 'iu')],
  ['price word and amount', new RegExp(String.raw`${PRICEWORD}\W{0,3}(?:\S+\s){0,3}?(?:\d{1,3}(?:[.,   ]\d{3})+|\d+(?:[.,]\d+)?\s?(?:k|K|m|M|mn|mln|bn|million|billion|thousand|milyon|milyar|bin)\b)`, 'iu')]
];
// paths whose strings are identifiers, links or hashes rather than prose (they are checked by other rules)
const NON_PROSE_PATH = /(\.(id|slug|sha256|public_path|source_url|url|evidence_ref|geo_code|series_id|base_period|period|retrieved_at|published_at|last_verified|accessed_at|approved_at|expires_at|depicted_date|expected_delivery|field|state|status|kind|type|role|unit|currency|area_basis|activation|record_status|category|key|legal_review|verification_status|evidence_class|tier|source_type|domain|topic|scope|media_type|content_category|risk_type|horizon|controllability|severity|probability|admin_level|delivery_status|research_closure|data_completeness|gate_version|approved_by|country)|_id|_ids\[\d+\]|_types?\[\d+\]|scope\[\d+\])$/;
export function commercialTextHits(text) {
  if (typeof text !== 'string' || !text) return [];
  const hits = [];
  for (const [label, re] of PRICE_PATTERNS) { const m = text.match(re); if (m) hits.push(`${label}: "${m[0].trim()}"`); }
  return hits;
}
export function recordCommercialHits(r) {
  const out = [];
  walk(r, (kind, v, at) => { if (kind === 'str' && !NON_PROSE_PATH.test(at)) for (const h of commercialTextHits(v)) out.push(`${at} — ${h}`); });
  return out;
}

// ---------------------------------------------------------------- minimal JSON Schema (2020-12 subset)
function typeOf(v) { return v === null ? 'null' : Array.isArray(v) ? 'array' : Number.isInteger(v) ? 'integer' : typeof v; }
function typeOk(t, v) { const a = typeOf(v); return t === a || (t === 'number' && a === 'integer'); }
function resolve(s) { return s && s.$ref ? DEFS[s.$ref.replace('#/$defs/', '')] : s; }
export function schemaErrors(schema, v, at = '$') {
  const s = resolve(schema); const errs = [];
  if (!s) return [`${at}: unknown schema`];
  if (s.oneOf) {
    const ok = s.oneOf.filter(x => schemaErrors(x, v, at).length === 0).length;
    if (ok !== 1) errs.push(`${at}: does not match exactly one allowed form`);
    return errs;
  }
  if ('const' in s && v !== s.const) errs.push(`${at}: must equal ${JSON.stringify(s.const)}`);
  if (s.enum && !s.enum.includes(v)) errs.push(`${at}: ${JSON.stringify(v)} not in [${s.enum.join(', ')}]`);
  if (s.type) {
    const ts = [].concat(s.type);
    if (!ts.some(t => typeOk(t, v))) { errs.push(`${at}: expected ${ts.join('|')}, got ${typeOf(v)}`); return errs; }
  }
  if (typeof v === 'string') {
    if (s.minLength && v.length < s.minLength) errs.push(`${at}: shorter than ${s.minLength}`);
    if (s.maxLength && v.length > s.maxLength) errs.push(`${at}: longer than ${s.maxLength}`);
    if (s.pattern && !new RegExp(s.pattern).test(v)) errs.push(`${at}: "${v}" does not match ${s.pattern}`);
    if (s.format === 'date' && !isDate(v)) errs.push(`${at}: "${v}" is not an ISO date (YYYY-MM-DD)`);
  }
  if (typeof v === 'number' && 'minimum' in s && v < s.minimum) errs.push(`${at}: below ${s.minimum}`);
  if (Array.isArray(v)) {
    if (s.minItems && v.length < s.minItems) errs.push(`${at}: needs at least ${s.minItems} items`);
    if (s.items) v.forEach((x, i) => errs.push(...schemaErrors(s.items, x, `${at}[${i}]`)));
  }
  if (typeOf(v) === 'object') {
    for (const r of s.required || []) if (!(r in v)) errs.push(`${at}: missing required "${r}"`);
    for (const [k, x] of Object.entries(v)) {
      if (s.properties && k in s.properties) errs.push(...schemaErrors(s.properties[k], x, `${at}.${k}`));
      else if (s.additionalProperties === false) errs.push(`${at}: "${k}" is not an allowed field`);
    }
  }
  return errs;
}
function isDate(v) { return /^\d{4}-\d{2}-\d{2}$/.test(v) && !Number.isNaN(Date.parse(v + 'T00:00:00Z')) && new Date(v + 'T00:00:00Z').toISOString().startsWith(v); }

// ---------------------------------------------------------------- helpers
const idRe = (p) => new RegExp(`^(FIX-)?${p}-[A-Z0-9]+(-[A-Z0-9]+)*$`);
const isEmpty = (v) => v === null || v === undefined || (Array.isArray(v) && v.length === 0) || v === '';
const sameRef = (a, b) => a && b && a.type === b.type && a.id === b.id;
function walk(v, fn, at = '$') {
  if (Array.isArray(v)) v.forEach((x, i) => walk(x, fn, `${at}[${i}]`));
  else if (v && typeof v === 'object') for (const [k, x] of Object.entries(v)) { fn('key', k, `${at}.${k}`); walk(x, fn, `${at}.${k}`); }
  else if (typeof v === 'string') fn('str', v, at);
}

// ---------------------------------------------------------------- dataset validation
// ds: { name: string, collections: { [collection]: record[] }, origin: { [id]: 'public'|'fixtures' } }
// opts: { mode: 'public'|'fixtures'|'private', today: 'YYYY-MM-DD', mediaCheck?: (rec)=>string[], methods?: {id: status},
//         marketGates?: { config, reviews?: [] | null, provenance?: {} | null } }
// marketGates (MG-1, owner decision D3) is always passed by the production callers (validateRepo, ingest runGate). With
// reviews (private store) the gate is computed for every real market; without them (public tree) the public record must
// carry the activation stamp review.gate_version = config.version, which only `activate-market` writes.
export function validateDataset(ds, opts) {
  const { mode, today } = opts;
  const errors = []; const E = (code, id, msg) => errors.push({ code, id, msg });
  const warnings = []; const W = (code, id, msg) => warnings.push({ code, id, msg });
  const C = (name) => ds.collections[name] || [];
  const byId = new Map();

  // V01/V02 — schema, IDs, uniqueness, illustrative flag consistent with prefix
  for (const [coll, prefix] of Object.entries(COLLECTIONS)) {
    for (const r of C(coll)) {
      const id = r && r.id;
      for (const m of schemaErrors({ $ref: `#/$defs/${coll}` }, r)) E('V00', id, `${coll}: ${m}`);
      if (typeof id !== 'string' || !idRe(prefix).test(id)) { E('V01', id, `${coll}: id must match ${prefix}-… (FIX- prefix for fixtures)`); continue; }
      if (byId.has(id)) E('V02', id, 'duplicate id');
      byId.set(id, { coll, r });
      const fix = id.startsWith('FIX-');
      if (fix !== (r.is_illustrative === true)) E('V01', id, 'is_illustrative must be true exactly when the id has the FIX- prefix');
      const origin = ds.origin ? ds.origin[id] : mode;
      if (origin === 'public' && fix) E('V04', id, 'illustrative record in public data');
      if (origin === 'fixtures' && !fix) E('V04', id, 'fixture file contains a non-FIX record');
    }
  }
  const get = (id) => byId.get(id);
  const refTo = (owner, id, coll, nullable = false) => {
    if (id === null || id === undefined) { if (!nullable) E('V03', owner, `missing reference to ${coll}`); return null; }
    const x = get(id);
    if (!x) { E('V03', owner, `unresolved reference ${id}`); return null; }
    if (x.coll !== coll) { E('V03', owner, `${id} is a ${x.coll} record, expected ${coll}`); return null; }
    if (ds.origin && ds.origin[owner] === 'public' && ds.origin[id] === 'fixtures') E('V04', owner, `public record references fixture ${id}`);
    return x.r;
  };
  const subj = (owner, ref, nullable = false) => {
    if (ref === null) { if (!nullable) E('V03', owner, 'missing subject'); return null; }
    if (!ref || !TYPE_TO_COLL[ref.type]) { E('V03', owner, 'invalid subject'); return null; }
    return refTo(owner, ref.id, TYPE_TO_COLL[ref.type]);
  };
  // lists like evidence_ids on X must point to records whose subject is X (no cross-record leakage)
  const ownList = (owner, ownerType, ids, coll) => (ids || []).forEach(i => {
    const t = refTo(owner, i, coll);
    if (t && t.subject && !sameRef(t.subject, { type: ownerType, id: owner })) E('V03', owner, `${i} belongs to ${t.subject.type} ${t.subject.id}, not to this record`);
  });

  // V03 — references
  for (const r of C('markets')) { ownList(r.id, 'market', r.research_block_ids, 'research_blocks'); ownList(r.id, 'market', r.evidence_ids, 'evidence'); }
  for (const r of C('districts')) { refTo(r.id, r.market_id, 'markets'); ownList(r.id, 'district', r.research_block_ids, 'research_blocks'); ownList(r.id, 'district', r.evidence_ids, 'evidence'); }
  for (const r of C('areas')) { refTo(r.id, r.market_id, 'markets'); refTo(r.id, r.district_id, 'districts', true); ownList(r.id, 'area', r.evidence_ids, 'evidence'); }
  for (const r of C('developers')) ownList(r.id, 'developer', r.evidence_ids, 'evidence');
  for (const r of C('projects')) {
    const m = refTo(r.id, r.market_id, 'markets'); refTo(r.id, r.developer_id, 'developers', true);
    const d = refTo(r.id, r.district_id, 'districts', true); const a = refTo(r.id, r.area_id, 'areas', true);
    if (d && d.market_id !== r.market_id) E('V03', r.id, 'district belongs to a different market');
    if (a && a.market_id !== r.market_id) E('V03', r.id, 'area belongs to a different market');
    if (m && m.category !== r.category) E('V03', r.id, 'project category differs from market category');
    ownList(r.id, 'project', r.research_block_ids, 'research_blocks'); ownList(r.id, 'project', r.evidence_ids, 'evidence'); ownList(r.id, 'project', r.risk_ids, 'risks');
  }
  for (const r of C('assets')) { refTo(r.id, r.project_id, 'projects'); ownList(r.id, 'asset', r.evidence_ids, 'evidence'); }
  for (const r of C('opportunities')) {
    const s = subj(r.id, r.subject); const m = refTo(r.id, r.market_id, 'markets');
    if (r.category === 'real_estate' && r.subject && r.subject.type !== 'project') E('V03', r.id, 'real_estate opportunity must have a project subject');
    if (s && s.category && s.category !== r.category) E('V03', r.id, 'opportunity category differs from its subject');
    if (s && s.market_id && s.market_id !== r.market_id) E('V03', r.id, 'opportunity market differs from its subject');
    if (m && m.category !== r.category) E('V03', r.id, 'opportunity category differs from market category');
    const a = refTo(r.id, r.asset_id, 'assets', true);
    if (a && r.subject && a.project_id !== r.subject.id) E('V03', r.id, 'asset belongs to a different project');
    (r.disclosure_ids || []).forEach(i => { const d = refTo(r.id, i, 'disclosures'); if (d && d.subject && !sameRef(d.subject, { type: 'opportunity', id: r.id }) && !sameRef(d.subject, r.subject)) E('V03', r.id, `${i} is a disclosure for another record`); });
    ownList(r.id, 'opportunity', r.evidence_ids, 'evidence'); ownList(r.id, 'opportunity', r.risk_ids, 'risks');
  }
  for (const r of C('evidence')) { subj(r.id, r.subject); refTo(r.id, r.source_id, 'sources'); (r.conflict_ids || []).forEach(i => refTo(r.id, i, 'conflicts')); }
  for (const r of C('conflicts')) { subj(r.id, r.subject); (r.evidence_ids || []).forEach(i => refTo(r.id, i, 'evidence')); }
  // records that belong to one project: the project, its developer, its assets and its opportunities
  const projectClosure = (ref) => {
    let pid = null;
    if (ref && ref.type === 'project') pid = ref.id;
    else if (ref && ref.type === 'opportunity') { const o = get(ref.id); pid = o && o.r.subject && o.r.subject.type === 'project' ? o.r.subject.id : null; }
    const p = pid && get(pid); if (!p || p.coll !== 'projects') return null;
    const out = new Set([`project:${pid}`]);
    if (p.r.developer_id) out.add(`developer:${p.r.developer_id}`);
    for (const a of C('assets')) if (a.project_id === pid) out.add(`asset:${a.id}`);
    for (const o of C('opportunities')) if (o.subject && o.subject.type === 'project' && o.subject.id === pid) out.add(`opportunity:${o.id}`);
    return out;
  };
  for (const r of C('risks')) {
    subj(r.id, r.subject);
    const cl = projectClosure(r.subject);
    (r.evidence_ids || []).forEach(i => { const e = refTo(r.id, i, 'evidence'); if (e && cl && e.subject && !cl.has(`${e.subject.type}:${e.subject.id}`)) E('V03', r.id, `${i} is evidence about ${e.subject.type} ${e.subject.id}, outside this risk's project`); });
  }
  for (const r of C('research_blocks')) subj(r.id, r.subject);
  for (const r of C('media')) { subj(r.id, r.subject); refTo(r.id, r.provenance && r.provenance.source_id, 'sources'); }
  for (const r of C('disclosures')) subj(r.id, r.subject, true);

  // W03 — possible duplicate identities. Records are linked only by stable IDs; equal names never merge records.
  // Two records that share a normalised name are reported so a person resolves the identity (ingestion refuses to
  // guess, see ingest.mjs "identity resolution"); they are not merged and not treated as an error, because distinct
  // entities can share a trading name.
  {
    const nk = (s) => String(s || '').normalize('NFKD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
    const dup = (coll, keyOf, what) => {
      const seen = new Map();
      for (const r of C(coll)) for (const k of keyOf(r).filter(Boolean)) {
        const p = seen.get(k);
        if (p && p !== r.id) W('W03', r.id, `possible duplicate identity: same ${what} as ${p}; records are not merged — confirm whether they are the same entity`);
        else seen.set(k, r.id);
      }
    };
    dup('developers', r => [...new Set([r.name && 'n:' + nk(r.name), r.legal_entity_name && 'l:' + nk(r.legal_entity_name)])], 'developer name or legal entity');
    dup('projects', r => [r.name && `${r.market_id}:${nk(r.name)}`], 'project name in this market');
    dup('districts', r => [r.name && `${r.market_id}:${nk(r.name)}`], 'district name in this market');
    dup('areas', r => [r.name && `${r.market_id}:${nk(r.name)}`], 'area name in this market');
  }

  // V05 — explicit missing-data states
  for (const [coll, recs] of Object.entries(ds.collections)) {
    const props = (DEFS[coll] && DEFS[coll].properties) || {};
    for (const r of recs) {
      const states = new Map((r.field_states || []).map(f => [f.field, f]));
      for (const f of states.keys()) {
        const top = f.split('.')[0];
        if (!(top in props)) E('V05', r.id, `field_states names unknown field "${f}"`);
        else if (!isEmpty(r[top])) E('V05', r.id, `"${f}" has a value and a missing-data state at the same time`);
      }
      if (REVIEWABLE.has(r.record_status) || (coll === 'assets' && false)) {
        for (const f of REQUIRED_AT_REVIEW[coll] || []) if (isEmpty(r[f]) && !states.has(f)) E('V05', r.id, `"${f}" is empty without an explicit missing-data state`);
      }
    }
  }

  // V06/V07 — evidence integrity
  for (const r of C('evidence')) {
    const src = get(r.source_id);
    if (src && src.r.tier !== r.source_tier) E('V06', r.id, 'source_tier differs from the source record tier');
    if (r.evidence_class === 'DATA NOT AVAILABLE' && r.value !== null) E('V06', r.id, 'DATA NOT AVAILABLE evidence cannot carry a value');
    if (typeof r.value === 'number' && (r.unit === null || r.period === null)) E('V06', r.id, 'numeric value requires unit and period');
    if (r.unit === 'm2' && !r.area_basis) E('V06', r.id, 'area value requires area_basis (GROSS or NET)');
    if (r.unit === 'index' && (!r.series_id || !r.base_period)) E('V06', r.id, 'index value requires series_id and base_period');
    if (r.source_tier === 4 && STRONG.has(r.verification_status)) E('V07', r.id, 'Tier 4 evidence cannot be VERIFIED/CORROBORATED on its own');
    if (r.field && r.subject && TYPE_TO_COLL[r.subject.type]) {
      const props = DEFS[TYPE_TO_COLL[r.subject.type]].properties;
      if (!(r.field.split('.')[0] in props)) E('V06', r.id, `field "${r.field}" does not exist on ${r.subject.type}`);
    }
    for (const c of r.conflict_ids || []) { const cf = get(c); if (cf && !(cf.r.evidence_ids || []).includes(r.id)) E('V10', r.id, `${c} does not list this evidence`); }
    // V18 — dates are real calendar dates and never in the future (deterministic: "today" is passed in)
    for (const k of ['retrieved_at', 'last_verified', 'published_at']) if (r[k] && isIsoDate(r[k]) && r[k] > today) E('V18', r.id, `${k} ${r[k]} is in the future (today ${today})`);
    if (r.last_verified && r.retrieved_at && isIsoDate(r.last_verified) && isIsoDate(r.retrieved_at) && r.last_verified < r.retrieved_at) E('V18', r.id, 'last_verified is earlier than retrieved_at');
    if (mode === 'public' || (ds.origin && ds.origin[r.id] === 'public')) {
      // V20 — claim policy CP-1: unverified, hypothesis or Tier 4 evidence is never public
      const cp = claimPublication(r); if (cp.status === 'NOT_PUBLIC') E('V20', r.id, `evidence not publishable (${cp.reason}); it must stay in the private store`);
      if (r.currency !== null) E('V08', r.id, 'currency amounts are not publishable in the MVP');
      if (r.field && DENY_FIELD_PATH.test(r.field)) E('V08', r.id, `evidence for "${r.field}" is not publishable in the MVP`);
    }
  }
  // V09 — risks: no unsupported qualitative judgement
  const sevActive = !!(opts.methods && opts.methods['M-RISK-SEVERITY'] === 'ACTIVE');
  // market gate (D3, MG-1): implemented as a shared engine with per-market configuration, INACTIVE until the owner approves
  // the rules. Fail closed: unless the registry passed in says ACTIVE, no real market can be activated and no opportunity
  // in a real market is eligible; once ACTIVE, each real market must pass its own computed gate (see marketGates).
  // Illustrative fixture markets (FIX-) simulate an activated market for the local development view only.
  const marketGateOn = !!(opts.methods && opts.methods['M-MARKET-GATE'] === 'ACTIVE');
  const MG = opts.marketGates || null;
  const gateResults = {};
  // private store (research and review records available): the full gate. Public tree (PUB-2): market research and
  // statutory reviews are never public, so the gate is attested by the market's activation stamp and gate certificate,
  // including its validity horizon (D11/D12).
  const privateGate = !!(MG && Array.isArray(MG.reviews));
  const gateFor = (id) => {
    if (!MG || !MG.config || MG.config.error) return null;
    if (!(id in gateResults)) {
      if (privateGate) gateResults[id] = evaluateMarketGate(MG.config, id, ds.collections, { today, reviews: MG.reviews, provenance: MG.provenance || null });
      else {
        const mk = C('markets').find(x => x.id === id); const c = mk ? certificateState(MG.config, mk, today) : { ok: false, code: 'MG_SCOPE', detail: 'market record not found' };
        gateResults[id] = { gate_version: MG.config.version, pass: c.ok, reasons: c.ok ? [] : [{ code: c.code, item: id, detail: c.detail }] };
      }
    }
    return gateResults[id];
  };
  const stampOk = (m) => !!(MG && MG.config && !MG.config.error && MG.config.markets && MG.config.markets[m.id] && m.review && m.review.gate_version === MG.config.version);
  const certOk = (m) => !!(stampOk(m) && m.gate_certificate && m.gate_certificate.gate_version === MG.config.version && m.gate_certificate.engine_version && m.gate_certificate.activated_at);
  for (const r of C('risks')) {
    if ((r.probability !== null || r.severity !== null) && isEmpty(r.evidence_ids)) E('V09', r.id, 'severity/probability requires supporting evidence');
    const isPublic = ds.origin ? ds.origin[r.id] === 'public' : mode === 'public';
    if (isPublic && !sevActive && (r.probability !== null || r.severity !== null)) E('V09', r.id, 'severity/likelihood method (M-RISK-SEVERITY) is inactive; public risks must leave severity and probability null');
  }
  // V10 — conflicts are coherent
  for (const r of C('conflicts')) for (const i of r.evidence_ids || []) {
    const e = get(i); if (!e) continue;
    if (!sameRef(e.r.subject, r.subject) || e.r.field !== r.field) E('V10', r.id, `${i} is about a different subject/field`);
    if (!(e.r.conflict_ids || []).includes(r.id)) E('V10', r.id, `${i} does not reference this conflict`);
  }
  // research blocks unique per subject+domain
  // V22 — PUB-2 public minimisation (owner instruction 28 Oct 2026): market and district research (named statistics,
  // research notes, gate inputs) is used for analysis in the private store and never published; the public tree carries
  // only the market and district records, the market's activation stamp and its gate certificate.
  for (const c of ['evidence', 'research_blocks', 'conflicts']) for (const r of C(c)) {
    const isPublic = ds.origin ? ds.origin[r.id] === 'public' : mode === 'public';
    if (isPublic && r.subject && ['market', 'district'].includes(r.subject.type)) E('V22', r.id, `${c} on ${r.subject.type} ${r.subject.id} is private research (PUB-2); it stays in the private store`);
  }
  { const seen = new Set(); for (const r of C('research_blocks')) { const k = `${r.subject && r.subject.type}:${r.subject && r.subject.id}:${r.domain}`; if (seen.has(k)) E('V15', r.id, `second research block for ${k}`); seen.add(k); } }

  // V08/V14 — deny-list keys and personal data, everywhere
  for (const recs of Object.values(ds.collections)) for (const r of recs) walk(r, (kind, v, at) => {
    if (kind === 'key' && DENY_KEY.test(v)) E('V08', r.id, `forbidden key "${v}" at ${at}`);
    if (kind === 'str' && !/\.(sha256|id|public_path|width|height)$/.test(at) && (EMAIL.test(v) || PHONE.test(v))) E('V14', r.id, `possible personal data at ${at}`);
  });
  // V16 — prices and commercial terms hidden in free text. Public records: hard error. Private/fixture stores: computed
  // per record here and turned into a gate reason below, so approval is refused before anything is exported.
  const commercialHits = new Map();
  for (const recs of Object.values(ds.collections)) for (const r of recs) {
    if (!r || !r.id) continue;
    const hits = recordCommercialHits(r);
    if (!hits.length) continue;
    commercialHits.set(r.id, hits);
    const isPublic = ds.origin ? ds.origin[r.id] === 'public' : mode === 'public';
    if (isPublic) for (const h of hits) E('V16', r.id, `price or commercial term in free text at ${h}`);
  }
  // V17 — a disclosure marked APPROVED must carry its approval date
  for (const r of C('disclosures')) if (r.legal_review === 'APPROVED' && !r.approved_at) E('V17', r.id, 'APPROVED disclosure without approved_at');

  // V11 — media integrity (file checks delegated)
  const hashOwner = new Map();
  for (const r of C('media')) {
    if (!r.subject || !r.file) continue;
    const fix = r.id.startsWith('FIX-');
    const base = fix ? 'desk/_fixtures/media' : 'desk/media';
    const ext = fix ? '(svg|webp|jpg|jpeg|png|avif)' : '(webp|jpg|jpeg|png|avif)';
    const expect = new RegExp(`^${base}/${r.subject.id}/${r.id}\\.${ext}$`);
    if (!expect.test(r.file.public_path)) E('V11', r.id, `file must be ${base}/${r.subject.id}/${r.id}.<ext>`);
    if (['PHOTO', 'CONSTRUCTION_PROGRESS'].includes(r.media_type) && !r.depicted_date) E('V11', r.id, 'photos and construction progress need depicted_date');
    if (r.attribution && r.attribution.required && !r.attribution.text) E('V11', r.id, 'attribution required but no text');
    if (r.permission && r.permission.status === 'GRANTED_WRITTEN' && !r.permission.evidence_ref) E('V11', r.id, 'GRANTED_WRITTEN needs an evidence_ref to the private permission record');
    if (/^0+$/.test(r.file.sha256)) { E('V11', r.id, 'media not yet processed'); continue; }
    const prev = hashOwner.get(r.file.sha256);
    if (prev && prev.subject !== r.subject.id) E('V11', r.id, `same image file as ${prev.id} of ${prev.subject}`);
    else if (prev) E('V11', r.id, `duplicate image file (same as ${prev.id})`);
    hashOwner.set(r.file.sha256, { id: r.id, subject: r.subject.id });
    if (opts.mediaCheck) for (const m of opts.mediaCheck(r)) E('V11', r.id, m);
  }

  // ------------------------------------------------ eligibility (computed, never hand-set)
  const errIds = new Set(errors.map(e => e.id));
  // written project permissions (sales-office e-mails), private store only. When the caller passes them (ingest runGate
  // for a real store), each permission is honoured only within its own channels, activities, media and dates.
  const PERMS = Array.isArray(opts.permissions) ? opts.permissions : null;
  const permProblems = (projectId, id, activity) => projectPermissionProblems(PERMS, projectId, id, activity, today);
  const mediaReasons = (r) => {
    const why = [];
    if (r.is_illustrative) why.push('illustrative');
    if (r.permission && r.permission.status === 'REVOKED') why.push('permission revoked');
    if (!r.permission || r.permission.status !== 'GRANTED_WRITTEN') why.push('no written permission');
    else if (!r.permission.evidence_ref) why.push('no permission evidence reference');
    if (!r.permission || !(r.permission.scope || []).includes('desk_web')) why.push('permission scope excludes desk_web');
    if (r.permission && r.permission.expires_at && r.permission.expires_at < today) why.push('permission expired');
    if (PERMS && r.permission && r.permission.status === 'GRANTED_WRITTEN' && r.permission.evidence_ref && r.subject) for (const w of permProblems(r.subject.id, r.permission.evidence_ref, 'PUBLISH_MEDIA')) why.push(`permission record: ${w}`);
    if (r.attribution && r.attribution.required && !r.attribution.text) why.push('attribution missing');
    if (!r.review) why.push('not reviewed');
    if (errIds.has(r.id)) why.push('validation errors');
    return why;
  };
  const media = {};
  for (const r of C('media')) media[r.id] = mediaReasons(r);

  const pr0 = (r) => r.subject && get(r.subject.id) ? get(r.subject.id).r : null;
  const lastVerifiedFor = (r) => {
    const pr = pr0(r); if (!pr) return null;
    const dv = pr.developer_id && get(pr.developer_id) ? get(pr.developer_id).r : null; const as = r.asset_id && get(r.asset_id) ? get(r.asset_id).r : null;
    return deriveLastVerified([{ type: 'project', rec: pr }, { type: 'developer', rec: dv }, { type: 'asset', rec: as }], C('evidence'));
  };
  const opp = {}; const oppCodes = {};
  for (const r of C('opportunities')) {
    const why = []; const fresh = new Set(); // freshness reasons block new publication; for published records see W01
    const codes = []; const P = (code, msg) => { why.push(msg); codes.push({ code, msg }); return msg; }; // OPC-2: structured reason codes
    const allowFix = mode === 'fixtures';
    if (r.is_illustrative && !allowFix) P('ILLUSTRATIVE', 'illustrative');
    if (!REVIEWABLE.has(r.record_status)) P('RECORD_STATUS', `record_status ${r.record_status}`);
    if (!r.review || r.review.gate_version !== GATE_VERSION) P('NO_OWNER_REVIEW', `no ${GATE_VERSION} review`);
    const m = get(r.market_id); const cat = C('categories').find(c => c.key === r.category);
    if (!m || m.r.activation !== 'ACTIVE') P('MARKET_INACTIVE', 'market inactive');
    if (m && !String(m.r.id).startsWith('FIX-') && !marketGateOn) P('MARKET_GATE_NOT_APPROVED', 'market gate not approved (M-MARKET-GATE is INACTIVE pending owner approval)');
    if (m && !String(m.r.id).startsWith('FIX-') && marketGateOn && MG) {
      const g = gateFor(m.r.id);
      if (!g) P('MARKET_GATE_CONFIG', `market ${m.r.id}: market-gate configuration unavailable`);
      else if (!g.pass) {
        // public tree: a market whose public evidence has aged out blocks NEW publication; already-published records only
        // warn (W01), as for opportunity evidence (D4). In the private store the full gate decides.
        const w = `market gate ${g.gate_version} ${privateGate ? 'fails' : 'certificate is no longer current'} for ${m.r.id} (${[...new Set(g.reasons.map(x => x.code))].join(', ')})`;
        P('MARKET_GATE_FAILS', w); if (!privateGate) fresh.add(w);
      }
      if (!privateGate && !certOk(m.r)) P('MARKET_NOT_ACTIVATED', `market ${m.r.id} has no ${MG.config && MG.config.version || 'market-gate'} activation stamp and gate certificate`);
    }
    if (!cat || cat.activation !== 'ACTIVE') P('CATEGORY_INACTIVE', 'category inactive');
    const p = r.subject && get(r.subject.id); const pr = p && p.r;
    if (!pr) P('SUBJECT_MISSING', 'subject missing');
    else {
      if (!REVIEWABLE.has(pr.record_status) || !pr.review) P('SUBJECT_NOT_REVIEWED', 'subject not reviewed');
      const strong = (subject, field) => C('evidence').some(e => sameRef(e.subject, subject) && e.field === field && claimPublication(e).status === 'ESTABLISHED');
      if (!strong({ type: 'project', id: pr.id }, 'name')) P('IDENTITY_UNVERIFIED', 'project identity not verified (Tier 1–3)');
      const dv = pr.developer_id && get(pr.developer_id);
      if (!dv || !dv.r.legal_entity_name || !strong({ type: 'developer', id: dv.r.id }, 'legal_entity_name')) P('DEVELOPER_UNVERIFIED', 'developer legal entity not verified');
      // Spec v1 §8 developer gate: the project–developer relationship itself must be verified, not only the developer
      if (dv && !strong({ type: 'project', id: pr.id }, 'developer_id')) P('RELATIONSHIP_UNVERIFIED', 'project–developer relationship not verified (Tier 1–3)');
      const subjects = [{ type: 'project', id: pr.id }, { type: 'opportunity', id: r.id }].concat(pr.developer_id ? [{ type: 'developer', id: pr.developer_id }] : []).concat(r.asset_id ? [{ type: 'asset', id: r.asset_id }] : []);
      if (C('conflicts').some(c => c.status === 'OPEN' && subjects.some(s => sameRef(s, c.subject)))) P('OPEN_CONFLICT', 'open conflict');
      for (const d of ['PROJECT_ASSET', 'DEVELOPER', 'RISK']) if (!C('research_blocks').some(b => sameRef(b.subject, { type: 'project', id: pr.id }) && b.domain === d)) P('RESEARCH_BLOCK_MISSING', `no ${d} research block`);
      if (isEmpty(pr.risk_ids) && isEmpty(r.risk_ids)) P('NO_RISK', 'no documented risk');
      if (PERMS) for (const w of permProblems(pr.id, null, 'PUBLISH_PROJECT_INFORMATION')) P('PROJECT_PERMISSION', `project permission: ${w}`);
      // claim policy CP-1 and review policy RP-1 for every material field that carries a value
      const recs = [{ type: 'project', rec: pr }, { type: 'developer', rec: pr.developer_id && get(pr.developer_id) ? get(pr.developer_id).r : null }, { type: 'asset', rec: r.asset_id && get(r.asset_id) ? get(r.asset_id).r : null }];
      for (const { type, rec } of recs) if (rec) for (const f of MATERIAL_FIELDS[type]) {
        // a rendered field without a value must say why ("No evidence linked" / "Not recorded" is not a control)
        if (isEmpty(rec[f])) { if (!(rec.field_states || []).some(s => s.field === f)) P('FIELD_STATE_MISSING', `${rec.id}:${f} is empty without an explicit missing-data state`); continue; }
        const evs = C('evidence').filter(e => sameRef(e.subject, { type, id: rec.id }) && e.field === f);
        const pub = evs.filter(isPublicClaim);
        if (!(IDENTITY_FIELDS[type] || []).includes(f) && !pub.length) { P('EVIDENCE_NOT_PUBLISHABLE', `${rec.id}:${f} has no publishable evidence (${evs.length ? 'unverified or Tier 4 only' : 'no evidence'})`); continue; }
        if (!pub.length) continue; // identity fields are reported above
        const fr = pub.map(e => evidenceFreshness(e, today, get(e.source_id) ? get(e.source_id).r.source_type : null));
        if (fr.every(x => x.state === 'EXPIRED' || x.state === 'INVALID')) { const w = `${rec.id}:${f} evidence ${fr.some(x => x.state === 'EXPIRED') ? 'expired' : 'has no valid date'} — re-review required`; P('EVIDENCE_EXPIRED', w); fresh.add(w); }
        else if (fr.every(x => x.state !== 'CURRENT')) W('W02', r.id, `${rec.id}:${f} evidence review due`);
      }
      const mine = C('media').filter(x => subjects.slice(0, 2).some(s => sameRef(s, x.subject)));
      const ok = mine.filter(x => media[x.id].length === 0 || (allowFix && media[x.id].every(w => w === 'illustrative')));
      const covers = ok.filter(x => x.role === 'cover').length;
      if (covers !== 1) P('MEDIA_COVER', covers ? 'more than one cover' : 'no publishable cover');
      if (!ok.some(x => x.role === 'gallery')) P('MEDIA_GALLERY', 'no publishable gallery image');
      if ([pr.id, r.id, r.asset_id, pr.developer_id].some(i => i && errIds.has(i))) P('VALIDATION_ERRORS', 'validation errors');
      // free-text pricing anywhere in what this opportunity would publish (audit B2)
      const closure = new Set([r.id, pr.id, pr.developer_id, pr.district_id, pr.area_id, r.asset_id].filter(Boolean));
      for (const c of ['evidence', 'risks', 'conflicts', 'research_blocks', 'media', 'disclosures']) for (const x of C(c)) if (x.subject && subjects.some(s => sameRef(s, x.subject))) closure.add(x.id);
      for (const i of r.disclosure_ids || []) closure.add(i);
      for (const i of closure) if (commercialHits.has(i)) P('COMMERCIAL_TERM', `${i} has a price or commercial term in free text`);
      // market-specific per-opportunity requirements (MG-1 publication rules: registration, permits, title status)
      if (m && !String(m.r.id).startsWith('FIX-') && MG && marketGateOn) for (const w of opportunityRequirementReasons(MG.config, m.r.id, pr, ds.collections, { today, reviews: Array.isArray(MG.reviews) ? MG.reviews : null, certificate: m.r.gate_certificate || null })) P('MARKET_REQUIREMENT', w);
    }
    // every applicable disclosure must be legally approved — one approved notice never covers a pending one (audit B1)
    for (const d of applicableDisclosures(C('disclosures'), r)) {
      if (d.legal_review !== 'APPROVED') P('DISCLOSURE_PENDING', `disclosure ${d.id} (${d.kind}) legal review pending`);
      else if (!d.approved_at) P('DISCLOSURE_UNDATED', `disclosure ${d.id} approved without a date`);
      if (!(r.disclosure_ids || []).includes(d.id)) P('DISCLOSURE_UNLINKED', `disclosure ${d.id} applies to this opportunity but is not linked to it`);
    }
    for (const i of r.disclosure_ids || []) if (!get(i) || get(i).coll !== 'disclosures') P('DISCLOSURE_MISSING', `linked disclosure ${i} is missing`);
    if (!(r.disclosure_ids || []).length) P('NO_DISCLOSURE', 'no disclosure recorded');
    opp[r.id] = why; oppCodes[r.id] = codes;
    const hard = why.filter(w => !fresh.has(w));
    if (r.record_status === 'PUBLISHED' && hard.length) E('V12', r.id, `PUBLISHED but not eligible: ${hard.join('; ')}`);
    // owner decision D4 is open: ageing evidence does not withdraw a published opportunity automatically
    if (r.record_status === 'PUBLISHED') for (const w of why.filter(x => fresh.has(x))) W('W01', r.id, `published, but ${w}`);
    // V19 — "last verified" must come from evidence verification dates, never from the approval date
    if (pr0(r) && ['public', 'fixtures'].includes(ds.origin ? ds.origin[r.id] : mode)) {
      const want = lastVerifiedFor(r);
      if ((r.last_verified ?? null) !== want) E('V19', r.id, `last_verified ${r.last_verified ?? 'null'} does not match the evidence (${want ?? 'null'}); it is derived, never the approval date`);
    }
  }
  for (const r of C('markets')) {
    if (r.record_status === 'PUBLISHED' && (!r.review || r.activation !== 'ACTIVE')) E('V12', r.id, 'market PUBLISHED requires activation ACTIVE and a review');
    // V21 — fail closed: no real market may be active or published while the market gate is not operational
    const live = r.activation === 'ACTIVE' || r.record_status === 'PUBLISHED';
    if (!marketGateOn && !String(r.id).startsWith('FIX-') && live) E('V21', r.id, 'market activation/publication requires the market gate (M-MARKET-GATE), which is not approved by the owner; markets stay INACTIVE');
    // MG-1: a real market is never ACTIVE while its computed gate fails (store), nor without the activation stamp (public)
    if (marketGateOn && MG && !String(r.id).startsWith('FIX-') && live) {
      const g = gateFor(r.id);
      if (g && !g.pass && privateGate) E('V21', r.id, `market is ${r.activation}/${r.record_status} but its computed gate ${g.gate_version} fails: ${g.reasons.map(x => `${x.code} ${x.item}`).join('; ')}`);
      // public tree: ageing market evidence must not block every later deployment (including a withdrawal), so it warns
      if (g && !g.pass && !privateGate && g.reasons.some(x => x.code === 'MG_CERT_EXPIRED' || x.code === 'MG_CERT_INVALID')) W('W04', r.id, `active market whose gate certificate is no longer current (${g.reasons.map(x => x.detail).join('; ')}); new opportunities are blocked until the owner re-runs the gate in the store (activate-market, export-market) or deactivates the market`);
      if (!stampOk(r)) E('V21', r.id, `market is ${r.activation}/${r.record_status} without the ${MG.config && MG.config.version || 'market-gate'} activation stamp (review.gate_version); only activate-market may activate a market`);
      else if (!r.gate_certificate || r.gate_certificate.gate_version !== MG.config.version) E('V21', r.id, `market is ${r.activation}/${r.record_status} without a ${MG.config.version} gate certificate; only activate-market writes it`);
    }
  }
  for (const r of C('opportunities')) {
    const m = get(r.market_id);
    if (m && m.r.activation === 'INACTIVE' && r.record_status === 'PUBLISHED') E('V13', r.id, 'opportunity published in an inactive market');
  }
  return { errors, warnings, eligibility: { opportunities: opp, reasons: oppCodes, media } };
}

// Written project permission check (sales-office e-mail records, private store): honoured only within its own
// activities, channels and dates. Returns [] when at least one matching record is valid.
export function projectPermissionProblems(perms, projectId, id, activity, today, channel = 'desk_web') {
  const recs = (perms || []).filter(x => x.project_id === projectId && (!id || x.id === id));
  if (!recs.length) return [id ? `permission record ${id} not found for ${projectId}` : `no written project permission from the sales office recorded for ${projectId}`];
  const why = [];
  for (const x of recs) {
    const w = [];
    if (x.status !== 'GRANTED_WRITTEN' || x.revoked_at) w.push(`${x.id} revoked`);
    if (!(x.activities || []).includes(activity)) w.push(`${x.id} does not authorize ${activity}`);
    if (!(x.channels || []).includes(channel)) w.push(`${x.id} does not name the Desk website (${channel}) as a channel`);
    if (!isIsoDate(x.granted_at) || x.granted_at > today) w.push(`${x.id} has no valid grant date`);
    if (x.valid_until && x.valid_until < today) w.push(`${x.id} expired on ${x.valid_until}`);
    if (!w.length) return [];
    why.push(...w);
  }
  return why;
}

// Disclosures that apply to an opportunity: those it links, plus any recorded against the opportunity itself or its
// project subject (so an unlinked pending disclosure cannot be silently left out).
export function applicableDisclosures(disclosures, opp) {
  const out = new Map();
  for (const d of disclosures || []) {
    if (!d || !d.id) continue;
    if ((opp.disclosure_ids || []).includes(d.id) || sameRef(d.subject, { type: 'opportunity', id: opp.id }) || (opp.subject && sameRef(d.subject, opp.subject))) out.set(d.id, d);
  }
  return [...out.values()];
}

// ---------------------------------------------------------------- repository-level checks
const PUBLIC_EXT = new Set(['.html', '.css', '.js', '.mjs', '.json', '.svg', '.webp', '.jpg', '.jpeg', '.png', '.avif', '.woff2', '.ico', '.txt', '.xml', '.webmanifest']);
function listFiles(dir, base = dir, skip = () => false) {
  if (!fs.existsSync(dir)) return [];
  const out = [];
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name); const rel = path.relative(base, p).split(path.sep).join('/');
    if (skip(rel, e)) continue;
    if (e.isDirectory()) out.push(...listFiles(p, base, skip)); else out.push(rel);
  }
  return out;
}
const sha256 = (buf) => crypto.createHash('sha256').update(buf).digest('hex');
export function imageSize(buf) {
  if (buf.slice(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return { w: buf.readUInt32BE(16), h: buf.readUInt32BE(20) };
  if (buf.toString('ascii', 0, 4) === 'RIFF' && buf.toString('ascii', 8, 12) === 'WEBP') {
    const t = buf.toString('ascii', 12, 16);
    if (t === 'VP8X') return { w: 1 + buf.readUIntLE(24, 3), h: 1 + buf.readUIntLE(27, 3) };
    if (t === 'VP8 ') return { w: buf.readUInt16LE(26) & 0x3fff, h: buf.readUInt16LE(28) & 0x3fff };
    if (t === 'VP8L') { const b = buf.readUInt32LE(21); return { w: (b & 0x3fff) + 1, h: ((b >> 14) & 0x3fff) + 1 }; }
  }
  if (buf[0] === 0xff && buf[1] === 0xd8) {
    let i = 2;
    while (i < buf.length) {
      if (buf[i] !== 0xff) { i++; continue; }
      const m = buf[i + 1]; const len = buf.readUInt16BE(i + 2);
      if (m >= 0xc0 && m <= 0xcf && ![0xc4, 0xc8, 0xcc].includes(m)) return { w: buf.readUInt16BE(i + 7), h: buf.readUInt16BE(i + 5) };
      i += 2 + len;
    }
  }
  if (buf.toString('utf8', 0, 200).includes('<svg')) {
    const m = buf.toString('utf8').match(/viewBox="0 0 (\d+) (\d+)"/); if (m) return { w: +m[1], h: +m[2] };
  }
  return null;
}
function hasExif(buf) {
  if (buf[0] === 0xff && buf[1] === 0xd8) return buf.indexOf(Buffer.from('Exif\0\0')) !== -1;
  if (buf.toString('ascii', 0, 4) === 'RIFF') return buf.indexOf(Buffer.from('EXIF')) !== -1;
  if (buf.slice(1, 4).toString() === 'PNG') return buf.indexOf(Buffer.from('eXIf')) !== -1;
  return false;
}

function readCollections(dir, origin, errors) {
  const out = {}; const originMap = {};
  for (const f of listFiles(dir).filter(f => f.endsWith('.json'))) {
    if (f === 'published.json') continue;
    let j; try { j = JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8')); } catch (e) { errors.push({ code: 'F01', id: f, msg: `invalid JSON: ${e.message}` }); continue; }
    for (const m of schemaErrors(SCHEMA, j)) errors.push({ code: 'F01', id: f, msg: m });
    const name = path.basename(f, '.json');
    if (!(name in COLLECTIONS)) { errors.push({ code: 'F02', id: f, msg: 'unexpected data file' }); continue; }
    if (j.collection !== name) errors.push({ code: 'F01', id: f, msg: `collection "${j.collection}" does not match file name` });
    out[name] = Array.isArray(j.records) ? j.records : [];
    for (const r of out[name]) if (r && r.id) originMap[r.id] = origin;
  }
  return { collections: out, origin: originMap };
}

export function validateRepo(root, { today = new Date().toISOString().slice(0, 10), writeIndex = false, updateParentManifest = false, inTransaction = false } = {}) {
  const errors = []; const report = {};
  const desk = path.join(root, 'desk');
  const pubDir = path.join(desk, 'data/public'); const fixDir = path.join(desk, '_fixtures/data');

  // F04 — fixtures/tooling exclusion relies on Jekyll ignoring "_" folders
  if (fs.existsSync(path.join(root, '.nojekyll'))) errors.push({ code: 'F04', id: '.nojekyll', msg: '.nojekyll would publish desk/_fixtures and desk/_tools; remove it or move fixtures out of the site tree' });
  if (fs.existsSync(path.join(root, '_config.yml')) && /include\s*:/.test(fs.readFileSync(path.join(root, '_config.yml'), 'utf8'))) errors.push({ code: 'F04', id: '_config.yml', msg: 'Jekyll include: list could publish underscore folders' });

  // F07 — no interrupted write may be committed: a transaction journal or a temporary file means a write did not finish
  // (inTransaction: the export's own final check runs while its journal is still open; the journal itself is expected)
  for (const f of listFiles(desk, desk)) if (!(inTransaction && (f.startsWith('_txn/') || f === '_lock.json')) && (f.split('/').includes('_txn') || f.endsWith('.desk-tmp') || f.split('/').pop() === '_lock.json')) errors.push({ code: 'F07', id: `desk/${f}`, msg: 'interrupted write left behind; run `node desk/_tools/ingest.mjs recover --store <store>` before validating or committing' });

  // F06 — only web-safe file types in the deployed part of desk/
  const deployed = listFiles(desk, desk, (rel) => rel.split('/')[0].startsWith('_'));
  for (const f of deployed) {
    const ext = path.extname(f).toLowerCase();
    if (!PUBLIC_EXT.has(ext) && !['.gitkeep', '.gitignore'].includes(path.basename(f))) errors.push({ code: 'F06', id: `desk/${f}`, msg: `file type ${ext || '(none)'} not allowed in the published tree (contracts, sheets, docs belong in the private store)` });
    if (/\.(html|json|svg|css)$/.test(f) && !f.startsWith('assets/js/')) {
      const t = fs.readFileSync(path.join(desk, f), 'utf8');
      if (/\bFIX-[A-Z]{2,3}-/.test(t)) errors.push({ code: 'F03', id: `desk/${f}`, msg: 'fixture id found in the published tree' });
    }
  }

  // M01 — method registry: nothing undocumented or unvalidated can be active
  let methods = {};
  try {
    const reg = JSON.parse(fs.readFileSync(path.join(desk, 'data/methods.json'), 'utf8'));
    for (const m of reg.methods) {
      methods[m.id] = m.status;
      if (!['ACTIVE', 'INACTIVE'].includes(m.status)) errors.push({ code: 'M01', id: m.id, msg: 'status must be ACTIVE or INACTIVE' });
      if (m.status === 'ACTIVE' && (!m.documented || !['RULES_APPROVED', 'VALIDATED'].includes(m.validation_status))) errors.push({ code: 'M01', id: m.id, msg: 'active method must be documented and approved/validated' });
      if (m.status === 'ACTIVE' && m.publication === 'PROHIBITED_IN_MVP') errors.push({ code: 'M01', id: m.id, msg: 'method prohibited in the MVP cannot be active' });
      // registry semantics (28 Oct 2026): publication is one of a closed set; an operating method's result is public only if ALLOWED
      if (!['ALLOWED', 'INTERNAL', 'PROHIBITED_IN_MVP', 'BLOCKED_UNTIL_METHOD_APPROVED'].includes(m.publication)) errors.push({ code: 'M01', id: m.id, msg: `publication ${m.publication} is not ALLOWED, INTERNAL, PROHIBITED_IN_MVP or BLOCKED_UNTIL_METHOD_APPROVED` });
      if (m.status === 'ACTIVE' && m.publication === 'BLOCKED_UNTIL_METHOD_APPROVED') errors.push({ code: 'M01', id: m.id, msg: 'a method blocked until its methodology is approved cannot be active' });
      if (m.status === 'ACTIVE' && m.implemented === false) errors.push({ code: 'M01', id: m.id, msg: 'method has no implementation (framework only) and cannot be active' });
      // internal research engines: implemented, documented and tested; never public through this flag
      if (m.internal !== undefined && !['ACTIVE', 'INACTIVE'].includes(m.internal)) errors.push({ code: 'M01', id: m.id, msg: 'internal must be ACTIVE or INACTIVE' });
      if (m.internal === 'ACTIVE' && (m.implemented !== true || !m.documented || !m.contract || !m.tests)) errors.push({ code: 'M01', id: m.id, msg: 'an internal engine needs implemented: true, documentation, a contract version and named tests' });
      if (!Array.isArray(m.engines) || !m.engines.length || m.engines.some(e => !Number.isInteger(e) || e < 1 || e > 8)) errors.push({ code: 'M01', id: m.id, msg: 'engines must list the decision engines (1–8) the method belongs to' });
    }
  } catch (e) { errors.push({ code: 'M01', id: 'methods.json', msg: `method registry unreadable: ${e.message}` }); }
  report.methods = methods;

  // datasets
  const pub = readCollections(pubDir, 'public', errors);
  const fix = readCollections(fixDir, 'fixtures', errors);
  const mediaCheck = (r) => {
    const out = []; const p = path.join(root, r.file.public_path);
    if (!fs.existsSync(p)) return [`file ${r.file.public_path} not found`];
    const buf = fs.readFileSync(p);
    if (sha256(buf) !== r.file.sha256) out.push('sha256 does not match the file');
    const sz = imageSize(buf); if (!sz) out.push('unrecognised image format');
    else if (sz.w !== r.file.width || sz.h !== r.file.height) out.push(`dimensions ${sz.w}x${sz.h} differ from record ${r.file.width}x${r.file.height}`);
    if (!r.id.startsWith('FIX-') && hasExif(buf)) out.push('EXIF/metadata not stripped');
    return out;
  };
  const gateConfig = loadGateConfig(path.join(desk, '_tools/market-gates/MG-1.json'));
  if (gateConfig.error) errors.push({ code: 'M01', id: 'M-MARKET-GATE', msg: gateConfig.error });
  const prod = validateDataset({ name: 'public', ...pub }, { mode: 'public', today, mediaCheck, methods, marketGates: { config: gateConfig, reviews: null } });
  errors.push(...prod.errors.map(e => ({ ...e, set: 'public' })));
  const merged = { collections: {}, origin: { ...pub.origin, ...fix.origin } };
  for (const c of Object.keys(COLLECTIONS)) merged.collections[c] = [...(pub.collections[c] || []), ...(fix.collections[c] || [])];
  // fixtures are evaluated against their own fixed clock (desk/_fixtures/clock.json), so the committed fixture gate
  // report is deterministic; production data always uses the real date
  let fixToday = today;
  try { const c = JSON.parse(fs.readFileSync(path.join(desk, '_fixtures/clock.json'), 'utf8')); if (c && /^\d{4}-\d{2}-\d{2}$/.test(c.today)) fixToday = c.today; } catch { /* no fixture clock: use today */ }
  const dev = validateDataset({ name: 'fixtures', ...merged }, { mode: 'fixtures', today: fixToday, mediaCheck, methods, marketGates: { config: gateConfig, reviews: null } });
  errors.push(...dev.errors.filter(e => e.id && String(e.id).startsWith('FIX-')).map(e => ({ ...e, set: 'fixtures' })));

  // F05 — every file under desk/media must belong to a public media record (no orphan / unapproved uploads)
  const referenced = new Set((pub.collections.media || []).map(m => m.file && m.file.public_path));
  for (const f of listFiles(path.join(desk, 'media'), root)) if (!referenced.has(f) && !f.endsWith('.gitkeep')) errors.push({ code: 'F05', id: f, msg: 'media file without an approved media record' });
  for (const m of pub.collections.media || []) if (prod.eligibility.media[m.id].length) errors.push({ code: 'F05', id: m.id, msg: `media file committed to the public tree but not publishable: ${prod.eligibility.media[m.id].join('; ')}` });

  // published index (computed)
  const index = {
    schema_version: '1.1', gate_version: GATE_VERSION,
    note: 'Generated by desk/_tools/validate.mjs --write-index. Do not edit by hand.',
    opportunities: Object.entries(prod.eligibility.opportunities).filter(([id, why]) => !why.length && (pub.collections.opportunities || []).find(o => o.id === id).record_status === 'PUBLISHED').map(([id]) => id).sort(),
    media: Object.entries(prod.eligibility.media).filter(([, why]) => !why.length).map(([id]) => id).sort(),
    markets: (pub.collections.markets || []).filter(m => methods['M-MARKET-GATE'] === 'ACTIVE' && m.record_status === 'PUBLISHED' && m.review && m.review.gate_version === gateConfig.version && m.activation === 'ACTIVE').map(m => m.id).sort()
  };
  // fixture gate report for the local development view (never published: lives under desk/_fixtures)
  const gatePath = path.join(desk, '_fixtures/gate.json');
  const fixIds = (c) => (fix.collections[c] || []).map(r => r.id);
  const gateText = JSON.stringify({ note: 'Generated by validate.mjs --write-index. Illustrative fixtures only.', opportunities: Object.fromEntries(fixIds('opportunities').map(id => [id, dev.eligibility.opportunities[id]])), media: Object.fromEntries(fixIds('media').map(id => [id, dev.eligibility.media[id]])) }, null, 2) + '\n';
  if (fs.existsSync(path.join(desk, '_fixtures'))) {
    if (writeIndex) fs.writeFileSync(gatePath, gateText);
    else if (!fs.existsSync(gatePath) || fs.readFileSync(gatePath, 'utf8') !== gateText) errors.push({ code: 'V12', id: '_fixtures/gate.json', msg: 'fixture gate report is stale; run with --write-index' });
  }
  const idxPath = path.join(pubDir, 'published.json');
  const idxText = JSON.stringify(index, null, 2) + '\n';
  if (writeIndex) fs.writeFileSync(idxPath, idxText);
  else if (!fs.existsSync(idxPath) || fs.readFileSync(idxPath, 'utf8') !== idxText) errors.push({ code: 'V12', id: 'published.json', msg: 'published.json is missing or stale; run with --write-index after review' });

  // P01 — parent site must not change outside approved commits
  const manPath = path.join(desk, '_tools/parent-manifest.json');
  const parentFiles = listFiles(root, root, (rel) => ['.git', 'desk', '.github', 'node_modules'].includes(rel.split('/')[0])).sort();
  const manifest = Object.fromEntries(parentFiles.map(f => [f, sha256(fs.readFileSync(path.join(root, f)))]));
  if (updateParentManifest) fs.writeFileSync(manPath, JSON.stringify(manifest, null, 2) + '\n');
  else if (!fs.existsSync(manPath)) errors.push({ code: 'P01', id: 'parent-manifest.json', msg: 'missing parent manifest' });
  else {
    const old = JSON.parse(fs.readFileSync(manPath, 'utf8'));
    for (const f of new Set([...Object.keys(old), ...Object.keys(manifest)])) if (old[f] !== manifest[f]) errors.push({ code: 'P01', id: f, msg: !(f in old) ? 'new parent-site file' : !(f in manifest) ? 'parent-site file removed' : 'parent-site file changed' });
  }

  report.counts = Object.fromEntries(Object.keys(COLLECTIONS).map(c => [c, [(pub.collections[c] || []).length, (fix.collections[c] || []).length]]));
  report.index = index;
  report.fixtureEligibility = dev.eligibility.opportunities;
  report.productionEligibility = prod.eligibility.opportunities;
  report.warnings = prod.warnings;
  return { errors, warnings: prod.warnings, report };
}

// ---------------------------------------------------------------- CLI
if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  const root = path.resolve(HERE, '../..');
  const args = new Set(process.argv.slice(2));
  const { errors, report } = validateRepo(root, { writeIndex: args.has('--write-index'), updateParentManifest: args.has('--update-parent-manifest') });
  console.log(`Nexus Desk validator · schema 1.1 · gate ${GATE_VERSION}`);
  console.log('records (public / fixtures):', Object.entries(report.counts).filter(([, v]) => v[0] || v[1]).map(([k, v]) => `${k} ${v[0]}/${v[1]}`).join(', ') || 'none');
  console.log(`published opportunities: ${report.index.opportunities.length} · publishable media: ${report.index.media.length} · published markets: ${report.index.markets.length}`);
  for (const [id, why] of Object.entries(report.fixtureEligibility)) console.log(`  fixture ${id}: ${why.length ? 'would be blocked — ' + why.join('; ') : 'passes gate rules (illustrative only, never published)'}`);
  console.log('methods:', Object.entries(report.methods).map(([k, v]) => `${k}=${v}`).join(' '));
  for (const w of report.warnings || []) console.log(`! [${w.code}] ${w.id}: ${w.msg}`);
  if (errors.length) { for (const e of errors) console.error(`✗ [${e.code}] ${e.set ? e.set + ' ' : ''}${e.id}: ${e.msg}`); console.error(`${errors.length} error(s)`); process.exit(1); }
  console.log('✓ no errors');
}
