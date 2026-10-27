// Nexus Desk UI components. Data-driven: every component receives records for ONE subject only.
export const esc = (s) => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const LANG = (document.documentElement.lang || 'en').slice(0, 2).toLowerCase(); // language comes from the URL path (/desk/, later /desk/tr/, /desk/ar/)
export const tx = (t) => t ? esc(t[LANG] || t.en || '') : '';

export const L = {
  delivery_status: { OFF_PLAN: 'Off-plan', UNDER_CONSTRUCTION: 'Under construction', COMPLETED: 'Completed' },
  asset_type: { APARTMENT: 'Apartment', VILLA: 'Villa', TOWNHOUSE: 'Townhouse', RESIDENCE: 'Residence', MIXED_USE: 'Mixed use' },
  media_type: { PHOTO: 'Photograph', RENDERING: 'Architectural rendering', FLOOR_PLAN: 'Indicative floor plan', SITE_PLAN: 'Site plan', CONSTRUCTION_PROGRESS: 'Construction progress photo', ILLUSTRATIVE: 'Illustrative image', MAP: 'Map' },
  content_category: { exterior: 'Exterior', interior: 'Interior', amenity: 'Amenities', plan: 'Plans', progress: 'Progress', location: 'Location', other: 'Other' },
  domain: { MARKET: 'Market', DISTRICT: 'District', AREA: 'Area', PROJECT_ASSET: 'Project & asset', DEVELOPER: 'Developer', RISK: 'Risk', PRICING: 'Pricing', RENTAL: 'Rental', LIQUIDITY: 'Liquidity', MACRO_FX: 'Macro & FX' },
  risk_type: { MARKET: 'Market', LEGAL_TITLE: 'Legal / title', REGULATORY: 'Regulatory', DEVELOPER_COUNTERPARTY: 'Developer / counterparty', CONSTRUCTION_DELIVERY: 'Construction / delivery', LIQUIDITY_EXIT: 'Liquidity / exit', CURRENCY_FX: 'Currency / FX', SEISMIC_PHYSICAL: 'Seismic / physical', TAX: 'Tax', OTHER: 'Other' },
  horizon: { SHORT: 'Short term', MEDIUM: 'Medium term', LONG: 'Long term' },
  controllability: { CONTROLLABLE: 'Controllable', PARTIAL: 'Partly controllable', EXTERNAL: 'External' },
  risk_status: { OPEN: 'Open', MONITORING: 'Monitoring', MITIGATED: 'Mitigated', CLOSED: 'Closed' },
  closure: { YES: 'Closed', CONDITIONAL: 'Conditional', NO: 'Open' },
  completeness: { YES: 'Complete', PARTIAL: 'Partial', NO: 'Incomplete' },
  verification: { VERIFIED: 'Verified', CORROBORATED: 'Corroborated', 'SOURCE-REPORTED': 'Source-reported', 'DEVELOPER-CLAIM': 'Developer claim', UNVERIFIED: 'Unverified' },
  missing: { 'DATA NOT AVAILABLE': 'Data not available', 'ACCESSIBLE BUT NOT YET COLLECTED': 'Accessible, not yet collected', 'PROFESSIONAL DD REQUIRED': 'Professional due diligence required', 'NOT APPLICABLE': 'Not applicable' },
  tier: { 1: 'Tier 1 · primary / official', 2: 'Tier 2 · authoritative secondary', 3: 'Tier 3 · market / commercial', 4: 'Tier 4 · discovery only' },
  disclosure: { COMMERCIAL_RELATIONSHIP: 'Commercial relationship', COMMISSION: 'Commission', CONFLICT_OF_INTEREST: 'Conflict of interest', LEGAL_NOTICE: 'Legal notice' }
};
export const lab = (map, v) => esc((L[map] && L[map][v]) || v || '');
const VORDER = ['VERIFIED', 'CORROBORATED', 'SOURCE-REPORTED', 'DEVELOPER-CLAIM', 'UNVERIFIED'];
export const strongest = (evs) => evs.length ? VORDER[Math.min(...evs.map(e => VORDER.indexOf(e.verification_status)))] : null;
export const vs = (v) => v ? `<span class="vs" data-v="${esc(v)}">${lab('verification', v)}</span>` : '';
export const fstate = (s) => `<span class="fs">${lab('missing', s)}</span>`;
export const chip = (t, cls = '') => `<span class="chip ${cls}">${t}</span>`;
export const fmtDate = (d) => {
  if (!d) return '';
  const [y, m, dd] = String(d).split('-');
  const mn = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return esc(dd ? `${+dd} ${mn[+m - 1]} ${y}` : m ? `${mn[+m - 1]} ${y}` : y);
};

// ---------- opportunity card ----------
export function card(D, o, { compare = true } = {}) {
  const p = D.project(o); const d = D.district(p); const m = D.market(o.market_id);
  const media = D.mediaFor(o, p); const cover = media.find(x => x.role === 'cover');
  const gate = D.fixture ? D.gateFor(o.id) : null;
  const rbs = p ? D.researchBlocks('project', p.id) : [];
  const pa = rbs.find(b => b.domain === 'PROJECT_ASSET');
  const url = D.oppUrl(o);
  return `<article class="card rv" data-id="${esc(o.id)}">
  <div class="cv">${cover ? `<img src="/${esc(cover.file.public_path)}" alt="${tx(cover.alt)}" width="${cover.file.width}" height="${cover.file.height}" loading="lazy"><span class="mt mtag">${lab('media_type', cover.media_type)}</span>` : `<div class="noimg">No approved image yet</div>`}
  ${D.fixture ? `<span class="gate mtag">${gate && gate.length ? 'Illustrative · gate blocked' : 'Illustrative · gate rules pass'}</span>` : ''}</div>
  <div class="bd">
    <div class="lab">${esc(m ? m.name : '')}${d ? ' · ' + esc(d.name) : ''}</div>
    <h3><a href="${esc(url)}">${tx(o.title)}</a></h3>
    ${o.summary ? `<p class="loc">${tx(o.summary)}</p>` : ''}
    <div class="row">${p && p.delivery_status ? chip(lab('delivery_status', p.delivery_status)) : chip('Delivery status not recorded', 'dim')}
      ${pa ? chip('Research ' + lab('closure', pa.research_closure).toLowerCase(), pa.research_closure === 'YES' ? 'on' : '') + chip('Data ' + lab('completeness', pa.data_completeness).toLowerCase(), pa.data_completeness === 'YES' ? 'on' : '') : chip('No research status', 'dim')}</div>
  </div>
  <div class="ft"><span class="lab">${o.last_verified ? 'Verified ' + fmtDate(o.last_verified) : 'Not yet verified'}</span>
  ${compare ? `<label class="cmpk"><input type="checkbox" data-cmp="${esc(o.id)}" data-cat="${esc(o.category)}"> Compare</label>` : ''}</div>
</article>`;
}

// ---------- gallery + lightbox ----------
export function gallery(D, o, p) {
  const media = D.mediaFor(o, p);
  const withheld = D.fixture ? D.withheldMedia(o, p) : [];
  if (!media.length) return `<div class="noimg" style="aspect-ratio:16/7;border-radius:var(--r);border:1px dashed var(--line2)">No approved project images yet. Images appear only after written permission and review.</div>${withheld.length ? `<p class="gnote">${withheld.length} item(s) withheld (fixture view): no written permission or restricted.</p>` : ''}`;
  const cover = media.find(m => m.role === 'cover') || media[0];
  const rest = media.filter(m => m !== cover);
  const cats = [...new Set(media.map(m => m.content_category))];
  return `<div class="gtabs" role="group" aria-label="Filter images"><button type="button" aria-pressed="true" data-gc="all">All · ${media.length}</button>${cats.map(c => `<button type="button" aria-pressed="false" data-gc="${esc(c)}">${lab('content_category', c)} · ${media.filter(m => m.content_category === c).length}</button>`).join('')}</div>
<div class="gal">
  <button type="button" class="main th" data-mi="${esc(cover.id)}" data-gcat="${esc(cover.content_category)}" aria-label="Open image: ${tx(cover.caption)}"><img src="/${esc(cover.file.public_path)}" alt="${tx(cover.alt)}" width="${cover.file.width}" height="${cover.file.height}"><span class="mt mtag">${lab('media_type', cover.media_type)}</span></button>
  <div class="side">${rest.map(m => `<button type="button" class="th" data-mi="${esc(m.id)}" data-gcat="${esc(m.content_category)}" aria-label="Open image: ${tx(m.caption)}"><img src="/${esc(m.file.public_path)}" alt="${tx(m.alt)}" width="${m.file.width}" height="${m.file.height}" loading="lazy"><span class="mt mtag">${lab('media_type', m.media_type)}</span></button>`).join('')}</div>
</div>
<p class="gnote">Images are supplied by the developer under written permission unless stated otherwise. Renderings and plans are indicative, not photographs of completed work.${withheld.length ? ` ${withheld.length} item(s) withheld (fixture view): no written permission or restricted.` : ''}</p>`;
}
export function bindGallery(root, D, o, p) {
  const media = D.mediaFor(o, p);
  root.querySelectorAll('[data-gc]').forEach(b => b.addEventListener('click', () => {
    root.querySelectorAll('[data-gc]').forEach(x => x.setAttribute('aria-pressed', String(x === b)));
    const c = b.dataset.gc; root.querySelectorAll('[data-gcat]').forEach(t => { t.hidden = c !== 'all' && t.dataset.gcat !== c; });
  }));
  root.querySelectorAll('[data-mi]').forEach(b => b.addEventListener('click', () => lightbox(media, media.findIndex(m => m.id === b.dataset.mi), b)));
}
function lightbox(media, i, opener) {
  const el = document.createElement('div'); el.className = 'lb'; el.setAttribute('role', 'dialog'); el.setAttribute('aria-modal', 'true'); el.setAttribute('aria-label', 'Image viewer');
  const draw = () => {
    const m = media[i];
    const src = m.provenance ? `Provided by ${esc(m.provenance.provided_by_role)}` : '';
    el.innerHTML = `<div class="top"><span class="mono" style="font-size:11px">${i + 1} / ${media.length} · ${lab('media_type', m.media_type)}</span><span style="display:flex;gap:8px"><button type="button" data-a="p" aria-label="Previous image">←</button><button type="button" data-a="n" aria-label="Next image">→</button><button type="button" data-a="x" aria-label="Close viewer">Close</button></span></div>
<div class="img"><img src="/${esc(m.file.public_path)}" alt="${tx(m.alt)}"></div>
<div class="cap"><span>${tx(m.caption)}</span>${m.depicted_date ? `<span class="mono" style="font-size:11px">Dated ${fmtDate(m.depicted_date)}</span>` : ''}${m.attribution && m.attribution.required ? `<span class="mono" style="font-size:11px">${esc(m.attribution.text)}</span>` : ''}<span class="mono" style="font-size:11px">${src} · ${lab('verification', m.verification_status)}</span></div>`;
    el.querySelector('[data-a=p]').onclick = () => { i = (i - 1 + media.length) % media.length; draw(); };
    el.querySelector('[data-a=n]').onclick = () => { i = (i + 1) % media.length; draw(); };
    el.querySelector('[data-a=x]').onclick = close;
    el.querySelector('[data-a=x]').focus();
  };
  const key = (e) => { if (e.key === 'Escape') close(); if (e.key === 'ArrowRight') el.querySelector('[data-a=n]').click(); if (e.key === 'ArrowLeft') el.querySelector('[data-a=p]').click(); if (e.key === 'Tab') trap(e, el); };
  function close() { document.removeEventListener('keydown', key); el.remove(); document.body.style.overflow = ''; opener && opener.focus(); }
  document.addEventListener('keydown', key); document.body.appendChild(el); document.body.style.overflow = 'hidden'; draw();
}
function trap(e, el) {
  const f = [...el.querySelectorAll('button,[href],input,select,textarea')].filter(x => !x.disabled);
  if (!f.length) return; const first = f[0], last = f[f.length - 1];
  if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); } else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
}

// ---------- evidence drawer ----------
export function evidenceButton(evs, key) {
  if (!evs.length) return `<span class="lab">No evidence linked</span>`;
  return `<button type="button" class="evb" data-ev="${esc(key)}" aria-haspopup="dialog">${vs(strongest(evs))}<span>Evidence</span><span class="n">${evs.length}</span></button>`;
}
export function openDrawer(D, title, evs, opener) {
  let dr = document.getElementById('dr');
  if (!dr) { dr = document.createElement('div'); dr.id = 'dr'; dr.className = 'dr'; dr.innerHTML = '<div class="pn" role="dialog" aria-modal="true" aria-labelledby="dr-t"></div>'; document.body.appendChild(dr); }
  const pn = dr.firstElementChild;
  pn.innerHTML = `<div class="hdr"><div><div class="lab">Evidence</div><h2 id="dr-t">${esc(title)}</h2></div><button type="button" class="x" aria-label="Close evidence">×</button></div>
${evs.map(e => { const s = D.source(e.source_id) || {}; const cf = (e.conflict_ids || []).map(id => D.byId(id)).filter(Boolean); return `<section class="ev">
  <div class="row" style="display:flex;flex-wrap:wrap;gap:6px">${vs(e.verification_status)}${chip(esc(e.evidence_class))}${chip(esc((L.tier[e.source_tier] || '').split(' · ')[0]))}</div>
  <p>${tx(e.claim)}</p>
  <dl>
    ${e.value !== null ? `<dt>Value</dt><dd>${esc(fmtValue(e))}</dd>` : ''}
    <dt>Source</dt><dd>${esc(s.name || e.source_id)}${s.publisher ? ' · ' + esc(s.publisher) : ''}${s.url ? ` · <a href="${esc(s.url)}" rel="noopener" target="_blank" style="text-decoration:underline">link</a>` : ''}</dd>
    <dt>Source tier</dt><dd>${esc(L.tier[e.source_tier] || e.source_tier)}</dd>
    ${e.source_locator ? `<dt>Locator</dt><dd>${esc(e.source_locator)}</dd>` : ''}
    <dt>Geography</dt><dd>${esc(e.geography)}</dd>
    <dt>Period</dt><dd>${e.period ? esc(e.period) : '<span class="mut">Not stated</span>'}</dd>
    ${e.published_at ? `<dt>Published</dt><dd>${fmtDate(e.published_at)}</dd>` : ''}
    <dt>Retrieved</dt><dd>${fmtDate(e.retrieved_at)}</dd>
    <dt>Last verified</dt><dd>${e.last_verified ? fmtDate(e.last_verified) : '<span class="mut">Not re-verified</span>'}</dd>
    ${e.area_basis ? `<dt>Area basis</dt><dd>${esc(e.area_basis === 'GROSS' ? 'Gross area' : 'Net area')}</dd>` : ''}
    ${e.series_id ? `<dt>Series</dt><dd>${esc(e.series_id)}${e.base_period ? ' · base ' + esc(e.base_period) : ''}</dd>` : ''}
    ${e.limitations ? `<dt>Limitations</dt><dd>${tx(e.limitations)}</dd>` : ''}
    ${e.next_review_trigger ? `<dt>Next review</dt><dd>${esc(e.next_review_trigger)}</dd>` : ''}
  </dl>
  ${cf.length ? `<div class="cf"><b>Unresolved conflict</b><p>${cf.map(c => tx(c.description)).join(' ')}</p></div>` : ''}
</section>`; }).join('')}
<p class="gnote">Developer claims and Tier 4 sources are shown as such and are not treated as verified facts.</p>`;
  const close = () => { dr.classList.remove('o'); document.removeEventListener('keydown', key); setTimeout(() => opener && opener.focus(), 50); };
  const key = (e) => { if (e.key === 'Escape') close(); if (e.key === 'Tab') trap(e, pn); };
  pn.querySelector('.x').onclick = close; dr.onclick = (e) => { if (e.target === dr) close(); };
  document.addEventListener('keydown', key); dr.classList.add('o'); pn.querySelector('.x').focus();
}
export const fmtValue = (e) => {
  const v = e.value;
  if (e.field === 'delivery_status') return L.delivery_status[v] || v;
  if (e.unit === 'm2') return `${v} m² (${e.area_basis === 'NET' ? 'net' : e.area_basis === 'GROSS' ? 'gross' : 'basis not stated'})`;
  if (e.unit === 'date' && /^\d{4}-\d{2}$/.test(v)) { const [y, m] = v.split('-'); return `${['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][+m - 1]} ${y}`; }
  return String(v);
};

// ---------- facts ----------
// spec: [label, subjectType, record, field, formatter]
export function factRows(D, specs) {
  const keys = {};
  const html = specs.map(([label, type, rec, field, fmt], i) => {
    const key = `f${i}`;
    if (!rec) return `<div class="fact"><div class="k lab">${esc(label)}</div><div class="v"><span class="fs">Not linked yet</span></div></div>`;
    const evs = D.evidence(type, rec.id, field); keys[key] = { title: label, evs };
    const val = rec[field];
    const st = (rec.field_states || []).find(s => s.field === field);
    const cf = D.conflictsFor([{ type, id: rec.id }]).filter(c => c.field === field && c.status === 'OPEN');
    const shown = (val === null || val === undefined || val === '' || (Array.isArray(val) && !val.length)) ? (st ? fstate(st.state) : `<span class="fs">Not recorded</span>`) : esc(fmt ? fmt(val) : val);
    return `<div class="fact"><div class="k lab">${esc(label)}</div><div class="v">${shown}${cf.length ? ` <span class="chip red">Sources disagree</span>` : ''}</div><div>${evidenceButton(evs, key)}</div></div>`;
  }).join('');
  return { html, keys };
}
export function bindEvidence(root, D, keys) {
  root.querySelectorAll('[data-ev]').forEach(b => b.addEventListener('click', () => { const k = keys[b.dataset.ev]; if (k) openDrawer(D, k.title, k.evs, b); }));
}

// ---------- research status, gaps, conflicts, risks, unavailable methods ----------
export function researchBlocks(blocks) {
  if (!blocks.length) return `<div class="na"><b>No research blocks recorded</b><p>Research Closure and Data Completeness are recorded per intelligence domain once research starts.</p></div>`;
  return `<div class="rb">${blocks.map(b => `<div class="rbx"><div class="lab">${lab('domain', b.domain)}</div>
  <div class="s"><span class="chip ${b.research_closure === 'YES' ? 'on' : ''}">Research closure · ${lab('closure', b.research_closure)}</span><span class="chip ${b.data_completeness === 'YES' ? 'on' : ''}">Data completeness · ${lab('completeness', b.data_completeness)}</span></div>
  ${b.note ? `<p class="mut" style="font-size:13.5px">${tx(b.note)}</p>` : ''}${b.last_reviewed ? `<span class="lab">Reviewed ${fmtDate(b.last_reviewed)}</span>` : ''}</div>`).join('')}</div>
<p class="gnote">Research closure and data completeness are independent: research can be closed while data remains incomplete.</p>`;
}
export function gaps(items) {
  if (!items.length) return `<p class="mut">No explicit data gaps recorded for the fields shown.</p>`;
  return `<div class="gaps">${items.map(g => `<div class="gap"><span class="f">${esc(g.label)}</span>${fstate(g.state)}${g.note ? `<span class="n">${tx(g.note)}</span>` : ''}</div>`).join('')}</div>`;
}
export function conflicts(list) {
  if (!list.length) return '';
  return list.map(c => `<div class="cf"><b>Sources disagree · ${esc(c.field || 'record')}</b><p>${tx(c.description)}</p><span class="lab">Status: ${esc(c.status)} · ${c.evidence_ids.length} sources · values are not reconciled silently</span></div>`).join('');
}
export function risks(D, list) {
  if (!list.length) return `<div class="na"><b>No documented risks yet</b><p>An opportunity cannot be published without documented risks.</p></div>`;
  const sevOn = D.methods['M-RISK-SEVERITY'] && D.methods['M-RISK-SEVERITY'].status === 'ACTIVE';
  return `<div class="risks">${list.map((r, i) => `<article class="rk"><div class="lab">${lab('risk_type', r.risk_type)} · ${lab('risk_status', r.status)}</div><h3>${tx(r.title)}</h3>
  <dl>
    <div><dt>Cause</dt><dd>${r.cause ? tx(r.cause) : '<span class="mut">Not documented</span>'}</dd></div>
    <div><dt>Severity / likelihood</dt><dd>${sevOn && r.severity ? esc(r.severity) : '<span class="mut">Not assessed — method pending approval</span>'}</dd></div>
    <div><dt>Horizon</dt><dd>${r.horizon ? lab('horizon', r.horizon) : '<span class="mut">Not stated</span>'}</dd></div>
    <div><dt>Controllability</dt><dd>${r.controllability ? lab('controllability', r.controllability) : '<span class="mut">Not stated</span>'}</dd></div>
    <div><dt>Mitigation / diligence</dt><dd>${r.mitigation ? tx(r.mitigation) : '<span class="mut">Not documented</span>'}</dd></div>
    <div><dt>Residual uncertainty</dt><dd>${r.residual_uncertainty ? tx(r.residual_uncertainty) : '<span class="mut">Not documented</span>'}</dd></div>
  </dl>${r.evidence_ids.length ? `<div>${evidenceButton(r.evidence_ids.map(id => D.byId(id)).filter(Boolean), 'r' + i)}</div>` : '<span class="lab">No evidence linked</span>'}</article>`).join('')}</div>`;
}
export function unavailable(D, ids) {
  return `<div class="nas">${ids.map(id => { const m = D.methods[id]; if (!m) return ''; return `<div class="na"><span class="lab">${m.status === 'ACTIVE' ? 'Active' : 'Not available in MVP'}</span><b>${esc(m.name)}</b><p>${m.status === 'ACTIVE' ? '' : 'Not calculated. The methodology is not yet approved, so no result is shown or implied.'}</p></div>`; }).join('')}</div>`;
}
export function reveal(root = document) {
  const els = root.querySelectorAll('.rv:not(.in)');
  if (!('IntersectionObserver' in window)) { els.forEach(e => e.classList.add('in')); return; }
  const io = new IntersectionObserver((es) => es.forEach(e => { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } }), { rootMargin: '0px 0px -6% 0px' });
  els.forEach(e => io.observe(e));
}
