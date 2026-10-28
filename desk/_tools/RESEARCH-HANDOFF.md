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

## Commands
```
node desk/_tools/ingest.mjs ingest --package <pkg> --store <store>            # dry run: report only
node desk/_tools/ingest.mjs ingest --package <pkg> --store <store> --apply    # all-or-nothing write
node desk/_tools/ingest.mjs report --store <store> --id <OPP-…>               # private decision report
node desk/_tools/ingest.mjs gate   --store <store>                            # publication gate reasons
```
