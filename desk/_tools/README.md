# Nexus Desk tooling (not published)

Folders starting with `_` are excluded from GitHub Pages by Jekyll; the validator fails if `.nojekyll` is added.

| Tool | Purpose |
|---|---|
| `validate.mjs` | Schema v1.1, references, evidence, media, deny-lists, personal data, method registry, computed publication gate, `published.json`, parent-site manifest. `--write-index` after an approved export. `--update-parent-manifest` only in an approved parent-site commit. |
| `ingest.mjs` | `ingest` a project package → canonical records + media derivatives + ingestion report; `gate`; `approve-disclosure` and `approve` (owner instruction only); `export` the approved public projection. |
| `media_derive.py` | WebP derivative, max 2400 px, all metadata stripped (Pillow). |
| `make_fixture_packages.py` | Regenerates the ILLUSTRATIVE fixture packages. |

Real research stores live outside this repository (private repo / private drive). `ingest.mjs` refuses a real store inside `desk/`.

Tests: `node --test desk/_tests/desk.test.mjs`

## Real project intake (Stage 3)

1. Raw material (media kit, contracts, permission emails, price lists) goes to the private drive folder `/<PRJ-id>/<YYYY-MM-DD>/`; never into this repository.
2. A package folder is prepared in the private store from `intake-template.json`: `intake.json` + `raw/` images. Facts are entered with their source, period and verification status; prices and rents go in `facts` with `"domain": "PRICING"` / `"RENTAL"` and are routed to the private store automatically.
3. `node desk/_tools/ingest.mjs ingest --package <pkg> --store <private-store>` (dry run) → review the report → `--apply`.
4. Owner decisions only: `approve-disclosure` after counsel approves the text; `approve` after reviewing the gate report.
5. `export --id <OPP-…>` writes the public projection and media into this repository and regenerates pages; commit on a branch; merge only with owner approval.

Field rules: `evidence_class` ∈ FACT, LEGAL FACT, ESTIMATE, PROJECTION, INTERPRETATION, HYPOTHESIS, OPINION, DATA NOT AVAILABLE · `verification_status` ∈ VERIFIED, CORROBORATED, SOURCE-REPORTED, DEVELOPER-CLAIM, UNVERIFIED · media `permission.status` must be GRANTED_WRITTEN (with an `evidence_ref` to the private permission record) and `scope` must include `desk_web` before an image can be published.
