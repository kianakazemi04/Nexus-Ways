// Methodology content for /desk/intelligence/. Describes only approved rules (Handoff §5–6, Spec v1, decision log); invents no method.
export const INTEL = [
  {
    slug: 'evaluation', title: 'Evaluation framework', short: 'What Nexus Desk assesses, what it does not, and why.',
    body: `<p>Nexus Desk evaluates an opportunity by documenting it to one standard: identity, developer, location, project and unit facts, documented risks, research status, data gaps, media permissions and disclosures. Each fact is stored once, in the record that owns it, and linked to its evidence.</p>
<h2>What is assessed in the MVP</h2>
<ul><li><strong>Identity and counterparty.</strong> The project and the developer's legal entity must be supported by primary or authoritative sources (Tier 1–3) before publication.</li>
<li><strong>Project and unit facts.</strong> Delivery status, expected delivery, layout and area, each with its source, period and verification status. Developer statements are labelled as developer claims.</li>
<li><strong>Documented risks.</strong> Cause, evidence, horizon, controllability, mitigation and residual uncertainty.</li>
<li><strong>Research status.</strong> Research Closure and Data Completeness, recorded separately for each intelligence domain.</li></ul>
<h2>What is not calculated in the MVP</h2>
<p>There is no composite score, ranking, fair value, yield or return projection, growth forecast, numeric risk probability or investment-fit result. Asset Quality and Investment Fit are separate concepts and stay inactive until their methodologies are documented, tested and approved. Their absence is shown explicitly rather than implied.</p>
<h2>Publication</h2>
<p>An opportunity is published only when a computed gate passes and the owner records an explicit review. The gate checks identity, developer, required fields, open conflicts, research blocks, documented risks, approved disclosures, a written-permission cover image and gallery. New evidence that breaks the gate withdraws the opportunity until it is reviewed again.</p>`
  },
  {
    slug: 'evidence-sources', title: 'Evidence and sources', short: 'Evidence classes, source tiers and verification labels.',
    body: `<p>Every material claim is an evidence record: the claim, its value and unit, geography, period, source, source tier, evidence class, verification status, retrieval date, limitations and next review. Conflicting sources are kept side by side and marked as unresolved; they are never reconciled silently.</p>
<h2>Evidence classes</h2>
<div class="enum"><div><span class="chip">Fact</span><p>Observable and documented.</p></div><div><span class="chip">Legal fact</span><p>Established by a legal or registry document.</p></div><div><span class="chip">Estimate</span><p>A calculated or approximated value with stated method.</p></div><div><span class="chip">Projection</span><p>A forward-looking statement, such as an expected delivery date.</p></div><div><span class="chip">Interpretation</span><p>An analytical reading of facts.</p></div><div><span class="chip">Hypothesis</span><p>A proposition still to be tested.</p></div><div><span class="chip">Opinion</span><p>A view held by a source; never treated as fact.</p></div><div><span class="chip">Data not available</span><p>No usable evidence exists; never treated as zero.</p></div></div>
<h2>Source tiers</h2>
<div class="enum"><div><span class="chip on">Tier 1</span><p>Primary or official: registries, regulators, official statistics.</p></div><div><span class="chip on">Tier 2</span><p>Authoritative secondary sources and reputable reporting.</p></div><div><span class="chip">Tier 3</span><p>Market and commercial material, including developer media kits.</p></div><div><span class="chip dim">Tier 4</span><p>Discovery only. Cannot support a published material claim without independent verification.</p></div></div>
<h2>Verification labels</h2>
<div class="enum"><div><span class="vs" data-v="VERIFIED">Verified</span><p>Confirmed against a primary source.</p></div><div><span class="vs" data-v="CORROBORATED">Corroborated</span><p>Consistent across independent sources.</p></div><div><span class="vs" data-v="SOURCE-REPORTED">Source-reported</span><p>Reported by one credible source, not independently confirmed.</p></div><div><span class="vs" data-v="DEVELOPER-CLAIM">Developer claim</span><p>Stated by the developer or its agents.</p></div><div><span class="vs" data-v="UNVERIFIED">Unverified</span><p>Not yet checked.</p></div></div>
<p>Labels are always written out; they never rely on colour alone.</p>`
  },
  {
    slug: 'pricing', title: 'Pricing', short: 'Price types, interpretation rules and why project prices are not published.',
    body: `<p>Nexus Desk does not publish project prices or project-specific price ranges. Current unit pricing changes often, depends on unit, floor, view and payment terms, and is best discussed directly. It is handled in consultation.</p>
<h2>Interpretation rules used in research</h2>
<ul><li>An asking price is not an achieved transaction price.</li><li>A price index is not an absolute price level.</li><li>Gross area is not net area; every area-based figure states its basis.</li><li>Currency, period, geography and definitions are preserved with every observation.</li><li>Missing prices are never filled, estimated silently or treated as zero.</li></ul>
<h2>What is not published</h2>
<p>No price filter or price sort, no fair value, no yield or return calculation. Internal price research is kept in a private store, separate from public content.</p>`
  },
  {
    slug: 'risk', title: 'Risk', short: 'Documented risks without scores or probabilities.',
    body: `<p>Each opportunity carries a documented risk list. A risk records its type, cause, supporting evidence, horizon, controllability, mitigation or diligence action, and residual uncertainty.</p>
<h2>What is not shown</h2>
<p>There is no risk score and no probability percentage. Severity and likelihood labels require an approved severity method; until it exists they are shown as <em>not assessed</em>. Missing evidence is never read as low risk.</p>
<h2>Typical risk types</h2>
<div class="enum"><div><p><strong>Legal and title</strong> — title type, encumbrances, permits.</p></div><div><p><strong>Developer and counterparty</strong> — legal identity, delivery record.</p></div><div><p><strong>Construction and delivery</strong> — progress, delivery terms.</p></div><div><p><strong>Regulatory and tax</strong> — rules that affect buyers.</p></div><div><p><strong>Currency</strong> — exposure between purchase and home currency.</p></div><div><p><strong>Seismic and physical</strong> — building standards and site conditions.</p></div></div>`
  },
  {
    slug: 'liquidity', title: 'Liquidity', short: 'What liquidity means here and the limits of available proxies.',
    body: `<p>Liquidity is the ability to exit a position within a reasonable time without a material discount. It depends on the specific asset, the buyer pool and market conditions.</p>
<h2>Limits of proxies</h2>
<ul><li>Transaction depth in a district is not the liquidity of a particular unit.</li><li>Listing volume is not demand.</li><li>Historical sales do not guarantee future resale.</li></ul>
<p>No liquidity assessment is calculated in the MVP. Where resale or transaction evidence exists it may be cited as evidence, with its scope and period, without a liquidity rating.</p>`
  },
  {
    slug: 'data-gaps', title: 'Data gaps', short: 'Missing-data states, and why closure differs from completeness.',
    body: `<p>Missing information is recorded explicitly for each field. A field either has a value backed by evidence, or one of four states:</p>
<div class="enum"><div><span class="fs">Data not available</span><p>No usable data exists for this field.</p></div><div><span class="fs">Accessible, not yet collected</span><p>The data exists and can be obtained; research has not reached it yet.</p></div><div><span class="fs">Professional due diligence required</span><p>Only a qualified professional (legal, technical, tax) can establish it.</p></div><div><span class="fs">Not applicable</span><p>The field does not apply to this record.</p></div></div>
<h2>Research Closure and Data Completeness</h2>
<p>These are independent. Research Closure says whether the research questions for a domain have been answered as far as currently possible; Data Completeness says whether the data itself is complete. Research can be closed while data remains incomplete — for example, when a figure is known not to be published anywhere.</p>
<p>Missing data never becomes zero, a positive or negative score, or a match.</p>`
  }
];
