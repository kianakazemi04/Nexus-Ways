#!/usr/bin/env python3
"""Nexus Desk browser acceptance checks (local; needs Python Playwright + Chromium).
Run from the repository root:  python3 desk/_tests/ui_acceptance.py
Starts a local static server, checks every Desk route in production and fixture mode, then exits non-zero on any failure."""
import asyncio, glob, os, re, subprocess, sys, time
from playwright.async_api import async_playwright

ROOT = os.path.abspath(os.environ.get('SITE_DIR') or os.path.join(os.path.dirname(__file__), '..', '..'))
PAGES_MODE = os.environ.get('PAGES_MODE') == '1'  # testing the real GitHub Pages build output: fixtures must be absent
PORT = 8791; B = f'http://localhost:{PORT}'
FIX_A, FIX_B, FIX_C = (f'FIX-OPP-ILL-ILLUSTRATIVE-RESIDENCE-{x}' for x in 'ABC')
fails = []
def check(cond, msg):
    print(('✓ ' if cond else '✗ ') + msg)
    if not cond:
        fails.append(msg)
        if os.environ.get('GITHUB_ACTIONS'): print('::error::' + msg.replace('\n', ' ')[:900])

ROUTES = sorted('/' + os.path.relpath(p, ROOT).replace(os.sep, '/').replace('index.html', '') for p in glob.glob(ROOT + '/desk/**/index.html', recursive=True) if '/_' not in p) + ['/desk/404.html']
FIXTURE_ROUTES = [] if PAGES_MODE else [f'/desk/?fixtures=1', f'/desk/opportunities/preview/?id={FIX_A}&fixtures=1', f'/desk/opportunities/preview/?id={FIX_B}&fixtures=1',
                  f'/desk/opportunities/preview/?id={FIX_C}&fixtures=1', f'/desk/compare/?ids={FIX_A},{FIX_C}&fixtures=1']
BANNED = re.compile(r'\b(scores?|ranking|yield|roi|fair value|forecasts?|return scenarios?|upside|downside)\b', re.I)

async def run():
    async with async_playwright() as p:
        b = await p.chromium.launch()
        for w, h in [(1440, 900), (390, 844)]:
            for scheme in ['dark', 'light']:
                ctx = await b.new_context(viewport={'width': w, 'height': h}, color_scheme=scheme)
                pg = await ctx.new_page(); errs = []
                pg.on('pageerror', lambda e: errs.append(str(e)))
                pg.on('response', lambda r: r.status >= 400 and 'fonts.g' not in r.url and errs.append(f'{r.status} {r.url}'))
                for rt in ROUTES + FIXTURE_ROUTES:
                    r = await pg.goto(B + rt, wait_until='networkidle')
                    tag = f'{rt} @{w} {scheme}'
                    if r.status != 200: check(False, f'{tag} status {r.status}')
                    ov = await pg.evaluate('document.documentElement.scrollWidth - innerWidth')
                    if ov > 0: check(False, f'{tag} horizontal overflow {ov}px')
                    if w == 1440 and scheme == 'dark':
                        # data-rendered regions only (methodology prose legitimately names what is NOT calculated)
                        txt = await pg.evaluate("""(() => { const out = []; for (const el of document.querySelectorAll('#cards, #opp, #cmp, #mkt')) { const c = el.cloneNode(true); c.querySelectorAll('.na, .sh, .gnote, .notice').forEach(x => x.remove()); out.push(c.innerText); } return out.join(' '); })()""")
                        for m in BANNED.finditer(txt):
                            check(False, f'{tag} banned term in data view: …{txt[max(0, m.start() - 40):m.end() + 20]}…')
                        robots = await pg.evaluate("document.querySelector('meta[name=robots]')?.content || ''")
                        if 'noindex' not in robots: check(False, f'{tag} not noindex')
                        h1 = await pg.evaluate("document.querySelectorAll('h1').length")
                        if h1 != 1: check(False, f'{tag} h1 count {h1}')
                    st = await pg.evaluate("[localStorage.length, sessionStorage.length, document.cookie.length]")
                    if st != [0, 0, 0]: check(False, f'{tag} browser storage used {st}')
                check(not errs, f'no console/page/network errors @{w} {scheme}' + (f': {errs[:3]}' if errs else ''))
                await ctx.close()
        check(True, f'{len(ROUTES)} routes + {len(FIXTURE_ROUTES)} fixture views checked at 1440/390 px, dark and light')

        pg = await b.new_page(viewport={'width': 1440, 'height': 900})
        # production never shows fixtures
        await pg.goto(B + f'/desk/opportunities/preview/?id={FIX_C}', wait_until='networkidle')
        check('not published' in (await pg.inner_text('main')).lower(), 'fixture id without fixture mode renders "not published"')
        await pg.goto(B + '/desk/', wait_until='networkidle')
        check('No opportunity has passed publication review yet' in await pg.inner_text('main'), 'production Explore shows the honest empty state')
        if PAGES_MODE:
            for u in ['/desk/_fixtures/data/opportunities.json', '/desk/_fixtures/gate.json', '/desk/_tools/validate.mjs']:
                r = await pg.goto(B + u); check(r.status == 404, f'{u} is not served (404) in the Pages build')
            await pg.goto(B + f'/desk/?fixtures=1', wait_until='networkidle')
            check('No opportunity has passed publication review yet' in await pg.inner_text('main'), '?fixtures=1 has no effect on the Pages build')
            await pg.goto(B + '/desk/consultation/', wait_until='networkidle')
            check(await pg.evaluate("document.querySelector('#cf fieldset').disabled"), 'consultation unconfigured in the Pages build')
            await pg.goto(B + '/', wait_until='networkidle')
            links = await pg.evaluate("[...document.querySelectorAll('a[href=\"/desk/\"]')].map(a => a.textContent.trim().slice(0, 4))")
            check('Desk' in links and any(l.startswith('Expl') for l in links), f'homepage menu "Desk" and section CTA link to /desk/ ({links})')
            txt = await pg.inner_text('#desk')
            check(not re.search(r'Score \d|Yield profile|Entry cost|Upside|Downside', txt), 'homepage Desk section has no scores, yield, entry cost or return chart')
            await b.close(); return
        # evidence drawers
        await pg.goto(B + f'/desk/opportunities/preview/?id={FIX_A}&fixtures=1', wait_until='networkidle')
        n = await pg.locator('[data-ev]').count(); ok = 0
        for i in range(n):
            await pg.locator('[data-ev]').nth(i).click(); await pg.wait_for_timeout(100)
            ok += await pg.locator('#dr .ev').count() >= 1
            await pg.keyboard.press('Escape'); await pg.wait_for_timeout(100)
        check(n > 0 and ok == n, f'evidence drawer opens with evidence from every button ({ok}/{n})')
        srcs = await pg.evaluate("[...document.querySelectorAll('#gal img')].map(i => i.getAttribute('src'))")
        check(srcs and all('RESIDENCE-A/' in s for s in srcs), f'gallery of A shows only A images ({len(srcs)})')
        await pg.click('.gal .main'); check(await pg.evaluate("!!document.querySelector('.lb img')"), 'lightbox opens'); await pg.keyboard.press('Escape')
        # field-level evidence (closure Task 1): a gate-passing opportunity has evidence behind every rendered fact,
        # and a developer claim stays visibly qualified in its evidence drawer
        await pg.goto(B + f'/desk/opportunities/preview/?id={FIX_C}&fixtures=1', wait_until='networkidle')
        facts = await pg.inner_text('#facts')
        check('No evidence linked' not in facts and 'Not recorded' not in facts, 'gate-passing opportunity: every rendered fact has linked evidence or an explicit state')
        await pg.locator('#facts [data-ev="f1"]').click(); await pg.wait_for_timeout(100)
        dr = (await pg.inner_text('#dr')).lower()
        q = 'developer claim' in dr and 'not independently verified' in dr
        check(q, 'developer-reported fact stays qualified in the evidence drawer' + ('' if q else f' ({dr[:160]!r})'))
        await pg.keyboard.press('Escape'); await pg.wait_for_timeout(100)
        # missing data
        await pg.goto(B + f'/desk/opportunities/preview/?id={FIX_B}&fixtures=1', wait_until='networkidle')
        t = (await pg.inner_text('main')).upper()
        check('PROFESSIONAL DUE DILIGENCE REQUIRED' in t and 'ACCESSIBLE, NOT YET COLLECTED' in t and ' 0 M²' not in t, 'missing data shown with exact states, never zero')
        # compare
        await pg.goto(B + f'/desk/compare/?ids={FIX_A},{FIX_B},{FIX_C},OPP-X&fixtures=1', wait_until='networkidle')
        c = await pg.inner_text('#cmp')
        check('At most three' in c and 'not published' in c, 'compare limits to three and reports unpublished ids')
        cols = await pg.locator('.cmp thead th').count(); await pg.reload(wait_until='networkidle')
        check(cols == 4 and await pg.locator('.cmp thead th').count() == 4, 'compare reproduces from the URL after reload')
        # consultation unconfigured
        await pg.goto(B + f'/desk/consultation/?ref={FIX_C}&fixtures=1', wait_until='networkidle')
        check(await pg.evaluate("document.querySelector('#cf fieldset').disabled") and 'not yet open' in (await pg.inner_text('main')), 'consultation is unconfigured and says so')
        check(await pg.evaluate("!document.querySelector('#cf').getAttribute('action')"), 'consultation form has no submission endpoint')
        # mobile menu
        m = await b.new_page(viewport={'width': 390, 'height': 844}); await m.goto(B + '/desk/', wait_until='networkidle')
        await m.click('.bg'); await m.wait_for_timeout(450)
        box = await m.locator('.nv').bounding_box()
        check(box and box['height'] > 500, 'mobile menu opens full height')
        await b.close()

srv = subprocess.Popen([sys.executable, '-m', 'http.server', str(PORT)], cwd=ROOT, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
try:
    time.sleep(0.8); asyncio.run(run())
finally:
    srv.terminate()
print(f'\n{len(fails)} failure(s)'); sys.exit(1 if fails else 0)
