# Nexus Intelligence Desk — Final Readiness Report (28 Oct 2026)

**Baseline:** `main` @ 5cbed80 (PUB-2, live). **Branch:** `desk/readiness-closure` (PR #3).
**Data used in testing:** synthetic TEST-ONLY data only. No market was activated, no real project was published, no
disclosure text was approved and DNS/hosting were not changed.

## Go / no-go

| Decision | Verdict | Why |
|---|---|---|
| **Accept a real project package (private intake, internal report)** | **GO, conditional on one owner action** | The pipeline, the private/public boundary and the internal engines are verified and tested end to end. The one condition: the private research store must exist outside this public repository. The tools refuse any store inside the repository or linked into it. |
| **Publish a real project** | **NO-GO** | No market passes its gate yet: there are no verified official figures and no statutory records. The disclosure texts are not approved. Deployment is not yet gated: the Pages source is still "Deploy from a branch". |

## Readiness matrix

Statuses: **VERIFIED AND TESTED** · **IMPLEMENTED, OWNER ACTION REQUIRED** · **BLOCKED BY OFFICIAL EVIDENCE OR LEGAL REVIEW** · **NOT IMPLEMENTED** · **FAILED**.

The full test command is `node --test` over the 12 suites listed in `desk-validate.yml`. Result: **191/191 pass**.

| # | Item | Status | File / setting | Evidence (command → result) | Remaining limitation | Next action |
|---|---|---|---|---|---|---|
| A1 | MG-1 status vs registry vs K-1 | VERIFIED AND TESTED (fixed) | `market-gates/MG-1.json` (`status_authority`), `data/methods.json` note | marketgate "MG-1 status mirrors the method registry" → pass | — | — |
| A2 | Registry semantics (status / internal / publication) | VERIFIED AND TESTED (fixed) | `validate.mjs` M01 | marketgate "registry semantics … M01" → pass | — | — |
| A3 | Schema, IDs, references, provenance, freshness, conflicts, missing-data states | VERIFIED AND TESTED | `validate.mjs` V00–V22, `policy.js` | desk, closure, p1 → pass | — | — |
| A4 | Private figures never in public exports | VERIFIED AND TESTED | export filter, V08/V16/V22, PUB-2 | acceptance A3; engines report e2e → pass | — | — |
| A5 | Store outside the repository: traversal, symlinks, **links inside the store** | VERIFIED AND TESTED (fixed: inner links) | `ingest.mjs` `assertStorePath` | p0 B3 (two tests) → pass | — | — |
| A6 | Generated pages, indexes, fixtures, tooling exclusions, EN/TR/AR | VERIFIED AND TESTED | `build.mjs`, `pages_check.py` | acceptance A10; ui_acceptance → 0 failures | — | — |
| A7 | Market research is not public (PUB-2) | VERIFIED AND TESTED (live) | V22; `evidence.json` live = 0 records | engines PUB-2; live check → 0 records | research held in the private project file | import into the store when it exists |
| B1 | FIN-2: cash flows, ROI, NPV, IRR, dated payments, real and home views | VERIFIED AND TESTED | `engines/finance.mjs` | engines (hand-calculated) → pass | leverage UNSUPPORTED by design | — |
| B2 | FIN-2 edge cases: zero investment, invalid rates, loss-only flows, multiple IRR roots, zero discount | VERIFIED AND TESTED (fixed: zero investment) | `checkInputs` | engines "readiness closure (FIN-2)" → pass | — | — |
| B3 | Stale or future FX; silent currency mixing | VERIFIED AND TESTED (fixed) | `engines/analysis.mjs` | engines "readiness closure (ANL-2)" → pass | — | — |
| B4 | FIT-2 hard criteria, preferences, acquisition costs | VERIFIED AND TESTED | `engines/fit.mjs` | engines "investment fit" → pass | — | — |
| B5 | OPC classification on structured reason codes | VERIFIED AND TESTED (fixed: OPC-2) | `validate.mjs` `eligibility.reasons`, `engines/oppcompare.mjs` | workflow OPC-2 (two tests) → pass | — | — |
| B6 | Comparison is a research queue, not a ranking | VERIFIED AND TESTED | OPC-2 note; `rank()` refuses | workflow, engines → pass | — | — |
| B7 | Fair value, adjusted comparables, numeric risk and liquidity, area ranking inactive | VERIFIED AND TESTED | registry, M01 | engines; validate → pass | — | — |
| C1 | Lifecycle: dry run → apply → report → gate → approvals → export → build → withdraw → deactivate | VERIFIED AND TESTED | `ingest.mjs` | acceptance A1, A3, A6, A7, A9 → pass | — | — |
| C2 | Activation → certificate (validity date) → export → deactivation; expired or mismatched certificate; unauthorised waiver | VERIFIED AND TESTED | `marketgate.mjs`, V21/W04 | marketgate → 57 pass | — | — |
| C3 | Istanbul, Dubai and Abu Dhabi gates, independently | VERIFIED AND TESTED (synthetic) | MG-1 | acceptance A4/A5; marketgate → pass | — | — |
| C4 | Real markets pass | **BLOCKED BY OFFICIAL EVIDENCE OR LEGAL REVIEW** | private store | gate fails closed today | verified official figures; statutory records | owner records the statutory checks; Claude verifies the figures against official releases |
| C5 | Sales-office permission: exact media, channels, scope and dates; never a substitute for a licence | VERIFIED AND TESTED | permissions | permissions (6); acceptance A4 → pass | — | — |
| C6 | Disclosure templates pending until the exact text is approved; a changed text invalidates the approval | VERIFIED AND TESTED | `disclosures/standard.json` | disclosures (4) → pass | — | — |
| C7 | Disclosure texts approved | **IMPLEMENTED, OWNER ACTION REQUIRED** | `approve-disclosure-template` | — | — | owner reads and approves (optionally with counsel) |
| C8 | Every published material fact traces to a source URL or locator | VERIFIED AND TESTED (fixed: new gate reason) | `validate.mjs` `EVIDENCE_NO_LOCATOR` | acceptance A2; closure T1 → pass | — | — |
| D1 | Deployment gated by validation | **IMPLEMENTED, OWNER ACTION REQUIRED** | Settings → Pages → Source | deployments API: two deployments per commit (5cbed80) | legacy path deploys ungated | set Source = GitHub Actions |
| D2 | `main` protection; environment limited to `main` | **IMPLEMENTED, OWNER ACTION REQUIRED** | Settings → Rules / Environments | API: "Branch not protected"; environment NOT VERIFIED | — | ruleset requiring PR and checks |
| D3 | Failed validation blocks the gated workflow | VERIFIED AND TESTED | `desk-pages-deploy.yml` needs-chain | acceptance A8 → pass | effective only after D1 | — |
| D4 | Workflow hygiene: pinned SHAs, `contents: read`, no `pull_request_target`, no persisted token | VERIFIED AND TESTED (fixed: `persist-credentials`) | workflows | p1 B7; acceptance A8 → pass | pip packages pinned without hashes (low) | — |
| D5 | Secrets in history | VERIFIED (pattern scan, 52+ commits) | — | security audit 28 Oct | pattern-based only | — |
| D6 | Client-side injection, external scripts | VERIFIED | `ui.js` escaping; no third-party JS | security audit | no CSP header possible on GitHub Pages | hosting decision |
| D7 | DMARC, CAA, DNSSEC, 2FA, app permission | **IMPLEMENTED, OWNER ACTION REQUIRED** | DNS, accounts | audit: no DMARC/CAA | — | see `OPERATIONS.md` §2 |
| D8 | Hosting suitability | Recommendation below | — | GitHub Pages limits (official) | commercial-use wording uncertain | owner decision |
| D9 | Private research store | **IMPLEMENTED, OWNER ACTION REQUIRED** | — | tools refuse an in-repository store | — | create a private repository or drive |
| D10 | Scheduled freshness alerts | NOT IMPLEMENTED | — | — | D4 decision open | after the first publication |

**FAILED:** none.

## Defects fixed in this branch (each with a regression test)

1. **MG-1.json said "PROPOSED" while the registry said RULES_APPROVED.** The registry is now the named authority, and a
   test keeps the two from contradicting each other.
2. **The registry note said `status` governs public rendering**, which contradicts the gate being ACTIVE while its
   result stays INTERNAL. The semantics are now defined, and M01 enforces them.
3. **OPC-1 classified reasons by matching their text.** It now uses structured codes (OPC-2). Every emitted code is
   classified (test), and unknown codes are reported.
4. **A link inside the store could lead into the public repository** (for example `reports/` pointing at `desk/`). Such
   a store is now refused.
5. **A total investment of 0 gave ROI = Infinity.** It is now refused.
6. **FX rows in the analysis file were not checked for age, and amounts in another currency could be mixed in
   silently.** Both are refused now.
7. **Published facts could lack a source locator.** This now blocks publication; the fixtures were updated.
8. **The checkout token was persisted in CI.** It no longer is.

## Owner-only actions (approvals and settings only)

1. Settings → Pages → Source = **GitHub Actions**.
2. Settings → Rules: protect `main` (pull request plus the three required checks). Settings → Environments: limit
   `github-pages` to `main`.
3. Create the **private research store** (private repository or drive) and give Claude access.
4. Approve the two standard disclosure texts, `DT-COMMISSION-1` and `DT-NOT-ADVICE-1`.
5. Record the statutory checks per market with `record-review`, using the official reference.
6. Email security in DNS: DMARC `p=none` → `quarantine` → `reject`; SPF `-all`; CAA. Turn on 2FA everywhere.
7. Hosting: decide whether to make the repository private (and move to Cloudflare Pages or a paid GitHub plan).

## Hosting recommendation

- **Now:** stay on GitHub Pages, set the Pages source to Actions and protect `main`.
- **Plan a move to Cloudflare Pages, with GitHub kept as the private code repository, before any of these happens:**
  - paid services are sold through the site;
  - the repository is made private;
  - real security headers (CSP, HSTS, `frame-ancestors`) are required;
  - spam or bots become a problem.

  GitHub's Pages policy says Pages is not intended to run an online business, which makes today's use uncertain.
- **Do not** put Cloudflare's proxy in front of GitHub Pages. GitHub's IP addresses are public, so the proxy can be
  bypassed.
- **Migration:** Cloudflare project from the repository, `_headers`, a staging URL that passes the same acceptance
  suites, then a DNS cut-over with owner approval and 30 days of rollback.

## Reproduce

```
node desk/_tools/validate.mjs && node desk/_tools/build.mjs --check
node --test desk/_tests/*.test.mjs          # 191/191
python3 desk/_tests/ui_acceptance.py        # 0 failures
```
