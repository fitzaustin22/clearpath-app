/**
 * D.C. spousal support — delegates to the AAML 30/20 + 40%-cap formula.
 *
 * DC has no statutory formula; D.C. Code §16-913(d) governs post-divorce
 * spousal support via factor analysis, and §16-911(a)(1) imports that
 * analysis at the pendente lite stage. AAML is the de facto practitioner
 * benchmark; no DC Court of Appeals decision has expressly endorsed or
 * rejected it.
 *
 * Returns §6.5.4 spousal shape.
 */

import { calculateAAMLSpousal, aamlDurationGuidance } from './aaml-spousal.js';

function buildAamlDuration(marriageLengthYears) {
  if (typeof marriageLengthYears !== 'number' || marriageLengthYears < 0) return null;
  const guidance = aamlDurationGuidance(marriageLengthYears);
  if (guidance.multiplier === null) {
    return {
      type: 'aaml_advisory_multiplier',
      minMonths: Math.round(marriageLengthYears * 12),
      maxMonths: Infinity,
      statutorySource: 'AAML duration multiplier (advisory)',
    };
  }
  const months = Math.round(marriageLengthYears * 12 * guidance.multiplier);
  return {
    type: 'aaml_advisory_multiplier',
    minMonths: months,
    maxMonths: months,
    statutorySource: 'AAML duration multiplier (advisory)',
  };
}

/**
 * @param {object} params
 * @param {number} params.payorGrossMonthly
 * @param {number} params.payeeGrossMonthly
 * @param {number|null} [params.marriageLengthYears=null]
 * @param {('pendente_lite'|'post_divorce')} [params.temporal='post_divorce']
 * @returns {object} §6.5.4 shape
 */
export function lookupSpousal({
  payorGrossMonthly,
  payeeGrossMonthly,
  marriageLengthYears = null,
  temporal = 'post_divorce',
}) {
  const aaml = calculateAAMLSpousal({ payorGrossMonthly, payeeGrossMonthly });
  return {
    monthlyAmount: aaml.monthlyAmount,
    formulaUsed: 'aaml_30_20_with_40pct_cap',
    duration: temporal === 'post_divorce' ? buildAamlDuration(marriageLengthYears) : null,
    cap: { hit: false, capValue: null, aboveTreatment: null },
    capBinds: aaml.capBinds,
    ssr: null,
    factorTestApplies: false,
    notes: [],
  };
}

export default lookupSpousal;
