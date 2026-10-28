# Market gates — MG-1 (Istanbul · Dubai · Abu Dhabi)

Status: **implemented on branch `desk/market-gates`, INACTIVE pending owner approval.** No market is active, no
opportunity is published, nothing is merged or deployed. Owner decisions D1 (superseded: three-market programme) and
D3 (shared engine, market-specific rules), 28 Oct 2026. This document is a research and control specification, not
legal advice; every legal item below is a question for counsel, not a conclusion.

## 1. Design

- **One engine, three configurations.** `desk/_tools/engines/marketgate.mjs` (MGE-1) contains no market-specific
  logic. Every rule lives in `desk/_tools/market-gates/MG-1.json`, one entry per market. Tests run the same engine on
  each configuration.
- **Computed, never hand-set.** A real market becomes ACTIVE only through
  `ingest.mjs activate-market --id <MKT> --by owner`, which recomputes that market's gate and refuses unless
  (a) the gate passes and (b) the registry entry `M-MARKET-GATE` is ACTIVE with `RULES_APPROVED` (the owner's approval
  of these rules). Activation writes the stamp `review.gate_version = "MG-1"` and an audit entry.
- **Fail closed everywhere.** The validator (V21) rejects a real market that is ACTIVE/PUBLISHED (a) while the registry
  is INACTIVE, (b) in the private store, whenever its computed gate fails — including later, when evidence ages or a
  review is withdrawn — and (c) in the public tree, without the MG-1 activation stamp. Opportunities in a market whose
  gate fails are not eligible, and each opportunity must also carry its market's per-project requirements.
- **Independent markets.** Each market is evaluated on its own records and its own review records. Dubai evidence and
  Dubai reviews never satisfy Abu Dhabi (and vice versa), even where the currency and federal FX source are shared. A
  market that passes is not held because another fails.
- **No invented thresholds.** No statistic has a pass value. The gate checks that each named statistic exists, comes
  from an accepted official publisher, is a verified fact, has the right unit, geography and period, is current under
  its documented freshness rule, is traceable to an owner, and is not in conflict. Freshness limits are tied to each
  source's publication rhythm (monthly statistics: about two months' lag; quarterly: about five months; FX: days).
- **Legal review is a separate record.** Only `private/regulatory_reviews.json` (written by `record-review --by owner`,
  append-only) counts. A research reference or LEGAL FACT evidence is never treated as legal approval. A review counts
  when it is COMPLETE, has an outcome, an accepted reviewer role, a reference, a date within the validity period, and
  was recorded by the owner. Outcome BLOCKING fails the gate; CONDITIONS passes and surfaces the conditions as
  publication restrictions in the gate report; NOT_APPLICABLE can waive a per-opportunity permit requirement.
- **Financial figures stay private** in all three markets (D10). Gate statistics never carry currency amounts.

## 2. Failure codes (machine-readable: `{ code, item, detail }`)

| Code | Meaning |
|---|---|
| MG_CONFIG | Market has no configuration, or its configuration is incomplete (an empty configuration never passes) |
| MG_SCOPE | Market record missing, outside the configured category, country or currency, or illustrative |
| MG_BLOCK_MISSING | Required research block absent |
| MG_BLOCK_NOT_CLOSED | Research Closure below the required state |
| MG_COMPLETENESS | Data Completeness below the configured minimum (independent of Closure) |
| MG_BLOCK_STALE | Block never reviewed, or reviewed longer ago than its limit |
| MG_DISTRICTS | Fewer districts with closed, current location research than required |
| MG_STAT_MISSING | Required statistic not recorded, or recorded without a value |
| MG_STAT_SOURCE | Publisher, source type or tier not accepted |
| MG_STAT_UNVERIFIED | Not VERIFIED/CORROBORATED, or not a FACT |
| MG_STAT_UNIT | Wrong unit, or a currency amount |
| MG_STAT_GEO | Wrong geography |
| MG_STAT_PERIOD | Period missing, malformed, or not yet ended |
| MG_STAT_STALE | Observation period ended longer ago than the freshness limit |
| MG_FX | FX reference statistic missing or unusable |
| MG_TRACE | Source missing, illustrative, no URL/locator, no retrieval or verification date, no owner (entity index) |
| MG_CONFLICT | Open conflict on gate evidence, the market or its districts, or two current records disagree |
| MG_GAP | Mandatory gap recorded on the market (DATA NOT AVAILABLE / NOT YET COLLECTED / PROFESSIONAL DD REQUIRED) |
| MG_REVIEW_MISSING / _INCOMPLETE / _EXPIRED / _INVALID / _BLOCKING | Legal review absent, not complete, out of date, malformed or not owner-recorded, or concluding "not permitted" |
| MG_REVIEWER | Reviewer role not accepted for this market |

Each evaluation records `gate_version`, `engine_version`, `market_id`, `evaluated_at` and the full list of reasons; the
`market-gate` command writes it to `reports/market-gate-<MKT>.json` and `.md` in the private store.

## 3. Three-market gate matrix

Generated from `MG-1.json` (the configuration is the source of truth).

### Istanbul (MKT-IST) — TR · TRY

**Scope.** Residential units in identified projects in Istanbul province. Excluded: Land, commercial units, short-term rental operations, citizenship-by-investment packaging.

**Research blocks** (market subject; Closure and Completeness checked separately):

| Block | Why | Closure | Completeness ≥ | Max age |
|---|---|---|---|---|
| MARKET | Istanbul housing market structure, demand and supply evidence, scope and limits of available data. | YES | PARTIAL | 365 d |
| MACRO_FX | Inflation, policy rate and currency convention relevant to Istanbul residential pricing. | YES | PARTIAL | 365 d |
| DEVELOPER | How developers are registered and verified in Istanbul; which registry is authoritative. | YES | PARTIAL | 365 d |
| PROJECT_ASSET | How projects, off-plan sales and permits are registered in Istanbul; what a valid project record looks like. | YES | PARTIAL | 365 d |
| RISK | Market-wide risks for Istanbul: regulatory, currency, delivery, liquidity and exit uncertainty (qualitative). | YES | PARTIAL | 365 d |
| DISTRICT × 1+ | At least one district of the market with closed, current location research | YES | PARTIAL | 365 d |

**Named statistics** (official sources only; Tier 1; VERIFIED/CORROBORATED FACT; no currency amounts; freshness measured from the end of the observation period):

| Key | Statistic | Why it is required | Accepted publisher(s) / type | Unit | Period | Geography | Max age | Required | Fallback if unavailable |
|---|---|---|---|---|---|---|---|---|---|
| IST-HOUSING-SALES | Residential sales, Istanbul province (monthly) | Activity level and direction; required before any statement about market activity. | TÜİK / TurkStat / Turkish Statistical Institute · OFFICIAL_STATISTICS | count | YYYY-MM | Istanbul | 75 d | yes | Gate fails; no activity statements until published data are recorded. |
| IST-FOREIGN-SALES | Residential sales to foreign nationals, Istanbul province (monthly) | Foreign-buyer demand is directly relevant to Desk's audience and to resale liquidity. | TÜİK / TurkStat / Turkish Statistical Institute · OFFICIAL_STATISTICS | count | YYYY-MM | Istanbul | 75 d | yes | Gate fails. |
| IST-RPPI | Residential Property Price Index, Istanbul (monthly) | Price direction from an official index (valuation-based; an index, not a price level). | TCMB / CBRT / Central Bank of the Republic of Türkiye · OFFICIAL_STATISTICS | index | YYYY-MM | Istanbul | 90 d | yes | Gate fails; never replaced by listing prices. |
| TR-CPI | Consumer price inflation, annual (monthly) | Nominal TRY figures are not comparable over time without inflation context. | TÜİK / TurkStat / Turkish Statistical Institute · OFFICIAL_STATISTICS | percent | YYYY-MM | Türkiye | 60 d | yes | Gate fails. |
| TR-POLICY-RATE | CBRT one-week repo (policy) rate | Financing conditions and the opportunity cost of capital in TRY. | TCMB / CBRT / Central Bank of the Republic of Türkiye · OFFICIAL_STATISTICS | percent | YYYY-MM-DD | Türkiye | 60 d | yes | Gate fails. |
| TR-FX-USDTRY | CBRT indicative USD/TRY rate | FX convention: TRY figures are converted only at a dated CBRT indicative rate. | TCMB / CBRT / Central Bank of the Republic of Türkiye · OFFICIAL_STATISTICS | ratio | YYYY-MM-DD | Türkiye | 7 d | yes | Gate fails; no conversion is shown. |

**FX convention.** CBRT indicative buying rate on the observation date of the converted figure; maximum age 7 days (CNV-1); no cross rates; conflicting rates open a conflict and block the gate.

**Legal / regulatory review** — reviewer role: LICENSED_COUNSEL_TR; a COMPLETE review is valid for 365 days (or its own valid_until if earlier).

| Topic | Question for counsel |
|---|---|
| IST-FOREIGN-OWNERSHIP | Eligibility of foreign buyers, restricted or military zones, and title verification through TKGM: what must be checked per project before it is shown? |
| IST-BROKERAGE-AUTH | Does presenting opportunities and receiving a commission require a real-estate brokerage authority certificate (Taşınmaz Ticareti Hakkında Yönetmelik) for Nexus Ways? |
| IST-LISTING-VERIFICATION | Are Desk opportunity pages 'listings' subject to the Ministry of Trade verified-listing system (EİDS)? If so, what is required? |
| IST-ADVERTISING-CONSUMER | Advertising and consumer-protection rules for property marketing, including pre-paid (off-plan) housing sales under Law No. 6502. |
| IST-DATA-PROTECTION | KVKK: consultation form, privacy notice, and transfer of form data abroad through Web3Forms. |
| IST-NOT-ADVICE | Boundary with regulated investment advice: is the Desk wording and consultation model outside capital-markets licensing? |

**Per-opportunity requirements** (ESTABLISHED evidence from an accepted registry/regulator, not expired):

| Key | Requirement | Applies | Waiver |
|---|---|---|---|
| IST-TITLE-STATUS | Title status of the project (kat irtifakı / kat mülkiyeti) from TKGM or a registry document | always | none |
| IST-BUILDING-PERMIT | Building permit (yapı ruhsatı) for projects not yet completed | OFF_PLAN, UNDER_CONSTRUCTION (or unknown status) | none |

**Publication restrictions.** Financial figures: PRIVATE (D10). Categories: real_estate.

### Dubai (MKT-DXB) — AE · AED

**Scope.** Residential units in DLD-registered projects in the Emirate of Dubai. Excluded: Land, commercial units, holiday-home operations, projects not registered with DLD.

**Research blocks** (market subject; Closure and Completeness checked separately):

| Block | Why | Closure | Completeness ≥ | Max age |
|---|---|---|---|---|
| MARKET | Dubai housing market structure, demand and supply evidence, scope and limits of available data. | YES | PARTIAL | 365 d |
| MACRO_FX | Inflation, policy rate and currency convention relevant to Dubai residential pricing. | YES | PARTIAL | 365 d |
| DEVELOPER | How developers are registered and verified in Dubai; which registry is authoritative. | YES | PARTIAL | 365 d |
| PROJECT_ASSET | How projects, off-plan sales and permits are registered in Dubai; what a valid project record looks like. | YES | PARTIAL | 365 d |
| RISK | Market-wide risks for Dubai: regulatory, currency, delivery, liquidity and exit uncertainty (qualitative). | YES | PARTIAL | 365 d |
| DISTRICT × 1+ | At least one district of the market with closed, current location research | YES | PARTIAL | 365 d |

**Named statistics** (official sources only; Tier 1; VERIFIED/CORROBORATED FACT; no currency amounts; freshness measured from the end of the observation period):

| Key | Statistic | Why it is required | Accepted publisher(s) / type | Unit | Period | Geography | Max age | Required | Fallback if unavailable |
|---|---|---|---|---|---|---|---|---|---|
| DXB-SALES-TX | Residential sales transactions registered with DLD (monthly) | Activity level from the official registry, not from portals. | Dubai Land Department / DLD / Dubai Pulse · OFFICIAL_STATISTICS, REGISTRY | count | YYYY-MM | Dubai | 60 d | yes | Gate fails. |
| DXB-OFFPLAN-SHARE | Off-plan share of residential sales (DLD, monthly) | Off-plan exposure changes delivery and resale risk. | Dubai Land Department / DLD / Dubai Pulse · OFFICIAL_STATISTICS, REGISTRY | percent | YYYY-MM | Dubai | 60 d | yes | Gate fails. |
| DXB-CPI | Consumer price inflation, Dubai | Inflation context for AED figures. | Dubai Statistics Center / DSC · OFFICIAL_STATISTICS | percent | YYYY-MM | Dubai | 120 d | yes | Gate fails. |
| AE-BASE-RATE | CBUAE base rate | Financing conditions in AED. | Central Bank of the UAE / CBUAE · OFFICIAL_STATISTICS | percent | YYYY-MM-DD | United Arab Emirates | 60 d | yes | Gate fails. |
| AE-FX-PEG | AED/USD reference rate (peg) | FX convention for AED; the peg is confirmed from the central bank, not assumed. | Central Bank of the UAE / CBUAE · OFFICIAL_STATISTICS | ratio | YYYY-MM-DD | United Arab Emirates | 400 d | yes | Gate fails. |

**FX convention.** AED/USD at the CBUAE reference rate confirmed within 400 days; other pairs need a dated CBUAE rate (CNV-1); conflicts block the gate.

**Legal / regulatory review** — reviewer role: LICENSED_COUNSEL_UAE; a COMPLETE review is valid for 365 days (or its own valid_until if earlier).

| Topic | Question for counsel |
|---|---|
| DXB-BROKER-LICENSING | Does marketing Dubai projects and receiving a commission require a RERA/DLD broker licence or a licensed partner? |
| DXB-ADVERTISING-PERMIT | Does each Desk opportunity page require a Trakheesi advertising permit (including a website hosted outside the UAE)? |
| DXB-OFFPLAN-ESCROW | Off-plan rules: DLD project registration, escrow under Law No. 8 of 2007, Oqood — what must be verified per project? |
| DXB-DATA-PROTECTION | UAE data-protection law for the consultation form and the transfer through Web3Forms. |
| DXB-NOT-ADVICE | Boundary with regulated financial promotion and investment advice in the UAE. |

**Per-opportunity requirements** (ESTABLISHED evidence from an accepted registry/regulator, not expired):

| Key | Requirement | Applies | Waiver |
|---|---|---|---|
| DXB-PROJECT-REGISTRATION | DLD project registration and status (project number, status, completion) | always | none |
| DXB-ESCROW-ACCOUNT | Escrow account registered for the project | OFF_PLAN, UNDER_CONSTRUCTION (or unknown status) | none |
| DXB-ADVERTISING-PERMIT | Advertising permit for the opportunity page, if counsel confirms it is required | always | only a COMPLETE, valid DXB-ADVERTISING-PERMIT review with outcome NOT_APPLICABLE |

**Publication restrictions.** Financial figures: PRIVATE (D10). Categories: real_estate.

### Abu Dhabi (MKT-AUH) — AE · AED

**Scope.** Residential units in ADREC-registered projects in the Emirate of Abu Dhabi (ADGM areas assessed separately). Excluded: Land, commercial units, holiday-home operations, projects not registered with ADREC.

**Research blocks** (market subject; Closure and Completeness checked separately):

| Block | Why | Closure | Completeness ≥ | Max age |
|---|---|---|---|---|
| MARKET | Abu Dhabi housing market structure, demand and supply evidence, scope and limits of available data. | YES | PARTIAL | 365 d |
| MACRO_FX | Inflation, policy rate and currency convention relevant to Abu Dhabi residential pricing. | YES | PARTIAL | 365 d |
| DEVELOPER | How developers are registered and verified in Abu Dhabi; which registry is authoritative. | YES | PARTIAL | 365 d |
| PROJECT_ASSET | How projects, off-plan sales and permits are registered in Abu Dhabi; what a valid project record looks like. | YES | PARTIAL | 365 d |
| RISK | Market-wide risks for Abu Dhabi: regulatory, currency, delivery, liquidity and exit uncertainty (qualitative). | YES | PARTIAL | 365 d |
| DISTRICT × 1+ | At least one district of the market with closed, current location research | YES | PARTIAL | 365 d |

**Named statistics** (official sources only; Tier 1; VERIFIED/CORROBORATED FACT; no currency amounts; freshness measured from the end of the observation period):

| Key | Statistic | Why it is required | Accepted publisher(s) / type | Unit | Period | Geography | Max age | Required | Fallback if unavailable |
|---|---|---|---|---|---|---|---|---|---|
| AUH-SALES-TX | Real estate sales transactions, Abu Dhabi (ADREC) | Activity level from the official registry; Dubai sources are not accepted for Abu Dhabi. | Abu Dhabi Real Estate Centre / ADREC / Department of Municipalities and Transport / DMT · OFFICIAL_STATISTICS, REGISTRY | count | YYYY-MM|YYYY-Q[1-4] | Abu Dhabi | 120 d | yes | Gate fails. |
| AUH-PRICE-INDEX | ADREC sales price index | Official price direction where published; optional because coverage and method must first be documented. | Abu Dhabi Real Estate Centre / ADREC · OFFICIAL_STATISTICS, REGISTRY | index | YYYY-MM|YYYY-Q[1-4] | Abu Dhabi | 150 d | no (optional) | Not required: if absent, no price-trend statement is made. |
| AUH-CPI | Consumer price inflation, Abu Dhabi | Inflation context for AED figures. | Statistics Centre Abu Dhabi / SCAD · OFFICIAL_STATISTICS | percent | YYYY-MM|YYYY-Q[1-4] | Abu Dhabi | 150 d | yes | Gate fails. |
| AE-BASE-RATE | CBUAE base rate | Financing conditions in AED. | Central Bank of the UAE / CBUAE · OFFICIAL_STATISTICS | percent | YYYY-MM-DD | United Arab Emirates | 60 d | yes | Gate fails. |
| AE-FX-PEG | AED/USD reference rate (peg) | FX convention for AED; confirmed from the central bank, not assumed. | Central Bank of the UAE / CBUAE · OFFICIAL_STATISTICS | ratio | YYYY-MM-DD | United Arab Emirates | 400 d | yes | Gate fails. |

**FX convention.** As for Dubai (same federal currency); recorded separately for Abu Dhabi so neither market depends on the other's evidence.

**Legal / regulatory review** — reviewer role: LICENSED_COUNSEL_UAE; a COMPLETE review is valid for 365 days (or its own valid_until if earlier).

| Topic | Question for counsel |
|---|---|
| AUH-BROKER-LICENSING | Does marketing Abu Dhabi projects and receiving a commission require an ADREC/DMT broker licence or a licensed partner? |
| AUH-LISTING-PERMIT | Does each Desk opportunity page require a Madhmoun listing permit (ADREC/DARI), including a website hosted outside the UAE? |
| AUH-ADGM-JURISDICTION | For projects in ADGM areas (e.g. Al Reem, Al Maryah): which ADGM advertising permit and rules apply instead of, or in addition to, ADREC's? |
| AUH-OFFPLAN-REGISTRATION | Off-plan rules under Law No. 3 of 2015 as amended: project registration, initial register, escrow — what must be verified per project? |
| AUH-FOREIGN-OWNERSHIP-ZONES | Where can foreign buyers acquire freehold or other rights in Abu Dhabi, and how is that verified per project? |
| AUH-DATA-PROTECTION | Data-protection law applicable to the consultation form for Abu Dhabi enquiries (UAE / ADGM). |
| AUH-NOT-ADVICE | Boundary with regulated financial promotion and investment advice. |

**Per-opportunity requirements** (ESTABLISHED evidence from an accepted registry/regulator, not expired):

| Key | Requirement | Applies | Waiver |
|---|---|---|---|
| AUH-PROJECT-REGISTRATION | ADREC project registration and status | always | none |
| AUH-ESCROW-ACCOUNT | Escrow details for off-plan projects | OFF_PLAN, UNDER_CONSTRUCTION (or unknown status) | none |
| AUH-LISTING-PERMIT | Madhmoun listing permit for the opportunity page, if counsel confirms it is required | always | only a COMPLETE, valid AUH-LISTING-PERMIT review with outcome NOT_APPLICABLE |

**Publication restrictions.** Financial figures: PRIVATE (D10). Categories: real_estate.

## 4. Market-specific sources: scope and limits (to confirm at intake)

Identified on 28 Oct 2026 from the publishers' own portals and secondary legal commentary. Exact dataset pages,
series codes and publication calendars are recorded at intake; nothing below is a verified statistic.

**Istanbul**
- TÜİK (TurkStat) — monthly house-sales statistics by province, including sales to foreign nationals
  (data.tuik.gov.tr). Limit: counts of transactions, not prices; revisions possible.
- TCMB (CBRT) — Residential Property Price Index for Istanbul, monthly, through EVDS (evds2.tcmb.gov.tr). Limit:
  valuation-based index with a revised methodology; an index level, never a price.
- TÜİK CPI and the CBRT policy rate; CBRT indicative exchange rates for USD/TRY.
- TKGM (Land Registry) — title records per project; Ministry of Trade verified-listing system (EİDS) — applicability is
  a legal question (IST-LISTING-VERIFICATION).

**Dubai**
- Dubai Land Department (dubailand.gov.ae) and Dubai Pulse open data — registered transactions (including off-plan
  share), projects, developers, brokers; DLD project status enquiry (project number, status, completion).
- Law No. 8 of 2007 (escrow accounts) via the Dubai legislation portal (dlp.dubai.gov.ae); Trakheesi advertising
  permits (applicability to Desk is DXB-ADVERTISING-PERMIT).
- Dubai Statistics Center — CPI. CBUAE — base rate and the AED/USD reference rate (3.6725), confirmed from the central
  bank, not assumed.
- Limit: Dubai sources are never accepted for Abu Dhabi.

**Abu Dhabi**
- ADREC (Abu Dhabi Real Estate Centre, under DMT) — project search, transactions and the sales/rent index
  (adrec.gov.ae/en/property_and_index); Madhmoun listing permits via DARI.
- Law No. 3 of 2015 regulating the real estate sector (as amended) — project registration, initial register, escrow.
- ADGM — separate advertising regime for projects in ADGM areas (Al Reem, Al Maryah); counsel to confirm.
- Statistics Centre Abu Dhabi (SCAD) — CPI. CBUAE — base rate and AED/USD (recorded separately for Abu Dhabi).
- Limit: index coverage and method to be documented before AUH-PRICE-INDEX is relied on (it is optional for that
  reason).

## 5. Unresolved legal questions (counsel required before any activation)

All topics listed in the matrix are open: no review record exists for any market. In addition, two cross-market
questions apply to every market: (1) whether Nexus Ways' commission arrangement must be disclosed in a prescribed form
in each jurisdiction (linked to disclosure kind COMMISSION, legal review pending), and (2) whether the Desk consultation
form's transfer through Web3Forms requires a data-processing agreement or transfer mechanism (TR KVKK, UAE PDPL; ADGM
data protection where relevant).

## 6. Prerequisites that need the owner's manual action

1. **Private research store** — create the private repository or drive folder outside the public repository (the
   tools refuse any store inside it) and give the session access. Not created by Claude (standing rule).
2. **Legal counsel** — instruct licensed counsel in Türkiye and in the UAE (Dubai and Abu Dhabi separately, plus ADGM
   where relevant) on the topics above; record each answer with `record-review --by owner`, with the memo reference.
3. **Approve or amend the MG-1 rules** — especially freshness limits, reviewer roles and per-opportunity requirements.
   On approval, the registry entry `M-MARKET-GATE` is set to ACTIVE / RULES_APPROVED in a reviewed commit.
4. **Market research intake** — supply or approve the official statistics and research blocks per market
   (`market-intake --file <MI-….json> --by owner`); Claude drafts the intake files from the official sources.
5. **Decide the public gate record (proposed D11)** — the public validator cannot see private review records, so a
   counsel waiver (NOT_APPLICABLE) of a Dubai/Abu Dhabi permit cannot be honoured at export time; the permit
   requirement therefore always applies publicly. Options: keep it (strictest), or publish a non-confidential gate
   certificate (gate version, date, pass, waived topics) — owner decision.
6. **Public market activation step** — `activate-market` changes the private store only. Exporting an activated
   market record to the public tree (`export-market`) is not built in this milestone and needs owner review first.

## 7. Test evidence

`node --test desk/_tests/marketgate.test.mjs` — 48 tests, all passing; the full suite (147 tests) passes. Every
negative test spoils exactly one element of an otherwise passing synthetic (TEST-ONLY) dataset, for each of the three
configurations. Mutation checks (removing the review check, the geography check or the district check from the
engine) make 15, 3 and 9 tests fail respectively.

- 1. configuration: one shared version, three separate market configurations, every rule documented
- 2. configuration: an emptied market configuration can never pass by being empty
- 3. period conventions: monthly, quarterly, daily and annual observation periods end where expected
- 4. MKT-IST: a complete, current, verified, reviewed dataset passes, with a machine-readable report
- 5. MKT-DXB: a complete, current, verified, reviewed dataset passes, with a machine-readable report
- 6. MKT-AUH: a complete, current, verified, reviewed dataset passes, with a machine-readable report
- 7. MKT-IST: fails closed when evidence is absent (market record only)
- 8. MKT-IST: every required research block, statistic and review topic is individually mandatory
- 9. MKT-IST: Research Closure and Data Completeness are independent states
- 10. MKT-IST: stale evidence fails (blocks, statistics, FX)
- 11. MKT-IST: only accepted official sources, verified facts, the right unit and geography count
- 12. MKT-IST: evidence ownership and traceability are required
- 13. MKT-IST: unresolved material conflicts and recorded gaps block the gate
- 14. MKT-IST: legal review must be COMPLETE, current, by an accepted reviewer and recorded by the owner — evidence never substitutes
- 15. MKT-IST: scope — category, country and currency must match the market configuration
- 16. MKT-DXB: fails closed when evidence is absent (market record only)
- 17. MKT-DXB: every required research block, statistic and review topic is individually mandatory
- 18. MKT-DXB: Research Closure and Data Completeness are independent states
- 19. MKT-DXB: stale evidence fails (blocks, statistics, FX)
- 20. MKT-DXB: only accepted official sources, verified facts, the right unit and geography count
- 21. MKT-DXB: evidence ownership and traceability are required
- 22. MKT-DXB: unresolved material conflicts and recorded gaps block the gate
- 23. MKT-DXB: legal review must be COMPLETE, current, by an accepted reviewer and recorded by the owner — evidence never substitutes
- 24. MKT-DXB: scope — category, country and currency must match the market configuration
- 25. MKT-AUH: fails closed when evidence is absent (market record only)
- 26. MKT-AUH: every required research block, statistic and review topic is individually mandatory
- 27. MKT-AUH: Research Closure and Data Completeness are independent states
- 28. MKT-AUH: stale evidence fails (blocks, statistics, FX)
- 29. MKT-AUH: only accepted official sources, verified facts, the right unit and geography count
- 30. MKT-AUH: evidence ownership and traceability are required
- 31. MKT-AUH: unresolved material conflicts and recorded gaps block the gate
- 32. MKT-AUH: legal review must be COMPLETE, current, by an accepted reviewer and recorded by the owner — evidence never substitutes
- 33. MKT-AUH: scope — category, country and currency must match the market configuration
- 34. Dubai and Abu Dhabi are separate: Dubai sources and Dubai reviews do not satisfy Abu Dhabi
- 35. markets are evaluated independently: one passing market is not held by another failing market
- 36. Abu Dhabi: the optional ADREC price index may be absent, but a recorded one must still be valid
- 37. MKT-IST: per-opportunity registration / permit / title evidence is required and must be ESTABLISHED
- 38. MKT-DXB: per-opportunity registration / permit / title evidence is required and must be ESTABLISHED
- 39. MKT-AUH: per-opportunity registration / permit / title evidence is required and must be ESTABLISHED
- 40. requirements: off-plan conditions apply by delivery status; unknown status fails closed
- 41. requirements: an advertising / listing permit is waived only by a COMPLETE NOT_APPLICABLE review — never in public validation
- 42. MKT-IST: validator — a hand-activated market is V21 while its computed gate fails; the stamp alone is not enough
- 43. MKT-DXB: validator — a hand-activated market is V21 while its computed gate fails; the stamp alone is not enough
- 44. MKT-AUH: validator — a hand-activated market is V21 while its computed gate fails; the stamp alone is not enough
- 45. real repository: all three markets INACTIVE, gate INACTIVE pending owner approval; each market fails closed on the public data
- 46. commands: market-intake + record-review + market-gate; activate-market is refused while the owner has not approved the gate rules
- 47. commands (simulated owner approval of the rules): each market is activated only if its own gate passes
- 48. market intake refuses records outside the market, currency amounts and unowned overwrites — nothing written
