// Engine 6 — Risk severity (method contract M-RISK-SEVERITY, version RSV-1). Internal only.
// The analyst assigns each documented risk one label with a written rationale; the method fixes what the labels mean,
// refuses a label without a rationale, and adds two mechanical rules so that a missing assessment cannot look benign:
//   1. a risk with no assessment stays NOT_ASSESSED (never defaulted to LOW);
//   2. a risk with no evidence reference cannot be labelled LOW (the absence of evidence is not comfort).
// Labels describe consequence for a buyer if the risk materialises, after the stated mitigation:
export const RSV_VERSION = 'RSV-1';
export const SEVERITY = {
  HIGH: 'Could prevent completion, title transfer or use of the unit, or cause a loss of a large part of the money paid.',
  MEDIUM: 'Could delay delivery or exit, or materially change cost or return, without threatening ownership.',
  LOW: 'Inconvenience or a small change in cost or timing; ownership and use are not affected.'
};

// risks: [{ id, evidence: [...] }]; assessments: { [riskId]: { label, rationale } }
export function assessSeverity(risks, assessments = {}) {
  const errors = []; const out = {};
  for (const id of Object.keys(assessments || {})) if (!risks.some(r => r.id === id)) errors.push(`risk_severity.${id}: no such risk on this opportunity`);
  for (const r of risks) {
    const a = (assessments || {})[r.id];
    if (!a) { out[r.id] = { label: 'NOT_ASSESSED', rationale: null }; continue; }
    if (!SEVERITY[a.label]) { errors.push(`risk_severity.${r.id}.label must be HIGH, MEDIUM or LOW`); continue; }
    if (typeof a.rationale !== 'string' || a.rationale.trim().length < 15) { errors.push(`risk_severity.${r.id}.rationale is required (a sentence explaining the label)`); continue; }
    if (a.label === 'LOW' && !(r.evidence || []).length) { errors.push(`risk_severity.${r.id}: a risk without evidence cannot be LOW`); continue; }
    out[r.id] = { label: a.label, rationale: a.rationale.trim(), meaning: SEVERITY[a.label] };
  }
  return { version: RSV_VERSION, errors, labels: out };
}
