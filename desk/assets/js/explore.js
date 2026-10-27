// Explore: search, filters (no price controls, D-06), sort by last verified or delivery date, compare tray (≤3, same category).
import { ready } from './core.js';
import { card, esc, lab, tx, reveal } from './ui.js';

const D = await ready;
const $ = (s) => document.querySelector(s);
const qs = new URLSearchParams(location.search);

// categories (configuration, not inventory)
$('#cats').innerHTML = D.categories().map(c => `<div class="cat ${c.activation === 'ACTIVE' ? '' : 'off'}">
  <span class="lab">${c.activation === 'ACTIVE' ? 'Active category' : 'Not yet operational'}</span><h3>${tx(c.name)}</h3><p>${tx(c.description)}</p></div>`).join('');

const all = D.opportunities().map(o => {
  const p = D.project(o); const d = D.district(p); const m = D.market(o.market_id);
  const pa = p ? D.researchBlocks('project', p.id).find(b => b.domain === 'PROJECT_ASSET') : null;
  return { o, p, d, m, pa, text: [tx(o.title), p && p.name, d && d.name, m && m.name].join(' ').toLowerCase() };
});

// filter options come from the data actually present
const opt = (sel, items, label) => { const el = $(sel); el.innerHTML = `<option value="">${label}</option>` + items.map(([v, t]) => `<option value="${esc(v)}">${t}</option>`).join(''); };
const uniq = (a) => [...new Map(a.filter(Boolean).map(x => [x[0], x])).values()];
opt('#f-market', uniq(D.markets().map(m => [m.id, esc(m.name) + (m.activation === 'ACTIVE' ? '' : ' · inactive')])), 'All markets');
opt('#f-district', uniq(all.map(x => x.d && [x.d.id, esc(x.d.name)])), 'All districts');
opt('#f-type', uniq(all.flatMap(x => (x.p ? x.p.asset_types : []).map(t => [t, lab('asset_type', t)]))), 'All asset types');
opt('#f-delivery', [['OFF_PLAN', 'Off-plan'], ['UNDER_CONSTRUCTION', 'Under construction'], ['COMPLETED', 'Completed']], 'Any delivery status');
opt('#f-evidence', [['YES', 'Research closed'], ['CONDITIONAL', 'Research conditional'], ['NO', 'Research open']], 'Any research status');
for (const [k, sel] of [['q', '#f-q'], ['market', '#f-market'], ['district', '#f-district'], ['type', '#f-type'], ['delivery', '#f-delivery'], ['evidence', '#f-evidence'], ['sort', '#f-sort']]) if (qs.get(k)) $(sel).value = qs.get(k);

const selected = new Map(); // compare selection lives in memory and the URL only
function render() {
  const f = { q: $('#f-q').value.trim().toLowerCase(), market: $('#f-market').value, district: $('#f-district').value, type: $('#f-type').value, delivery: $('#f-delivery').value, evidence: $('#f-evidence').value, sort: $('#f-sort').value };
  const u = new URL(location.href); for (const [k, v] of Object.entries(f)) v && !(k === 'sort' && v === 'verified') ? u.searchParams.set(k, v) : u.searchParams.delete(k); history.replaceState(null, '', u);
  let list = all.filter(x => (!f.q || x.text.includes(f.q)) && (!f.market || x.o.market_id === f.market) && (!f.district || (x.d && x.d.id === f.district))
    && (!f.type || (x.p && x.p.asset_types.includes(f.type))) && (!f.delivery || (x.p && x.p.delivery_status === f.delivery)) && (!f.evidence || (x.pa && x.pa.research_closure === f.evidence)));
  if (f.sort === 'delivery') list.sort((a, b) => ((a.p && a.p.expected_delivery) || '9999').localeCompare((b.p && b.p.expected_delivery) || '9999'));
  else list.sort((a, b) => (b.o.last_verified || '').localeCompare(a.o.last_verified || ''));
  const filtered = Object.entries(f).some(([k, v]) => v && k !== 'sort');
  $('#count').textContent = all.length ? `${list.length} of ${all.length} ${D.fixture ? 'illustrative ' : ''}opportunit${all.length === 1 ? 'y' : 'ies'} shown` : '';
  const grid = $('#cards');
  if (!all.length) {
    grid.innerHTML = `<div class="empty" style="grid-column:1/-1"><span class="lab">Inventory</span><h3>No opportunity has passed publication review yet.</h3>
      <p>This is a deliberate state, not an absence of supply. Opportunities appear here only after their identity, developer, project facts, material risks, image permissions and disclosures have been reviewed.</p>
      <ul><li>Istanbul residential research is in progress.</li><li>Dubai and Abu Dhabi are inactive until their own evidence gates pass.</li><li>Startups &amp; Private Companies and Franchise are future categories.</li></ul>
      <div><a class="btn o sm" href="${D.withFixtureFlag('/desk/intelligence/evaluation/')}">How opportunities are evaluated <i>→</i></a></div></div>`;
  } else if (!list.length) {
    grid.innerHTML = `<div class="empty" style="grid-column:1/-1"><h3>No published opportunity matches these filters.</h3><p>${filtered ? 'Try removing a filter. Missing data is never treated as a match or a mismatch silently: records without a value for a filter are excluded and labelled on their profile.' : ''}</p><div><button type="button" class="lnk" id="clr2">Clear filters</button></div></div>`;
    $('#clr2').onclick = clear;
  } else grid.innerHTML = list.map(x => card(D, x.o)).join('');
  grid.querySelectorAll('[data-cmp]').forEach(cb => { cb.checked = selected.has(cb.dataset.cmp); cb.addEventListener('change', () => toggle(cb)); });
  reveal(grid);
}
function toggle(cb) {
  const msg = $('#tray .msg'); msg.textContent = '';
  if (cb.checked) {
    const cat = [...selected.values()][0];
    if (selected.size >= 3) { cb.checked = false; msg.textContent = 'Compare up to three opportunities.'; }
    else if (cat && cat !== cb.dataset.cat) { cb.checked = false; msg.textContent = 'Only opportunities in the same category can be compared.'; }
    else selected.set(cb.dataset.cmp, cb.dataset.cat);
  } else selected.delete(cb.dataset.cmp);
  tray();
}
function tray() {
  const t = $('#tray'); t.classList.toggle('o', selected.size > 0 || !!$('#tray .msg').textContent);
  $('#tray .its').innerHTML = [...selected.keys()].map(id => { const o = D.opportunity(id); return `<span class="chip on">${o ? tx(o.title) : esc(id)}</span>`; }).join('');
  const go = $('#tray a.btn'); go.href = D.withFixtureFlag(`/desk/compare/?ids=${encodeURIComponent([...selected.keys()].join(','))}`);
  go.setAttribute('aria-disabled', String(selected.size < 2)); go.querySelector('span').textContent = `Compare ${selected.size}`;
}
function clear() { for (const s of ['#f-q', '#f-market', '#f-district', '#f-type', '#f-delivery', '#f-evidence']) $(s).value = ''; $('#f-sort').value = 'verified'; render(); }
$('#flt').addEventListener('input', render); $('#flt').addEventListener('change', render);
$('#clr').addEventListener('click', clear);
$('#tray .lnk').addEventListener('click', () => { selected.clear(); $('#tray .msg').textContent = ''; render(); tray(); });
render(); tray();
