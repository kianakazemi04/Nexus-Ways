// Nexus Desk shell behaviour. No browser storage of any kind (D-07): the chosen theme travels in the page address
// (?theme=dark|light) and is carried across every Desk link, so it no longer resets when moving between pages.
import { load } from './data.js';
import { reveal, fmtDate, t, esc } from './ui.js';

const root = document.documentElement;
const CARRY = ['theme', 'fixtures']; // parameters that persist across Desk navigation (fixtures only matters on localhost)
const params = () => new URLSearchParams(location.search);

// add the carried parameters to every internal Desk link (static, rendered later, or in the language menu)
function decorate(scope = document) {
  const cur = params();
  scope.querySelectorAll('a[href^="/desk/"]').forEach(a => {
    const href = a.getAttribute('href');
    const u = new URL(href, location.origin);
    for (const k of CARRY) { const v = cur.get(k); if (v) u.searchParams.set(k, v); else if (k === 'theme') u.searchParams.delete(k); }
    const next = u.pathname + u.search + u.hash;
    if (next !== href) a.setAttribute('href', next);
  });
}

// theme toggle: system preference until the visitor chooses; the choice is written to the address, not to storage
const thm = document.querySelector('.thm');
const isDark = () => root.dataset.theme ? root.dataset.theme === 'dark' : !matchMedia('(prefers-color-scheme: light)').matches;
const syncThm = () => thm && thm.setAttribute('aria-pressed', String(isDark()));
if (thm) {
  syncThm();
  thm.addEventListener('click', () => {
    const next = isDark() ? 'light' : 'dark';
    root.dataset.theme = next;
    const u = new URL(location.href); u.searchParams.set('theme', next); history.replaceState(history.state, '', u);
    syncThm(); decorate();
  });
}

// language menu (same pattern as the company site)
const lgw = document.querySelector('.lgw');
if (lgw) {
  const btn = lgw.querySelector('.lgb');
  const set = (o) => { lgw.classList.toggle('o', o); btn.setAttribute('aria-expanded', String(o)); };
  btn.addEventListener('click', (e) => { e.stopPropagation(); set(!lgw.classList.contains('o')); });
  document.addEventListener('click', (e) => { if (!lgw.contains(e.target)) set(false); });
  lgw.addEventListener('keydown', (e) => { if (e.key === 'Escape') { set(false); btn.focus(); } });
  // keep the same view (filters, ids, theme) when switching language
  lgw.querySelectorAll('.lgm a').forEach(a => a.addEventListener('click', () => {
    const u = new URL(a.getAttribute('href'), location.origin);
    for (const [k, v] of params()) u.searchParams.set(k, v);
    u.hash = location.hash; a.setAttribute('href', u.pathname + u.search + u.hash);
  }));
}

// mobile menu
const bg = document.querySelector('.bg'); const nv = document.querySelector('.nv');
if (bg && nv) {
  const set = (o) => { bg.setAttribute('aria-expanded', String(o)); nv.classList.toggle('o', o); document.body.style.overflow = o ? 'hidden' : ''; };
  bg.addEventListener('click', () => set(bg.getAttribute('aria-expanded') !== 'true'));
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && nv.classList.contains('o')) { set(false); bg.focus(); } });
  nv.querySelectorAll('a').forEach(a => a.addEventListener('click', () => set(false)));
  matchMedia('(min-width: 981px)').addEventListener('change', (m) => { if (m.matches) set(false); });
}

decorate();
new MutationObserver((ms) => { for (const m of ms) for (const n of m.addedNodes) if (n.nodeType === 1) decorate(n.parentNode || document); }).observe(document.body, { childList: true, subtree: true });

export const ready = load().then((D) => {
  if (D.fixture) {
    const b = document.createElement('div'); b.className = 'illb'; b.setAttribute('role', 'note');
    b.textContent = D.fixtureFailed ? t('illFail') : t('illBanner');
    document.querySelector('.hd').after(b);
  }
  const rail = document.querySelector('.rail .w');
  if (rail) {
    const opps = D.opportunities(); const active = D.markets().filter(m => m.activation === 'ACTIVE').length;
    const lv = opps.map(o => o.last_verified).filter(Boolean).sort().pop();
    rail.innerHTML = `<span><span class="dot"></span><b translate="no">Nexus Desk</b> · MVP</span>`
      + (D.fixture ? `<span class="ill">${esc(t('railIllTag'))}</span>` : '')
      + `<span>${esc(t(D.fixture ? 'railIll' : 'railPub'))} <b>${opps.length}</b></span><span>${esc(t('railActive'))} <b>${active}</b></span>`
      + `<span>${esc(t('railLast'))} <b>${lv ? fmtDate(lv) : '—'}</b></span><span>${esc(t('railPrices'))} <b>${esc(t('railNotPub'))}</b></span>`;
  }
  return D;
});
ready.finally(() => reveal());
reveal();
const yr = document.getElementById('yr'); if (yr) yr.textContent = String(new Date().getFullYear());
