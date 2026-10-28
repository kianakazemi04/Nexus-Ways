// Claude project workflow, end to end (owner brief 28 Oct 2026) — run with:  node --test desk/_tests/workflow.test.mjs
// Liquidity & exit review (EXR-1), opportunity comparison and research queue (OPC-1), and the full path
// package → ingest → permissions → report → compare → approval → export, with clearly labelled TEST-ONLY data.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { publishedSetup, cli, readJson, writeJson, OPP, deskSnap } from './helpers.mjs';
import { exitReview } from '../_tools/engines/exit.mjs';
import { compareOpportunities, classify, REASON_KIND } from '../_tools/engines/oppcompare.mjs';
import { ROOT } from './helpers.mjs';

test('EXR-1: with no liquidity evidence every input is DATA NOT AVAILABLE and no estimate is produced', () => {
  const r = exitReview({ collections: {}, subjects: [{ type: 'project', id: 'P' }], marketId: 'M' });
  assert.equal(r.not_available.length, 4); assert.ok(r.not_available.every(x => x.state === 'DATA NOT AVAILABLE'));
  assert.match(r.statement, /cannot be assessed/); assert.doesNotMatch(JSON.stringify(r), /"(score|rating|days_to_sell|discount_pct)"/);
});

test('EXR-1: risks weaken, closed liquidity research supports, market counts are context only, private observations fill inputs', () => {
  const collections = {
    risks: [{ id: 'R1', subject: { type: 'project', id: 'P' }, risk_type: 'LIQUIDITY_EXIT', title: { en: 'Thin resale market for large units' }, evidence_ids: ['E1'] }, { id: 'R2', subject: { type: 'project', id: 'P' }, risk_type: 'TAX', title: { en: 'x' } }],
    research_blocks: [{ id: 'B1', subject: { type: 'district', id: 'D' }, domain: 'LIQUIDITY', research_closure: 'YES', data_completeness: 'PARTIAL' }],
    evidence: [{ id: 'E9', subject: { type: 'market', id: 'M' }, topic: 'IST-HOUSING-SALES', period: '2026-09', value: 22212, unit: 'count', verification_status: 'SOURCE-REPORTED' }]
  };
  const r = exitReview({ collections, subjects: [{ type: 'project', id: 'P' }, { type: 'district', id: 'D' }], marketId: 'M', privateFacts: [{ domain: 'LIQUIDITY', key: 'RESALE_TRANSACTIONS' }] });
  assert.deepEqual(r.weakening.map(x => x.ref), ['R1']);
  assert.deepEqual(r.supporting.map(x => x.ref), ['B1']);
  assert.match(r.context[0].text, /activity depth, not unit liquidity/);
  assert.deepEqual(r.available.map(x => x.key), ['RESALE_TRANSACTIONS']); assert.equal(r.not_available.length, 3);
});

const rep = (o) => ({ overview: { title: o.id, publishable: !o.why.length }, facts: o.facts || [], gaps: o.gaps || [], conflicts: o.conflicts || [], risks: [], finance: {}, comparables: { status: 'UNAVAILABLE' }, fit: o.fit || { status: 'UNAVAILABLE' }, exit: { not_available: [1, 2, 3, 4] }, next_steps: o.next || [] });
const G = (code, msg = code) => ({ code, msg });
test('OPC-2: explicit classes from structured gate codes, and a work-planning queue that is not an investment ranking', () => {
  assert.equal(classify({ ...rep({ id: 'A', why: [] }), gate_codes: [] }).class, 'READY_FOR_PUBLICATION_REVIEW');
  assert.equal(classify({ ...rep({ id: 'B', why: ['x'] }), gate_codes: [G('DISCLOSURE_PENDING', 'disclosure DSC-1 (COMMISSION) legal review pending')] }).class, 'AWAITING_OWNER_OR_EXTERNAL_INPUT');
  assert.equal(classify({ ...rep({ id: 'C', why: ['x'] }), gate_codes: [G('RESEARCH_BLOCK_MISSING', 'no RISK research block')] }).class, 'RESEARCH_NEXT');
  assert.equal(classify({ ...rep({ id: 'D', why: [], fit: { status: 'OK', outcome: 'NOT_SUITABLE', criteria: [{ criterion: 'market', result: 'NO_MATCH', reason: 'market M' }] } }), gate_codes: [] }).class, 'NOT_SUITABLE_FOR_PROFILE');
  // the class no longer depends on wording: an owner reason whose text says "research" stays an owner reason, and
  // research text that mentions "approval" stays research (the defect of the text matcher in OPC-1)
  assert.equal(classify({ ...rep({ id: 'E', why: ['x'] }), gate_codes: [G('PROJECT_PERMISSION', 'project permission: research note')] }).class, 'AWAITING_OWNER_OR_EXTERNAL_INPUT');
  assert.equal(classify({ ...rep({ id: 'F', why: ['x'] }), gate_codes: [G('EVIDENCE_NOT_PUBLISHABLE', 'PRJ:approval_date has no publishable evidence')] }).class, 'RESEARCH_NEXT');
  // mixed owner + research → research first; an unknown code is research and is reported, never silently owner
  const mix = classify({ ...rep({ id: 'G', why: ['x'] }), gate_codes: [G('DISCLOSURE_PENDING'), G('NO_RISK'), G('SOMETHING_NEW')] });
  assert.equal(mix.class, 'RESEARCH_NEXT'); assert.ok(mix.basis.includes('unclassified reason code SOMETHING_NEW'));
  const c = compareOpportunities([
    { id: 'OPP-X', report: rep({ id: 'X', why: ['a', 'b'], gaps: ['g'] }), gate_codes: [G('RESEARCH_BLOCK_MISSING', 'no RISK research block'), G('RESEARCH_BLOCK_MISSING', 'no DEVELOPER research block')] },
    { id: 'OPP-Y', report: rep({ id: 'Y', why: [] }), gate_codes: [] }
  ]);
  assert.equal(c.status, 'OK'); assert.equal(c.version, 'OPC-2'); assert.deepEqual(c.research_queue.map(q => q.id), ['OPP-Y', 'OPP-X']);
  assert.match(c.note, /not an investment ranking/); assert.doesNotMatch(JSON.stringify(c), /"(score|weight|rank)"/);
  assert.equal(compareOpportunities([{ id: 'A', report: rep({ id: 'A', why: [] }) }]).status, 'UNAVAILABLE');
});

test('OPC-2: every reason code the publication gate can emit is classified, and every message carries a code', () => {
  const src = fs.readFileSync(path.join(ROOT, 'desk/_tools/validate.mjs'), 'utf8');
  const emitted = [...new Set([...src.matchAll(/\bP\('([A-Z_]+)'/g)].map(m => m[1]))];
  assert.ok(emitted.length >= 30, `${emitted.length} codes`);
  assert.deepEqual(emitted.filter(c => !(c in REASON_KIND)), [], 'unclassified codes');
  assert.deepEqual(Object.keys(REASON_KIND).filter(c => !emitted.includes(c)), [], 'classified codes the gate never emits');
  const blk = src.slice(src.indexOf('const opp = {}; const oppCodes = {};'), src.indexOf('opp[r.id] = why;'));
  assert.equal((blk.match(/why\.push\(/g) || []).length, 1, 'only the coded helper pushes reasons');
});

test('workflow end to end (TEST-ONLY): two projects → reports → comparison → only the approved one is public', () => {
  const s = publishedSetup();
  try {
    // a second, unapproved project from another package (new name; developer linked by explicit ID)
    const pkg2 = s.mkPkg('PKG-TWO', (i) => { i.project = { ...i.project, name: 'TEST-ONLY Residence Two', slug: 'test-only-residence-two' }; i.developer = { ref: 'DEV-ILLUSTRATIVE-DEVELOPER-A' }; i.district = { ref: readJson(path.join(s.store, 'data/projects.json')).records[0].district_id }; i.media = []; i.permissions = []; i.opportunity = { ...(i.opportunity || {}), title: { en: 'TEST-ONLY Residence Two' } }; });
    let r = cli(s.repo, ['ingest', '--package', pkg2, ...s.S, '--apply']); assert.equal(r.code, 0, r.out);
    const opps = readJson(path.join(s.store, 'data/opportunities.json')).records.map(o => o.id);
    const two = opps.find(id => id !== OPP); assert.ok(two);
    const before = deskSnap(s.repo);
    r = cli(s.repo, ['compare', ...s.S, '--ids', `${OPP},${two}`]); assert.equal(r.code, 0, r.out);
    const c = readJson(path.join(s.store, 'reports', fs.readdirSync(path.join(s.store, 'reports')).find(f => /^compare-.*\.json$/.test(f))));
    assert.equal(c.rows.length, 2);
    const rowTwo = c.rows.find(x => x.id === two);
    assert.notEqual(rowTwo.class, 'READY_FOR_PUBLICATION_REVIEW');
    assert.ok(rowTwo.basis.some(b => /project permission|no publishable cover|gap/.test(b)), JSON.stringify(rowTwo.basis));
    assert.equal(c.rows.find(x => x.id === OPP).exit_inputs_missing, 4);
    // the decision report carries the qualitative exit section and liquidity diligence steps
    r = cli(s.repo, ['report', ...s.S, '--id', two]); assert.equal(r.code, 0, r.out);
    assert.match(r.out, /## 9b\. Liquidity and exit \(EXR-1, qualitative\)/); assert.match(r.out, /DATA NOT AVAILABLE: Resale transactions/);
    assert.match(r.out, /project permission: no written project permission/);
    // nothing of this reached the public tree
    assert.deepEqual(deskSnap(s.repo), before);
    assert.ok(!readJson(path.join(s.repo, 'desk/data/public/published.json')).opportunities.includes(two));
  } finally { s.cleanup(); }
});

test('indexing (K-4): noindex while nothing is published; from the first publication Explore, Markets, Intelligence and the opportunity page are indexable', () => {
  const head = (repo, rel) => (fs.readFileSync(path.join(repo, 'desk', rel), 'utf8').match(/<meta name="robots" content="([^"]+)">/) || [])[1];
  for (const rel of ['index.html', 'markets/index.html', 'intelligence/index.html']) assert.equal(head(path.resolve(path.dirname(new URL(import.meta.url).pathname), '../..'), rel), 'noindex, follow', `committed site: ${rel}`);
  const s = publishedSetup();
  try {
    const slug = fs.readdirSync(path.join(s.repo, 'desk/opportunities')).find(d => d !== 'preview' && d !== 'index.html');
    for (const rel of ['index.html', 'tr/index.html', 'markets/index.html', 'markets/istanbul/index.html', 'intelligence/index.html', 'ar/intelligence/index.html', `opportunities/${slug}/index.html`]) assert.equal(head(s.repo, rel), 'index, follow', rel);
    for (const rel of ['opportunities/preview/index.html', 'compare/index.html', 'consultation/index.html', 'disclosures/index.html', '404.html']) assert.equal(head(s.repo, rel), 'noindex, follow', rel);
  } finally { s.cleanup(); }
});
