# Hosting on Cloudflare (Workers static assets) — updated 29 Oct 2026

**Why:** GitHub Pages is "not intended for or allowed to be used as a free web-hosting service to run your online
business" (GitHub Pages limits). Cloudflare allows commercial sites and serves real security headers. The code stays on
GitHub.

## What is in place
- **Cloudflare Worker `nexus-ways`** (created by the owner, 29 Oct 2026), connected to this repository with Workers
  Builds: every push to `main` runs `npx wrangler deploy`.
- **`wrangler.jsonc`** (repository root): before deploying, wrangler runs `node desk/_tools/cf-build.mjs`, which
  1. runs the validator and the generator checks (same as CI);
  2. builds `_cfsite/` with only the public files — every path segment starting with `_` or `.` is excluded, as on
     GitHub Pages (internal tools, tests, test data, workflows), and so are repository files;
  3. adds the security headers (`desk/_tools/cloudflare/_headers`: CSP tested on all pages, HSTS, nosniff,
     Referrer-Policy, Permissions-Policy, frame protection, cache rules);
  4. runs the page check on that exact tree. Any failure → nothing is deployed; the live site stays as it was.
- **`package.json`** pins wrangler (4.148.0) so builds do not change unexpectedly.
- 404 pages: `404-page` handling (the nearest `404.html`, e.g. `/desk/404.html` for Desk pages).

Before this file existed, the first Workers builds uploaded the whole repository (output directory "."). Those versions
had no route on the domain; the next build replaces them.

## Remaining steps
1. **Check the build** (Claude): Cloudflare → Workers & Pages → nexus-ways → Deployments → latest build log shows
   "✓ … public files + _headers" and the deploy. Then check `https://nexus-ways.<account>.workers.dev`.
2. **Add the domain to Cloudflare** (owner): Account home → Add a domain → `nexus-ways.com` → Free plan. Cloudflare
   imports the existing DNS records. **Before changing anything**, compare them with the current DNS, especially the
   Zoho mail records (MX, SPF TXT, DKIM TXT): they must be identical.
3. **Nameservers** (owner): at the domain registrar, replace the nameservers with the two Cloudflare nameservers.
4. **Custom domain** (owner): Workers & Pages → nexus-ways → Domains → add `nexus-ways.com` and `www.nexus-ways.com`.
   Remove the old GitHub Pages DNS records (A records 185.199.108–111.153 and the `www` CNAME to github.io) only when
   Cloudflare asks to replace them.
5. **Switch-over check** (Claude): HTTPS, every URL, sitemap, canonical tags, forms, headers, e-mail delivery. Then
   GitHub → Settings → Pages → disable GitHub Pages, so there is a single host.
6. **Afterwards** (optional): make the repository private; DMARC (`_dmarc` TXT `v=DMARC1; p=none; rua=…`) and CAA in
   Cloudflare DNS; two-factor authentication on Cloudflare and GitHub.

## SEO and continuity
Same domain, same URLs, same content, HTTPS from the first minute: rankings carry over. During the nameserver change
both hosts serve the same site. Pages carry canonical tags to nexus-ways.com, so the workers.dev copy is not indexed as a
duplicate.

## Rollback
Point the nameservers back to the registrar (records unchanged there) and re-enable GitHub Pages.
