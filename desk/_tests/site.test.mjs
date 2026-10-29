// Company site and sitewide SEO (pre-SEO audit, 28 Oct 2026) — run with:  node --test desk/_tests/site.test.mjs
// Static TR/AR company pages, canonical and hreflang, sitemap = indexable pages, structured data, internal links and
// claim guards. Reads the committed tree; generators are checked for being up to date.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { ROOT } from './helpers.mjs';
import { companyPages, urlPath, langPath, dictionary } from '../_tools/site-i18n.mjs';

const O = 'https://nexus-ways.com';
const read = (rel) => fs.readFileSync(path.join(ROOT, rel), 'utf8');
const L = ['en', 'tr', 'ar'];
const fileOf = (u) => { const p = u.replace(O, '').split('#')[0].split('?')[0]; const rel = p.replace(/^\//, ''); return [rel, rel + 'index.html', rel + '/index.html'].find(c => c && fs.existsSync(path.join(ROOT, c)) && fs.statSync(path.join(ROOT, c)).isFile()); };
const robots = (h) => (h.match(/<meta name="robots" content="([^"]+)">/) || [])[1] || '';
const PAGES = companyPages(ROOT);

test('generators are up to date: TR/AR company pages, Desk pages and sitemap', () => {
  for (const tool of ['site-i18n.mjs', 'build.mjs', 'sitemap.mjs']) execFileSync('node', [path.join(ROOT, 'desk/_tools', tool), '--check'], { stdio: 'pipe' });
});

test('every company page exists in EN/TR/AR as its own static page: language, self-canonical, reciprocal hreflang, x-default', () => {
  assert.ok(PAGES.length >= 15, `${PAGES.length} company pages`);
  for (const rel of PAGES) {
    const p = urlPath(rel); const en = read(rel); const T = dictionary(en);
    for (const l of L) {
      const f = l === 'en' ? rel : `${l}/${rel}`; const h = read(f);
      assert.match(h, new RegExp(`<html lang="${l}" dir="${l === 'ar' ? 'rtl' : 'ltr'}"`), `${f} lang/dir`);
      assert.ok(h.includes(`<link rel="canonical" href="${O + langPath(p, l)}">`), `${f} self-canonical`);
      for (const x of L) assert.ok(h.includes(`<link rel="alternate" hreflang="${x}" href="${O + langPath(p, x)}">`), `${f} hreflang ${x}`);
      assert.ok(h.includes(`<link rel="alternate" hreflang="x-default" href="${O + p}">`), `${f} x-default`);
      assert.doesNotMatch(h, /href="[^"]*\?lang=/, `${f}: no ?lang= links remain`);
      if (l !== 'en') {
        assert.ok(h.includes(`<title>${T[l]._title.replace(/&/g, '&amp;')}</title>`), `${f}: translated title`);
        assert.doesNotMatch(h, /application\/ld\+json/, `${f}: no English structured data on a translated page`);
        // the visible text is the translation, not the English source
        const sample = [...en.matchAll(/data-i="([^"]+)">([^<]{12,})</g)].slice(0, 20);
        for (const [, k, txt] of sample) if (T[l][k] && T[l][k] !== txt) assert.ok(!h.includes(`data-i="${k}">${txt}<`), `${f}: ${k} still in English`);
      }
    }
  }
});

test('internal links and assets resolve on every company page in every language', () => {
  const broken = [];
  for (const rel of PAGES) for (const l of L) {
    const f = l === 'en' ? rel : `${l}/${rel}`;
    for (const [, u] of read(f).matchAll(/(?:href|src)="(\/[^"]*)"/g)) if (!u.startsWith('//') && !fileOf(u)) broken.push(`${f} → ${u}`);
  }
  assert.deepEqual(broken, []);
});

test('the sitemap lists exactly the indexable pages, each with its language alternates; nothing noindex or missing', () => {
  const xml = read('sitemap.xml');
  const locs = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map(m => m[1]);
  assert.equal(new Set(locs).size, locs.length, 'no duplicates');
  for (const u of locs) { const f = fileOf(u); assert.ok(f, `${u} exists`); assert.doesNotMatch(robots(read(f)), /noindex/, `${u} is indexable`); }
  // every indexable HTML page in the repository is listed
  const all = fs.readdirSync(ROOT, { recursive: true }).map(String).filter(f => f.endsWith('index.html') && !f.split(path.sep).some(x => x.startsWith('_') || x.startsWith('.') || x === 'node_modules'));
  const indexable = all.filter(f => { const r = robots(read(f)); return r && !/noindex/.test(r); }).map(f => O + '/' + f.replace(/index\.html$/, ''));
  assert.deepEqual([...indexable].sort(), [...locs].sort());
  assert.ok(locs.includes(`${O}/desk/markets/`) && locs.includes(`${O}/desk/ar/intelligence/`), 'evergreen Desk pages (K-4b)');
  assert.ok(!locs.includes(`${O}/desk/`) && !locs.includes(`${O}/desk/consultation/`), 'Explore and forms stay out until K-4 applies');
  assert.doesNotMatch(xml, /<lastmod>/, 'no lastmod (no inaccurate dates)');
  assert.match(read('robots.txt'), /^Sitemap: https:\/\/nexus-ways\.com\/sitemap\.xml$/m);
});

test('structured data is valid JSON and makes no rating, review, price or performance claim', () => {
  for (const rel of PAGES) {
    for (const [, js] of read(rel).matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)) {
      const j = JSON.parse(js); const s = JSON.stringify(j);
      assert.doesNotMatch(s, /"(aggregateRating|review|ratingValue|price|priceRange|lowPrice|highPrice)"/, rel);
    }
  }
});

test('claim guard: no promise of returns or guru language on company or Desk pages; home page Desk section matches D1/PUB-2', () => {
  const vis = (h) => h.replace(/<script[\s\S]*?<\/script>/g, '').replace(/<[^>]+>/g, ' ');
  const files = PAGES.flatMap(rel => L.map(l => l === 'en' ? rel : `${l}/${rel}`)).concat(fs.readdirSync(path.join(ROOT, 'desk'), { recursive: true }).map(String).filter(f => f.endsWith('.html') && !f.split(path.sep).some(x => x.startsWith('_'))).map(f => `desk/${f}`));
  for (const f of files) assert.doesNotMatch(vis(read(f)), /\b(risk[- ]free|10x|double your (money|investment)|guaranteed (profit|yield|income)s?)\b/i, f);
  const home = read('index.html');
  assert.doesNotMatch(home, /Inactive · gated|research in progress|to follow once their research/i, 'home Desk section uses the current market wording');
  for (const l of ['tr', 'ar']) assert.doesNotMatch(read(`${l}/index.html`), /Pasif · kapılı|araştırma sürüyor|غير نشط · مقيَّد|البحث جارٍ/, `${l} home Desk section`);
});

test('forms record the page they were sent from (path only), on company and Desk pages', () => {
  for (const rel of PAGES.filter(r => /id="f-l"/.test(read(r)))) for (const l of L) {
    const h = read(l === 'en' ? rel : `${l}/${rel}`);
    assert.match(h, /<input type="hidden" name="page" id="f-p" value="">/, `${l}:${rel}`);
    assert.match(h, /getElementById\('f-p'\);if\(fp\)fp\.value=location\.pathname;/, `${l}:${rel} script`);
  }
  for (const l of ['', 'tr/', 'ar/']) assert.match(read(`desk/${l}consultation/index.html`), /<input type="hidden" name="page" id="cf-page" value="">/);
  assert.match(read('desk/assets/js/consult.js'), /r\.origin === location\.origin\) from = r\.pathname/, 'same-site path only');
});

test('Desk pages: canonical, x-default and Open Graph; noindex only where K-4/K-4b require it', () => {
  for (const f of fs.readdirSync(path.join(ROOT, 'desk'), { recursive: true }).map(String).filter(f => f.endsWith('index.html') && !f.split(path.sep).some(x => x.startsWith('_')))) {
    const h = read(`desk/${f}`); const url = `${O}/desk/${f.replace(/index\.html$/, '')}`;
    assert.ok(h.includes(`<link rel="canonical" href="${url}">`), `${f} canonical`);
    assert.match(h, /hreflang="x-default"/, f); assert.match(h, /<meta property="og:title" content="[^"]{5,}">/, f); assert.match(h, /<meta property="og:url" content="https:\/\/nexus-ways\.com\/desk\//, f);
    const evergreen = /^(?:(?:tr|ar)\/)?(?:markets|intelligence)\//.test(f.replace(/\\/g, '/'));
    if (evergreen) assert.doesNotMatch(robots(h), /noindex/, `${f} indexable (K-4b)`);
    else if (!JSON.parse(read('desk/data/public/published.json')).opportunities.length) assert.match(robots(h), /noindex/, `${f} noindex until the first publication (K-4)`);
  }
});

test('diagram labels are translated on TR/AR pages; the label list has no stale entries; Arabic labels keep joined letters', () => {
  const labels = JSON.parse(read('desk/_tools/svg-labels.json')); delete labels._note;
  const en = PAGES.map(read).join('\n');
  for (const k of Object.keys(labels)) assert.ok(en.includes(`>${k}<`), `label "${k}" is used on an English page`);
  const tr = read('tr/solutions/investment-arm/index.html'), ar = read('ar/solutions/investment-arm/index.html');
  assert.ok(tr.includes('>FIRSAT HATTI<') && !tr.includes('>DEAL PIPELINE<'), 'TR diagram translated');
  assert.ok(ar.includes('>مسار الصفقات<') && !ar.includes('>DEAL PIPELINE<'), 'AR diagram translated');
  for (const rel of PAGES) assert.match(read(`ar/${rel}`), /svg text\{letter-spacing:0!important;font-family:'IBM Plex Sans Arabic'/, `ar/${rel}`);
  assert.match(read('index.html'), /\.ic\{direction:ltr;unicode-bidi:isolate\}/, 'home diagrams keep their left-to-right geometry under RTL');
});

test('legal: Privacy Notice (KVKK) and Terms of Use exist in EN/TR/AR; every company and Desk page links them with the footer disclaimer', () => {
  for (const [p, must] of [['privacy/', /KVKK/], ['terms/', /Türkiye|Turkish|Türkiye Cumhuriyeti/]]) for (const l of L) {
    const h = read(`${l === 'en' ? '' : l + '/'}${p}index.html`);
    assert.match(h, must, `${l} ${p}`); assert.match(h, /info@nexus-ways\.com/, `${l} ${p} contact`);
    assert.doesNotMatch(h, /<form /, `${l} ${p}: no form on a legal page`);
  }
  assert.match(read('privacy/index.html'), /Article 11 of KVKK/); assert.match(read('tr/privacy/index.html'), /KVKK'nın 11\. maddesi/);
  for (const rel of PAGES) for (const l of L) {
    const h = read(l === 'en' ? rel : `${l}/${rel}`); const pre = l === 'en' ? '' : `/${l}`;
    assert.ok(h.includes(`href="${pre}/privacy/"`) && h.includes(`href="${pre}/terms/"`), `${l}:${rel} footer links`);
    assert.match(h, /data-i="ft\.dis"/, `${l}:${rel} footer disclaimer`);
  }
  for (const l of ['', 'tr/', 'ar/']) { const h = read(`desk/${l}markets/index.html`); const pre = l ? '/' + l.slice(0, 2) : ''; assert.ok(h.includes(`href="${pre}/privacy/"`) && h.includes(`href="${pre}/terms/"`), `desk ${l}`); }
});

test('market overview: official figures with publisher, date and link; counts and percentages only; buying rules with an official source', async () => {
  const { OVERVIEW, RULES } = await import('../_tools/markets-content.mjs');
  const OFFICIAL = /^https:\/\/(veriportali\.tuik\.gov\.tr|www\.tcmb\.gov\.tr|dubailand\.gov\.ae|www\.mediaoffice\.abudhabi|u\.ae|www\.yourkeyturkiye\.gov\.tr)\//;
  for (const [mk, rows] of Object.entries(OVERVIEW)) {
    assert.ok(rows.length >= 3, mk);
    for (const x of rows) {
      assert.match(x.url, OFFICIAL, `${x.id}: official source`); assert.ok(x.release === null || /^\d{4}-\d{2}-\d{2}$/.test(x.release), x.id);
      assert.ok(['n', 'pct'].includes(x.kind) && typeof x.value === 'number', x.id);
      for (const l of L) for (const f of ['label', 'period', 'note']) assert.ok(x[f][l], `${x.id} ${f} ${l}`);
      for (const l of L) assert.doesNotMatch(x.note[l], /\b(AED|USD|TRY|TL|EUR)\b|[$€£₺]|درهم/, `${x.id}: no currency amounts in the overview (D10)`);
    }
    assert.match(RULES[mk].url, OFFICIAL, `${mk} rules source`);
  }
  for (const [slug, l] of [['istanbul', ''], ['dubai', 'tr/'], ['abu-dhabi', 'ar/']]) {
    const h = read(`desk/${l}markets/${slug}/index.html`);
    assert.match(h, /data-market-overview="/, slug); assert.match(h, /data-market-rules="/, slug);
    assert.match(h, /rel="noopener external" target="_blank"/, slug);
  }
  for (const f of ['desk/markets/istanbul/index.html', 'desk/tr/markets/istanbul/index.html', 'desk/ar/markets/istanbul/index.html']) assert.doesNotMatch(read(f), /licences and permits that apply to our own|kendi faaliyetimiz için gereken lisans|التراخيص والتصاريح التي تنطبق على نشاطنا/, f);
});

test('Cloudflare build: wrangler deploys only the clean public copy, after validation, with the security headers', () => {
  const cfg = JSON.parse(read('wrangler.jsonc').replace(/^\s*\/\/.*$/gm, ''));
  assert.equal(cfg.assets.directory, './_cfsite'); assert.equal(cfg.build.command, 'node desk/_tools/cf-build.mjs');
  assert.equal(cfg.assets.not_found_handling, '404-page');
  const pkg = JSON.parse(read('package.json')); assert.match(pkg.devDependencies.wrangler, /^\d+\.\d+\.\d+$/, 'wrangler pinned to an exact version');
  const b = read('desk/_tools/cf-build.mjs');
  for (const s of ["'desk/_tools/validate.mjs'", "seg.startsWith('_') || seg.startsWith('.')", "desk/_tools/cloudflare/_headers", 'pages_check.py', 'process.exit(1)']) assert.ok(b.includes(s), s);
  assert.match(read('.gitignore'), /^_cfsite\/$/m);
  assert.ok(!fs.existsSync(path.join(ROOT, '.github/workflows/cloudflare-deploy.yml')), 'one deployment path to Cloudflare (Workers Builds)');
});
