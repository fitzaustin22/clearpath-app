import { computeCovertureFraction, addYears } from './tier3Coverture.js';
import { CITATIONS_BY_PATH } from './citations.js';

/**
 * Per spec §7.4.5 — cash balance pass-through (PV = current account balance,
 * PPA-era safe harbor). Optional coverture extension when all four coverture
 * inputs are populated; reuses the §7.4.3a shared utility per [R5b-13].
 *
 * Sensitivity bracket is degenerate at v1: pv.low = pv.high = pv.best
 * (balance is fixed at the statement date; no actuarial sensitivity).
 *
 * Engine-level callouts: only coverture_zero_fraction (surfaced inside the
 * shared utility when the optional coverture extension yields fraction = 0).
 * cash_balance_passthrough_explanation is router-surfaced via STEP CP.4.
 *
 * @param {object} inputs — §7.3.6 input shape
 * @param {(type: string, runtimeData?: object) => void} surfaceCallout
 */
export function calculateCashBalance(inputs, surfaceCallout) {
  const asOfDate = inputs.caseEffectiveDate ?? new Date().toISOString().slice(0, 10);
  const pvBase = inputs.currentAccountBalance;

  const hasCovertureInputs =
    inputs.dateOfHire != null &&
    inputs.dateOfMarriage != null &&
    inputs.maritalCutoffDate != null &&
    inputs.expectedRetirementAge != null;

  const metadata = {
    formulaId: 'pva_cashbalance_passthrough_v1',
    path: 'cash_balance',
    mortalityTable: inputs.mortalityTable,
    discountRateBps: inputs.discountRateBps,
    cola: inputs.cola,
    formOfBenefitOnStatement: null,
    formOfBenefitInPay: null,
    vestingStatus: null,
    benefitSource: null,
    planAdministratorOfferedLumpSum: inputs.planAdministratorOfferedLumpSum ?? null,
    citations: CITATIONS_BY_PATH.cash_balance,
    calculationTimestamp: new Date().toISOString(),
    asOfDateForStatutoryConstants: asOfDate,
  };

  if (!hasCovertureInputs) {
    return {
      path: 'cash_balance',
      formulaId: 'pva_cashbalance_passthrough_v1',
      pv: { best: pvBase, low: pvBase, high: pvBase },
      maritalPortion: null,
      coverture: null,
      metadata,
    };
  }

  // STEP CB.2 — optional coverture extension
  const retirement = addYears(inputs.participantDOB, inputs.expectedRetirementAge);
  const coverture = computeCovertureFraction(
    {
      hire: inputs.dateOfHire,
      marriage: inputs.dateOfMarriage,
      cutoff: inputs.maritalCutoffDate,
      retirement,
    },
    surfaceCallout
  );
  const pvMarital = pvBase * coverture.fraction;

  return {
    path: 'cash_balance',
    formulaId: 'pva_cashbalance_passthrough_v1',
    pv: {
      total: { best: pvBase, low: pvBase, high: pvBase },
      marital: { best: pvMarital, low: pvMarital, high: pvMarital },
    },
    coverture,
    metadata,
  };
}
