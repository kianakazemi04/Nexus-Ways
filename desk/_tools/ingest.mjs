#!/usr/bin/env node
// Nexus Desk ingestion tool: project package → canonical records, media derivatives, ingestion report, gate.
// Zero npm dependencies; raster media derivatives use desk/_tools/media_derive.py (Pillow).
//
//   node desk/_tools/ingest.mjs ingest  --package <dir> --store <dir> [--fixture] [--apply] [--today YYYY-MM-DD]
//   node desk/_tools/ingest.mjs gate    --store <dir> [--fixture]
//   node desk/_tools/ingest.mjs approve-disclosure --store <dir> --id <DSC-…> --by owner  (after counsel approves the text)
//   node desk/_tools/ingest.mjs approve --store <dir> --id <OPP-…> --by owner      (only on the owner's explicit instruction)
//   node desk/_tools/ingest.mjs export  --store <dir> --id <OPP-…> --repo <root>   (only after approval; writes public projection)
//
// The store is the PRIVATE research store (private repo / drive), or desk/_fixtures for illustrative fixtures.
// Store layout: data/<collection>.json · private/*.json · media/<subject>/<MED>.<ext> · reports/<package>.md
// Nothing is ever written to the public tree except by `export`.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import os from 'node:os';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { COLLECTIONS, SCHEMA, GATE_VERSION, REQUIRED_AT_REVIEW, validateDataset, validateRepo, imageSize, applicableDisclosures } from './validate.mjs';
import { withTxn, recover, fault } from './txn.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const DEFS = SCHEMA.$defs;
const TYPE_TO_COLL = { market: 'markets', district: 'districts', area: 'areas', developer: 'developers', project: 'projects', asset: 'assets', opportunity: 'opportunities' };
const DOMAIN_OF = { market: 'MARKET', district: 'DISTRICT', area: 'AREA', project: 'PROJECT_ASSET', asset: 'PROJECT_ASSET', developer: 'DEVELOPER', opportunity: 'PROJECT_ASSET' };
const PRIVATE_DOMAINS = new Set(['PRICING', 'RENTAL', 'LIQUIDITY', 'MACRO_FX']);
const STALE_DAYS = 365;

const code = (s) => String(s).normalize('NFKD').replace(/[̀-ͯ]/g, '').toUpperCase().replace(/[^A-Z0-9]+/g, '-').replace(/^-|-$/g, '');
const slugify = (s) => code(s).toLowerCase();
const sha256 = (b) => crypto.createHash('sha256').update(b).digest('hex');
const pad = (n, w) => String(n).padStart(w, '0');
const isEmpty = (v) => v === null || v === undefined || v === '' || (Array.isArray(v) && !v.length);
const eq = (a, b) => JSON.stringify(a) === JSON.stringify(b);
const daysBetween = (a, b) => Math.round((Date.parse(b) - Date.parse(a)) / 864e5);

// ------------------------------------------------------------ store location guard (audit B3)
// A real research store must never sit anywhere inside the public repository (not only under desk/): anything
// written there is one `git add` away from publication. Paths are resolved and normalised — `..`, relative
// segments and symbolic links on any existing ancestor — before comparison. Anything that cannot be resolved
// with certainty is refused (fail closed).
export class StorePathError extends Error {}
const CASE_INSENSITIVE = process.platform === 'darwin' || process.platform === 'win32';
const norm = (p) => (CASE_INSENSITIVE ? p.toLowerCase() : p);
export function resolveReal(p, what = 'path') {
  if (typeof p !== 'string' || !p.trim()) throw new StorePathError(`${what} is missing`);
  if (p.includes('\0')) throw new StorePathError(`${what} contains a null byte`);
  let cur = path.resolve(p); const tail = [];
  for (;;) {
    try { return path.join(fs.realpathSync.native(cur), ...tail.reverse()); }
    catch (e) {
      if (e.code !== 'ENOENT') throw new StorePathError(`${what} cannot be resolved safely (${e.code})`);
      const parent = path.dirname(cur);
      if (parent === cur) throw new StorePathError(`${what} cannot be resolved safely`);
      tail.push(path.basename(cur)); cur = parent;
    }
  }
}
const within = (child, parent) => { const rel = path.relative(norm(parent), norm(child)); return rel === '' || (!rel.startsWith('..') && !path.isAbsolute(rel)); };
export function assertStorePath(storeDir, repoRoot, { fixture = false } = {}) {
  const store = resolveReal(storeDir, 'store path');
  const root = resolveReal(repoRoot, 'repository root');
  const fixtures = path.join(root, 'desk', '_fixtures');
  if (fixture) {
    if (norm(store) !== norm(fixtures)) throw new StorePathError('--fixture requires --store desk/_fixtures');
    return store;
  }
  if (norm(store) === norm(fixtures)) throw new StorePathError('desk/_fixtures holds illustrative fixtures only; use --fixture, or a real store outside the repository');
  if (within(store, root)) throw new StorePathError('a real (non-fixture) store must live outside the public repository — the resolved store path is inside it');
  if (within(root, store)) throw new StorePathError('a real store must not contain the public repository');
  return store;
}

// ------------------------------------------------------------ store
export function loadStore(dir) {
  const recovered = recover(dir); // roll back an interrupted write before reading anything
  const collections = {}; const files = {};
  for (const c of Object.keys(COLLECTIONS)) {
    const f = path.join(dir, 'data', `${c}.json`);
    collections[c] = fs.existsSync(f) ? JSON.parse(fs.readFileSync(f, 'utf8')).records : [];
  }
  for (const n of ['private_facts', 'documents', 'media_index']) {
    const f = path.join(dir, 'private', `${n}.json`);
    files[n] = fs.existsSync(f) ? JSON.parse(fs.readFileSync(f, 'utf8')) : (n === 'media_index' ? {} : []);
  }
  return { dir, collections, private: files, recovered };
}
// Writes the store through a transaction: either every file is replaced, or none is (Phase 2).
export function storeFiles(store) {
  const out = [];
  for (const [c, recs] of Object.entries(store.collections)) {
    recs.sort((a, b) => a.id.localeCompare(b.id));
    out.push([path.join(store.dir, 'data', `${c}.json`), JSON.stringify({ schema_version: '1.1', collection: c, records: recs }, null, 2) + '\n']);
  }
  for (const [n, v] of Object.entries(store.private)) out.push([path.join(store.dir, 'private', `${n}.json`), JSON.stringify(v, null, 2) + '\n']);
  return out;
}
export function saveStore(store, txn = null) {
  const write = (t) => { for (const [f, text] of storeFiles(store)) if (!fs.existsSync(f) || fs.readFileSync(f, 'utf8') !== text) t.write(f, text); };
  if (txn) write(txn); else withTxn(store.dir, 'store', write);
}

// ------------------------------------------------------------ package validation (before anything is built or written)
const ENUM = (k) => DEFS[k].enum;
const isText = (v) => v && typeof v === 'object' && typeof v.en === 'string' && v.en.trim().length > 0;
export function validatePackage(pkg, pkgDir) {
  const errs = []; const E = (m) => errs.push(m);
  const inEnum = (where, v, k, optional = false) => { if (v === undefined || v === null) { if (!optional) E(`${where}: missing ${k}`); return; } if (!ENUM(k).includes(v)) E(`${where}: ${JSON.stringify(v)} is not a valid ${k} (${ENUM(k).join(', ')})`); };
  if (!pkg || typeof pkg !== 'object') return ['intake.json is not an object'];
  if (!/^[A-Z0-9-]+$/.test(pkg.package_id || '')) E('package_id must be uppercase letters, digits and hyphens');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(pkg.received_at || '')) E('received_at (YYYY-MM-DD) required');
  inEnum('package', pkg.category, 'category');
  if (!pkg.market || !pkg.market.slug) E('market.slug required');
  if (!pkg.project || !pkg.project.name) E('project.name required');
  const srcKeys = new Set();
  for (const [i, x] of (pkg.sources || []).entries()) {
    const w = `sources[${i}]${x && x.key ? ` (${x.key})` : ''}`;
    if (!x || !x.key) { E(`${w}: key required`); continue; }
    if (srcKeys.has(x.key)) E(`${w}: duplicate source key`); srcKeys.add(x.key);
    if (!x.name || !x.publisher) E(`${w}: name and publisher required`);
    inEnum(w, x.tier, 'source_tier'); inEnum(w, x.source_type, 'source_type');
  }
  const factKeys = new Set();
  for (const [i, f] of (pkg.facts || []).entries()) {
    const w = `facts[${i}]${f && f.key ? ` (${f.key})` : ''}`;
    if (!f || typeof f !== 'object') { E(`${w}: not an object`); continue; }
    if (f.key) { if (factKeys.has(f.key)) E(`${w}: duplicate fact key`); factKeys.add(f.key); }
    inEnum(w, f.domain, 'domain', true);
    if (f.unit !== undefined && f.unit !== null) inEnum(w, f.unit, 'unit');
    if (f.area_basis !== undefined && f.area_basis !== null) inEnum(w, f.area_basis, 'area_basis');
    const priv = ['PRICING', 'RENTAL', 'LIQUIDITY', 'MACRO_FX'].includes(f.domain) || !!f.currency;
    if (priv) continue; // routed to the private store; never becomes public evidence
    if (!f.subject) E(`${w}: subject required`);
    if (!f.source || !srcKeys.has(f.source)) E(`${w}: source "${f.source}" is not a declared source key`);
    if (!isText(f.claim)) E(`${w}: claim text (en) required`);
    inEnum(w, f.evidence_class, 'evidence_class'); inEnum(w, f.verification_status, 'verification_status');
  }
  for (const [i, u] of (pkg.unknowns || []).entries()) { const w = `unknowns[${i}]`; if (!u || !u.subject || !u.field) E(`${w}: subject and field required`); else inEnum(w, u.state, 'missing_data_status'); }
  for (const [i, b] of (pkg.research_blocks || []).entries()) { const w = `research_blocks[${i}]`; inEnum(w, b && b.domain, 'domain'); inEnum(w, b && b.research_closure, 'research_closure'); inEnum(w, b && b.data_completeness, 'data_completeness'); }
  for (const [i, k] of (pkg.risks || []).entries()) {
    const w = `risks[${i}]`; inEnum(w, k && k.risk_type, 'risk_type'); if (!k || !isText(k.title)) E(`${w}: title text (en) required`);
    for (const f of (k && k.evidence_facts) || []) if (!factKeys.has(f)) E(`${w}: evidence fact "${f}" is not a declared fact key`);
  }
  for (const [i, d] of (pkg.disclosures || []).entries()) { const w = `disclosures[${i}]`; inEnum(w, d && d.kind, 'disclosure_kind'); if (!d || !isText(d.text)) E(`${w}: text (en) required`); }
  for (const [i, m] of (pkg.media || []).entries()) {
    const w = `media[${i}]${m && m.file ? ` (${m.file})` : ''}`;
    if (!m || !m.file) { E(`${w}: file required`); continue; }
    const raw = path.resolve(pkgDir, m.file);
    if (path.relative(path.resolve(pkgDir), raw).startsWith('..')) E(`${w}: file must be inside the package folder`);
    else if (!fs.existsSync(raw)) E(`${w}: file not found`);
    const ext = path.extname(m.file).toLowerCase();
    if (['.heic', '.heif'].includes(ext)) E(`${w}: HEIC/HEIF is not supported — export the image as JPEG or PNG first`);
    else if (ext === '.pdf') E(`${w}: PDF is not supported as media — export the page as an image (floor plans) or list the PDF under documents`);
    else if (!['.jpg', '.jpeg', '.png', '.webp', '.svg'].includes(ext)) E(`${w}: unsupported file type ${ext || '(none)'}`);
    if (!m.source || !srcKeys.has(m.source)) E(`${w}: source "${m.source}" is not a declared source key`);
    inEnum(w, m.media_type, 'media_type'); inEnum(w, m.content_category, 'content_category'); inEnum(w, m.role, 'media_role', true);
    if (!isText(m.caption) || !isText(m.alt)) E(`${w}: caption and alt text (en) required`);
    if (!m.permission || typeof m.permission !== 'object') E(`${w}: permission is missing — record {status, scope, evidence_ref, granted_at, expires_at}; use status NOT_REQUESTED if no permission has been sought`);
    else {
      inEnum(`${w} permission`, m.permission.status, 'permission_status');
      if (!Array.isArray(m.permission.scope)) E(`${w}: permission.scope must be a list (e.g. ["desk_web"]); use [] when no scope is granted`);
      else for (const sc of m.permission.scope) inEnum(`${w} permission`, sc, 'permission_scope');
      if (m.permission.status === 'GRANTED_WRITTEN' && !m.permission.evidence_ref) E(`${w}: GRANTED_WRITTEN needs permission.evidence_ref (pointer to the private permission record)`);
    }
  }
  return errs;
}
const find = (store, coll, pred) => store.collections[coll].find(pred);
const byId = (store, id) => { for (const c of Object.keys(COLLECTIONS)) { const r = store.collections[c].find(x => x.id === id); if (r) return r; } return null; };
function nextSeq(store, coll, prefix, width) {
  let max = 0; const re = new RegExp(`^${prefix.replace(/[-]/g, '\\-')}(\\d+)$`);
  for (const r of store.collections[coll]) { const m = r.id.match(re); if (m) max = Math.max(max, +m[1]); }
  return `${prefix}${pad(max + 1, width)}`;
}

// ------------------------------------------------------------ gate
function storeOrigin(store, fixture) { const o = {}; for (const [c, recs] of Object.entries(store.collections)) for (const r of recs) o[r.id] = c === 'categories' && !r.id.startsWith('FIX-') ? 'public' : fixture ? 'fixtures' : 'private'; return o; }
function methods() { const m = {}; for (const x of JSON.parse(fs.readFileSync(path.join(HERE, '../data/methods.json'), 'utf8')).methods) m[x.id] = x; return m; }
export function runGate(store, { fixture, today, repoRoot, staged = null }) {
  // categories are public configuration; use the public file when the store has none
  if (!store.collections.categories.length) {
    const f = path.join(repoRoot, 'desk/data/public/categories.json');
    store = { ...store, collections: { ...store.collections, categories: JSON.parse(fs.readFileSync(f, 'utf8')).records } };
  }
  const mediaCheck = (r) => {
    if (/^0+$/.test(r.file.sha256)) return [];
    const rel = fixture ? r.file.public_path : r.file.public_path.replace(/^desk\/media\//, 'media/');
    const p = (staged && staged[r.file.public_path]) || (fixture ? path.join(repoRoot, rel) : path.join(store.dir, rel));
    if (!fs.existsSync(p)) return [`file missing in store: ${rel}`];
    const buf = fs.readFileSync(p); const out = [];
    if (sha256(buf) !== r.file.sha256) out.push('sha256 mismatch');
    const sz = imageSize(buf); if (!sz || sz.w !== r.file.width || sz.h !== r.file.height) out.push('dimension mismatch');
    return out;
  };
  const m = methods();
  return validateDataset({ collections: store.collections, origin: storeOrigin(store, fixture) },
    { mode: fixture ? 'fixtures' : 'private', today, mediaCheck, methods: Object.fromEntries(Object.entries(m).map(([k, v]) => [k, v.status])) });
}

// ------------------------------------------------------------ ingest
export function ingest({ pkgDir, storeDir, fixture = false, apply = false, today, repoRoot }) {
  storeDir = assertStorePath(storeDir, repoRoot, { fixture });
  const pkg = JSON.parse(fs.readFileSync(path.join(pkgDir, 'intake.json'), 'utf8'));
  const pkgErrors = validatePackage(pkg, pkgDir);
  if (pkgErrors.length) {
    const report = `# Ingestion report · ${pkg && pkg.package_id || '(unknown package)'}\n\n**REFUSED — the package is invalid; nothing was written.**\n\n${pkgErrors.map(e => `- ${e}`).join('\n')}\n`;
    return { report, opp: null, project: null, blocked: [], errors: pkgErrors, disputed: [], privateFacts: [], gateErrors: [], written: false };
  }
  const store = loadStore(storeDir); const recovered = store.recovered;
  const fx = fixture ? 'FIX-' : '';
  const R = { pkg: pkg.package_id, created: [], reused: [], updated: [], facts: [], privateFacts: [], disputed: [], corroborated: [], media: [], documents: [], notes: [], errors: [] };
  const note = (s) => R.notes.push(s);
  const fail = (s) => R.errors.push(s);
  if (!/^[A-Z0-9-]+$/.test(pkg.package_id || '')) throw new Error('package_id must be uppercase letters, digits and hyphens');
  if (fixture && !pkg.package_id.startsWith('FIX-')) throw new Error('fixture packages must have a FIX- package_id');
  if (!fixture && pkg.package_id.startsWith('FIX-')) throw new Error('FIX- package cannot be ingested into a real store');
  const received = pkg.received_at; if (!/^\d{4}-\d{2}-\d{2}$/.test(received || '')) throw new Error('received_at (YYYY-MM-DD) required');
  const isIll = fixture;

  const upsert = (coll, rec) => {
    const ex = store.collections[coll].find(r => r.id === rec.id);
    if (ex) { R.reused.push(rec.id); return ex; }
    store.collections[coll].push(rec); R.created.push(rec.id); return rec;
  };

  // market — must already exist (markets are created and activated only through G4)
  const market = find(store, 'markets', m => m.slug === pkg.market.slug) || (fixture ? null : null);
  if (!market) throw new Error(`market "${pkg.market.slug}" not found in store; markets are never created by ingestion`);
  if (market.category !== pkg.category) throw new Error('package category differs from market category');
  const MK = market.id.replace(/^(FIX-)?MKT-/, '');

  // sources
  const srcId = {};
  for (const s of pkg.sources || []) {
    const ex = find(store, 'sources', x => (s.url && x.url === s.url) || (x.name === s.name && x.publisher === s.publisher));
    if (ex) { srcId[s.key] = ex.id; R.reused.push(ex.id); continue; }
    const rec = { id: `${fx}SRC-${code(pkg.package_id.replace(/^FIX-/, ''))}-${code(s.key)}`, name: s.name, publisher: s.publisher, url: s.url ?? null, tier: s.tier, source_type: s.source_type, accessed_at: s.accessed_at ?? received, notes: s.notes ?? null, is_illustrative: isIll };
    srcId[s.key] = upsert('sources', rec).id;
  }

  // developer — reuse by legal entity, then by name
  let developer = null;
  if (pkg.developer) {
    const d = pkg.developer;
    developer = find(store, 'developers', x => (d.legal_entity_name && x.legal_entity_name && x.legal_entity_name.toLowerCase() === d.legal_entity_name.toLowerCase()) || x.name.toLowerCase() === d.name.toLowerCase());
    if (developer) R.reused.push(developer.id);
    else developer = upsert('developers', { id: `${fx}DEV-${code(d.name)}`, name: d.name, legal_entity_name: null, verification_status: 'UNVERIFIED', record_status: 'RESEARCH_IN_PROGRESS', summary: d.summary ?? null, evidence_ids: [], field_states: [], is_illustrative: isIll, review: null });
  }
  // district / area — reuse by market + slug
  let district = null;
  if (pkg.district) {
    const slug = pkg.district.slug || slugify(pkg.district.name);
    district = find(store, 'districts', x => x.market_id === market.id && x.slug === slug)
      || upsert('districts', { id: `${fx}DST-${MK}-${code(slug)}`, market_id: market.id, slug, name: pkg.district.name, admin_level: pkg.district.admin_level || 'DISTRICT', record_status: 'RESEARCH_IN_PROGRESS', research_block_ids: [], evidence_ids: [], field_states: [], is_illustrative: isIll, review: null });
  }
  let area = null;
  if (pkg.area) {
    const slug = pkg.area.slug || slugify(pkg.area.name);
    area = find(store, 'areas', x => x.market_id === market.id && x.slug === slug)
      || upsert('areas', { id: `${fx}ARE-${MK}-${code(slug)}`, market_id: market.id, district_id: district ? district.id : null, slug, name: pkg.area.name, record_status: 'RESEARCH_IN_PROGRESS', evidence_ids: [], field_states: [], is_illustrative: isIll, review: null });
  }
  // project — reuse by market + slug
  const p = pkg.project; const pslug = p.slug || slugify(p.name);
  const K = `${MK}-${code(pslug)}`;
  let project = find(store, 'projects', x => x.market_id === market.id && x.slug === pslug);
  if (project) R.reused.push(project.id);
  else project = upsert('projects', {
    id: `${fx}PRJ-${K}`, category: pkg.category, market_id: market.id, developer_id: developer ? developer.id : null, name: p.name, slug: pslug,
    district_id: district ? district.id : null, area_id: area ? area.id : null, delivery_status: null, expected_delivery: null,
    asset_types: p.asset_types || [], description: p.description ?? null, record_status: 'RESEARCH_IN_PROGRESS',
    research_block_ids: [], evidence_ids: [], risk_ids: [], field_states: [], is_illustrative: isIll, review: null
  });
  if (project.developer_id && developer && project.developer_id !== developer.id) fail(`package developer ${developer.id} differs from the project's existing developer ${project.developer_id}; not changed`);
  if (!project.developer_id && developer) { project.developer_id = developer.id; R.updated.push(`${project.id}.developer_id`); }
  if (!project.district_id && district) { project.district_id = district.id; R.updated.push(`${project.id}.district_id`); }
  if (!project.area_id && area) { project.area_id = area.id; R.updated.push(`${project.id}.area_id`); }

  // assets
  const assetId = {};
  for (const a of pkg.assets || []) {
    const id = `${fx}AST-${K}-${code(a.key)}`;
    assetId[a.key] = upsert('assets', { id, project_id: project.id, unit_type: null, unit_ref: a.unit_ref ?? null, gross_area_m2: null, net_area_m2: null, delivery_status: null, evidence_ids: [], field_states: [], is_illustrative: isIll }).id;
  }
  // opportunity — one per project unless a key is given; status/review are never set by ingestion
  const o = pkg.opportunity || {};
  const oppId = `${fx}OPP-${K}${o.key ? '-' + code(o.key) : ''}`;
  const opp = upsert('opportunities', {
    id: oppId, category: pkg.category, subject: { type: 'project', id: project.id }, market_id: market.id, asset_id: o.asset_key ? assetId[o.asset_key] : null,
    title: o.title || { en: p.name }, summary: o.summary ?? null, investor_objective_tags: o.investor_objective_tags || [], record_status: 'RESEARCH_IN_PROGRESS',
    disclosure_ids: [], evidence_ids: [], risk_ids: [], field_states: [], last_verified: null, is_illustrative: isIll, review: null
  });

  const subjectOf = (s) => {
    if (s === 'project') return project; if (s === 'developer') return developer; if (s === 'district') return district; if (s === 'area') return area;
    if (s === 'market') return market; if (s === 'opportunity') return opp;
    if (s && s.startsWith('asset:')) return byId(store, assetId[s.slice(6)]);
    return null;
  };
  const typeOf = (rec) => Object.entries(TYPE_TO_COLL).find(([, c]) => store.collections[c].includes(rec))[0];

  // facts → evidence (never overwrite; conflicts stay visible)
  const factEvd = {};
  for (const [i, f] of (pkg.facts || []).entries()) {
    const label = f.key || `fact#${i + 1}`;
    const domain = f.domain || null;
    if (PRIVATE_DOMAINS.has(domain) || f.currency) {
      store.private.private_facts.push({ package_id: pkg.package_id, project_id: project.id, domain: domain || 'PRICING', ...f, received_at: received });
      R.privateFacts.push({ label, domain: domain || 'PRICING', reason: f.currency ? 'currency amount' : `${domain} is private in the MVP` });
      continue;
    }
    const sub = subjectOf(f.subject);
    if (!sub) { fail(`${label}: unknown subject "${f.subject}"`); continue; }
    const stype = typeOf(sub);
    const props = DEFS[TYPE_TO_COLL[stype]].properties;
    if (f.field && !(f.field.split('.')[0] in props)) { fail(`${label}: field "${f.field}" does not exist on ${stype}`); continue; }
    if (!srcId[f.source]) { fail(`${label}: unknown source "${f.source}"`); continue; }
    const src = find(store, 'sources', s => s.id === srcId[f.source]);
    const id = nextSeq(store, 'evidence', `${fx}EVD-${K}-`, 4);
    const e = {
      id, source_id: src.id, subject: { type: stype, id: sub.id }, field: f.field ?? null, claim: f.claim, value: f.value ?? null, unit: f.unit ?? null, currency: null,
      geography: f.geography || market.name, geo_code: f.geo_code ?? null, period: f.period ?? null, series_id: f.series_id ?? null, base_period: f.base_period ?? null,
      method_note: f.method_note ?? null, area_basis: f.area_basis ?? null, evidence_class: f.evidence_class, verification_status: f.verification_status,
      source_tier: src.tier, published_at: f.published_at ?? null, retrieved_at: f.retrieved_at || received, last_verified: f.last_verified ?? null,
      source_url: src.url, source_locator: f.locator ?? null, limitations: f.limitations ?? null, next_review_trigger: f.next_review_trigger ?? null,
      conflict_ids: [], is_illustrative: isIll
    };
    store.collections.evidence.push(e); R.created.push(id); factEvd[f.key || label] = id;
    if (!sub.evidence_ids.includes(id)) sub.evidence_ids.push(id);
    R.facts.push({ label, subject: sub.id, field: e.field, domain: DOMAIN_OF[stype], evidence: id, class: e.evidence_class, verification: e.verification_status, tier: e.source_tier });

    // apply value to the owning record (single source of truth) — only when empty; otherwise corroborate or open a conflict
    if (e.field && e.value !== null && e.evidence_class !== 'DATA NOT AVAILABLE' && !e.field.includes('.')) {
      const cur = sub[e.field];
      if (isEmpty(cur)) {
        sub[e.field] = e.value; R.updated.push(`${sub.id}.${e.field}`);
        sub.field_states = (sub.field_states || []).filter(s => s.field !== e.field);
      } else if (eq(cur, e.value)) R.corroborated.push(`${sub.id}.${e.field}`);
      else {
        const others = store.collections.evidence.filter(x => x.id !== id && x.subject.id === sub.id && x.field === e.field && !eq(x.value, e.value) && x.value !== null);
        let cf = find(store, 'conflicts', c => c.subject.id === sub.id && c.field === e.field && c.status === 'OPEN');
        if (!cf) {
          cf = { id: nextSeq(store, 'conflicts', `${fx}CNF-${K}-`, 2), subject: { type: stype, id: sub.id }, field: e.field, evidence_ids: [], status: 'OPEN',
            description: { en: `Sources disagree on ${e.field}: recorded value ${JSON.stringify(cur)} vs ${JSON.stringify(e.value)}.` }, note: null, is_illustrative: isIll };
          store.collections.conflicts.push(cf); R.created.push(cf.id);
        }
        for (const x of [...others, e]) { if (!cf.evidence_ids.includes(x.id)) cf.evidence_ids.push(x.id); if (!x.conflict_ids.includes(cf.id)) x.conflict_ids.push(cf.id); }
        R.disputed.push({ field: `${sub.id}.${e.field}`, current: cur, incoming: e.value, conflict: cf.id });
      }
    }
  }
  // explicit unknowns
  for (const u of pkg.unknowns || []) {
    const sub = subjectOf(u.subject); if (!sub) { fail(`unknown: subject "${u.subject}" not found`); continue; }
    if (!isEmpty(sub[u.field])) { note(`unknown ${sub.id}.${u.field} ignored — field already has a value`); continue; }
    sub.field_states = (sub.field_states || []).filter(s => s.field !== u.field).concat({ field: u.field, state: u.state, note: u.note ? { en: u.note } : null });
  }
  // developer verification summary follows its legal-entity evidence
  if (developer) {
    const le = store.collections.evidence.filter(e => e.subject.id === developer.id && e.field === 'legal_entity_name');
    const order = ['VERIFIED', 'CORROBORATED', 'SOURCE-REPORTED', 'DEVELOPER-CLAIM', 'UNVERIFIED'];
    if (le.length) developer.verification_status = order[Math.min(...le.map(e => order.indexOf(e.verification_status)))];
  }
  // research blocks (status, not evidence: updates allowed and reported)
  for (const b of pkg.research_blocks || []) {
    const sub = subjectOf(b.subject); if (!sub) { fail(`research block: subject "${b.subject}" not found`); continue; }
    const stype = typeOf(sub);
    const id = `${fx}RB-${sub.id.replace(/^FIX-/, '')}-${code(b.domain)}`;
    let rb = find(store, 'research_blocks', x => x.id === id);
    if (!rb) { rb = { id, subject: { type: stype, id: sub.id }, domain: b.domain, research_closure: b.research_closure, data_completeness: b.data_completeness, last_reviewed: b.last_reviewed ?? received, next_review_trigger: b.next_review_trigger ?? null, note: b.note ? { en: b.note } : null, is_illustrative: isIll }; store.collections.research_blocks.push(rb); R.created.push(id); }
    else { if (rb.research_closure !== b.research_closure || rb.data_completeness !== b.data_completeness) R.updated.push(`${id}: ${rb.research_closure}/${rb.data_completeness} → ${b.research_closure}/${b.data_completeness}`); Object.assign(rb, { research_closure: b.research_closure, data_completeness: b.data_completeness, last_reviewed: b.last_reviewed ?? received }); }
    if (sub.research_block_ids && !sub.research_block_ids.includes(id)) sub.research_block_ids.push(id);
  }
  // risks
  for (const k of pkg.risks || []) {
    const sub = subjectOf(k.subject || 'project');
    const id = nextSeq(store, 'risks', `${fx}RSK-${K}-`, 2);
    const ev = (k.evidence_facts || []).map(f => factEvd[f]).filter(Boolean);
    store.collections.risks.push({ id, subject: { type: typeOf(sub), id: sub.id }, risk_type: k.risk_type, title: k.title, cause: k.cause ?? null, evidence_ids: ev,
      severity: k.severity ?? null, probability: k.probability ?? null, horizon: k.horizon ?? null, controllability: k.controllability ?? null, mitigation: k.mitigation ?? null,
      residual_uncertainty: k.residual_uncertainty ?? null, status: k.status || 'OPEN', field_states: [], is_illustrative: isIll });
    if (sub.risk_ids && !sub.risk_ids.includes(id)) sub.risk_ids.push(id);
    R.created.push(id);
  }
  // disclosures
  for (const d of pkg.disclosures || []) {
    const id = nextSeq(store, 'disclosures', `${fx}DSC-${K}-`, 2);
    store.collections.disclosures.push({ id, subject: { type: 'opportunity', id: opp.id }, kind: d.kind, text: d.text, legal_review: 'PENDING', approved_at: null, is_illustrative: isIll });
    opp.disclosure_ids.push(id); R.created.push(id);
    if (d.legal_review === 'APPROVED') note(`${id}: package marks legal review as APPROVED; ingestion records PENDING — legal approval is recorded only by the owner`);
  }
  // documents — inventory only, never copied anywhere public
  for (const d of pkg.documents || []) { store.private.documents.push({ package_id: pkg.package_id, project_id: project.id, ...d }); R.documents.push(d.title); }

  // media — each image processed independently and bound to this project
  const mediaPlan = [];
  for (const m of pkg.media || []) {
    const raw = path.join(pkgDir, m.file);
    if (!fs.existsSync(raw)) { fail(`media ${m.file}: file not found`); continue; }
    const buf = fs.readFileSync(raw); const rawHash = sha256(buf);
    const prior = store.private.media_index[rawHash];
    if (prior && prior.subject !== project.id) { fail(`media ${m.file}: identical file already attached to ${prior.subject} (${prior.id}); not attached again`); continue; }
    if (prior) { R.media.push({ file: m.file, id: prior.id, result: 'already ingested — skipped' }); continue; }
    if (!srcId[m.source]) { fail(`media ${m.file}: unknown source "${m.source}"`); continue; }
    const id = nextSeq(store, 'media', `${fx}MED-${K}-`, 3);
    const ext = path.extname(raw).toLowerCase();
    const vector = ext === '.svg';
    if (vector && !fixture) { fail(`media ${m.file}: SVG is accepted only for illustrative fixtures`); continue; }
    const outExt = vector ? '.svg' : '.webp';
    const pub = fixture ? `desk/_fixtures/media/${project.id}/${id}${outExt}` : `desk/media/${project.id}/${id}${outExt}`;
    const dest = fixture ? path.join(repoRoot, pub) : path.join(storeDir, 'media', project.id, `${id}${outExt}`);
    mediaPlan.push({ m, id, raw, rawHash, vector, dest, pub });
    store.collections.media.push({ id, subject: { type: 'project', id: project.id }, media_type: m.media_type, content_category: m.content_category, caption: m.caption, alt: m.alt,
      depicted_date: m.depicted_date ?? null, provenance: { source_id: srcId[m.source], provided_by_role: pkg.provided_by_role || 'Unspecified', received_at: received, media_kit_ref: m.media_kit_ref ?? null },
      verification_status: m.verification_status || 'DEVELOPER-CLAIM', permission: { status: m.permission.status, scope: m.permission.scope || [], evidence_ref: m.permission.evidence_ref ?? null, granted_at: m.permission.granted_at ?? null, expires_at: m.permission.expires_at ?? null },
      attribution: m.attribution || { required: false, text: null }, role: m.role || 'gallery', order: m.order ?? 0, file: { public_path: pub, width: 1, height: 1, sha256: '0'.repeat(64) }, is_illustrative: isIll, review: null });
    store.private.media_index[rawHash] = { id, subject: project.id, file: m.file };
    R.created.push(id);
  }
  // process media into a staging folder outside the store and the repository; nothing reaches the store until commit
  const staging = fs.mkdtempSync(path.join(os.tmpdir(), 'desk-ingest-stage-'));
  const staged = {};
  try {
    for (const x of mediaPlan) {
      const rec = store.collections.media.find(r => r.id === x.id);
      let info = { had_exif: false, had_gps: false };
      const tmpOut = path.join(staging, `${x.id}${path.extname(x.dest)}`);
      try {
        if (x.vector) fs.copyFileSync(x.raw, tmpOut);
        else info = JSON.parse(execFileSync('python3', [path.join(HERE, 'media_derive.py'), x.raw, tmpOut], { stdio: ['ignore', 'pipe', 'pipe'] }).toString());
        const out = fs.readFileSync(tmpOut); const sz = imageSize(out);
        if (!sz) throw new Error('unrecognised output image');
        rec.file = { public_path: x.pub, width: sz.w, height: sz.h, sha256: sha256(out) };
        staged[x.pub] = tmpOut; x.staged = tmpOut;
      } catch (e) { fail(`media ${x.m.file}: could not be processed (${String(e.message).split('\n')[0]})`); }
      R.media.push({ file: x.m.file, id: x.id, type: rec.media_type, role: rec.role, permission: rec.permission.status, scope: rec.permission.scope.join(',') || '—', exif: x.vector ? 'n/a (vector)' : x.staged ? (info.had_exif ? `stripped${info.had_gps ? ' (incl. GPS)' : ''}` : 'none found') : 'failed' });
    }
    fault('ingest:after-media');

  // derived checks for the report
  const subjects = [project, developer, district, area, opp, ...Object.values(assetId).map(i => byId(store, i))].filter(Boolean);
  const sids = new Set(subjects.map(s => s.id));
  const evid = store.collections.evidence.filter(e => sids.has(e.subject.id));
  const groups = {}; for (const e of evid) if (e.field) (groups[`${e.subject.id}.${e.field}`] ||= []).push(e);
  const devClaimOnly = Object.entries(groups).filter(([, es]) => es.every(e => e.verification_status === 'DEVELOPER-CLAIM')).map(([k]) => k);
  const tier4Only = Object.entries(groups).filter(([, es]) => es.every(e => e.source_tier === 4)).map(([k]) => k);
  const stale = evid.filter(e => daysBetween(e.retrieved_at, today) > STALE_DAYS || (/^\d{4}-\d{2}-\d{2}$/.test(e.next_review_trigger || '') && e.next_review_trigger < today)).map(e => e.id);
  const missing = [];
  for (const s of subjects) {
    const coll = Object.entries(store.collections).find(([, recs]) => recs.includes(s))[0];
    for (const f of REQUIRED_AT_REVIEW[coll] || []) {
      const st = (s.field_states || []).find(x => x.field === f);
      if (isEmpty(s[f])) missing.push({ field: `${s.id}.${f}`, state: st ? st.state : 'NO VALUE AND NO STATE' });
    }
  }
  const ddRequired = subjects.flatMap(s => (s.field_states || []).filter(x => x.state === 'PROFESSIONAL DD REQUIRED').map(x => `${s.id}.${x.field}`));
  let gate = runGate(store, { fixture, today, repoRoot, staged });
  if (opp.record_status === 'PUBLISHED' && gate.eligibility.opportunities[opp.id].length) {
    opp.record_status = 'WITHHELD';
    note(`${opp.id} was PUBLISHED and no longer passes the gate after this package — set to WITHHELD pending owner review`);
    gate = runGate(store, { fixture, today, repoRoot, staged });
  }
  const mreg = methods();

  // report
  const md = [];
  const relevant = gate.errors.filter(e => sids.has(e.id) || store.collections.evidence.some(x => x.id === e.id && sids.has(x.subject.id)) || store.collections.media.some(x => x.id === e.id && x.subject.id === project.id) || store.collections.risks.some(x => x.id === e.id && sids.has(x.subject.id)));
  const blocking = [...R.errors, ...relevant.map(e => `[${e.code}] ${e.id}: ${e.msg}`)];
  const willWrite = apply && !blocking.length;
  md.push(`# Ingestion report · ${pkg.package_id}`, '', `Received ${received} · processed ${today} · store: ${fixture ? 'ILLUSTRATIVE FIXTURES' : 'private research store'} · ${willWrite ? 'APPLIED' : apply ? `NOT APPLIED — ${blocking.length} blocking error(s); nothing was written` : 'DRY RUN (nothing written)'}`, '');
  if (recovered) md.push(`Recovered an interrupted earlier write before this run: ${recovered} file(s) restored to their previous state.`, '');
  md.push(`**Opportunity:** ${opp.id} · **Project:** ${project.id} · **Developer:** ${developer ? developer.id : '—'} · **Market:** ${market.id} (${market.activation})`, '');
  md.push('**Publication:** not published. Ingestion never publishes; publication requires a passing gate, the owner\'s explicit approval and an export.', '');
  md.push('## 1. Records', '', `Created (${R.created.length}): ${R.created.join(', ') || '—'}`, '', `Reused (${[...new Set(R.reused)].length}): ${[...new Set(R.reused)].join(', ') || '—'}`, '', `Values set: ${R.updated.join(', ') || '—'}`, '');
  md.push('## 2. Fact mapping (intelligence domain → owning record)', '', '| Fact | Domain | Owner record.field | Evidence | Class | Verification | Tier |', '|---|---|---|---|---|---|---|');
  for (const f of R.facts) md.push(`| ${f.label} | ${f.domain} | ${f.subject}${f.field ? '.' + f.field : ''} | ${f.evidence} | ${f.class} | ${f.verification} | ${f.tier} |`);
  md.push('', `Private-only facts routed to the private store (${R.privateFacts.length}): ${R.privateFacts.map(f => `${f.label} (${f.domain}; ${f.reason})`).join(', ') || '—'}`, '');
  md.push('## 3. Media', '', '| File | Media ID | Type | Role | Permission | Scope | Metadata |', '|---|---|---|---|---|---|---|');
  for (const m of R.media) md.push(`| ${m.file} | ${m.id} | ${m.type || '—'} | ${m.role || '—'} | ${m.permission || '—'} | ${m.scope || '—'} | ${m.exif || m.result} |`);
  md.push('', `Documents inventoried (private only): ${R.documents.join('; ') || '—'}`, '');
  md.push('## 4. Gaps, disputes and weak support', '');
  md.push(`- Missing required fields: ${missing.map(m => `${m.field} [${m.state}]`).join('; ') || 'none'}`);
  md.push(`- Disputed (conflicts opened, nothing overwritten): ${R.disputed.map(d => `${d.field}: ${JSON.stringify(d.current)} vs ${JSON.stringify(d.incoming)} → ${d.conflict}`).join('; ') || 'none'}`);
  md.push(`- Corroborated: ${[...new Set(R.corroborated)].join(', ') || 'none'}`);
  md.push(`- Developer claims only (unverified): ${devClaimOnly.join(', ') || 'none'}`);
  md.push(`- Tier 4 only: ${tier4Only.join(', ') || 'none'}`);
  md.push(`- Stale evidence (> ${STALE_DAYS} days or review date passed): ${stale.join(', ') || 'none'}`);
  md.push(`- Professional due diligence required: ${ddRequired.join(', ') || 'none'}`);
  md.push(`- Ingestion errors: ${R.errors.join('; ') || 'none'}`);
  md.push(`- Notes: ${R.notes.join('; ') || 'none'}`, '');
  md.push('## 5. Methods', '', '| Method | Status | Result |', '|---|---|---|');
  for (const m of Object.values(mreg)) md.push(`| ${m.name} | ${m.status} | ${m.status === 'ACTIVE' ? 'run' : `not run — ${m.validation_status.toLowerCase().replace(/_/g, ' ')}`} |`);
  md.push('', '## 6. Validation and publication gate', '');
  md.push(`Validation errors (${relevant.length}): ${relevant.map(e => `[${e.code}] ${e.id}: ${e.msg}`).join('; ') || 'none'}`, '');
  const why = gate.eligibility.opportunities[opp.id] || [];
  md.push(`**Gate ${GATE_VERSION} for ${opp.id}: ${why.length ? 'BLOCKED' : 'PASSES GATE RULES — awaiting owner approval'}**`, '');
  for (const w of why) md.push(`- ${w}`);
  md.push('', 'Media publishability:', '');
  for (const m of store.collections.media.filter(x => x.subject.id === project.id)) md.push(`- ${m.id} (${m.media_type}, ${m.role}): ${gate.eligibility.media[m.id].length ? 'not publishable — ' + gate.eligibility.media[m.id].join('; ') : 'publishable after approval'}`);
  const report = md.join('\n') + '\n';

  // all-or-nothing commit: media derivatives, records, private files and the report in one transaction
  if (willWrite) withTxn(storeDir, 'ingest', (t) => {
    for (const x of mediaPlan) t.copy(x.staged, x.dest);
    saveStore(store, t);
    t.write(path.join(storeDir, 'reports', `${pkg.package_id}.md`), report);
    fault('ingest:before-commit');
  });
  return { report, opp: opp.id, project: project.id, blocked: why, errors: blocking, disputed: R.disputed, privateFacts: R.privateFacts, gateErrors: relevant, written: willWrite };
  } finally { fs.rmSync(staging, { recursive: true, force: true }); }
}

// ------------------------------------------------------------ approve (owner action only)
export function approve({ storeDir, id, by, fixture, today, repoRoot }) {
  if (by !== 'owner') throw new Error('approval must be recorded --by owner');
  storeDir = assertStorePath(storeDir, repoRoot, { fixture });
  const store = loadStore(storeDir);
  const opp = store.collections.opportunities.find(o => o.id === id); if (!opp) throw new Error(`${id} not found`);
  const project = store.collections.projects.find(p => p.id === opp.subject.id);
  const dev = project && store.collections.developers.find(d => d.id === project.developer_id);
  const review = { approved_by: 'owner', approved_at: today, gate_version: GATE_VERSION };
  const snapshot = JSON.stringify(store.collections);
  for (const r of [opp, project, dev].filter(Boolean)) { r.review = review; r.record_status = 'PUBLISHED'; }
  for (const m of store.collections.media.filter(m => [project.id, opp.id].includes(m.subject.id))) {
    const p = m.permission;
    if (p.status === 'GRANTED_WRITTEN' && p.scope.includes('desk_web') && (!p.expires_at || p.expires_at >= today)) m.review = review;
  }
  opp.last_verified = today;
  const gate = runGate(store, { fixture, today, repoRoot });
  const why = gate.eligibility.opportunities[id];
  if (why.length) { store.collections = JSON.parse(snapshot); return { approved: false, why }; }
  saveStore(store);
  return { approved: true, why: [] };
}

// ------------------------------------------------------------ record the owner's legal sign-off of a disclosure text
export function approveDisclosure({ storeDir, id, by, today, fixture = false, repoRoot = path.resolve(HERE, '../..') }) {
  if (by !== 'owner') throw new Error('legal approval must be recorded --by owner after counsel review');
  storeDir = assertStorePath(storeDir, repoRoot, { fixture });
  const store = loadStore(storeDir);
  const d = store.collections.disclosures.find(x => x.id === id); if (!d) throw new Error(`${id} not found`);
  d.legal_review = 'APPROVED'; d.approved_at = today; saveStore(store);
}

// ------------------------------------------------------------ export public projection (approved, real records only)
export function exportPublic({ storeDir, id, repoRoot, today }) {
  if (id.startsWith('FIX-')) throw new Error('illustrative fixtures can never be exported');
  storeDir = assertStorePath(storeDir, repoRoot, { fixture: false });
  recover(path.join(repoRoot, 'desk')); // a crashed earlier export is rolled back before anything is compared
  const store = loadStore(storeDir);
  const gate = runGate(store, { fixture: false, today, repoRoot });
  const opp = store.collections.opportunities.find(o => o.id === id);
  if (!opp || opp.record_status !== 'PUBLISHED' || !opp.review) throw new Error(`${id} is not approved`);
  if (gate.eligibility.opportunities[id].length) throw new Error(`${id} fails the gate: ${gate.eligibility.opportunities[id].join('; ')}`);
  // defence in depth (audit B1): every applicable disclosure must be approved and is exported in full — never skipped
  const disclosures = applicableDisclosures(store.collections.disclosures, opp);
  const pending = disclosures.filter(d => d.legal_review !== 'APPROVED' || !d.approved_at);
  if (!disclosures.length || pending.length) throw new Error(`${id} cannot be exported: ${disclosures.length ? 'disclosure approval pending for ' + pending.map(d => `${d.id} (${d.kind})`).join(', ') : 'no disclosure recorded'}`);
  const disclosureIds = new Set(disclosures.map(d => d.id));
  const pubDir = path.join(repoRoot, 'desk/data/public');
  const pub = {}; for (const c of Object.keys(COLLECTIONS)) pub[c] = JSON.parse(fs.readFileSync(path.join(pubDir, `${c}.json`), 'utf8')).records;
  const market = pub.markets.find(m => m.id === opp.market_id);
  if (!market || market.activation !== 'ACTIVE') throw new Error(`market ${opp.market_id} is not active in the public data (market gate G4)`);
  const project = store.collections.projects.find(p => p.id === opp.subject.id);
  const ids = new Set([opp.id, project.id, project.developer_id, project.district_id, project.area_id, opp.asset_id].filter(Boolean));
  const subj = new Set(ids);
  const skipped = [];
  const sevActive = methods()['M-RISK-SEVERITY'].status === 'ACTIVE';
  const out = { opportunities: [opp], projects: [project] };
  const take = (c, pred) => (out[c] = (out[c] || []).concat(store.collections[c].filter(pred)));
  take('developers', r => ids.has(r.id)); take('districts', r => ids.has(r.id)); take('areas', r => ids.has(r.id)); take('assets', r => ids.has(r.id));
  take('evidence', r => subj.has(r.subject.id) && (r.currency === null || (skipped.push(`${r.id} (currency)`), false)));
  take('conflicts', r => subj.has(r.subject.id));
  take('research_blocks', r => subj.has(r.subject.id));
  take('risks', r => subj.has(r.subject.id));
  take('disclosures', r => disclosureIds.has(r.id));
  take('media', r => subj.has(r.subject.id) && (gate.eligibility.media[r.id].length === 0 || (skipped.push(`${r.id} (${gate.eligibility.media[r.id].join(', ')})`), false)));
  const srcs = new Set([...out.evidence.map(e => e.source_id), ...out.media.map(m => m.provenance.source_id)]);
  take('sources', r => srcs.has(r.id));
  out.risks = out.risks.map(r => sevActive ? r : { ...r, severity: null, probability: null });
  // keep only references that are exported
  const exported = new Set(Object.values(out).flat().map(r => r.id));
  for (const r of Object.values(out).flat()) for (const k of ['evidence_ids', 'risk_ids', 'research_block_ids', 'disclosure_ids', 'conflict_ids']) if (Array.isArray(r[k])) r[k] = r[k].filter(i => exported.has(i));
  for (const [c, recs] of Object.entries(out)) {
    for (const r of recs) { const i = pub[c].findIndex(x => x.id === r.id); if (i >= 0) pub[c][i] = r; else pub[c].push(r); }
    pub[c].sort((a, b) => a.id.localeCompare(b.id));
  }

  // Phase 2: build and validate the complete result in a throw-away copy of the repository first. The real tree is
  // changed only if the staged result validates with zero errors, and then through one transaction that is rolled
  // back if any write or the final validation fails. A crash mid-commit is rolled back by the next command.
  const stage = fs.mkdtempSync(path.join(os.tmpdir(), 'desk-export-stage-'));
  try {
    fs.cpSync(repoRoot, stage, { recursive: true, filter: (src) => { const r = path.relative(repoRoot, src).split(path.sep); return !['.git', 'node_modules'].includes(r[0]) && !(r[0] === 'desk' && r[1] === '_txn') && !src.endsWith('.desk-tmp'); } });
    fault('export:stage');
    for (const [c, recs] of Object.entries(pub)) fs.writeFileSync(path.join(stage, 'desk/data/public', `${c}.json`), JSON.stringify({ schema_version: '1.1', collection: c, records: recs }, null, 2) + '\n');
    for (const m of out.media) {
      const src = path.join(storeDir, 'media', m.subject.id, path.basename(m.file.public_path));
      const dst = path.join(stage, m.file.public_path); fs.mkdirSync(path.dirname(dst), { recursive: true }); fs.copyFileSync(src, dst);
    }
    validateRepo(stage, { today, writeIndex: true });
    execFileSync('node', [path.join(stage, 'desk/_tools/build.mjs')], { stdio: ['ignore', 'pipe', 'pipe'] }); // the opportunity page from the shared template
    fault('export:staged-build');
    const staged = validateRepo(stage, { today });
    if (staged.errors.length) throw new Error(`export refused — the staged result does not validate; nothing was changed: ${staged.errors.slice(0, 8).map(e => `[${e.code}] ${e.id}: ${e.msg}`).join('; ')}`);
    // the change set: every file under desk/ that differs between the staged copy and the real tree
    const list = (root) => { const outF = new Set(); const walk = (d) => { if (!fs.existsSync(d)) return; for (const e of fs.readdirSync(d, { withFileTypes: true })) { const p = path.join(d, e.name); const rel = path.relative(root, p); if (rel.split(path.sep)[0] === '_txn' || e.name.endsWith('.desk-tmp')) continue; if (e.isDirectory()) walk(p); else outF.add(rel); } }; walk(root); return outF; };
    const sDesk = path.join(stage, 'desk'); const rDesk = path.join(repoRoot, 'desk');
    const sFiles = list(sDesk); const rFiles = list(rDesk);
    const writes = [...sFiles].filter(f => !rFiles.has(f) || !fs.readFileSync(path.join(sDesk, f)).equals(fs.readFileSync(path.join(rDesk, f)))).sort();
    const removes = [...rFiles].filter(f => !sFiles.has(f)).sort();
    withTxn(rDesk, 'export', (t) => {
      for (const f of writes) t.copy(path.join(sDesk, f), path.join(rDesk, f));
      for (const f of removes) t.remove(path.join(rDesk, f));
      fault('export:applied');
      const post = validateRepo(repoRoot, { today, inTransaction: true });
      if (post.errors.length) throw new Error(`export rolled back — the public tree did not validate after applying: ${post.errors.slice(0, 8).map(e => `[${e.code}] ${e.id}: ${e.msg}`).join('; ')}`);
    });
    return { exported: [...exported].sort(), skipped, errors: [], changed: writes.map(f => `desk/${f}`), removed: removes.map(f => `desk/${f}`) };
  } finally { fs.rmSync(stage, { recursive: true, force: true }); }
}

// ------------------------------------------------------------ CLI
if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  const [cmd, ...rest] = process.argv.slice(2);
  const a = {}; for (let i = 0; i < rest.length; i++) { if (rest[i].startsWith('--')) { const k = rest[i].slice(2); a[k] = rest[i + 1] && !rest[i + 1].startsWith('--') ? rest[++i] : true; } }
  const today = a.today || new Date().toISOString().slice(0, 10);
  const repoRoot = path.resolve(HERE, '../..');
  const fixture = !!a.fixture;
  if (['ingest', 'gate', 'approve', 'approve-disclosure', 'export', 'recover'].includes(cmd)) {
    try { a.store = assertStorePath(a.store === true ? '' : a.store, repoRoot, { fixture }); }
    catch (e) { console.error(`✗ ${e.message}`); process.exit(2); }
  }
  const refreshFixtureGate = () => { if (fixture) validateRepo(repoRoot, { today, writeIndex: true }); };
  let wrote = false; // the fixture gate report is refreshed only after a command actually changed the fixture store
  process.on('exit', () => { if (wrote) refreshFixtureGate(); });
  try {
    if (cmd === 'ingest') { const r = ingest({ pkgDir: path.resolve(a.package), storeDir: path.resolve(a.store), fixture, apply: !!a.apply, today, repoRoot }); wrote = !!r.written; console.log(r.report); process.exit(r.errors.length ? 1 : 0); }
    else if (cmd === 'gate') { const s = loadStore(path.resolve(a.store)); const g = runGate(s, { fixture, today, repoRoot }); for (const [k, v] of Object.entries(g.eligibility.opportunities)) console.log(`${k}: ${v.length ? 'BLOCKED — ' + v.join('; ') : 'passes gate rules'}`); for (const e of g.errors) console.log(`✗ [${e.code}] ${e.id}: ${e.msg}`); }
    else if (cmd === 'approve') { const r = approve({ storeDir: path.resolve(a.store), id: a.id, by: a.by, fixture, today, repoRoot }); wrote = r.approved; console.log(r.approved ? `${a.id} approved and marked PUBLISHED in the store (not yet exported)` : `${a.id} NOT approved — ${r.why.join('; ')}`); process.exit(r.approved ? 0 : 1); }
    else if (cmd === 'approve-disclosure') { approveDisclosure({ storeDir: a.store, id: a.id, by: a.by, today, fixture, repoRoot }); wrote = true; console.log(`${a.id} legal review recorded as APPROVED`); }
    else if (cmd === 'export') { const r = exportPublic({ storeDir: path.resolve(a.store), id: a.id, repoRoot, today }); console.log(`exported ${r.exported.length} records; skipped: ${r.skipped.join(', ') || 'none'}`); for (const e of r.errors) console.error(`✗ [${e.code}] ${e.id}: ${e.msg}`); process.exit(r.errors.length ? 1 : 0); }
    else if (cmd === 'recover') { const n = recover(a.store); const m = recover(path.join(repoRoot, 'desk')); console.log(`recovered: store ${n} file(s), public tree ${m} file(s)`); }
    else { console.log('commands: ingest | gate | approve-disclosure | approve | export | recover'); process.exit(2); }
  } catch (e) { console.error(`✗ ${e.message}`); process.exit(1); }
}
