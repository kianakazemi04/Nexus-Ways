# Nexus Desk — Operations: first-project runbook, security, backup and recovery (28 Oct 2026)

This page is not published on the site, because it sits in an underscore folder. The repository itself is public, so
nothing confidential belongs here.

## 1. First real project: runbook

Prerequisites (owner):
- a private research store outside this repository;
- the Pages source set to "GitHub Actions";
- the two standard disclosure texts approved;
- the market's statutory checks recorded.

1. **Receive.** The owner sends the brochure, price list, photos and the sales office's written permission into the
   private store, never into this repository or a public chat.
2. **Package.** Claude writes `intake.json` from the materials and public research. Every fact needs a source, its
   class, its verification status and a `locator` (page, section or register entry) unless the source has a URL.
   Prices and rents go in as PRICING and RENTAL facts, which stay private.
3. **Dry run.** Run the ingest command below without `--apply`. Read the report: what will be created, what is held
   back and what is missing.
   ```
   node desk/_tools/ingest.mjs ingest --package <pkg> --store <store>
   ```
4. **Apply.** Run the same command with `--apply`. The write is all-or-nothing, and the store keeps an audit entry.
5. **Analyse.** Claude writes `private/analysis/<OPP>.json`, where every number has a reference, and runs
   `ingest.mjs report --store <store> --id <OPP>`. The private decision report is written to `<store>/reports/` and is
   used in consultation only.
6. **Owner decisions.** Each of these is an owner command and is recorded:
   - `approve-disclosure` (or the approved template);
   - `approve-media` for each image;
   - `approve` for the opportunity.

   `ingest.mjs gate --store <store>` lists every blocking reason, each with its code.
7. **Market.** The project's market must already be ACTIVE: `activate-market` followed by `export-market`, each run
   once per market. Until then, export is refused.
8. **Publish.**
   - Run `ingest.mjs export --store <store> --id <OPP>`.
   - Commit on a branch and open a pull request.
   - CI must be green before merging.
   - After merging, check the live page in EN, TR and AR.
9. **Withdraw** if needed, with `ingest.mjs withdraw --store <store> --id <OPP> --by owner --reason "<why>"`. The
   withdrawal removes the public projection (data, media and pages) and keeps the private research and the audit log.

## 2. Security checklist

| Item | State (28 Oct 2026) | Owner action |
|---|---|---|
| Pages source = GitHub Actions (gated deployment only) | Not set: two deployments per commit | Settings → Pages → Source |
| `main` protected: pull request plus required checks (validate, pages-build-check, fixture-browser-check) | Not protected | Settings → Rules |
| Environment `github-pages` limited to `main` | Not verifiable from here | Settings → Environments |
| 2FA or passkey on GitHub, the registrar and Zoho; recovery codes stored offline | Not verifiable from here | Accounts |
| Automation app permission reduced from admin | Admin today | GitHub App settings |
| DMARC (start at `p=none`, then tighten), SPF `-all`, DKIM | No DMARC | DNS |
| CAA record for `letsencrypt.org`; DNSSEC if the registrar supports it | None | DNS |
| Repository private, or hosting moved to a host that publishes from a private repository | Public | Decision |
| Dependabot alerts on; secret scanning with non-provider patterns | Off | Settings → Security |
| Workflows: SHA-pinned actions, `contents: read`, `persist-credentials: false`, no `pull_request_target` | Done | — |
| Dependabot version updates for Actions (pull requests only) | `.github/dependabot.yml` | — |
| Store boundary: store outside the repository; links inside the store cannot lead out | Done and tested | — |

## 3. Backup and recovery

**Backup.**
- **Code and public data:** git. Keep one mirror outside GitHub (`git clone --mirror`) and refresh it weekly.
- **Private store:** its own private repository or drive, with versioning on. Back it up weekly to a second location
  that the owner controls.

**Rollback.**
- To undo a commit, run `git revert <sha>` on a pull request. The validated deployment then follows.
- To withdraw one project, use `ingest.mjs withdraw`.
- To close a market, use `ingest.mjs deactivate-market`.
- An interrupted write is rolled back automatically on the next command (journal). `ingest.mjs recover` does the same
  explicitly.

**Monitoring.**
- External uptime checks on `/`, `/desk/` and `/desk/tr/`.
- GitHub notifications for failed workflows.
- A weekly look at the deployments list: one deployment per commit, from the gated workflow.

**Incident response.**
1. **Detect:** an alert, a report or a failed workflow.
2. **Contain:** revoke sessions and tokens, disable Pages or revert the change, and rotate the form keys if they were
   abused.
3. **Assess:** use the git log, the deployments list, the audit log and the private audit log.
4. **Recover:** redeploy from a known-good commit through the validated deployment.
5. **Notify:** counsel decides whether notification is required (GDPR, KVKK).
6. **Record:** add the incident to the decision log.
