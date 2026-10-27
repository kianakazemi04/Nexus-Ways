// Market page: status and gate labels; context is shown only when the market record itself is PUBLISHED.
import { ready } from './core.js';
import { card, esc, tx, researchBlocks, reveal, chip, fmtDate } from './ui.js';

const D = await ready;
const el = document.getElementById('mkt');
const slug = el.dataset.market;
const m = D.market(slug);
if (!m) {
  el.innerHTML = `<div class="empty"><h3>Market record not available.</h3></div>`;
} else {
  const published = m.record_status === 'PUBLISHED' && m.activation === 'ACTIVE' && (D.index.markets || []).includes(m.id);
  const opps = D.opportunities().filter(o => o.market_id === m.id);
  const statusChip = m.activation === 'ACTIVE' ? chip('Active market', 'on') : m.record_status === 'RESEARCH_IN_PROGRESS' ? chip('Research in progress') : chip('Inactive · gated', 'dim');
  el.innerHTML = `<div class="sec"><div class="sh"><div><span class="lab">Status</span><h2>${esc(m.name)}</h2></div><div class="row" style="display:flex;gap:8px;flex-wrap:wrap">${statusChip}${chip('Currency · ' + esc(m.currency))}${m.last_reviewed ? chip('Reviewed ' + fmtDate(m.last_reviewed)) : ''}</div></div>
  <p class="mut" style="max-width:64ch">${tx(m.summary)}</p></div>
  <div class="sec"><div class="sh"><div><span class="lab">Market context</span><h2>Verified context</h2></div></div>
  ${published ? researchBlocks(D.researchBlocks('market', m.id)) : `<div class="empty"><h3>No market context is published yet.</h3><p>Market-level claims appear only after they pass verification with source, period, geography, unit and next-review date. District-level claims require district-level evidence.</p></div>`}</div>
  <div class="sec"><div class="sh"><div><span class="lab">Opportunities</span><h2>Published in ${esc(m.name)}</h2></div></div>
  ${opps.length ? `<div class="cards">${opps.map(o => card(D, o, { compare: false })).join('')}</div>` : `<div class="empty"><h3>No opportunity in ${esc(m.name)} has passed publication review yet.</h3><p>${m.activation === 'ACTIVE' ? 'Opportunities are added only after review.' : 'This market is not active. Its separate evidence gate must pass before any opportunity can be published here.'}</p></div>`}</div>`;
}
reveal();
