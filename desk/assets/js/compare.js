// Compare: up to three published opportunities of the same category. State lives in the URL only (?ids=a,b,c).
import { ready } from './core.js';
import { esc, tx, lab, vs, strongest, fstate } from './ui.js';

const D = await ready;
const host = document.getElementById('cmp');
const raw = (new URLSearchParams(location.search).get('ids') || '').split(',').map(s => s.trim()).filter(Boolean);
const ids = [...new Set(raw)];
const opps = ids.map(id => D.opportunity(id)).filter(Boolean);
const problems = [];
if (ids.length > 3) problems.push('At most three opportunities can be compared; only the first three are shown.');
if (opps.length < ids.length) problems.push(`${ids.length - opps.length} requested item(s) are not published and are not shown.`);
const list = opps.slice(0, 3);
const cats = new Set(list.map(o => o.category));
if (cats.size > 1) problems.push('These opportunities are in different categories and cannot be compared.');

if (list.length < 2 || cats.size > 1) {
  host.innerHTML = `<div class="empty"><span class="lab">Compare</span><h3>${list.length < 2 ? 'Select two or three published opportunities to compare.' : 'Comparison not possible.'}</h3>${problems.map(p => `<p>${esc(p)}</p>`).join('')}<div><a class="btn o sm" href="${D.withFixtureFlag('/desk/')}">Go to Explore <i>→</i></a></div></div>`;
} else {
  const ctx = list.map(o => { const p = D.project(o); return { o, p, dev: D.developer(p), dist: D.district(p), a: D.asset(o), rb: p ? D.researchBlocks('project', p.id) : [] }; });
  const cell = (type, rec, field, fmt) => {
    if (!rec) return `<span class="nc">Not linked</span>`;
    const v = rec[field]; const st = (rec.field_states || []).find(s => s.field === field);
    const evs = D.evidence(type, rec.id, field);
    if (v === null || v === undefined || v === '' || (Array.isArray(v) && !v.length)) return st ? fstate(st.state) : `<span class="nc">Not recorded</span>`;
    return `${esc(fmt ? fmt(v) : v)}${evs.length ? `<div style="margin-top:6px">${vs(strongest(evs))}</div>` : `<div class="nc">No evidence linked</div>`}`;
  };
  const rows = [
    ['Market', x => esc((D.market(x.o.market_id) || {}).name || '')],
    ['District', x => x.dist ? esc(x.dist.name) : cell('project', x.p, 'district_id')],
    ['Developer', x => x.dev ? esc(x.dev.name) : '<span class="nc">Not linked</span>'],
    ['Developer legal entity', x => cell('developer', x.dev, 'legal_entity_name')],
    ['Delivery status', x => cell('project', x.p, 'delivery_status', v => lab('delivery_status', v))],
    ['Expected delivery', x => cell('project', x.p, 'expected_delivery')],
    ['Unit layout', x => cell('asset', x.a, 'unit_type')],
    ['Gross area (gross basis)', x => cell('asset', x.a, 'gross_area_m2', v => `${v} m²`)],
    ['Net area (net basis)', x => cell('asset', x.a, 'net_area_m2', v => `${v} m²`)],
    ...['PROJECT_ASSET', 'DEVELOPER', 'RISK'].map(dm => [`${lab('domain', dm)} research`, x => { const b = x.rb.find(r => r.domain === dm); return b ? `Closure: ${lab('closure', b.research_closure)}<br>Completeness: ${lab('completeness', b.data_completeness)}` : '<span class="nc">No research block</span>'; }]),
    ['Documented risks', x => { const r = D.risksFor(x.o, x.p); return r.length ? r.map(k => `• ${tx(k.title)}`).join('<br>') : '<span class="nc">None documented</span>'; }],
    ['Open source conflicts', x => { const c = D.conflictsFor([{ type: 'project', id: x.p && x.p.id }, { type: 'opportunity', id: x.o.id }]).filter(c => c.status === 'OPEN'); return c.length ? `${c.length} unresolved` : 'None recorded'; }],
    ['Price', () => '<span class="nc">Not published · via consultation</span>'],
    ['Asset Quality · Fit · Yield', () => '<span class="nc">Not available in MVP</span>']
  ];
  host.innerHTML = `${problems.length ? `<div class="notice" style="margin-bottom:16px">${problems.map(p => `<p>${esc(p)}</p>`).join('')}</div>` : ''}
<div class="tw"><table class="cmp"><caption class="sr">Comparison of ${list.length} opportunities</caption><thead><tr><th scope="col"><span class="sr">Attribute</span></th>${ctx.map(x => `<th scope="col"><a href="${esc(D.oppUrl(x.o))}" style="text-decoration:underline;text-underline-offset:4px">${tx(x.o.title)}</a></th>`).join('')}</tr></thead>
<tbody>${rows.map(([k, f]) => `<tr><th scope="row">${esc(k)}</th>${ctx.map(x => `<td>${f(x)}</td>`).join('')}</tr>`).join('')}</tbody></table></div>
<p class="gnote">Values are compared only where definitions, units and area basis match. Missing values are labelled, never treated as zero. No ranking is implied by column order.</p>
<div class="op-cta"><a class="btn" href="${esc(D.withFixtureFlag('/desk/consultation/?ref=' + encodeURIComponent(list.map(o => o.id).join(','))))}">Discuss these opportunities <i>→</i></a></div>`;
}
