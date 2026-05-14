import { computeAnnuityFactor } from './annuityFactor.js';
import { CITATIONS_BY_PATH } from './citations.js';

function yearsBetween(d1, d2) {
  const [y1, m1, day1] = d1.split('-').map(Number);
  const [y2, m2, day2] = d2.split('-').map(Number);
  return (y2 - y1) + (m2 - m1) / 12 + (day2 - day1) / 365.25;
}

/**
 * Per spec §7.4.4 — already drawing benefits. No deferral discount.
 *
 * v1 uses single-life on participant only [R5b-19]: for J&S in-pay annuities,
 * monthlyBenefit IS the reduced J&S amount, so cash flow while alive is captured.
 * Survivor-continuation PV (typical 50% post-death) is NOT modeled at v1; the
 * form_of_benefit_callout (in_pay context) is router-surfaced for disclosure.
 *
 * @param {object} inputs — §7.3.5 input shape
 * @param {(type: string, runtimeData?: object) => void} surfaceCallout
 */
export function calculateInPayStatus(inputs, surfaceCallout) {
  void surfaceCallout;

  const asOfDate = inputs.caseEffectiveDate ?? new Date().toISOString().slice(0, 10);

  // STEP IP.1 — Current age (annuity factor age clamped to terminal age - 1 per [R5a-5])
  const currentAge = yearsBetween(inputs.participantDOB, asOfDate);
  const annuityFactorAge = Math.min(Math.floor(currentAge), 119);

  // See tier1And2.js for the /100000 vs /10000 discountRateBps note (spec
  // §7.3.1 e.g. vs §7.4 formula inconsistency; /100000 matches §417(e) reality).
  const baseDiscount = inputs.discountRateBps / 100000;
  const cola = inputs.cola / 100;

  // STEPS IP.2 + IP.3 — immediate annuity PV (no deferral)
  const computePv = (discountRate) => {
    const af = computeAnnuityFactor({
      age: annuityFactorAge,
      mortalityTable: inputs.mortalityTable,
      discountRate,
      cola,
    });
    return inputs.monthlyBenefit * 12 * af;
  };

  const pvBest = computePv(baseDiscount);
  // STEP IP.4 — Sensitivity bracket (±100bp)
  const pvLow = computePv(baseDiscount + 0.01);
  const pvHigh = computePv(baseDiscount - 0.01);

  return {
    path: 'in_pay_status',
    formulaId: 'pva_db_inpaystatus_v1',
    pv: { best: pvBest, low: pvLow, high: pvHigh },
    maritalPortion: null,
    coverture: null,
    metadata: {
      formulaId: 'pva_db_inpaystatus_v1',
      path: 'in_pay_status',
      mortalityTable: inputs.mortalityTable,
      discountRateBps: inputs.discountRateBps,
      cola: inputs.cola,
      formOfBenefitOnStatement: null,
      formOfBenefitInPay: inputs.formOfBenefitInPay ?? null,
      vestingStatus: null,
      benefitSource: null,
      planAdministratorOfferedLumpSum: inputs.planAdministratorOfferedLumpSum ?? null,
      citations: CITATIONS_BY_PATH.in_pay_status,
      calculationTimestamp: new Date().toISOString(),
      asOfDateForStatutoryConstants: asOfDate,
    },
  };
}
