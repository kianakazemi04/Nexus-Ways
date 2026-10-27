# Ingestion report · FIX-PKG-A2

Received 2026-10-26 · processed 2026-10-27 · store: ILLUSTRATIVE FIXTURES · APPLIED

**Opportunity:** FIX-OPP-ILL-ILLUSTRATIVE-RESIDENCE-A · **Project:** FIX-PRJ-ILL-ILLUSTRATIVE-RESIDENCE-A · **Developer:** — · **Market:** FIX-MKT-ILL (ACTIVE)

**Publication:** not published. Ingestion never publishes; publication requires a passing gate, the owner's explicit approval and an export.

## 1. Records

Created (3): FIX-SRC-PKG-A2-S4, FIX-EVD-ILL-ILLUSTRATIVE-RESIDENCE-A-0010, FIX-CNF-ILL-ILLUSTRATIVE-RESIDENCE-A-01

Reused (2): FIX-PRJ-ILL-ILLUSTRATIVE-RESIDENCE-A, FIX-OPP-ILL-ILLUSTRATIVE-RESIDENCE-A

Values set: —

## 2. Fact mapping (intelligence domain → owning record)

| Fact | Domain | Owner record.field | Evidence | Class | Verification | Tier |
|---|---|---|---|---|---|---|
| F-DELIVERY2 | PROJECT_ASSET | FIX-PRJ-ILL-ILLUSTRATIVE-RESIDENCE-A.expected_delivery | FIX-EVD-ILL-ILLUSTRATIVE-RESIDENCE-A-0010 | FACT | SOURCE-REPORTED | 2 |

Private-only facts routed to the private store (0): —

## 3. Media

| File | Media ID | Type | Role | Permission | Scope | Metadata |
|---|---|---|---|---|---|---|

Documents inventoried (private only): —

## 4. Gaps, disputes and weak support

- Missing required fields: none
- Disputed (conflicts opened, nothing overwritten): FIX-PRJ-ILL-ILLUSTRATIVE-RESIDENCE-A.expected_delivery: "2028-06" vs "2029-03" → FIX-CNF-ILL-ILLUSTRATIVE-RESIDENCE-A-01
- Corroborated: none
- Developer claims only (unverified): FIX-PRJ-ILL-ILLUSTRATIVE-RESIDENCE-A.delivery_status
- Tier 4 only: none
- Stale evidence (> 365 days or review date passed): none
- Professional due diligence required: none
- Ingestion errors: media raw/borrowed.jpg: identical file already attached to FIX-PRJ-ILL-ILLUSTRATIVE-RESIDENCE-B (FIX-MED-ILL-ILLUSTRATIVE-RESIDENCE-B-001); not attached again
- Notes: FIX-OPP-ILL-ILLUSTRATIVE-RESIDENCE-A was PUBLISHED and no longer passes the gate after this package — set to WITHHELD pending owner review

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

**Gate G3-v1 for FIX-OPP-ILL-ILLUSTRATIVE-RESIDENCE-A: BLOCKED**

- record_status WITHHELD
- open conflict

Media publishability:

- FIX-MED-ILL-ILLUSTRATIVE-RESIDENCE-A-001 (RENDERING, cover): not publishable — illustrative
- FIX-MED-ILL-ILLUSTRATIVE-RESIDENCE-A-002 (RENDERING, gallery): not publishable — illustrative
- FIX-MED-ILL-ILLUSTRATIVE-RESIDENCE-A-003 (RENDERING, gallery): not publishable — illustrative
- FIX-MED-ILL-ILLUSTRATIVE-RESIDENCE-A-004 (FLOOR_PLAN, gallery): not publishable — illustrative
- FIX-MED-ILL-ILLUSTRATIVE-RESIDENCE-A-005 (CONSTRUCTION_PROGRESS, gallery): not publishable — illustrative; no written permission; not reviewed
- FIX-MED-ILL-ILLUSTRATIVE-RESIDENCE-A-006 (SITE_PLAN, gallery): not publishable — illustrative; no written permission; permission scope excludes desk_web; not reviewed
