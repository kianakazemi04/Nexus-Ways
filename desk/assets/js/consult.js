// Consultation request: Desk's own form (Web3Forms key in contact.js, owner instruction 28 Oct 2026).
// The opportunity or market context comes from the URL (?ref=OPP-…&market=MKT-…). Details are sent once, on submit, to
// the form endpoint only; nothing is stored in the browser. A required-field or consent problem stops the submission.
import { ready } from './core.js';
import { esc, tx, t, mname } from './ui.js';
import { DESK_CONTACT } from './contact.js';

const form = document.getElementById('cf');
const status = document.getElementById('cf-st');
const btn = form.querySelector('button[type=submit]');
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const say = (msg, kind) => { status.textContent = msg; status.dataset.kind = kind || ''; };

const D = await ready;
const q = new URLSearchParams(location.search);
const refs = (q.get('ref') || '').split(',').map(s => s.trim()).filter(Boolean).slice(0, 3);
const market = q.get('market');
const items = refs.map(id => D.opportunity(id)).filter(Boolean); // only published opportunities are named
const ctx = document.getElementById('ctx');
const parts = items.map(o => `<span class="chip on">${tx(o.title)}</span>`);
const m = market && D.market(market); if (m && !items.length) parts.push(`<span class="chip">${esc(mname(m))}</span>`);
ctx.innerHTML = parts.length ? `<span class="lab">${esc(t('regarding'))}</span><div class="ctx">${parts.join('')}</div>` : '';
// lead attribution: the Desk or company page the visitor came from, as a same-site path only (no query, no identifier)
{ let from = 'direct or external'; try { const r = document.referrer && new URL(document.referrer); if (r && r.origin === location.origin) from = r.pathname; } catch (e) { /* no referrer */ }
  const pg = document.getElementById('cf-page'); if (pg) pg.value = from; }
document.getElementById('cf-ref').value = items.map(o => `${o.id} — ${(o.title && o.title.en) || ''}`).join('; ');
const mk = m || (items[0] && D.market(items[0].market_id));
if (mk) { const opt = [...document.getElementById('cf-mkt').options].find(o => o.dataset.id === mk.id); if (opt) opt.selected = true; }

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  const f = new FormData(form);
  const bad = (name, msg) => { const el = form.elements[name]; el.setAttribute('aria-invalid', 'true'); el.focus(); say(msg, 'er'); return true; };
  for (const el of form.querySelectorAll('[aria-invalid]')) el.removeAttribute('aria-invalid');
  if (!String(f.get('name') || '').trim()) return bad('name', t('cs.errName'));
  if (!EMAIL.test(String(f.get('email') || '').trim())) return bad('email', t('cs.errEmail'));
  if (!form.elements.consent.checked) return bad('consent', t('cs.errConsent'));
  if (form.elements.botcheck.checked) return; // honeypot: silently ignore automated submissions
  const data = Object.fromEntries([...f.entries()].filter(([k]) => k !== 'botcheck').map(([k, v]) => [k, String(v).trim()]));
  data.access_key = DESK_CONTACT.formKey; // always Desk's key, whatever the markup says
  btn.disabled = true; say(t('cs.sending'), '');
  try {
    const r = await fetch(form.dataset.endpoint || DESK_CONTACT.endpoint, { method: 'POST', headers: { 'Content-Type': 'application/json', Accept: 'application/json' }, body: JSON.stringify(data) });
    const j = await r.json().catch(() => ({}));
    if (!r.ok || !j.success) throw new Error('not sent');
    form.reset(); say(t('cs.ok'), 'ok');
  } catch { say(t('cs.err'), 'er'); }
  finally { btn.disabled = false; }
});
