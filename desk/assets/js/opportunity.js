// Opportunity profile: one data-driven template for every opportunity. Everything is resolved from the opportunity ID only.
import { ready } from './core.js';
import { esc, tx, lab, chip, vs, fmtDate, gallery, bindGallery, factRows, bindEvidence, researchBlocks, gaps, conflicts, risks, unavailable, reveal, openDrawer } from './ui.js';

const D = await ready;
const host = document.getElementById('opp');
const id = host.dataset.id || (D.fixture ? new URLSearchParams(location.search).get('id') : null);
const o = id ? D.opportunity(id) : null;

if (!o) {
  document.title = 'Opportunity not available | Nexus Desk';
  host.innerHTML = `<section class="pi"><div class="eb">Opportunity</div><h1 style="margin-top:20px">Not available.</h1></section><div class="sec"><div class="empty"><span class="lab">Not available</span><h3>This opportunity is not published.</h3><p>It may not exist, may still be under research, or may have been withheld pending review. Only reviewed opportunities are shown.</p><div><a class="btn o sm" href="${D.withFixtureFlag('/desk/')}">Back to Explore <i>→</i></a></div></div></div>`;
} else {
  const p = D.project(o); const dev = D.developer(p); const dist = D.district(p); const area = D.area(p); const a = D.asset(o); const m = D.market(o.market_id);
  const gate = D.fixture ? D.gateFor(o.id) : null;
  document.title = `${(o.title && o.title.en) || 'Opportunity'} | Nexus Desk`;
  const fmtMonth = (v) => { const [y, mm] = String(v).split('-'); return mm ? `${['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][+mm - 1]} ${y}` : y; };
  const facts = factRows(D, [
    ['Project name', 'project', p, 'name'],
    ['Developer', 'developer', dev, 'name'],
    ['Developer legal entity', 'developer', dev, 'legal_entity_name'],
    ['District', 'project', p, 'district_id', () => dist ? dist.name : ''],
    ['Delivery status', 'project', p, 'delivery_status', (v) => lab('delivery_status', v)],
    ['Expected delivery', 'project', p, 'expected_delivery', fmtMonth],
    ['Asset types', 'project', p, 'asset_types', (v) => v.map(t => lab('asset_type', t)).join(', ')],
    ['Unit layout', 'asset', a, 'unit_type'],
    ['Gross area', 'asset', a, 'gross_area_m2', (v) => `${v} m² gross`],
    ['Net area', 'asset', a, 'net_area_m2', (v) => `${v} m² net`]
  ]);
  const refs = [{ type: 'project', id: p && p.id }, { type: 'opportunity', id: o.id }, dev && { type: 'developer', id: dev.id }, a && { type: 'asset', id: a.id }].filter(r => r && r.id);
  const cfs = D.conflictsFor(refs).filter(c => c.status === 'OPEN');
  const gapItems = [];
  for (const [rec, label] of [[p, 'Project'], [dev, 'Developer'], [a, 'Unit'], [o, 'Opportunity']]) if (rec) for (const s of rec.field_states || []) gapItems.push({ label: `${label} · ${s.field.replace(/_/g, ' ')}`, state: s.state, note: s.note });
  const rks = D.risksFor(o, p);
  const riskKeys = {}; rks.forEach((r, i) => { riskKeys['r' + i] = { title: tx(r.title), evs: r.evidence_ids.map(x => D.byId(x)).filter(Boolean) }; });
  const ctxEv = refs.flatMap(r => D.evidence(r.type, r.id).filter(e => !e.field));
  const dsc = D.disclosures(o);
  const consult = D.withFixtureFlag(`/desk/consultation/?ref=${encodeURIComponent(o.id)}&market=${encodeURIComponent(o.market_id)}`);

  host.innerHTML = `
<section class="pi"><div class="crumb"><a href="${D.withFixtureFlag('/desk/')}">Explore</a><span>${esc(m ? m.name : '')}</span>${dist ? `<span>${esc(dist.name)}</span>` : ''}</div>
<div class="op-h"><div>
  <div class="eb">Opportunity${D.fixture ? ' · illustrative' : ''}</div>
  <h1 style="margin-top:20px">${tx(o.title)}</h1>
  ${o.summary ? `<p class="lead">${tx(o.summary)}</p>` : ''}
  <div class="op-cta"><a class="btn" href="${esc(consult)}">Request a consultation <i>→</i></a><a class="btn o" href="#evidence">Evidence and gaps <i>→</i></a></div>
  ${gate ? `<div class="notice" style="margin-top:20px"><b>Fixture gate result: ${gate.length ? 'blocked' : 'gate rules pass (still never published)'}</b>${gate.length ? `<p>${gate.map(esc).join(' · ')}</p>` : ''}</div>` : ''}
</div>
<div class="op-meta">
  <div class="kv"><span class="lab">Market</span><b>${esc(m ? m.name : '—')}</b></div>
  <div class="kv"><span class="lab">Category</span><b>${o.category === 'real_estate' ? 'Real estate' : esc(o.category)}</b></div>
  <div class="kv"><span class="lab">Record</span><b class="mono" style="font-size:12px;overflow-wrap:anywhere">${esc(o.id)}</b></div>
  <div class="kv"><span class="lab">Last verified</span><b>${o.last_verified ? fmtDate(o.last_verified) : 'Not yet verified'}</b></div>
  <div class="kv" style="grid-column:1/-1"><span class="lab">Price</span><b>Not published. Current unit pricing is discussed in consultation.</b></div>
</div></div></section>

<section class="sec" aria-labelledby="g-t"><div class="sh"><div><span class="lab">Media</span><h2 id="g-t">Project gallery</h2></div></div><div id="gal">${gallery(D, o, p)}</div></section>

<section class="sec" id="evidence" aria-labelledby="f-t"><div class="sh"><div><span class="lab">Structured information</span><h2 id="f-t">Facts and their evidence</h2></div><p>Each value links to its evidence: source, tier, period and verification status. Missing values are labelled, never filled.</p></div>
${cfs.length ? `<div style="display:grid;gap:10px;margin-bottom:20px">${conflicts(cfs)}</div>` : ''}
<div class="facts" id="facts">${facts.html}</div>
${ctxEv.length ? `<div style="margin-top:22px">${ctxEv.map((e, i) => `<div class="gap"><span class="f">${tx(e.claim)}</span>${vs(e.verification_status)}${chip(esc(e.evidence_class))}<button type="button" class="evb" data-ev="c${i}">Source</button></div>`).join('')}</div>` : ''}
</section>

<section class="sec" aria-labelledby="r-t"><div class="sh"><div><span class="lab">Research status</span><h2 id="r-t">Closure and completeness</h2></div></div>${researchBlocks(p ? D.researchBlocks('project', p.id) : [])}</section>

<section class="sec" aria-labelledby="gp-t"><div class="sh"><div><span class="lab">Data gaps</span><h2 id="gp-t">What is not yet known</h2></div></div>${gaps(gapItems)}</section>

<section class="sec" aria-labelledby="rk-t"><div class="sh"><div><span class="lab">Risks</span><h2 id="rk-t">Documented risks</h2></div><p>Risks are documented with cause, evidence and mitigation. There is no risk score and no probability percentage.</p></div><div id="risks">${risks(D, rks)}</div></section>

<section class="sec" aria-labelledby="na-t"><div class="sh"><div><span class="lab">Assessments</span><h2 id="na-t">Not available in the MVP</h2></div></div>${unavailable(D, ['M-ASSET-QUALITY', 'M-INVESTMENT-FIT', 'M-FAIR-VALUE', 'M-YIELD-RETURNS', 'M-LIQUIDITY'])}</section>

<section class="sec" aria-labelledby="d-t"><div class="sh"><div><span class="lab">Disclosures</span><h2 id="d-t">Commercial relationships</h2></div></div>
${dsc.length ? dsc.map(d => `<div class="dsc" style="margin-bottom:14px"><span class="lab">${lab('disclosure', d.kind)}${d.legal_review !== 'APPROVED' ? ' · pending legal review' : ''}</span><p style="margin-top:6px">${tx(d.text)}</p></div>`).join('') : `<p class="mut">No disclosure recorded.</p>`}
<p class="gnote" style="margin-top:18px">Nexus Desk provides research and analysis to support investment decisions. It is not investment advice. See <a href="${D.withFixtureFlag('/desk/disclosures/')}" style="text-decoration:underline">disclosures</a>.</p>
<div class="op-cta"><a class="btn" href="${esc(consult)}">Request a consultation about this opportunity <i>→</i></a></div></section>`;

  bindGallery(host.querySelector('#gal'), D, o, p);
  const ctxKeys = Object.fromEntries(ctxEv.map((e, i) => ['c' + i, { title: tx(e.claim), evs: [e] }]));
  bindEvidence(host, D, { ...facts.keys, ...riskKeys, ...ctxKeys });
  void openDrawer;
}
reveal();
