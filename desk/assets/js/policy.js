// Nexus Desk publication policy — shared by the validator/ingestion tools (Node) and the Desk pages (browser), so the
// gate and the rendering apply exactly the same rules. Pure functions only: no I/O, no clock. Every function that
// depends on time takes "today" (YYYY-MM-DD, UTC calendar date) as an argument, so results are deterministic and
// tests use a fixed date.
//
// 1. Evidence freshness (review policy RP-1)
//    The basis date is evidence.last_verified when present (actual verification metadata), otherwise retrieved_at
//    (when the source was last consulted). Expiry means "re-review required"; it does not mean the claim is false.
//      CURRENT     — within the review interval
//      REVIEW_DUE  — older than review_after_days, or its next_review_trigger date has passed
//      EXPIRED     — older than expire_after_days
//      INVALID     — no basis date, an impossible date, or a date in the future
//    Effect: for a MATERIAL field (see MATERIAL_FIELDS) EXPIRED/INVALID blocks new publication; REVIEW_DUE is shown
//    with a "review due" qualification. Non-material evidence is never blocked by age; it is shown with its state.
//    Already-published opportunities are not withdrawn automatically when evidence ages (owner decision D4, open):
//    the validator reports a warning instead.
//
// 2. Claim publication (claim policy CP-1) — what may be rendered publicly, and how
//      ESTABLISHED — VERIFIED or CORROBORATED, class FACT or LEGAL FACT, source Tier 1–3: shown as a fact
//      QUALIFIED   — DEVELOPER-CLAIM / SOURCE-REPORTED, or classes ESTIMATE, PROJECTION, INTERPRETATION, OPINION,
//                    DATA NOT AVAILABLE, from Tier 1–3: shown only with its verification label, class and source
//      NOT_PUBLIC  — UNVERIFIED, HYPOTHESIS, or any Tier 4 source: never exported or rendered; kept in the private
//                    store and listed in the export report (not silently discarded, never reclassified)
//    Identity fields (project name, developer legal entity) must be ESTABLISHED. Other material fields that carry a
//    value need at least one QUALIFIED-or-better evidence record.

export const REVIEW_POLICY = {
  version: 'RP-1',
  default: { review_after_days: 180, expire_after_days: 365 },
  // most specific rule wins: field, then source type, then evidence class, then default
  by_field: {
    'project.delivery_status': { review_after_days: 90, expire_after_days: 180 },
    'asset.delivery_status': { review_after_days: 90, expire_after_days: 180 },
    'project.expected_delivery': { review_after_days: 90, expire_after_days: 180 },
    'project.name': { review_after_days: 365, expire_after_days: 730 },
    'developer.legal_entity_name': { review_after_days: 365, expire_after_days: 730 }
  },
  by_source_type: {
    OFFICIAL_STATISTICS: { review_after_days: 45, expire_after_days: 120 }, // monthly/quarterly series
    BROKER_LISTING: { review_after_days: 30, expire_after_days: 90 }
  },
  by_class: {
    'LEGAL FACT': { review_after_days: 365, expire_after_days: 730 },
    PROJECTION: { review_after_days: 90, expire_after_days: 180 }
  }
};

// Every field rendered as a fact on an opportunity page, a card or Compare is material: its evidence decides
// publication (Spec v1 §8 project gate: identity, location, developer, status, supported characteristics; developer
// gate: legal identity and project relationship verified, marketing claims labelled). desk/_tests/closure.test.mjs
// fails if a page renders a record field that is not listed here.
//   - a material field WITH a value needs publishable evidence (QUALIFIED or better; identity fields: ESTABLISHED)
//   - a material field WITHOUT a value needs an explicit missing-data state (field_states)
export const MATERIAL_FIELDS = {
  project: ['name', 'developer_id', 'district_id', 'delivery_status', 'expected_delivery', 'asset_types'],
  developer: ['name', 'legal_entity_name'],
  asset: ['unit_type', 'gross_area_m2', 'net_area_m2', 'delivery_status']
};
// Identity fields must rest on ESTABLISHED evidence (verified/corroborated fact from a Tier 1–3 source).
export const IDENTITY_FIELDS = { project: ['name', 'developer_id'], developer: ['legal_entity_name'] };

const DAY = 86400000;
export function isIsoDate(v) {
  if (typeof v !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(v)) return false;
  const t = Date.parse(v + 'T00:00:00Z');
  return !Number.isNaN(t) && new Date(t).toISOString().slice(0, 10) === v;
}
const days = (from, to) => Math.round((Date.parse(to + 'T00:00:00Z') - Date.parse(from + 'T00:00:00Z')) / DAY);

export function reviewRule(e, sourceType) {
  const k = e && e.subject && e.field ? `${e.subject.type}.${e.field}` : null;
  return (k && REVIEW_POLICY.by_field[k]) || (sourceType && REVIEW_POLICY.by_source_type[sourceType]) || REVIEW_POLICY.by_class[e && e.evidence_class] || REVIEW_POLICY.default;
}

// -> { state, basis, basis_kind: 'verified'|'retrieved'|null, age_days, review_due_on, expires_on }
export function evidenceFreshness(e, today, sourceType = null) {
  if (!isIsoDate(today)) throw new Error(`evidenceFreshness: invalid "today" ${today}`);
  const rule = reviewRule(e, sourceType);
  const basisKind = e && e.last_verified ? 'verified' : e && e.retrieved_at ? 'retrieved' : null;
  const basis = basisKind === 'verified' ? e.last_verified : basisKind === 'retrieved' ? e.retrieved_at : null;
  if (!basis || !isIsoDate(basis)) return { state: 'INVALID', reason: basis ? `invalid date ${basis}` : 'no verification or retrieval date', basis: null, basis_kind: basisKind };
  if (basis > today) return { state: 'INVALID', reason: `date ${basis} is in the future`, basis, basis_kind: basisKind };
  const age = days(basis, today);
  const add = (n) => new Date(Date.parse(basis + 'T00:00:00Z') + n * DAY).toISOString().slice(0, 10);
  const out = { basis, basis_kind: basisKind, age_days: age, review_due_on: add(rule.review_after_days), expires_on: add(rule.expire_after_days) };
  if (age > rule.expire_after_days) return { ...out, state: 'EXPIRED' };
  const trig = e.next_review_trigger;
  if (age > rule.review_after_days || (isIsoDate(trig) && trig <= today)) return { ...out, state: 'REVIEW_DUE' };
  return { ...out, state: 'CURRENT' };
}

const STRONG = new Set(['VERIFIED', 'CORROBORATED']);
// -> { status: 'ESTABLISHED'|'QUALIFIED'|'NOT_PUBLIC', reason }
export function claimPublication(e) {
  if (!e) return { status: 'NOT_PUBLIC', reason: 'missing evidence' };
  if (e.verification_status === 'UNVERIFIED') return { status: 'NOT_PUBLIC', reason: 'unverified' };
  if (e.evidence_class === 'HYPOTHESIS') return { status: 'NOT_PUBLIC', reason: 'hypothesis' };
  if (e.source_tier === 4) return { status: 'NOT_PUBLIC', reason: 'Tier 4 source' };
  if (STRONG.has(e.verification_status) && (e.evidence_class === 'FACT' || e.evidence_class === 'LEGAL FACT')) return { status: 'ESTABLISHED', reason: null };
  return { status: 'QUALIFIED', reason: `${e.verification_status} · ${e.evidence_class}` };
}
export const isPublicClaim = (e) => claimPublication(e).status !== 'NOT_PUBLIC';

// Last verified for an opportunity: the OLDEST verification date across the evidence of its material fields that
// have a value. Null when any such field has no evidence with an actual verification date. Never the approval date.
export function deriveLastVerified(subjects, evidence) {
  let oldest = null;
  for (const { type, rec } of subjects) {
    if (!rec) continue;
    for (const f of MATERIAL_FIELDS[type] || []) {
      const v = rec[f];
      if (v === null || v === undefined || v === '' || (Array.isArray(v) && !v.length)) continue;
      const dates = evidence.filter(e => e.subject && e.subject.type === type && e.subject.id === rec.id && e.field === f && isPublicClaim(e) && isIsoDate(e.last_verified)).map(e => e.last_verified);
      if (!dates.length) return null;
      const newest = dates.sort().pop(); // the field's most recent verification
      if (!oldest || newest < oldest) oldest = newest;
    }
  }
  return oldest;
}
