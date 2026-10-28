# Owner → Claude research handoff (private)

What the owner sends, what Claude produces, and where each file lives. Nothing in this flow is synchronised
automatically: Claude's browser session is not connected to GitHub and to the private store. Every file below is
written by Claude in the working session and saved by the owner (or by Claude, when the session has access) to the
private store. The public repository receives only what `export` writes after owner approval.

## What the owner sends
- Brochure / catalogue (PDF), price list, payment plan, floor plans, photographs and renderings, permission e-mail for
  images, any contract or registry document. Send in the chat or place in the private drive folder `/<project>/<date>/`.
- Optional: the investor profile (objectives, horizon, budget) for a fit check.

## What Claude does (and does not)
1. Reads the supplied files; lists every project characteristic and developer claim with the page it came from.
2. Researches public sources it can actually open (developer site, registries, municipal and transport authorities,
   reputable market sources). Records URL, retrieval date, scope and limitations. States explicitly when a source could
   not be accessed. Brochure statements are DEVELOPER-CLAIM, never independent verification.
3. Writes `intake.json` (template `intake-template.json`): sources with tier and type; facts with subject, field, value,
   unit, class, verification, period, locator; unknowns with their missing-data state; risks; disclosures; media with
   permission. Prices, rents and payment plans go in `facts` with `"domain": "PRICING"` / `"RENTAL"` (private).
   Existing records are linked with `ref` (never by name).
4. Writes `private/analysis/<OPP>.json` (template `analysis-template.json`): finance inputs, scenarios, comparables,
   FX table, investor profile, findings — every number with its `ref`.
5. Runs: `ingest … --apply` (after the owner reviews the dry run), then `report`. Reviews the report and lists the
   unresolved gaps.
- Does not infer distances, legal status, completion, rents or returns from images or marketing language; does not
  circumvent site restrictions; does not publish images without written permission.

## The project workflow, step by step
1. **Owner → Claude:** catalogue / brochure, price list, payment plan, floor plans, photos and renderings, and the
   sales office's permission e-mail, sent in the chat.
2. **Extraction:** every project fact and developer claim with its file and page (`source_locator`); brochure statements
   are DEVELOPER-CLAIM, never independent verification.
3. **Public research:** registries and official sources Claude can actually open, with URL, date, period, unit,
   verification status and limitations; inaccessible sources are named as such.
4. **Permission record** (`intake.json` → `permissions`, or later `record-permission`): issuing sales office, project,
   permitted channels and activities, the media it names, scope and validity; the e-mail is kept privately with its
   SHA-256. It authorizes only what it states: an image or channel it does not name stays unpublished.
5. **Ingest** (dry run, then `--apply`), **report** with the private analysis file (finance, comparables, fit), and
   **compare** across the opportunities in the store (research queue, not a ranking).
6. **Gaps and diligence:** the decision report lists missing data (`DATA NOT AVAILABLE`), conflicts, exit diligence and
   next steps; the gate lists every reason that blocks publication.
7. **Owner decisions:** approve-disclosure (after legal review), approve-media per image, approve.
8. **Export → build → validate → commit on a branch → CI → merge → deploy → live check.** Claude does these steps in
   the working session (it has push access to the repository); the private store must still be created by the owner.

A full run on clearly labelled demonstration data: `node desk/_tools/demo/run-demo.mjs --out <dir>` (throw-away copies
only; it also re-computes NPV and ROI by hand and checks that no private figure reached the public tree).

## Commands
```
node desk/_tools/ingest.mjs ingest --package <pkg> --store <store>            # dry run: report only
node desk/_tools/ingest.mjs ingest --package <pkg> --store <store> --apply    # all-or-nothing write
node desk/_tools/ingest.mjs report --store <store> --id <OPP-…>               # private decision report
node desk/_tools/ingest.mjs gate   --store <store>                            # publication gate reasons
node desk/_tools/ingest.mjs compare --store <store> --ids <OPP-…>,<OPP-…>       # side by side + research queue (private)
node desk/_tools/ingest.mjs record-permission --file <perm.json> --store <store> --by owner   # permission received later
node desk/_tools/ingest.mjs market-intake --file <MI-….json> --store <store> --by owner   # market statistics, blocks, districts
node desk/_tools/ingest.mjs record-review --store <store> --market <MKT> --topic <KEY> --status COMPLETE --outcome CLEAR \
     --reviewer "<counsel>" --role <ROLE> --reference "<memo ref>" --reviewed-at <date> --by owner   # counsel's answer only
node desk/_tools/ingest.mjs market-gate   --store <store> [--id <MKT>]          # computed gate per market (private report)
node desk/_tools/ingest.mjs activate-market --store <store> --id <MKT> --by owner # refused unless that market's gate passes
```

## Market research (MG-1)
Claude drafts one market intake file per market (`MI-<MKT>-<date>.json`: sources, evidence with `topic` = the statistic
key from `market-gates/MG-1.json`, research blocks, districts) from the official sources listed in `MARKET-GATES.md`,
with URL, period, unit and retrieval date for every figure. Claude never records a legal review: the owner records
counsel's answer with `record-review`.
