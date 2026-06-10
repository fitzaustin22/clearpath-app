import { computeAnnuityFactor } from './annuityFactor.js';
import { CITATIONS_BY_PATH } from './citations.js';
import { resolveSegment2Rate } from './effectiveDateConstants.js';

// yearsBetween inlined here (and in inPayStatus) to keep the build-prompt 14-file
// inventory exact. Both call sites use the same fractional-year formula.
function yearsBetween(d1, d2) {
  const [y1, m1, day1] = d1.split('-').map(Number);
  const [y2, m2, day2] = d2.split('-').map(Number);
  return (y2 - y1) + (m2 - m1) / 12 + (day2 - day1) / 365.25;
}

/**
 * Per spec §7.4.2 — Tier 1 (accrued benefit known) and Tier 2 (estimated).
 * Identical math; differ only in metadata.benefitSource and formulaId.
 *
 * Past-NRA handling [R5b-1]: when yearsToNRA clamps to 0, the annuity factor
 * is computed at floor(currentAge) (not planNRA), so the annuity stream reflects
 * remaining life expectancy from today rather than from a stale NRA reference.
 *
 * Engine-level callouts: none at v1. vesting_status_callout and
 * form_of_benefit_callout (on_statement context) are router-surfaced via §7.4.1
 * STEP CP.4; engine just propagates the underlying fields through metadata.
 *
 * @param {object} inputs — §7.3.2 (Tier 1) or §7.3.3 (Tier 2) input shape
 * @param {(type: string, runtimeData?: object) => void} surfaceCallout
 */
export function calculateTier1Or2(inputs, surfaceCallout) {
  void surfaceCallout;

  const asOfDate = inputs.caseEffectiveDate ?? new Date().toISOString().slice(0, 10);

  // STEP T1.1 — Deferral period
  const participantAgeToday = yearsBetween(inputs.participantDOB, asOfDate);
  const yearsToNRA = Math.max(0, inputs.planNRA - participantAgeToday);

  // STEP T1.2 — Annuity factor age [R5b-1]
  const annuityFactorAge = yearsToNRA === 0
    ? Math.min(Math.floor(participantAgeToday), 119)
    : inputs.planNRA;

  // §417(e) segment-2 statutory rate resolved by valuation date (v1 repair
  // 2026-06-10; evidence: docs/verification/417e-evidence-memo-2026-06-10.md).
  // Applied annual discount = segment2Pct / 100 exactly. The legacy
  // discountRateBps input is no longer consumed by the rate math (echoed in
  // metadata only, for persisted-shape continuity).
  const rateResolution = resolveSegment2Rate(asOfDate);
  const baseDiscount = rateResolution.segment2Pct / 100;
  const cola = inputs.cola / 100;

  // STEPS T1.3 + T1.4 + T1.5 — PV at a given discount rate
  const computePv = (discountRate) => {
    const af = computeAnnuityFactor({
      age: annuityFactorAge,
      mortalityTable: inputs.mortalityTable,
      discountRate,
      cola,
    });
    const deferralFactor = 1 / Math.pow(1 + discountRate, yearsToNRA);
    return inputs.accruedMonthlyBenefitAtNRA * 12 * af * deferralFactor;
  };

  const pvBest = computePv(baseDiscount);
  // STEP T1.6 — Sensitivity bracket: segment2Pct ± 1.00 (rendered as ±100bp)
  const pvLow = computePv(baseDiscount + 0.01);   // higher rate → lower PV
  const pvHigh = computePv(baseDiscount - 0.01);  // lower rate → higher PV

  const formulaId = inputs.path === 'tier_1' ? 'pva_db_tier1_v1' : 'pva_db_tier2_v1';

  return {
    path: inputs.path,
    formulaId,
    pv: { best: pvBest, low: pvLow, high: pvHigh },
    maritalPortion: null,
    coverture: null,
    metadata: {
      formulaId,
      path: inputs.path,
      mortalityTable: inputs.mortalityTable,
      discountRateBps: inputs.discountRateBps ?? null, // legacy echo — not applied
      segment2Pct: rateResolution.segment2Pct,
      rateMonth: rateResolution.rateMonth,
      noticeId: rateResolution.noticeId,
      rateResolutionFlags: rateResolution.flags,
      cola: inputs.cola,
      formOfBenefitOnStatement: inputs.formOfBenefitOnStatement ?? null,
      formOfBenefitInPay: null,
      vestingStatus: inputs.vestingStatus ?? null,
      benefitSource: inputs.benefitSource ?? null,
      planAdministratorOfferedLumpSum: inputs.planAdministratorOfferedLumpSum ?? null,
      citations: CITATIONS_BY_PATH[inputs.path],
      calculationTimestamp: new Date().toISOString(),
      asOfDateForStatutoryConstants: asOfDate,
    },
  };
}
