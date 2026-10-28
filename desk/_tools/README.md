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

Tests: `node --test desk/_tests/desk.test.mjs desk/_tests/p0.test.mjs desk/_tests/phase2.test.mjs desk/_tests/p1.test.mjs desk/_tests/closure.test.mjs` (CI runs every `*.test.mjs` file; a test checks the list).

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

## Data-integrity controls (Phase 2)

- **Package validation first.** `ingest` checks the whole package (`validatePackage`) before building anything:
  required fields, enumerations, declared source/fact keys, media files inside the package, supported image types
  (JPEG, PNG, WebP; SVG for fixtures only — HEIC/HEIF and PDF are refused with an explicit message), and a complete
  permission block for every image. An invalid package is refused and nothing is written.
- **All-or-nothing ingestion.** Media derivatives are produced in a temporary staging folder outside the store and the
  repository. Records, private files, media and the report are written only if there are no ingestion or validation
  errors for the package, and then through one transaction (`desk/_tools/txn.mjs`). A refused package leaves the
  store byte-identical.
- **Atomic export.** `export` builds the complete result (public data, media, `published.json`, generated pages) in a
  throw-away copy of the repository, validates it, and only then applies the difference to `desk/` in one
  transaction, re-validating the real tree before committing. Any failure rolls everything back.
- **Crash recovery.** A transaction keeps a journal (`_txn/`) with the previous version of every file it touches. If a
  command is interrupted, the next command on that store (or the next export) rolls the journal back first;
  `node desk/_tools/ingest.mjs recover --store <store>` does it explicitly. A leftover journal or temporary file under
  `desk/` is a validation error (F07), so it can never pass CI; `desk/.gitignore` keeps them out of commits.
- **Fault injection (tests only).** `DESK_FAULT=<label>:write:<n>|<named point>|crash:<…>` makes a command fail or exit
  at that point; `desk/_tests/phase2.test.mjs` exercises every write stage. Nothing in normal use sets it.

## Publication and data-integrity controls (P0/P1 closure)

Policies live in `desk/assets/js/policy.js`, shared by the validator, the ingestion tool and the Desk pages.

- **Evidence freshness (review policy RP-1).** Each evidence record is CURRENT, REVIEW_DUE, EXPIRED or INVALID,
  computed from its verification date (or, if none, its retrieval date) against a review interval per field, source
  type or evidence class. Expired means "re-review required", not "false". For material fields (see below)
  EXPIRED/INVALID blocks new publication;
  REVIEW_DUE is published with a "Review due" label (warning W02). An already-published opportunity whose evidence
  ages is reported (W01), not withdrawn automatically — that policy is an open owner decision (D4). Dates in the
  future or impossible dates are errors (V18). The validator uses the UTC date; fixtures use `desk/_fixtures/clock.json`.
- **Last verified (V19).** Derived from evidence verification dates (the oldest across material fields); null when a
  material field has no verification date. Never the approval date.
- **Claim publication (claim policy CP-1).** ESTABLISHED (verified/corroborated fact, Tier 1–3) is shown as a fact;
  QUALIFIED (developer claim, source-reported, estimate, projection, interpretation, opinion) is shown with
  "As reported by <source> · not independently verified"; NOT_PUBLIC (unverified, hypothesis, any Tier 4 source) is
  never exported or rendered, stays in the private store and is listed as "held back" in the export output (V20).
  A material field with a value needs at least one publishable evidence record; identity fields need an ESTABLISHED one.
- **Images, one by one.** `approve` no longer approves images. `approve-media --id MED-… --by owner` checks that
  image's own permission (written, evidence reference, desk_web scope, not expired, not revoked, attribution, bound
  to its project). `revoke-media --id MED-… --by owner --reason "…"` marks the permission REVOKED (schema S-14:
  status REVOKED, `revoked_at`) and the next export removes that image and its file; other images stay.
- **Withdrawal.** `withdraw --id OPP-… --by owner --reason "…"`: the store record becomes WITHHELD (review cleared,
  evidence kept), then the opportunity, its project, assets, evidence, media files, disclosures and page leave the
  public tree in one validated transaction. Idempotent; a re-export needs a new `approve`.
- **Conflicts.** `resolve-conflict --id CNF-… --by owner --status EXPLAINED|RESOLVED --note "…" [--accept EVD-…]`.
  Both sides and their links are kept; RESOLVED applies the accepted value and records the previous value.
- **Audit log.** Every owner action appends to `private/audit_log.json` in the store (never published). `--by owner`
  is a recorded statement, not authentication.
- **Locks and recovery.** Every command that writes holds `_lock.json` in the store (and in `desk/` for export and
  withdrawal). A second command fails clearly; a lock left by a dead process on the same machine is cleared; any
  other lock needs `unlock --store <dir> --force` after checking. Recovery refuses to overwrite a file that changed
  after a crash, and never runs underneath a live operation. Symbolic links inside a transaction root are refused.
- **CI.** `fixture-browser-check` runs the browser checks in fixture mode from the source tree, separately from
  `pages-build-check` (production build, fixtures absent).

## Final technical closure (28 Oct 2026)

- **Field-level evidence.** Every record field rendered on an opportunity page, a card or Compare is a material field
  (`MATERIAL_FIELDS` in `desk/assets/js/policy.js`): project name, developer, district, delivery status, expected
  delivery, asset types; developer name and legal entity; unit layout, gross/net area, unit delivery status. A material
  field with a value needs publishable evidence about that exact subject and field; identity fields (project name,
  developer legal entity, the project–developer relationship) need ESTABLISHED evidence. An empty material field needs
  an explicit missing-data state. "No evidence linked" / "Not recorded" are display states, never a substitute for these
  gate rules. `closure.test.mjs` fails if a page renders a field that is not classified. Risk evidence is shown through
  the claim policy, and a risk may cite only evidence about its own project (V03).
- **Market gate (M-MARKET-GATE, MG-1).** Implemented as one shared engine (`engines/marketgate.mjs`, MGE-1) with a
  separate configuration per market (`market-gates/MG-1.json`: Istanbul, Dubai, Abu Dhabi); see `MARKET-GATES.md`.
  The registry keeps it INACTIVE (`IMPLEMENTED_PENDING_OWNER_APPROVAL`) until the owner approves the rules. Fail
  closed: while it is not ACTIVE no real market may be ACTIVE or PUBLISHED (V21), no opportunity in a real market is
  eligible, and `published.json` lists no market. Once approved, a market becomes ACTIVE only through
  `activate-market`, which refuses unless that market's own computed gate passes; the store validator re-checks the
  gate continuously (V21) and the public validator requires the MG-1 activation stamp. Legal review is recorded per
  market and topic with `record-review` (private, append-only); evidence never counts as legal approval. Tests switch
  the registry entry on only inside temporary copies (`enableTestMarketGate`, `seedTestMarketGate`).
- **Freshness.** The ingestion report uses review policy RP-1 (the same function as the gate and the pages). No
  scheduled job exists: stale-evidence alerts are not implemented.
- **Identity.** Ingestion links an existing developer, district, area or project only by ID (`<entity>.ref`). A record
  with the same name, slug or legal entity is never re-used automatically: the package is refused as an UNRESOLVED
  IDENTITY and nothing is written, unless the record was created by this same package (provenance in
  `private/entity_index.json`) or the package says `<entity>.new: true` (a separate record with a distinct ID; the
  validator then reports the possible duplicate, W03). A source matching an existing one but with another tier or type
  is refused. The report starts with an "Identity" section listing every decision.


## Decision engines and research workflow (28 Oct 2026)

Architecture, engine dependency map and method contracts: `ARCHITECTURE.md`. Owner → Claude handoff: `RESEARCH-HANDOFF.md`.
Engines live in `engines/` (finance FIN-1, comparables CMP-1, units CNV-1, fit FIT-1, analysis ANL-1, report RPT-1); they
run only on the private store (`ingest.mjs report`) and their results are never exported. The method registry
(`data/methods.json`) records each method's engines, public `status`, `internal` status, contract and tests; the
Intelligence page "Decision engines" is generated from it. Tests: `desk/_tests/engines.test.mjs`.
