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
