// Opportunity profile: one data-driven template for every opportunity. Everything is resolved from the opportunity ID only.
import { ready } from './core.js';
import { esc, tx, lab, chip, vs, fmtDate, gallery, bindGallery, factRows, bindEvidence, researchBlocks, gaps, conflicts, risks, unavailable, reveal, t, mname, LANG, L } from './ui.js';

const D = await ready;
const host = document.getElementById('opp');
const id = host.dataset.id || (D.fixture ? new URLSearchParams(location.search).get('id') : null);
const o = id ? D.opportunity(id) : null;

if (!o) {
  document.title = t('notAvailTitle');
  host.innerHTML = `<section class="pi"><div class="eb">${esc(t('opp'))}</div><h1 style="margin-top:20px">${esc(t('notAvail'))}</h1></section><div class="sec"><div class="empty"><span class="lab">${esc(t('notAvailLab'))}</span><h3>${esc(t('notPubH'))}</h3><p>${esc(t('notPubP'))}</p><div><a class="btn o sm" href="${D.withFixtureFlag('/desk/')}">${esc(t('backExplore'))} <i>→</i></a></div></div></div>`;
} else {
  const p = D.project(o); const dev = D.developer(p); const dist = D.district(p); const area = D.area(p); const a = D.asset(o); const m = D.market(o.market_id);
  const gate = D.fixture ? D.gateFor(o.id) : null;
  document.title = `${(o.title && (o.title[LANG] || o.title.en)) || t('opp')} | Nexus Desk`;
  const fmtMonth = (v) => fmtDate(v).replace(/&amp;/g, '&');
  const facts = factRows(D, [
    [t('fl.name'), 'project', p, 'name'],
    [t('fl.dev'), 'developer', dev, 'name'],
    [t('fl.legal'), 'developer', dev, 'legal_entity_name'],
    [t('fl.district'), 'project', p, 'district_id', () => dist ? dist.name : ''],
    [t('fl.delivery'), 'project', p, 'delivery_status', (v) => L.delivery_status[v] || v],
    [t('fl.expected'), 'project', p, 'expected_delivery', fmtMonth],
    [t('fl.types'), 'project', p, 'asset_types', (v) => v.map(a => L.asset_type[a] || a).join(LANG === 'ar' ? '، ' : ', ')],
    [t('fl.unit'), 'asset', a, 'unit_type'],
    [t('fl.gross'), 'asset', a, 'gross_area_m2', (v) => t('grossFmt', { v })],
    [t('fl.net'), 'asset', a, 'net_area_m2', (v) => t('netFmt', { v })]
  ]);
  const refs = [{ type: 'project', id: p && p.id }, { type: 'opportunity', id: o.id }, dev && { type: 'developer', id: dev.id }, a && { type: 'asset', id: a.id }].filter(r => r && r.id);
  const cfs = D.conflictsFor(refs).filter(c => c.status === 'OPEN');
  const gapItems = [];
  for (const [rec, label] of [[p, t('gapProject')], [dev, t('gapDev')], [a, t('gapUnit')], [o, t('gapOpp')]]) if (rec) for (const s of rec.field_states || []) gapItems.push({ label: `${label} · ${s.field.replace(/_/g, ' ')}`, state: s.state, note: s.note });
  const rks = D.risksFor(o, p);
  const riskKeys = {}; rks.forEach((r, i) => { riskKeys['r' + i] = { title: tx(r.title), evs: r.evidence_ids.map(x => D.byId(x)).filter(Boolean) }; });
  const ctxEv = refs.flatMap(r => D.evidence(r.type, r.id).filter(e => !e.field));
  const dsc = D.disclosures(o);
  const consult = D.withFixtureFlag(`/desk/consultation/?ref=${encodeURIComponent(o.id)}&market=${encodeURIComponent(o.market_id)}`);

  host.innerHTML = `
<section class="pi"><div class="crumb"><a href="${D.withFixtureFlag('/desk/')}">${esc(t('explore'))}</a><span>${esc(mname(m))}</span>${dist ? `<span>${esc(dist.name)}</span>` : ''}</div>
<div class="op-h"><div>
  <div class="eb">${esc(t('opp'))}${D.fixture ? esc(t('oppIll')) : ''}</div>
  <h1 style="margin-top:20px">${tx(o.title)}</h1>
  ${o.summary ? `<p class="lead">${tx(o.summary)}</p>` : ''}
  <div class="op-cta"><a class="btn" href="${esc(consult)}">${esc(t('reqConsult'))} <i>→</i></a><a class="btn o" href="#evidence">${esc(t('evGaps'))} <i>→</i></a></div>
  ${gate ? `<div class="notice" style="margin-top:20px"><b>${esc(t('gateRes', { s: gate.length ? t('gateBlocked') : t('gatePass') }))}</b>${gate.length ? `<p>${gate.map(esc).join(' · ')}</p>` : ''}</div>` : ''}
</div>
<div class="op-meta">
  <div class="kv"><span class="lab">${esc(t('market'))}</span><b>${esc(m ? mname(m) : '—')}</b></div>
  <div class="kv"><span class="lab">${esc(t('category'))}</span><b>${o.category === 'real_estate' ? esc(t('realEstate')) : esc(o.category)}</b></div>
  <div class="kv"><span class="lab">${esc(t('record'))}</span><b class="mono" style="font-size:12px;overflow-wrap:anywhere">${esc(o.id)}</b></div>
  <div class="kv"><span class="lab">${esc(t('lastVer'))}</span><b>${o.last_verified ? fmtDate(o.last_verified) : esc(t('notYetVer'))}</b></div>
  <div class="kv" style="grid-column:1/-1"><span class="lab">${esc(t('price'))}</span><b>${esc(t('priceNote'))}</b></div>
</div></div></section>

<section class="sec" aria-labelledby="g-t"><div class="sh"><div><span class="lab">${esc(t('mediaLab'))}</span><h2 id="g-t">${esc(t('galleryH'))}</h2></div></div><div id="gal">${gallery(D, o, p)}</div></section>

<section class="sec" id="evidence" aria-labelledby="f-t"><div class="sh"><div><span class="lab">${esc(t('structured'))}</span><h2 id="f-t">${esc(t('factsH'))}</h2></div><p>${esc(t('factsP'))}</p></div>
${cfs.length ? `<div style="display:grid;gap:10px;margin-bottom:20px">${conflicts(cfs)}</div>` : ''}
<div class="facts" id="facts">${facts.html}</div>
${ctxEv.length ? `<div style="margin-top:22px">${ctxEv.map((e, i) => `<div class="gap"><span class="f">${tx(e.claim)}</span>${vs(e.verification_status)}${chip(lab('evidence_class', e.evidence_class))}<button type="button" class="evb" data-ev="c${i}">${esc(t('sourceBtn'))}</button></div>`).join('')}</div>` : ''}
</section>

<section class="sec" aria-labelledby="r-t"><div class="sh"><div><span class="lab">${esc(t('resLab'))}</span><h2 id="r-t">${esc(t('resH'))}</h2></div></div>${researchBlocks(p ? D.researchBlocks('project', p.id) : [])}</section>

<section class="sec" aria-labelledby="gp-t"><div class="sh"><div><span class="lab">${esc(t('gapsLab'))}</span><h2 id="gp-t">${esc(t('gapsH'))}</h2></div></div>${gaps(gapItems)}</section>

<section class="sec" aria-labelledby="rk-t"><div class="sh"><div><span class="lab">${esc(t('risksLab'))}</span><h2 id="rk-t">${esc(t('risksH'))}</h2></div><p>${esc(t('risksP'))}</p></div><div id="risks">${risks(D, rks)}</div></section>

<section class="sec" aria-labelledby="na-t"><div class="sh"><div><span class="lab">${esc(t('assessLab'))}</span><h2 id="na-t">${esc(t('assessH'))}</h2></div></div>${unavailable(D, ['M-ASSET-QUALITY', 'M-INVESTMENT-FIT', 'M-FAIR-VALUE', 'M-YIELD-RETURNS', 'M-LIQUIDITY'])}</section>

<section class="sec" aria-labelledby="d-t"><div class="sh"><div><span class="lab">${esc(t('dscLab'))}</span><h2 id="d-t">${esc(t('dscH'))}</h2></div></div>
${dsc.length ? dsc.map(d => `<div class="dsc" style="margin-bottom:14px"><span class="lab">${lab('disclosure', d.kind)}${d.legal_review !== 'APPROVED' ? esc(t('pendingLegal')) : ''}</span><p style="margin-top:6px">${tx(d.text)}</p></div>`).join('') : `<p class="mut">${esc(t('noDsc'))}</p>`}
<p class="gnote" style="margin-top:18px">${esc(t('adviceNote'))} <a href="${D.withFixtureFlag('/desk/disclosures/')}" style="text-decoration:underline">${esc(t('dscLink'))}</a>.</p>
<div class="op-cta"><a class="btn" href="${esc(consult)}">${esc(t('reqConsultThis'))} <i>→</i></a></div></section>`;

  bindGallery(host.querySelector('#gal'), D, o, p);
  const ctxKeys = Object.fromEntries(ctxEv.map((e, i) => ['c' + i, { title: tx(e.claim), evs: [e] }]));
  bindEvidence(host, D, { ...facts.keys, ...riskKeys, ...ctxKeys });
}
reveal();
