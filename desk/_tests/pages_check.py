#!/usr/bin/env python3
"""Checks the output of the real GitHub Pages builder (actions/jekyll-build-pages) before release.
Usage: python3 desk/_tests/pages_check.py <_site dir>
- private/tooling folders are absent from the published site
- every Desk route exists; every root-absolute link and asset referenced by Desk pages and the parent pages resolves
- no fixture id, illustrative record or private collection is present in the published Desk data"""
import json, os, re, sys

SITE = os.path.abspath(sys.argv[1] if len(sys.argv) > 1 else '_site')
fails = []
def check(cond, msg):
    print(('✓ ' if cond else '✗ ') + msg)
    if not cond: fails.append(msg)

# 1. underscore folders and tooling never published
for d in ['desk/_fixtures', 'desk/_tools', 'desk/_tests', 'desk/_schema']:
    check(not os.path.exists(os.path.join(SITE, d)), f'{d} is not published')
check(not os.path.exists(os.path.join(SITE, '.github')), '.github is not published')
check(os.path.exists(os.path.join(SITE, 'CNAME')), 'CNAME present (custom domain root, so root-absolute paths are valid)')

# 2. routes
ROUTES = ['desk/', 'desk/markets/', 'desk/markets/istanbul/', 'desk/markets/dubai/', 'desk/markets/abu-dhabi/', 'desk/opportunities/',
          'desk/opportunities/preview/', 'desk/compare/', 'desk/consultation/', 'desk/disclosures/', 'desk/intelligence/', 'desk/404.html'] + \
         [f'desk/intelligence/{s}/' for s in ['evaluation', 'evidence-sources', 'pricing', 'risk', 'liquidity', 'data-gaps']]
def resolve(url):
    p = url.split('#')[0].split('?')[0]
    if not p.startswith('/'): return True
    rel = p.lstrip('/')
    cand = [rel, rel + 'index.html'] if (rel == '' or rel.endswith('/')) else [rel, rel + '/index.html', rel + '.html']
    return any(os.path.isfile(os.path.join(SITE, c)) for c in cand)
for r in ROUTES: check(resolve('/' + r), f'route /{r} exists in the built site')

# 3. links and assets
html_files = [os.path.join(dp, f) for dp, _, fs in os.walk(SITE) for f in fs if f.endswith('.html')]
broken = []
for f in html_files:
    t = open(f, encoding='utf-8', errors='ignore').read()
    for u in re.findall(r'(?:href|src)="(/[^"]*)"', t):
        if u.startswith('//'): continue
        if not resolve(u): broken.append((os.path.relpath(f, SITE), u))
check(not broken, f'all root-absolute links and assets resolve across {len(html_files)} pages' + (f': {broken[:8]}' if broken else ''))

# 4. published Desk data is production-safe
pub = os.path.join(SITE, 'desk/data/public')
names = sorted(os.listdir(pub)) if os.path.isdir(pub) else []
check('published.json' in names, 'published.json present')
leak = []
for n in names:
    t = open(os.path.join(pub, n), encoding='utf-8').read()
    if 'FIX-' in t or re.search(r'"is_illustrative":\s*true', t): leak.append(n)
check(not leak, 'no fixture or illustrative record in published data' + (f': {leak}' if leak else ''))
check(not any(x in names for x in ['price_observations.json', 'rental_observations.json', 'private_facts.json', 'documents.json']), 'no private collections published')
idx = json.load(open(os.path.join(pub, 'published.json'))) if 'published.json' in names else {}
print(f'  published opportunities: {len(idx.get("opportunities", []))} · media: {len(idx.get("media", []))} · markets: {len(idx.get("markets", []))}')
media = [os.path.relpath(os.path.join(dp, f), SITE) for dp, _, fs in os.walk(os.path.join(SITE, 'desk/media')) for f in fs if f != '.gitkeep']
check(len(media) == len(idx.get('media', [])), f'media files in the published tree ({len(media)}) match approved media ({len(idx.get("media", []))})')
# 5. every Desk page is noindex
noidx = [os.path.relpath(f, SITE) for f in html_files if os.path.relpath(f, SITE).startswith('desk') and 'noindex' not in open(f, encoding='utf-8').read()]
check(not noidx, 'every Desk page is noindex' + (f': {noidx}' if noidx else ''))

print(f'\n{len(fails)} failure(s)'); sys.exit(1 if fails else 0)
