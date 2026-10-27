// Nexus Desk data loader. Production reads ONLY desk/data/public and shows ONLY what published.json lists.
// Illustrative fixtures load only on a local development server (localhost / 127.0.0.1) with ?fixtures=1;
// on GitHub Pages the _fixtures folder is not published at all, and any FIX id is rejected here as well.
import { localize } from './i18n.js';
const BASE = '/desk/';
const PAGE_LANG = (document.documentElement.lang || 'en').slice(0, 2);
const COLLS = ['categories', 'markets', 'districts', 'areas', 'developers', 'projects', 'assets', 'opportunities', 'evidence', 'sources', 'conflicts', 'risks', 'research_blocks', 'media', 'disclosures'];
const qs = new URLSearchParams(location.search);
export const FIXTURE = ['localhost', '127.0.0.1'].includes(location.hostname) && qs.get('fixtures') === '1';
const isFix = (id) => typeof id === 'string' && id.slice(0, 4) === 'FIX' + '-';
const today = new Date().toISOString().slice(0, 10);
const same = (a, b) => a && b && a.type === b.type && a.id === b.id;

async function getJson(p) {
  try { const r = await fetch(p, { cache: 'no-cache' }); return r.ok ? await r.json() : null; } catch { return null; }
}

let cached = null;
export function load() { return cached || (cached = loadOnce()); }

async function loadOnce() {
  const pub = await Promise.all(COLLS.map(c => getJson(`${BASE}data/public/${c}.json`)));
  const index = (await getJson(`${BASE}data/public/published.json`)) || { opportunities: [], media: [], markets: [] };
  const methodsDoc = (await getJson(`${BASE}data/methods.json`)) || { methods: [] };
  const col = {}; COLLS.forEach((c, i) => { col[c] = ((pub[i] && pub[i].records) || []).filter(r => !isFix(r.id) && r.is_illustrative !== true); });
  let gate = null; let fixtureFailed = false;
  if (FIXTURE) {
    const fx = await Promise.all(COLLS.map(c => getJson(`${BASE}_fixtures/data/${c}.json`)));
    gate = await getJson(`${BASE}_fixtures/gate.json`);
    if (!fx.some(Boolean)) fixtureFailed = true;
    COLLS.forEach((c, i) => { col[c] = col[c].concat(((fx[i] && fx[i].records) || []).filter(r => isFix(r.id) && r.is_illustrative === true)); });
  }
  const byId = new Map(); for (const c of COLLS) for (const r of col[c]) byId.set(r.id, r);
  const pubOpp = new Set(index.opportunities || []); const pubMedia = new Set(index.media || []);
  const permOk = (m) => m.permission && m.permission.status === 'GRANTED_WRITTEN' && (m.permission.scope || []).includes('desk_web') && (!m.permission.expires_at || m.permission.expires_at >= today);

  const visibleOpp = (o) => FIXTURE ? isFix(o.id) : (pubOpp.has(o.id) && !isFix(o.id) && o.record_status === 'PUBLISHED' && !!o.review);
  const visibleMedia = (m) => {
    if (FIXTURE && isFix(m.id)) { const why = gate && gate.media && gate.media[m.id]; return !why || why.every(w => w === 'illustrative'); }
    return pubMedia.has(m.id) && !isFix(m.id) && permOk(m);
  };
  const methods = Object.fromEntries((methodsDoc.methods || []).map(m => [m.id, m]));

  const api = {
    fixture: FIXTURE, fixtureFailed, gate, index, methods,
    byId: (id) => byId.get(id) || null,
    categories: () => col.categories,
    markets: () => col.markets.filter(m => FIXTURE || !isFix(m.id)),
    market: (slugOrId) => col.markets.find(m => m.slug === slugOrId || m.id === slugOrId) || null,
    opportunities: () => col.opportunities.filter(visibleOpp),
    opportunity: (id) => { const o = byId.get(id); return o && col.opportunities.includes(o) && visibleOpp(o) ? o : null; },
    project: (o) => (o && o.subject && o.subject.type === 'project') ? byId.get(o.subject.id) || null : null,
    developer: (p) => p && p.developer_id ? byId.get(p.developer_id) || null : null,
    district: (p) => p && p.district_id ? byId.get(p.district_id) || null : null,
    area: (p) => p && p.area_id ? byId.get(p.area_id) || null : null,
    asset: (o) => o && o.asset_id ? byId.get(o.asset_id) || null : null,
    // strict subject binding: evidence/media/risks are returned only for the exact record asked for
    evidence: (type, id, field) => col.evidence.filter(e => same(e.subject, { type, id }) && (field === undefined || e.field === field)),
    source: (id) => byId.get(id) || null,
    conflictsFor: (refs) => col.conflicts.filter(c => refs.some(r => same(r, c.subject))),
    researchBlocks: (type, id) => col.research_blocks.filter(b => same(b.subject, { type, id })),
    risksFor: (o, p) => col.risks.filter(r => (same(r.subject, { type: 'opportunity', id: o.id }) && o.risk_ids.includes(r.id)) || (p && same(r.subject, { type: 'project', id: p.id }) && p.risk_ids.includes(r.id))),
    mediaFor: (o, p) => col.media.filter(m => (same(m.subject, { type: 'opportunity', id: o.id }) || (p && same(m.subject, { type: 'project', id: p.id }))) && visibleMedia(m)).sort((a, b) => a.order - b.order),
    withheldMedia: (o, p) => col.media.filter(m => (same(m.subject, { type: 'opportunity', id: o.id }) || (p && same(m.subject, { type: 'project', id: p.id }))) && !visibleMedia(m)),
    disclosures: (o) => col.disclosures.filter(d => o.disclosure_ids.includes(d.id) && (FIXTURE || d.legal_review === 'APPROVED')),
    gateFor: (id) => (gate && gate.opportunities && gate.opportunities[id]) || null,
    oppUrl: (o) => FIXTURE ? `${localize(BASE + 'opportunities/preview/', PAGE_LANG)}?id=${encodeURIComponent(o.id)}&fixtures=1` : localize(`${BASE}opportunities/${o.id.toLowerCase()}/`, PAGE_LANG),
    withFixtureFlag: (url) => { url = localize(url, PAGE_LANG); return FIXTURE ? url + (url.includes('?') ? '&' : '?') + 'fixtures=1' : url; }
  };
  return api;
}
