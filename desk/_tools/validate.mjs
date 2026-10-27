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
// opts: { mode: 'public'|'fixtures', today: 'YYYY-MM-DD', mediaCheck?: (rec)=>string[] }
export function validateDataset(ds, opts) {
  const { mode, today } = opts;
  const errors = []; const E = (code, id, msg) => errors.push({ code, id, msg });
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
  for (const r of C('risks')) { subj(r.id, r.subject); (r.evidence_ids || []).forEach(i => refTo(r.id, i, 'evidence')); }
  for (const r of C('research_blocks')) subj(r.id, r.subject);
  for (const r of C('media')) { subj(r.id, r.subject); refTo(r.id, r.provenance && r.provenance.source_id, 'sources'); }
  for (const r of C('disclosures')) subj(r.id, r.subject, true);

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
    if (mode === 'public' || (ds.origin && ds.origin[r.id] === 'public')) {
      if (r.currency !== null) E('V08', r.id, 'currency amounts are not publishable in the MVP');
      if (r.field && DENY_FIELD_PATH.test(r.field)) E('V08', r.id, `evidence for "${r.field}" is not publishable in the MVP`);
    }
  }
  // V09 — risks: no unsupported qualitative judgement
  const sevActive = !!(opts.methods && opts.methods['M-RISK-SEVERITY'] === 'ACTIVE');
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
  { const seen = new Set(); for (const r of C('research_blocks')) { const k = `${r.subject && r.subject.type}:${r.subject && r.subject.id}:${r.domain}`; if (seen.has(k)) E('V15', r.id, `second research block for ${k}`); seen.add(k); } }

  // V08/V14 — deny-list keys and personal data, everywhere
  for (const recs of Object.values(ds.collections)) for (const r of recs) walk(r, (kind, v, at) => {
    if (kind === 'key' && DENY_KEY.test(v)) E('V08', r.id, `forbidden key "${v}" at ${at}`);
    if (kind === 'str' && !/\.(sha256|id|public_path|width|height)$/.test(at) && (EMAIL.test(v) || PHONE.test(v))) E('V14', r.id, `possible personal data at ${at}`);
  });

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
  const mediaReasons = (r) => {
    const why = [];
    if (r.is_illustrative) why.push('illustrative');
    if (!r.permission || r.permission.status !== 'GRANTED_WRITTEN') why.push('no written permission');
    if (!r.permission || !(r.permission.scope || []).includes('desk_web')) why.push('permission scope excludes desk_web');
    if (r.permission && r.permission.expires_at && r.permission.expires_at < today) why.push('permission expired');
    if (r.attribution && r.attribution.required && !r.attribution.text) why.push('attribution missing');
    if (!r.review) why.push('not reviewed');
    if (errIds.has(r.id)) why.push('validation errors');
    return why;
  };
  const media = {};
  for (const r of C('media')) media[r.id] = mediaReasons(r);

  const opp = {};
  for (const r of C('opportunities')) {
    const why = [];
    const allowFix = mode === 'fixtures';
    if (r.is_illustrative && !allowFix) why.push('illustrative');
    if (!REVIEWABLE.has(r.record_status)) why.push(`record_status ${r.record_status}`);
    if (!r.review || r.review.gate_version !== GATE_VERSION) why.push(`no ${GATE_VERSION} review`);
    const m = get(r.market_id); const cat = C('categories').find(c => c.key === r.category);
    if (!m || m.r.activation !== 'ACTIVE') why.push('market inactive');
    if (!cat || cat.activation !== 'ACTIVE') why.push('category inactive');
    const p = r.subject && get(r.subject.id); const pr = p && p.r;
    if (!pr) why.push('subject missing');
    else {
      if (!REVIEWABLE.has(pr.record_status) || !pr.review) why.push('subject not reviewed');
      const strong = (subject, field) => C('evidence').some(e => sameRef(e.subject, subject) && e.field === field && e.source_tier <= 3 && STRONG.has(e.verification_status));
      if (!strong({ type: 'project', id: pr.id }, 'name')) why.push('project identity not verified (Tier 1–3)');
      const dv = pr.developer_id && get(pr.developer_id);
      if (!dv || !dv.r.legal_entity_name || !strong({ type: 'developer', id: dv.r.id }, 'legal_entity_name')) why.push('developer legal entity not verified');
      const subjects = [{ type: 'project', id: pr.id }, { type: 'opportunity', id: r.id }].concat(pr.developer_id ? [{ type: 'developer', id: pr.developer_id }] : []).concat(r.asset_id ? [{ type: 'asset', id: r.asset_id }] : []);
      if (C('conflicts').some(c => c.status === 'OPEN' && subjects.some(s => sameRef(s, c.subject)))) why.push('open conflict');
      for (const d of ['PROJECT_ASSET', 'DEVELOPER', 'RISK']) if (!C('research_blocks').some(b => sameRef(b.subject, { type: 'project', id: pr.id }) && b.domain === d)) why.push(`no ${d} research block`);
      if (isEmpty(pr.risk_ids) && isEmpty(r.risk_ids)) why.push('no documented risk');
      // a published field must not rest on Tier 4 alone
      const fields = new Map();
      for (const e of C('evidence')) if (subjects.some(s => sameRef(s, e.subject)) && e.field) { const k = `${e.subject.id}:${e.field}`; fields.set(k, (fields.get(k) || []).concat(e)); }
      for (const [k, es] of fields) if (es.every(e => e.source_tier === 4)) why.push(`${k} rests on Tier 4 only`);
      const mine = C('media').filter(x => subjects.slice(0, 2).some(s => sameRef(s, x.subject)));
      const ok = mine.filter(x => media[x.id].length === 0 || (allowFix && media[x.id].every(w => w === 'illustrative')));
      const covers = ok.filter(x => x.role === 'cover').length;
      if (covers !== 1) why.push(covers ? 'more than one cover' : 'no publishable cover');
      if (!ok.some(x => x.role === 'gallery')) why.push('no publishable gallery image');
      if ([pr.id, r.id, r.asset_id, pr.developer_id].some(i => i && errIds.has(i))) why.push('validation errors');
    }
    const ds2 = (r.disclosure_ids || []).map(i => get(i)).filter(Boolean);
    if (!ds2.some(d => d.r.legal_review === 'APPROVED')) why.push('no legally approved disclosure');
    opp[r.id] = why;
    if (r.record_status === 'PUBLISHED' && why.length) E('V12', r.id, `PUBLISHED but not eligible: ${why.join('; ')}`);
  }
  for (const r of C('markets')) {
    if (r.record_status === 'PUBLISHED' && (!r.review || r.activation !== 'ACTIVE')) E('V12', r.id, 'market PUBLISHED requires activation ACTIVE and a review');
  }
  for (const r of C('opportunities')) {
    const m = get(r.market_id);
    if (m && m.r.activation === 'INACTIVE' && r.record_status === 'PUBLISHED') E('V13', r.id, 'opportunity published in an inactive market');
  }
  return { errors, eligibility: { opportunities: opp, media } };
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

export function validateRepo(root, { today = new Date().toISOString().slice(0, 10), writeIndex = false, updateParentManifest = false } = {}) {
  const errors = []; const report = {};
  const desk = path.join(root, 'desk');
  const pubDir = path.join(desk, 'data/public'); const fixDir = path.join(desk, '_fixtures/data');

  // F04 — fixtures/tooling exclusion relies on Jekyll ignoring "_" folders
  if (fs.existsSync(path.join(root, '.nojekyll'))) errors.push({ code: 'F04', id: '.nojekyll', msg: '.nojekyll would publish desk/_fixtures and desk/_tools; remove it or move fixtures out of the site tree' });
  if (fs.existsSync(path.join(root, '_config.yml')) && /include\s*:/.test(fs.readFileSync(path.join(root, '_config.yml'), 'utf8'))) errors.push({ code: 'F04', id: '_config.yml', msg: 'Jekyll include: list could publish underscore folders' });

  // F06 — only web-safe file types in the deployed part of desk/
  const deployed = listFiles(desk, desk, (rel) => rel.split('/')[0].startsWith('_'));
  for (const f of deployed) {
    const ext = path.extname(f).toLowerCase();
    if (!PUBLIC_EXT.has(ext) && path.basename(f) !== '.gitkeep') errors.push({ code: 'F06', id: `desk/${f}`, msg: `file type ${ext || '(none)'} not allowed in the published tree (contracts, sheets, docs belong in the private store)` });
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
  const prod = validateDataset({ name: 'public', ...pub }, { mode: 'public', today, mediaCheck, methods });
  errors.push(...prod.errors.map(e => ({ ...e, set: 'public' })));
  const merged = { collections: {}, origin: { ...pub.origin, ...fix.origin } };
  for (const c of Object.keys(COLLECTIONS)) merged.collections[c] = [...(pub.collections[c] || []), ...(fix.collections[c] || [])];
  const dev = validateDataset({ name: 'fixtures', ...merged }, { mode: 'fixtures', today, mediaCheck, methods });
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
    markets: (pub.collections.markets || []).filter(m => m.record_status === 'PUBLISHED' && m.review && m.activation === 'ACTIVE').map(m => m.id).sort()
  };
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
  return { errors, report };
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
  if (errors.length) { for (const e of errors) console.error(`✗ [${e.code}] ${e.set ? e.set + ' ' : ''}${e.id}: ${e.msg}`); console.error(`${errors.length} error(s)`); process.exit(1); }
  console.log('✓ no errors');
}
