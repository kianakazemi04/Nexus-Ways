#!/usr/bin/env node
// Cloudflare Workers build (wrangler.jsonc → build.command). Runs on every push to main in Cloudflare Workers Builds:
//   1. the same validation as CI: validator, generators up to date (Desk pages, TR/AR company pages, sitemap);
//   2. a clean copy of the public site in _cfsite/, with the same exclusions as GitHub Pages (Jekyll): any path segment
//      starting with "_" or "." is never published (desk/_tools, desk/_tests, desk/_fixtures, desk/_schema, .github …),
//      nor repository files (package.json, wrangler.jsonc, CNAME);
//   3. the security headers file (desk/_tools/cloudflare/_headers) at the root of the copy;
//   4. the page check on the exact tree to be deployed, plus a check that no internal path slipped through.
// Any failure exits non-zero: wrangler then deploys nothing and the live site stays as it was.
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const OUT = path.join(ROOT, '_cfsite');
const REPO_FILES = new Set(['package.json', 'package-lock.json', 'wrangler.jsonc', 'wrangler.json', 'wrangler.toml', 'CNAME', 'Gemfile', 'Gemfile.lock']);
const run = (cmd, args, label) => {
  process.stdout.write(`▸ ${label}\n`);
  try { execFileSync(cmd, args, { cwd: ROOT, stdio: 'inherit' }); }
  catch (e) { console.error(`✗ ${label} failed — nothing is deployed`); process.exit(1); }
};

// 1. validation (same commands as desk-validate.yml)
run(process.execPath, ['desk/_tools/validate.mjs'], 'validator');
for (const t of ['build', 'site-i18n', 'sitemap']) run(process.execPath, [`desk/_tools/${t}.mjs`, '--check'], `${t} up to date`);

// 2. clean public copy
fs.rmSync(OUT, { recursive: true, force: true });
const isPublic = (rel) => !rel.split('/').some(seg => seg.startsWith('_') || seg.startsWith('.')) && !REPO_FILES.has(rel) && !rel.startsWith('node_modules/');
let n = 0;
for (const rel of fs.readdirSync(ROOT, { recursive: true }).map(String).map(f => f.split(path.sep).join('/')).sort()) {
  const abs = path.join(ROOT, rel);
  if (!isPublic(rel) || !fs.statSync(abs).isFile()) continue;
  fs.mkdirSync(path.dirname(path.join(OUT, rel)), { recursive: true }); fs.copyFileSync(abs, path.join(OUT, rel)); n++;
}
// 3. security headers
fs.copyFileSync(path.join(ROOT, 'desk/_tools/cloudflare/_headers'), path.join(OUT, '_headers'));

// 4. checks on the exact tree
const leaked = fs.readdirSync(OUT, { recursive: true }).map(String).map(f => f.split(path.sep).join('/')).filter(f => f !== '_headers' && f.split('/').some(s => s.startsWith('_') || s.startsWith('.')));
if (leaked.length) { console.error(`✗ internal paths in the build: ${leaked.slice(0, 5).join(', ')} — nothing is deployed`); process.exit(1); }
for (const must of ['index.html', '404.html', 'desk/index.html', 'sitemap.xml', 'robots.txt', '_headers']) if (!fs.existsSync(path.join(OUT, must))) { console.error(`✗ missing ${must} — nothing is deployed`); process.exit(1); }
run('python3', ['desk/_tests/pages_check.py', OUT], 'page check on the deploy tree');
console.log(`✓ ${n} public files + _headers in _cfsite/`);
