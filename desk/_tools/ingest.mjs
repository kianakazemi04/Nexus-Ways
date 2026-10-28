#!/usr/bin/env node
// Nexus Desk ingestion tool: project package → canonical records, media derivatives, ingestion report, gate.
// Zero npm dependencies; raster media derivatives use desk/_tools/media_derive.py (Pillow).
//
//   node desk/_tools/ingest.mjs ingest  --package <dir> --store <dir> [--fixture] [--apply] [--today YYYY-MM-DD]
//   node desk/_tools/ingest.mjs gate    --store <dir> [--fixture]
//   node desk/_tools/ingest.mjs report  --store <dir> --id <OPP-…> [--analysis <file>]   (internal decision report; private)
//   node desk/_tools/ingest.mjs approve-disclosure --store <dir> --id <DSC-…> --by owner  (after counsel approves the text)
//   node desk/_tools/ingest.mjs approve-disclosure-template --store <dir> --id DT-… --by owner [--reference "…"]  (once per standard text)
//   node desk/_tools/ingest.mjs approve --store <dir> --id <OPP-…> --by owner      (only on the owner's explicit instruction)
//   node desk/_tools/ingest.mjs export  --store <dir> --id <OPP-…> --repo <root>   (only after approval; writes public projection)
//   node desk/_tools/ingest.mjs approve-media --store <dir> --id <MED-…> --by owner  (each image, after checking its permission)
//   node desk/_tools/ingest.mjs revoke-media  --store <dir> --id <MED-…> --by owner --reason "…"
//   node desk/_tools/ingest.mjs resolve-conflict --store <dir> --id <CNF-…> --by owner --status EXPLAINED|RESOLVED --note "…" [--accept <EVD-…>]
//   node desk/_tools/ingest.mjs withdraw --store <dir> --id <OPP-…> --by owner --reason "…"
//   node desk/_tools/ingest.mjs compare --store <dir> --ids <OPP-…>,<OPP-…>   (internal side-by-side + research queue)
//   node desk/_tools/ingest.mjs record-permission --file <perm.json> --store <dir> --by owner (sales-office e-mail received later)
//   node desk/_tools/ingest.mjs market-intake  --file <json> --store <dir> --by owner   (market/district research records)
//   node desk/_tools/ingest.mjs record-review  --store <dir> --market <MKT-…> --topic <KEY> --status … [--outcome …]
//        --reviewer "…" --role <ROLE> --reference "…" --reviewed-at YYYY-MM-DD [--valid-until …] [--conditions "a|b"] --by owner
//   node desk/_tools/ingest.mjs market-gate    --store <dir> [--id <MKT-…>]   (computed gate per market; private report)
//   node desk/_tools/ingest.mjs activate-market --store <dir> --id <MKT-…> --by owner   (refused unless its gate passes)
//   node desk/_tools/ingest.mjs export-market --store <dir> --id <MKT-…> --by owner      (activated market → public tree)
//   node desk/_tools/ingest.mjs deactivate-market --store <dir> --id <MKT-…> --by owner --reason "…"
//   node desk/_tools/ingest.mjs recover  --store <dir>            (roll back an interrupted write in the store and desk/)
//   node desk/_tools/ingest.mjs unlock   --store <dir> --force [--public]   (only after checking no command is running)
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
import { COLLECTIONS, SCHEMA, GATE_VERSION, REQUIRED_AT_REVIEW, validateDataset, validateRepo, imageSize, applicableDisclosures, schemaErrors, projectPermissionProblems } from './validate.mjs';
import { loadGateConfig, evaluateMarketGate, gateMarkdown, gateCertificate, REVIEW_STATUS, REVIEW_OUTCOME } from './engines/marketgate.mjs';
import { withTxn, recover, fault, withLock, forceUnlock } from './txn.mjs';
import { claimPublication, isPublicClaim, deriveLastVerified, evidenceFreshness } from '../assets/js/policy.js';
import { checkAnalysis } from './engines/analysis.mjs';
import { decisionReport, reportMarkdown } from './engines/report.mjs';
import { compareOpportunities, compareMarkdown } from './engines/oppcompare.mjs';
import { clientBrief } from './engines/brief.mjs';
import { internalActive } from './engines/report.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const DEFS = SCHEMA.$defs;
const TYPE_TO_COLL = { market: 'markets', district: 'districts', area: 'areas', developer: 'developers', project: 'projects', asset: 'assets', opportunity: 'opportunities' };
const DOMAIN_OF = { market: 'MARKET', district: 'DISTRICT', area: 'AREA', project: 'PROJECT_ASSET', asset: 'PROJECT_ASSET', developer: 'DEVELOPER', opportunity: 'PROJECT_ASSET' };
const PRIVATE_DOMAINS = new Set(['PRICING', 'RENTAL', 'LIQUIDITY', 'MACRO_FX']);

const code = (s) => String(s).normalize('NFKD').replace(/[̀-ͯ]/g, '').toUpperCase().replace(/[^A-Z0-9]+/g, '-').replace(/^-|-$/g, '');
const slugify = (s) => code(s).toLowerCase();
const sha256 = (b) => crypto.createHash('sha256').update(b).digest('hex');
const pad = (n, w) => String(n).padStart(w, '0');
const isEmpty = (v) => v === null || v === undefined || v === '' || (Array.isArray(v) && !v.length);
const eq = (a, b) => JSON.stringify(a) === JSON.stringify(b);
const normName = (s) => String(s || '').normalize('NFKD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();

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
  // a symbolic link INSIDE the store must not lead out of it (e.g. reports/ or media/ linked into the public repository)
  for (const link of storeLinks(store)) {
    let target; try { target = fs.realpathSync.native(link); } catch { throw new StorePathError(`store link ${path.relative(store, link)} cannot be resolved safely`); }
    if (!within(target, store)) throw new StorePathError(`store link ${path.relative(store, link)} leads outside the store${within(target, root) ? ' into the public repository' : ''}`);
  }
  return store;
}
// every symbolic link below the store (the store is small; deep trees are bounded)
function storeLinks(dir, out = [], depth = 0) {
  if (depth > 12 || !fs.existsSync(dir)) return out;
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isSymbolicLink()) out.push(p); else if (e.isDirectory()) storeLinks(p, out, depth + 1);
  }
  return out;
}

// ------------------------------------------------------------ store
export function loadStore(dir) {
  const recovered = recover(dir); // roll back an interrupted write before reading anything
  const collections = {}; const files = {};
  for (const c of Object.keys(COLLECTIONS)) {
    const f = path.join(dir, 'data', `${c}.json`);
    collections[c] = fs.existsSync(f) ? JSON.parse(fs.readFileSync(f, 'utf8')).records : [];
  }
  for (const n of ['private_facts', 'documents', 'media_index', 'audit_log', 'entity_index', 'regulatory_reviews', 'permissions', 'disclosure_approvals']) {
    const f = path.join(dir, 'private', `${n}.json`);
    files[n] = fs.existsSync(f) ? JSON.parse(fs.readFileSync(f, 'utf8')) : (['media_index', 'entity_index'].includes(n) ? {} : []);
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
export const PERMISSION_ACTIVITIES = ['PUBLISH_PROJECT_INFORMATION', 'ADVERTISE_PROJECT', 'PUBLISH_MEDIA'];
export const PERMISSION_ISSUER_ROLES = ['DEVELOPER_SALES_OFFICE', 'DEVELOPER', 'EXCLUSIVE_AGENT', 'OWNER_OF_RIGHTS'];
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
  // identity: an existing record is referenced by ID (ref) or a separate record is requested explicitly (new)
  for (const k of ['developer', 'district', 'area', 'project']) {
    const x = pkg[k]; if (x === undefined || x === null) continue;
    if (typeof x !== 'object') { E(`${k} must be an object`); continue; }
    if (x.ref !== undefined && x.ref !== null && (typeof x.ref !== 'string' || !/^(FIX-)?[A-Z]{2,3}-[A-Z0-9-]+$/.test(x.ref))) E(`${k}.ref must be an existing record ID`);
    if (x.new !== undefined && x.new !== null && typeof x.new !== 'boolean') E(`${k}.new must be true or false`);
    if (x.ref && x.new) E(`${k}: use either ref (existing record) or new (separate record), not both`);
    if (!x.ref && !(typeof x.name === 'string' && x.name.trim())) E(`${k}.name required (or ${k}.ref to an existing record)`);
  }
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
  for (const [i, d] of (pkg.disclosures || []).entries()) {
    const w = `disclosures[${i}]`;
    if (d && d.template) { if (!disclosureTemplate(d.template)) E(`${w}: unknown disclosure template ${d.template}`); if (d.text || d.kind) E(`${w}: give a template or kind + text, not both`); continue; }
    inEnum(w, d && d.kind, 'disclosure_kind'); if (!d || !isText(d.text)) E(`${w}: text (en) required`);
  }
  // written project permissions from the project's sales office (owner's freelance-agent workflow)
  const perms = {};
  for (const [i, x] of (pkg.permissions || []).entries()) {
    const w = `permissions[${i}]${x && x.id ? ` (${x.id})` : ''}`;
    if (!x || typeof x !== 'object') { E(`${w}: not an object`); continue; }
    if (!/^PRIV-PERM-[A-Z0-9-]+$/.test(x.id || '')) { E(`${w}: id must look like PRIV-PERM-<CODE>`); continue; }
    if (perms[x.id]) E(`${w}: duplicate permission id`); perms[x.id] = x;
    if (!x.issuer || !x.issuer.name || !PERMISSION_ISSUER_ROLES.includes(x.issuer.role)) E(`${w}: issuer {name, role} required; role one of ${PERMISSION_ISSUER_ROLES.join(', ')}`);
    if (!x.document) E(`${w}: document required — the permission e-mail or letter as received (it stays in the private store)`);
    else { const d = path.resolve(pkgDir, x.document); if (path.relative(path.resolve(pkgDir), d).startsWith('..') || !fs.existsSync(d)) E(`${w}: document ${x.document} not found in the package`); }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(x.granted_at || '')) E(`${w}: granted_at (YYYY-MM-DD, the date of the e-mail) required`);
    if (x.valid_until !== null && x.valid_until !== undefined && !/^\d{4}-\d{2}-\d{2}$/.test(x.valid_until)) E(`${w}: valid_until must be YYYY-MM-DD or null (no stated end date)`);
    if (!Array.isArray(x.channels) || !x.channels.length) E(`${w}: channels required — only the channels the e-mail actually names (${ENUM('permission_scope').join(', ')})`);
    else for (const c of x.channels) inEnum(`${w} channel`, c, 'permission_scope');
    if (!Array.isArray(x.activities) || !x.activities.length || x.activities.some(a => !PERMISSION_ACTIVITIES.includes(a))) E(`${w}: activities required — subset of ${PERMISSION_ACTIVITIES.join(', ')}, as the e-mail states them`);
    if (x.media !== undefined && x.media !== 'ALL_SUPPLIED' && !(Array.isArray(x.media) && x.media.every(f => typeof f === 'string'))) E(`${w}: media must be "ALL_SUPPLIED" or a list of the package files the e-mail approves`);
    if (x.media && !(x.activities || []).includes('PUBLISH_MEDIA')) E(`${w}: media listed but the permission does not include PUBLISH_MEDIA`);
  }
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
    if (m && (!m.permission || m.permission.from)) {
      // permission derived from a project permission record: only for files that record actually approves
      const ref = m.permission && m.permission.from;
      const cover = Object.values(perms).filter(x => (!ref || x.id === ref) && (x.activities || []).includes('PUBLISH_MEDIA') && (x.media === 'ALL_SUPPLIED' || (Array.isArray(x.media) && x.media.includes(m.file))));
      if (ref && !perms[ref]) E(`${w}: permission.from ${ref} is not a permission in this package`);
      else if (!cover.length) E(`${w}: no permission covers this file — ${ref ? `${ref} does not approve it (media list / PUBLISH_MEDIA)` : 'record {status, scope, evidence_ref, granted_at, expires_at} or a project permission that lists the file'}; use status NOT_REQUESTED if no permission has been sought`);
      continue;
    }
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
    { mode: fixture ? 'fixtures' : 'private', today, mediaCheck, methods: Object.fromEntries(Object.entries(m).map(([k, v]) => [k, v.status])),
      permissions: fixture ? null : (store.private.permissions || []),
      marketGates: { config: loadGateConfig(path.join(repoRoot, 'desk/_tools/market-gates/MG-1.json')), reviews: fixture ? null : (store.private.regulatory_reviews || []), provenance: fixture ? null : store.private.entity_index } });
}

// ------------------------------------------------------------ ingest
export function ingest(args) {
  const storeDir = assertStorePath(args.storeDir, args.repoRoot, { fixture: !!args.fixture });
  return args.apply ? withLock(storeDir, 'ingest', () => ingestUnlocked({ ...args, storeDir })) : ingestUnlocked({ ...args, storeDir });
}
function ingestUnlocked({ pkgDir, storeDir, fixture = false, apply = false, today, repoRoot }) {
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
    if (ex && (ex.tier !== s.tier || ex.source_type !== s.source_type)) { fail(`source ${s.key} matches existing ${ex.id} by ${s.url && ex.url === s.url ? 'URL' : 'name and publisher'} but its tier/type differ (${ex.tier}/${ex.source_type} vs ${s.tier}/${s.source_type}); not linked — correct the package or the source record`); continue; }
    if (ex) { srcId[s.key] = ex.id; R.reused.push(ex.id); continue; }
    const rec = { id: `${fx}SRC-${code(pkg.package_id.replace(/^FIX-/, ''))}-${code(s.key)}`, name: s.name, publisher: s.publisher, url: s.url ?? null, tier: s.tier, source_type: s.source_type, accessed_at: s.accessed_at ?? received, notes: s.notes ?? null, is_illustrative: isIll };
    srcId[s.key] = upsert('sources', rec).id;
  }

  // ---- identity resolution (closure Task 4). Records are linked only by stable IDs; a matching name is never enough.
  //   <entity>.ref  = an existing record ID → linked to that record (type and market are checked)
  //   <entity>.new  = true → a separate record is created even though a record with the same name exists
  //   otherwise a record with the same name/slug/legal entity (or the same derived ID) is an UNRESOLVED IDENTITY and the
  //   package is refused — except when that record was created by this same package (a re-ingestion, not a guess).
  const identity = []; const unresolved = [];
  const created = (coll, rec) => { const r = upsert(coll, rec); store.private.entity_index[r.id] = { created_by: pkg.package_id, received_at: received }; return r; };
  const uniqueId = (coll, id) => { let n = 1; let out = id; while (store.collections[coll].some(r => r.id === out)) out = `${id}-${++n}`; return out; };
  const resolve = (type, coll, spec, label, candidatesOf, scopeOk, make) => {
    if (!spec) return null;
    if (spec.ref) {
      const rec = store.collections[coll].find(r => r.id === spec.ref);
      if (!rec) { const other = byId(store, spec.ref); unresolved.push(`${type}.ref ${spec.ref} ${other ? `is not a ${type} record` : 'does not exist in this store'}`); return null; }
      const bad = scopeOk(rec); if (bad) { unresolved.push(`${type}.ref ${spec.ref}: ${bad}`); return null; }
      identity.push(`${type} ${rec.id} — linked by explicit ref${normName(rec.name) !== normName(label) && label ? ` (package name "${label}" differs from the record name "${rec.name}"; the record is not renamed)` : ''}`);
      R.reused.push(rec.id); return rec;
    }
    const proposed = make(null).id;
    const cands = store.collections[coll].filter(r => r.id === proposed || candidatesOf(r));
    if (!cands.length) { const rec = created(coll, make(proposed)); identity.push(`${type} ${rec.id} — new record`); return rec; }
    // provenance, not the name: exactly one candidate was created by this same package → this is a re-ingestion
    const own = cands.filter(c => (store.private.entity_index[c.id] || {}).created_by === pkg.package_id);
    if (own.length === 1 && !spec.new) { identity.push(`${type} ${own[0].id} — created earlier by this same package (re-ingestion)`); R.reused.push(own[0].id); return own[0]; }
    if (spec.new === true) { const rec = created(coll, make(uniqueId(coll, proposed))); identity.push(`${type} ${rec.id} — new record by explicit instruction; same name as ${cands.map(c => c.id).join(', ')} (not merged)`); return rec; }
    unresolved.push(`${type} "${label}" matches existing ${cands.map(c => `${c.id} ("${c.name}")`).join(', ')} — set ${type}.ref to the existing ID if it is the same ${type}, or ${type}.new: true if it is a different one; nothing was linked by name`);
    return null;
  };
  const d0 = pkg.developer;
  const developer = resolve('developer', 'developers', d0, d0 && d0.name,
    (x) => normName(x.name) === normName(d0.name) || (d0.legal_entity_name && x.legal_entity_name && normName(x.legal_entity_name) === normName(d0.legal_entity_name)),
    () => null,
    (id) => ({ id: id || `${fx}DEV-${code(d0.name)}`, name: d0.name, legal_entity_name: null, verification_status: 'UNVERIFIED', record_status: 'RESEARCH_IN_PROGRESS', summary: d0.summary ?? null, evidence_ids: [], field_states: [], is_illustrative: isIll, review: null }));
  const inMarket = (x) => x.market_id === market.id ? null : `belongs to market ${x.market_id}, not ${market.id}`;
  const ds0 = pkg.district; const dslug = ds0 && (ds0.slug || slugify(ds0.name));
  const district = resolve('district', 'districts', ds0, ds0 && ds0.name,
    (x) => x.market_id === market.id && (x.slug === dslug || normName(x.name) === normName(ds0.name)), inMarket,
    (id) => ({ id: id || `${fx}DST-${MK}-${code(dslug)}`, market_id: market.id, slug: dslug, name: ds0.name, admin_level: ds0.admin_level || 'DISTRICT', record_status: 'RESEARCH_IN_PROGRESS', research_block_ids: [], evidence_ids: [], field_states: [], is_illustrative: isIll, review: null }));
  const ar0 = pkg.area; const aslug = ar0 && (ar0.slug || slugify(ar0.name));
  const area = resolve('area', 'areas', ar0, ar0 && ar0.name,
    (x) => x.market_id === market.id && (x.slug === aslug || normName(x.name) === normName(ar0.name)), inMarket,
    (id) => ({ id: id || `${fx}ARE-${MK}-${code(aslug)}`, market_id: market.id, district_id: district ? district.id : null, slug: aslug, name: ar0.name, record_status: 'RESEARCH_IN_PROGRESS', evidence_ids: [], field_states: [], is_illustrative: isIll, review: null }));
  const p = pkg.project; const pslug = p.slug || slugify(p.name);
  const project = resolve('project', 'projects', p, p.name,
    (x) => x.market_id === market.id && (x.slug === pslug || normName(x.name) === normName(p.name)), inMarket,
    (id) => ({ id: id || `${fx}PRJ-${MK}-${code(pslug)}`, category: pkg.category, market_id: market.id, developer_id: developer ? developer.id : null, name: p.name, slug: pslug,
      district_id: district ? district.id : null, area_id: area ? area.id : null, delivery_status: null, expected_delivery: null,
      asset_types: p.asset_types || [], description: p.description ?? null, record_status: 'RESEARCH_IN_PROGRESS',
      research_block_ids: [], evidence_ids: [], risk_ids: [], field_states: [], is_illustrative: isIll, review: null }));
  if (unresolved.length) {
    const report = `# Ingestion report · ${pkg.package_id}\n\n**REFUSED — unresolved identity; nothing was written.** Records are linked by ID only, never by a matching name.\n\n${unresolved.map(e => `- UNRESOLVED IDENTITY: ${e}`).join('\n')}\n`;
    return { report, opp: null, project: null, blocked: [], errors: unresolved, disputed: [], privateFacts: [], gateErrors: [], written: false, unresolved };
  }
  const K = project.id.replace(/^(FIX-)?PRJ-/, '');
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
    title: o.title || { en: p.name }, summary: o.summary ?? null, investor_objective_tags: o.investor_objective_tags || [], advertising_permit: o.advertising_permit ? String(o.advertising_permit).trim() : null, record_status: 'RESEARCH_IN_PROGRESS',
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
  for (const d0 of pkg.disclosures || []) {
    const id = nextSeq(store, 'disclosures', `${fx}DSC-${K}-`, 2);
    // a standard template whose exact text the owner approved is reused as APPROVED (owner decision K-3)
    const tpl = d0.template ? disclosureTemplate(d0.template) : null;
    const d = tpl ? { kind: tpl.kind, text: tpl.text } : d0;
    const ok = tpl ? approvedTemplate(store, tpl) : null;
    store.collections.disclosures.push({ id, subject: { type: 'opportunity', id: opp.id }, kind: d.kind, text: d.text, legal_review: ok ? 'APPROVED' : 'PENDING', approved_at: ok ? ok.approved_at : null, is_illustrative: isIll });
    if (tpl) R.disclosures = (R.disclosures || []).concat(`${id} from template ${tpl.id}: ${ok ? `APPROVED (${ok.adopted ? 'standard text adopted' : 'template approval'} ${ok.approved_at})` : 'PENDING — template not approved yet (approve-disclosure-template --by owner)'}`);
    opp.disclosure_ids.push(id); R.created.push(id);
    if (d.legal_review === 'APPROVED') note(`${id}: package marks legal review as APPROVED; ingestion records PENDING — legal approval is recorded only by the owner`);
  }
  // documents — inventory only, never copied anywhere public
  for (const d of pkg.documents || []) { store.private.documents.push({ package_id: pkg.package_id, project_id: project.id, ...d }); R.documents.push(d.title); }

  // project permissions (sales-office e-mails): recorded privately with the document's hash; never published
  const permRec = {};
  for (const x of pkg.permissions || []) {
    const doc = fs.readFileSync(path.join(pkgDir, x.document));
    const rec = { id: x.id, package_id: pkg.package_id, project_id: project.id, issuer: x.issuer, document: { file: x.document, sha256: sha256(doc) },
      granted_at: x.granted_at, received_at: x.received_at || received, valid_until: x.valid_until ?? null, channels: x.channels, activities: x.activities,
      media: x.media ?? null, conditions: x.conditions || [], attribution_text: x.attribution_text ?? null, statutory_permit: x.statutory_permit ?? null, status: 'GRANTED_WRITTEN', revoked_at: null };
    const ex = store.private.permissions.find(r => r.id === rec.id && r.project_id === project.id);
    if (ex && ex.document.sha256 !== rec.document.sha256) { fail(`permission ${x.id}: already recorded for ${project.id} with a different document; record a new permission id`); continue; }
    if (!ex) store.private.permissions.push(rec);
    permRec[x.id] = ex || rec;
    R.permissions = (R.permissions || []).concat(`${x.id} — ${x.issuer.name} (${x.issuer.role}), ${x.granted_at}${x.valid_until ? ' → ' + x.valid_until : ', no end date stated'}; channels ${x.channels.join(', ')}; ${x.activities.join(', ')}${x.media ? `; media ${x.media === 'ALL_SUPPLIED' ? 'all supplied' : x.media.length + ' file(s)'}` : '; no media'}`);
  }
  const permFor = (m) => {
    if (m.permission && !m.permission.from) return { permission: m.permission, attribution: m.attribution };
    const x = Object.values(permRec).find(p => (!m.permission || p.id === m.permission.from) && p.activities.includes('PUBLISH_MEDIA') && (p.media === 'ALL_SUPPLIED' || (Array.isArray(p.media) && p.media.includes(m.file))));
    return { permission: { status: 'GRANTED_WRITTEN', scope: x.channels, evidence_ref: x.id, granted_at: x.granted_at, expires_at: x.valid_until },
      attribution: x.attribution_text && !(m.attribution && m.attribution.required) ? { required: true, text: x.attribution_text } : m.attribution };
  };
  // media — each image processed independently and bound to this project
  const mediaPlan = [];
  for (let m of pkg.media || []) {
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
    const pf = permFor(m); m = { ...m, permission: pf.permission, attribution: pf.attribution };
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
  // review policy RP-1 (the same function the gate and the pages use): review due, expired, or no valid date
  const stale = evid.map(e => [e, evidenceFreshness(e, today, (find(store, 'sources', x => x.id === e.source_id) || {}).source_type || null)]).filter(([, f]) => f.state !== 'CURRENT').map(([e, f]) => `${e.id} (${f.state})`);
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
  md.push('## 0. Identity (linked by ID only; never by a matching name)', '', ...identity.map(x => `- ${x}`), '');
  md.push('## 1. Records', '', `Created (${R.created.length}): ${R.created.join(', ') || '—'}`, '', `Reused (${[...new Set(R.reused)].length}): ${[...new Set(R.reused)].join(', ') || '—'}`, '', `Values set: ${R.updated.join(', ') || '—'}`, '');
  md.push('## 2. Fact mapping (intelligence domain → owning record)', '', '| Fact | Domain | Owner record.field | Evidence | Class | Verification | Tier |', '|---|---|---|---|---|---|---|');
  for (const f of R.facts) md.push(`| ${f.label} | ${f.domain} | ${f.subject}${f.field ? '.' + f.field : ''} | ${f.evidence} | ${f.class} | ${f.verification} | ${f.tier} |`);
  md.push('', `Private-only facts routed to the private store (${R.privateFacts.length}): ${R.privateFacts.map(f => `${f.label} (${f.domain}; ${f.reason})`).join(', ') || '—'}`, '');
  md.push('## 3. Media', '', '| File | Media ID | Type | Role | Permission | Scope | Metadata |', '|---|---|---|---|---|---|---|');
  for (const m of R.media) md.push(`| ${m.file} | ${m.id} | ${m.type || '—'} | ${m.role || '—'} | ${m.permission || '—'} | ${m.scope || '—'} | ${m.exif || m.result} |`);
  md.push('', `Documents inventoried (private only): ${R.documents.join('; ') || '—'}`, '');
  if (R.disclosures && R.disclosures.length) md.push('## Disclosures from standard templates', '', ...R.disclosures.map(x => `- ${x}`), '');
  md.push('## Project permissions (private)', '', ...(R.permissions && R.permissions.length ? R.permissions.map(x => `- ${x}`) : ['- none supplied — no opportunity of this project can be published until the sales office\'s written permission is recorded']), '');
  md.push('## 4. Gaps, disputes and weak support', '');
  md.push(`- Missing required fields: ${missing.map(m => `${m.field} [${m.state}]`).join('; ') || 'none'}`);
  md.push(`- Disputed (conflicts opened, nothing overwritten): ${R.disputed.map(d => `${d.field}: ${JSON.stringify(d.current)} vs ${JSON.stringify(d.incoming)} → ${d.conflict}`).join('; ') || 'none'}`);
  md.push(`- Corroborated: ${[...new Set(R.corroborated)].join(', ') || 'none'}`);
  md.push(`- Developer claims only (unverified): ${devClaimOnly.join(', ') || 'none'}`);
  md.push(`- Tier 4 only: ${tier4Only.join(', ') || 'none'}`);
  md.push(`- Stale evidence (review policy RP-1: review due, expired or no valid date): ${stale.join(', ') || 'none'}`);
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

// ------------------------------------------------------------ owner actions: common rules
// "--by owner" records who acted; it is NOT authentication (anyone who can run this tool can type it). Every owner
// action holds the store lock for its whole run, writes the store in one transaction, and appends to the private
// audit log (private/audit_log.json): action, subject, actor, date, details. The audit log is never published.
const ACTOR = 'owner (recorded by --by flag; not authenticated)';
const requireOwner = (by, what) => { if (by !== 'owner') throw new Error(`${what} must be recorded --by owner`); };
const audit = (store, action, id, today, details = {}) => store.private.audit_log.push({ seq: store.private.audit_log.length + 1, action, id, at: today, actor: ACTOR, ...details });
function ownerAction({ storeDir, repoRoot, fixture, label }, fn) {
  storeDir = assertStorePath(storeDir, repoRoot, { fixture });
  return withLock(storeDir, label, () => fn(storeDir));
}
const subjectRecs = (store, opp) => {
  const project = store.collections.projects.find(p => p.id === opp.subject.id) || null;
  const developer = project && store.collections.developers.find(d => d.id === project.developer_id) || null;
  const asset = opp.asset_id ? store.collections.assets.find(a => a.id === opp.asset_id) || null : null;
  return { project, developer, asset, list: [{ type: 'project', rec: project }, { type: 'developer', rec: developer }, { type: 'asset', rec: asset }] };
};

// ------------------------------------------------------------ approve (owner action only)
// Approves the opportunity, its project and developer. Images are NOT approved here: every image needs its own
// approve-media decision (B3). "Last verified" is derived from evidence verification dates, never the approval date.
export function approve({ storeDir, id, by, fixture, today, repoRoot }) {
  requireOwner(by, 'approval');
  return ownerAction({ storeDir, repoRoot, fixture, label: 'approve' }, (dir) => {
    const store = loadStore(dir);
    const opp = store.collections.opportunities.find(o => o.id === id); if (!opp) throw new Error(`${id} not found`);
    const { project, developer, list } = subjectRecs(store, opp);
    const review = { approved_by: 'owner', approved_at: today, gate_version: GATE_VERSION };
    const snapshot = JSON.stringify(store.collections);
    for (const r of [opp, project, developer].filter(Boolean)) { r.review = review; r.record_status = 'PUBLISHED'; }
    opp.last_verified = deriveLastVerified(list, store.collections.evidence);
    const gate = runGate(store, { fixture, today, repoRoot });
    const why = gate.eligibility.opportunities[id];
    if (why.length) { store.collections = JSON.parse(snapshot); return { approved: false, why }; }
    audit(store, 'approve', id, today, { gate_version: GATE_VERSION, last_verified: opp.last_verified });
    saveStore(store);
    return { approved: true, why: [], last_verified: opp.last_verified };
  });
}

// ------------------------------------------------------------ standard disclosure templates (owner decision K-3)
const TEMPLATES_PATH = path.join(HERE, 'disclosures/standard.json');
export function disclosureTemplate(id) { try { return JSON.parse(fs.readFileSync(TEMPLATES_PATH, 'utf8')).templates.find(t => t.id === id) || null; } catch { return null; } }
const textHash = (text) => sha256(Buffer.from(JSON.stringify(text)));
// the approval applies only to the exact text it was given for
function approvedTemplate(store, tpl) {
  const rec = (store.private.disclosure_approvals || []).filter(a => a.template_id === tpl.id && a.text_sha256 === textHash(tpl.text)).pop();
  if (rec) return rec;
  // a standard text the owner adopted as site-wide wording (owner decision 28 Oct 2026), bound to its exact text
  const a = tpl.adopted;
  return a && a.by === 'owner' && a.at && a.text_sha256 === textHash(tpl.text) ? { approved_at: a.at, adopted: true } : null;
}
export function approveDisclosureTemplate({ storeDir, id, by, reference = null, today, fixture = false, repoRoot = path.resolve(HERE, '../..') }) {
  requireOwner(by, 'approval of a standard disclosure text (after your own or counsel review)');
  const tpl = disclosureTemplate(id); if (!tpl) throw new Error(`unknown disclosure template ${id}`);
  return ownerAction({ storeDir, repoRoot, fixture, label: 'approve-disclosure-template' }, (dir) => {
    const store = loadStore(dir);
    const rec = { template_id: tpl.id, kind: tpl.kind, text_sha256: textHash(tpl.text), approved_at: today, approved_by: 'owner', reference: reference && reference !== true ? String(reference) : null };
    store.private.disclosure_approvals.push(rec);
    // existing PENDING disclosures with exactly this text become APPROVED as of the template approval
    const updated = [];
    for (const d of store.collections.disclosures) if (d.legal_review !== 'APPROVED' && d.kind === tpl.kind && textHash(d.text) === rec.text_sha256) { d.legal_review = 'APPROVED'; d.approved_at = today; updated.push(d.id); }
    audit(store, 'approve-disclosure-template', tpl.id, today, { text_sha256: rec.text_sha256, reference: rec.reference, disclosures_updated: updated });
    saveStore(store);
    return { ...rec, updated };
  });
}

// ------------------------------------------------------------ record the owner's legal sign-off of a disclosure text
export function approveDisclosure({ storeDir, id, by, today, fixture = false, repoRoot = path.resolve(HERE, '../..') }) {
  requireOwner(by, 'legal approval (after counsel review)');
  return ownerAction({ storeDir, repoRoot, fixture, label: 'approve-disclosure' }, (dir) => {
    const store = loadStore(dir);
    const d = store.collections.disclosures.find(x => x.id === id); if (!d) throw new Error(`${id} not found`);
    d.legal_review = 'APPROVED'; d.approved_at = today;
    audit(store, 'approve-disclosure', id, today, { kind: d.kind });
    saveStore(store);
  });
}

// ------------------------------------------------------------ per-image approval and revocation (B3)
// The permission of each image is checked on its own: written permission, a reference to the permission record,
// the desk_web scope (channel), not expired, not revoked, attribution present when required, processed file bound
// to this project. (The schema has no territory field; channel scope is the only use restriction represented.)
export function mediaPermissionProblems(m, today) {
  const p = m.permission || null; const why = [];
  if (!p) return ['no permission recorded'];
  if (p.status === 'REVOKED') why.push(`permission revoked${p.revoked_at ? ' on ' + p.revoked_at : ''}`);
  else if (p.status !== 'GRANTED_WRITTEN') why.push(`permission is ${p.status}, not written (possession of a file or an informal message is not permission)`);
  if (!p.evidence_ref) why.push('no reference to the private permission record');
  if (!(p.scope || []).includes('desk_web')) why.push('scope does not include desk_web');
  if (p.expires_at && p.expires_at < today) why.push(`permission expired on ${p.expires_at}`);
  if (m.attribution && m.attribution.required && !m.attribution.text) why.push('attribution required but missing');
  if (!m.file || /^0+$/.test(m.file.sha256 || '0')) why.push('file not processed');
  return why;
}
export function approveMedia({ storeDir, id, by, fixture = false, today, repoRoot }) {
  requireOwner(by, 'image approval');
  return ownerAction({ storeDir, repoRoot, fixture, label: 'approve-media' }, (dir) => {
    const store = loadStore(dir);
    const m = store.collections.media.find(x => x.id === id); if (!m) throw new Error(`${id} not found`);
    const subj = m.subject && (store.collections.projects.find(p => p.id === m.subject.id) || store.collections.opportunities.find(o => o.id === m.subject.id));
    const why = mediaPermissionProblems(m, today);
    if (!fixture && m.permission && m.permission.status === 'GRANTED_WRITTEN' && m.subject) for (const w of projectPermissionProblems(store.private.permissions, m.subject.id, m.permission.evidence_ref, 'PUBLISH_MEDIA', today)) why.push(`permission record: ${w}`);
    if (!subj) why.push(`subject ${m.subject && m.subject.id} not found in this store`);
    else if (m.file && !m.file.public_path.includes(`/${m.subject.id}/`)) why.push('file path is not bound to its own project');
    if (why.length) return { approved: false, why };
    m.review = { approved_by: 'owner', approved_at: today, gate_version: GATE_VERSION };
    audit(store, 'approve-media', id, today, { subject: m.subject.id, permission_ref: m.permission.evidence_ref, scope: m.permission.scope, expires_at: m.permission.expires_at });
    saveStore(store);
    return { approved: true, why: [] };
  });
}
export function revokeMedia({ storeDir, id, by, reason, fixture = false, today, repoRoot }) {
  requireOwner(by, 'permission revocation');
  if (!reason || reason === true) throw new Error('--reason is required');
  return ownerAction({ storeDir, repoRoot, fixture, label: 'revoke-media' }, (dir) => {
    const store = loadStore(dir);
    const m = store.collections.media.find(x => x.id === id); if (!m) throw new Error(`${id} not found`);
    if (m.permission && m.permission.status === 'REVOKED') return { changed: false, publicPath: m.file.public_path };
    const previous = m.permission ? m.permission.status : null;
    m.permission = { ...(m.permission || { scope: [], evidence_ref: null, granted_at: null, expires_at: null }), status: 'REVOKED', revoked_at: today };
    m.review = null;
    audit(store, 'revoke-media', id, today, { subject: m.subject.id, previous_status: previous, reason });
    saveStore(store);
    const pub = path.join(repoRoot, 'desk/data/public/media.json');
    const isPublic = fs.existsSync(pub) && JSON.parse(fs.readFileSync(pub, 'utf8')).records.some(x => x.id === id);
    return { changed: true, isPublic, publicPath: m.file.public_path };
  });
}

// ------------------------------------------------------------ conflict resolution (B5)
// RESOLVED: the owner accepts one evidence record; its value becomes the record's value (the previous value is kept in
// the audit log). EXPLAINED: both sides stay, with a written explanation. Either way every conflicting evidence record
// and its conflict link are kept; nothing is deleted. If a published opportunity's value changes, it is set to
// WITHHELD and needs a new owner approval before the next export.
export function resolveConflict({ storeDir, id, by, status, note, accept = null, fixture = false, today, repoRoot }) {
  requireOwner(by, 'conflict resolution');
  if (!['RESOLVED', 'EXPLAINED'].includes(status)) throw new Error('--status must be RESOLVED or EXPLAINED');
  if (!note || note === true) throw new Error('--note (the written resolution or explanation) is required');
  return ownerAction({ storeDir, repoRoot, fixture, label: 'resolve-conflict' }, (dir) => {
    const store = loadStore(dir);
    const c = store.collections.conflicts.find(x => x.id === id); if (!c) throw new Error(`${id} not found`);
    if (c.status !== 'OPEN') throw new Error(`${id} is already ${c.status}`);
    const coll = TYPE_TO_COLL[c.subject.type]; const sub = store.collections[coll].find(r => r.id === c.subject.id);
    const details = { status, note, field: c.field, evidence_ids: [...c.evidence_ids] };
    if (status === 'RESOLVED') {
      if (!accept || !c.evidence_ids.includes(accept)) throw new Error(`--accept must name one of ${c.evidence_ids.join(', ')}`);
      const e = store.collections.evidence.find(x => x.id === accept);
      if (!isPublicClaim(e)) throw new Error(`${accept} is not publishable evidence (${claimPublication(e).reason}); it cannot settle a conflict`);
      details.accepted = accept; details.previous_value = sub ? sub[c.field] ?? null : null; details.new_value = e.value;
      if (sub && c.field && !eq(sub[c.field], e.value)) {
        sub[c.field] = e.value;
        const touches = (o) => [o.subject.id, o.asset_id, o.id].includes(sub.id) || store.collections.projects.some(p => p.id === o.subject.id && p.developer_id === sub.id);
        for (const o of store.collections.opportunities.filter(o => o.record_status === 'PUBLISHED' && touches(o))) {
          o.record_status = 'WITHHELD'; o.review = null; details.withheld = (details.withheld || []).concat(o.id);
        }
      }
    }
    c.status = status; c.note = { en: note };
    audit(store, 'resolve-conflict', id, today, details);
    saveStore(store);
    return details;
  });
}

// ------------------------------------------------------------ public projection: one staged, validated, atomic change
// mutate(pub, stage) edits the public collections (and copies media into the staged tree). Afterwards: media files no
// longer referenced are removed, unreferenced sources are dropped, published.json and pages are regenerated, the
// staged copy must validate with zero errors, and only then is the difference applied to desk/ in one transaction
// (re-validated before commit). Holds the lock on desk/ for the whole run.
function publicChange({ repoRoot, today, label }, mutate) {
  const rDesk = path.join(repoRoot, 'desk');
  return withLock(rDesk, label, () => {
    recover(rDesk); // a crashed earlier change is rolled back before anything is compared
    const stage = fs.mkdtempSync(path.join(os.tmpdir(), `desk-${label}-stage-`));
    try {
      fs.cpSync(repoRoot, stage, { recursive: true, filter: (src) => { const r = path.relative(repoRoot, src).split(path.sep); return !['.git', 'node_modules'].includes(r[0]) && !(r[0] === 'desk' && (r[1] === '_txn' || r[1] === '_lock.json')) && !src.endsWith('.desk-tmp'); } });
      fault(`${label}:stage`);
      const pubDir = path.join(stage, 'desk/data/public');
      const pub = {}; for (const c of Object.keys(COLLECTIONS)) pub[c] = JSON.parse(fs.readFileSync(path.join(pubDir, `${c}.json`), 'utf8')).records;
      const info = mutate(pub, stage) || {};
      // sources are kept only while something public references them
      const usedSrc = new Set([...pub.evidence.map(e => e.source_id), ...pub.media.map(m => m.provenance && m.provenance.source_id)]);
      pub.sources = pub.sources.filter(s => usedSrc.has(s.id));
      for (const [c, recs] of Object.entries(pub)) { recs.sort((a, b) => a.id.localeCompare(b.id)); fs.writeFileSync(path.join(pubDir, `${c}.json`), JSON.stringify({ schema_version: '1.1', collection: c, records: recs }, null, 2) + '\n'); }
      // no orphan media: every file under desk/media must belong to a public media record
      const keep = new Set(pub.media.map(m => m.file.public_path));
      const mediaRoot = path.join(stage, 'desk/media');
      if (fs.existsSync(mediaRoot)) for (const f of fs.readdirSync(mediaRoot, { recursive: true }).map(String)) {
        const abs = path.join(mediaRoot, f); const rel = `desk/media/${f.split(path.sep).join('/')}`;
        if (fs.statSync(abs).isFile() && !rel.endsWith('.gitkeep') && !keep.has(rel)) fs.rmSync(abs);
      }
      validateRepo(stage, { today, writeIndex: true });
      execFileSync('node', [path.join(stage, 'desk/_tools/build.mjs')], { stdio: ['ignore', 'pipe', 'pipe'] });
      fault(`${label}:staged-build`);
      const staged = validateRepo(stage, { today });
      if (staged.errors.length) throw new Error(`${label} refused — the staged result does not validate; nothing was changed: ${staged.errors.slice(0, 8).map(e => `[${e.code}] ${e.id}: ${e.msg}`).join('; ')}`);
      const list = (root) => { const outF = new Set(); const walk = (d) => { if (!fs.existsSync(d)) return; for (const e of fs.readdirSync(d, { withFileTypes: true })) { const p = path.join(d, e.name); const rel = path.relative(root, p); const top = rel.split(path.sep)[0]; if (top === '_txn' || top === '_lock.json' || e.name.endsWith('.desk-tmp')) continue; if (e.isDirectory()) walk(p); else outF.add(rel); } }; walk(root); return outF; };
      const sDesk = path.join(stage, 'desk');
      const sFiles = list(sDesk); const rFiles = list(rDesk);
      const writes = [...sFiles].filter(f => !rFiles.has(f) || !fs.readFileSync(path.join(sDesk, f)).equals(fs.readFileSync(path.join(rDesk, f)))).sort();
      const removes = [...rFiles].filter(f => !sFiles.has(f)).sort();
      withTxn(rDesk, label, (t) => {
        for (const f of writes) t.copy(path.join(sDesk, f), path.join(rDesk, f));
        for (const f of removes) t.remove(path.join(rDesk, f));
        fault(`${label}:applied`);
        const post = validateRepo(repoRoot, { today, inTransaction: true });
        if (post.errors.length) throw new Error(`${label} rolled back — the public tree did not validate after applying: ${post.errors.slice(0, 8).map(e => `[${e.code}] ${e.id}: ${e.msg}`).join('; ')}`);
      });
      // empty folders left by removed media or pages
      for (const d of [...new Set(removes.map(f => path.dirname(path.join(rDesk, f))))].sort((a, b) => b.length - a.length)) { try { if (fs.existsSync(d) && !fs.readdirSync(d).length) fs.rmdirSync(d); } catch { /* keep */ } }
      return { ...info, changed: writes.map(f => `desk/${f}`), removed: removes.map(f => `desk/${f}`) };
    } finally { fs.rmSync(stage, { recursive: true, force: true }); }
  });
}
// records in the public projection that belong to a set of subjects
const SUBJECT_BOUND = ['evidence', 'conflicts', 'research_blocks', 'risks', 'media', 'disclosures'];
function dropSubjects(pub, ids) {
  for (const c of SUBJECT_BOUND) pub[c] = pub[c].filter(r => !(r.subject && ids.has(r.subject.id)));
  for (const c of ['opportunities', 'projects', 'assets', 'developers', 'districts', 'areas']) pub[c] = pub[c].filter(r => !ids.has(r.id));
}

// ------------------------------------------------------------ export public projection (approved, real records only)
export function exportPublic({ storeDir, id, repoRoot, today }) {
  if (id.startsWith('FIX-')) throw new Error('illustrative fixtures can never be exported');
  storeDir = assertStorePath(storeDir, repoRoot, { fixture: false });
  return withLock(storeDir, 'export', () => {
    const store = loadStore(storeDir);
    const gate = runGate(store, { fixture: false, today, repoRoot });
    const opp0 = store.collections.opportunities.find(o => o.id === id);
    if (!opp0 || opp0.record_status !== 'PUBLISHED' || !opp0.review) throw new Error(`${id} is not approved${opp0 && opp0.record_status === 'WITHHELD' ? ' (withheld or withdrawn: a new owner approval is required before export)' : ''}`);
    if (gate.eligibility.opportunities[id].length) throw new Error(`${id} fails the gate: ${gate.eligibility.opportunities[id].join('; ')}`);
    // defence in depth (audit B1): every applicable disclosure must be approved and is exported in full — never skipped
    const disclosures = applicableDisclosures(store.collections.disclosures, opp0);
    const pending = disclosures.filter(d => d.legal_review !== 'APPROVED' || !d.approved_at);
    if (!disclosures.length || pending.length) throw new Error(`${id} cannot be exported: ${disclosures.length ? 'disclosure approval pending for ' + pending.map(d => `${d.id} (${d.kind})`).join(', ') : 'no disclosure recorded'}`);
    const disclosureIds = new Set(disclosures.map(d => d.id));
    const clone = (x) => JSON.parse(JSON.stringify(x));
    const opp = clone(opp0);
    const project = clone(store.collections.projects.find(p => p.id === opp.subject.id));
    const own = new Set([opp.id, project.id, ...store.collections.assets.filter(a => a.project_id === project.id).map(a => a.id)]);
    const shared = new Set([project.developer_id, project.district_id, project.area_id].filter(Boolean));
    // district research is market research (PUB-2): the district record is exported, its research and evidence are not
    const subj = new Set([opp.id, project.id, opp.asset_id, project.developer_id, project.area_id].filter(Boolean));
    const skipped = []; const heldBack = [];
    const sevActive = methods()['M-RISK-SEVERITY'].status === 'ACTIVE';
    const out = { opportunities: [opp], projects: [project] };
    const take = (c, pred) => (out[c] = (out[c] || []).concat(store.collections[c].filter(pred).map(clone)));
    take('developers', r => shared.has(r.id)); take('districts', r => shared.has(r.id)); take('areas', r => shared.has(r.id)); take('assets', r => r.id === opp.asset_id);
    take('evidence', r => subj.has(r.subject.id) && (r.currency === null || (skipped.push(`${r.id} (currency)`), false))
      && (isPublicClaim(r) || (heldBack.push(`${r.id} (${claimPublication(r).reason})`), false)));
    take('conflicts', r => subj.has(r.subject.id));
    take('research_blocks', r => subj.has(r.subject.id));
    take('risks', r => subj.has(r.subject.id));
    take('disclosures', r => disclosureIds.has(r.id));
    take('media', r => [opp.id, project.id].includes(r.subject.id) && (gate.eligibility.media[r.id].length === 0 || (skipped.push(`${r.id} (${gate.eligibility.media[r.id].join(', ')})`), false)));
    const srcs = new Set([...out.evidence.map(e => e.source_id), ...out.media.map(m => m.provenance.source_id)]);
    take('sources', r => srcs.has(r.id));
    out.risks = out.risks.map(r => sevActive ? r : { ...r, severity: null, probability: null });
    const exported = new Set(Object.values(out).flat().map(r => r.id));
    for (const r of Object.values(out).flat()) for (const k of ['evidence_ids', 'risk_ids', 'research_block_ids', 'disclosure_ids', 'conflict_ids']) if (Array.isArray(r[k])) r[k] = r[k].filter(i => exported.has(i));
    // a conflict that would be exported with fewer than two public sides is not exported (its sides stay private)
    out.conflicts = out.conflicts.filter(c => c.evidence_ids.length >= 2 || (heldBack.push(`${c.id} (conflict with non-public evidence)`), false));
    for (const e of out.evidence) e.conflict_ids = e.conflict_ids.filter(i => out.conflicts.some(c => c.id === i));
    opp.last_verified = deriveLastVerified([{ type: 'project', rec: project }, { type: 'developer', rec: out.developers.find(d => d.id === project.developer_id) || null }, { type: 'asset', rec: out.assets[0] || null }], out.evidence);
    const res = publicChange({ repoRoot, today, label: 'export' }, (pub, stage) => {
      dropSubjects(pub, own); // the opportunity's own records are replaced as a whole (removes revoked/held-back items)
      for (const c of SUBJECT_BOUND) pub[c] = pub[c].filter(r => !(r.subject && shared.has(r.subject.id))); // shared subjects: current store projection
      for (const [c, recs] of Object.entries(out)) for (const r of recs) { const i = pub[c].findIndex(x => x.id === r.id); if (i >= 0) pub[c][i] = r; else pub[c].push(r); }
      for (const m of out.media) {
        const src = path.join(storeDir, 'media', m.subject.id, path.basename(m.file.public_path));
        const dst = path.join(stage, m.file.public_path); fs.mkdirSync(path.dirname(dst), { recursive: true }); fs.copyFileSync(src, dst);
      }
    });
    try { audit(store, 'export', id, today, { changed: res.changed.length, removed: res.removed.length, held_back: heldBack }); saveStore(store); }
    catch (e) { res.auditWarning = `public tree updated, but the audit entry could not be written: ${e.message}`; }
    return { exported: [...exported].sort(), skipped, heldBack, errors: [], ...res };
  });
}

// ------------------------------------------------------------ withdrawal / unpublish (B4)
// Owner-controlled. The store record is set to WITHHELD (review cleared, so a later export needs a new approval) and
// the reason is recorded in the audit log; evidence and history are kept. The public projection then loses the
// opportunity, its project, assets, evidence, media files, disclosures and generated page; shared developer/district
// records are removed only when no other published opportunity still uses them. Idempotent: running it again changes
// nothing. If the public step fails, the store step has already happened and a re-run completes the removal.
export function withdraw({ storeDir, id, by, reason, today, repoRoot }) {
  requireOwner(by, 'withdrawal');
  if (!reason || reason === true) throw new Error('--reason is required');
  if (id.startsWith('FIX-')) throw new Error('illustrative fixtures are never published; nothing to withdraw');
  storeDir = assertStorePath(storeDir, repoRoot, { fixture: false });
  return withLock(storeDir, 'withdraw', () => {
    const store = loadStore(storeDir);
    const opp = store.collections.opportunities.find(o => o.id === id); if (!opp) throw new Error(`${id} not found in the store`);
    const pubOpp = JSON.parse(fs.readFileSync(path.join(repoRoot, 'desk/data/public/opportunities.json'), 'utf8')).records;
    const isPublic = pubOpp.some(o => o.id === id);
    let storeChanged = false;
    if (opp.record_status !== 'WITHHELD' || opp.review) {
      const previous = opp.record_status; opp.record_status = 'WITHHELD'; opp.review = null;
      audit(store, 'withdraw', id, today, { reason, previous_status: previous, was_public: isPublic });
      saveStore(store); storeChanged = true;
    }
    if (!isPublic) return { storeChanged, publicChanged: false, changed: [], removed: [] };
    const res = publicChange({ repoRoot, today, label: 'withdraw' }, (pub) => {
      const o = pub.opportunities.find(x => x.id === id); const pr = pub.projects.find(p => p.id === o.subject.id);
      const own = new Set([id, pr ? pr.id : null, ...pub.assets.filter(a => pr && a.project_id === pr.id).map(a => a.id)].filter(Boolean));
      const otherOpps = pub.opportunities.filter(x => x.id !== id);
      const otherProjects = pub.projects.filter(p => otherOpps.some(x => x.subject.id === p.id));
      const sharedGone = new Set([pr && pr.developer_id, pr && pr.district_id, pr && pr.area_id].filter(Boolean)
        .filter(s => !otherProjects.some(p => [p.developer_id, p.district_id, p.area_id].includes(s))));
      dropSubjects(pub, new Set([...own, ...sharedGone]));
    });
    if (!storeChanged) { try { audit(store, 'withdraw-completed', id, today, { reason }); saveStore(store); } catch { /* audit only */ } }
    return { storeChanged, publicChanged: true, ...res };
  });
}

// ------------------------------------------------------------ decision report (Engine 8, internal)
// Reads the private analysis file (default <store>/private/analysis/<OPP>.json), validates every input's provenance,
// runs the internal engines and writes <store>/reports/decision-<OPP>.md and .json. Nothing is written to the public
// tree; nothing here changes publication state.
export function decisionReportFor({ storeDir, id, analysisPath = null, fixture = false, today, repoRoot, write = true, registry }) {
  const run = () => {
    const store = loadStore(storeDir);
    if (!store.collections.opportunities.some(o => o.id === id)) throw new Error(`${id} not found in the store`);
    const ap = analysisPath || path.join(storeDir, 'private', 'analysis', `${id}.json`);
    let checked = { ok: true, errors: [], analysis: null, provenance: [] };
    if (fs.existsSync(ap)) checked = checkAnalysis(JSON.parse(fs.readFileSync(ap, 'utf8')), store, id);
    else if (analysisPath) throw new Error(`analysis file not found: ${analysisPath}`);
    if (!checked.ok) return { ok: false, errors: checked.errors };
    const gate = runGate(store, { fixture, today, repoRoot });
    const r = decisionReport(store, id, { gateWhy: gate.eligibility.opportunities[id] || [], analysis: checked.analysis, provenance: checked.provenance, today, ...(registry ? { registry } : {}) });
    const md = reportMarkdown(r);
    if (write) withTxn(storeDir, 'report', (t) => { t.write(path.join(storeDir, 'reports', `decision-${id}.md`), md); t.write(path.join(storeDir, 'reports', `decision-${id}.json`), JSON.stringify(r, null, 2) + '\n'); });
    return { ok: true, report: r, markdown: md, analysisUsed: fs.existsSync(ap) ? ap : null, gateWhy: gate.eligibility.opportunities[id] || [], gateCodes: (gate.eligibility.reasons || {})[id] || [] };
  };
  return write ? withLock(storeDir, 'report', run) : run();
}

// ------------------------------------------------------------ client brief (CBR-1, private, one recipient)
// Builds the decision report first (same validation), then a plain-language brief in EN/TR/AR for one prospective buyer,
// written to <store>/reports/brief-<OPP>-<lang>.md. Never exported or published. Runs only when M-CLIENT-BRIEF is
// internally active (D-20).
export function clientBriefFor({ storeDir, id, lang = 'en', analysisPath = null, fixture = false, today, repoRoot, write = true, registry }) {
  if (!internalActive('M-CLIENT-BRIEF', registry)) return { ok: false, errors: ['M-CLIENT-BRIEF is not internally active (methodology awaiting approval)'] };
  if (!['en', 'tr', 'ar'].includes(lang)) return { ok: false, errors: [`--lang must be en, tr or ar (got ${lang})`] };
  const d = decisionReportFor({ storeDir, id, analysisPath, fixture, today, repoRoot, write: false, registry });
  if (!d.ok) return d;
  const store = loadStore(storeDir); const names = {};
  for (const c of ['developers', 'districts', 'markets', 'projects']) for (const r of store.collections[c] || []) names[r.id] = r.name;
  const opp = store.collections.opportunities.find(o => o.id === id);
  const b = clientBrief(d.report, lang, { names, marketId: opp && opp.market_id });
  if (b.status !== 'OK') return { ok: false, errors: [b.reason] };
  const out = path.join(storeDir, 'reports', `brief-${id}-${lang}.md`);
  if (write) withLock(storeDir, 'brief', () => withTxn(storeDir, 'brief', (t) => t.write(out, b.markdown)));
  return { ok: true, markdown: b.markdown, path: out };
}

// ------------------------------------------------------------ comparison of several opportunities (OPC-2, internal)
export function compareFor({ storeDir, ids, fixture = false, today, repoRoot, write = true }) {
  const run = () => {
    const reps = ids.map(id => { const r = decisionReportFor({ storeDir, id, fixture, today, repoRoot, write: false }); if (!r.ok) throw new Error(`${id}: analysis refused — ${r.errors.join('; ')}`); return { id, report: r.report, gate_codes: (r.gateCodes || []) }; });
    const c = compareOpportunities(reps); const md = compareMarkdown(c, today);
    if (write && c.status === 'OK') withTxn(storeDir, 'compare', (t) => { t.write(path.join(storeDir, 'reports', `compare-${today}.md`), md); t.write(path.join(storeDir, 'reports', `compare-${today}.json`), JSON.stringify(c, null, 2) + '\n'); });
    return { comparison: c, markdown: md };
  };
  return write ? withLock(storeDir, 'compare', run) : run();
}

// ------------------------------------------------------------ project permission received after ingestion
// Records a sales-office permission (JSON file with the same fields as an intake permission, plus "project_id") and its
// document. Images of that project which the permission explicitly approves, and which have no written permission yet,
// receive it; revoked images are never changed. Nothing is approved or published by this command.
export function recordPermission({ storeDir, file, by, today, repoRoot, fixture = false }) {
  requireOwner(by, 'a project permission record');
  return ownerAction({ storeDir, repoRoot, fixture, label: 'record-permission' }, (dir) => {
    const store = loadStore(dir); const x = JSON.parse(fs.readFileSync(file, 'utf8'));
    const project = store.collections.projects.find(p => p.id === x.project_id);
    if (!project) return { ok: false, errors: [`project ${x.project_id} not found in the store`] };
    const base = path.dirname(file);
    const errs = validatePackage({ package_id: 'PERMISSION', received_at: today, category: project.category, market: { slug: 'x' }, project: { name: project.name }, permissions: [x] }, base).filter(e => e.startsWith('permissions'));
    if (errs.length) return { ok: false, errors: errs };
    if (store.private.permissions.some(r => r.id === x.id && r.project_id === project.id)) return { ok: false, errors: [`${x.id} is already recorded for ${project.id}; use a new id`] };
    const rec = { id: x.id, package_id: null, project_id: project.id, issuer: x.issuer, document: { file: path.basename(x.document), sha256: sha256(fs.readFileSync(path.resolve(base, x.document))) },
      granted_at: x.granted_at, received_at: today, valid_until: x.valid_until ?? null, channels: x.channels, activities: x.activities, media: x.media ?? null,
      conditions: x.conditions || [], attribution_text: x.attribution_text ?? null, statutory_permit: x.statutory_permit ?? null, status: 'GRANTED_WRITTEN', revoked_at: null };
    store.private.permissions.push(rec);
    const files = Object.values(store.private.media_index).filter(v => v.subject === project.id);
    const updated = [];
    if (x.activities.includes('PUBLISH_MEDIA')) for (const v of files) {
      if (!(x.media === 'ALL_SUPPLIED' || (Array.isArray(x.media) && x.media.includes(v.file)))) continue;
      const m = store.collections.media.find(r => r.id === v.id);
      if (!m || (m.permission && ['GRANTED_WRITTEN', 'REVOKED'].includes(m.permission.status))) continue;
      m.permission = { status: 'GRANTED_WRITTEN', scope: x.channels, evidence_ref: x.id, granted_at: x.granted_at, expires_at: x.valid_until ?? null };
      if (x.attribution_text && !(m.attribution && m.attribution.required)) m.attribution = { required: true, text: x.attribution_text };
      m.review = null; updated.push(m.id);
    }
    audit(store, 'record-permission', project.id, today, { permission_id: x.id, issuer: x.issuer.name, channels: x.channels, activities: x.activities, media_updated: updated });
    saveStore(store);
    return { ok: true, updated };
  });
}

// ------------------------------------------------------------ market gate (MG-1, owner decisions D1/D3)
// Market-level research (market and district research blocks, named statistics, sources, conflicts) enters the store
// through a market intake file, so every gate record has an owner (entity index) and an audit entry. Legal review is
// recorded separately per market and topic; it is never inferred from evidence.
const MARKET_INTAKE_COLLS = ['sources', 'evidence', 'research_blocks', 'districts', 'conflicts'];
export function marketIntake({ storeDir, file, by, today, repoRoot, fixture = false }) {
  requireOwner(by, 'market intake');
  return ownerAction({ storeDir, repoRoot, fixture, label: 'market-intake' }, (dir) => {
    const store = loadStore(dir); const pkg = JSON.parse(fs.readFileSync(file, 'utf8')); const errs = [];
    if (!/^MI-[A-Z0-9-]+$/.test(pkg.intake_id || '')) errs.push('intake_id must look like MI-<MARKET>-<DATE>');
    const market = store.collections.markets.find(x => x.id === pkg.market_id);
    if (!market) errs.push(`market ${pkg.market_id} is not in the store`);
    const ids = new Set(Object.values(store.collections).flat().map(r => r.id));
    const mine = new Set([...(pkg.districts || []).map(d => d.id), ...store.collections.districts.filter(d => d.market_id === pkg.market_id).map(d => d.id)]);
    const inScope = (s) => s && ((s.type === 'market' && s.id === pkg.market_id) || (s.type === 'district' && mine.has(s.id)));
    for (const c of MARKET_INTAKE_COLLS) for (const r of pkg[c] || []) {
      for (const e of schemaErrors(SCHEMA.$defs[c], r, `${c}:${r.id}`)) errs.push(`${r.id || c}: ${e}`);
      const owner = store.private.entity_index[r.id];
      if (ids.has(r.id) && !(owner && owner.created_by === pkg.intake_id)) errs.push(`${r.id} already exists and was not created by ${pkg.intake_id}`);
      if (c === 'districts' && r.market_id !== pkg.market_id) errs.push(`${r.id}: district of another market`);
      if (['evidence', 'research_blocks', 'conflicts'].includes(c) && !inScope(r.subject)) errs.push(`${r.id}: subject must be ${pkg.market_id} or one of its districts`);
      if (c === 'evidence' && PRIVATE_DOMAINS.has(r.domain)) errs.push(`${r.id}: private domain`);
      if (c === 'evidence' && r.currency !== null) errs.push(`${r.id}: market-gate evidence carries no currency amounts (D10)`);
    }
    if (errs.length) return { ok: false, errors: errs };
    const received = today; let n = 0;
    for (const c of MARKET_INTAKE_COLLS) for (const r of pkg[c] || []) {
      const i = store.collections[c].findIndex(x => x.id === r.id);
      if (i >= 0) store.collections[c][i] = r; else store.collections[c].push(r);
      store.private.entity_index[r.id] = { created_by: pkg.intake_id, received_at: received }; n++;
    }
    for (const b of pkg.research_blocks || []) if (b.subject.type === 'market' && !market.research_block_ids.includes(b.id)) market.research_block_ids.push(b.id);
    for (const e of pkg.evidence || []) if (e.subject.type === 'market' && !market.evidence_ids.includes(e.id)) market.evidence_ids.push(e.id);
    const gate = runGate(store, { fixture, today, repoRoot });
    const bad = gate.errors.filter(e => (pkg.sources || []).concat(pkg.evidence || [], pkg.research_blocks || [], pkg.districts || [], pkg.conflicts || []).some(r => r.id === e.id));
    if (bad.length) return { ok: false, errors: bad.map(e => `[${e.code}] ${e.id}: ${e.msg}`) };
    audit(store, 'market-intake', pkg.market_id, today, { intake_id: pkg.intake_id, records: n });
    saveStore(store);
    return { ok: true, records: n };
  });
}

export function recordReview({ storeDir, market, topic, status, outcome = null, reviewer, role, reference, reviewedAt, validUntil = null, conditions = [], by, today, repoRoot, fixture = false }) {
  requireOwner(by, 'a legal/regulatory review record');
  const cfg = loadGateConfig(path.join(repoRoot, 'desk/_tools/market-gates/MG-1.json')); const m = cfg.markets && cfg.markets[market];
  if (!m) throw new Error(`market ${market} has no gate configuration`);
  if (!m.regulatory_review.topics.some(t => t.key === topic)) throw new Error(`topic ${topic} is not a review topic of ${market} (${m.regulatory_review.topics.map(t => t.key).join(', ')})`);
  if (!REVIEW_STATUS.includes(status)) throw new Error(`status must be one of ${REVIEW_STATUS.join(', ')}`);
  if (status === 'COMPLETE' && !REVIEW_OUTCOME.includes(outcome)) throw new Error(`a COMPLETE review needs --outcome ${REVIEW_OUTCOME.join('|')}`);
  if (status !== 'COMPLETE' && outcome) throw new Error('only a COMPLETE review has an outcome');
  if (!reviewer || !role || !reference || !/^\d{4}-\d{2}-\d{2}$/.test(reviewedAt || '')) throw new Error('--reviewer, --role, --reference and --reviewed-at are required');
  return ownerAction({ storeDir, repoRoot, fixture, label: 'record-review' }, (dir) => {
    const store = loadStore(dir); const list = store.private.regulatory_reviews;
    const seq = list.length + 1;
    const rec = { id: `REG-${market.slice(4)}-${String(seq).padStart(3, '0')}`, seq, market_id: market, topic, status, outcome: outcome || null, conditions, reviewer, reviewer_role: role, reference, reviewed_at: reviewedAt, valid_until: validUntil, recorded_by: 'owner', recorded_at: today };
    list.push(rec); // append-only: a later record supersedes an earlier one; nothing is overwritten
    audit(store, 'record-review', market, today, { topic, status, outcome: rec.outcome, review_id: rec.id });
    saveStore(store);
    return rec;
  });
}

export function marketGateReport({ storeDir, id = null, today, now = null, repoRoot, write = true }) {
  const run = () => {
    const store = loadStore(storeDir); const cfg = loadGateConfig(path.join(repoRoot, 'desk/_tools/market-gates/MG-1.json'));
    const ids = id ? [id] : Object.keys(cfg.markets || {});
    const results = ids.map(mid => evaluateMarketGate(cfg, mid, store.collections, { today, now: now || new Date().toISOString(), reviews: store.private.regulatory_reviews, provenance: store.private.entity_index }));
    if (write) withTxn(storeDir, 'market-gate', (t) => { for (const g of results) { t.write(path.join(storeDir, 'reports', `market-gate-${g.market_id}.json`), JSON.stringify(g, null, 2) + '\n'); t.write(path.join(storeDir, 'reports', `market-gate-${g.market_id}.md`), gateMarkdown(g, cfg)); } });
    return results;
  };
  return write ? withLock(storeDir, 'market-gate', run) : run();
}

// The only path to an ACTIVE real market. Refused unless the owner approved the gate rules (registry ACTIVE with
// RULES_APPROVED/VALIDATED) AND this market's own computed gate passes. Another market's result is irrelevant.
export function activateMarket({ storeDir, id, by, today, now = null, repoRoot, fixture = false }) {
  requireOwner(by, 'market activation');
  return ownerAction({ storeDir, repoRoot, fixture, label: 'activate-market' }, (dir) => {
    const store = loadStore(dir); const cfg = loadGateConfig(path.join(repoRoot, 'desk/_tools/market-gates/MG-1.json')); const reg = methods()['M-MARKET-GATE']; const why = [];
    if (!reg || reg.status !== 'ACTIVE' || !['RULES_APPROVED', 'VALIDATED'].includes(reg.validation_status)) why.push(`M-MARKET-GATE is ${reg ? reg.status + ' / ' + reg.validation_status : 'missing'}: the owner has not approved the gate rules`);
    const market = store.collections.markets.find(m => m.id === id); if (!market) throw new Error(`${id} not found in the store`);
    const g = evaluateMarketGate(cfg, id, store.collections, { today, now: now || new Date().toISOString(), reviews: store.private.regulatory_reviews, provenance: store.private.entity_index });
    if (!g.pass) why.push(...g.reasons.map(r => `${r.code} ${r.item} — ${r.detail}`));
    if (why.length) return { activated: false, why, gate: g };
    const snapshot = JSON.stringify(store.collections);
    Object.assign(market, { activation: 'ACTIVE', record_status: 'PUBLISHED', review: { approved_by: 'owner', approved_at: today, gate_version: cfg.version }, gate_certificate: gateCertificate(cfg, g, store.private.regulatory_reviews, today) });
    const v = runGate(store, { fixture, today, repoRoot }).errors.filter(e => e.id === id);
    if (v.length) { store.collections = JSON.parse(snapshot); return { activated: false, why: v.map(e => `[${e.code}] ${e.msg}`), gate: g }; }
    audit(store, 'activate-market', id, today, { gate_version: g.gate_version, engine_version: g.engine_version, evaluated_at: g.evaluated_at, conditions: g.publication.conditions });
    saveStore(store);
    return { activated: true, why: [], gate: g };
  });
}

// ------------------------------------------------------------ public market activation (owner decisions D11/D12, PUB-2)
// export-market copies an ACTIVE market from the private store to the public tree: the market record with its activation
// stamp and gate certificate, and its districts (names only: research and evidence ids are dropped). Market and district
// research — named statistics, research notes, sources and conflicts — stays in the store (PUB-2, owner instruction
// 28 Oct 2026): it is used for the gate and for analysis, never published. Any market research left in the public tree
// by an earlier version is removed, with the sources that only it used. The full gate is recomputed first and must pass;
// the public result must validate, or nothing changes. The store is the source of truth.
const PUBLIC_MARKET_FIELDS = ['id', 'slug', 'name', 'country', 'currency', 'activation', 'summary', 'category', 'record_status', 'field_states', 'last_reviewed', 'is_illustrative', 'review', 'gate_certificate'];
export function exportMarket({ storeDir, id, by, repoRoot, today, now = null }) {
  requireOwner(by, 'market export');
  if (id.startsWith('FIX-')) throw new Error('illustrative fixture markets are never exported');
  storeDir = assertStorePath(storeDir, repoRoot, { fixture: false });
  return withLock(storeDir, 'export-market', () => {
    const store = loadStore(storeDir); const cfg = loadGateConfig(path.join(repoRoot, 'desk/_tools/market-gates/MG-1.json'));
    const reg = methods()['M-MARKET-GATE'];
    if (!reg || reg.status !== 'ACTIVE') throw new Error('M-MARKET-GATE is not ACTIVE: the owner has not approved the gate rules');
    const m0 = store.collections.markets.find(m => m.id === id); if (!m0) throw new Error(`${id} not found in the store`);
    if (m0.activation !== 'ACTIVE' || m0.record_status !== 'PUBLISHED' || !m0.review || m0.review.gate_version !== cfg.version || !m0.gate_certificate) throw new Error(`${id} is not activated in the store (run activate-market --by owner first)`);
    if (!m0.gate_certificate.valid_until || m0.gate_certificate.valid_until < today) throw new Error(`${id}: gate certificate is not current (valid until ${m0.gate_certificate.valid_until || 'unknown'}) — re-run activate-market`);
    const g = evaluateMarketGate(cfg, id, store.collections, { today, now: now || new Date().toISOString(), reviews: store.private.regulatory_reviews, provenance: store.private.entity_index });
    if (!g.pass) throw new Error(`${id} no longer passes its gate — not exported: ${g.reasons.slice(0, 8).map(r => `${r.code} ${r.item}`).join('; ')}`);
    const clone = (x) => JSON.parse(JSON.stringify(x));
    const market = Object.fromEntries(PUBLIC_MARKET_FIELDS.filter(k => k in m0).map(k => [k, clone(m0[k])]));
    Object.assign(market, { research_block_ids: [], evidence_ids: [] });
    const dists = store.collections.districts.filter(d => d.market_id === id).map(d => ({ ...clone(d), research_block_ids: [], evidence_ids: [] }));
    const exportedIds = new Set([market, ...dists].map(r => r.id));
    const removed = [];
    const res = publicChange({ repoRoot, today, label: 'export-market' }, (pub) => {
      const projDistricts = new Set(pub.projects.map(p => p.district_id).filter(Boolean));
      // market and district research never stays public (PUB-2), whichever market it belongs to
      for (const c of ['evidence', 'research_blocks', 'conflicts']) pub[c] = pub[c].filter(r => !(r.subject && ['market', 'district'].includes(r.subject.type)) || (removed.push(r.id), false));
      const used = new Set(pub.evidence.map(e => e.source_id));
      pub.sources = pub.sources.filter(x => used.has(x.id) || (removed.push(x.id), false));
      for (const r of [...pub.markets, ...pub.districts]) { r.research_block_ids = []; r.evidence_ids = []; }
      // districts of this market are replaced by the store's; one still used by a published project is kept
      pub.districts = pub.districts.filter(d => d.market_id !== id || projDistricts.has(d.id));
      const put = (c, recs) => { for (const r of recs) { const i = pub[c].findIndex(x => x.id === r.id); if (i >= 0) pub[c][i] = r; else pub[c].push(r); } };
      put('markets', [market]); put('districts', dists);
    });
    try { audit(store, 'export-market', id, today, { gate_version: g.gate_version, evaluated_at: g.evaluated_at, valid_until: market.gate_certificate.valid_until, records: exportedIds.size, removed_from_public: removed.length }); saveStore(store); }
    catch (e) { res.auditWarning = `public tree updated, but the audit entry could not be written: ${e.message}`; }
    return { exported: [...exportedIds].sort(), heldBack: [], removed, ...res };
  });
}

// deactivate-market: the rollback path. Refused while any opportunity of the market is published (withdraw those
// first). The market returns to INACTIVE in the store and, if it was public, in the public tree; research stays.
export function deactivateMarket({ storeDir, id, by, reason, repoRoot, today }) {
  requireOwner(by, 'market deactivation');
  if (!reason || reason === true) throw new Error('--reason is required');
  storeDir = assertStorePath(storeDir, repoRoot, { fixture: false });
  return withLock(storeDir, 'deactivate-market', () => {
    const store = loadStore(storeDir);
    const m = store.collections.markets.find(x => x.id === id); if (!m) throw new Error(`${id} not found in the store`);
    const pubOpps = JSON.parse(fs.readFileSync(path.join(repoRoot, 'desk/data/public/opportunities.json'), 'utf8')).records.filter(o => o.market_id === id && o.record_status === 'PUBLISHED');
    if (pubOpps.length) throw new Error(`${id} has published opportunities (${pubOpps.map(o => o.id).join(', ')}); withdraw them first`);
    const pubMarkets = JSON.parse(fs.readFileSync(path.join(repoRoot, 'desk/data/public/markets.json'), 'utf8')).records;
    const wasPublic = pubMarkets.some(x => x.id === id && (x.activation === 'ACTIVE' || x.record_status === 'PUBLISHED'));
    const off = { activation: 'INACTIVE', record_status: 'RESEARCH_IN_PROGRESS', review: null, gate_certificate: null };
    let res = { changed: [], removed: [] };
    if (wasPublic) res = publicChange({ repoRoot, today, label: 'deactivate-market' }, (pub) => { const r = pub.markets.find(x => x.id === id); Object.assign(r, off); });
    const changedStore = m.activation !== 'INACTIVE' || m.record_status === 'PUBLISHED';
    Object.assign(m, off);
    audit(store, 'deactivate-market', id, today, { reason, public_changed: wasPublic });
    saveStore(store);
    return { storeChanged: changedStore, publicChanged: wasPublic, ...res };
  });
}

// ------------------------------------------------------------ CLI
if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  const [cmd, ...rest] = process.argv.slice(2);
  const a = {}; for (let i = 0; i < rest.length; i++) { if (rest[i].startsWith('--')) { const k = rest[i].slice(2); a[k] = rest[i + 1] && !rest[i + 1].startsWith('--') ? rest[++i] : true; } }
  const today = a.today || new Date().toISOString().slice(0, 10); // UTC calendar date
  const repoRoot = path.resolve(HERE, '../..');
  const fixture = !!a.fixture;
  const STORE_CMDS = ['ingest', 'gate', 'report', 'brief', 'compare', 'record-permission', 'market-intake', 'record-review', 'market-gate', 'activate-market', 'export-market', 'deactivate-market', 'approve', 'approve-disclosure', 'approve-disclosure-template', 'approve-media', 'revoke-media', 'resolve-conflict', 'withdraw', 'export', 'recover', 'unlock'];
  if (STORE_CMDS.includes(cmd)) {
    try { a.store = assertStorePath(a.store === true ? '' : a.store, repoRoot, { fixture }); }
    catch (e) { console.error(`✗ ${e.message}`); process.exit(2); }
  }
  const refreshFixtureGate = () => { if (fixture) validateRepo(repoRoot, { today, writeIndex: true }); };
  let wrote = false; // the fixture gate report is refreshed only after a command actually changed the fixture store
  process.on('exit', () => { if (wrote) refreshFixtureGate(); });
  const O = { storeDir: a.store, id: a.id, by: a.by, fixture, today, repoRoot };
  try {
    if (cmd === 'ingest') { const r = ingest({ pkgDir: path.resolve(a.package), storeDir: a.store, fixture, apply: !!a.apply, today, repoRoot }); wrote = !!r.written; console.log(r.report); process.exit(r.errors.length ? 1 : 0); }
    else if (cmd === 'gate') { const s = loadStore(a.store); const g = runGate(s, { fixture, today, repoRoot }); for (const [k, v] of Object.entries(g.eligibility.opportunities)) console.log(`${k}: ${v.length ? 'BLOCKED — ' + v.join('; ') : 'passes gate rules'}`); for (const w of g.warnings || []) console.log(`! [${w.code}] ${w.id}: ${w.msg}`); for (const e of g.errors) console.log(`✗ [${e.code}] ${e.id}: ${e.msg}`); }
    else if (cmd === 'brief') { const r = clientBriefFor({ ...O, lang: a.lang && a.lang !== true ? a.lang : 'en', analysisPath: a.analysis && a.analysis !== true ? path.resolve(a.analysis) : null }); if (!r.ok) { console.error(`✗ brief refused — nothing written:\n${r.errors.map(e => '  - ' + e).join('\n')}`); process.exit(1); } wrote = true; console.log(r.markdown); console.log(`\n(written to ${r.path})`); }
    else if (cmd === 'report') { const r = decisionReportFor({ ...O, analysisPath: a.analysis && a.analysis !== true ? path.resolve(a.analysis) : null }); if (!r.ok) { console.error(`✗ analysis refused — nothing written:\n${r.errors.map(e => '  - ' + e).join('\n')}`); process.exit(1); } wrote = true; console.log(r.markdown); console.log(`\n(written to ${path.join(a.store, 'reports', `decision-${a.id}.md`)}; analysis: ${r.analysisUsed || 'none'})`); }
    else if (cmd === 'compare') { const r = compareFor({ ...O, ids: String(a.ids || '').split(',').filter(Boolean) }); console.log(r.markdown); }
    else if (cmd === 'record-permission') { const r = recordPermission({ ...O, file: path.resolve(String(a.file)) }); if (!r.ok) { console.error(`✗ permission not recorded:\n${r.errors.map(e => '  - ' + e).join('\n')}`); process.exit(1); } wrote = true; console.log(`permission recorded; images given this written permission: ${r.updated.join(', ') || 'none'} (each still needs approve-media)`); }
    else if (cmd === 'market-intake') { const r = marketIntake({ ...O, file: path.resolve(String(a.file)) }); if (!r.ok) { console.error(`✗ market intake refused — nothing written:\n${r.errors.map(e => '  - ' + e).join('\n')}`); process.exit(1); } console.log(`market intake recorded: ${r.records} record(s)`); }
    else if (cmd === 'record-review') { const r = recordReview({ ...O, market: a.market, topic: a.topic, status: a.status, outcome: a.outcome === true ? null : a.outcome || null, reviewer: a.reviewer, role: a.role, reference: a.reference, reviewedAt: a['reviewed-at'], validUntil: a['valid-until'] || null, conditions: a.conditions && a.conditions !== true ? String(a.conditions).split('|').map(s => s.trim()).filter(Boolean) : [] }); console.log(`${r.id} recorded: ${r.market_id} ${r.topic} ${r.status}${r.outcome ? ' / ' + r.outcome : ''}`); }
    else if (cmd === 'market-gate') { const rs = marketGateReport(O); for (const g of rs) { console.log(`${g.market_id} (${g.gate_version}, ${g.evaluated_at}): ${g.pass ? 'PASS' : 'FAIL'}`); for (const r of g.reasons) console.log(`  - ${r.code} ${r.item} — ${r.detail}`); } console.log(`\n(reports written to ${path.join(a.store, 'reports')})`); }
    else if (cmd === 'activate-market') { const r = activateMarket(O); console.log(r.activated ? `${a.id} ACTIVE in the store (gate ${r.gate.gate_version}, evaluated ${r.gate.evaluated_at}); not exported` : `${a.id} NOT activated — stays INACTIVE:\n${r.why.map(w => '  - ' + w).join('\n')}`); process.exit(r.activated ? 0 : 1); }
    else if (cmd === 'export-market') { const r = exportMarket({ storeDir: a.store, id: a.id, by: a.by, repoRoot, today }); console.log(`${a.id} exported to the public tree: ${r.exported.length} records; held back (not public): ${r.heldBack.join(', ') || 'none'}`); if (r.auditWarning) console.error(`! ${r.auditWarning}`); }
    else if (cmd === 'deactivate-market') { const r = deactivateMarket({ storeDir: a.store, id: a.id, by: a.by, reason: a.reason, repoRoot, today }); console.log(`${a.id} INACTIVE${r.publicChanged ? ' in the store and the public tree' : ' in the store (it was not public)'}`); }
    else if (cmd === 'approve') { const r = approve(O); wrote = r.approved; console.log(r.approved ? `${a.id} approved and marked PUBLISHED in the store (not yet exported); last verified: ${r.last_verified || 'not recorded in the evidence'}` : `${a.id} NOT approved — ${r.why.join('; ')}`); process.exit(r.approved ? 0 : 1); }
    else if (cmd === 'approve-disclosure-template') { const r = approveDisclosureTemplate({ ...O, reference: a.reference }); wrote = true; console.log(`${a.id} approved (text ${r.text_sha256.slice(0, 12)}…); disclosures updated: ${r.updated.join(', ') || 'none'}`); }
    else if (cmd === 'approve-disclosure') { approveDisclosure(O); wrote = true; console.log(`${a.id} legal review recorded as APPROVED`); }
    else if (cmd === 'approve-media') { const r = approveMedia(O); wrote = r.approved; console.log(r.approved ? `${a.id} approved for public use` : `${a.id} NOT approved — ${r.why.join('; ')}`); process.exit(r.approved ? 0 : 1); }
    else if (cmd === 'revoke-media') { const r = revokeMedia({ ...O, reason: a.reason }); wrote = r.changed; console.log(r.changed ? `${a.id} permission recorded as REVOKED.${r.isPublic ? ' It is still in the public tree: re-export the opportunity (the image is removed) or withdraw it if it no longer passes the gate.' : ''}` : `${a.id} was already revoked; nothing changed`); }
    else if (cmd === 'resolve-conflict') { const r = resolveConflict({ ...O, status: a.status, note: a.note, accept: a.accept }); wrote = true; console.log(`${a.id} ${r.status}${r.accepted ? ` — accepted ${r.accepted}` : ''}${r.withheld ? `; withheld for re-approval: ${r.withheld.join(', ')}` : ''}`); }
    else if (cmd === 'withdraw') { const r = withdraw({ ...O, reason: a.reason }); console.log(!r.storeChanged && !r.publicChanged ? `${a.id} is already withdrawn; nothing changed` : `${a.id} withdrawn${r.publicChanged ? `; public files changed ${r.changed.length}, removed ${r.removed.length}` : ' (it was not in the public tree)'}`); }
    else if (cmd === 'export') { const r = exportPublic({ storeDir: a.store, id: a.id, repoRoot, today }); console.log(`exported ${r.exported.length} records; skipped: ${r.skipped.join(', ') || 'none'}; held back (not public): ${r.heldBack.join(', ') || 'none'}`); if (r.auditWarning) console.error(`! ${r.auditWarning}`); }
    else if (cmd === 'recover') { const n = withLock(a.store, 'recover', () => recover(a.store)); const m = withLock(path.join(repoRoot, 'desk'), 'recover', () => recover(path.join(repoRoot, 'desk'))); console.log(`recovered: store ${n} file(s), public tree ${m} file(s)`); }
    else if (cmd === 'unlock') { if (!a.force) { console.error('✗ unlock removes another operation\'s lock; check that it is not running, then add --force'); process.exit(2); } const l = forceUnlock(a.store); const m = a.public ? forceUnlock(path.join(repoRoot, 'desk')) : null; console.log(`lock removed${l ? ` (${l.label}, pid ${l.pid} on ${l.host})` : ' (none present)'}${m ? `; public-tree lock removed (${m.label})` : ''}`); }
    else { console.log(`commands: ${STORE_CMDS.join(' | ')}`); process.exit(2); }
  } catch (e) { console.error(`✗ ${e.message}`); process.exit(1); }
}
