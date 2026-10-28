// Engine 7 (comparison part) — Opportunity comparison and research queue (method contract M-OPPORTUNITY-COMPARISON,
// version OPC-2). Internal only. Puts decision reports (RPT-1) side by side and classifies each opportunity by explicit
// rules. It is NOT an investment ranking: the queue order is "fewest open blocking items first", a work-planning order
// for research, and every class names the facts it rests on.
export const OPC_VERSION = 'OPC-2';
// OPC-2 (28 Oct 2026): classification reads the structured reason codes written by the publication gate (validate.mjs,
// eligibility.reasons) instead of matching reason text. OWNER = needs an owner decision, approval, permission or command
// (or an external party acting on it); RESEARCH = research work that Claude can do. Every code the gate can emit is
// listed here (test: "every gate reason code is classified"); an unknown code is treated as RESEARCH and reported.
export const REASON_KIND = {
  RECORD_STATUS: 'OWNER', NO_OWNER_REVIEW: 'OWNER', SUBJECT_NOT_REVIEWED: 'OWNER', PROJECT_PERMISSION: 'OWNER',
  DISCLOSURE_PENDING: 'OWNER', DISCLOSURE_UNDATED: 'OWNER', MARKET_INACTIVE: 'OWNER', MARKET_NOT_ACTIVATED: 'OWNER',
  MARKET_GATE_NOT_APPROVED: 'OWNER', MARKET_GATE_FAILS: 'OWNER', CATEGORY_INACTIVE: 'OWNER',
  ILLUSTRATIVE: 'RESEARCH', MARKET_GATE_CONFIG: 'RESEARCH', SUBJECT_MISSING: 'RESEARCH', IDENTITY_UNVERIFIED: 'RESEARCH',
  DEVELOPER_UNVERIFIED: 'RESEARCH', RELATIONSHIP_UNVERIFIED: 'RESEARCH', OPEN_CONFLICT: 'RESEARCH', RESEARCH_BLOCK_MISSING: 'RESEARCH',
  NO_RISK: 'RESEARCH', FIELD_STATE_MISSING: 'RESEARCH', EVIDENCE_NOT_PUBLISHABLE: 'RESEARCH', EVIDENCE_EXPIRED: 'RESEARCH',
  MEDIA_COVER: 'RESEARCH', MEDIA_GALLERY: 'RESEARCH', VALIDATION_ERRORS: 'RESEARCH', COMMERCIAL_TERM: 'RESEARCH',
  MARKET_REQUIREMENT: 'RESEARCH', DISCLOSURE_UNLINKED: 'RESEARCH', DISCLOSURE_MISSING: 'RESEARCH', NO_DISCLOSURE: 'RESEARCH'
};
export const reasonKind = (code) => REASON_KIND[code] || 'RESEARCH';

// r.gate_codes: [{ code, msg }] from the gate (structured); a report that is publishable has none.
export function classify(r) {
  const codes = r.overview.publishable ? [] : (r.gate_codes || []);
  if (r.fit && r.fit.status === 'OK' && r.fit.outcome === 'NOT_SUITABLE') return { class: 'NOT_SUITABLE_FOR_PROFILE', basis: r.fit.criteria.filter(c => c.result === 'NO_MATCH').map(c => `${c.criterion}: ${c.reason}`) };
  if (!codes.length && !r.gaps.length && !r.conflicts.some(c => c.status === 'OPEN')) return { class: 'READY_FOR_PUBLICATION_REVIEW', basis: ['no gate reason, no material gap, no open conflict'] };
  const research = codes.filter(c => reasonKind(c.code) === 'RESEARCH');
  const owner = codes.filter(c => reasonKind(c.code) === 'OWNER');
  const unknown = codes.filter(c => !(c.code in REASON_KIND)).map(c => `unclassified reason code ${c.code}`);
  if (!research.length && !r.gaps.length && owner.length) return { class: 'AWAITING_OWNER_OR_EXTERNAL_INPUT', basis: owner.map(c => c.msg), codes: owner.map(c => c.code) };
  return { class: 'RESEARCH_NEXT', basis: [...unknown, ...research.map(c => c.msg), ...r.gaps.map(g => `gap: ${g}`)].slice(0, 12), codes: research.map(c => c.code) };
}

// reports: [{ id, report (RPT-1 object), gate_codes: [{ code, msg }] }]
export function compareOpportunities(reports) {
  if (!Array.isArray(reports) || reports.length < 2) return { status: 'UNAVAILABLE', version: OPC_VERSION, reason: 'at least two opportunities are needed' };
  const rows = reports.map(({ id, report: r, gate_codes = [] }) => {
    r = { ...r, gate_codes };
    const est = r.facts.filter(f => f.evidence.some(e => e.label === 'FACT (verified)')).length;
    const qual = r.facts.filter(f => f.value !== null && !f.evidence.some(e => e.label === 'FACT (verified)')).length;
    const c = classify(r);
    return {
      id, title: r.overview.title, market: r.overview.market, district: r.overview.district, developer: r.overview.developer,
      material_fields: r.facts.length, verified_facts: est, qualified_or_unevidenced: qual, gaps: r.gaps.length,
      open_conflicts: r.conflicts.filter(x => x.status === 'OPEN').length,
      risks_by_type: r.risks.reduce((a, k) => ({ ...a, [k.type]: (a[k.type] || 0) + 1 }), {}),
      gate_blocking: gate_codes.length,
      finance: r.finance.scenarios ? (r.finance.scenarios.base.roi.status === 'OK' ? 'scenarios available (private)' : 'inputs incomplete') : 'no inputs',
      comparables: r.comparables.status, fit: r.fit.status === 'OK' ? r.fit.outcome : 'not run',
      exit_inputs_missing: r.exit ? r.exit.not_available.length : null,
      class: c.class, basis: c.basis, next: r.next_steps.slice(0, 5)
    };
  });
  const queue = rows.filter(x => x.class !== 'NOT_SUITABLE_FOR_PROFILE')
    .sort((a, b) => (a.gate_blocking + a.gaps + a.open_conflicts) - (b.gate_blocking + b.gaps + b.open_conflicts) || a.id.localeCompare(b.id))
    .map(x => ({ id: x.id, class: x.class, open_items: x.gate_blocking + x.gaps + x.open_conflicts }));
  return { status: 'OK', version: OPC_VERSION, rows, research_queue: queue,
    note: 'Research-queue order = fewest open blocking items first (gate reasons + material gaps + open conflicts). It is a work-planning order, not an investment ranking; no score or weight is applied.' };
}

export function compareMarkdown(c, today) {
  if (c.status !== 'OK') return `# Opportunity comparison\n\nUnavailable: ${c.reason}\n`;
  const L = [`# Opportunity comparison (OPC-2) · ${today}`, '', '**INTERNAL — not for publication.**', ''];
  const cols = ['id', 'market', 'district', 'verified_facts', 'qualified_or_unevidenced', 'gaps', 'open_conflicts', 'gate_blocking', 'finance', 'comparables', 'fit', 'exit_inputs_missing', 'class'];
  L.push(`| ${cols.join(' | ')} |`, `|${cols.map(() => '---').join('|')}|`, ...c.rows.map(r => `| ${cols.map(k => r[k] ?? '—').join(' | ')} |`), '');
  L.push('## Research queue', '', c.note, '', ...c.research_queue.map((q, i) => `${i + 1}. ${q.id} — ${q.class} (${q.open_items} open items)`), '');
  for (const r of c.rows) { L.push(`## ${r.id} — ${r.class}`, '', ...r.basis.map(b => `- ${b}`), '', 'Next:', ...r.next.map(n => `- ${n}`), ''); }
  return L.join('\n') + '\n';
}
