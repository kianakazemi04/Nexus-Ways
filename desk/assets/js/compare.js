// Compare: up to three published opportunities of the same category. State lives in the URL only (?ids=a,b,c).
import { ready } from './core.js';
import { esc, tx, lab, vs, strongest, fstate, t, mname, fmtDate, L } from './ui.js';

const D = await ready;
const host = document.getElementById('cmp');
const raw = (new URLSearchParams(location.search).get('ids') || '').split(',').map(s => s.trim()).filter(Boolean);
const ids = [...new Set(raw)];
const opps = ids.map(id => D.opportunity(id)).filter(Boolean);
const problems = [];
if (ids.length > 3) problems.push(t('cmpMax'));
if (opps.length < ids.length) problems.push(t('cmpUnpub', { n: ids.length - opps.length }));
const list = opps.slice(0, 3);
const cats = new Set(list.map(o => o.category));
if (cats.size > 1) problems.push(t('cmpCats'));

if (list.length < 2 || cats.size > 1) {
  host.innerHTML = `<div class="empty"><span class="lab">${esc(t('compare'))}</span><h3>${esc(list.length < 2 ? t('selectTwo') : t('notPossible'))}</h3>${problems.map(p => `<p>${esc(p)}</p>`).join('')}<div><a class="btn o sm" href="${D.withFixtureFlag('/desk/')}">${esc(t('goExplore'))} <i>→</i></a></div></div>`;
} else {
  const ctx = list.map(o => { const p = D.project(o); return { o, p, dev: D.developer(p), dist: D.district(p), a: D.asset(o), rb: p ? D.researchBlocks('project', p.id) : [] }; });
  const cell = (type, rec, field, fmt) => {
    if (!rec) return `<span class="nc">${esc(t('notLinked2'))}</span>`;
    const v = rec[field]; const st = (rec.field_states || []).find(s => s.field === field);
    const evs = D.evidence(type, rec.id, field);
    if (v === null || v === undefined || v === '' || (Array.isArray(v) && !v.length)) return st ? fstate(st.state) : `<span class="nc">${esc(t('notRecorded'))}</span>`;
    return `${esc(fmt ? fmt(v) : v)}${evs.length ? `<div style="margin-top:6px">${vs(strongest(evs))}</div>` : `<div class="nc">${esc(t('noEv'))}</div>`}`;
  };
  const rows = [
    [t('market'), x => esc(mname(D.market(x.o.market_id)))],
    [t('fl.district'), x => x.dist ? esc(x.dist.name) : cell('project', x.p, 'district_id')],
    [t('fl.dev'), x => x.dev ? esc(x.dev.name) : `<span class="nc">${esc(t('notLinked2'))}</span>`],
    [t('fl.legal'), x => cell('developer', x.dev, 'legal_entity_name')],
    [t('fl.delivery'), x => cell('project', x.p, 'delivery_status', v => L.delivery_status[v] || v)],
    [t('fl.expected'), x => cell('project', x.p, 'expected_delivery', v => fmtDate(v).replace(/&amp;/g, '&'))],
    [t('fl.unit'), x => cell('asset', x.a, 'unit_type')],
    [t('cr.gross'), x => cell('asset', x.a, 'gross_area_m2', v => `${v} m²`)],
    [t('cr.net'), x => cell('asset', x.a, 'net_area_m2', v => `${v} m²`)],
    ...['PROJECT_ASSET', 'DEVELOPER', 'RISK'].map(dm => [t('cr.research', { d: L.domain[dm] }), x => { const b = x.rb.find(r => r.domain === dm); return b ? `${esc(t('cr.closure', { s: L.closure[b.research_closure] }))}<br>${esc(t('cr.compl', { s: L.completeness[b.data_completeness] }))}` : `<span class="nc">${esc(t('noRB2'))}</span>`; }]),
    [t('docRisks'), x => { const r = D.risksFor(x.o, x.p); return r.length ? r.map(k => `• ${tx(k.title)}`).join('<br>') : `<span class="nc">${esc(t('noneDoc'))}</span>`; }],
    [t('openCf'), x => { const c = D.conflictsFor([{ type: 'project', id: x.p && x.p.id }, { type: 'opportunity', id: x.o.id }]).filter(c => c.status === 'OPEN'); return esc(c.length ? t('unresolved', { n: c.length }) : t('noneRec')); }],
    [t('price'), () => `<span class="nc">${esc(t('priceVal'))}</span>`],
    [t('aqRow'), () => `<span class="nc">${esc(t('naMvp'))}</span>`]
  ];
  host.innerHTML = `${problems.length ? `<div class="notice" style="margin-bottom:16px">${problems.map(p => `<p>${esc(p)}</p>`).join('')}</div>` : ''}
<div class="tw"><table class="cmp"><caption class="sr">${esc(t('cmpCaption', { n: list.length }))}</caption><thead><tr><th scope="col"><span class="sr">${esc(t('attr'))}</span></th>${ctx.map(x => `<th scope="col"><a href="${esc(D.oppUrl(x.o))}" style="text-decoration:underline;text-underline-offset:4px">${tx(x.o.title)}</a></th>`).join('')}</tr></thead>
<tbody>${rows.map(([k, f]) => `<tr><th scope="row">${esc(k)}</th>${ctx.map(x => `<td>${f(x)}</td>`).join('')}</tr>`).join('')}</tbody></table></div>
<p class="gnote">${esc(t('cmpNote'))}</p>
<div class="op-cta"><a class="btn" href="${esc(D.withFixtureFlag('/desk/consultation/?ref=' + encodeURIComponent(list.map(o => o.id).join(','))))}">${esc(t('discuss'))} <i>→</i></a></div>`;
}
