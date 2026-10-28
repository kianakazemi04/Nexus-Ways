# Market gates — MG-1 (Istanbul · Dubai · Abu Dhabi)

Status (28 Oct 2026, after the engineering audit): **rules approved by the owner (registry ACTIVE / RULES_APPROVED); every
market still fails its own gate and stays INACTIVE.** A market becomes public only through activate-market → export-market
with its gate certificate. Market research (statistics, research blocks, district research) is private (PUB-2, owner
instruction 28 Oct 2026): it is evaluated in the store and never published; the site shows the market's status, the
per-project checks and the names of the sources used. This document is a research and control specification, not legal advice; every statutory item
below is an open check, not a conclusion.

## 1. Design

- **One engine, three configurations.** `desk/_tools/engines/marketgate.mjs` (MGE-1) contains no market-specific
  logic. Every rule lives in `desk/_tools/market-gates/MG-1.json`, one entry per market. Tests run the same engine on
  each configuration.
- **Computed, never hand-set.** A real market becomes ACTIVE only through
  `ingest.mjs activate-market --id <MKT> --by owner`, which recomputes that market's gate and refuses unless
  (a) the gate passes and (b) the registry entry `M-MARKET-GATE` is ACTIVE with `RULES_APPROVED` (approved 28 Oct 2026).
  Activation writes the stamp `review.gate_version = "MG-1"`, a non-confidential **gate certificate** (gate and engine
  versions, evaluation time, validity date, waived per-opportunity requirements — never figures, review text or counsel
  conditions) and an audit entry. `export-market --by owner` then publishes the market record with its certificate and
  the names of its districts, and removes any market research an earlier version left public; `deactivate-market --by
  owner --reason` rolls back.
- **Fail closed everywhere.** The validator (V21) rejects a real market that is ACTIVE/PUBLISHED (a) while the registry
  is INACTIVE, (b) in the private store, whenever its computed gate fails — including later, when evidence ages or a
  review is withdrawn — and (c) in the public tree, without the MG-1 activation stamp and gate certificate. On the public tree the gate is attested by the
  certificate: `valid_until` is the earliest date on which an input that made the gate pass (a statistic, a research
  block, the required district blocks, a statutory review) expires; after it, new opportunities are blocked and W04 is
  raised, without blocking deployments (so a withdrawal can always be published). V22 rejects any market or district
  research in the public tree. Opportunities in a market whose
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

**Named statistics** (official sources; VERIFIED/CORROBORATED FACT; no currency amounts; freshness from the end of the observation period):

| Key | Statistic | Why it is required | Accepted publisher(s) / type | Unit | Period | Geography | Max age | Required | Fallback if unavailable |
|---|---|---|---|---|---|---|---|---|---|
| IST-HOUSING-SALES | Residential sales, Istanbul province (monthly) | Activity level and direction; required before any statement about market activity. | TÜİK / TurkStat / Turkish Statistical Institute · OFFICIAL_STATISTICS | count | YYYY-MM | Istanbul | 75 d | yes | Gate fails; no activity statements until published data are recorded. |
| IST-FOREIGN-SALES | Residential sales to foreign nationals, Istanbul province (monthly) | Foreign-buyer demand is directly relevant to Desk's audience and to resale liquidity. | TÜİK / TurkStat / Turkish Statistical Institute · OFFICIAL_STATISTICS | count | YYYY-MM | Istanbul | 75 d | yes | Gate fails. |
| IST-RPPI | Residential Property Price Index, Istanbul (monthly) | Price direction from an official index (valuation-based; an index, not a price level). | TCMB / CBRT / Central Bank of the Republic of Türkiye · OFFICIAL_STATISTICS | index | YYYY-MM | Istanbul | 90 d | yes | Gate fails; never replaced by listing prices. |
| TR-CPI | Consumer price inflation, annual (monthly) | Nominal TRY figures are not comparable over time without inflation context. | TÜİK / TurkStat / Turkish Statistical Institute · OFFICIAL_STATISTICS | percent | YYYY-MM | Türkiye | 60 d | yes | Gate fails. |
| TR-POLICY-RATE | CBRT one-week repo (policy) rate | Financing conditions and the opportunity cost of capital in TRY. | TCMB / CBRT / Central Bank of the Republic of Türkiye · OFFICIAL_STATISTICS | percent | YYYY-MM-DD | Türkiye | 60 d | yes | Gate fails. |
| TR-FX-USDTRY | CBRT indicative USD/TRY rate | FX convention: TRY figures are converted only at a dated CBRT indicative rate. | TCMB / CBRT / Central Bank of the Republic of Türkiye · OFFICIAL_STATISTICS | ratio | YYYY-MM-DD | Türkiye | 7 d | yes | Gate fails; no conversion is shown. |

**FX convention.** CBRT indicative buying rate on the observation date of the converted figure; maximum age 7 days (CNV-1); no cross rates; conflicting rates open a conflict and block the gate.

**Statutory checks on Nexus Ways’ own activity** — recorded with record-review --by owner; valid 365 days:

| Topic | Question | Restriction until recorded | What the owner records | Accepted basis |
|---|---|---|---|---|
| IST-AGENT-AUTHORIZATION | Real-estate brokerage authorization: the Regulation on Real Estate Trade requires a brokerage authority certificate (taşınmaz ticareti yetki belgesi) for those who broker sales for a fee. Under which certificate (the owner's own, or a licensed firm's) does Nexus Ways present Istanbul projects and receive a commission? | Until recorded, no Istanbul opportunity is published; research pages are unaffected. | Certificate number and holder, or counsel's memo reference. | OWNER_OFFICIAL_REFERENCE, LICENSED_COUNSEL_TR |
| IST-ONLINE-LISTING-RULES | Ministry of Trade rules for online real-estate advertisements (verified-listing system, EİDS): do Desk opportunity pages fall within them, and if so what authorization reference must each page carry? | Until recorded, no Istanbul opportunity is published. | Official guidance or authorization reference, or counsel's memo reference. | OWNER_OFFICIAL_REFERENCE, LICENSED_COUNSEL_TR |
| IST-OFFPLAN-ADVERTISING | Advertising of off-plan (pre-paid) housing under the consumer-protection law and its pre-paid housing sales regulation: which statements must an advertisement for an unfinished project include or avoid? | Until recorded, no off-plan or under-construction Istanbul opportunity is published. | Counsel's memo reference, or the official regulation reference with the owner's checklist. | OWNER_OFFICIAL_REFERENCE, LICENSED_COUNSEL_TR |

**Per-opportunity requirements** (ESTABLISHED evidence from an accepted registry/regulator, not expired; plus the sales office’s written permission for the page and each image):

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

**Named statistics** (official sources; VERIFIED/CORROBORATED FACT; no currency amounts; freshness from the end of the observation period):

| Key | Statistic | Why it is required | Accepted publisher(s) / type | Unit | Period | Geography | Max age | Required | Fallback if unavailable |
|---|---|---|---|---|---|---|---|---|---|
| DXB-SALES-TX | Residential sales transactions registered with DLD (monthly) | Activity level from the official registry, not from portals. | Dubai Land Department / DLD / Dubai Pulse · OFFICIAL_STATISTICS, REGISTRY | count | YYYY-MM | Dubai | 60 d | yes | Gate fails. |
| DXB-OFFPLAN-SHARE | Off-plan share of residential sales (DLD, monthly) | Off-plan exposure changes delivery and resale risk. | Dubai Land Department / DLD / Dubai Pulse · OFFICIAL_STATISTICS, REGISTRY | percent | YYYY-MM | Dubai | 60 d | yes | Gate fails. |
| DXB-CPI | Consumer price inflation, Dubai | Inflation context for AED figures. | Dubai Statistics Center / DSC · OFFICIAL_STATISTICS | percent | YYYY-MM | Dubai | 120 d | yes | Gate fails. |
| AE-BASE-RATE | CBUAE base rate | Financing conditions in AED. | Central Bank of the UAE / CBUAE · OFFICIAL_STATISTICS | percent | YYYY-MM-DD | United Arab Emirates | 60 d | yes | Gate fails. |
| AE-FX-PEG | AED/USD reference rate (peg) | FX convention for AED; the peg is confirmed from the central bank, not assumed. | Central Bank of the UAE / CBUAE · OFFICIAL_STATISTICS | ratio | YYYY-MM-DD | United Arab Emirates | 400 d | yes | Gate fails. |

**FX convention.** AED/USD at the CBUAE reference rate confirmed within 400 days; other pairs need a dated CBUAE rate (CNV-1); conflicts block the gate.

**Statutory checks on Nexus Ways’ own activity** — recorded with record-review --by owner; valid 365 days:

| Topic | Question | Restriction until recorded | What the owner records | Accepted basis |
|---|---|---|---|---|
| DXB-AGENT-AUTHORIZATION | Broker authorization in Dubai: under which RERA/DLD broker registration (the owner's own broker card or freelance permit, or a licensed brokerage) does Nexus Ways market Dubai projects and receive a commission? | Until recorded, no Dubai opportunity is published. | Broker card / permit number and the licensed office, or counsel's memo reference. | OWNER_OFFICIAL_REFERENCE, LICENSED_COUNSEL_UAE |
| DXB-ADVERTISING-PERMIT | Real-estate advertisements in Dubai fall under the DLD advertising-permit system (Trakheesi). Whether and how it applies to Desk opportunity pages (a website hosted outside the UAE, run by a freelance agent) is not yet confirmed: record how the permit is obtained (per listing, through the licensed office) or the official basis on which it does not apply. Until then the permit is required (fail closed). | Each Dubai opportunity needs its advertising-permit number recorded (DXB-ADVERTISING-PERMIT requirement) unless this review records NOT_APPLICABLE. | Official DLD guidance reference and the issuing office, or counsel's memo reference. | OWNER_OFFICIAL_REFERENCE, LICENSED_COUNSEL_UAE |

**Per-opportunity requirements** (ESTABLISHED evidence from an accepted registry/regulator, not expired; plus the sales office’s written permission for the page and each image):

| Key | Requirement | Applies | Waiver |
|---|---|---|---|
| DXB-PROJECT-REGISTRATION | DLD project registration and status (project number, status, completion) | always | none |
| DXB-ESCROW-ACCOUNT | Escrow account registered for the project | OFF_PLAN, UNDER_CONSTRUCTION (or unknown status) | none |
| DXB-ADVERTISING-PERMIT | Advertising permit for the opportunity page, if counsel confirms it is required | always | only a valid DXB-ADVERTISING-PERMIT record with outcome NOT_APPLICABLE (shown publicly through the gate certificate) |

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

**Named statistics** (official sources; VERIFIED/CORROBORATED FACT; no currency amounts; freshness from the end of the observation period):

| Key | Statistic | Why it is required | Accepted publisher(s) / type | Unit | Period | Geography | Max age | Required | Fallback if unavailable |
|---|---|---|---|---|---|---|---|---|---|
| AUH-SALES-TX | Real estate sales transactions, Abu Dhabi (ADREC) | Activity level from the official registry; Dubai sources are not accepted for Abu Dhabi. | Abu Dhabi Real Estate Centre / ADREC / Department of Municipalities and Transport / DMT · OFFICIAL_STATISTICS, REGISTRY | count | YYYY-MM|YYYY-Q[1-4]|YYYY-H[1-2] | Abu Dhabi | 150 d | yes | Gate fails. |
| AUH-PRICE-INDEX | ADREC sales price index | Official price direction where published; optional because coverage and method must first be documented. | Abu Dhabi Real Estate Centre / ADREC · OFFICIAL_STATISTICS, REGISTRY | index | YYYY-MM|YYYY-Q[1-4]|YYYY-H[1-2] | Abu Dhabi | 150 d | no (optional) | Not required: if absent, no price-trend statement is made. |
| AUH-CPI | Consumer price inflation, Abu Dhabi | Inflation context for AED figures. | Statistics Centre Abu Dhabi / SCAD · OFFICIAL_STATISTICS | percent | YYYY-MM|YYYY-Q[1-4]|YYYY-H[1-2] | Abu Dhabi | 150 d | yes | Gate fails. |
| AE-BASE-RATE | CBUAE base rate | Financing conditions in AED. | Central Bank of the UAE / CBUAE · OFFICIAL_STATISTICS | percent | YYYY-MM-DD | United Arab Emirates | 60 d | yes | Gate fails. |
| AE-FX-PEG | AED/USD reference rate (peg) | FX convention for AED; confirmed from the central bank, not assumed. | Central Bank of the UAE / CBUAE · OFFICIAL_STATISTICS | ratio | YYYY-MM-DD | United Arab Emirates | 400 d | yes | Gate fails. |

**FX convention.** As for Dubai (same federal currency); recorded separately for Abu Dhabi so neither market depends on the other's evidence.

**Statutory checks on Nexus Ways’ own activity** — recorded with record-review --by owner; valid 365 days:

| Topic | Question | Restriction until recorded | What the owner records | Accepted basis |
|---|---|---|---|---|
| AUH-AGENT-AUTHORIZATION | Broker authorization in Abu Dhabi: under which ADREC/DMT broker licence or registration does Nexus Ways market Abu Dhabi projects and receive a commission? (Dubai registration does not apply in Abu Dhabi.) | Until recorded, no Abu Dhabi opportunity is published. | Licence / registration number and the licensed office, or counsel's memo reference. | OWNER_OFFICIAL_REFERENCE, LICENSED_COUNSEL_UAE |
| AUH-LISTING-PERMIT | Real-estate advertisements in Abu Dhabi fall under the Madhmoun listing-permit system (ADREC, via DARI). Whether and how it applies to Desk opportunity pages (a website hosted outside the UAE, run by a freelance agent) is not yet confirmed: record how the permit is obtained or the official basis on which it does not apply. Until then the permit is required (fail closed). Projects in ADGM areas follow ADGM's own advertising rules and are flagged per project. | Each Abu Dhabi opportunity needs its Madhmoun permit number recorded (AUH-LISTING-PERMIT requirement) unless this review records NOT_APPLICABLE. | Official ADREC guidance reference and the issuing office, or counsel's memo reference. | OWNER_OFFICIAL_REFERENCE, LICENSED_COUNSEL_UAE |

**Per-opportunity requirements** (ESTABLISHED evidence from an accepted registry/regulator, not expired; plus the sales office’s written permission for the page and each image):

| Key | Requirement | Applies | Waiver |
|---|---|---|---|
| AUH-PROJECT-REGISTRATION | ADREC project registration and status | always | none |
| AUH-ESCROW-ACCOUNT | Escrow details for off-plan projects | OFF_PLAN, UNDER_CONSTRUCTION (or unknown status) | none |
| AUH-LISTING-PERMIT | Madhmoun listing permit for the opportunity page, if counsel confirms it is required | always | only a valid AUH-LISTING-PERMIT record with outcome NOT_APPLICABLE (shown publicly through the gate certificate) |

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

## 5. Statutory checks

Owner instruction (28 Oct 2026): project-level advertising and media authorization comes from each sales office's
written permission, recorded privately per project (channels, activities, media, validity) and checked per page and per
image. Market-level topics are limited to statutory requirements that apply to Nexus Ways' own activity (the topics
configured per market in `MG-1.json`); each is recorded by the owner with an official reference or by counsel's memo,
with `record-review`, in the private store. Their status is tracked privately (owner decisions register), not in this
repository. A sales-office e-mail never substitutes for them.

## 6. Prerequisites that need the owner's manual action

1. **Private research store** — create the private repository or drive folder outside the public repository (the
   tools refuse any store inside it) and give the session access. Not created by Claude (standing rule).
2. **Statutory checks** — record them per market (section 5) with `record-review --by owner` and the official
   reference; counsel only where you choose or the rule is unclear.
3. **MG-1 rules — approved (28 Oct 2026).** The registry is ACTIVE / RULES_APPROVED; amendments are made in
   `MG-1.json` through a reviewed pull request.
4. **Market research intake** — supply or approve the official statistics and research blocks per market
   (`market-intake --file <MI-….json> --by owner`); Claude drafts the intake files from the official sources. The
   research cycle of 28 Oct 2026 (secondary sources, not verified) is held privately in the project
   (`nexus-desk/private/market-research-holding-2026-10-28.json`) until the store exists.
5. **Public gate record (D11) — implemented:** a waiver recorded privately reaches the public check only through the
   market's gate certificate written by `activate-market`.
6. **Public market activation step (D12) — implemented:** `export-market` and `deactivate-market` (tested).

## 7. Test evidence

`node --test desk/_tests/marketgate.test.mjs` — 55 tests, all passing (including activation → export → rollback, the certificate waiver and the validity date). Every
negative test spoils exactly one element of an otherwise passing synthetic (TEST-ONLY) dataset, for each of the three
configurations. Mutation checks (removing the review check, the geography check or the district check from the
engine) make 15, 3 and 9 tests fail respectively.
