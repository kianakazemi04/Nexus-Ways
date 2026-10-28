// Opportunity profile: one data-driven template for every opportunity. Everything is resolved from the opportunity ID only.
import { ready } from './core.js';
import { DESK_CONTACT } from './contact.js';
import { claimPublication } from './policy.js';
import { esc, tx, lab, chip, vs, freshness, freshChip, qualifier, fmtDate, gallery, bindGallery, factRows, bindEvidence, researchBlocks, gaps, conflicts, risks, riskEvidence, reveal, t, mname, LANG, L } from './ui.js';

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
  const riskKeys = {}; rks.forEach((r, i) => { riskKeys['r' + i] = { title: tx(r.title), evs: riskEvidence(D, r) }; });
  const ctxEv = refs.flatMap(r => D.evidence(r.type, r.id).filter(e => !e.field));
  const dsc = D.disclosures(o);
  const consult = D.withFixtureFlag(`/desk/consultation/?ref=${encodeURIComponent(o.id)}&market=${encodeURIComponent(o.market_id)}`);

  // evidence summary (section 3): verified facts, developer statements, and what is missing, outdated or disputed
  const allEv = refs.flatMap(r => D.evidence(r.type, r.id));
  const nVer = allEv.filter(e => claimPublication(e).status === 'ESTABLISHED').length;
  const nDev = allEv.filter(e => e.verification_status === 'DEVELOPER-CLAIM').length;
  const nOld = allEv.filter(e => ['EXPIRED', 'INVALID'].includes(freshness(e, D).state)).length;
  const nGap = gapItems.length + cfs.length + nOld;
  // documented findings (section 4) and the sources behind this page (section 5)
  const finds = (o.findings || []).map((f, i) => ({ ...f, key: 'fd' + i, evs: (f.evidence_ids || []).map(id => D.byId(id)).filter(Boolean) }));
  const findKeys = Object.fromEntries(finds.map(f => [f.key, { title: tx(f.text), evs: f.evs }]));
  const srcNames = [...new Set(allEv.map(e => (D.source(e.source_id) || {}).name).filter(Boolean))];
  const kind = (o.category === 'real_estate' ? t('residential') : esc(o.category));
  const priv = [['pp', 'M-PRICE-POSITION'], ['fin', 'M-SCENARIOS'], ['fit', 'M-INVESTMENT-FIT'], ['exit', 'M-EXIT-REVIEW'], ['sev', 'M-RISK-SEVERITY']].filter(([, id]) => D.methods[id] && D.methods[id].internal === 'ACTIVE');

  host.innerHTML = `
<section class="pi"><div class="crumb"><a href="${D.withFixtureFlag('/desk/')}">${esc(t('explore'))}</a><span>${esc(mname(m))}</span>${dist ? `<span>${esc(dist.name)}</span>` : ''}</div>
<div class="op-h"><div>
  <div class="eb">${esc(t('opp'))}${D.fixture ? esc(t('oppIll')) : ''}</div>
  <h1 style="margin-top:20px">${tx(o.title)}</h1>
  <p class="op-tag" data-profile-line>${dist ? `${esc(dist.name)}, ` : ''}${esc(mname(m))} · ${kind}${dev ? ` · ${esc(t('fl.dev'))}: ${esc(dev.name)}` : ''} <span class="chip on">${esc(t('evBacked'))}</span></p>
  ${o.summary ? `<p class="lead">${tx(o.summary)}</p>` : ''}
  <div class="op-cta"><a class="btn" href="${esc(consult)}">${esc(t('reqConsult'))} <i>→</i></a><a class="btn o" href="#evidence">${esc(t('evGaps'))} <i>→</i></a></div>
  ${gate ? `<div class="notice" style="margin-top:20px"><b>${esc(t('gateRes', { s: gate.length ? t('gateBlocked') : t('gatePass') }))}</b>${gate.length ? `<p>${gate.map(esc).join(' · ')}</p>` : ''}</div>` : ''}
</div>
<div class="op-meta">
  <div class="kv"><span class="lab">${esc(t('market'))}</span><b>${esc(m ? mname(m) : '—')}</b></div>
  <div class="kv"><span class="lab">${esc(t('category'))}</span><b>${o.category === 'real_estate' ? esc(t('realEstate')) : esc(o.category)}</b></div>
  <div class="kv"><span class="lab">${esc(t('record'))}</span><b class="mono" style="font-size:12px;overflow-wrap:anywhere">${esc(o.id)}</b></div>
  <div class="kv"><span class="lab">${esc(t('lastVer'))}</span><b>${o.last_verified ? fmtDate(o.last_verified) : esc(t('noVerDate'))}</b></div>
  <div class="kv" style="grid-column:1/-1"><span class="lab">${esc(t('price'))}</span><b>${esc(t('priceNote'))}</b></div>
</div></div></section>

<section class="sec" data-sec="1" aria-labelledby="f-t"><div class="sh"><div><span class="lab">01 · ${esc(t('s1Lab'))}</span><h2 id="f-t">${esc(t('s1H'))}</h2></div><p>${esc(t('factsP'))}</p></div>
<div class="facts" id="facts">${facts.html}</div></section>

<section class="sec" data-sec="2" aria-labelledby="g-t"><div class="sh"><div><span class="lab">02 · ${esc(t('mediaLab'))}</span><h2 id="g-t">${esc(t('galleryH'))}</h2></div><p>${esc(t('s2P'))}</p></div><div id="gal">${gallery(D, o, p)}</div></section>

<section class="sec" data-sec="3" id="evidence" aria-labelledby="e-t"><div class="sh"><div><span class="lab">03 · ${esc(t('structured'))}</span><h2 id="e-t">${esc(t('s3H'))}</h2></div></div>
<div class="ev-sum" data-evidence-summary><div><b>${nVer}</b><span>${esc(t('sumVer'))}</span></div><div><b>${nDev}</b><span>${esc(t('sumDev'))}</span></div><div><b>${nGap}</b><span>${esc(t('sumGap'))}</span></div></div>
${cfs.length ? `<div style="display:grid;gap:10px;margin:20px 0">${conflicts(cfs)}</div>` : ''}
${ctxEv.length ? `<div style="margin-top:22px">${ctxEv.map((e, i) => `<div class="gap"><span class="f">${tx(e.claim)}</span>${vs(e.verification_status)}${chip(lab('evidence_class', e.evidence_class))}${freshChip(freshness(e, D))}${qualifier(e, D)}<button type="button" class="evb" data-ev="c${i}">${esc(t('sourceBtn'))}</button></div>`).join('')}</div>` : ''}
<h3 class="h4" style="margin:26px 0 12px">${esc(t('gapsH'))}</h3>${gaps(gapItems)}</section>

<section class="sec" data-sec="4" aria-labelledby="a-t"><div class="sh"><div><span class="lab">04 · ${esc(t('assessLab'))}</span><h2 id="a-t">${esc(t('s4H'))}</h2></div><p>${esc(t('s4P'))}</p></div>
<h3 class="h4" style="margin:0 0 12px">${esc(t('findH'))}</h3>
${finds.length ? `<div class="finds" data-findings>${finds.map(f => `<div class="gap fd ${f.type === 'STRENGTH' ? 'pos' : 'neg'}"><span class="chip ${f.type === 'STRENGTH' ? 'on' : 'red'}">${esc(t(f.type === 'STRENGTH' ? 'strength' : 'weakness'))}</span><span class="f">${tx(f.text)}</span><button type="button" class="evb" data-ev="${f.key}">${esc(t('sourceBtn'))}</button></div>`).join('')}</div>` : `<p class="mut">${esc(t('noFind'))}</p>`}
<h3 class="h4" id="rk-t" style="margin:30px 0 8px">${esc(t('risksH'))}</h3><p class="mut" style="margin-bottom:14px">${esc(t('risksP'))}</p><div id="risks">${risks(D, rks)}</div>
<div class="rb wide" style="margin-top:30px" data-analysis-availability>
  <div class="rbx" data-private-report><span class="lab">${esc(t('privLab'))}</span><h3 class="h4">${esc(t('privH'))}</h3><ul class="plain">${priv.map(([k]) => `<li>${esc(t('pv.' + k))}</li>`).join('')}</ul><p class="mut">${esc(t('privP'))}</p><a class="btn sm" href="${esc(consult)}">${esc(t('privBtn'))} <i>→</i></a></div>
  <div class="rbx" data-not-offered><span class="lab">${esc(t('notOffLab'))}</span><h3 class="h4">${esc(t('notOffH'))}</h3><ul class="plain">${['fv', 'liq', 'aq'].map(k => `<li>${esc(t('no.' + k))}</li>`).join('')}</ul></div>
</div></section>

<section class="sec" data-sec="5" aria-labelledby="r-t"><div class="sh"><div><span class="lab">05 · ${esc(t('resLab'))}</span><h2 id="r-t">${esc(t('s5H'))}</h2></div></div>${researchBlocks(p ? D.researchBlocks('project', p.id) : [])}
${srcNames.length ? `<h3 class="h4" style="margin:26px 0 10px">${esc(t('srcUsed'))}</h3><ul class="plain" data-sources-used>${srcNames.map(n => `<li>${esc(n)}</li>`).join('')}</ul>` : ''}
<div class="op-cta" style="margin-top:22px"><a class="btn o" href="${D.withFixtureFlag('/desk/')}" data-compare-link>${esc(t('cmpBtn'))} <i>→</i></a></div></section>

<section class="sec" aria-labelledby="d-t"><div class="sh"><div><span class="lab">${esc(t('dscLab'))}</span><h2 id="d-t">${esc(t('dscH'))}</h2></div></div>
${dsc.length ? dsc.map(d => `<div class="dsc" style="margin-bottom:14px"><span class="lab">${lab('disclosure', d.kind)}${d.legal_review !== 'APPROVED' ? esc(t('pendingLegal')) : ''}</span><p style="margin-top:6px">${tx(d.text)}</p></div>`).join('') : `<p class="mut">${esc(t('noDsc'))}</p>`}
${o.advertising_permit ? `<p class="mut" data-ad-permit style="margin-top:14px">${esc(t('adPermit'))}: <span dir="ltr">${esc(o.advertising_permit)}</span></p>` : ''}
<p class="gnote" style="margin-top:18px">${esc(t('adviceNote'))} <a href="${D.withFixtureFlag('/desk/disclosures/')}" style="text-decoration:underline">${esc(t('dscLink'))}</a>.</p>
<div class="op-cta"><a class="btn" href="${esc(consult)}">${esc(t('reqConsultThis'))} <i>→</i></a><a class="btn o" href="${DESK_CONTACT.calendly}" target="_blank" rel="noopener">${esc(t('oppCall'))} <i>↗</i></a></div></section>`;

  bindGallery(host.querySelector('#gal'), D, o, p);
  const ctxKeys = Object.fromEntries(ctxEv.map((e, i) => ['c' + i, { title: tx(e.claim), evs: [e] }]));
  bindEvidence(host, D, { ...facts.keys, ...riskKeys, ...ctxKeys, ...findKeys });
}
reveal();
