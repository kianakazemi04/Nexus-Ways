// Consultation: UNCONFIGURED in Stage 1 (D-15). Shows the request context from the URL; collects and submits nothing.
import { ready } from './core.js';
import { esc, tx } from './ui.js';

const D = await ready;
const q = new URLSearchParams(location.search);
const refs = (q.get('ref') || '').split(',').map(s => s.trim()).filter(Boolean).slice(0, 3);
const market = q.get('market');
const items = refs.map(id => D.opportunity(id)).filter(Boolean);
const ctx = document.getElementById('ctx');
const parts = [];
for (const o of items) parts.push(`<span class="chip on">${tx(o.title)}</span>`);
const m = market && D.market(market); if (m && !items.length) parts.push(`<span class="chip">${esc(m.name)}</span>`);
ctx.innerHTML = parts.length ? `<span class="lab">Regarding</span><div class="ctx">${parts.join('')}</div>` : '';
const form = document.getElementById('cf');
form.addEventListener('submit', (e) => { e.preventDefault(); });
