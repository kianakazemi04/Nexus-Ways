// Nexus Desk UI components. Data-driven: every component receives records for ONE subject only.
import { evidenceFreshness, claimPublication, isPublicClaim } from './policy.js';
const TODAY = new Date().toISOString().slice(0, 10); // UTC calendar date, as in the validator
export const esc = (s) => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
import { T, labels, LANGS } from './i18n.js';
export const LANG = (document.documentElement.lang || 'en').slice(0, 2).toLowerCase(); // from the URL path: /desk/, /desk/tr/, /desk/ar/
export const t = T(LANG);
export const tx = (o) => o ? esc(o[LANG] || o.en || '') : '';

export const L = labels(LANG);
export const lab = (map, v) => esc((L[map] && L[map][v]) || v || '');
const VORDER = ['VERIFIED', 'CORROBORATED', 'SOURCE-REPORTED', 'DEVELOPER-CLAIM', 'UNVERIFIED'];
export const strongest = (evs) => evs.length ? VORDER[Math.min(...evs.map(e => VORDER.indexOf(e.verification_status)))] : null;
export const vs = (v) => v ? `<span class="vs" data-v="${esc(v)}">${lab('verification', v)}</span>` : '';
// review policy RP-1 state of one evidence record, as a short label (expiry means re-review is required, not that the claim is false)
export const freshness = (e, D) => { try { return evidenceFreshness(e, TODAY, D && D.source(e.source_id) ? D.source(e.source_id).source_type : null); } catch { return { state: 'INVALID' }; } };
export const freshChip = (f) => f && f.state !== 'CURRENT' ? `<span class="chip${f.state === 'EXPIRED' || f.state === 'INVALID' ? ' red' : ''}">${esc(t('fresh.' + f.state))}</span>` : '';
// claim policy CP-1: a QUALIFIED claim is always shown with who says it, never as an established fact
export const qualifier = (e, D) => { const c = claimPublication(e); if (c.status !== 'QUALIFIED') return ''; const s = D && D.source(e.source_id); return `<span class="lab">${s && s.name ? esc(t('reportedBy', { s: s.name })) : esc(t('reported'))}</span>`; };
export const fstate = (s) => `<span class="fs">${lab('missing', s)}</span>`;
export const chip = (t, cls = '') => `<span class="chip ${cls}">${t}</span>`;
const LOC = (LANGS[LANG] || LANGS.en).locale;
export const fmtDate = (d) => {
  if (!d) return '';
  const [y, m, dd] = String(d).split('-').map(Number);
  const opt = dd ? { day: 'numeric', month: 'short', year: 'numeric' } : m ? { month: 'short', year: 'numeric' } : { year: 'numeric' };
  return esc(new Intl.DateTimeFormat(LOC, { ...opt, timeZone: 'UTC' }).format(new Date(Date.UTC(y, (m || 1) - 1, dd || 1))));
};
export const mname = (m) => m ? (t('mkt.' + m.slug) === 'mkt.' + m.slug ? m.name : t('mkt.' + m.slug)) : '';

// ---------- opportunity card ----------
export function card(D, o, { compare = true } = {}) {
  const p = D.project(o); const d = D.district(p); const m = D.market(o.market_id);
  const media = D.mediaFor(o, p); const cover = media.find(x => x.role === 'cover');
  const gate = D.fixture ? D.gateFor(o.id) : null;
  const rbs = p ? D.researchBlocks('project', p.id) : [];
  const pa = rbs.find(b => b.domain === 'PROJECT_ASSET');
  const url = D.oppUrl(o);
  return `<article class="card rv" data-id="${esc(o.id)}">
  <div class="cv">${cover ? `<img src="/${esc(cover.file.public_path)}" alt="${tx(cover.alt)}" width="${cover.file.width}" height="${cover.file.height}" loading="lazy"><span class="mt mtag">${lab('media_type', cover.media_type)}</span>` : `<div class="noimg">${esc(t('noImg'))}</div>`}
  ${D.fixture ? `<span class="gate mtag">${esc(gate && gate.length ? t('gateBlockedTag') : t('gatePassTag'))}</span>` : ''}</div>
  <div class="bd">
    <div class="lab">${esc(mname(m))}${d ? ' · ' + esc(d.name) : ''}</div>
    <h3><a href="${esc(url)}">${tx(o.title)}</a></h3>
    ${o.summary ? `<p class="loc">${tx(o.summary)}</p>` : ''}
    <div class="row">${p && p.delivery_status ? chip(lab('delivery_status', p.delivery_status)) : chip(esc(t('delivNot')), 'dim')}
      ${pa ? chip(esc(t('researchChip', { s: L.closure[pa.research_closure] })), pa.research_closure === 'YES' ? 'on' : '') + chip(esc(t('dataChip', { s: L.completeness[pa.data_completeness] })), pa.data_completeness === 'YES' ? 'on' : '') : chip(esc(t('noRes')), 'dim')}</div>
  </div>
  <div class="ft"><span class="lab">${o.last_verified ? esc(t('verifiedOn', { d: fmtDate(o.last_verified) })) : esc(t('notYetVer'))}</span>
  ${compare ? `<label class="cmpk"><input type="checkbox" data-cmp="${esc(o.id)}" data-cat="${esc(o.category)}"> ${esc(t('compare'))}</label>` : ''}</div>
</article>`;
}

// ---------- gallery + lightbox ----------
export function gallery(D, o, p) {
  const media = D.mediaFor(o, p);
  const withheld = D.fixture ? D.withheldMedia(o, p) : [];
  if (!media.length) return `<div class="noimg" style="aspect-ratio:16/7;border-radius:var(--r);border:1px dashed var(--line2)">${esc(t('noImages'))}</div>${withheld.length ? `<p class="gnote">${esc(t('withheld', { n: withheld.length }))}</p>` : ''}`;
  const cover = media.find(m => m.role === 'cover') || media[0];
  const rest = media.filter(m => m !== cover);
  const cats = [...new Set(media.map(m => m.content_category))];
  return `<div class="gtabs" role="group" aria-label="${esc(t('imgFilter'))}"><button type="button" aria-pressed="true" data-gc="all">${esc(t('all'))} · ${media.length}</button>${cats.map(c => `<button type="button" aria-pressed="false" data-gc="${esc(c)}">${lab('content_category', c)} · ${media.filter(m => m.content_category === c).length}</button>`).join('')}</div>
<div class="gal">
  <button type="button" class="main th" data-mi="${esc(cover.id)}" data-gcat="${esc(cover.content_category)}" aria-label="${esc(t('openImg', { c: '' }))}${tx(cover.caption)}"><img src="/${esc(cover.file.public_path)}" alt="${tx(cover.alt)}" width="${cover.file.width}" height="${cover.file.height}"><span class="mt mtag">${lab('media_type', cover.media_type)}</span></button>
  <div class="side">${rest.map(m => `<button type="button" class="th" data-mi="${esc(m.id)}" data-gcat="${esc(m.content_category)}" aria-label="${esc(t('openImg', { c: '' }))}${tx(m.caption)}"><img src="/${esc(m.file.public_path)}" alt="${tx(m.alt)}" width="${m.file.width}" height="${m.file.height}" loading="lazy"><span class="mt mtag">${lab('media_type', m.media_type)}</span></button>`).join('')}</div>
</div>
<p class="gnote">${esc(t('galNote'))}${withheld.length ? ' ' + esc(t('withheld', { n: withheld.length })) : ''}</p>`;
}
export function bindGallery(root, D, o, p) {
  const media = D.mediaFor(o, p);
  root.querySelectorAll('[data-gc]').forEach(b => b.addEventListener('click', () => {
    root.querySelectorAll('[data-gc]').forEach(x => x.setAttribute('aria-pressed', String(x === b)));
    const c = b.dataset.gc; root.querySelectorAll('[data-gcat]').forEach(el => { el.hidden = c !== 'all' && el.dataset.gcat !== c; });
  }));
  root.querySelectorAll('[data-mi]').forEach(b => b.addEventListener('click', () => lightbox(media, media.findIndex(m => m.id === b.dataset.mi), b)));
}
function lightbox(media, i, opener) {
  const el = document.createElement('div'); el.className = 'lb'; el.setAttribute('role', 'dialog'); el.setAttribute('aria-modal', 'true'); el.setAttribute('aria-label', t('viewer'));
  const draw = () => {
    const m = media[i];
    const src = m.provenance ? esc(t('providedBy', { r: m.provenance.provided_by_role })) : '';
    el.innerHTML = `<div class="top"><span class="mono" style="font-size:11px">${i + 1} / ${media.length} · ${lab('media_type', m.media_type)}</span><span style="display:flex;gap:8px"><button type="button" data-a="p" aria-label="${esc(t('prev'))}">←</button><button type="button" data-a="n" aria-label="${esc(t('next'))}">→</button><button type="button" data-a="x" aria-label="${esc(t('closeViewer'))}">${esc(t('close'))}</button></span></div>
<div class="img"><img src="/${esc(m.file.public_path)}" alt="${tx(m.alt)}"></div>
<div class="cap"><span>${tx(m.caption)}</span>${m.depicted_date ? `<span class="mono" style="font-size:11px">${esc(t('dated', { d: fmtDate(m.depicted_date) }))}</span>` : ''}${m.attribution && m.attribution.required ? `<span class="mono" style="font-size:11px">${esc(m.attribution.text)}</span>` : ''}<span class="mono" style="font-size:11px">${src} · ${lab('verification', m.verification_status)}</span></div>`;
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
  if (!evs.length) return `<span class="lab">${esc(t('noEv'))}</span>`;
  return `<button type="button" class="evb" data-ev="${esc(key)}" aria-haspopup="dialog">${vs(strongest(evs))}<span>${esc(t('evidence'))}</span><span class="n">${evs.length}</span></button>`;
}
export function openDrawer(D, title, evs, opener) {
  let dr = document.getElementById('dr');
  if (!dr) { dr = document.createElement('div'); dr.id = 'dr'; dr.className = 'dr'; dr.innerHTML = '<div class="pn" role="dialog" aria-modal="true" aria-labelledby="dr-t"></div>'; document.body.appendChild(dr); }
  const pn = dr.firstElementChild;
  pn.innerHTML = `<div class="hdr"><div><div class="lab">${esc(t('evidence'))}</div><h2 id="dr-t">${esc(title)}</h2></div><button type="button" class="x" aria-label="${esc(t('closeEv'))}">×</button></div>
${evs.map(e => { const s = D.source(e.source_id) || {}; const cf = (e.conflict_ids || []).map(id => D.byId(id)).filter(Boolean); return `<section class="ev">
  <div class="row" style="display:flex;flex-wrap:wrap;gap:6px">${vs(e.verification_status)}${chip(lab('evidence_class', e.evidence_class))}${chip(lab('tierShort', e.source_tier))}</div>
  <p>${tx(e.claim)}</p>${qualifier(e, D)}
  <dl>
    ${e.value !== null ? `<dt>${esc(t('value'))}</dt><dd>${esc(fmtValue(e))}</dd>` : ''}
    <dt>${esc(t('source'))}</dt><dd>${esc(s.name || e.source_id)}${s.publisher ? ' · ' + esc(s.publisher) : ''}${s.url ? ` · <a href="${esc(s.url)}" rel="noopener" target="_blank" style="text-decoration:underline">${esc(t('link'))}</a>` : ''}</dd>
    <dt>${esc(t('srcTier'))}</dt><dd>${esc(L.tier[e.source_tier] || e.source_tier)}</dd>
    ${e.source_locator ? `<dt>${esc(t('locator'))}</dt><dd>${esc(e.source_locator)}</dd>` : ''}
    <dt>${esc(t('geography'))}</dt><dd>${esc(e.geography)}</dd>
    <dt>${esc(t('period'))}</dt><dd>${e.period ? esc(e.period) : `<span class="mut">${esc(t('notStated'))}</span>`}</dd>
    ${e.published_at ? `<dt>${esc(t('published'))}</dt><dd>${fmtDate(e.published_at)}</dd>` : ''}
    <dt>${esc(t('retrieved'))}</dt><dd>${fmtDate(e.retrieved_at)}</dd>
    <dt>${esc(t('lastVer'))}</dt><dd>${e.last_verified ? fmtDate(e.last_verified) : `<span class="mut">${esc(t('noVerDate'))}</span>`}</dd>
    <dt>${esc(t('reviewStatus'))}</dt><dd>${(() => { const f = freshness(e, D); return f.state === 'INVALID' ? esc(t('fresh.INVALID')) : esc(t('reviewLine', { s: t('fresh.' + f.state), b: t(f.basis_kind === 'verified' ? 'basisVer' : 'basisRet') })) + ' ' + fmtDate(f.review_due_on); })()}</dd>
    ${e.area_basis ? `<dt>${esc(t('areaBasis'))}</dt><dd>${esc(e.area_basis === 'GROSS' ? t('grossArea') : t('netArea'))}</dd>` : ''}
    ${e.series_id ? `<dt>${esc(t('series'))}</dt><dd>${esc(e.series_id)}${e.base_period ? ' · ' + esc(t('base')) + ' ' + esc(e.base_period) : ''}</dd>` : ''}
    ${e.limitations ? `<dt>${esc(t('limitations'))}</dt><dd>${tx(e.limitations)}</dd>` : ''}
    ${e.next_review_trigger ? `<dt>${esc(t('nextReview'))}</dt><dd>${esc(e.next_review_trigger)}</dd>` : ''}
  </dl>
  ${cf.length ? `<div class="cf"><b>${esc(t('conflictU'))}</b><p>${cf.map(c => tx(c.description)).join(' ')}</p></div>` : ''}
</section>`; }).join('')}
<p class="gnote">${esc(t('evNote'))}</p>`;
  const close = () => { dr.classList.remove('o'); document.removeEventListener('keydown', key); setTimeout(() => opener && opener.focus(), 50); };
  const key = (e) => { if (e.key === 'Escape') close(); if (e.key === 'Tab') trap(e, pn); };
  pn.querySelector('.x').onclick = close; dr.onclick = (e) => { if (e.target === dr) close(); };
  document.addEventListener('keydown', key); dr.classList.add('o'); pn.querySelector('.x').focus();
}
export const fmtValue = (e) => {
  const v = e.value;
  if (e.field === 'delivery_status') return L.delivery_status[v] || v;
  if (e.unit === 'm2') return `${v} m² (${e.area_basis === 'NET' ? t('m2net') : e.area_basis === 'GROSS' ? t('m2gross') : t('m2none')})`;
  if (e.unit === 'date' && /^\d{4}-\d{2}$/.test(v)) return fmtDate(v);
  return String(v);
};

// ---------- facts ----------
// spec: [label, subjectType, record, field, formatter]
export function factRows(D, specs) {
  const keys = {};
  const html = specs.map(([label, type, rec, field, fmt], i) => {
    const key = `f${i}`;
    if (!rec) return `<div class="fact"><div class="k lab">${esc(label)}</div><div class="v"><span class="fs">${esc(t('notLinked'))}</span></div></div>`;
    const evs = D.evidence(type, rec.id, field); keys[key] = { title: label, evs };
    const val = rec[field];
    const st = (rec.field_states || []).find(s => s.field === field);
    const cf = D.conflictsFor([{ type, id: rec.id }]).filter(c => c.field === field && c.status === 'OPEN');
    const shown = (val === null || val === undefined || val === '' || (Array.isArray(val) && !val.length)) ? (st ? fstate(st.state) : `<span class="fs">${esc(t('notRecorded'))}</span>`) : esc(fmt ? fmt(val) : val);
    const fr = evs.map(e => freshness(e, D)); const worst = fr.some(f => f.state === 'CURRENT') ? null : fr.find(f => f.state === 'EXPIRED' || f.state === 'INVALID') || fr[0];
    return `<div class="fact"><div class="k lab">${esc(label)}</div><div class="v">${shown}${cf.length ? ` <span class="chip red">${esc(t('disagree'))}</span>` : ''}${worst ? ' ' + freshChip(worst) : ''}</div><div>${evidenceButton(evs, key)}</div></div>`;
  }).join('');
  return { html, keys };
}
export function bindEvidence(root, D, keys) {
  root.querySelectorAll('[data-ev]').forEach(b => b.addEventListener('click', () => { const k = keys[b.dataset.ev]; if (k) openDrawer(D, k.title, k.evs, b); }));
}

// ---------- research status, gaps, conflicts, risks, unavailable methods ----------
export function researchBlocks(blocks) {
  if (!blocks.length) return `<div class="na"><b>${esc(t('noRB'))}</b><p>${esc(t('noRBp'))}</p></div>`;
  return `<div class="rb">${blocks.map(b => `<div class="rbx"><div class="lab">${lab('domain', b.domain)}</div>
  <div class="s"><span class="chip ${b.research_closure === 'YES' ? 'on' : ''}">${esc(t('rClosure'))} · ${lab('closure', b.research_closure)}</span><span class="chip ${b.data_completeness === 'YES' ? 'on' : ''}">${esc(t('dCompl'))} · ${lab('completeness', b.data_completeness)}</span></div>
  ${b.note ? `<p class="mut" style="font-size:13.5px">${tx(b.note)}</p>` : ''}${b.last_reviewed ? `<span class="lab">${esc(t('reviewed', { d: fmtDate(b.last_reviewed) }))}</span>` : ''}</div>`).join('')}</div>
<p class="gnote">${esc(t('rbNote'))}</p>`;
}
export function gaps(items) {
  if (!items.length) return `<p class="mut">${esc(t('noGaps'))}</p>`;
  return `<div class="gaps">${items.map(g => `<div class="gap"><span class="f">${esc(g.label)}</span>${fstate(g.state)}${g.note ? `<span class="n">${tx(g.note)}</span>` : ''}</div>`).join('')}</div>`;
}
export function conflicts(list) {
  if (!list.length) return '';
  return list.map(c => `<div class="cf"><b>${esc(t('cfTitle', { f: c.field || t('cfRecord') }))}</b><p>${tx(c.description)}</p><span class="lab">${esc(t('cfStatus', { s: L.conflict_status[c.status] || c.status, n: c.evidence_ids.length }))}</span></div>`).join('');
}
// claim policy CP-1 applies to risk evidence too (defence in depth: the validator already keeps it out of public data)
export const riskEvidence = (D, r) => (r.evidence_ids || []).map(id => D.byId(id)).filter(e => e && isPublicClaim(e));
export function risks(D, list) {
  if (!list.length) return `<div class="na"><b>${esc(t('noRisks'))}</b><p>${esc(t('noRisksP'))}</p></div>`;
  const sevOn = D.methods['M-RISK-SEVERITY'] && D.methods['M-RISK-SEVERITY'].status === 'ACTIVE';
  const nd = `<span class="mut">${esc(t('notDoc'))}</span>`; const ns = `<span class="mut">${esc(t('notStated'))}</span>`;
  return `<div class="risks">${list.map((r, i) => `<article class="rk"><div class="lab">${lab('risk_type', r.risk_type)} · ${lab('risk_status', r.status)}</div><h3>${tx(r.title)}</h3>
  <dl>
    <div><dt>${esc(t('cause'))}</dt><dd>${r.cause ? tx(r.cause) : nd}</dd></div>
    <div><dt>${esc(t('sev'))}</dt><dd>${sevOn && r.severity ? esc(r.severity) : `<span class="mut">${esc(t('sevNA'))}</span>`}</dd></div>
    <div><dt>${esc(t('horizon'))}</dt><dd>${r.horizon ? lab('horizon', r.horizon) : ns}</dd></div>
    <div><dt>${esc(t('control'))}</dt><dd>${r.controllability ? lab('controllability', r.controllability) : ns}</dd></div>
    <div><dt>${esc(t('mitig'))}</dt><dd>${r.mitigation ? tx(r.mitigation) : nd}</dd></div>
    <div><dt>${esc(t('resid'))}</dt><dd>${r.residual_uncertainty ? tx(r.residual_uncertainty) : nd}</dd></div>
  </dl>${riskEvidence(D, r).length ? `<div>${evidenceButton(riskEvidence(D, r), 'r' + i)}</div>` : `<span class="lab">${esc(t('noEv'))}</span>`}</article>`).join('')}</div>`;
}
export function unavailable(D, ids) {
  return `<div class="nas">${ids.map(id => { const m = D.methods[id]; if (!m) return ''; return `<div class="na"><span class="lab">${esc(m.status === 'ACTIVE' ? t('active') : t('naMvp'))}</span><b>${esc(t('method.' + id) === 'method.' + id ? m.name : t('method.' + id))}</b><p>${m.status === 'ACTIVE' ? '' : esc(t('naP'))}</p></div>`; }).join('')}</div>`;
}
export function reveal(root = document) {
  const els = root.querySelectorAll('.rv:not(.in)');
  if (!('IntersectionObserver' in window)) { els.forEach(e => e.classList.add('in')); return; }
  const io = new IntersectionObserver((es) => es.forEach(e => { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } }), { rootMargin: '0px 0px -6% 0px' });
  els.forEach(e => io.observe(e));
}
