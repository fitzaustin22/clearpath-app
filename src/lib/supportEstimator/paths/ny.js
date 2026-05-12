/**
 * New York path — M5-Tool-Specs.md §6.3.2 B3.
 *
 * lookupSpousalNY handles Formula A/B routing (per nyCustodyConfig +
 * numChildren), income-cap reduction (NY_MAINTENANCE_INCOME_CAP), and SSR
 * floor application internally — this path module orchestrates STEP 2
 * (maintenance-first ordering per DRL §236(B)), STEP 3 (CSSA child support
 * on adjusted incomes), pro-rate, and post-divorce duration narrative.
 *
 * Audit note: NY SSR is computed inside lookupSpousalNY using capped
 * payor income (codebase behavior). Spec pseudocode B3 STEP 1b describes
 * SSR using raw payor annual income; codebase wins per session-14 lock.
 */

import {
  lookupChildSupportNY,
  lookupSpousalNY,
} from '@/src/lib/supportGuidelines';
import { surfaceCallout } from '../surfaceCallout.js';

function emptyChildCalcNY() {
  return {
    basicSupport: 0,
    source: 'ny',
    scheduleStatus: 'within',
    scheduleMax: 0,
    aboveScheduleMethod: null,
    hollandExtrapolation: null,
    capValue: null,
    notes: ['no children'],
  };
}

export function computeNY(ctx) {
  const { inputs, payor_raw, payee_raw, highEarnerIsCustodial, asOfDate, callouts, perStepNarrative } = ctx;
  const { numChildren, temporal, marriageLengthYears, nyCustodyConfig } = inputs;

  // STEP 1 — Compute spousal via NY 2015 Formula A/B (with cap + SSR internally).
  const spousalCalc = lookupSpousalNY({
    payorGrossMonthly: payor_raw,
    payeeGrossMonthly: payee_raw,
    numChildren,
    nyCustodyConfig,
    marriageLengthYears,
    temporal,
    caseEffectiveDate: asOfDate,
  });
  const spousalMonthly = spousalCalc.monthlyAmount;
  perStepNarrative.push({
    step: 1,
    stepId: 'step_1_compute_spousal',
    label: `Compute spousal (${spousalCalc.formulaUsed})`,
    computation: `lookupSpousalNY(payor=${payor_raw}, payee=${payee_raw}, ${spousalCalc.formulaUsed})`,
    result: spousalMonthly,
  });

  // STEP 1b — SSR narrative (surfaced when activated).
  if (spousalCalc.ssr?.activated) {
    surfaceCallout(callouts, 'ssr_floor_activated', {
      state: 'NY',
      ssrAnnual: spousalCalc.ssr.ssrAnnual,
      formulaResultBeforeSSR: spousalCalc.ssr.formulaResultBeforeSSR,
      formulaResultAfterSSR: spousalCalc.ssr.formulaResultAfterSSR,
    });
    perStepNarrative.push({
      step: 1.5,
      stepId: 'step_1b_apply_ssr',
      label: 'Apply SSR (Self-Support Reserve) floor',
      computation: `before SSR: ${spousalCalc.ssr.formulaResultBeforeSSR.toFixed(2)}; after SSR: ${spousalCalc.ssr.formulaResultAfterSSR.toFixed(2)}`,
      result: spousalCalc.ssr.formulaResultAfterSSR,
    });
  }

  // STEP 1c — Above-cap flag (NY maintenance cap).
  if (spousalCalc.cap.hit) {
    surfaceCallout(callouts, 'statutory_above_cap_callout', {
      state: 'NY',
      scenario: 'ny_maintenance',
      capValue: spousalCalc.cap.capValue,
    });
  }
  perStepNarrative.push({
    step: 1.7,
    stepId: 'step_1c_above_cap_flag',
    label: 'Above-cap flag (NY maintenance)',
    computation: `cap.hit=${spousalCalc.cap.hit}, capValue=${spousalCalc.cap.capValue ?? 'n/a'}`,
    result: null,
  });

  // STEP 2 — Maintenance-first ordering for child support.
  let payorAdjustedMonthly = payor_raw;
  let payeeAdjustedMonthly = payee_raw;
  let alimonyFirstOrderingApplied = false;
  let adjustedIncomes = null;
  if (spousalMonthly > 0) {
    payorAdjustedMonthly = payor_raw - spousalMonthly;
    payeeAdjustedMonthly = payee_raw + spousalMonthly;
    alimonyFirstOrderingApplied = true;
    adjustedIncomes = { payorAdjustedMonthly, payeeAdjustedMonthly };
    surfaceCallout(callouts, 'alimony_first_ordering', {
      state: 'NY',
      formula: spousalCalc.formulaUsed,
    });
    perStepNarrative.push({
      step: 2,
      stepId: 'step_2_alimony_first_ordering',
      label: 'Maintenance-first ordering (DRL §236(B))',
      computation: `payor adj = ${payor_raw} − ${spousalMonthly.toFixed(2)}; payee adj = ${payee_raw} + ${spousalMonthly.toFixed(2)}`,
      result: null,
    });
  }
  const combinedAdjustedMonthly = payorAdjustedMonthly + payeeAdjustedMonthly;

  // STEP 3 — Compute CSSA child support on adjusted incomes.
  let childCalc;
  let basicSupportMonthly = 0;
  if (numChildren === 0) {
    childCalc = emptyChildCalcNY();
  } else {
    childCalc = lookupChildSupportNY(combinedAdjustedMonthly, numChildren, asOfDate);
    basicSupportMonthly = childCalc.basicSupport;
    if (childCalc.scheduleStatus === 'above') {
      surfaceCallout(callouts, 'ny_child_support_above_cap_discretionary', { state: 'NY' });
    }
    perStepNarrative.push({
      step: 3,
      stepId: 'step_3_compute_child_support',
      label: 'Compute CSSA child support',
      computation: `lookupChildSupportNY(${combinedAdjustedMonthly.toFixed(2)}, ${numChildren})`,
      result: basicSupportMonthly,
    });
  }

  // STEP 3a — Pro-rate to non-custodial obligor.
  let childMonthly = 0;
  if (numChildren > 0) {
    if (highEarnerIsCustodial) {
      childMonthly = 0;
      surfaceCallout(callouts, 'bidirectional_flow_disclosure', { state: 'NY' });
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
    perStepNarrative.push({
      step: 4,
      stepId: 'step_4_compute_duration',
      label: 'Compute duration (DRL §236(B)(6)(f)(1))',
      computation: `${spousalCalc.duration.minMonths}–${spousalCalc.duration.maxMonths} months`,
      result: null,
    });
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
      'DRL §236(B)(5-a)',
      'DRL §236(B)(6)',
      'DRL §240(1-b)',
      'Sinnott v. Sinnott, 194 A.D.3d 868 (2d Dep\'t 2021)',
    ],
  };
}

export default computeNY;
