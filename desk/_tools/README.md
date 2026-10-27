# Nexus Desk tooling (not published)

Folders starting with `_` are excluded from GitHub Pages by Jekyll; the validator fails if `.nojekyll` is added.

| Tool | Purpose |
|---|---|
| `validate.mjs` | Schema v1.1, references, evidence, media, deny-lists, personal data, method registry, computed publication gate, `published.json`, parent-site manifest. `--write-index` after an approved export. `--update-parent-manifest` only in an approved parent-site commit. |
| `ingest.mjs` | `ingest` a project package → canonical records + media derivatives + ingestion report; `gate`; `approve-disclosure` and `approve` (owner instruction only); `export` the approved public projection. |
| `media_derive.py` | WebP derivative, max 2400 px, all metadata stripped (Pillow). |
| `make_fixture_packages.py` | Regenerates the ILLUSTRATIVE fixture packages. |

Real research stores live outside this repository (private repo / private drive). Every `ingest.mjs` command (and the
library functions it exports) resolves the store path — `..`, relative segments and symbolic links included — and refuses
it if it lies anywhere inside the repository, equals `desk/_fixtures` without `--fixture`, or contains the repository.
Unresolvable paths are refused (exit code 2).

Tests: `node --test desk/_tests/desk.test.mjs`

## Real project intake (Stage 3)

1. Raw material (media kit, contracts, permission emails, price lists) goes to the private drive folder `/<PRJ-id>/<YYYY-MM-DD>/`; never into this repository.
2. A package folder is prepared in the private store from `intake-template.json`: `intake.json` + `raw/` images. Facts are entered with their source, period and verification status; prices and rents go in `facts` with `"domain": "PRICING"` / `"RENTAL"` and are routed to the private store automatically.
3. `node desk/_tools/ingest.mjs ingest --package <pkg> --store <private-store>` (dry run) → review the report → `--apply`.
4. Owner decisions only: `approve-disclosure` after counsel approves the text; `approve` after reviewing the gate report.
5. `export --id <OPP-…>` writes the public projection and media into this repository and regenerates pages; commit on a branch; merge only with owner approval.

Field rules: `evidence_class` ∈ FACT, LEGAL FACT, ESTIMATE, PROJECTION, INTERPRETATION, HYPOTHESIS, OPINION, DATA NOT AVAILABLE · `verification_status` ∈ VERIFIED, CORROBORATED, SOURCE-REPORTED, DEVELOPER-CLAIM, UNVERIFIED · media `permission.status` must be GRANTED_WRITTEN (with an `evidence_ref` to the private permission record) and `scope` must include `desk_web` before an image can be published.

## Publication controls added after the 27 Oct 2026 audit (Phase 1, P0)

- **Disclosures (B1).** An opportunity is eligible only if it has at least one disclosure and *every* applicable
  disclosure — every linked one, plus any recorded against the opportunity or its project — is legally approved with an
  approval date. Export no longer skips pending disclosures; it refuses and writes nothing. The Desk runtime also hides an
  opportunity whose linked disclosures are not all present and approved.
- **Prices and commercial terms in free text (B2, rule V16).** All prose in public records is scanned for money amounts
  (currency code, symbol or word next to a number, per-area prices) and commercial terms with a rate (yield, return,
  commission, discount, down payment, payment plan). In public data this is a validation error; in a store it is a gate
  reason, so approval is refused before anything is exported. Identifiers, links, hashes, dates and enumerations are
  not scanned as prose. A disclosure text therefore cannot state a commission *rate* publicly; if counsel requires a rate,
  that is an owner decision and needs a rule change.
- **Store location (B3).** See above.
- **Deployment (B4).** `.github/workflows/desk-pages-deploy.yml` deploys the site only after `desk-validate.yml` (called
  as a reusable workflow) and a Pages build pass, and only for `main`. It takes effect only when the repository's Pages
  source is set to **GitHub Actions** (Settings → Pages → Build and deployment → Source). Until then GitHub's
  `pages-build-deployment` publishes every push to `main` independently of validation. Owner options: (1) switch the Pages
  source to GitHub Actions; (2) additionally protect `main` with a ruleset requiring the `validate` and
  `pages-build-check` status checks and pull requests, with no bypass. The custom domain stays configured in the Pages
  settings when the source changes.
  Exact owner steps, how to verify the setting, and the first-deployment check: `desk/_tools/PAGES-DEPLOYMENT.md`.
  All workflow actions are pinned to full commit SHAs (policy enforced by `desk/_tests/p0.test.mjs`).
