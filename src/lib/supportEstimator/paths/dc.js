/**
 * D.C. path — M5-Tool-Specs.md §6.3.2 B2.
 *
 * Mirrors MD path structure with substitutions:
 *   - lookupSpousalDC for AAML spousal (no native DC formula; AAML is
 *     practitioner benchmark)
 *   - lookupChildSupportDC for child support (annual schedule; cap at
 *     $240K/yr; Holland dynamic-slope extrapolation surfaced above cap)
 *   - Alimony-first ordering authority: D.C. Code §16-916.01(d)(3)
 */

import {
  lookupChildSupportDC,
  lookupSpousalDC,
} from '@/src/lib/supportGuidelines';
import { surfaceCallout } from '../surfaceCallout.js';

function emptyChildCalcDC() {
  return {
    basicSupport: 0,
    source: 'dc',
    scheduleStatus: 'within',
    scheduleMax: 0,
    aboveScheduleMethod: null,
    hollandExtrapolation: null,
    capValue: null,
    notes: ['no children'],
  };
}

export function computeDC(ctx) {
  const { inputs, payor_raw, payee_raw, highEarnerIsCustodial, asOfDate, callouts, perStepNarrative } = ctx;
  const { numChildren, temporal, marriageLengthYears } = inputs;

  // STEP 1 — Compute spousal (AAML on raw incomes).
  const spousalCalc = lookupSpousalDC({
    payorGrossMonthly: payor_raw,
    payeeGrossMonthly: payee_raw,
    marriageLengthYears,
    temporal,
  });
  const spousalMonthly = spousalCalc.monthlyAmount;
  perStepNarrative.push({
    step: 1,
    stepId: 'step_1_compute_spousal',
    label: 'Compute AAML spousal (D.C.)',
    computation: `lookupSpousalDC(payor=${payor_raw}, payee=${payee_raw})`,
    result: spousalMonthly,
  });
  if (spousalCalc.capBinds) {
    surfaceCallout(callouts, 'aaml_cap_binds', { state: 'DC' });
  }
  surfaceCallout(callouts, 'state_specific_educational', {
    state: 'DC',
    framing: 'DC has no statutory alimony formula; AAML is practitioner benchmark, not appellate-endorsed.',
  });

  // STEP 2 — Alimony-first ordering (D.C. Code §16-916.01(d)(3)).
  let payorAdjustedMonthly = payor_raw;
  let payeeAdjustedMonthly = payee_raw;
  let alimonyFirstOrderingApplied = false;
  let adjustedIncomes = null;
  if (spousalMonthly > 0) {
    payorAdjustedMonthly = payor_raw - spousalMonthly;
    payeeAdjustedMonthly = payee_raw + spousalMonthly;
    alimonyFirstOrderingApplied = true;
    adjustedIncomes = { payorAdjustedMonthly, payeeAdjustedMonthly };
    surfaceCallout(callouts, 'alimony_first_ordering', { state: 'DC' });
    perStepNarrative.push({
      step: 2,
      stepId: 'step_2_alimony_first_ordering',
      label: 'Alimony-first ordering (D.C. Code §16-916.01(d)(3))',
      computation: `payor adj = ${payor_raw} − ${spousalMonthly.toFixed(2)}; payee adj = ${payee_raw} + ${spousalMonthly.toFixed(2)}`,
      result: null,
    });
  }
  const combinedAdjustedMonthly = payorAdjustedMonthly + payeeAdjustedMonthly;

  // STEP 3 — Compute child support basic obligation on adjusted incomes.
  let childCalc;
  let basicSupportMonthly = 0;
  if (numChildren === 0) {
    childCalc = emptyChildCalcDC();
  } else {
    childCalc = lookupChildSupportDC(combinedAdjustedMonthly, numChildren, asOfDate);
    basicSupportMonthly = childCalc.basicSupport;
    if (childCalc.scheduleStatus === 'above') {
      surfaceCallout(callouts, 'statutory_above_cap_callout', {
        state: 'DC',
        scenario: 'dc_child',
        hollandExtrapolation: childCalc.hollandExtrapolation,
      });
      surfaceCallout(callouts, 'high_asset_caveat', { state: 'DC' });
    }
    perStepNarrative.push({
      step: 3,
      stepId: 'step_3_compute_child_support',
      label: 'Compute child support basic obligation',
      computation: `lookupChildSupportDC(${combinedAdjustedMonthly.toFixed(2)}, ${numChildren})`,
      result: basicSupportMonthly,
    });
  }

  // STEP 3a — Pro-rate to non-custodial obligor.
  let childMonthly = 0;
  if (numChildren > 0) {
    if (highEarnerIsCustodial) {
      childMonthly = 0;
      surfaceCallout(callouts, 'bidirectional_flow_disclosure', { state: 'DC' });
      perStepNarrative.push({
        step: 3.5,
        stepId: 'step_3a_pro_rate_to_non_custodial',
        label: 'Pro-rate to non-custodial obligor',
        computation: 'high-earner-custodial: childMonthly suppressed per S5a-2',
        result: 0,
      });
    } else {
      const payorIncomeShare = payorAdjustedMonthly / combinedAdjustedMonthly;
      childMonthly = basicSupportMonthly * payorIncomeShare;
      perStepNarrative.push({
        step: 3.5,
        stepId: 'step_3a_pro_rate_to_non_custodial',
        label: 'Pro-rate to non-custodial obligor',
        computation: `${basicSupportMonthly.toFixed(2)} × ${payorIncomeShare.toFixed(4)}`,
        result: childMonthly,
      });
    }
  }

  // STEP 4 — Duration (post-divorce only).
  if (temporal === 'post_divorce' && spousalCalc.duration) {
    surfaceCallout(callouts, 'aaml_duration_advisory', {
      state: 'DC',
      minMonths: spousalCalc.duration.minMonths,
      maxMonths: spousalCalc.duration.maxMonths,
    });
    perStepNarrative.push({
      step: 4,
      stepId: 'step_4_compute_duration',
      label: 'Compute duration (AAML advisory)',
      computation: `${spousalCalc.duration.minMonths}–${spousalCalc.duration.maxMonths} months`,
      result: null,
    });
  }

  if (typeof marriageLengthYears === 'number' && marriageLengthYears < 5) {
    surfaceCallout(callouts, 'short_marriage_caveat', { state: 'DC', marriageLengthYears });
  }

  // STEP 5 — Combine.
  perStepNarrative.push({
    step: 5,
    stepId: 'step_5_combine',
    label: 'Combine',
    computation: `${childMonthly.toFixed(2)} + ${spousalMonthly.toFixed(2)}`,
    result: childMonthly + spousalMonthly,
  });
  perStepNarrative.sort((a, b) => a.step - b.step);

  return {
    childMonthly,
    spousalMonthly,
    spousalCalc,
    childCalc,
    alimonyFirstOrderingApplied,
    adjustedIncomes,
    citations: [
      'D.C. Code §16-913',
      'D.C. Code §16-916.01',
      'Builta v. Guzman, 324 A.3d 269 (D.C. 2024)',
    ],
  };
}

export default computeDC;
