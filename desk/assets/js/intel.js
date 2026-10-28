// Intelligence page: the method-registry filter. Statuses and texts are rendered at build time from the method registry;
// this script only shows or hides method cards. Without JavaScript every method is listed and the filter stays hidden.
import './core.js';

const group = document.querySelector('.mfilt');
const items = [...document.querySelectorAll('#mths .mth')];
if (group && items.length) {
  group.hidden = false;
  group.addEventListener('click', (e) => {
    const b = e.target.closest('button[data-filter]'); if (!b) return;
    const f = b.dataset.filter;
    group.querySelectorAll('button[data-filter]').forEach(x => x.setAttribute('aria-pressed', String(x === b)));
    for (const d of items) d.hidden = f !== 'all' && d.dataset.state !== f;
  });
}
