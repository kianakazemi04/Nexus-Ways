# Nexus Intelligence Desk — Architecture, engines and research workflow (v2, 28 Oct 2026)

Not published on the site (underscore folder; the repository itself is public on GitHub). Describes what is implemented
on `main` plus the public-minimisation change PUB-2 (branch `desk/public-minimisation`); anything not implemented is
marked as such. Statuses follow the capability register (project doc `nexus-desk/capability-register-v6.md`).

**PUB-2 (owner instruction, 28 Oct 2026).** Desk is a sales platform: it makes the decision easier, not more
complicated. Everything researched is used for analysis; only what is safe, verified and useful to the client is
published. Market research, statistics, research notes, gate details, legal-review topics and internal method names are
private; the site names the sources the research relies on and offers the analysis in consultation.

## 1. Layers

```
Owner materials (brochures, PDFs, photos, price lists)          ── private, never in this repository
        │  Claude: read, extract, research public sources, cross-check
        ▼
Research package  intake.json + raw/        (handoff part 1)   ── private store
Analysis file     private/analysis/<OPP>.json (handoff part 2)  ── private store
        │  ingest.mjs ingest  → validatePackage → identity (ID only) → evidence → transaction
        ▼
Private research store  data/*.json · private/*.json · media/ · reports/
        │  Engines 1–8 (desk/_tools/engines, validate.mjs, policy.js) — deterministic, tested
        ├─► decision report (private)          ingest.mjs report
        │  owner: approve-disclosure, approve-media, approve
        ▼
Public projection  desk/data/public + desk/media   ingest.mjs export / export-market (staged, validated, atomic)
                   markets: record + certificate + district names only (PUB-2)
        │  build.mjs → pages (EN/TR/AR) · validate.mjs (gate, deny-lists, V16, V20, V21 …)
        ▼
GitHub Pages (main) — Desk pages read only published.json-listed records
```

The research agent (Claude) and the deterministic systems are separate: Claude prepares packages, analysis files and
findings text; every number, calculation, gate decision and publication step is code with tests.

## 2. Intelligence domains → data

| Domain | Where it lives | Public? |
|---|---|---|
| A Market | `markets`, `districts`, research blocks (MARKET, MACRO_FX, DEVELOPER, PROJECT_ASSET, RISK, DISTRICT), named statistics (`evidence.topic`), private `regulatory_reviews`; source of truth = the private store, published by `export-market` | **private (PUB-2)**: the market record, its status, the per-project checks and the names of the sources used are public; statistics and research notes are used in the store only; activation only through the MG-1 gate (rules approved 28 Oct 2026) and the gate certificate |
| B Macro & FX | market-level statistics (CPI, policy/base rate, FX reference) as evidence with `topic`; the analysis file's `fx[]` rows must reference that evidence (ANL-2: one source of truth) | private (PUB-2); D10 (prices, rents, returns) unchanged — no financial figure is public |
| C District & location | `districts`, `areas`, evidence on district/area, project.district_id | district names public; district research private (PUB-2); area facts of a published project public with evidence |
| D Project & asset | `projects`, `assets`, evidence, media | yes, with evidence |
| E Developer & brand | `developers`, evidence; brands/architects/collaborators recorded as evidence claims on the project or developer | developer yes; **canonical brand/collaborator records NOT IMPLEMENTED** (schema has no entity for them) |
| F Pricing & value | private facts (PRICING), comparables in the analysis file | private (D-02, D-03) |
| G Rental & financial | private facts (RENTAL), finance block in the analysis file | private |
| H Risk (incl. bounded liquidity/exit) | `risks`, research blocks (RISK) | yes, qualitative |

## 3. Engines and dependencies

```
                ┌───────────── E1 Evidence & data quality (validate.mjs, policy.js) ─────────────┐
                ▼                         ▼                          ▼                         ▼
   E2 Market & location     E3 Project/developer/brand     E4 Pricing & comparables    E6 Risk & exit
   (domain assessment)      (domain assessment)            (CMP-1, CNV-1)              (risk list)
                │                         │                          │                         │
                │                         │                 E5 Rental & financial (FIN-2)       │
                │                         │                          │                         │
                └──────────────┬──────────┴───────────┬──────────────┴────────────┬────────────┘
                               ▼                      ▼                           ▼
                     E7 Comparison & fit (FIT-2)  ────────►  E8 Decision report (RPT-1)
```

| Engine | Module | Methods | Status |
|---|---|---|---|
| 1 Evidence & data quality | `validate.mjs`, `assets/js/policy.js` | M-EVIDENCE, M-MISSING-DATA, M-RESEARCH-STATUS, M-PUBLICATION-GATE | public, implemented & tested |
| 2 Market & location | `engines/report.mjs` §3; `engines/marketgate.mjs` | M-DOMAIN-ASSESSMENT; M-MARKET-GATE | domain assessment internal & tested; market gate MG-1 approved (28 Oct 2026), all three markets fail today; activation + `export-market` + certificate with validity date (D11/D12, PUB-2: public attestation, research private); ranking inactive |
| 3 Project, developer & brand | `engines/report.mjs` §3, validator gate | M-DOMAIN-ASSESSMENT; M-ASSET-QUALITY | assessment internal & tested; asset quality inactive |
| 4 Pricing & comparables | `engines/comparables.mjs`, `engines/units.mjs` | M-COMPARABLES (CMP-1), M-CONVERSION (CNV-1); M-FAIR-VALUE | internal & tested; fair value not implemented |
| 5 Rental & financial | `engines/finance.mjs` | M-CASHFLOW, M-ROI, M-NPV, M-SCENARIOS, M-RETURN-VIEWS (FIN-2); M-YIELD-RETURNS (public figures) | internal & tested; public figures prohibited (D10) |
| 6 Risk & exit | validator + report §5 | M-RISK-LIST; M-RISK-SEVERITY, M-LIQUIDITY | list public & tested; severity/liquidity inactive |
| 7 Comparison & fit | `assets/js/compare.js`, `engines/fit.mjs`, `engines/oppcompare.mjs` | Compare (public); M-INVESTMENT-FIT (FIT-2); M-OPPORTUNITY-COMPARISON (OPC-2); M-AREA-RANKING | compare public; fit internal qualitative; ranking inactive (`rank()` refuses) |
| 8 Decision report | `engines/report.mjs`, `ingest.mjs report` | M-DECISION-REPORT (RPT-1) | internal & tested |

## 4. Method contracts (summary; code headers are authoritative)

**FIN-2 — M-CASHFLOW / M-ROI / M-NPV / M-SCENARIOS / M-RETURN-VIEWS** (`engines/finance.mjs`; FIN-1 results unchanged for whole-year payments)
- Inputs: currency; horizon_years (1–50); delivery_year; acquisition {price, payments[{t, amount}]}; rent {gross_annual, occupancy, growth_rate}; operating {fixed_annual, pct_of_collected_rent}; tax {rental_income_rate, capital_gains_rate}; exit {sale_price | appreciation_rate, selling_cost_rate}; discount {rate, basis} for NPV only. Single currency (convert with CNV-1 first). Financing: UNSUPPORTED.
- Rules: annual periods, t = 0 valuation, end-of-year flows; payments may fall within a year (decimal t) and are discounted at their exact time; rent from delivery_year + 1 (`gross_annual` = rent of the first rented year); tax on positive net rent; capital-gains tax on gain over total invested.
- Outputs: cash-flow table; ROI = Σ CF / total invested (total over the horizon, not annual); annual IRR (bisection; AMBIGUOUS when flows change sign more than once); net rental yield of the first rented year (separate); NPV = Σ CF_t/(1+r)^t. Views (each only on recorded inputs with a basis): real terms (flows deflated by (1+π)^t; real IRR = (1+IRR)/(1+π) − 1) and home currency (each flow converted at spot·(1+change)^t). In TRY the report says when the real view is missing.
- Missing data: any missing/invalid input → UNAVAILABLE with the list; no defaults (a zero tax rate must be stated).
- Verification: hand-calculated case, Horner evaluation, textbook NPV = 0 case, r = 0 identity, timing shift test; FIN-2: exact mid-year payment discounting, textbook IRR cases, IRR sets NPV to zero, hand-calculated real and home-currency views.

**CMP-1 — M-COMPARABLES** · one price type; same area basis; same district by default; maximum age; observation not after as-of; FX via CNV-1 at the observation date; minimum sample ≥ 3 (set per analysis); exclusions listed; median and interquartile range (linear interpolation); no adjustments; never a fair value. Fewer than the minimum → INSUFFICIENT_SAMPLE, no statistics.

**CNV-1 — M-CONVERSION** · dated rates from the recorded table only; no live, cross or future rates; maximum age (default 7 days); m² ↔ ft² exact; gross ↔ net never.

**FIT-2 — M-INVESTMENT-FIT** · criteria: objective, market, delivery status, horizon to delivery, excluded risk types, budget (lowest recorded price + recorded acquisition costs). Each criterion is HARD unless listed in `preferences`; results MATCH / NO_MATCH / CANNOT_CONFIRM / DIFFERS_FROM_PREFERENCE; outcome NOT_SUITABLE (a hard criterion fails) / INSUFFICIENT_DATA / CRITERIA_MET_WITH_DIFFERENCES / CRITERIA_MET. Budget is always hard. No score, weight or ranking.

**RPT-1 — M-DECISION-REPORT** · sections: overview, facts with evidence labels and freshness, domain assessments, findings (evidence required), risks, conflicts and gaps, method eligibility, financial scenarios with input provenance, comparables, fit, limitations, next steps, conclusion. Never a score, ranking or buy recommendation. Written only to `<store>/reports/`.

**ANL-2 — analysis handoff** · every number `{value, ref}`; refs resolve to evidence, private facts or ASSUMPTION (note required); a value that differs from its record needs a derivation note; findings need evidence; every `fx[]` row references the evidence or private fact of that rate, with the same value (or its inverse) and date. Refused files write nothing.

**MG-1 / MGE-1 — market gate and public activation** · `activate-market` (store; gate must pass; writes the review stamp and a non-confidential gate certificate: versions, evaluation time, `valid_until` = earliest expiry of the inputs that passed, waived per-opportunity requirements) → `export-market` (public tree: market record with certificate and district names; removes any market research left public; the store is the source of truth) → `deactivate-market` (rollback; refused while an opportunity of the market is published). Public validator: an ACTIVE market needs the stamp and certificate (V21); after `valid_until`, new publications are blocked and W04 is raised (deployments are not blocked); V22 rejects market or district research in the public tree.

**Disclosure templates (K-3)** · `desk/_tools/disclosures/standard.json`; `approve-disclosure-template --by owner` binds the exact text (SHA-256); opportunities created from an approved template get APPROVED disclosures; a changed text needs a new approval.

**Indexing (K-4)** · Desk is `noindex` until the first opportunity is published; then Explore, Markets, Intelligence and published opportunity pages are indexable (build rule, tested).

## 5. Public / private policy (PUB-2, 28 Oct 2026)

Public: project/developer facts with evidence (ESTABLISHED as fact, QUALIFIED with "as reported by"), location, documented risks, open points, disclosures, permitted media, a plain-language evaluation process, the names of the sources used, market status and the per-project checks of each market. Private (in addition to the list below): market and district statistics, research notes and closure states, gate results and inputs, statutory-review topics and status, internal method names, contracts and statuses. Enforcement for PUB-2: V22 (no market/district evidence, research blocks or conflicts in the public tree), the minimised certificate schema (S-16), `export-market` and the opportunity export (no district research), and tests on the generated pages. Private: prices, price lists, payment plans, rents, financial models and scenarios, comparables, investor profiles, commercial terms, documents, restricted media, personal data. Enforcement: schema allow-list, deny-listed keys, V08 (currency), V16 (free-text prices), V20 (claim policy), F05/F06 (files), method registry (`publication: PROHIBITED_IN_MVP`), export filter. **No restriction was relaxed.** Publishing any financial figure (price band, yield, ROI range) requires an owner-approved policy change — see proposal P-1 in the register.

## 6. First real project — exact steps

1. Owner sends the materials (brochure, price list, photos, permission emails) in the chat or the private drive.
2. Claude extracts facts and claims, researches public sources, and writes `intake.json` (handoff part 1; template `intake-template.json`) with every fact's source, class and verification status; prices/rents as PRICING/RENTAL facts (private).
3. `node desk/_tools/ingest.mjs ingest --package <pkg> --store <private store>` (dry run) → review → `--apply`. Existing developers/districts are linked with `ref`.
4. Claude writes `private/analysis/<OPP>.json` (handoff part 2; template `analysis-template.json`) and runs `ingest.mjs report` → private decision report; gaps listed as next steps.
5. Owner decisions: counsel-approved disclosure (`approve-disclosure`), each image (`approve-media`), the opportunity (`approve`).
6. **Blocked today:** export needs an active market. The MG-1 rules are approved (28 Oct 2026); every market still fails its own gate. A market becomes active only after its research and statutory reviews are recorded in the store, its own gate passes, and the owner runs `activate-market` then `export-market` (D1: Istanbul, Dubai and Abu Dhabi in one programme, each independently). Then `export`, commit on a branch, CI, merge, verify the live page.

Prerequisites outside the code: private research store (repository or drive; the 28 Oct 2026 research cycle is held in the project at `nexus-desk/private/market-research-holding-2026-10-28.json` until then), Pages Source = GitHub Actions, legal review of disclosures/privacy text. Recommended (security audit 28 Oct 2026): make this repository private, since its configuration and tooling are readable by anyone today.
