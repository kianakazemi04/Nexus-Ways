// Market page: the status, indicators, research coverage and requirements are generated statically by build.mjs from
// the public research records and MG-1; this script adds only the opportunities published in the market.
import { ready } from './core.js';
import { card, esc, reveal, t, mname } from './ui.js';

const D = await ready;
const el = document.getElementById('mkt');
const m = D.market(el.dataset.market);
if (!m) el.innerHTML = `<div class="empty"><h3>${esc(t('mk.na'))}</h3></div>`;
else {
  const opps = D.opportunities().filter(o => o.market_id === m.id);
  el.innerHTML = `<div class="sh"><div><span class="lab">${esc(t('mk.oppLab'))}</span><h2>${esc(t('mk.oppH', { m: mname(m) }))}</h2></div></div>
  ${opps.length ? `<div class="cards">${opps.map(o => card(D, o, { compare: false })).join('')}</div>` : `<div class="empty"><h3>${esc(t('mk.oppEmptyH', { m: mname(m) }))}</h3><p>${esc(m.activation === 'ACTIVE' ? t('mk.oppEmptyActive') : t('mk.oppEmptyInactive'))}</p></div>`}`;
}
reveal();
