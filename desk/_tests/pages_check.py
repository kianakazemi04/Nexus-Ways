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
    if not cond:
        fails.append(msg)
        if os.environ.get('GITHUB_ACTIONS'): print('::error::' + msg.replace('\n', ' ')[:900])

# 1. underscore folders and tooling never published
for d in ['desk/_fixtures', 'desk/_tools', 'desk/_tests', 'desk/_schema']:
    check(not os.path.exists(os.path.join(SITE, d)), f'{d} is not published')
check(not os.path.exists(os.path.join(SITE, '.github')), '.github is not published')
# the Pages builder does not copy CNAME into its output; the custom domain is set from the repository (CNAME at the source root)
check(os.path.exists(os.path.join(os.path.dirname(SITE), 'CNAME')) or os.path.exists(os.path.join(SITE, 'CNAME')), 'CNAME present in the source root (site served at the custom-domain root, so root-absolute /desk/ paths are valid)')

# 2. routes
ROUTES = ['desk/', 'desk/markets/', 'desk/markets/istanbul/', 'desk/markets/dubai/', 'desk/markets/abu-dhabi/', 'desk/opportunities/',
          'desk/opportunities/preview/', 'desk/compare/', 'desk/consultation/', 'desk/disclosures/', 'desk/intelligence/', 'desk/404.html'] + \
         [f'desk/intelligence/{s}/' for s in ['evaluation', 'evidence-sources', 'pricing', 'risk', 'liquidity', 'data-gaps']]
ROUTES = ROUTES + [r.replace('desk/', 'desk/' + l + '/', 1) for l in ('tr', 'ar') for r in ROUTES]
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
# 5. indexing (owner decision K-4): every Desk page is noindex until an opportunity is published; afterwards only
#    Explore, Markets, Intelligence and published opportunity pages may be indexable
import re as _re
INDEXABLE = _re.compile(r'^desk/(?:(?:tr|ar)/)?(?:index\.html|markets/.*|intelligence/.*|opportunities/(?!preview/)[^/]+/index\.html)$')
published_n = len(idx.get('opportunities', []))
wrong = []
for f in html_files:
    rel = os.path.relpath(f, SITE).replace(os.sep, '/')
    if not rel.startswith('desk'): continue
    is_noindex = 'content="noindex' in open(f, encoding='utf-8').read()
    if (published_n == 0 or not INDEXABLE.match(rel)) and not is_noindex: wrong.append(rel)
    if published_n > 0 and INDEXABLE.match(rel) and is_noindex: wrong.append(rel + ' (should be indexable)')
check(not wrong, f'Desk indexing follows the publication state ({published_n} published)' + (f': {wrong}' if wrong else ''))

print(f'\n{len(fails)} failure(s)'); sys.exit(1 if fails else 0)
