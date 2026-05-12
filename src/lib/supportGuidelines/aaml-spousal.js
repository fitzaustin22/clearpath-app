/**
 * AAML (American Academy of Matrimonial Lawyers) proposed spousal-support formula:
 *
 *   30% × payor gross − 20% × payee gross,
 *   capped so the result does not exceed (40% × combined gross) − payee gross.
 *
 * Used as the calculation backend for MD and DC spousal under their respective
 * citation chains (md-spousal.js / dc-spousal.js). NOT a statute in either
 * jurisdiction — see §6.6.2 / §6.6.3 callouts for the disclosure copy.
 *
 * AAML duration multiplier (advisory) per §6.5.8: post-divorce only.
 */

export const AAML_COEFFICIENTS = {
  v1_canonical: { payorCoef: 0.30, payeeCoef: 0.20, capRatio: 0.40 },
  // v1_1_post_tcja: { payorCoef: 0.24, payeeCoef: 0.20, capRatio: 0.40 } // deferred per memory #21
};

/**
 * @param {object} params
 * @param {number} params.payorGrossMonthly
 * @param {number} params.payeeGrossMonthly
 * @returns {{monthlyAmount: number, formulaUsed: string, capBinds: boolean, intermediateValues: {calcA: number, capValue: number}}}
 */
export function calculateAAMLSpousal({ payorGrossMonthly, payeeGrossMonthly }) {
  const coefs = AAML_COEFFICIENTS.v1_canonical;
  const calcA = (coefs.payorCoef * payorGrossMonthly) - (coefs.payeeCoef * payeeGrossMonthly);
  const calcB_cap = (coefs.capRatio * (payorGrossMonthly + payeeGrossMonthly)) - payeeGrossMonthly;
  const monthlyAmount = Math.max(0, Math.min(calcA, calcB_cap));
  const capBinds = (calcA > calcB_cap) && (monthlyAmount > 0);
  return {
    monthlyAmount,
    formulaUsed: 'aaml_30_20_with_40pct_cap',
    capBinds,
    intermediateValues: { calcA, capValue: calcB_cap },
  };
}

/**
 * AAML duration multiplier (advisory only, post-divorce mode).
 * @param {number} marriageLengthYears
 * @returns {{multiplier: number|null, label: string}}
 */
export function aamlDurationGuidance(marriageLengthYears) {
  if (marriageLengthYears < 3) return { multiplier: 0.30, label: '0-3 years' };
  if (marriageLengthYears < 10) return { multiplier: 0.50, label: '3-10 years' };
  if (marriageLengthYears < 20) return { multiplier: 0.75, label: '10-20 years' };
  return { multiplier: null, label: '20+ years (permanent)' };
}
