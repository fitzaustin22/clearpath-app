// src/lib/blueprintSupportPayload.js
//
// §8 Support Analysis writer payload mapper (V2 Phase 2; the pre-existing M5
// defect M5-Support-Analysis-Blueprint-Writer-Missing pulled into V2 scope).
// Pure: maps a calculateSupport() result + its inputs into the blueprint §8
// contract the consumer S8SupportAnalysis renderer already expects, and carries
// the V2 attorney-doc lineage metadata (D-V2-7 / CLAUDE.md forward-compat:
// statute citations, formula id, jurisdiction, schedule as-of date, imputation
// rules persisted alongside the values — not just the numbers).
import { aamlDurationGuidance } from '@/src/lib/supportGuidelines/aaml-spousal';

const round2 = (n) => Math.round((Number(n) || 0) * 100) / 100;

// Consumer-surface methodology labels (factual benchmark names; the statute
// pin-cites themselves live in metadata.citations for the attorney document).
const STATE_CHILD_GUIDELINE = Object.freeze({
  MD: 'Maryland child-support guidelines',
  DC: 'D.C. child-support guidelines',
  VA: 'Virginia child-support guidelines',
});
const SPOUSAL_BASIS = Object.freeze({
  aaml_30_20_with_40pct_cap: 'AAML benchmark (30% payor − 20% payee, 40% combined-income cap)',
});

/**
 * @param {object|null} results  calculateSupport() output (m5Store.supportEstimator.results)
 * @param {object}      inputs   m5Store.supportEstimator.inputs
 * @returns {object|null} blueprint §8 data payload, or null when no result
 */
export function buildSupportAnalysisPayload(results, inputs) {
  if (!results) return null;

  const spousalMonthly = round2(results.spousalMonthly);
  const childMonthly = round2(results.childMonthly);
  const formulaId = results.metadata?.formulaId ?? null;
  const state = inputs?.state ?? results.metadata?.state ?? null;
  const temporal = inputs?.temporal ?? results.metadata?.temporal ?? null;

  // Effective gross for each party (imputed capacity overrides actual gross when
  // imputeIncome is set) → payor/payee. Disclosed so the AAML/guideline figures
  // are reproducible from the document alone (D-V2-7 / A5-M Cat 3).
  const effGross = (p) =>
    p?.imputeIncome ? round2(p?.imputedEarningCapacity) : round2(p?.grossMonthly);
  const a = effGross(inputs?.partyA);
  const b = effGross(inputs?.partyB);
  const payorMonthly = Math.max(a, b);
  const payeeMonthly = Math.min(a, b);

  // The AAML duration multiplier band is a POST-DIVORCE alimony-duration
  // benchmark; a pendente lite order is temporary (runs to the decree), so it
  // carries no duration band — omit rather than mislabel.
  let duration = null;
  if (temporal === 'post_divorce' && Number.isFinite(inputs?.marriageLengthYears)) {
    duration = aamlDurationGuidance(inputs.marriageLengthYears).label;
  }

  return {
    totalMonthlySupport: round2(results.combinedMonthly),
    spousalSupport:
      spousalMonthly > 0
        ? { monthly: spousalMonthly, duration, basis: SPOUSAL_BASIS[formulaId] ?? formulaId }
        : null,
    childSupport:
      childMonthly > 0
        ? {
            monthly: childMonthly,
            children: inputs?.numChildren ?? null,
            basis: STATE_CHILD_GUIDELINE[state] ?? null,
          }
        : null,
    metadata: {
      formulaId,
      state,
      temporal,
      payorMonthly,
      payeeMonthly,
      numChildren: inputs?.numChildren ?? null,
      marriageLengthYears: inputs?.marriageLengthYears ?? null,
      citations: Array.isArray(results.metadata?.citations) ? [...results.metadata.citations] : [],
      asOfDateForStatutoryConstants: results.metadata?.asOfDateForStatutoryConstants ?? null,
      imputationApplied: results.metadata?.imputationApplied ?? null,
    },
  };
}
