/**
 * Virginia Pendente Lite Spousal Support — Va. Code §16.1-278.17:1 / §20-103
 *
 * Statutory formula:
 *   With minor children:    26% × payor gross − 58% × payee gross
 *   Without minor children: 27% × payor gross − 50% × payee gross
 *
 * Statutory presumption applies only when combined annual gross ≤ $120,000.
 * Above the threshold, the calculation is committed to judicial discretion;
 * the §6.6.2 `statutory_above_cap_callout` (scenario: `va_pl_spousal_above_120k`)
 * surfaces this as a planning-grade reference.
 *
 * Returns §6.5.4 spousal shape. `duration: null` per spec (all PL).
 */

const COEFS_WITH_KIDS = { payorCoef: 0.26, payeeCoef: 0.58 };
const COEFS_NO_KIDS = { payorCoef: 0.27, payeeCoef: 0.50 };
const VA_PL_PRESUMPTION_CAP_ANNUAL = 120000;

/**
 * @param {object} params
 * @param {number} params.payorGrossMonthly
 * @param {number} params.payeeGrossMonthly
 * @param {number} [params.numChildren=0]
 * @returns {object} §6.5.4 shape
 */
export function lookupSpousal({
  payorGrossMonthly,
  payeeGrossMonthly,
  numChildren = 0,
}) {
  const coefs = numChildren > 0 ? COEFS_WITH_KIDS : COEFS_NO_KIDS;
  const monthlyAmount = Math.max(
    0,
    coefs.payorCoef * payorGrossMonthly - coefs.payeeCoef * payeeGrossMonthly,
  );

  const combinedAnnual = (payorGrossMonthly + payeeGrossMonthly) * 12;
  const aboveCap = combinedAnnual > VA_PL_PRESUMPTION_CAP_ANNUAL;

  return {
    monthlyAmount,
    formulaUsed: 'va_pendente_lite_278_17_1',
    duration: null,
    cap: {
      hit: aboveCap,
      capValue: aboveCap ? VA_PL_PRESUMPTION_CAP_ANNUAL : null,
      aboveTreatment: aboveCap ? 'discretionary' : null,
    },
    capBinds: false,
    ssr: null,
    factorTestApplies: false,
    notes: [],
  };
}

export default lookupSpousal;
