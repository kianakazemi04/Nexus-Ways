# Moving hosting to Cloudflare Pages (prepared 29 Oct 2026)

**Why:** GitHub Pages is "not intended for or allowed to be used as a free web-hosting service to run your online
business" (GitHub Pages limits). Cloudflare Pages allows commercial sites, can deploy from a private repository and
serves real security headers. The code stays on GitHub; only the hosting moves.

**What is ready in the repository**
- `.github/workflows/cloudflare-deploy.yml` — validation, the same GitHub Pages builder, the page check, then upload with
  wrangler 4.148.0. Inert until the variable `CF_PAGES_PROJECT` exists.
- `desk/_tools/cloudflare/_headers` — security headers: Content-Security-Policy (tested in enforcing mode on all 84
  pages, 0 violations), HSTS, nosniff, Referrer-Policy, Permissions-Policy, frame protection; cache rules for assets.

## Steps (owner and Claude together)

1. **Cloudflare account** (owner): sign up at dash.cloudflare.com (free plan). Turn on two-factor authentication.
2. **Pages project** (owner): Workers & Pages → Create → Pages → "Direct Upload" → project name `nexus-ways`
   (upload any placeholder once; the workflow replaces it). Do not connect Git here: deployment runs from GitHub Actions
   so that nothing is published unless validation passes.
3. **API token** (owner): My Profile → API Tokens → Create Token → template "Edit Cloudflare Workers" or custom with
   permission *Account → Cloudflare Pages → Edit*. Copy the token once; never paste it in a chat.
4. **GitHub settings** (owner): repository → Settings → Secrets and variables → Actions:
   - Secrets: `CLOUDFLARE_API_TOKEN` (the token), `CLOUDFLARE_ACCOUNT_ID` (Cloudflare dashboard → right column "Account ID").
   - Variables: `CF_PAGES_PROJECT` = `nexus-ways`.
5. **First deployment and staging check** (Claude): run the workflow (Actions → Cloudflare Pages deployment → Run
   workflow). Check `https://nexus-ways.pages.dev`: every page, the three languages, forms, headers. Nothing changes
   for visitors yet.
6. **DNS** (owner, with Claude): Cloudflare → Add a domain → `nexus-ways.com` → Free plan. Cloudflare imports the
   existing records. Before changing anything, compare them with the current DNS, especially the **Zoho mail records
   (MX, SPF TXT, DKIM TXT)** — they must be identical so e-mail keeps working. Then at the domain registrar replace the
   nameservers with the two Cloudflare nameservers.
7. **Custom domain** (owner): Pages project → Custom domains → add `nexus-ways.com` and `www.nexus-ways.com`.
8. **Switch-over check** (Claude): HTTPS, every URL unchanged, sitemap, canonical tags, forms, e-mail delivery.
   Then: GitHub → Settings → Pages → disable GitHub Pages, so there is a single deployment path.
9. **Afterwards** (owner, optional): make the repository private; add DMARC (`_dmarc` TXT `v=DMARC1; p=none; rua=…`) and
   a CAA record in Cloudflare DNS.

## SEO and continuity
Same domain, same URLs, same content and HTTPS from the first minute: search rankings carry over. During the nameserver
change (a few hours, up to 48) both hosts serve the same site, so visitors and search engines see no downtime.

## Rollback
Within 30 days: point the nameservers back to the registrar (records unchanged there) and re-enable GitHub Pages.
