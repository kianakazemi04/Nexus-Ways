// Market gate MG-1 (shared engine MGE-1; owner decisions D1/D3, 28 Oct 2026) — run with:
//   node --test desk/_tests/marketgate.test.mjs
// Positive and negative tests for each configuration (Istanbul, Dubai, Abu Dhabi). Synthetic TEST-ONLY data only;
// every negative test spoils exactly one thing in an otherwise passing dataset. All three markets fail closed when
// evidence is absent, stale or unapproved.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { ROOT, TODAY, readJson, writeJson, tmp, tmpRepo, cli, enableTestMarketGate, disableTestMarketGate } from './helpers.mjs';
import { loadGateConfig, evaluateMarketGate, opportunityRequirementReasons, configProblems, periodEnd, CONFIG_PATH, gateCertificate, gateValidUntil, certificateState } from '../_tools/engines/marketgate.mjs';
import { validateDataset, validateRepo } from '../_tools/validate.mjs';
import { gateDataset, requirementEvidence, sub } from './marketgate-data.mjs';

const CFG = loadGateConfig();
const MARKETS = ['MKT-IST', 'MKT-DXB', 'MKT-AUH'];
const clone = (x) => JSON.parse(JSON.stringify(x));
const run = (id, spoil = null, { today = TODAY, cfg = CFG } = {}) => {
  const d = clone(gateDataset(cfg, id, today));
  if (spoil) spoil(d, cfg.markets[id]);
  return evaluateMarketGate(cfg, id, d.collections, { today, now: `${today}T09:00:00Z`, reviews: d.reviews, provenance: d.provenance });
};
const codesOf = (g) => [...new Set(g.reasons.map(r => r.code))].sort();
const failsWith = (g, code, item = null) => {
  assert.equal(g.pass, false, `${g.market_id} should fail with ${code}`);
  assert.ok(g.reasons.some(r => r.code === code && (!item || r.item === item)), `${g.market_id}: expected ${code}${item ? ' on ' + item : ''}, got ${JSON.stringify(g.reasons)}`);
};
const ev = (d, key) => d.collections.evidence.find(e => e.topic === key);
const blk = (d, domain) => d.collections.research_blocks.find(b => b.subject.type === 'market' && b.domain === domain);

// ------------------------------------------------------------------ configuration
test('configuration: legal topics are limited to statutory requirements on Nexus Ways\' own activity', () => {
  for (const id of MARKETS) for (const tp of CFG.markets[id].regulatory_review.topics) {
    assert.ok(tp.restriction && tp.owner_record && tp.accepted_roles.includes('OWNER_OFFICIAL_REFERENCE'), `${id} ${tp.key}`);
    assert.doesNotMatch(tp.key, /DATA-PROTECTION|NOT-ADVICE|FOREIGN-OWNERSHIP/, 'site-wide and per-project items are not market gates');
  }
  assert.match(CFG.scope_note, /sales office/);
});

test('configuration: one shared version, three separate market configurations, every rule documented', () => {
  assert.equal(CFG.version, 'MG-1'); assert.equal(CFG.engine, 'MGE-1');
  assert.deepEqual(Object.keys(CFG.markets).sort(), [...MARKETS].sort());
  const topicSets = MARKETS.map(id => new Set(CFG.markets[id].regulatory_review.topics.map(t => t.key)));
  for (let i = 0; i < 3; i++) for (let j = i + 1; j < 3; j++) assert.equal([...topicSets[i]].filter(k => topicSets[j].has(k)).length, 0, 'legal-review topics are never shared between markets');
  for (const id of MARKETS) {
    const m = CFG.markets[id];
    assert.deepEqual(configProblems(CFG, id), [], id);
    for (const s of m.statistics) {
      for (const k of ['why', 'name', 'unit', 'period_format', 'geography', 'freshness_basis', 'fallback']) assert.ok(s[k], `${id} ${s.key}: ${k} documented`);
      assert.ok(s.max_age_days > 0 && s.accepted_sources.publishers.length && s.accepted_sources.source_types.length, `${id} ${s.key}: source and freshness rule`);
      assert.ok(!('threshold' in s) && !('min_value' in s) && !('max_value' in s), `${id} ${s.key}: no numerical pass value`);
    }
    assert.match(m.publication.financial_figures, /^PRIVATE/, `${id}: financial figures stay private (D10)`);
  }
  // Dubai's registry is not accepted for Abu Dhabi, and vice versa
  const pubs = (id) => new Set(CFG.markets[id].statistics.flatMap(s => s.accepted_sources.publishers).concat(CFG.markets[id].publication.opportunity_requirements.flatMap(q => q.accepted_sources.publishers || [])));
  for (const p of ['Dubai Land Department', 'DLD', 'RERA', 'Dubai Pulse', 'Dubai Statistics Center']) assert.ok(!pubs('MKT-AUH').has(p), `AUH does not accept ${p}`);
  for (const p of ['ADREC', 'Abu Dhabi Real Estate Centre', 'DMT', 'Statistics Centre Abu Dhabi']) assert.ok(!pubs('MKT-DXB').has(p), `DXB does not accept ${p}`);
  assert.deepEqual(configProblems(CFG, 'MKT-XYZ'), ['market MKT-XYZ has no gate configuration (MG-1)']);
});

test('configuration: an emptied market configuration can never pass by being empty', () => {
  const c = clone(CFG); c.markets['MKT-IST'].statistics = []; c.markets['MKT-IST'].regulatory_review.topics = []; c.markets['MKT-IST'].research_blocks = [];
  const g = evaluateMarketGate(c, 'MKT-IST', gateDataset(CFG, 'MKT-IST', TODAY).collections, { today: TODAY, reviews: [] });
  assert.equal(g.pass, false); assert.ok(g.reasons.every(r => r.code === 'MG_CONFIG') && g.reasons.length >= 3, JSON.stringify(g.reasons));
  assert.equal(evaluateMarketGate({ error: 'unreadable' }, 'MKT-IST', {}, { today: TODAY }).pass, false);
});

test('period conventions: monthly, quarterly, daily and annual observation periods end where expected', () => {
  assert.deepEqual(periodEnd('2026-02', 'YYYY-MM'), { ok: true, end: '2026-02-28' });
  assert.deepEqual(periodEnd('2026-Q3', 'YYYY-MM|YYYY-Q[1-4]'), { ok: true, end: '2026-09-30' });
  assert.deepEqual(periodEnd('2026-10-20', 'YYYY-MM-DD'), { ok: true, end: '2026-10-20' });
  assert.equal(periodEnd('2026-Q3', 'YYYY-MM').ok, false);
  assert.equal(periodEnd('Oct 2026', 'YYYY-MM').ok, false);
  assert.equal(periodEnd(null, 'YYYY-MM').ok, false);
});

// ------------------------------------------------------------------ positive, per market
for (const id of MARKETS) {
  test(`${id}: a complete, current, verified, reviewed dataset passes, with a machine-readable report`, () => {
    const g = run(id);
    assert.deepEqual(g.reasons, []); assert.equal(g.pass, true);
    assert.equal(g.gate_version, 'MG-1'); assert.equal(g.engine_version, 'MGE-1'); assert.equal(g.market_id, id); assert.equal(g.evaluated_at, `${TODAY}T09:00:00Z`);
    assert.ok(g.statistics.filter(s => s.required).every(s => s.status === 'PASS'));
    assert.ok(g.reviews.length === CFG.markets[id].regulatory_review.topics.length && g.reviews.every(r => r.ok));
    assert.match(g.publication.financial_figures, /PRIVATE/);
  });
}

// ------------------------------------------------------------------ fail closed, per market
for (const id of MARKETS) {
  test(`${id}: fails closed when evidence is absent (market record only)`, () => {
    const d = gateDataset(CFG, id, TODAY);
    const g = evaluateMarketGate(CFG, id, { markets: d.collections.markets }, { today: TODAY, reviews: [] });
    for (const c of ['MG_BLOCK_MISSING', 'MG_DISTRICTS', 'MG_STAT_MISSING', 'MG_FX', 'MG_REVIEW_MISSING']) failsWith(g, c);
    assert.equal(g.reasons.filter(r => r.code === 'MG_BLOCK_MISSING').length, 5);
    assert.equal(g.reasons.filter(r => r.code === 'MG_REVIEW_MISSING').length, CFG.markets[id].regulatory_review.topics.length);
    failsWith(evaluateMarketGate(CFG, id, {}, { today: TODAY, reviews: [] }), 'MG_SCOPE');
  });

  test(`${id}: every required research block, statistic and review topic is individually mandatory`, () => {
    const m = CFG.markets[id];
    for (const b of m.research_blocks) failsWith(run(id, (d) => { d.collections.research_blocks = d.collections.research_blocks.filter(x => !(x.subject.type === 'market' && x.domain === b.domain)); }), 'MG_BLOCK_MISSING', `${id}:${b.domain}`);
    for (const s of m.statistics.filter(x => x.required)) failsWith(run(id, (d) => { d.collections.evidence = d.collections.evidence.filter(e => e.topic !== s.key); }), s.kind === 'fx' ? 'MG_FX' : 'MG_STAT_MISSING', s.key);
    for (const t of m.regulatory_review.topics) failsWith(run(id, (d) => { d.reviews = d.reviews.filter(r => r.topic !== t.key); }), 'MG_REVIEW_MISSING', t.key);
    failsWith(run(id, (d) => { d.collections.research_blocks = d.collections.research_blocks.filter(x => x.subject.type !== 'district'); }), 'MG_DISTRICTS');
  });

  test(`${id}: Research Closure and Data Completeness are independent states`, () => {
    const a = run(id, (d) => { blk(d, 'MARKET').research_closure = 'CONDITIONAL'; });
    failsWith(a, 'MG_BLOCK_NOT_CLOSED'); assert.ok(!codesOf(a).includes('MG_COMPLETENESS'));
    const b = run(id, (d) => { blk(d, 'MARKET').data_completeness = 'NO'; });
    failsWith(b, 'MG_COMPLETENESS'); assert.ok(!codesOf(b).includes('MG_BLOCK_NOT_CLOSED'));
    failsWith(run(id, (d) => { blk(d, 'RISK').research_closure = 'NO'; }), 'MG_BLOCK_NOT_CLOSED', `${id}:RISK`);
    failsWith(run(id, (d) => { const x = d.collections.research_blocks.find(r => r.subject.type === 'district'); x.research_closure = 'CONDITIONAL'; }), 'MG_DISTRICTS');
  });

  test(`${id}: stale evidence fails (blocks, statistics, FX)`, () => {
    const m = CFG.markets[id];
    failsWith(run(id, (d, mc) => { blk(d, 'MACRO_FX').last_reviewed = sub(TODAY, mc.research_blocks[0].max_age_days + 1); }), 'MG_BLOCK_STALE', `${id}:MACRO_FX`);
    failsWith(run(id, (d) => { blk(d, 'MARKET').last_reviewed = null; }), 'MG_BLOCK_STALE');
    const s = m.statistics.find(x => x.required && x.kind !== 'fx');
    failsWith(run(id, (d) => { ev(d, s.key).period = s.period_format.includes('YYYY-MM') ? '2024-01' : '2024-01-01'; }), 'MG_STAT_STALE', s.key);
    const fx = m.statistics.find(x => x.kind === 'fx');
    const g = run(id, (d) => { ev(d, fx.key).period = sub(TODAY, fx.max_age_days + 1); });
    failsWith(g, 'MG_STAT_STALE', fx.key); failsWith(g, 'MG_FX', fx.key);
    // an observation period that has not ended yet is not a statistic
    failsWith(run(id, (d) => { const x = ev(d, s.key); x.period = s.period_format.includes('YYYY-MM') && !s.period_format.startsWith('YYYY-MM-DD') ? TODAY.slice(0, 7) : sub(TODAY, -1); }), 'MG_STAT_PERIOD', s.key);
  });

  test(`${id}: only accepted official sources, verified facts, the right unit and geography count`, () => {
    const s = CFG.markets[id].statistics.find(x => x.required && x.kind !== 'fx');
    const srcOf = (d) => d.collections.sources.find(x => x.id === ev(d, s.key).source_id);
    failsWith(run(id, (d) => { srcOf(d).publisher = 'A property portal'; }), 'MG_STAT_SOURCE', s.key);
    failsWith(run(id, (d) => { srcOf(d).source_type = 'BROKER_LISTING'; }), 'MG_STAT_SOURCE', s.key);
    failsWith(run(id, (d) => { ev(d, s.key).source_tier = 4; }), 'MG_STAT_SOURCE', s.key);
    failsWith(run(id, (d) => { ev(d, s.key).verification_status = 'SOURCE-REPORTED'; }), 'MG_STAT_UNVERIFIED', s.key);
    failsWith(run(id, (d) => { ev(d, s.key).verification_status = 'UNVERIFIED'; }), 'MG_STAT_UNVERIFIED', s.key);
    failsWith(run(id, (d) => { ev(d, s.key).evidence_class = 'ESTIMATE'; }), 'MG_STAT_UNVERIFIED', s.key);
    failsWith(run(id, (d) => { ev(d, s.key).unit = 'text'; }), 'MG_STAT_UNIT', s.key);
    failsWith(run(id, (d) => { ev(d, s.key).currency = CFG.markets[id].currency; }), 'MG_STAT_UNIT', s.key);
    failsWith(run(id, (d) => { ev(d, s.key).geography = 'Elsewhere'; }), 'MG_STAT_GEO', s.key);
    failsWith(run(id, (d) => { ev(d, s.key).value = null; }), 'MG_STAT_MISSING', s.key);
  });

  test(`${id}: evidence ownership and traceability are required`, () => {
    const s = CFG.markets[id].statistics.find(x => x.required);
    failsWith(run(id, (d) => { delete d.provenance[ev(d, s.key).id]; }), 'MG_TRACE', s.key);
    failsWith(run(id, (d) => { ev(d, s.key).is_illustrative = true; }), 'MG_TRACE', s.key);
    failsWith(run(id, (d) => { const e = ev(d, s.key); e.source_url = null; e.source_locator = null; d.collections.sources.find(x => x.id === e.source_id).url = null; }), 'MG_TRACE', s.key);
    failsWith(run(id, (d) => { ev(d, s.key).last_verified = null; }), 'MG_TRACE', s.key);
    failsWith(run(id, (d) => { ev(d, s.key).source_id = 'SRC-MISSING'; }), 'MG_TRACE', s.key);
    failsWith(run(id, (d) => { blk(d, 'DEVELOPER').is_illustrative = true; }), 'MG_TRACE', `${id}:DEVELOPER`);
  });

  test(`${id}: unresolved material conflicts and recorded gaps block the gate`, () => {
    const s = CFG.markets[id].statistics.find(x => x.required);
    failsWith(run(id, (d) => { const e = ev(d, s.key); d.collections.conflicts.push({ id: 'CNF-T-1', subject: e.subject, field: null, evidence_ids: [e.id], status: 'OPEN' }); e.conflict_ids = ['CNF-T-1']; }), 'MG_CONFLICT', s.key);
    failsWith(run(id, (d) => { const e = ev(d, s.key); d.collections.evidence.push({ ...clone(e), id: e.id + '-B', value: 2 }); d.provenance[e.id + '-B'] = { created_by: 'MI-T' }; }), 'MG_CONFLICT', s.key);
    failsWith(run(id, (d) => { d.collections.conflicts.push({ id: 'CNF-T-2', subject: { type: 'market', id }, field: 'summary', evidence_ids: [], status: 'OPEN' }); }), 'MG_CONFLICT', 'CNF-T-2');
    assert.equal(run(id, (d) => { d.collections.conflicts.push({ id: 'CNF-T-3', subject: { type: 'market', id }, field: 'summary', evidence_ids: [], status: 'EXPLAINED' }); }).pass, true, 'an explained conflict does not block');
    failsWith(run(id, (d) => { d.collections.markets[0].field_states.push({ field: 'summary', state: 'ACCESSIBLE BUT NOT YET COLLECTED', note: null }); }), 'MG_GAP');
    assert.equal(run(id, (d) => { d.collections.markets[0].field_states.push({ field: 'summary', state: 'NOT APPLICABLE', note: null }); }).pass, true);
  });

  test(`${id}: legal review must be COMPLETE, current, by an accepted reviewer and recorded by the owner — evidence never substitutes`, () => {
    const t = CFG.markets[id].regulatory_review.topics[0].key;
    const r0 = (d) => d.reviews.find(r => r.topic === t);
    failsWith(run(id, (d) => { r0(d).status = 'PENDING'; r0(d).outcome = null; }), 'MG_REVIEW_INCOMPLETE', t);
    failsWith(run(id, (d) => { r0(d).status = 'IN_REVIEW'; r0(d).outcome = null; }), 'MG_REVIEW_INCOMPLETE', t);
    failsWith(run(id, (d) => { r0(d).reviewed_at = sub(TODAY, 400); }), 'MG_REVIEW_EXPIRED', t);
    failsWith(run(id, (d) => { r0(d).valid_until = sub(TODAY, 1); }), 'MG_REVIEW_EXPIRED', t);
    failsWith(run(id, (d) => { r0(d).reviewer_role = 'RESEARCH_ANALYST'; }), 'MG_REVIEWER', t);
    assert.equal(run(id, (d) => { for (const r of d.reviews) r.reviewer_role = 'OWNER_OFFICIAL_REFERENCE'; }).pass, true, 'statutory topics accept the owner\'s official permit/certificate reference');
    failsWith(run(id, (d) => { r0(d).recorded_by = 'claude'; }), 'MG_REVIEW_INVALID', t);
    failsWith(run(id, (d) => { r0(d).reference = ''; }), 'MG_REVIEW_INVALID', t);
    failsWith(run(id, (d) => { r0(d).outcome = 'BLOCKING'; }), 'MG_REVIEW_BLOCKING', t);
    // a later record supersedes an earlier COMPLETE one (append-only history)
    failsWith(run(id, (d) => { d.reviews.push({ ...clone(r0(d)), id: 'REG-LATER', seq: 99, status: 'WITHDRAWN', outcome: null, reviewed_at: sub(TODAY, 1) }); }), 'MG_REVIEW_INCOMPLETE', t);
    // a LEGAL FACT evidence record about the topic is research, not legal approval
    failsWith(run(id, (d) => { d.reviews = d.reviews.filter(r => r.topic !== t); d.collections.evidence.push({ ...clone(d.collections.evidence[0]), id: 'EVD-LEGAL', topic: t, evidence_class: 'LEGAL FACT', unit: 'text', value: 'counsel memo says permitted' }); }), 'MG_REVIEW_MISSING', t);
    // conditions from counsel are surfaced as publication restrictions
    const g = run(id, (d) => { r0(d).outcome = 'CONDITIONS'; r0(d).conditions = ['TEST-ONLY condition']; });
    assert.equal(g.pass, true); assert.deepEqual(g.publication.conditions, [{ topic: t, conditions: ['TEST-ONLY condition'] }]);
  });

  test(`${id}: scope — category, country and currency must match the market configuration`, () => {
    failsWith(run(id, (d) => { d.collections.markets[0].category = 'web3_digital_assets'; }), 'MG_SCOPE');
    failsWith(run(id, (d) => { d.collections.markets[0].currency = 'USD'; }), 'MG_SCOPE');
    failsWith(run(id, (d) => { d.collections.markets[0].country = 'GB'; }), 'MG_SCOPE');
    failsWith(run(id, (d) => { d.collections.markets[0].is_illustrative = true; }), 'MG_SCOPE');
  });
}

// ------------------------------------------------------------------ cross-market independence
test('Dubai and Abu Dhabi are separate: Dubai sources and Dubai reviews do not satisfy Abu Dhabi', () => {
  const dxb = gateDataset(CFG, 'MKT-DXB', TODAY);
  // Abu Dhabi dataset whose sales statistic is sourced from the Dubai Land Department
  failsWith(run('MKT-AUH', (d) => { const e = ev(d, 'AUH-SALES-TX'); d.collections.sources.find(s => s.id === e.source_id).publisher = 'Dubai Land Department'; }), 'MG_STAT_SOURCE', 'AUH-SALES-TX');
  // Dubai's statistics recorded against Abu Dhabi do not carry Abu Dhabi's topics
  const g = run('MKT-AUH', (d) => { d.collections.evidence = dxb.collections.evidence.map(e => ({ ...clone(e), subject: { type: 'market', id: 'MKT-AUH' } })); d.collections.sources = clone(dxb.collections.sources); });
  failsWith(g, 'MG_STAT_MISSING', 'AUH-SALES-TX');
  // Dubai's legal reviews never count for Abu Dhabi (and vice versa)
  failsWith(run('MKT-AUH', (d) => { d.reviews = dxb.reviews; }), 'MG_REVIEW_MISSING');
  failsWith(run('MKT-DXB', (d) => { d.reviews = gateDataset(CFG, 'MKT-AUH', TODAY).reviews; }), 'MG_REVIEW_MISSING');
  // the shared federal FX evidence is recorded per market: Dubai's peg evidence is not Abu Dhabi's
  failsWith(run('MKT-AUH', (d) => { ev(d, 'AE-FX-PEG').subject = { type: 'market', id: 'MKT-DXB' }; }), 'MG_FX', 'AE-FX-PEG');
});

test('markets are evaluated independently: one passing market is not held by another failing market', () => {
  const a = gateDataset(CFG, 'MKT-IST', TODAY); const b = gateDataset(CFG, 'MKT-DXB', TODAY);
  const all = {}; for (const k of Object.keys(a.collections)) all[k] = [...a.collections[k], ...(k === 'evidence' ? [] : b.collections[k])]; // Dubai: no statistics
  const reviews = [...a.reviews, ...b.reviews]; const prov = { ...a.provenance, ...b.provenance };
  assert.equal(evaluateMarketGate(CFG, 'MKT-IST', all, { today: TODAY, reviews, provenance: prov }).pass, true);
  failsWith(evaluateMarketGate(CFG, 'MKT-DXB', all, { today: TODAY, reviews, provenance: prov }), 'MG_STAT_MISSING');
});

test('Abu Dhabi: the optional ADREC price index may be absent, but a recorded one must still be valid', () => {
  const g = run('MKT-AUH', (d) => { d.collections.evidence = d.collections.evidence.filter(e => e.topic !== 'AUH-PRICE-INDEX'); });
  assert.equal(g.pass, true); assert.equal(g.statistics.find(s => s.key === 'AUH-PRICE-INDEX').status, 'ABSENT_OPTIONAL');
  failsWith(run('MKT-AUH', (d) => { ev(d, 'AUH-PRICE-INDEX').period = '2024-01'; }), 'MG_STAT_STALE', 'AUH-PRICE-INDEX');
});

// ------------------------------------------------------------------ per-opportunity market requirements
const PRJ = (id, delivery) => ({ id: `PRJ-${id.slice(4)}-T`, market_id: id, delivery_status: delivery });
for (const id of MARKETS) {
  test(`${id}: per-opportunity registration / permit / title evidence is required and must be ESTABLISHED`, () => {
    const p = PRJ(id, 'OFF_PLAN'); const q = CFG.markets[id].publication.opportunity_requirements;
    const all = requirementEvidence(CFG, id, p.id, TODAY);
    assert.equal(opportunityRequirementReasons(CFG, id, p, { evidence: [], sources: [] }, { today: TODAY }).length, q.length);
    assert.deepEqual(opportunityRequirementReasons(CFG, id, p, all, { today: TODAY }), []);
    for (const r of q) {
      const d = clone(all); d.evidence.find(e => e.topic === r.key).verification_status = 'DEVELOPER-CLAIM';
      assert.ok(opportunityRequirementReasons(CFG, id, p, d, { today: TODAY }).some(w => w.includes(r.key)), `${r.key}: a developer claim is not evidence of registration`);
      const s = clone(all); s.sources.find(x => x.id === s.evidence.find(e => e.topic === r.key).source_id).source_type = 'DEVELOPER_MATERIAL';
      assert.ok(opportunityRequirementReasons(CFG, id, p, s, { today: TODAY }).some(w => w.includes(r.key)), `${r.key}: developer material is not a registry`);
      const o = clone(all); o.evidence.find(e => e.topic === r.key).last_verified = '2023-01-01'; o.evidence.find(e => e.topic === r.key).retrieved_at = '2023-01-01';
      assert.ok(opportunityRequirementReasons(CFG, id, p, o, { today: TODAY }).some(w => w.includes(r.key)), `${r.key}: expired evidence`);
    }
  });
}
test('requirements: off-plan conditions apply by delivery status; unknown status fails closed', () => {
  const ev0 = (id, p) => requirementEvidence(CFG, id, p.id, TODAY);
  const without = (d, key) => ({ ...d, evidence: d.evidence.filter(e => e.topic !== key) });
  const done = PRJ('MKT-DXB', 'COMPLETED'); const unknown = PRJ('MKT-DXB', null);
  assert.deepEqual(opportunityRequirementReasons(CFG, 'MKT-DXB', done, without(ev0('MKT-DXB', done), 'DXB-ESCROW-ACCOUNT'), { today: TODAY }), [], 'escrow not required for a completed project');
  assert.ok(opportunityRequirementReasons(CFG, 'MKT-DXB', unknown, without(ev0('MKT-DXB', unknown), 'DXB-ESCROW-ACCOUNT'), { today: TODAY }).some(w => w.includes('DXB-ESCROW-ACCOUNT')));
  const ist = PRJ('MKT-IST', 'UNDER_CONSTRUCTION');
  assert.ok(opportunityRequirementReasons(CFG, 'MKT-IST', ist, without(ev0('MKT-IST', ist), 'IST-BUILDING-PERMIT'), { today: TODAY }).some(w => w.includes('IST-BUILDING-PERMIT')));
});
test('requirements: an advertising / listing permit is waived only by a COMPLETE NOT_APPLICABLE review — never in public validation', () => {
  for (const [id, key] of [['MKT-DXB', 'DXB-ADVERTISING-PERMIT'], ['MKT-AUH', 'AUH-LISTING-PERMIT']]) {
    const p = PRJ(id, 'COMPLETED'); const d = requirementEvidence(CFG, id, p.id, TODAY); d.evidence = d.evidence.filter(e => e.topic !== key);
    const reviews = clone(gateDataset(CFG, id, TODAY).reviews); const r = reviews.find(x => x.topic === key);
    assert.ok(opportunityRequirementReasons(CFG, id, p, d, { today: TODAY, reviews }).some(w => w.includes(key)), `${key}: CLEAR review does not waive the permit`);
    r.outcome = 'NOT_APPLICABLE';
    assert.deepEqual(opportunityRequirementReasons(CFG, id, p, d, { today: TODAY, reviews }), [], `${key}: waived by counsel`);
    assert.ok(opportunityRequirementReasons(CFG, id, p, d, { today: TODAY, reviews: null }).some(w => w.includes(key)), `${key}: public validation cannot see the review → required`);
    r.status = 'PENDING'; r.outcome = null;
    assert.ok(opportunityRequirementReasons(CFG, id, p, d, { today: TODAY, reviews }).some(w => w.includes(key)), `${key}: a pending review waives nothing`);
  }
  // Abu Dhabi registration evidenced by the Dubai Land Department is refused
  const p = PRJ('MKT-AUH', 'COMPLETED'); const d = requirementEvidence(CFG, 'MKT-AUH', p.id, TODAY);
  d.sources.find(s => s.id === d.evidence.find(e => e.topic === 'AUH-PROJECT-REGISTRATION').source_id).publisher = 'Dubai Land Department';
  assert.ok(opportunityRequirementReasons(CFG, 'MKT-AUH', p, d, { today: TODAY }).some(w => w.includes('AUH-PROJECT-REGISTRATION')));
});

// ------------------------------------------------------------------ validator integration (V21)
const ON = { 'M-RISK-SEVERITY': 'INACTIVE', 'M-MARKET-GATE': 'ACTIVE' };
for (const id of MARKETS) {
  test(`${id}: validator — a hand-activated market is V21 while its computed gate fails; the stamp alone is not enough`, () => {
    const d = clone(gateDataset(CFG, id, TODAY));
    Object.assign(d.collections.markets[0], { activation: 'ACTIVE', record_status: 'PUBLISHED', review: { approved_by: 'owner', approved_at: TODAY, gate_version: 'MG-1' }, gate_certificate: { gate_version: 'MG-1', engine_version: 'MGE-1', evaluated_at: `${TODAY}T00:00:00Z`, activated_at: TODAY, valid_until: TODAY, waived_requirements: [] } });
    const v = (ds, reviews) => validateDataset({ collections: ds.collections }, { mode: 'private', today: TODAY, methods: ON, marketGates: { config: CFG, reviews, provenance: ds.provenance } }).errors.filter(e => e.code === 'V21');
    assert.deepEqual(v(d, d.reviews), [], 'passing gate + stamp: no V21');
    const stale = clone(d); stale.collections.evidence = stale.collections.evidence.filter(e => e.topic !== CFG.markets[id].fx.reference);
    assert.ok(v(stale, d.reviews).some(e => /computed gate MG-1 fails/.test(e.msg)), 'missing FX evidence');
    assert.ok(v(d, []).some(e => /MG_REVIEW_MISSING/.test(e.msg)), 'unapproved: no legal review');
    const nostamp = clone(d); nostamp.collections.markets[0].review.gate_version = 'G3-v1';
    assert.ok(v(nostamp, d.reviews).some(e => /activation stamp/.test(e.msg)));
    // public tree (PUB-2): the market record, its certificate and district names only — the research stays private
    const g = evaluateMarketGate(CFG, id, d.collections, { today: TODAY, reviews: d.reviews, provenance: d.provenance });
    const publicOf = (ds, cert) => { const x = clone(ds); for (const c of ['evidence', 'research_blocks', 'sources', 'conflicts']) x.collections[c] = []; for (const r of [...x.collections.markets, ...x.collections.districts]) { r.research_block_ids = []; r.evidence_ids = []; } x.collections.markets[0].gate_certificate = cert; return x; };
    const cert = gateCertificate(CFG, g, d.reviews, TODAY);
    const pub = (ds) => validateDataset({ collections: ds.collections }, { mode: 'public', today: TODAY, methods: ON, marketGates: { config: CFG, reviews: null } });
    const pd = publicOf(d, cert);
    assert.deepEqual(pub(pd).errors.filter(e => ['V21', 'V22'].includes(e.code)), [], 'stamp + current certificate: no V21/V22');
    const pnostamp = clone(pd); pnostamp.collections.markets[0].review.gate_version = 'G3-v1';
    assert.ok(pub(pnostamp).errors.some(e => e.code === 'V21' && /activation stamp/.test(e.msg)));
    assert.ok(pub(publicOf(d, null)).errors.some(e => e.code === 'V21' && /gate certificate/.test(e.msg)));
    // market research left in the public tree is rejected (V22)
    assert.ok(pub(d).errors.some(e => e.code === 'V22'), 'market research in public → V22');
    // a certificate past its validity date: a warning (W04), never a deployment-blocking error
    const pubStale = pub(publicOf(d, { ...cert, valid_until: sub(TODAY, 1) }));
    assert.ok(pubStale.warnings.some(w => w.code === 'W04') && !pubStale.errors.some(e => e.code === 'V21'));
    // registry not approved → V21 for any activation, whatever the data
    assert.ok(validateDataset({ collections: d.collections }, { mode: 'private', today: TODAY, methods: { 'M-MARKET-GATE': 'INACTIVE' }, marketGates: { config: CFG, reviews: d.reviews } }).errors.some(e => e.code === 'V21'));
  });
}

// ------------------------------------------------------------------ certificate validity horizon (PUB-2)
const addD = (d, n) => new Date(Date.parse(d + 'T00:00:00Z') + n * 86400000).toISOString().slice(0, 10);
for (const id of MARKETS) {
  test(`${id}: certificate valid_until is exactly the last day on which the same inputs still pass the gate`, () => {
    const d = gateDataset(CFG, id, TODAY);
    const g = evaluateMarketGate(CFG, id, d.collections, { today: TODAY, reviews: d.reviews, provenance: d.provenance });
    assert.ok(g.pass);
    const vu = gateValidUntil(CFG, g); assert.match(vu, /^\d{4}-\d{2}-\d{2}$/); assert.ok(vu >= TODAY);
    const at = (day) => evaluateMarketGate(CFG, id, d.collections, { today: day, reviews: d.reviews, provenance: d.provenance }).pass;
    assert.equal(at(vu), true, `passes on ${vu}`); assert.equal(at(addD(vu, 1)), false, `fails the day after ${vu}`);
    const c = gateCertificate(CFG, g, d.reviews, TODAY);
    assert.deepEqual(Object.keys(c).sort(), ['activated_at', 'engine_version', 'evaluated_at', 'gate_version', 'valid_until', 'waived_requirements']);
    assert.equal(certificateState(CFG, { id, review: { gate_version: 'MG-1' }, gate_certificate: c }, vu).ok, true);
    assert.equal(certificateState(CFG, { id, review: { gate_version: 'MG-1' }, gate_certificate: c }, addD(vu, 1)).code, 'MG_CERT_EXPIRED');
  });
}
assert.equal(gateValidUntil(CFG, { pass: false }), null);

// ------------------------------------------------------------------ K-1: one authoritative status
test('MG-1 status mirrors the method registry (authoritative) and never contradicts it', () => {
  const reg = readJson(path.join(ROOT, 'desk/data/methods.json')).methods.find(m => m.id === 'M-MARKET-GATE');
  assert.equal(CFG.status_authority, 'desk/data/methods.json#M-MARKET-GATE');
  if (reg.status === 'ACTIVE') { assert.ok(CFG.status.startsWith(reg.validation_status), CFG.status); assert.doesNotMatch(CFG.status, /PROPOSED|pending owner/i); }
  else assert.doesNotMatch(CFG.status, /RULES_APPROVED/);
});

test('registry semantics: an unknown publication value or an active blocked method is M01', () => {
  const repo = tmpRepo();
  try {
    const p = path.join(repo, 'desk/data/methods.json'); const j = readJson(p);
    j.methods.find(m => m.id === 'M-EVIDENCE').publication = 'SOMETIMES';
    const blocked = j.methods.find(m => m.publication === 'BLOCKED_UNTIL_METHOD_APPROVED'); Object.assign(blocked, { status: 'ACTIVE', validation_status: 'RULES_APPROVED', documented: true });
    writeJson(p, j);
    const e = validateRepo(repo, { today: TODAY }).errors.filter(x => x.code === 'M01').map(x => x.id);
    assert.ok(e.includes('M-EVIDENCE') && e.includes(blocked.id), JSON.stringify(e));
  } finally { fs.rmSync(repo, { recursive: true, force: true }); }
});

// ------------------------------------------------------------------ the real repository
test('real repository: gate rules approved (owner, 28 Oct 2026); all three markets INACTIVE and each fails closed on the public data', () => {
  const reg = readJson(path.join(ROOT, 'desk/data/methods.json')).methods.find(m => m.id === 'M-MARKET-GATE');
  assert.deepEqual([reg.status, reg.validation_status, reg.implemented, reg.contract, reg.tests], ['ACTIVE', 'RULES_APPROVED', true, 'MG-1', 'desk/_tests/marketgate.test.mjs']);
  assert.match(reg.approved, /owner instruction 28 Oct 2026/);
  const pubC = {}; for (const f of fs.readdirSync(path.join(ROOT, 'desk/data/public')).filter(f => f.endsWith('.json') && f !== 'published.json')) pubC[f.slice(0, -5)] = readJson(path.join(ROOT, 'desk/data/public', f)).records;
  for (const id of MARKETS) {
    const m = pubC.markets.find(x => x.id === id); assert.equal(m.activation, 'INACTIVE'); assert.notEqual(m.record_status, 'PUBLISHED');
    const g = evaluateMarketGate(CFG, id, pubC, { today: TODAY, reviews: [] });
    assert.equal(g.pass, false); for (const c of ['MG_STAT_MISSING', 'MG_FX', 'MG_REVIEW_MISSING']) failsWith(g, c);
  }
  assert.deepEqual(validateRepo(ROOT, { today: TODAY }).report.index.markets, []);
  assert.equal(CONFIG_PATH, path.join(ROOT, 'desk/_tools/market-gates/MG-1.json'));
});

// ------------------------------------------------------------------ commands, end to end (temporary repository + store)
const storeWithMarkets = (repo) => {
  const store = tmp('desk-mg-store-'); fs.mkdirSync(path.join(store, 'data'), { recursive: true });
  const mk = readJson(path.join(repo, 'desk/data/public/markets.json')).records.map(m => ({ ...m, review: null, research_block_ids: [], evidence_ids: [] }));
  writeJson(path.join(store, 'data/markets.json'), { schema_version: '1.1', collection: 'markets', records: mk });
  return store;
};
const review = (repo, S, id, t, extra = []) => cli(repo, ['record-review', ...S, '--market', id, '--topic', t.key, '--status', 'COMPLETE', '--outcome', 'CLEAR', '--reviewer', 'TEST-ONLY counsel', '--role', CFG.markets[id].regulatory_review.reviewer_roles[0], '--reference', `TEST-ONLY memo ${t.key}`, '--reviewed-at', sub(TODAY, 5), '--by', 'owner', ...extra]);

test('commands: market-intake + record-review + market-gate; activate-market is refused while the owner has not approved the gate rules', () => {
  const repo = tmpRepo(); disableTestMarketGate(repo); const store = storeWithMarkets(repo); const S = ['--store', store]; const pkgDir = tmp('desk-mg-pkg-');
  try {
    // nothing recorded: every market fails, with machine-readable reasons written to the private store
    let r = cli(repo, ['market-gate', ...S]); assert.equal(r.code, 0, r.out);
    for (const id of MARKETS) { assert.match(r.out, new RegExp(`${id} \\(MG-1, [^)]+\\): FAIL`)); const j = readJson(path.join(store, `reports/market-gate-${id}.json`)); assert.equal(j.pass, false); assert.ok(j.reasons.length > 5 && j.reasons.every(x => x.code && x.item && x.detail)); }
    // record a complete Istanbul dataset and its reviews
    const d = gateDataset(CFG, 'MKT-IST', TODAY);
    const f = path.join(pkgDir, 'mi.json'); writeJson(f, d.intake);
    assert.notEqual(cli(repo, ['market-intake', ...S, '--file', f]).code, 0, 'needs --by owner');
    r = cli(repo, ['market-intake', ...S, '--file', f, '--by', 'owner']); assert.equal(r.code, 0, r.out);
    assert.notEqual(review(repo, S, 'MKT-IST', { key: 'DXB-AGENT-AUTHORIZATION' }).code, 0, 'a Dubai topic cannot be recorded for Istanbul');
    assert.notEqual(cli(repo, ['record-review', ...S, '--market', 'MKT-IST', '--topic', 'IST-NOT-ADVICE', '--status', 'COMPLETE', '--reviewer', 'x', '--role', 'LICENSED_COUNSEL_TR', '--reference', 'm', '--reviewed-at', TODAY, '--by', 'owner']).code, 0, 'COMPLETE needs an outcome');
    for (const t of CFG.markets['MKT-IST'].regulatory_review.topics) assert.equal(review(repo, S, 'MKT-IST', t).code, 0);
    r = cli(repo, ['market-gate', ...S, '--id', 'MKT-IST']); assert.match(r.out, /MKT-IST \(MG-1, [^)]+\): PASS/, r.out);
    // passing gate, but the registry entry is INACTIVE (rules not approved by the owner): refused, nothing changes
    const before = fs.readFileSync(path.join(store, 'data/markets.json'), 'utf8');
    r = cli(repo, ['activate-market', ...S, '--id', 'MKT-IST', '--by', 'owner']); assert.equal(r.code, 1); assert.match(r.out, /NOT activated[\s\S]*has not approved the gate rules/);
    assert.equal(fs.readFileSync(path.join(store, 'data/markets.json'), 'utf8'), before);
    const audit = readJson(path.join(store, 'private/audit_log.json'));
    assert.ok(audit.some(a => a.action === 'market-intake') && audit.filter(a => a.action === 'record-review').length === CFG.markets['MKT-IST'].regulatory_review.topics.length);
    assert.ok(!audit.some(a => a.action === 'activate-market'));
    // the public tree is never touched by any of these commands
    assert.deepEqual(validateRepo(repo, { today: TODAY }).errors, []);
  } finally { for (const x of [repo, store, pkgDir]) fs.rmSync(x, { recursive: true, force: true }); }
});

test('commands (simulated owner approval of the rules): each market is activated only if its own gate passes', () => {
  const repo = tmpRepo(); enableTestMarketGate(repo); const store = storeWithMarkets(repo); const S = ['--store', store]; const pkgDir = tmp('desk-mg-pkg-');
  try {
    // Istanbul: complete. Dubai: complete except legal review. Abu Dhabi: nothing.
    for (const id of ['MKT-IST', 'MKT-DXB']) { const f = path.join(pkgDir, `${id}.json`); writeJson(f, gateDataset(CFG, id, TODAY).intake); assert.equal(cli(repo, ['market-intake', ...S, '--file', f, '--by', 'owner']).code, 0); }
    for (const t of CFG.markets['MKT-IST'].regulatory_review.topics) review(repo, S, 'MKT-IST', t);
    for (const t of CFG.markets['MKT-DXB'].regulatory_review.topics.slice(1)) review(repo, S, 'MKT-DXB', t); // first topic missing
    assert.notEqual(cli(repo, ['activate-market', ...S, '--id', 'MKT-IST']).code, 0, 'needs --by owner');
    let r = cli(repo, ['activate-market', ...S, '--id', 'MKT-DXB', '--by', 'owner']); assert.equal(r.code, 1); assert.match(r.out, /MG_REVIEW_MISSING DXB-AGENT-AUTHORIZATION/);
    r = cli(repo, ['activate-market', ...S, '--id', 'MKT-AUH', '--by', 'owner']); assert.equal(r.code, 1); assert.match(r.out, /MG_STAT_MISSING AUH-SALES-TX/);
    r = cli(repo, ['activate-market', ...S, '--id', 'MKT-IST', '--by', 'owner']); assert.equal(r.code, 0, r.out); assert.match(r.out, /MKT-IST ACTIVE in the store \(gate MG-1/);
    const mk = readJson(path.join(store, 'data/markets.json')).records;
    assert.deepEqual(mk.map(m => [m.id, m.activation]).sort(), [['MKT-AUH', 'INACTIVE'], ['MKT-DXB', 'INACTIVE'], ['MKT-IST', 'ACTIVE']]);
    assert.equal(mk.find(m => m.id === 'MKT-IST').review.gate_version, 'MG-1');
    assert.ok(readJson(path.join(store, 'private/audit_log.json')).some(a => a.action === 'activate-market' && a.id === 'MKT-IST' && a.gate_version === 'MG-1'));
    // a hand edit of Dubai to ACTIVE in the store is caught by the store gate (V21)
    const mp = path.join(store, 'data/markets.json'); const j = readJson(mp); Object.assign(j.records.find(m => m.id === 'MKT-DXB'), { activation: 'ACTIVE', review: { approved_by: 'owner', approved_at: TODAY, gate_version: 'MG-1' } }); writeJson(mp, j);
    r = cli(repo, ['gate', ...S]); assert.match(r.out, /✗ \[V21\] MKT-DXB: .*computed gate MG-1 fails/);
    // Istanbul later loses a review (withdrawn): the store gate flags the active market immediately
    const t0 = CFG.markets['MKT-IST'].regulatory_review.topics[0].key;
    assert.equal(cli(repo, ['record-review', ...S, '--market', 'MKT-IST', '--topic', t0, '--status', 'WITHDRAWN', '--reviewer', 'TEST-ONLY counsel', '--role', 'LICENSED_COUNSEL_TR', '--reference', 'TEST-ONLY withdrawal', '--reviewed-at', TODAY, '--by', 'owner']).code, 0);
    r = cli(repo, ['gate', ...S]); assert.match(r.out, /✗ \[V21\] MKT-IST: .*MG_REVIEW_INCOMPLETE/);
  } finally { for (const x of [repo, store, pkgDir]) fs.rmSync(x, { recursive: true, force: true }); }
});

test('market intake refuses records outside the market, currency amounts and unowned overwrites — nothing written', () => {
  const repo = tmpRepo(); const store = storeWithMarkets(repo); const S = ['--store', store]; const pkgDir = tmp('desk-mg-pkg-');
  try {
    const d = clone(gateDataset(CFG, 'MKT-IST', TODAY).intake);
    const bad = [
      (x) => { x.evidence[0].subject = { type: 'market', id: 'MKT-DXB' }; },
      (x) => { x.evidence[0].currency = 'TRY'; },
      (x) => { x.districts[0].market_id = 'MKT-DXB'; },
      (x) => { x.evidence[0].unit = 'furlongs'; },
      (x) => { x.intake_id = 'whatever'; }
    ];
    for (const spoil of bad) {
      const x = clone(d); spoil(x); const f = path.join(pkgDir, 'bad.json'); writeJson(f, x);
      const r = cli(repo, ['market-intake', ...S, '--file', f, '--by', 'owner']); assert.equal(r.code, 1, r.out); assert.match(r.out, /refused — nothing written/);
      assert.ok(!fs.existsSync(path.join(store, 'data/evidence.json')));
    }
    const f = path.join(pkgDir, 'ok.json'); writeJson(f, d); assert.equal(cli(repo, ['market-intake', ...S, '--file', f, '--by', 'owner']).code, 0);
    const other = { ...clone(d), intake_id: 'MI-IST-OTHER' }; writeJson(f, other);
    assert.match(cli(repo, ['market-intake', ...S, '--file', f, '--by', 'owner']).out, /already exists and was not created by MI-IST-OTHER/);
  } finally { for (const x of [repo, store, pkgDir]) fs.rmSync(x, { recursive: true, force: true }); }
});

// ------------------------------------------------------------------ public market activation (D11/D12)
test('certificate: a counsel waiver reaches the public check only through the gate certificate of the same version', () => {
  const p = { id: 'PRJ-DXB-T', market_id: 'MKT-DXB', delivery_status: 'COMPLETED' };
  const d = requirementEvidence(CFG, 'MKT-DXB', p.id, TODAY); d.evidence = d.evidence.filter(e => e.topic !== 'DXB-ADVERTISING-PERMIT');
  const cert = { gate_version: 'MG-1', waived_requirements: ['DXB-ADVERTISING-PERMIT'] };
  assert.deepEqual(opportunityRequirementReasons(CFG, 'MKT-DXB', p, d, { today: TODAY, reviews: null, certificate: cert }), []);
  assert.ok(opportunityRequirementReasons(CFG, 'MKT-DXB', p, d, { today: TODAY, reviews: null, certificate: { ...cert, gate_version: 'MG-0' } }).some(w => w.includes('DXB-ADVERTISING-PERMIT')), 'other gate version: not honoured');
  assert.ok(opportunityRequirementReasons(CFG, 'MKT-DXB', p, d, { today: TODAY, reviews: null, certificate: { ...cert, waived_requirements: ['DXB-PROJECT-REGISTRATION'] } }).some(w => w.includes('DXB-ADVERTISING-PERMIT')));
  // a requirement without a basis review can never be waived, even if a certificate lists it
  const e2 = requirementEvidence(CFG, 'MKT-DXB', p.id, TODAY); e2.evidence = e2.evidence.filter(e => e.topic !== 'DXB-PROJECT-REGISTRATION');
  assert.ok(opportunityRequirementReasons(CFG, 'MKT-DXB', p, e2, { today: TODAY, reviews: null, certificate: { gate_version: 'MG-1', waived_requirements: ['DXB-PROJECT-REGISTRATION'] } }).some(w => w.includes('DXB-PROJECT-REGISTRATION')));
});

test('commands (simulated owner approval): activate → export-market publishes the market with its certificate; deactivate-market rolls back', () => {
  const repo = tmpRepo(); enableTestMarketGate(repo); const store = storeWithMarkets(repo); const S = ['--store', store]; const pkgDir = tmp('desk-mg-pkg-');
  try {
    const f = path.join(pkgDir, 'dxb.json'); writeJson(f, gateDataset(CFG, 'MKT-DXB', TODAY).intake);
    assert.equal(cli(repo, ['market-intake', ...S, '--file', f, '--by', 'owner']).code, 0);
    for (const t of CFG.markets['MKT-DXB'].regulatory_review.topics) {
      const extra = t.key === 'DXB-ADVERTISING-PERMIT' ? ['--outcome', 'NOT_APPLICABLE'] : ['--outcome', 'CLEAR'];
      const r = cli(repo, ['record-review', ...S, '--market', 'MKT-DXB', '--topic', t.key, '--status', 'COMPLETE', ...extra, '--reviewer', 'TEST-ONLY counsel', '--role', 'LICENSED_COUNSEL_UAE', '--reference', `TEST-ONLY memo ${t.key}`, '--reviewed-at', sub(TODAY, 5), '--by', 'owner']);
      assert.equal(r.code, 0, r.out);
    }
    // not yet activated: export refused, nothing changes
    const before = fs.readFileSync(path.join(repo, 'desk/data/public/markets.json'), 'utf8');
    let r = cli(repo, ['export-market', ...S, '--id', 'MKT-DXB', '--by', 'owner']); assert.notEqual(r.code, 0); assert.match(r.out, /not activated in the store/);
    assert.notEqual(cli(repo, ['export-market', ...S, '--id', 'MKT-DXB']).code, 0, 'needs --by owner');
    assert.equal(fs.readFileSync(path.join(repo, 'desk/data/public/markets.json'), 'utf8'), before);
    r = cli(repo, ['activate-market', ...S, '--id', 'MKT-DXB', '--by', 'owner']); assert.equal(r.code, 0, r.out);
    const sm = readJson(path.join(store, 'data/markets.json')).records.find(m => m.id === 'MKT-DXB');
    assert.deepEqual(sm.gate_certificate.waived_requirements, ['DXB-ADVERTISING-PERMIT']);
    assert.ok(!JSON.stringify(sm.gate_certificate).includes('TEST-ONLY memo'), 'the certificate carries no review text');
    r = cli(repo, ['export-market', ...S, '--id', 'MKT-DXB', '--by', 'owner']); assert.equal(r.code, 0, r.out);
    const pm = readJson(path.join(repo, 'desk/data/public/markets.json')).records.find(m => m.id === 'MKT-DXB');
    assert.equal(pm.activation, 'ACTIVE'); assert.equal(pm.review.gate_version, 'MG-1'); assert.deepEqual(pm.gate_certificate, sm.gate_certificate);
    // PUB-2: the market's research stays in the store; the public side is the record, the certificate and district names
    assert.ok(/^\d{4}-\d{2}-\d{2}$/.test(pm.gate_certificate.valid_until) && pm.gate_certificate.valid_until >= TODAY, 'certificate carries its validity date');
    assert.ok(!('conditions_topics' in pm.gate_certificate), 'no counsel-condition topics in public');
    assert.deepEqual([pm.research_block_ids, pm.evidence_ids], [[], []]);
    for (const c of ['evidence', 'research_blocks', 'conflicts']) assert.ok(!readJson(path.join(repo, `desk/data/public/${c}.json`)).records.some(r => r.subject && ['market', 'district'].includes(r.subject.type)), `no market or district ${c} in public`);
    const pd = readJson(path.join(repo, 'desk/data/public/districts.json')).records.filter(d => d.market_id === 'MKT-DXB');
    assert.ok(pd.length >= 1 && pd.every(d => !d.research_block_ids.length && !d.evidence_ids.length), 'district names only');
    assert.ok(!fs.readFileSync(path.join(repo, 'desk/markets/dubai/index.html'), 'utf8').includes('TEST-ONLY memo'));
    const v = validateRepo(repo, { today: TODAY }); assert.deepEqual(v.errors, []);
    assert.deepEqual(v.report.index.markets, ['MKT-DXB']);
    assert.match(fs.readFileSync(path.join(repo, 'desk/markets/dubai/index.html'), 'utf8'), /data-market-status="open"/);
    for (const id of ['MKT-IST', 'MKT-AUH']) assert.equal(readJson(path.join(repo, 'desk/data/public/markets.json')).records.find(m => m.id === id).activation, 'INACTIVE', `${id} unaffected`);
    // rollback
    assert.notEqual(cli(repo, ['deactivate-market', ...S, '--id', 'MKT-DXB', '--by', 'owner']).code, 0, '--reason required');
    r = cli(repo, ['deactivate-market', ...S, '--id', 'MKT-DXB', '--by', 'owner', '--reason', 'TEST-ONLY rollback']); assert.equal(r.code, 0, r.out);
    const pm2 = readJson(path.join(repo, 'desk/data/public/markets.json')).records.find(m => m.id === 'MKT-DXB');
    assert.equal(pm2.activation, 'INACTIVE'); assert.equal(pm2.gate_certificate, null); assert.equal(pm2.review, null);
    assert.deepEqual(validateRepo(repo, { today: TODAY }).errors, []);
    assert.match(fs.readFileSync(path.join(repo, 'desk/markets/dubai/index.html'), 'utf8'), /data-market-status="preparing"/);
    const audit = readJson(path.join(store, 'private/audit_log.json')).map(a => a.action);
    for (const a of ['activate-market', 'export-market', 'deactivate-market']) assert.ok(audit.includes(a), a);
  } finally { for (const x of [repo, store, pkgDir]) fs.rmSync(x, { recursive: true, force: true }); }
});

test('a hand-edited ACTIVE public market without a certificate is refused (V21) even with the stamp', () => {
  const repo = tmpRepo(); enableTestMarketGate(repo);
  try {
    const mp = path.join(repo, 'desk/data/public/markets.json'); const mk = readJson(mp);
    Object.assign(mk.records.find(m => m.id === 'MKT-IST'), { activation: 'ACTIVE', record_status: 'PUBLISHED', review: { approved_by: 'owner', approved_at: TODAY, gate_version: 'MG-1' } });
    writeJson(mp, mk);
    assert.ok(validateRepo(repo, { today: TODAY }).errors.some(e => e.code === 'V21' && e.id === 'MKT-IST' && /gate certificate/.test(e.msg)));
  } finally { fs.rmSync(repo, { recursive: true, force: true }); }
});
