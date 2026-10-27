# Ingestion report · FIX-PKG-A

Received 2026-10-21 · processed 2026-10-27 · store: ILLUSTRATIVE FIXTURES · APPLIED

**Opportunity:** FIX-OPP-ILL-ILLUSTRATIVE-RESIDENCE-A · **Project:** FIX-PRJ-ILL-ILLUSTRATIVE-RESIDENCE-A · **Developer:** FIX-DEV-ILLUSTRATIVE-DEVELOPER-A · **Market:** FIX-MKT-ILL (ACTIVE)

**Publication:** not published. Ingestion never publishes; publication requires a passing gate, the owner's explicit approval and an export.

## 1. Records

Created (29): FIX-SRC-PKG-A-S1, FIX-SRC-PKG-A-S2, FIX-SRC-PKG-A-S3, FIX-DEV-ILLUSTRATIVE-DEVELOPER-A, FIX-DST-ILL-ILLUSTRATIVE-DISTRICT-NORTH, FIX-PRJ-ILL-ILLUSTRATIVE-RESIDENCE-A, FIX-AST-ILL-ILLUSTRATIVE-RESIDENCE-A-A1, FIX-OPP-ILL-ILLUSTRATIVE-RESIDENCE-A, FIX-EVD-ILL-ILLUSTRATIVE-RESIDENCE-A-0001, FIX-EVD-ILL-ILLUSTRATIVE-RESIDENCE-A-0002, FIX-EVD-ILL-ILLUSTRATIVE-RESIDENCE-A-0003, FIX-EVD-ILL-ILLUSTRATIVE-RESIDENCE-A-0004, FIX-EVD-ILL-ILLUSTRATIVE-RESIDENCE-A-0005, FIX-EVD-ILL-ILLUSTRATIVE-RESIDENCE-A-0006, FIX-EVD-ILL-ILLUSTRATIVE-RESIDENCE-A-0007, FIX-EVD-ILL-ILLUSTRATIVE-RESIDENCE-A-0008, FIX-EVD-ILL-ILLUSTRATIVE-RESIDENCE-A-0009, FIX-RB-PRJ-ILL-ILLUSTRATIVE-RESIDENCE-A-PROJECT-ASSET, FIX-RB-PRJ-ILL-ILLUSTRATIVE-RESIDENCE-A-DEVELOPER, FIX-RB-PRJ-ILL-ILLUSTRATIVE-RESIDENCE-A-RISK, FIX-RSK-ILL-ILLUSTRATIVE-RESIDENCE-A-01, FIX-RSK-ILL-ILLUSTRATIVE-RESIDENCE-A-02, FIX-DSC-ILL-ILLUSTRATIVE-RESIDENCE-A-01, FIX-MED-ILL-ILLUSTRATIVE-RESIDENCE-A-001, FIX-MED-ILL-ILLUSTRATIVE-RESIDENCE-A-002, FIX-MED-ILL-ILLUSTRATIVE-RESIDENCE-A-003, FIX-MED-ILL-ILLUSTRATIVE-RESIDENCE-A-004, FIX-MED-ILL-ILLUSTRATIVE-RESIDENCE-A-005, FIX-MED-ILL-ILLUSTRATIVE-RESIDENCE-A-006

Reused (0): —

Values set: FIX-DEV-ILLUSTRATIVE-DEVELOPER-A.legal_entity_name, FIX-PRJ-ILL-ILLUSTRATIVE-RESIDENCE-A.delivery_status, FIX-PRJ-ILL-ILLUSTRATIVE-RESIDENCE-A.expected_delivery, FIX-AST-ILL-ILLUSTRATIVE-RESIDENCE-A-A1.unit_type, FIX-AST-ILL-ILLUSTRATIVE-RESIDENCE-A-A1.gross_area_m2, FIX-AST-ILL-ILLUSTRATIVE-RESIDENCE-A-A1.net_area_m2, FIX-AST-ILL-ILLUSTRATIVE-RESIDENCE-A-A1.delivery_status

## 2. Fact mapping (intelligence domain → owning record)

| Fact | Domain | Owner record.field | Evidence | Class | Verification | Tier |
|---|---|---|---|---|---|---|
| F-NAME | PROJECT_ASSET | FIX-PRJ-ILL-ILLUSTRATIVE-RESIDENCE-A.name | FIX-EVD-ILL-ILLUSTRATIVE-RESIDENCE-A-0001 | FACT | VERIFIED | 1 |
| F-LEGAL | DEVELOPER | FIX-DEV-ILLUSTRATIVE-DEVELOPER-A.legal_entity_name | FIX-EVD-ILL-ILLUSTRATIVE-RESIDENCE-A-0002 | LEGAL FACT | VERIFIED | 1 |
| F-STATUS | PROJECT_ASSET | FIX-PRJ-ILL-ILLUSTRATIVE-RESIDENCE-A.delivery_status | FIX-EVD-ILL-ILLUSTRATIVE-RESIDENCE-A-0003 | FACT | DEVELOPER-CLAIM | 3 |
| F-DELIVERY | PROJECT_ASSET | FIX-PRJ-ILL-ILLUSTRATIVE-RESIDENCE-A.expected_delivery | FIX-EVD-ILL-ILLUSTRATIVE-RESIDENCE-A-0004 | PROJECTION | DEVELOPER-CLAIM | 3 |
| F-TYPE | PROJECT_ASSET | FIX-AST-ILL-ILLUSTRATIVE-RESIDENCE-A-A1.unit_type | FIX-EVD-ILL-ILLUSTRATIVE-RESIDENCE-A-0005 | FACT | DEVELOPER-CLAIM | 3 |
| F-GROSS | PROJECT_ASSET | FIX-AST-ILL-ILLUSTRATIVE-RESIDENCE-A-A1.gross_area_m2 | FIX-EVD-ILL-ILLUSTRATIVE-RESIDENCE-A-0006 | FACT | DEVELOPER-CLAIM | 3 |
| F-NET | PROJECT_ASSET | FIX-AST-ILL-ILLUSTRATIVE-RESIDENCE-A-A1.net_area_m2 | FIX-EVD-ILL-ILLUSTRATIVE-RESIDENCE-A-0007 | FACT | DEVELOPER-CLAIM | 3 |
| F-ADELIV | PROJECT_ASSET | FIX-AST-ILL-ILLUSTRATIVE-RESIDENCE-A-A1.delivery_status | FIX-EVD-ILL-ILLUSTRATIVE-RESIDENCE-A-0008 | FACT | DEVELOPER-CLAIM | 3 |
| F-AMEN | PROJECT_ASSET | FIX-PRJ-ILL-ILLUSTRATIVE-RESIDENCE-A | FIX-EVD-ILL-ILLUSTRATIVE-RESIDENCE-A-0009 | OPINION | UNVERIFIED | 4 |

Private-only facts routed to the private store (1): F-PRICE (PRICING; currency amount)

## 3. Media

| File | Media ID | Type | Role | Permission | Scope | Metadata |
|---|---|---|---|---|---|---|
| raw/exterior.jpg | FIX-MED-ILL-ILLUSTRATIVE-RESIDENCE-A-001 | RENDERING | cover | GRANTED_WRITTEN | desk_web | stripped (incl. GPS) |
| raw/interior.png | FIX-MED-ILL-ILLUSTRATIVE-RESIDENCE-A-002 | RENDERING | gallery | GRANTED_WRITTEN | desk_web | none found |
| raw/amenity.jpg | FIX-MED-ILL-ILLUSTRATIVE-RESIDENCE-A-003 | RENDERING | gallery | GRANTED_WRITTEN | desk_web | stripped |
| raw/plan-2plus1.svg | FIX-MED-ILL-ILLUSTRATIVE-RESIDENCE-A-004 | FLOOR_PLAN | gallery | GRANTED_WRITTEN | desk_web | n/a (vector) |
| raw/progress.jpg | FIX-MED-ILL-ILLUSTRATIVE-RESIDENCE-A-005 | CONSTRUCTION_PROGRESS | gallery | GRANTED_VERBAL | desk_web | stripped |
| raw/siteplan.png | FIX-MED-ILL-ILLUSTRATIVE-RESIDENCE-A-006 | SITE_PLAN | gallery | RESTRICTED | — | none found |

Documents inventoried (private only): Brochure (fictional); Price list (fictional)

## 4. Gaps, disputes and weak support

- Missing required fields: none
- Disputed (conflicts opened, nothing overwritten): none
- Corroborated: FIX-PRJ-ILL-ILLUSTRATIVE-RESIDENCE-A.name
- Developer claims only (unverified): FIX-PRJ-ILL-ILLUSTRATIVE-RESIDENCE-A.delivery_status, FIX-PRJ-ILL-ILLUSTRATIVE-RESIDENCE-A.expected_delivery, FIX-AST-ILL-ILLUSTRATIVE-RESIDENCE-A-A1.unit_type, FIX-AST-ILL-ILLUSTRATIVE-RESIDENCE-A-A1.gross_area_m2, FIX-AST-ILL-ILLUSTRATIVE-RESIDENCE-A-A1.net_area_m2, FIX-AST-ILL-ILLUSTRATIVE-RESIDENCE-A-A1.delivery_status
- Tier 4 only: none
- Stale evidence (> 365 days or review date passed): none
- Professional due diligence required: none
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

**Gate G3-v1 for FIX-OPP-ILL-ILLUSTRATIVE-RESIDENCE-A: BLOCKED**

- record_status RESEARCH_IN_PROGRESS
- no G3-v1 review
- subject not reviewed
- no publishable cover
- no publishable gallery image
- no legally approved disclosure

Media publishability:

- FIX-MED-ILL-ILLUSTRATIVE-RESIDENCE-A-001 (RENDERING, cover): not publishable — illustrative; not reviewed
- FIX-MED-ILL-ILLUSTRATIVE-RESIDENCE-A-002 (RENDERING, gallery): not publishable — illustrative; not reviewed
- FIX-MED-ILL-ILLUSTRATIVE-RESIDENCE-A-003 (RENDERING, gallery): not publishable — illustrative; not reviewed
- FIX-MED-ILL-ILLUSTRATIVE-RESIDENCE-A-004 (FLOOR_PLAN, gallery): not publishable — illustrative; not reviewed
- FIX-MED-ILL-ILLUSTRATIVE-RESIDENCE-A-005 (CONSTRUCTION_PROGRESS, gallery): not publishable — illustrative; no written permission; not reviewed
- FIX-MED-ILL-ILLUSTRATIVE-RESIDENCE-A-006 (SITE_PLAN, gallery): not publishable — illustrative; no written permission; permission scope excludes desk_web; not reviewed
