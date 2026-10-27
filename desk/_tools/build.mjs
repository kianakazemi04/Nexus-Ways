#!/usr/bin/env node
// Builds every Nexus Desk page from one layout and the public data. New opportunities need data only, never page code.
//   node desk/_tools/build.mjs           write pages
//   node desk/_tools/build.mjs --check   exit 1 if any generated page is missing or out of date (CI)
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { INTEL } from './content.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const DESK = path.resolve(HERE, '..');
const read = (p) => JSON.parse(fs.readFileSync(path.join(DESK, p), 'utf8'));
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const ASSET_V = '1';

// UI chrome strings per language. Only English is published in Stage 1 (D-08); tr/ar are added here and built under /desk/tr/ and /desk/ar/.
const STR = { en: { explore: 'Explore', markets: 'Markets', intel: 'Intelligence', consult: 'Consultation', parent: 'Nexus Ways', by: 'By Nexus Ways', theme: 'Switch light or dark mode', menu: 'Menu', disclosures: 'Disclosures', notAdvice: 'Nexus Desk provides research and analysis to support investment decisions. It is not investment advice. Nexus Ways does not manage capital or operate a fund.' } };
const LANGS = { en: { dir: 'ltr', prefix: '' } };

const LOGO = `<svg width="0" height="0" style="position:absolute" aria-hidden="true"><symbol id="lg" viewBox="430 350 1075 1180"><path d="M438 583 1394 1272H1188L634 868 638 1339 762 1251 965 1254 590 1521 438 1417Z"/><path transform="rotate(180 966 942)" d="M438 583 1394 1272H1188L634 868 638 1339 762 1251 965 1254 590 1521 438 1417Z"/></symbol></svg>`;

function layout({ lang = 'en', title, description, current, body, script, bodyAttr = '' }) {
  const t = STR[lang]; const L = LANGS[lang];
  const nav = (href, key, label) => `<a class="nl" href="${href}"${current === key ? ' aria-current="page"' : ''}>${esc(label)}</a>`;
  return `<!DOCTYPE html>
<html lang="${lang}" dir="${L.dir}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<title>${esc(title)}</title>
<meta name="description" content="${esc(description)}">
<meta name="robots" content="noindex, follow">
<meta name="color-scheme" content="dark light">
<meta name="theme-color" content="#09090a">
<meta name="referrer" content="strict-origin-when-cross-origin">
<link rel="icon" href="/favicon.ico" sizes="48x48">
<link rel="icon" type="image/svg+xml" href="/favicon.svg">
<link rel="icon" type="image/png" sizes="32x32" href="/favicon-32x32.png">
<link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;800&family=Inter+Tight:wght@400;500;600&family=JetBrains+Mono:wght@400;500;600&display=swap" rel="stylesheet">
<link rel="stylesheet" href="/desk/assets/css/desk.css?v=${ASSET_V}">
</head>
<body${bodyAttr}>
${LOGO}
<a class="sr" href="#main">Skip to content</a>
<div class="rail" aria-label="Desk status"><div class="w"><span><span class="dot"></span><b>Nexus Desk</b> · MVP</span><span>Prices, scores and forecasts <b>not published</b></span></div></div>
<header class="hd"><div class="w nb">
<a class="br" href="${L.prefix}/desk/" aria-label="Nexus Desk home"><svg aria-hidden="true"><use href="#lg"/></svg><span class="wm"><span class="bn" translate="no">NEXUS <i>DESK</i></span><span class="by" translate="no">${esc(t.by)}</span></span></a>
<nav class="nv" id="nv" aria-label="Desk">
${nav(`${L.prefix}/desk/`, 'explore', t.explore)}${nav(`${L.prefix}/desk/markets/`, 'markets', t.markets)}${nav(`${L.prefix}/desk/intelligence/`, 'intel', t.intel)}
<span class="sep" aria-hidden="true"></span><a class="ext" href="/" translate="no">${esc(t.parent)} ↗</a>
<a class="btn sm" href="${L.prefix}/desk/consultation/"${current === 'consult' ? ' aria-current="page"' : ''}><span>${esc(t.consult)}</span> <i aria-hidden="true">→</i></a>
</nav>
<button class="thm" type="button" aria-label="${esc(t.theme)}" aria-pressed="false"><svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="4"/><path d="M12 2.5v2M12 19.5v2M2.5 12h2M19.5 12h2M5.3 5.3l1.4 1.4M17.3 17.3l1.4 1.4M5.3 18.7l1.4-1.4M17.3 6.7l1.4-1.4"/></svg></button>
<button class="bg" type="button" aria-label="${esc(t.menu)}" aria-expanded="false" aria-controls="nv"><span></span><span></span></button>
</div></header>
<main id="main">
${body}
</main>
<footer class="ftr"><div class="w"><div class="g">
<div><a class="br" href="${L.prefix}/desk/" aria-label="Nexus Desk home"><svg aria-hidden="true"><use href="#lg"/></svg><span class="wm"><span class="bn" translate="no">NEXUS <i>DESK</i></span><span class="by" translate="no">${esc(t.by)}</span></span></a><p>${esc(t.notAdvice)}</p></div>
<div><h4>Desk</h4><nav aria-label="Desk footer"><a href="${L.prefix}/desk/">${esc(t.explore)}</a><a href="${L.prefix}/desk/markets/">${esc(t.markets)}</a><a href="${L.prefix}/desk/intelligence/">${esc(t.intel)}</a><a href="${L.prefix}/desk/consultation/">${esc(t.consult)}</a><a href="${L.prefix}/desk/disclosures/">${esc(t.disclosures)}</a></nav></div>
<div><h4>Nexus Ways</h4><nav aria-label="Nexus Ways"><a href="/" translate="no">nexus-ways.com</a><a href="/solutions/investment-arm/">Investment Arm</a><a href="/about/">About</a><a href="/contact/">Contact</a></nav></div>
</div><div class="cp"><span>© <span id="yr">2026</span> Nexus Ways Group · Nexus Desk</span><span>No public prices · no scores · no forecasts</span></div></div></footer>
${script ? `<script type="module" src="/desk/assets/js/${script}.js?v=${ASSET_V}"></script>` : `<script type="module" src="/desk/assets/js/core.js?v=${ASSET_V}"></script>`}
<noscript><style>.rv{opacity:1;transform:none}</style></noscript>
</body>
</html>
`;
}

const pi = ({ eb, h1, lead, crumbs = [] }) => `<section class="pi"><div class="w">${crumbs.length ? `<div class="crumb">${crumbs.map((c, i) => i === 0 ? `<a href="${c[1]}">${esc(c[0])}</a>` : c[1] ? `<span><a href="${c[1]}">${esc(c[0])}</a></span>` : `<span>${esc(c[0])}</span>`).join('')}</div>` : ''}<div class="eb">${esc(eb)}</div><h1 style="margin-top:20px">${h1}</h1>${lead ? `<p class="lead">${lead}</p>` : ''}</div></section>`;
const nojs = `<noscript><div class="w"><div class="notice"><b>JavaScript is required to load Desk data.</b><p>All content is static and local; nothing is tracked or stored.</p></div></div></noscript>`;

export function pages() {
  const markets = read('data/public/markets.json').records.filter(m => !m.id.startsWith('FIX-'));
  const published = read('data/public/published.json');
  const opps = read('data/public/opportunities.json').records.filter(o => published.opportunities.includes(o.id));
  const out = {};

  out['index.html'] = layout({ title: 'Nexus Desk — Explore | Nexus Ways', description: 'Nexus Desk: investment intelligence and opportunity assessment by Nexus Ways. Discover, evaluate and compare opportunities with their evidence, risks and data gaps.', current: 'explore', script: 'explore',
    body: `${pi({ eb: 'Investment Intelligence & Opportunity Assessment', h1: 'Discover. Evaluate. Compare. <em>Decide.</em>', lead: 'A selective set of researched opportunities, each shown with its evidence, documented risks and data gaps. No public prices, scores or forecasts: the analysis stays honest about what is known.' })}
<section class="sec"><div class="w"><div class="sh"><div><span class="lab">Categories</span><h2>Where Desk operates</h2></div></div><div class="cats" id="cats"></div></div></section>
<section class="sec" aria-labelledby="ex-t"><div class="w"><div class="sh"><div><span class="lab">Opportunities</span><h2 id="ex-t">Explore</h2></div></div>
<div class="ex"><form class="flt" id="flt" role="search" aria-label="Filter opportunities" onsubmit="return false">
<label><span class="lab">Search</span><input type="search" id="f-q" placeholder="Project, district, market" autocomplete="off"></label>
<label><span class="lab">Market</span><select id="f-market"></select></label>
<label><span class="lab">District</span><select id="f-district"></select></label>
<label><span class="lab">Asset type</span><select id="f-type"></select></label>
<label><span class="lab">Delivery status</span><select id="f-delivery"></select></label>
<label><span class="lab">Evidence status</span><select id="f-evidence"></select></label>
<label><span class="lab">Sort</span><select id="f-sort"><option value="verified">Last verified</option><option value="delivery">Expected delivery</option></select></label>
<div class="ft"><span class="lab">No price filters</span><button type="button" class="lnk" id="clr">Clear</button></div></form>
<div><div class="res"><span class="lab" id="count" aria-live="polite"></span></div><div class="cards" id="cards"><p class="loading">Loading…</p></div></div></div></div></section>
${nojs}
<div class="tray" id="tray" aria-live="polite"><div class="w"><span class="lab">Compare</span><div class="its"></div><button type="button" class="lnk">Clear</button><a class="btn sm" href="/desk/compare/" aria-disabled="true"><span>Compare 0</span> <i aria-hidden="true">→</i></a><p class="msg" role="status"></p></div></div>` });

  out['markets/index.html'] = layout({ title: 'Markets | Nexus Desk', description: 'Nexus Desk markets and their research and publication status.', current: 'markets',
    body: `${pi({ eb: 'Markets', h1: 'Markets and their <em>gates.</em>', lead: 'Each market opens separately, only after its own evidence gate passes. Until then it is shown with its status and no market claims.', crumbs: [['Desk', '/desk/'], ['Markets']] })}
<section class="sec"><div class="w"><div class="mkts">${markets.map(m => `<article class="mk ${m.activation === 'ACTIVE' ? '' : 'off'} rv"><span class="chip ${m.activation === 'ACTIVE' ? 'on' : m.record_status === 'RESEARCH_IN_PROGRESS' ? '' : 'dim'}">${m.activation === 'ACTIVE' ? 'Active' : m.record_status === 'RESEARCH_IN_PROGRESS' ? 'Research in progress' : 'Inactive · gated'}</span><h3><a href="/desk/markets/${m.slug}/">${esc(m.name)}</a></h3><p>${esc(m.summary ? m.summary.en : '')}</p><span class="go">View status →</span></article>`).join('')}</div>
<p class="gnote" style="margin-top:18px">Category in all markets: residential real estate. Startups &amp; Private Companies and Franchise are future categories and not yet operational.</p></div></section>` });

  for (const m of markets) out[`markets/${m.slug}/index.html`] = layout({ title: `${m.name} | Nexus Desk`, description: `${m.name}: Nexus Desk market status, verified context and published opportunities.`, current: 'markets', script: 'market',
    body: `${pi({ eb: `Market · ${m.activation === 'ACTIVE' ? 'Active' : m.record_status === 'RESEARCH_IN_PROGRESS' ? 'Research in progress' : 'Inactive'}`, h1: esc(m.name), lead: esc(m.summary ? m.summary.en : ''), crumbs: [['Desk', '/desk/'], ['Markets', '/desk/markets/'], [m.name]] })}
<div class="w" id="mkt" data-market="${esc(m.slug)}"><p class="loading">Loading…</p></div>${nojs}` });

  out['opportunities/index.html'] = layout({ title: 'Opportunities | Nexus Desk', description: 'Published Nexus Desk opportunities are listed in Explore.', current: 'explore',
    body: `${pi({ eb: 'Opportunities', h1: 'Opportunities are listed in <em>Explore.</em>', lead: 'Each published opportunity has its own profile with gallery, evidence, risks and data gaps.', crumbs: [['Desk', '/desk/'], ['Opportunities']] })}<section class="sec"><div class="w"><a class="btn" href="/desk/">Go to Explore <i aria-hidden="true">→</i></a></div></section>` });
  out['opportunities/preview/index.html'] = layout({ title: 'Opportunity | Nexus Desk', description: 'Opportunity profile.', current: 'explore', script: 'opportunity',
    body: `<div class="w" id="opp" data-id=""><p class="loading">Loading…</p></div>${nojs}` });
  for (const o of opps) out[`opportunities/${o.id.toLowerCase()}/index.html`] = layout({ title: `${o.title.en} | Nexus Desk`, description: (o.summary && o.summary.en) || `${o.title.en}: evidence, risks and data gaps.`, current: 'explore', script: 'opportunity',
    body: `<div class="w" id="opp" data-id="${esc(o.id)}"><p class="loading">Loading…</p></div>${nojs}` });

  out['compare/index.html'] = layout({ title: 'Compare | Nexus Desk', description: 'Compare up to three published opportunities side by side.', current: 'explore', script: 'compare',
    body: `${pi({ eb: 'Compare', h1: 'Side by side, <em>on the evidence.</em>', lead: 'Up to three opportunities in the same category. The selection lives in the page address only; nothing is saved.', crumbs: [['Desk', '/desk/'], ['Compare']] })}<section class="sec"><div class="w" id="cmp"><p class="loading">Loading…</p></div></section>${nojs}` });

  out['consultation/index.html'] = layout({ title: 'Consultation | Nexus Desk', description: 'Request a consultation about a Nexus Desk opportunity.', current: 'consult', script: 'consult',
    body: `${pi({ eb: 'Consultation', h1: 'Discuss an opportunity <em>with us.</em>', lead: 'Consultation is where current unit pricing, availability and your objectives are discussed. Where useful, a visit to the sales office can follow, with any commercial relationship disclosed.', crumbs: [['Desk', '/desk/'], ['Consultation']] })}
<section class="sec"><div class="w" style="display:grid;gap:22px;max-width:900px">
<div class="notice" role="status"><b>Consultation requests are not yet open.</b><p>This form is not connected and sends nothing. No personal data is collected on this page. Requests will open once the privacy notice and the Desk request channel are confirmed.</p></div>
<div id="ctx"></div>
<form id="cf" novalidate aria-describedby="cf-n"><fieldset disabled><legend class="sr">Consultation request (not yet open)</legend><div class="frm">
<label class="fld"><span class="lab">Full name</span><input type="text" autocomplete="off"></label>
<label class="fld"><span class="lab">Email</span><input type="email" autocomplete="off"></label>
<label class="fld"><span class="lab">Market of interest</span><select><option>Istanbul</option></select></label>
<label class="fld"><span class="lab">Objective</span><select><option>Long-term hold</option><option>Relocation</option><option>Diversification</option></select></label>
<label class="fld full"><span class="lab">Questions</span><textarea></textarea></label>
</div><div style="margin-top:18px"><button class="btn" type="submit" aria-disabled="true">Requests not yet open <i aria-hidden="true">→</i></button></div></fieldset></form>
<p class="gnote" id="cf-n">Nexus Desk never asks for payment details. Price information is shared in consultation, not published.</p></div></section>` });

  out['disclosures/index.html'] = layout({ title: 'Disclosures | Nexus Desk', description: 'Commercial relationships, conflicts and legal notice for Nexus Desk.', current: '',
    body: `${pi({ eb: 'Disclosures · pending legal review', h1: 'Disclosures', lead: 'This page states how Nexus Desk relates to the opportunities it shows. The wording is a draft pending legal review and will be finalised before any opportunity is published.', crumbs: [['Desk', '/desk/'], ['Disclosures']] })}
<section class="sec"><div class="w"><div class="prose">
<h2>Nature of the service</h2><p>Nexus Desk provides research and analysis to support investment decisions. It is not investment, legal or tax advice, and it does not recommend any purchase. Nexus Ways does not manage capital or operate a fund.</p>
<h2>Commercial relationships</h2><p>Nexus Ways may have commercial relationships with developers or sales offices, including commission arrangements when a purchase completes. Where such a relationship exists for an opportunity, it is disclosed on that opportunity's profile. Commercial relationships do not change the evidence, risks or data gaps shown.</p>
<h2>Prices and forecasts</h2><p>Project prices, price ranges, scores, rankings, fair values, yields and forecasts are not published.</p>
<h2>Images</h2><p>Project images are published only with the owner's written permission, with their type stated (photograph, rendering, plan) and any required attribution.</p>
<h2>Data and privacy</h2><p>Desk pages use no accounts, cookies or browser storage. Consultation requests are not yet open; their privacy notice will be published before they are.</p>
</div></div></section>` });

  out['intelligence/index.html'] = layout({ title: 'Intelligence | Nexus Desk', description: 'How Nexus Desk evaluates opportunities: evidence, sources, pricing, risk, liquidity and data gaps.', current: 'intel',
    body: `${pi({ eb: 'Intelligence', h1: 'The method, <em>in the open.</em>', lead: 'How Desk evaluates opportunities, what counts as evidence, and what it deliberately does not calculate.', crumbs: [['Desk', '/desk/'], ['Intelligence']] })}
<section class="sec"><div class="w"><div class="ilinks">${INTEL.map(p => `<article class="il rv"><span class="lab">Method</span><h3><a href="/desk/intelligence/${p.slug}/">${esc(p.title)}</a></h3><p>${esc(p.short)}</p></article>`).join('')}</div></div></section>` });
  for (const p of INTEL) out[`intelligence/${p.slug}/index.html`] = layout({ title: `${p.title} | Nexus Desk`, description: p.short, current: 'intel',
    body: `${pi({ eb: 'Intelligence', h1: esc(p.title), lead: esc(p.short), crumbs: [['Desk', '/desk/'], ['Intelligence', '/desk/intelligence/'], [p.title]] })}
<section class="sec"><div class="w"><nav class="side-nav" aria-label="Methodology pages">${INTEL.map(q => `<a href="/desk/intelligence/${q.slug}/"${q.slug === p.slug ? ' aria-current="page"' : ''}>${esc(q.title)}</a>`).join('')}</nav><div class="prose">${p.body}</div></div></section>` });

  out['404.html'] = layout({ title: 'Not found | Nexus Desk', description: 'Page not found.', current: '',
    body: `${pi({ eb: 'Not found', h1: 'This page is <em>not available.</em>', lead: 'It may not exist, or the opportunity may not be published.' })}<section class="sec"><div class="w"><a class="btn" href="/desk/">Go to Explore <i aria-hidden="true">→</i></a></div></section>` });
  return out;
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  const check = process.argv.includes('--check');
  const out = pages(); let bad = 0;
  // remove generated opportunity pages that are no longer published
  const oppDir = path.join(DESK, 'opportunities');
  if (fs.existsSync(oppDir)) for (const d of fs.readdirSync(oppDir)) {
    const rel = `opportunities/${d}/index.html`;
    if (d !== 'preview' && fs.statSync(path.join(oppDir, d)).isDirectory() && !out[rel]) { if (check) { console.error(`✗ stale page ${rel}`); bad++; } else fs.rmSync(path.join(oppDir, d), { recursive: true }); }
  }
  for (const [rel, html] of Object.entries(out)) {
    const p = path.join(DESK, rel);
    if (check) { if (!fs.existsSync(p) || fs.readFileSync(p, 'utf8') !== html) { console.error(`✗ out of date: desk/${rel}`); bad++; } }
    else { fs.mkdirSync(path.dirname(p), { recursive: true }); fs.writeFileSync(p, html); }
  }
  console.log(check ? (bad ? `${bad} page(s) out of date — run node desk/_tools/build.mjs` : `✓ ${Object.keys(out).length} pages up to date`) : `built ${Object.keys(out).length} pages`);
  process.exit(bad ? 1 : 0);
}
