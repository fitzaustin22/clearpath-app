import { computeAnnuityFactor } from './annuityFactor.js';
import { CITATIONS_BY_PATH } from './citations.js';
import { resolveSegment2Rate } from './effectiveDateConstants.js';

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

  // §417(e) segment-2 statutory rate resolved by valuation date (v1 repair
  // 2026-06-10; see tier1And2.js + docs/verification/417e-evidence-memo).
  // Applied annual discount = segment2Pct / 100 exactly; discountRateBps no
  // longer feeds the math.
  const rateResolution = resolveSegment2Rate(asOfDate);
  const baseDiscount = rateResolution.segment2Pct / 100;
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
  // STEP IP.4 — Sensitivity bracket: segment2Pct ± 1.00 (rendered as ±100bp)
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
      discountRateBps: inputs.discountRateBps ?? null, // legacy echo — not applied
      segment2Pct: rateResolution.segment2Pct,
      rateMonth: rateResolution.rateMonth,
      noticeId: rateResolution.noticeId,
      rateResolutionFlags: rateResolution.flags,
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
