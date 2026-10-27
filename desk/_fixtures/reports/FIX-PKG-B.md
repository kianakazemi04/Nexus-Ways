# Ingestion report · FIX-PKG-B

Received 2026-10-22 · processed 2026-10-27 · store: ILLUSTRATIVE FIXTURES · APPLIED

**Opportunity:** FIX-OPP-ILL-ILLUSTRATIVE-RESIDENCE-B · **Project:** FIX-PRJ-ILL-ILLUSTRATIVE-RESIDENCE-B · **Developer:** FIX-DEV-ILLUSTRATIVE-DEVELOPER-B · **Market:** FIX-MKT-ILL (ACTIVE)

**Publication:** not published. Ingestion never publishes; publication requires a passing gate, the owner's explicit approval and an export.

## 1. Records

Created (10): FIX-SRC-PKG-B-S2, FIX-SRC-PKG-B-S3, FIX-DEV-ILLUSTRATIVE-DEVELOPER-B, FIX-PRJ-ILL-ILLUSTRATIVE-RESIDENCE-B, FIX-OPP-ILL-ILLUSTRATIVE-RESIDENCE-B, FIX-EVD-ILL-ILLUSTRATIVE-RESIDENCE-B-0001, FIX-EVD-ILL-ILLUSTRATIVE-RESIDENCE-B-0002, FIX-EVD-ILL-ILLUSTRATIVE-RESIDENCE-B-0003, FIX-RB-PRJ-ILL-ILLUSTRATIVE-RESIDENCE-B-PROJECT-ASSET, FIX-MED-ILL-ILLUSTRATIVE-RESIDENCE-B-001

Reused (0): —

Values set: FIX-PRJ-ILL-ILLUSTRATIVE-RESIDENCE-B.delivery_status

## 2. Fact mapping (intelligence domain → owning record)

| Fact | Domain | Owner record.field | Evidence | Class | Verification | Tier |
|---|---|---|---|---|---|---|
| F-NAME | PROJECT_ASSET | FIX-PRJ-ILL-ILLUSTRATIVE-RESIDENCE-B.name | FIX-EVD-ILL-ILLUSTRATIVE-RESIDENCE-B-0001 | FACT | DEVELOPER-CLAIM | 3 |
| F-STATUS | PROJECT_ASSET | FIX-PRJ-ILL-ILLUSTRATIVE-RESIDENCE-B.delivery_status | FIX-EVD-ILL-ILLUSTRATIVE-RESIDENCE-B-0002 | FACT | UNVERIFIED | 4 |
| F-OLD | PROJECT_ASSET | FIX-PRJ-ILL-ILLUSTRATIVE-RESIDENCE-B | FIX-EVD-ILL-ILLUSTRATIVE-RESIDENCE-B-0003 | OPINION | DEVELOPER-CLAIM | 3 |

Private-only facts routed to the private store (0): —

## 3. Media

| File | Media ID | Type | Role | Permission | Scope | Metadata |
|---|---|---|---|---|---|---|
| raw/cover.jpg | FIX-MED-ILL-ILLUSTRATIVE-RESIDENCE-B-001 | RENDERING | cover | GRANTED_VERBAL | desk_web | stripped |

Documents inventoried (private only): —

## 4. Gaps, disputes and weak support

- Missing required fields: FIX-PRJ-ILL-ILLUSTRATIVE-RESIDENCE-B.district_id [ACCESSIBLE BUT NOT YET COLLECTED]; FIX-PRJ-ILL-ILLUSTRATIVE-RESIDENCE-B.expected_delivery [NO VALUE AND NO STATE]; FIX-DEV-ILLUSTRATIVE-DEVELOPER-B.legal_entity_name [PROFESSIONAL DD REQUIRED]; FIX-OPP-ILL-ILLUSTRATIVE-RESIDENCE-B.summary [NO VALUE AND NO STATE]
- Disputed (conflicts opened, nothing overwritten): none
- Corroborated: FIX-PRJ-ILL-ILLUSTRATIVE-RESIDENCE-B.name
- Developer claims only (unverified): FIX-PRJ-ILL-ILLUSTRATIVE-RESIDENCE-B.name
- Tier 4 only: FIX-PRJ-ILL-ILLUSTRATIVE-RESIDENCE-B.delivery_status
- Stale evidence (> 365 days or review date passed): FIX-EVD-ILL-ILLUSTRATIVE-RESIDENCE-B-0003
- Professional due diligence required: FIX-DEV-ILLUSTRATIVE-DEVELOPER-B.legal_entity_name
- Ingestion errors: none
- Notes: none

## 5. Methods

| Method | Status | Result |
|---|---|---|
| Evidence classification and verification | ACTIVE | run |
| Research Closure and Data Completeness | ACTIVE | run |
| Missing-data states | ACTIVE | run |
| Documented risk list (qualitative, no score) | ACTIVE | run |
| Risk severity and likelihood labels | INACTIVE | not run — method not defined |
| Opportunity and media publication gate | ACTIVE | run |
| Market publication gate | ACTIVE | run |
| Asset Quality assessment | INACTIVE | not run — framework only |
| Investment Fit / Match | INACTIVE | not run — contract only |
| District and area ranking | INACTIVE | not run — requirements only |
| Budget eligibility from internal price bands | INACTIVE | not run — rule only |
| Fair value | INACTIVE | not run — architecture only |
| Rental yield and return scenarios | INACTIVE | not run — architecture only |
| Liquidity assessment | INACTIVE | not run — definition only |

## 6. Validation and publication gate

Validation errors (0): none

**Gate G3-v1 for FIX-OPP-ILL-ILLUSTRATIVE-RESIDENCE-B: BLOCKED**

- record_status RESEARCH_IN_PROGRESS
- no G3-v1 review
- subject not reviewed
- project identity not verified (Tier 1–3)
- developer legal entity not verified
- no DEVELOPER research block
- no RISK research block
- no documented risk
- FIX-PRJ-ILL-ILLUSTRATIVE-RESIDENCE-B:delivery_status rests on Tier 4 only
- no publishable cover
- no publishable gallery image
- no legally approved disclosure

Media publishability:

- FIX-MED-ILL-ILLUSTRATIVE-RESIDENCE-B-001 (RENDERING, cover): not publishable — illustrative; no written permission; not reviewed
