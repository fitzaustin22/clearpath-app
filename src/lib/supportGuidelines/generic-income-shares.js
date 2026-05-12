/**
 * Generic (non-launch state) child + spousal fallback per F-5 / B5b-1.
 *
 * Child portion: Federal HHS/OCSE income-shares national approximation.
 *   Uses the same percentage tiers as NY CSSA (a reasonable national proxy);
 *   the spec §6.6.2 `generic_fallback_disclaimer` callout makes clear this is
 *   ballpark planning only and not a stand-in for the consumer's state law.
 *
 * Spousal portion: returns 0 with `factorTestApplies: true` — there is no
 *   national spousal formula; spousal support is per-state factor analysis.
 *
 * Wraps both portions per the §6.5.5 generic-fallback description.
 *
 * Returns: { child: <§6.5.3 shape>, spousal: <§6.5.4 shape> }.
 */

const NATIONAL_PERCENTAGES = { 1: 0.17, 2: 0.25, 3: 0.29, 4: 0.31 };

function nationalPercentage(numChildren) {
  if (numChildren >= 5) return 0.35;
  return NATIONAL_PERCENTAGES[numChildren] ?? 0;
}

/**
 * @param {object} params
 * @param {number} params.payorGrossMonthly
 * @param {number} params.payeeGrossMonthly
 * @param {number} [params.numChildren=0]
 * @returns {{child: object, spousal: object}}
 */
export function lookupSupportGeneric({
  payorGrossMonthly,
  payeeGrossMonthly,
  numChildren = 0,
}) {
  const combinedMonthlyIncome = payorGrossMonthly + payeeGrossMonthly;
  const pct = nationalPercentage(numChildren);
  const basicSupport = combinedMonthlyIncome * pct;

  const child = {
    basicSupport,
    source: 'generic',
    scheduleStatus: 'within',
    scheduleMax: basicSupport,
    aboveScheduleMethod: null,
    hollandExtrapolation: null,
    capValue: null,
    notes: [],
  };

  const spousal = {
    monthlyAmount: 0,
    formulaUsed: 'factor_test_approximation',
    duration: null,
    cap: { hit: false, capValue: null, aboveTreatment: null },
    capBinds: false,
    ssr: null,
    factorTestApplies: true,
    notes: [],
  };

  return { child, spousal };
}

export default lookupSupportGeneric;
