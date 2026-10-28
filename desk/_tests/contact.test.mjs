// Contact channels (owner instruction, 28 Oct 2026) — run with:  node --test desk/_tests/contact.test.mjs
// Desk pages use Desk's own e-mail, calendar and form key; the company site uses its own. Neither leaks into the other.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { ROOT } from './helpers.mjs';
import { DESK_CONTACT } from '../assets/js/contact.js';

const DESK = { email: 'desk@nexus-ways.com', cal: 'https://calendly.com/nexus-ways/desk', key: 'd54b77d8-f373-4b82-aab7-f32ddf5c6a29' };
const CO = { email: 'info@nexus-ways.com', cal: 'https://calendly.com/nwg6346/30min', key: '7431074e-9111-4f57-98fc-38cb6705d649', wa: 'https://wa.me/message/FOZPO3IOSVMHN1' };
const list = (dir, keep) => fs.readdirSync(dir, { recursive: true }).map(String).filter(keep);
const deskPages = list(path.join(ROOT, 'desk'), f => f.endsWith('.html') && !f.split(path.sep).some(s => s.startsWith('_'))).map(f => ['desk/' + f, fs.readFileSync(path.join(ROOT, 'desk', f), 'utf8')]);
const coPages = list(ROOT, f => f.endsWith('.html') && !f.startsWith('desk') && !f.startsWith('.git') && !f.startsWith('node_modules') && !f.startsWith('NX')).map(f => [f, fs.readFileSync(path.join(ROOT, f), 'utf8')]);

test('the shared Desk constants are exactly the owner-supplied channels', () => {
  assert.equal(DESK_CONTACT.email, DESK.email); assert.equal(DESK_CONTACT.calendly, DESK.cal); assert.equal(DESK_CONTACT.formKey, DESK.key);
  assert.equal(DESK_CONTACT.endpoint, 'https://api.web3forms.com/submit');
});

test('every Desk page: Desk e-mail and Desk calendar in the footer; no company channel, key or company form link', () => {
  assert.ok(deskPages.length >= 57);
  for (const [f, h] of deskPages) {
    const foot = (h.match(/<footer[\s\S]*<\/footer>/) || [''])[0];
    assert.ok(foot.includes(`href="mailto:${DESK.email}"`) && foot.includes(`href="${DESK.cal}"`), `${f}: Desk e-mail and calendar in the footer`);
    assert.match(foot, /href="\/desk\/(?:(?:tr|ar)\/)?consultation\/"/, `${f}: footer links to the Desk form`);
    for (const x of [CO.email, CO.cal, CO.key, CO.wa]) assert.ok(!h.includes(x), `${f} contains company channel ${x}`);
    assert.doesNotMatch(h, /href="\/contact\/?(\?|")/, `${f} sends visitors to the company contact form`);
    // the header CTA goes to the Desk form in the page's language
    const lang = (h.match(/<html lang="(\w+)"/) || [])[1];
    assert.ok(h.includes(`class="btn sm" href="/desk/${lang === 'en' ? '' : lang + '/'}consultation/"`), `${f}: header CTA → Desk form`);
  }
});

test('Desk consultation form (EN/TR/AR): Desk key, Web3Forms endpoint, required consent, no company fallback', () => {
  for (const f of ['consultation/index.html', 'tr/consultation/index.html', 'ar/consultation/index.html']) {
    const h = fs.readFileSync(path.join(ROOT, 'desk', f), 'utf8');
    const form = (h.match(/<form id="cf"[\s\S]*?<\/form>/) || [''])[0];
    assert.ok(form.includes(`name="access_key" value="${DESK.key}"`), f);
    assert.ok(form.includes('data-endpoint="https://api.web3forms.com/submit"'), f);
    assert.doesNotMatch(form, /\saction=|<fieldset disabled/, f);
    assert.match(form, /name="consent" value="yes" required/); assert.match(form, /name="email" autocomplete="email" required/); assert.match(form, /name="botcheck"/);
    assert.ok(h.includes(`href="${DESK.cal}"`) && h.includes(`href="mailto:${DESK.email}"`), `${f}: alternatives are Desk channels`);
    assert.match(h, /Web3Forms/, `${f}: privacy note names the processor`);
  }
  const js = fs.readFileSync(path.join(ROOT, 'desk/assets/js/consult.js'), 'utf8');
  assert.match(js, /data\.access_key = DESK_CONTACT\.formKey/); assert.doesNotMatch(js, /localStorage|sessionStorage/);
  assert.match(fs.readFileSync(path.join(ROOT, 'desk/assets/js/opportunity.js'), 'utf8'), /DESK_CONTACT\.calendly/, 'opportunity CTA offers the Desk calendar');
});

test('every company page: company channels in the right places; scheduling CTAs go to the company calendar; no Desk channel', () => {
  assert.ok(coPages.length >= 16);
  for (const [f, h] of coPages) {
    for (const x of [DESK.email, DESK.cal, DESK.key]) assert.ok(!h.includes(x), `${f} contains Desk channel ${x}`);
    // scheduling buttons (Book a Call, Request a Meeting, Schedule a Direct Call) → company Calendly, never WhatsApp
    for (const m of h.matchAll(/<a [^>]*>(?:(?!<\/a>)[\s\S])*?data-i="(cta\.call|cta\.meet|ct\.b1)"[\s\S]*?<\/a>|<a [^>]*data-i="(cta\.call|cta\.meet|ct\.b1)"[^>]*>/g)) {
      const href = (m[0].match(/href="([^"]+)"/) || [])[1];
      assert.equal(href, CO.cal, `${f}: ${m[1] || m[2]} → ${href}`);
    }
    // footer "Connect": e-mail, WhatsApp, booking link
    const foot = (h.match(/<footer[\s\S]*<\/footer>/) || [''])[0];
    for (const x of [`mailto:${CO.email}`, CO.wa, CO.cal]) assert.ok(foot.includes(x), `${f}: footer has ${x}`);
    // every company form posts with the company key
    for (const k of h.matchAll(/name="access_key" value="([^"]+)"/g)) assert.equal(k[1], CO.key, f);
  }
  const contact = fs.readFileSync(path.join(ROOT, 'contact/index.html'), 'utf8');
  const cards = [...contact.matchAll(/<a class="chn rv"[^>]*href="([^"]+)"/g)].map(m => m[1]);
  assert.deepEqual(cards, [CO.cal, CO.wa, `mailto:${CO.email}`, 'https://www.linkedin.com/company/nexus-ways'], 'contact page channel cards');
  const llms = fs.readFileSync(path.join(ROOT, 'llms.txt'), 'utf8');
  for (const x of [CO.email, CO.wa, CO.cal, DESK.email, DESK.cal]) assert.ok(llms.includes(x), `llms.txt lists ${x}`);
});
