#!/usr/bin/env node
// sitemap.xml (SEO audit C-5, 28 Oct 2026): generated, never hand-edited. It lists exactly the pages that ask to be
// indexed — every company page in EN/TR/AR (site-i18n.mjs) and every Desk page whose robots meta is "index, follow"
// (build.mjs, rules K-4/K-4b) — each with its reciprocal language alternates and x-default. No lastmod: an inaccurate
// date is worse than none, and a build-time date would make the check non-reproducible.
//   node desk/_tools/sitemap.mjs           write sitemap.xml
//   node desk/_tools/sitemap.mjs --check   exit 1 if sitemap.xml is out of date (CI)
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { companyPages, urlPath, langPath } from './site-i18n.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const O = 'https://nexus-ways.com';
const L = ['en', 'tr', 'ar'];
const robots = (f) => ((fs.readFileSync(f, 'utf8').match(/<meta name="robots" content="([^"]+)">/) || [])[1] || '');
const indexed = (f) => /(^|,)\s*index\b/.test(robots(f)) && !/noindex/.test(robots(f));

export function sitemap(root = ROOT) {
  const groups = [];
  for (const rel of companyPages(root)) {
    const p = urlPath(rel);
    if (!indexed(path.join(root, rel))) continue;
    groups.push(L.map(l => O + langPath(p, l)).concat([O + p]));
  }
  const desk = path.join(root, 'desk');
  for (const rel of fs.readdirSync(desk, { recursive: true }).map(String).filter(f => f.endsWith('index.html') && !/^(tr|ar)\//.test(f) && !f.split(path.sep).some(x => x.startsWith('_'))).sort()) {
    const p = '/desk/' + rel.replace(/index\.html$/, '');
    const files = L.map(l => path.join(desk, l === 'en' ? '' : l, rel));
    if (!files.every(f => fs.existsSync(f) && indexed(f))) continue;
    groups.push(L.map(l => O + (l === 'en' ? p : p.replace(/^\/desk\//, `/desk/${l}/`))).concat([O + p]));
  }
  const lines = ['<?xml version="1.0" encoding="UTF-8"?>', '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">'];
  for (const g of groups) {
    const alts = L.map((l, i) => `<xhtml:link rel="alternate" hreflang="${l}" href="${g[i]}"/>`).join('') + `<xhtml:link rel="alternate" hreflang="x-default" href="${g[3]}"/>`;
    for (let i = 0; i < 3; i++) lines.push(`  <url><loc>${g[i]}</loc>${alts}</url>`);
  }
  lines.push('</urlset>');
  return lines.join('\n') + '\n';
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  const xml = sitemap(); const f = path.join(ROOT, 'sitemap.xml');
  if (process.argv.includes('--check')) { const ok = fs.existsSync(f) && fs.readFileSync(f, 'utf8') === xml; console.log(ok ? `✓ sitemap.xml up to date (${(xml.match(/<url>/g) || []).length} URLs)` : '✗ sitemap.xml out of date — run node desk/_tools/sitemap.mjs'); process.exit(ok ? 0 : 1); }
  fs.writeFileSync(f, xml); console.log(`wrote sitemap.xml (${(xml.match(/<url>/g) || []).length} URLs)`);
}
