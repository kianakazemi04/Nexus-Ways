#!/usr/bin/env node
// Builds every Nexus Desk page, in every published language, from one layout, one dictionary and the public data.
// New opportunities need data only, never page code. Languages: /desk/ (EN), /desk/tr/ (TR), /desk/ar/ (AR, RTL).
//   node desk/_tools/build.mjs           write pages
//   node desk/_tools/build.mjs --check   exit 1 if any generated page is missing or out of date (CI)
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { LANGS, T, localize, labels } from '../assets/js/i18n.js';
import { MKC, HOW, SOURCES, marketCoverage } from './markets-content.mjs';
import { loadGateConfig } from './engines/marketgate.mjs';
import { DESK_CONTACT } from '../assets/js/contact.js';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const DESK = path.resolve(HERE, '..');
const read = (p) => JSON.parse(fs.readFileSync(path.join(DESK, p), 'utf8'));
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const ASSET_V = '6';


const LOGO = `<svg width="0" height="0" style="position:absolute" aria-hidden="true"><symbol id="lg" viewBox="430 350 1075 1180"><path d="M438 583 1394 1272H1188L634 868 638 1339 762 1251 965 1254 590 1521 438 1417Z"/><path transform="rotate(180 966 942)" d="M438 583 1394 1272H1188L634 868 638 1339 762 1251 965 1254 590 1521 438 1417Z"/></symbol></svg>`;
// Theme comes from the address (?theme=dark|light) and is applied before first paint; nothing is stored in the browser (D-07).
// Theme and language follow the company site (D-24): the same two browser keys the company site already uses,
// nw-theme and nw-lang, are read before first paint and written when the visitor chooses. Default theme: dark, as on
// the company site. A language-prefixed page (/desk/tr/, /desk/ar/) is an explicit choice and is remembered; an English
// page follows the remembered language (like the company site without ?lang=). No other storage is used.
const THEME_BOOT = `<script>(function(){var d=document.documentElement,q=new URLSearchParams(location.search),K='nw-theme',G='nw-lang';
function g(k){try{return localStorage.getItem(k)}catch(e){return null}}function s(k,v){try{localStorage.setItem(k,v)}catch(e){}}
var t=q.get('theme');if(t==='dark'||t==='light')s(K,t);else t=g(K)==='light'?'light':'dark';d.setAttribute('data-theme',t);
var m=location.pathname.match(/^\\/desk\\/(tr|ar)(\\/|$)/);if(m){s(G,m[1]);return}
var ql=q.get('lang');if(ql==='en'||ql==='tr'||ql==='ar')s(G,ql);var w=g(G);
if(w==='tr'||w==='ar'){q.delete('lang');var qs=q.toString();location.replace(location.pathname.replace(/^\\/desk\\//,'/desk/'+w+'/')+(qs?'?'+qs:'')+location.hash)}})();</script>`;
const GLOBE = `<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9.2"/><path d="M2.8 12h18.4M12 2.8c2.6 2.6 3.9 5.6 3.9 9.2s-1.3 6.6-3.9 9.2M12 2.8C9.4 5.4 8.1 8.4 8.1 12s1.3 6.6 3.9 9.2"/></svg>`;

// Indexing (owner decision K-4): Desk stays out of search engines until the first opportunity is published; from then
// on Explore, Markets, Intelligence and published opportunity pages are indexable. Previews, compare, consultation,
// disclosures and 404 stay noindex.
let PUBLISHED_N = 0;
export const indexable = (rest) => PUBLISHED_N > 0 && /^(|index\.html|markets\/.*|intelligence\/.*|opportunities\/(?!preview\/)[^/]+\/)$/.test(rest || '');
function layout({ lang, rest, title, description, current, body, script }) {
  const t = T(lang); const L = LANGS[lang];
  const u = (p) => localize(p, lang);
  const nav = (p, key, label) => `<a class="nl" href="${u(p)}"${current === key ? ' aria-current="page"' : ''}>${esc(label)}</a>`;
  const alt = Object.keys(LANGS).map(l => `<link rel="alternate" hreflang="${l}" href="https://nexus-ways.com${localize('/desk/' + rest, l)}">`).join('\n');
  const langMenu = `<div class="lgw"><button class="lgb" type="button" aria-haspopup="true" aria-expanded="false" aria-controls="lgm" aria-label="${esc(t('lang'))}">${GLOBE}<span>${L.code}</span></button>
<div class="lgm" id="lgm" role="menu">${Object.entries(LANGS).map(([l, x]) => `<a role="menuitem" href="${localize('/desk/' + rest, l)}" hreflang="${l}" lang="${l}"${l === lang ? ' aria-current="true"' : ''}>${esc(x.name)} <small>${x.code}</small></a>`).join('')}</div></div>`;
  return `<!DOCTYPE html>
<html lang="${lang}" dir="${L.dir}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
${THEME_BOOT}
<title>${esc(title)}</title>
<meta name="description" content="${esc(description)}">
<meta name="robots" content="${indexable(rest) ? 'index, follow' : 'noindex, follow'}">
<meta name="color-scheme" content="dark light">
<meta name="theme-color" content="#09090a">
<meta name="referrer" content="strict-origin-when-cross-origin">
${alt}
<link rel="icon" href="/favicon.ico" sizes="48x48">
<link rel="icon" type="image/svg+xml" href="/favicon.svg">
<link rel="icon" type="image/png" sizes="32x32" href="/favicon-32x32.png">
<link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;800&family=Inter+Tight:wght@400;500;600&family=JetBrains+Mono:wght@400;500;600${L.dir === 'rtl' ? '&family=IBM+Plex+Sans+Arabic:wght@300;400;500;600' : ''}&display=swap" rel="stylesheet">
<link rel="stylesheet" href="/desk/assets/css/desk.css?v=${ASSET_V}">
</head>
<body>
${LOGO}
<a class="sr" href="#main">${esc(t('skip'))}</a>
<div class="rail" aria-label="${esc(t('deskStatus'))}"><div class="w"><span><span class="dot"></span><b translate="no">Nexus Desk</b> · MVP</span></div></div>
<header class="hd"><div class="w nb">
<a class="br" href="${u('/desk/')}" aria-label="${esc(t('home'))}"><svg aria-hidden="true"><use href="#lg"/></svg><span class="wm"><span class="bn" translate="no">NEXUS <i>DESK</i></span><span class="by" translate="no">${esc(t('by'))}</span></span></a>
<nav class="nv" id="nv" aria-label="${esc(t('deskNav'))}">
${nav('/desk/', 'explore', t('explore'))}${nav('/desk/markets/', 'markets', t('markets'))}${nav('/desk/intelligence/', 'intel', t('intel'))}
<span class="sep" aria-hidden="true"></span><a class="ext" href="/${lang === 'en' ? '' : '?lang=' + lang}" translate="no">Nexus Ways ↗</a>
<a class="btn sm" href="${u('/desk/consultation/')}"${current === 'consult' ? ' aria-current="page"' : ''}><span>${esc(t('consult'))}</span> <i aria-hidden="true">→</i></a>
<div class="lgr" role="group" aria-label="${esc(t('lang'))}">${Object.entries(LANGS).map(([l, x]) => `<a href="${localize('/desk/' + rest, l)}" hreflang="${l}" lang="${l}"${l === lang ? ' aria-current="true"' : ''}>${x.code}</a>`).join('')}</div>
</nav>
${langMenu}
<button class="thm" type="button" aria-label="${esc(t('theme'))}" aria-pressed="false"><svg class="su" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="4"/><path d="M12 2.5v2M12 19.5v2M2.5 12h2M19.5 12h2M5.3 5.3l1.4 1.4M17.3 17.3l1.4 1.4M5.3 18.7l1.4-1.4M17.3 6.7l1.4-1.4"/></svg><svg class="mo" viewBox="0 0 24 24" aria-hidden="true"><path d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5z"/></svg></button>
<button class="bg" type="button" aria-label="${esc(t('menu'))}" aria-expanded="false" aria-controls="nv"><span></span><span></span></button>
</div></header>
<main id="main">
${body}
</main>
<footer class="ftr"><div class="w"><div class="g">
<div><a class="br" href="${u('/desk/')}" aria-label="${esc(t('home'))}"><svg aria-hidden="true"><use href="#lg"/></svg><span class="wm"><span class="bn" translate="no">NEXUS <i>DESK</i></span><span class="by" translate="no">${esc(t('by'))}</span></span></a><p>${esc(t('notAdvice'))}</p></div>
<div><h4 translate="no">Desk</h4><nav aria-label="Desk"><a href="${u('/desk/')}">${esc(t('explore'))}</a><a href="${u('/desk/markets/')}">${esc(t('markets'))}</a><a href="${u('/desk/intelligence/')}">${esc(t('intel'))}</a><a href="${u('/desk/consultation/')}">${esc(t('consult'))}</a><a href="${u('/desk/disclosures/')}">${esc(t('disclosures'))}</a></nav></div>
<div><h4>${esc(t('ft.contact'))}</h4><nav aria-label="${esc(t('ft.contact'))}"><a href="mailto:${DESK_CONTACT.email}" dir="ltr" translate="no">${DESK_CONTACT.email}</a><a href="${DESK_CONTACT.calendly}" target="_blank" rel="noopener">${esc(t('ft.call'))} ↗</a><a href="${u('/desk/consultation/')}">${esc(t('ft.form'))}</a></nav></div>
<div><h4 translate="no">Nexus Ways</h4><nav aria-label="Nexus Ways"><a href="/${lang === 'en' ? '' : '?lang=' + lang}" translate="no">nexus-ways.com</a><a href="/solutions/investment-arm/${lang === 'en' ? '' : '?lang=' + lang}">${esc(t('footIA'))}</a><a href="/about/${lang === 'en' ? '' : '?lang=' + lang}">${esc(t('footAbout'))}</a></nav></div>
</div><div class="cp"><span>© <span id="yr">2026</span> <span translate="no">Nexus Ways Group · Nexus Desk</span></span><span>${esc(t('footCp'))}</span></div></div></footer>
<script type="module" src="/desk/assets/js/${script || 'core'}.js?v=${ASSET_V}"></script>
<noscript><style>.rv{opacity:1;transform:none}</style></noscript>
</body>
</html>
`;
}

export function pages() {
  const markets = read('data/public/markets.json').records.filter(m => !m.id.startsWith('FIX-'));
  const published = read('data/public/published.json');
  PUBLISHED_N = (published.opportunities || []).length;
  const opps = read('data/public/opportunities.json').records.filter(o => published.opportunities.includes(o.id));
  const pubData = { districts: read('data/public/districts.json').records };
  const gateCfg = loadGateConfig(path.join(DESK, '_tools/market-gates/MG-1.json'));
  const cover = Object.fromEntries(markets.map(m => [m.id, marketCoverage(gateCfg, m, pubData)]));
  const out = {};
  for (const lang of Object.keys(LANGS)) {
    const t = T(lang); const u = (p) => localize(p, lang); const base = lang === 'en' ? '' : lang + '/';
    const tx = (o) => o ? (o[lang] || o.en || '') : '';
    const mname = (m) => t('mkt.' + m.slug) === 'mkt.' + m.slug ? m.name : t('mkt.' + m.slug);
    const page = (rest, o) => { out[base + (rest ? rest + 'index.html' : 'index.html')] = layout({ lang, rest, ...o }); };
    const pi = ({ eb, h1, lead, crumbs = [] }) => `<section class="pi"><div class="w">${crumbs.length ? `<div class="crumb">${crumbs.map((c, i) => i === 0 ? `<a href="${c[1]}">${esc(c[0])}</a>` : c[1] ? `<span><a href="${c[1]}">${esc(c[0])}</a></span>` : `<span>${esc(c[0])}</span>`).join('')}</div>` : ''}<div class="eb">${esc(eb)}</div><h1 style="margin-top:20px">${h1}</h1>${lead ? `<p class="lead">${lead}</p>` : ''}</div></section>`;
    const nojs = `<noscript><div class="w"><div class="notice"><b>${esc(t('nojsT'))}</b><p>${esc(t('nojsP'))}</p></div></div></noscript>`;
    const loading = `<p class="loading">${esc(t('loading'))}</p>`;
    const desk = [t('deskNav'), u('/desk/')];

    page('', { title: t('ex.title'), description: t('ex.desc'), current: 'explore', script: 'explore',
      body: `${pi({ eb: t('ex.eb'), h1: t('ex.h1'), lead: esc(t('ex.lead')) })}
<section class="sec"><div class="w"><div class="sh"><div><span class="lab">${esc(t('ex.catsLab'))}</span><h2>${esc(t('ex.catsH'))}</h2></div></div><div class="cats" id="cats"></div></div></section>
<section class="sec hw" aria-labelledby="hw-t"><div class="w"><div class="sh"><div><span class="lab">${esc(t('hw.lab'))}</span><h2 id="hw-t">${esc(t('hw.h'))}</h2></div><p>${esc(t('hw.p'))}</p></div>
<ol class="hws">${[1, 2, 3, 4].map(i => `<li class="rv"><span class="n">0${i}</span><h3>${esc(t('hw.' + i + 't'))}</h3><p>${esc(t('hw.' + i + 'p'))}</p></li>`).join('')}</ol>
<a class="btn o" href="${u('/desk/intelligence/')}">${esc(t('hw.cta'))} <i aria-hidden="true">→</i></a></div></section>
<section class="sec" aria-labelledby="ex-t"><div class="w"><div class="sh"><div><span class="lab">${esc(t('ex.oppLab'))}</span><h2 id="ex-t">${esc(t('ex.h'))}</h2></div></div>
<div class="ex"><form class="flt" id="flt" role="search" aria-label="${esc(t('ex.filterAria'))}" onsubmit="return false">
<label><span class="lab">${esc(t('f.search'))}</span><input type="search" id="f-q" placeholder="${esc(t('f.searchPh'))}" autocomplete="off"></label>
<label><span class="lab">${esc(t('f.market'))}</span><select id="f-market"></select></label>
<label><span class="lab">${esc(t('f.district'))}</span><select id="f-district"></select></label>
<label><span class="lab">${esc(t('f.type'))}</span><select id="f-type"></select></label>
<label><span class="lab">${esc(t('f.delivery'))}</span><select id="f-delivery"></select></label>
<label><span class="lab">${esc(t('f.evidence'))}</span><select id="f-evidence"></select></label>
<label><span class="lab">${esc(t('f.sort'))}</span><select id="f-sort"><option value="verified">${esc(t('f.sortVer'))}</option><option value="delivery">${esc(t('f.sortDel'))}</option></select></label>
<div class="ft"><span class="lab">${esc(t('f.noPrice'))}</span><button type="button" class="lnk" id="clr">${esc(t('f.clear'))}</button></div></form>
<div><div class="res"><span class="lab" id="count" aria-live="polite"></span></div><div class="cards" id="cards">${loading}</div></div></div></div></section>
${nojs}
<div class="tray" id="tray" aria-live="polite"><div class="w"><span class="lab">${esc(t('compare'))}</span><div class="its"></div><button type="button" class="lnk">${esc(t('f.clear'))}</button><a class="btn sm" href="${u('/desk/compare/')}" aria-disabled="true"><span>${esc(t('compareN', { n: 0 }))}</span> <i aria-hidden="true">→</i></a><p class="msg" role="status"></p></div></div>` });

    // Markets (PUB-2): status from the market record; requirements and sources from MG-1; area names only.
    const st = (m) => m.activation === 'ACTIVE' ? t('mk.active') : t('mk.research');
    const K = MKC[lang] || MKC.en; const H = HOW[lang] || HOW.en; const SRC = SOURCES[lang] || SOURCES.en; const LB = labels(lang);
    const cta = (h, p, btn) => `<section class="sec" aria-label="${esc(h)}"><div class="w"><div class="notice cta"><div><h2 class="h3">${esc(h)}</h2><p>${esc(p)}</p></div><a class="btn" href="${u('/desk/consultation/')}"><span>${esc(btn)}</span> <i aria-hidden="true">→</i></a></div></div></section>`;
    const list = (items) => `<ul class="plain">${items.map(x => `<li>${esc(x)}</li>`).join('')}</ul>`;
    page('markets/', { title: t('mk.title'), description: t('mk.desc'), current: 'markets',
      body: `${pi({ eb: t('mk.eb'), h1: t('mk.h1'), lead: esc(t('mk.lead')), crumbs: [desk, [t('markets')]] })}
<section class="sec"><div class="w"><div class="sh"><div><span class="lab">${esc(K.idxLab)}</span><h2>${esc(K.idxH)}</h2></div><p>${esc(K.idxP)}</p></div>
<div class="mkts">${markets.map(m => `<article class="mk ${m.activation === 'ACTIVE' ? '' : 'off'} rv" data-market-card="${esc(m.id)}"><span class="chip ${m.activation === 'ACTIVE' ? 'on' : ''}">${esc(st(m))}</span><h3><a href="${u('/desk/markets/' + m.slug + '/')}">${esc(mname(m))}</a></h3><p>${esc(tx(m.summary))}</p><span class="go">${esc(t('mk.view'))}</span></article>`).join('')}</div>
<p class="gnote" style="margin-top:18px">${esc(t('mk.note'))}</p></div></section>
<section class="sec hw"><div class="w"><div class="sh"><div><span class="lab">${esc(K.procLab)}</span><h2>${esc(K.procH)}</h2></div></div>
<ol class="hws">${[1, 2, 3, 4].map(i => `<li class="rv"><span class="n">0${i}</span><h3>${esc(K['p' + i + 't'])}</h3><p>${esc(K['p' + i + 'p'])}</p></li>`).join('')}</ol>
<a class="btn o" href="${u('/desk/intelligence/')}">${esc(t('hw.cta'))} <i aria-hidden="true">→</i></a></div></section>
${cta(H.ctaH, H.ctaP, H.ctaBtn)}` });

    for (const m of markets) {
      const c = cover[m.id];
      const areas = c.dists.length ? `<div class="chips">${c.dists.map(d => `<span class="chip" data-district="${esc(d.id)}">${esc(d.name)} <small class="mut">· ${esc(K.admin[d.admin_level] || '')}</small></span>`).join('')}</div><p class="gnote">${esc(K.areaP)}</p>` : `<div class="na"><b>${esc(K.areaNone)}</b></div>`;
      page(`markets/${m.slug}/`, { title: `${mname(m)} | Nexus Desk`, description: t('mk.pageDesc', { m: mname(m) }), current: 'markets', script: 'market',
        body: `${pi({ eb: `${t('mk.market')} · ${st(m)}`, h1: esc(mname(m)), lead: esc(tx(m.summary)), crumbs: [desk, [t('markets'), u('/desk/markets/')], [mname(m)]] })}
<section class="sec" aria-labelledby="req-h" data-market-status="${m.activation === 'ACTIVE' ? 'open' : 'preparing'}"><div class="w"><div class="sh"><div><span class="lab">${esc(K.chkLab)}</span><h2 id="req-h">${esc(K.chkH)}</h2></div><p>${esc(K.chkP)}</p></div>
<div class="tw"><table class="dom"><tbody><tr><th scope="row">01</th><td>${esc(K.reqPerm)}</td></tr>${c.reqs.map((q, i) => `<tr data-req="${esc(q.key)}"><th scope="row">0${i + 2}</th><td>${esc(K.reqs[q.key] || q.name)}</td></tr>`).join('')}</tbody></table></div></div></section>
<section class="sec"><div class="w" id="mkt" data-market="${esc(m.slug)}">${loading}</div></section>${nojs}
<section class="sec" aria-labelledby="dst-h"><div class="w"><div class="sh"><div><span class="lab">${esc(K.areaLab)}</span><h2 id="dst-h">${esc(K.areaH)}</h2></div></div>${areas}</div></section>
<section class="sec" aria-labelledby="src-h"><div class="w"><div class="sh"><div><span class="lab">${esc(K.srcLab)}</span><h2 id="src-h">${esc(K.srcH)}</h2></div><p>${esc(K.srcP)}</p></div>${list(SRC[m.id] || [])}<p class="gnote">${esc(SRC.common)}</p></div></section>
${cta(K.ctaH, K.ctaP, K.ctaBtn)}` });
    }

    page('opportunities/', { title: t('op.title'), description: t('op.desc'), current: 'explore',
      body: `${pi({ eb: t('op.eb'), h1: t('op.h1'), lead: esc(t('op.lead')), crumbs: [desk, [t('op.eb')]] })}<section class="sec"><div class="w"><a class="btn" href="${u('/desk/')}">${esc(t('goExplore'))} <i aria-hidden="true">→</i></a></div></section>` });
    page('opportunities/preview/', { title: `${t('opp')} | Nexus Desk`, description: t('op.profile'), current: 'explore', script: 'opportunity',
      body: `<div class="w" id="opp" data-id="">${loading}</div>${nojs}` });
    for (const o of opps) page(`opportunities/${o.id.toLowerCase()}/`, { title: `${tx(o.title)} | Nexus Desk`, description: tx(o.summary) || t('op.pageDesc', { t: tx(o.title) }), current: 'explore', script: 'opportunity',
      body: `<div class="w" id="opp" data-id="${esc(o.id)}">${loading}</div>${nojs}` });

    page('compare/', { title: t('cmp.title'), description: t('cmp.desc'), current: 'explore', script: 'compare',
      body: `${pi({ eb: t('compare'), h1: t('cmp.h1'), lead: esc(t('cmp.lead')), crumbs: [desk, [t('compare')]] })}<section class="sec"><div class="w" id="cmp">${loading}</div></section>${nojs}` });

    page('consultation/', { title: t('cs.title'), description: t('cs.desc'), current: 'consult', script: 'consult',
      body: `${pi({ eb: t('consult'), h1: t('cs.h1'), lead: esc(t('cs.lead')), crumbs: [desk, [t('consult')]] })}
<section class="sec"><div class="w">
<div class="csg"><div class="csf">
<div id="ctx"></div>
<form id="cf" novalidate aria-labelledby="cf-h" data-endpoint="${DESK_CONTACT.endpoint}">
<h2 id="cf-h" class="h3">${esc(t('cs.formH'))}</h2>
<input type="hidden" name="access_key" value="${DESK_CONTACT.formKey}">
<input type="hidden" name="subject" value="${esc(t('cs.subject'))}">
<input type="hidden" name="from_name" value="Nexus Desk">
<input type="hidden" name="page_language" value="${lang}">
<input type="hidden" name="opportunities" id="cf-ref" value="">
<input type="checkbox" name="botcheck" class="hp" tabindex="-1" autocomplete="off" aria-hidden="true">
<div class="frm">
<label class="fld"><span class="lab">${esc(t('cs.name'))} <span class="req">· ${esc(t('cs.req'))}</span></span><input type="text" name="name" autocomplete="name" required maxlength="120"></label>
<label class="fld"><span class="lab">${esc(t('cs.email'))} <span class="req">· ${esc(t('cs.req'))}</span></span><input type="email" name="email" autocomplete="email" required maxlength="160" dir="ltr"></label>
<label class="fld"><span class="lab">${esc(t('cs.phone'))}</span><input type="tel" name="phone" autocomplete="tel" maxlength="40" dir="ltr"></label>
<label class="fld"><span class="lab">${esc(t('cs.country'))}</span><input type="text" name="country" autocomplete="country-name" maxlength="80"></label>
<label class="fld"><span class="lab">${esc(t('cs.mkt'))}</span><select name="market" id="cf-mkt"><option value="Not decided">${esc(t('cs.mktAny'))}</option>${markets.map(m => `<option value="${esc(m.name)}" data-id="${esc(m.id)}">${esc(t('mkt.' + m.slug) === 'mkt.' + m.slug ? m.name : t('mkt.' + m.slug))}</option>`).join('')}</select></label>
<label class="fld"><span class="lab">${esc(t('cs.obj'))}</span><select name="objective"><option value="Long-term hold">${esc(t('cs.hold'))}</option><option value="Relocation or residence">${esc(t('cs.reloc'))}</option><option value="Diversification">${esc(t('cs.div'))}</option><option value="Other">${esc(t('cs.other'))}</option></select></label>
<label class="fld"><span class="lab">${esc(t('cs.time'))}</span><select name="timeframe"><option value="Within 3 months">${esc(t('cs.t1'))}</option><option value="3-12 months">${esc(t('cs.t2'))}</option><option value="Exploring" selected>${esc(t('cs.t3'))}</option></select></label>
<label class="fld"><span class="lab">${esc(t('cs.contact'))}</span><select name="preferred_contact"><option value="Email">${esc(t('cs.byEmail'))}</option><option value="Phone or WhatsApp">${esc(t('cs.byPhone'))}</option><option value="Video call">${esc(t('cs.byVideo'))}</option></select></label>
<label class="fld"><span class="lab">${esc(t('cs.lang'))}</span><select name="preferred_language">${Object.entries(LANGS).map(([l, x]) => `<option value="${x.name}"${l === lang ? ' selected' : ''}>${esc(x.name)}</option>`).join('')}</select></label>
<label class="fld full"><span class="lab">${esc(t('cs.q'))}</span><textarea name="message" maxlength="4000" placeholder="${esc(t('cs.qPh'))}"></textarea></label>
<label class="cns"><input type="checkbox" name="consent" value="yes" required><span>${esc(t('cs.consent'))} <span class="req">· ${esc(t('cs.req'))}</span></span></label>
</div>
<div class="cs-act"><button class="btn" type="submit"><span>${esc(t('cs.btn'))}</span> <i aria-hidden="true">→</i></button><p class="cs-st" id="cf-st" role="status" aria-live="polite"></p></div>
</form>
<p class="gnote" id="cf-p">${esc(t('cs.privacy'))}</p>
<p class="gnote" id="cf-n">${esc(t('cs.note'))}</p></div>
<aside class="csa" aria-labelledby="cs-alt"><h2 id="cs-alt" class="h3">${esc(t('cs.altH'))}</h2>
<a class="chl" href="${DESK_CONTACT.calendly}" target="_blank" rel="noopener"><b>${esc(t('cs.callT'))}</b><span>${esc(t('cs.callP'))}</span><i aria-hidden="true">↗</i></a>
<a class="chl" href="mailto:${DESK_CONTACT.email}"><b>${esc(t('cs.mailT'))}</b><span dir="ltr">${DESK_CONTACT.email}</span><small>${esc(t('cs.mailP'))}</small><i aria-hidden="true">↗</i></a>
</aside></div></div></section>` });

    page('disclosures/', { title: t('ds.title'), description: t('ds.desc'), current: '',
      body: `${pi({ eb: t('ds.eb'), h1: esc(t('ds.h1')), lead: esc(t('ds.lead')), crumbs: [desk, [t('disclosures')]] })}
<section class="sec"><div class="w"><div class="prose">${['a', 'b', 'c', 'd', 'e'].map(k => `<h2>${esc(t('ds.h2' + k))}</h2><p>${esc(t('ds.p' + k))}</p>`).join('\n')}</div></div></section>` });

    // How we evaluate (PUB-2): one plain-language page. Internal method names, contracts and statuses stay in the
    // method registry and the private reports; they are not public copy.
    const vl = (k) => (LB.verification && LB.verification[k]) || k;
    page('intelligence/', { title: t('in.title'), description: t('in.desc'), current: 'intel',
      body: `${pi({ eb: t('intel'), h1: t('in.h1'), lead: esc(t('in.lead')), crumbs: [desk, [t('intel')]] })}
<section class="sec hw" aria-labelledby="st-h"><div class="w"><div class="sh"><div><span class="lab">${esc(H.stLab)}</span><h2 id="st-h">${esc(H.stH)}</h2></div></div>
<ol class="hws">${H.steps.map(([h, p], i) => `<li class="rv"><span class="n">0${i + 1}</span><h3>${esc(h)}</h3><p>${esc(p)}</p></li>`).join('')}</ol></div></section>
<section class="sec" aria-labelledby="sp-h"><div class="w"><div class="sh"><div><span class="lab">${esc(H.splitLab)}</span><h2 id="sp-h">${esc(H.splitH)}</h2></div></div>
<div class="rb wide"><div class="rbx" data-split="public"><div class="lab">${esc(H.pubH)}</div>${list(H.pub)}</div><div class="rbx" data-split="private"><div class="lab">${esc(H.privH)}</div>${list(H.priv)}<p class="mut" style="font-size:13.5px">${esc(H.privP)}</p></div></div></div></section>
<section class="sec" aria-labelledby="lb-h"><div class="w"><div class="sh"><div><span class="lab">${esc(H.lblLab)}</span><h2 id="lb-h">${esc(H.lblH)}</h2></div></div>
<div class="tw"><table class="dom"><tbody>${Object.entries(H.lbls).map(([k, d]) => `<tr><th scope="row"><span class="vs" data-v="${esc(k)}">${esc(vl(k))}</span></th><td>${esc(d)}</td></tr>`).join('')}</tbody></table></div></div></section>
<section class="sec" aria-labelledby="src-h"><div class="w"><div class="sh"><div><span class="lab">${esc(H.srcLab)}</span><h2 id="src-h">${esc(H.srcH)}</h2></div><p>${esc(H.srcP)}</p></div>
<div class="rb wide">${markets.map(m => `<div class="rbx" data-sources="${esc(m.id)}"><div class="lab">${esc(mname(m))}</div>${list(SRC[m.id] || [])}</div>`).join('')}</div><p class="gnote">${esc(SRC.common)}</p></div></section>
${cta(H.ctaH, H.ctaP, H.ctaBtn)}` });

    out[base + '404.html'] = layout({ lang, rest: '404.html', title: t('nf.title'), description: t('nf.desc'), current: '',
      body: `${pi({ eb: t('nf.eb'), h1: t('nf.h1'), lead: esc(t('nf.lead')) })}<section class="sec"><div class="w"><a class="btn" href="${u('/desk/')}">${esc(t('goExplore'))} <i aria-hidden="true">→</i></a></div></section>` });
  }
  return out;
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  const check = process.argv.includes('--check');
  const out = pages(); let bad = 0;
  // remove generated opportunity pages that are no longer published (every language)
  for (const base of Object.keys(LANGS).map(l => l === 'en' ? '' : l + '/')) {
    const oppDir = path.join(DESK, base, 'opportunities');
    if (fs.existsSync(oppDir)) for (const d of fs.readdirSync(oppDir)) {
      const rel = `${base}opportunities/${d}/index.html`;
      if (d !== 'preview' && fs.statSync(path.join(oppDir, d)).isDirectory() && !out[rel]) { if (check) { console.error(`✗ stale page ${rel}`); bad++; } else fs.rmSync(path.join(oppDir, d), { recursive: true }); }
    }
  }
  for (const [rel, html] of Object.entries(out)) {
    const p = path.join(DESK, rel);
    if (check) { if (!fs.existsSync(p) || fs.readFileSync(p, 'utf8') !== html) { console.error(`✗ out of date: desk/${rel}`); bad++; } }
    else { fs.mkdirSync(path.dirname(p), { recursive: true }); fs.writeFileSync(p, html); }
  }
  console.log(check ? (bad ? `${bad} page(s) out of date — run node desk/_tools/build.mjs` : `✓ ${Object.keys(out).length} pages up to date`) : `built ${Object.keys(out).length} pages`);
  process.exit(bad ? 1 : 0);
}
