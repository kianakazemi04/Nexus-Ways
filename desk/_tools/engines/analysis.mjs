// Analysis inputs (research handoff, part 2) — validation and unwrapping. Version ANL-1.
// The analysis file is PRIVATE: <store>/private/analysis/<OPP-id>.json. It carries the inputs of the internal engines
// (finance, comparables, fit) and the analyst's findings. Every number must say where it comes from:
//   { "value": 1200000, "ref": "EVD-…" }                                  an evidence record in the store
//   { "value": 1200000, "ref": "PRIVATE:<package_id>/<fact key>" }        a private fact (price list, rent quote …)
//   { "value": 0.05,    "ref": "ASSUMPTION", "note": "why this value" }   an explicit, written assumption
// A bare number (other than the period index `t`) is refused. Findings (strengths, weaknesses) need at least one
// evidence reference; a finding with none is refused. Nothing here is ever exported to public data.

export const ANL_VERSION = 'ANL-2';
const isWrapped = (v) => v && typeof v === 'object' && !Array.isArray(v) && 'value' in v && 'ref' in v;

// resolveRef(ref) -> { kind: 'evidence'|'private'|'assumption', id, publicClaim?: bool } | null
export function makeResolver(store) {
  const ev = new Map((store.collections.evidence || []).map(e => [e.id, e]));
  const pf = new Map((store.private.private_facts || []).map(f => [`${f.package_id}/${f.key}`, f]));
  return (ref) => {
    if (ref === 'ASSUMPTION') return { kind: 'assumption', id: 'ASSUMPTION' };
    if (typeof ref !== 'string') return null;
    if (ref.startsWith('PRIVATE:')) return pf.has(ref.slice(8)) ? { kind: 'private', id: ref, value: pf.get(ref.slice(8)).value } : null;
    return ev.has(ref) ? { kind: 'evidence', id: ref, evidence: ev.get(ref), value: ev.get(ref).value } : null;
  };
}

// Walks a value; returns { value (unwrapped), provenance: [{path, value, ref, note}], errors }
export function unwrap(node, resolve, path = '$') {
  const provenance = []; const errors = [];
  const walk = (v, p) => {
    if (isWrapped(v)) {
      const r = resolve(v.ref);
      if (!r) errors.push(`${p}: reference ${JSON.stringify(v.ref)} not found in the store`);
      if (v.ref === 'ASSUMPTION' && !(typeof v.note === 'string' && v.note.trim().length >= 10)) errors.push(`${p}: an ASSUMPTION needs a written note (at least a sentence)`);
      if (typeof v.value !== 'number' && typeof v.value !== 'string') errors.push(`${p}: value must be a number or text`);
      // a value taken from a record must equal it, unless a note explains the derivation (conversion, share, sum …)
      if (r && r.kind !== 'assumption' && typeof r.value === 'number' && r.value !== v.value && !(typeof v.note === 'string' && v.note.trim().length >= 10)) errors.push(`${p}: value ${v.value} differs from ${v.ref} (${r.value}); add a note explaining the derivation`);
      provenance.push({ path: p, value: v.value, ref: v.ref, kind: r ? r.kind : 'unresolved', note: v.note ?? null });
      return v.value;
    }
    if (Array.isArray(v)) return v.map((x, i) => walk(x, `${p}[${i}]`));
    if (v && typeof v === 'object') return Object.fromEntries(Object.entries(v).map(([k, x]) => [k, walk(x, `${p}.${k}`)]));
    if (typeof v === 'number' && !/\.t$/.test(p)) errors.push(`${p}: bare number ${v} — wrap it as {value, ref} (evidence, PRIVATE:… or ASSUMPTION with a note)`);
    return v;
  };
  const value = walk(node, path);
  return { value, provenance, errors };
}

// Validates a whole analysis document against the store. -> { ok, errors, analysis (unwrapped), provenance }
export function checkAnalysis(doc, store, oppId) {
  const errors = [];
  if (!doc || typeof doc !== 'object') return { ok: false, errors: ['analysis is not an object'] };
  if (doc.opportunity_id !== oppId) errors.push(`opportunity_id ${doc.opportunity_id} ≠ ${oppId}`);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(doc.as_of || '')) errors.push('as_of (YYYY-MM-DD) required');
  const resolve = makeResolver(store);
  const out = { opportunity_id: doc.opportunity_id, as_of: doc.as_of, fx: [], finance: null, scenarios: {}, comparables: null, price_evidence: null, investor_profile: null, findings: [] };
  const provenance = [];
  // FX has one source of truth (audit C-05): every rate in the analysis must reference the evidence or private fact it
  // comes from (e.g. the market's CBRT / CBUAE rate evidence); the rate and date must match that record.
  for (const [i, r] of (doc.fx || []).entries()) {
    if (!r || !r.base || !r.quote || typeof r.rate !== 'number' || !r.date || !r.source) { errors.push(`fx[${i}]: base, quote, rate, date and source required`); continue; }
    if (!r.ref || r.ref === 'ASSUMPTION') { errors.push(`fx[${i}]: ref required — the evidence ID or PRIVATE:… fact the rate comes from (an assumed rate is not an FX table entry)`); continue; }
    const res = resolve(r.ref);
    if (!res) { errors.push(`fx[${i}]: reference ${r.ref} not found in the store`); continue; }
    if (typeof res.value === 'number' && Math.abs(res.value - r.rate) > 1e-9 && Math.abs(1 / res.value - r.rate) > 1e-9) errors.push(`fx[${i}]: rate ${r.rate} differs from ${r.ref} (${res.value})`);
    if (res.kind === 'evidence' && /^\d{4}-\d{2}-\d{2}$/.test(res.evidence.period || '') && res.evidence.period !== r.date) errors.push(`fx[${i}]: date ${r.date} differs from the observation date of ${r.ref} (${res.evidence.period})`);
    out.fx.push(r); provenance.push({ path: `$.fx[${i}].rate`, value: r.rate, ref: r.ref, kind: res.kind, note: null });
  }
  const take = (key, node) => { if (node === undefined || node === null) return null; const u = unwrap(node, resolve, `$.${key}`); errors.push(...u.errors); provenance.push(...u.provenance); return u.value; };
  out.finance = take('finance', doc.finance);
  for (const [name, over] of Object.entries(doc.scenarios || {})) {
    if (name === 'base') { errors.push('scenarios.base is the finance block itself; name overrides e.g. favourable, adverse'); continue; }
    out.scenarios[name] = take(`scenarios.${name}`, over);
  }
  if (doc.comparables) {
    const c = doc.comparables;
    out.comparables = { subject: c.subject || null, rules: c.rules || null, candidates: [] };
    for (const [i, x] of (c.candidates || []).entries()) {
      const u = unwrap(x, resolve, `$.comparables.candidates[${i}]`); errors.push(...u.errors); provenance.push(...u.provenance);
      const cand = u.value;
      if (!cand.evidence_id || !resolve(cand.evidence_id) || cand.evidence_id === 'ASSUMPTION') errors.push(`$.comparables.candidates[${i}]: evidence_id must reference evidence or PRIVATE:… (an assumption is not a comparable)`);
      out.comparables.candidates.push(cand);
    }
  }
  if (doc.price_evidence) out.price_evidence = take('price_evidence', doc.price_evidence);
  // the investor profile is a client preference, not market data: taken as given (it stays private)
  if (doc.investor_profile) out.investor_profile = doc.investor_profile;
  for (const [i, f] of (doc.findings || []).entries()) {
    const p = `$.findings[${i}]`;
    if (!f || !['STRENGTH', 'WEAKNESS', 'LIMITATION'].includes(f.type)) { errors.push(`${p}: type STRENGTH, WEAKNESS or LIMITATION`); continue; }
    if (!(typeof f.text === 'string' && f.text.trim())) errors.push(`${p}: text required`);
    if (!['FACT', 'INTERPRETATION', 'ESTIMATE', 'OPINION'].includes(f.class)) errors.push(`${p}: class FACT, INTERPRETATION, ESTIMATE or OPINION`);
    const refs = (f.refs || []).filter(r => r !== 'ASSUMPTION');
    if (!refs.length) errors.push(`${p}: at least one evidence reference required — a finding without evidence is not reported`);
    for (const r of refs) if (!resolve(r)) errors.push(`${p}: reference ${r} not found`);
    out.findings.push({ type: f.type, text: f.text, class: f.class, refs });
  }
  return { ok: errors.length === 0, errors, analysis: out, provenance };
}
