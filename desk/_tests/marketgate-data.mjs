// TEST-ONLY synthetic market-gate data. Builds, from a market's own MG-1 configuration, the smallest dataset that
// satisfies every rule of that configuration — so the positive test proves the rules are satisfiable and each negative
// test removes or spoils exactly one thing. Values are placeholders ("TEST-ONLY"); nothing here is research.
const sub = (date, n) => new Date(Date.parse(date + 'T00:00:00Z') - n * 86400000).toISOString().slice(0, 10);
const ym = (date) => date.slice(0, 7);
const prevMonth = (date) => { const d = new Date(Date.parse(date.slice(0, 7) + '-01T00:00:00Z') - 86400000); return d.toISOString().slice(0, 7); };
const quarterBefore = (date) => { const y = +date.slice(0, 4); const q = Math.floor((+date.slice(5, 7) - 1) / 3); return q === 0 ? `${y - 1}-Q4` : `${y}-Q${q}`; };

// a period that has ended and is inside the freshness limit
export function periodFor(format, today) {
  const fs = format.split('|');
  if (fs.includes('YYYY-MM-DD')) return sub(today, 1);
  if (fs.includes('YYYY-MM')) return prevMonth(today);
  if (fs.includes('YYYY-Q[1-4]')) return quarterBefore(today);
  return String(+today.slice(0, 4) - 1);
}
const VALUE = { count: 1000, index: 100, percent: 1.5, ratio: 3.6725 };

export function gateDataset(cfg, marketId, today, { tag = marketId.slice(4) } = {}) {
  const m = cfg.markets[marketId];
  const market = { id: marketId, slug: `t-${tag.toLowerCase()}`, name: `TEST-ONLY ${m.name}`, country: m.country, currency: m.currency, category: m.scope.categories[0], activation: 'INACTIVE', record_status: 'DRAFT', research_block_ids: [], evidence_ids: [], field_states: [], last_reviewed: today, is_illustrative: false, review: null };
  const district = { id: `DST-${tag}-TEST`, market_id: marketId, slug: `d-${tag.toLowerCase()}`, name: 'TEST-ONLY district', admin_level: 'DISTRICT', record_status: 'DRAFT', research_block_ids: [], evidence_ids: [], field_states: [], is_illustrative: false };
  const blocks = m.research_blocks.map((b, i) => ({ id: `RB-${tag}-MG-${i + 1}`, subject: { type: 'market', id: marketId }, domain: b.domain, research_closure: b.closure[0], data_completeness: b.completeness_min === 'NO' ? 'PARTIAL' : b.completeness_min, last_reviewed: sub(today, 10), next_review_trigger: null, note: { en: 'TEST-ONLY block' }, is_illustrative: false }));
  blocks.push({ id: `RB-${tag}-MG-D`, subject: { type: 'district', id: district.id }, domain: m.districts.domain || 'DISTRICT', research_closure: m.districts.closure[0], data_completeness: m.districts.completeness_min, last_reviewed: sub(today, 10), next_review_trigger: null, note: { en: 'TEST-ONLY district block' }, is_illustrative: false });
  const sources = []; const evidence = [];
  m.statistics.forEach((s, i) => {
    const src = { id: `SRC-${tag}-MG-${i + 1}`, name: `TEST-ONLY ${s.name}`, publisher: s.accepted_sources.publishers[0], url: 'https://example.org/test-only', tier: 1, source_type: s.accepted_sources.source_types[0], accessed_at: sub(today, 2), notes: null, is_illustrative: false };
    sources.push(src);
    evidence.push({ id: `EVD-${tag}-MG-${i + 1}`, source_id: src.id, subject: { type: 'market', id: marketId }, field: null, topic: s.key, claim: { en: `TEST-ONLY ${s.key}` }, value: VALUE[s.unit] ?? 'TEST', unit: s.unit, currency: null, geography: s.geography, geo_code: null, period: periodFor(s.period_format, today), series_id: s.unit === 'index' ? 'TEST-ONLY-SERIES' : null, base_period: s.unit === 'index' ? '2023' : null, method_note: null, area_basis: null, evidence_class: 'FACT', verification_status: 'VERIFIED', source_tier: 1, published_at: sub(today, 3), retrieved_at: sub(today, 2), last_verified: sub(today, 2), source_url: 'https://example.org/test-only', source_locator: 'TEST-ONLY table 1', limitations: null, next_review_trigger: null, conflict_ids: [], is_illustrative: false });
  });
  market.research_block_ids = blocks.filter(b => b.subject.type === 'market').map(b => b.id);
  market.evidence_ids = evidence.map(e => e.id);
  district.research_block_ids = [`RB-${tag}-MG-D`];
  const reviews = m.regulatory_review.topics.map((t, i) => ({ id: `REG-${tag}-${String(i + 1).padStart(3, '0')}`, seq: i + 1, market_id: marketId, topic: t.key, status: 'COMPLETE', outcome: 'CLEAR', conditions: [], reviewer: 'TEST-ONLY counsel', reviewer_role: m.regulatory_review.reviewer_roles[0], reference: `TEST-ONLY memo ${t.key}`, reviewed_at: sub(today, 20), valid_until: null, recorded_by: 'owner', recorded_at: sub(today, 20) }));
  const collections = { markets: [market], districts: [district], research_blocks: blocks, sources, evidence, conflicts: [] };
  const provenance = Object.fromEntries([...blocks, ...sources, ...evidence, district].map(r => [r.id, { created_by: `MI-${tag}-TEST`, received_at: today }]));
  return { collections, reviews, provenance, intake: { intake_id: `MI-${tag}-TEST`, market_id: marketId, sources, evidence, research_blocks: blocks, districts: [district], conflicts: [] } };
}

// project-level requirement evidence for an opportunity in the market (registration, permits, title status)
export function requirementEvidence(cfg, marketId, projectId, today, { tag = marketId.slice(4) } = {}) {
  const m = cfg.markets[marketId]; const sources = []; const evidence = [];
  m.publication.opportunity_requirements.forEach((q, i) => {
    const src = { id: `SRC-${tag}-RQ-${i + 1}`, name: `TEST-ONLY ${q.name}`, publisher: (q.accepted_sources.publishers || ['TEST-ONLY registry'])[0], url: 'https://example.org/test-only', tier: 1, source_type: q.accepted_sources.source_types[0], accessed_at: sub(today, 2), notes: null, is_illustrative: false };
    sources.push(src);
    evidence.push({ id: `EVD-${tag}-RQ-${i + 1}`, source_id: src.id, subject: { type: 'project', id: projectId }, field: null, topic: q.key, claim: { en: `TEST-ONLY ${q.key}` }, value: 'TEST-ONLY', unit: 'text', currency: null, geography: m.name, geo_code: null, period: null, series_id: null, base_period: null, method_note: null, area_basis: null, evidence_class: 'LEGAL FACT', verification_status: 'VERIFIED', source_tier: 1, published_at: null, retrieved_at: sub(today, 2), last_verified: sub(today, 2), source_url: 'https://example.org/test-only', source_locator: 'TEST-ONLY record', limitations: null, next_review_trigger: null, conflict_ids: [], is_illustrative: false });
  });
  return { sources, evidence };
}
export { sub, ym };
