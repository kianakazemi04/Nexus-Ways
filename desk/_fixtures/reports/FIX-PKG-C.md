# Ingestion report · FIX-PKG-C

Received 2026-10-21 · processed 2026-10-27 · store: ILLUSTRATIVE FIXTURES · APPLIED

**Opportunity:** FIX-OPP-ILL-ILLUSTRATIVE-RESIDENCE-C · **Project:** FIX-PRJ-ILL-ILLUSTRATIVE-RESIDENCE-C · **Developer:** FIX-DEV-ILLUSTRATIVE-DEVELOPER-C · **Market:** FIX-MKT-ILL (ACTIVE)

**Publication:** not published. Ingestion never publishes; publication requires a passing gate, the owner's explicit approval and an export.

## 1. Records

Created (28): FIX-SRC-PKG-C-S1, FIX-SRC-PKG-C-S2, FIX-SRC-PKG-C-S3, FIX-DEV-ILLUSTRATIVE-DEVELOPER-C, FIX-PRJ-ILL-ILLUSTRATIVE-RESIDENCE-C, FIX-AST-ILL-ILLUSTRATIVE-RESIDENCE-C-A1, FIX-OPP-ILL-ILLUSTRATIVE-RESIDENCE-C, FIX-EVD-ILL-ILLUSTRATIVE-RESIDENCE-C-0001, FIX-EVD-ILL-ILLUSTRATIVE-RESIDENCE-C-0002, FIX-EVD-ILL-ILLUSTRATIVE-RESIDENCE-C-0003, FIX-EVD-ILL-ILLUSTRATIVE-RESIDENCE-C-0004, FIX-EVD-ILL-ILLUSTRATIVE-RESIDENCE-C-0005, FIX-EVD-ILL-ILLUSTRATIVE-RESIDENCE-C-0006, FIX-EVD-ILL-ILLUSTRATIVE-RESIDENCE-C-0007, FIX-EVD-ILL-ILLUSTRATIVE-RESIDENCE-C-0008, FIX-EVD-ILL-ILLUSTRATIVE-RESIDENCE-C-0009, FIX-RB-PRJ-ILL-ILLUSTRATIVE-RESIDENCE-C-PROJECT-ASSET, FIX-RB-PRJ-ILL-ILLUSTRATIVE-RESIDENCE-C-DEVELOPER, FIX-RB-PRJ-ILL-ILLUSTRATIVE-RESIDENCE-C-RISK, FIX-RSK-ILL-ILLUSTRATIVE-RESIDENCE-C-01, FIX-RSK-ILL-ILLUSTRATIVE-RESIDENCE-C-02, FIX-DSC-ILL-ILLUSTRATIVE-RESIDENCE-C-01, FIX-MED-ILL-ILLUSTRATIVE-RESIDENCE-C-001, FIX-MED-ILL-ILLUSTRATIVE-RESIDENCE-C-002, FIX-MED-ILL-ILLUSTRATIVE-RESIDENCE-C-003, FIX-MED-ILL-ILLUSTRATIVE-RESIDENCE-C-004, FIX-MED-ILL-ILLUSTRATIVE-RESIDENCE-C-005, FIX-MED-ILL-ILLUSTRATIVE-RESIDENCE-C-006

Reused (0): —

Values set: FIX-DEV-ILLUSTRATIVE-DEVELOPER-C.legal_entity_name, FIX-PRJ-ILL-ILLUSTRATIVE-RESIDENCE-C.delivery_status, FIX-PRJ-ILL-ILLUSTRATIVE-RESIDENCE-C.expected_delivery, FIX-AST-ILL-ILLUSTRATIVE-RESIDENCE-C-A1.unit_type, FIX-AST-ILL-ILLUSTRATIVE-RESIDENCE-C-A1.gross_area_m2, FIX-AST-ILL-ILLUSTRATIVE-RESIDENCE-C-A1.net_area_m2, FIX-AST-ILL-ILLUSTRATIVE-RESIDENCE-C-A1.delivery_status

## 2. Fact mapping (intelligence domain → owning record)

| Fact | Domain | Owner record.field | Evidence | Class | Verification | Tier |
|---|---|---|---|---|---|---|
| F-NAME | PROJECT_ASSET | FIX-PRJ-ILL-ILLUSTRATIVE-RESIDENCE-C.name | FIX-EVD-ILL-ILLUSTRATIVE-RESIDENCE-C-0001 | FACT | VERIFIED | 1 |
| F-LEGAL | DEVELOPER | FIX-DEV-ILLUSTRATIVE-DEVELOPER-C.legal_entity_name | FIX-EVD-ILL-ILLUSTRATIVE-RESIDENCE-C-0002 | LEGAL FACT | VERIFIED | 1 |
| F-STATUS | PROJECT_ASSET | FIX-PRJ-ILL-ILLUSTRATIVE-RESIDENCE-C.delivery_status | FIX-EVD-ILL-ILLUSTRATIVE-RESIDENCE-C-0003 | FACT | DEVELOPER-CLAIM | 3 |
| F-DELIVERY | PROJECT_ASSET | FIX-PRJ-ILL-ILLUSTRATIVE-RESIDENCE-C.expected_delivery | FIX-EVD-ILL-ILLUSTRATIVE-RESIDENCE-C-0004 | PROJECTION | DEVELOPER-CLAIM | 3 |
| F-TYPE | PROJECT_ASSET | FIX-AST-ILL-ILLUSTRATIVE-RESIDENCE-C-A1.unit_type | FIX-EVD-ILL-ILLUSTRATIVE-RESIDENCE-C-0005 | FACT | DEVELOPER-CLAIM | 3 |
| F-GROSS | PROJECT_ASSET | FIX-AST-ILL-ILLUSTRATIVE-RESIDENCE-C-A1.gross_area_m2 | FIX-EVD-ILL-ILLUSTRATIVE-RESIDENCE-C-0006 | FACT | DEVELOPER-CLAIM | 3 |
| F-NET | PROJECT_ASSET | FIX-AST-ILL-ILLUSTRATIVE-RESIDENCE-C-A1.net_area_m2 | FIX-EVD-ILL-ILLUSTRATIVE-RESIDENCE-C-0007 | FACT | DEVELOPER-CLAIM | 3 |
| F-ADELIV | PROJECT_ASSET | FIX-AST-ILL-ILLUSTRATIVE-RESIDENCE-C-A1.delivery_status | FIX-EVD-ILL-ILLUSTRATIVE-RESIDENCE-C-0008 | FACT | DEVELOPER-CLAIM | 3 |
| F-AMEN | PROJECT_ASSET | FIX-PRJ-ILL-ILLUSTRATIVE-RESIDENCE-C | FIX-EVD-ILL-ILLUSTRATIVE-RESIDENCE-C-0009 | OPINION | UNVERIFIED | 4 |

Private-only facts routed to the private store (1): F-PRICE (PRICING; currency amount)

## 3. Media

| File | Media ID | Type | Role | Permission | Scope | Metadata |
|---|---|---|---|---|---|---|
| raw/exterior.jpg | FIX-MED-ILL-ILLUSTRATIVE-RESIDENCE-C-001 | RENDERING | cover | GRANTED_WRITTEN | desk_web | stripped (incl. GPS) |
| raw/interior.png | FIX-MED-ILL-ILLUSTRATIVE-RESIDENCE-C-002 | RENDERING | gallery | GRANTED_WRITTEN | desk_web | none found |
| raw/amenity.jpg | FIX-MED-ILL-ILLUSTRATIVE-RESIDENCE-C-003 | RENDERING | gallery | GRANTED_WRITTEN | desk_web | stripped |
| raw/plan-2plus1.svg | FIX-MED-ILL-ILLUSTRATIVE-RESIDENCE-C-004 | FLOOR_PLAN | gallery | GRANTED_WRITTEN | desk_web | n/a (vector) |
| raw/progress.jpg | FIX-MED-ILL-ILLUSTRATIVE-RESIDENCE-C-005 | CONSTRUCTION_PROGRESS | gallery | GRANTED_VERBAL | desk_web | stripped |
| raw/siteplan.png | FIX-MED-ILL-ILLUSTRATIVE-RESIDENCE-C-006 | SITE_PLAN | gallery | RESTRICTED | — | none found |

Documents inventoried (private only): Brochure (fictional); Price list (fictional)

## 4. Gaps, disputes and weak support

- Missing required fields: none
- Disputed (conflicts opened, nothing overwritten): none
- Corroborated: FIX-PRJ-ILL-ILLUSTRATIVE-RESIDENCE-C.name
- Developer claims only (unverified): FIX-PRJ-ILL-ILLUSTRATIVE-RESIDENCE-C.delivery_status, FIX-PRJ-ILL-ILLUSTRATIVE-RESIDENCE-C.expected_delivery, FIX-AST-ILL-ILLUSTRATIVE-RESIDENCE-C-A1.unit_type, FIX-AST-ILL-ILLUSTRATIVE-RESIDENCE-C-A1.gross_area_m2, FIX-AST-ILL-ILLUSTRATIVE-RESIDENCE-C-A1.net_area_m2, FIX-AST-ILL-ILLUSTRATIVE-RESIDENCE-C-A1.delivery_status
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

**Gate G3-v1 for FIX-OPP-ILL-ILLUSTRATIVE-RESIDENCE-C: BLOCKED**

- record_status RESEARCH_IN_PROGRESS
- no G3-v1 review
- subject not reviewed
- no publishable cover
- no publishable gallery image
- no legally approved disclosure

Media publishability:

- FIX-MED-ILL-ILLUSTRATIVE-RESIDENCE-C-001 (RENDERING, cover): not publishable — illustrative; not reviewed
- FIX-MED-ILL-ILLUSTRATIVE-RESIDENCE-C-002 (RENDERING, gallery): not publishable — illustrative; not reviewed
- FIX-MED-ILL-ILLUSTRATIVE-RESIDENCE-C-003 (RENDERING, gallery): not publishable — illustrative; not reviewed
- FIX-MED-ILL-ILLUSTRATIVE-RESIDENCE-C-004 (FLOOR_PLAN, gallery): not publishable — illustrative; not reviewed
- FIX-MED-ILL-ILLUSTRATIVE-RESIDENCE-C-005 (CONSTRUCTION_PROGRESS, gallery): not publishable — illustrative; no written permission; not reviewed
- FIX-MED-ILL-ILLUSTRATIVE-RESIDENCE-C-006 (SITE_PLAN, gallery): not publishable — illustrative; no written permission; permission scope excludes desk_web; not reviewed
