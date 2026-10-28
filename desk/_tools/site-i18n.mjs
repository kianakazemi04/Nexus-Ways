#!/usr/bin/env node
// Company site: static Turkish and Arabic pages (SEO audit C-2, 28 Oct 2026).
//
// The English HTML of each company page is the source. Its translations already live in the page itself (NW_T, the
// dictionary the page script applies in the browser). This tool renders /tr/<page> and /ar/<page> as real static
// pages from that dictionary, so each language has its own URL, its own HTML, a self-referencing canonical and
// reciprocal hreflang links. It also keeps the English sources in step: path-based hreflang and language links, and
// the path-aware language script (an old ?lang= address is redirected to the language path).
//
//   node desk/_tools/site-i18n.mjs           write the TR/AR pages (and update the English sources in place)
//   node desk/_tools/site-i18n.mjs --check   exit 1 if any page is out of date (CI)
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const ORIGIN = 'https://nexus-ways.com';
export const LANGS = ['tr', 'ar'];
const OG = { en: 'en_US', tr: 'tr_TR', ar: 'ar_AE' };

// English company pages (everything outside desk/, tr/, ar/ and underscore folders); 404 is updated but not translated
export function companyPages(root = ROOT) {
  const out = [];
  const walk = (dir) => {
    for (const e of fs.readdirSync(path.join(root, dir), { withFileTypes: true })) {
      const rel = dir ? `${dir}/${e.name}` : e.name;
      if (e.isDirectory()) { if (!/^(desk|tr|ar|images|node_modules)$/.test(rel) && !e.name.startsWith('_') && !e.name.startsWith('.')) walk(rel); }
      else if (e.name === 'index.html') out.push(rel);
    }
  };
  walk('');
  return out.sort();
}
// URL path of a page file: 'about/index.html' → '/about/', 'index.html' → '/'
export const urlPath = (rel) => '/' + rel.replace(/index\.html$/, '');
export const langPath = (p, l) => l === 'en' ? p : `/${l}${p}`;

const escAttr = (s) => String(s).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const decode = (s) => String(s).replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>');
const plain = (html) => decode(String(html).replace(/<[^>]+>/g, '')).replace(/\s+/g, ' ').trim();

export function dictionary(html) {
  const a = html.indexOf('var NW_T='); const b = html.indexOf('var NW_L=', a);
  if (a < 0 || b < 0) throw new Error('no NW_T dictionary');
  const ctx = {}; vm.runInNewContext(html.slice(a, b) + ';this.T=NW_T;', ctx);
  return ctx.T;
}

// Replace the inner HTML of every [data-i] element with its translation (nesting-aware), and every [data-ia] attribute.
function applyDict(html, T) {
  let out = ''; let i = 0; const open = /<([a-zA-Z][a-zA-Z0-9]*)\b([^>]*?)\sdata-i="([^"]+)"([^>]*)>/g; let m;
  while ((m = open.exec(html))) {
    const tag = m[1].toLowerCase(); const key = m[3]; const startInner = m.index + m[0].length;
    // find the matching close tag of the same name
    const re = new RegExp(`<(/?)${tag}\\b[^>]*>`, 'gi'); re.lastIndex = startInner; let depth = 1; let x; let endInner = -1;
    while ((x = re.exec(html))) { if (x[0].endsWith('/>')) continue; depth += x[1] ? -1 : 1; if (depth === 0) { endInner = x.index; break; } }
    if (endInner < 0) throw new Error(`unclosed <${tag} data-i="${key}">`);
    out += html.slice(i, startInner) + (T[key] != null ? T[key] : html.slice(startInner, endInner));
    i = endInner; open.lastIndex = endInner;
  }
  out += html.slice(i);
  return out.replace(/<([a-zA-Z][a-zA-Z0-9]*)\b([^>]*)\sdata-ia="([^":]+):([^"]+)"([^>]*)>/g, (all, tag, pre, attr, key, post) => {
    if (T[key] == null) return all;
    const v = escAttr(plain(T[key]));
    const setIn = (s) => new RegExp(`\\s${attr}="[^"]*"`).test(s) ? s.replace(new RegExp(`(\\s${attr}=)"[^"]*"`), `$1"${v}"`) : null;
    const p1 = setIn(pre); if (p1 != null) return `<${tag}${p1} data-ia="${attr}:${key}"${post}>`;
    const p2 = setIn(post); if (p2 != null) return `<${tag}${pre} data-ia="${attr}:${key}"${p2}>`;
    return `<${tag}${pre} ${attr}="${v}" data-ia="${attr}:${key}"${post}>`;
  });
}

// Head for one language version: canonical, hreflang, Open Graph locale/url, and the language links in the header.
function head(html, p, l, { translatable }) {
  const url = ORIGIN + langPath(p, l);
  html = html.replace(/<link rel="canonical" href="[^"]*">/, `<link rel="canonical" href="${url}">`);
  html = html.replace(/(?:<link rel="alternate" hreflang="[^"]+" href="[^"]*">\n?)+/, translatable
    ? ['en', 'tr', 'ar'].map(x => `<link rel="alternate" hreflang="${x}" href="${ORIGIN + langPath(p, x)}">`).join('\n') + `\n<link rel="alternate" hreflang="x-default" href="${ORIGIN + p}">\n` : '');
  html = html.replace(/<meta property="og:url" content="[^"]*">/, `<meta property="og:url" content="${url}">`);
  html = html.replace(/<meta property="og:locale" content="[^"]*"><meta property="og:locale:alternate" content="[^"]*"><meta property="og:locale:alternate" content="[^"]*">/,
    `<meta property="og:locale" content="${OG[l]}">` + ['en', 'tr', 'ar'].filter(x => x !== l).map(x => `<meta property="og:locale:alternate" content="${OG[x]}">`).join(''));
  // header language switch: crawlable path links (the page script keeps the click behaviour)
  const home = p === '/404.html' ? '/' : p; // a missing page has no translation: its language links go to the home page
  html = html.replace(/<a href="[^"]*" data-l="(en|tr|ar)"/g, (all, x) => `<a href="${langPath(home, x)}" data-l="${x}"`);
  return html;
}

// Links inside a translated page stay in that language: company routes and Desk routes are prefixed.
function localiseLinks(html, l, routes) {
  return html.replace(/href="(\/[^"#?]*)([^"]*)"/g, (all, p, rest) => {
    if (p === '/desk' || p.startsWith('/desk/')) return /^\/desk\/(tr|ar)(\/|$)/.test(p) ? all : `href="${p.replace(/^\/desk\/?/, `/desk/${l}/`)}${rest}"`;
    if (routes.has(p)) return `href="${langPath(p, l)}${rest}"`;
    return all;
  });
}

// The page script: language from the path first; an explicit ?lang= or a remembered choice on an English address
// moves to the language path; the language links navigate by path. Applied to every source page (idempotent).
const OLD_L = "var NW_L=(function(){var q=(location.search.match(/[?&]lang=(en|tr|ar)/)||[])[1],s;try{s=localStorage.getItem('nw-lang')}catch(e){}var l=q||s||'en';if(!NW_T[l])l='en';try{if(q)localStorage.setItem('nw-lang',q)}catch(e){}return l})();";
const NEW_L = "var NW_L=(function(){var P=(location.pathname.match(/^\\/(tr|ar)(?=\\/|$)/)||[])[1],q=(location.search.match(/[?&]lang=(en|tr|ar)/)||[])[1],s;try{s=localStorage.getItem('nw-lang')}catch(e){}if(P){try{localStorage.setItem('nw-lang',P)}catch(e){}return P}var l=q||s||'en';if(!NW_T[l])l='en';try{if(q)localStorage.setItem('nw-lang',q)}catch(e){}if(l!='en'){var u=new URL(location.href);u.searchParams.delete('lang');location.replace('/'+l+u.pathname+u.search+u.hash)}return l})();";
const OLD_CLICK = "var u=new URL(location.href);if(a.dataset.l=='en')u.searchParams.delete('lang');else u.searchParams.set('lang',a.dataset.l);try{sessionStorage.setItem('nw',1)}catch(x){}location.href=u.toString()";
const NEW_CLICK = "var u=new URL(location.href);u.searchParams.delete('lang');var b=u.pathname.replace(/^\\/(tr|ar)(?=\\/|$)/,'')||'/';u.pathname=a.dataset.l=='en'?b:'/'+a.dataset.l+b;try{sessionStorage.setItem('nw',1)}catch(x){}location.href=u.toString()";
// Lead attribution (SEO audit: measurement): the page a form was sent from, as a path only (no query, no identifier)
const OLD_FL = "var fl=d.getElementById('f-l');if(fl)fl.value=L;";
const NEW_FL = "var fl=d.getElementById('f-l');if(fl)fl.value=L;var fp=d.getElementById('f-p');if(fp)fp.value=location.pathname;";
const FORM_P = '<input type="hidden" name="page" id="f-p" value="">';

export function sourceUpdate(html, p, translatable) {
  for (const [a, b] of [[OLD_L, NEW_L], [OLD_CLICK, NEW_CLICK], [OLD_FL, NEW_FL]]) if (!html.includes(b) && html.includes(a)) html = html.replace(a, b);
  for (const b of [NEW_L, NEW_CLICK, NEW_FL]) if (!html.includes(b)) throw new Error(`${p}: page script does not have the expected language block`);
  if (/id="f-l"/.test(html) && !html.includes(FORM_P)) html = html.replace(/(<input[^>]*id="f-l"[^>]*>)/, `$1${FORM_P}`);
  return head(html, p, 'en', { translatable });
}

// Diagram labels (inline SVG <text>/<title>) have no data-i keys; they are translated from a shared EN → TR/AR list.
// Labels not in the list (acronyms, codes, years) stay as they are.
const SVG_LABELS = JSON.parse(fs.readFileSync(new URL('./svg-labels.json', import.meta.url), 'utf8'));
export function translateSvg(html, l) {
  return html.replace(/<svg\b[\s\S]*?<\/svg>/g, svg => svg.replace(/(<(text|title|tspan)\b[^>]*>)([^<]*)(<\/\2>)/g, (m, o, _t, txt, c) => {
    const k = txt.trim(); const v = SVG_LABELS[k] && SVG_LABELS[k][l];
    return v ? o + txt.replace(k, v.replace(/&(?!amp;|lt;|gt;|quot;|#)/g, '&amp;')) + c : m;
  }));
}

export function translate(src, p, l, routes) {
  const T = dictionary(src)[l];
  let html = translateSvg(applyDict(src, T), l);
  // Arabic letters must join: no letter-spacing in diagram labels, and the Arabic face rather than the mono face
  if (l === 'ar') html = html.replace('</head>', '<style>svg text{letter-spacing:0!important;font-family:\'IBM Plex Sans Arabic\',Inter,sans-serif!important}</style>\n</head>');
  html = html.replace(/<html lang="en" dir="ltr"/, `<html lang="${l}" dir="${l === 'ar' ? 'rtl' : 'ltr'}"`);
  if (T._title) {
    html = html.replace(/<title>[^<]*<\/title>/, `<title>${escAttr(T._title)}</title>`);
    html = html.replace(/<meta property="og:title" content="[^"]*">/, `<meta property="og:title" content="${escAttr(T._title)}">`).replace(/<meta name="twitter:title" content="[^"]*">/, `<meta name="twitter:title" content="${escAttr(T._title)}">`);
  }
  if (T._desc) {
    html = html.replace(/<meta name="description" content="[^"]*">/, `<meta name="description" content="${escAttr(T._desc)}">`);
    html = html.replace(/<meta property="og:description" content="[^"]*">/, `<meta property="og:description" content="${escAttr(T._desc)}">`).replace(/<meta name="twitter:description" content="[^"]*">/, `<meta name="twitter:description" content="${escAttr(T._desc)}">`);
  }
  html = html.replace(/<meta name="keywords" content="[^"]*">\n?/, '');
  // structured data describes the English page text; the translated page carries none rather than mismatched data
  html = html.replace(/<script type="application\/ld\+json">[\s\S]*?<\/script>\n?/g, '');
  html = html.replace(/(<input[^>]*id="f-l"[^>]*value=")en(")/, `$1${l}$2`);
  html = localiseLinks(html, l, routes); // before head(): the language links must keep their own language
  return head(html, p, l, { translatable: true });
}

export function generate(root = ROOT) {
  const pages = companyPages(root);
  const routes = new Set(pages.map(urlPath));
  const out = {};
  for (const rel of [...pages, '404.html']) {
    const src = fs.readFileSync(path.join(root, rel), 'utf8');
    const p = rel === '404.html' ? '/404.html' : urlPath(rel);
    const en = sourceUpdate(src, p, rel !== '404.html');
    out[rel] = en;
    if (rel === '404.html') continue;
    for (const l of LANGS) out[`${l}/${rel}`] = translate(en, p, l, routes);
  }
  return out;
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  const check = process.argv.includes('--check'); const out = generate(); let bad = 0;
  for (const [rel, html] of Object.entries(out)) {
    const f = path.join(ROOT, rel);
    if (check) { if (!fs.existsSync(f) || fs.readFileSync(f, 'utf8') !== html) { console.error(`✗ out of date: ${rel}`); bad++; } }
    else { fs.mkdirSync(path.dirname(f), { recursive: true }); fs.writeFileSync(f, html); }
  }
  console.log(check ? (bad ? `${bad} company page(s) out of date — run node desk/_tools/site-i18n.mjs` : `✓ ${Object.keys(out).length} company pages up to date`) : `wrote ${Object.keys(out).length} company pages`);
  process.exit(bad ? 1 : 0);
}
