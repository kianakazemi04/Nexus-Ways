// Nexus Desk shell behaviour. No persistent browser storage of any kind (D-07): the theme toggle lasts for this page view only.
import { load } from './data.js';
import { reveal, fmtDate } from './ui.js';

const root = document.documentElement;
const thm = document.querySelector('.thm');
if (thm) thm.addEventListener('click', () => {
  const dark = root.dataset.theme ? root.dataset.theme === 'dark' : !matchMedia('(prefers-color-scheme: light)').matches;
  root.dataset.theme = dark ? 'light' : 'dark';
  thm.setAttribute('aria-pressed', String(!dark));
});

const bg = document.querySelector('.bg'); const nv = document.querySelector('.nv');
if (bg && nv) {
  const set = (o) => { bg.setAttribute('aria-expanded', String(o)); nv.classList.toggle('o', o); document.body.style.overflow = o ? 'hidden' : ''; };
  bg.addEventListener('click', () => set(bg.getAttribute('aria-expanded') !== 'true'));
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && nv.classList.contains('o')) { set(false); bg.focus(); } });
  nv.querySelectorAll('a').forEach(a => a.addEventListener('click', () => set(false)));
  matchMedia('(min-width: 981px)').addEventListener('change', (m) => { if (m.matches) set(false); });
}

export const ready = load().then((D) => {
  // keep fixture mode across internal links (local development only)
  if (D.fixture) {
    document.querySelectorAll('a[href^="/desk/"]').forEach(a => { if (!a.href.includes('fixtures=1')) a.href = D.withFixtureFlag(a.getAttribute('href')); });
    const b = document.createElement('div'); b.className = 'illb'; b.setAttribute('role', 'note');
    b.textContent = D.fixtureFailed ? 'Fixture mode requested but no fixture data was found' : 'ILLUSTRATIVE — NOT REAL MARKET DATA · local fixture mode · never published';
    document.querySelector('.hd').after(b);
  }
  const rail = document.querySelector('.rail .w');
  if (rail) {
    const opps = D.opportunities(); const active = D.markets().filter(m => m.activation === 'ACTIVE').length;
    const lv = opps.map(o => o.last_verified).filter(Boolean).sort().pop();
    rail.innerHTML = `<span><span class="dot"></span><b>Nexus Desk</b> · MVP</span>`
      + (D.fixture ? `<span class="ill">Illustrative fixtures</span>` : '')
      + `<span>${D.fixture ? 'Illustrative records' : 'Published opportunities'} <b>${opps.length}</b></span><span>Active markets <b>${active}</b></span>`
      + `<span>Last verification <b>${lv ? fmtDate(lv) : '—'}</b></span><span>Prices, scores and forecasts <b>not published</b></span>`;
  }
  return D;
});
ready.finally(() => reveal());
reveal();
const yr = document.getElementById('yr'); if (yr) yr.textContent = String(new Date().getFullYear());
