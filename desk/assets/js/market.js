// Market page: status and gate labels; context is shown only when the market record itself is PUBLISHED.
import { ready } from './core.js';
import { card, esc, tx, researchBlocks, reveal, chip, fmtDate, t, mname } from './ui.js';

const D = await ready;
const el = document.getElementById('mkt');
const slug = el.dataset.market;
const m = D.market(slug);
if (!m) {
  el.innerHTML = `<div class="empty"><h3>${esc(t('mk.na'))}</h3></div>`;
} else {
  const published = m.record_status === 'PUBLISHED' && m.activation === 'ACTIVE' && (D.index.markets || []).includes(m.id);
  const opps = D.opportunities().filter(o => o.market_id === m.id);
  const statusChip = m.activation === 'ACTIVE' ? chip(esc(t('mk.activeChip')), 'on') : m.record_status === 'RESEARCH_IN_PROGRESS' ? chip(esc(t('mk.research'))) : chip(esc(t('mk.inactive')), 'dim');
  el.innerHTML = `<div class="sec"><div class="sh"><div><span class="lab">${esc(t('mk.status'))}</span><h2>${esc(mname(m))}</h2></div><div class="row" style="display:flex;gap:8px;flex-wrap:wrap">${statusChip}${chip(esc(t('mk.currency')) + ' · ' + esc(m.currency))}${m.last_reviewed ? chip(esc(t('mk.reviewed', { d: fmtDate(m.last_reviewed) }))) : ''}</div></div>
  <p class="mut" style="max-width:64ch">${tx(m.summary)}</p></div>
  <div class="sec"><div class="sh"><div><span class="lab">${esc(t('mk.ctxLab'))}</span><h2>${esc(t('mk.ctxH'))}</h2></div></div>
  ${published ? researchBlocks(D.researchBlocks('market', m.id)) : `<div class="empty"><h3>${esc(t('mk.ctxEmptyH'))}</h3><p>${esc(t('mk.ctxEmptyP'))}</p></div>`}</div>
  <div class="sec"><div class="sh"><div><span class="lab">${esc(t('mk.oppLab'))}</span><h2>${esc(t('mk.oppH', { m: mname(m) }))}</h2></div></div>
  ${opps.length ? `<div class="cards">${opps.map(o => card(D, o, { compare: false })).join('')}</div>` : `<div class="empty"><h3>${esc(t('mk.oppEmptyH', { m: mname(m) }))}</h3><p>${esc(m.activation === 'ACTIVE' ? t('mk.oppEmptyActive') : t('mk.oppEmptyInactive'))}</p></div>`}</div>`;
}
reveal();
