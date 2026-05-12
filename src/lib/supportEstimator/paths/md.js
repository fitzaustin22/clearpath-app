/**
 * Maryland path — M5-Tool-Specs.md §6.3.2 B1.
 *
 * v1 lock: MD always computes AAML spousal regardless of temporal mode
 * (Boemio v. Boemio, 414 Md. 118 (2010) approved AAML as informational aid
 * at both PL and post-divorce stages).
 *
 * Alimony-first ordering applies when spousal > 0, per Md. Fam. Law
 * §12-204(a)(2): child support guideline runs on incomes adjusted for the
 * spousal transfer. Above-schedule child support uses Voishan presumptive
 * floor (basicSupport from lookupChildSupportMD handled internally).
 */

import {
  lookupChildSupportMD,
  lookupSpousalMD,
} from '@/src/lib/supportGuidelines';
import { surfaceCallout } from '../surfaceCallout.js';

function emptyChildCalcMD() {
  return {
    basicSupport: 0,
    source: 'md',
    scheduleStatus: 'within',
    scheduleMax: 0,
    aboveScheduleMethod: null,
    hollandExtrapolation: null,
    capValue: null,
    notes: ['no children'],
  };
}

export function computeMD(ctx) {
  const { inputs, payor_raw, payee_raw, highEarnerIsCustodial, asOfDate, callouts, perStepNarrative } = ctx;
  const { numChildren, temporal, marriageLengthYears } = inputs;

  // STEP 1 — Compute spousal (AAML on raw incomes).
  const spousalCalc = lookupSpousalMD({
    payorGrossMonthly: payor_raw,
    payeeGrossMonthly: payee_raw,
    marriageLengthYears,
    temporal,
  });
  const spousalMonthly = spousalCalc.monthlyAmount;
  perStepNarrative.push({
    step: 1,
    stepId: 'step_1_compute_spousal',
    label: 'Compute AAML spousal (Md.)',
    computation: `lookupSpousalMD(payor=${payor_raw}, payee=${payee_raw})`,
    result: spousalMonthly,
  });
  if (spousalCalc.capBinds) {
    surfaceCallout(callouts, 'aaml_cap_binds', { state: 'MD' });
  }
  surfaceCallout(callouts, 'state_specific_educational', { state: 'MD', citation: 'Boemio v. Boemio, 414 Md. 118 (2010)' });

  // STEP 2 — Alimony-first ordering (Md. Fam. Law §12-204(a)(2)).
  let payorAdjustedMonthly = payor_raw;
  let payeeAdjustedMonthly = payee_raw;
  let alimonyFirstOrderingApplied = false;
  let adjustedIncomes = null;
  if (spousalMonthly > 0) {
    payorAdjustedMonthly = payor_raw - spousalMonthly;
    payeeAdjustedMonthly = payee_raw + spousalMonthly;
    alimonyFirstOrderingApplied = true;
    adjustedIncomes = { payorAdjustedMonthly, payeeAdjustedMonthly };
    surfaceCallout(callouts, 'alimony_first_ordering', { state: 'MD' });
    perStepNarrative.push({
      step: 2,
      stepId: 'step_2_alimony_first_ordering',
      label: 'Alimony-first ordering (Md. Fam. Law §12-204(a)(2))',
      computation: `payor adj = ${payor_raw} − ${spousalMonthly.toFixed(2)}; payee adj = ${payee_raw} + ${spousalMonthly.toFixed(2)}`,
      result: null,
    });
  }
  const combinedAdjustedMonthly = payorAdjustedMonthly + payeeAdjustedMonthly;

  // STEP 3 — Compute child support basic obligation on adjusted incomes.
  let childCalc;
  let basicSupportMonthly = 0;
  if (numChildren === 0) {
    childCalc = emptyChildCalcMD();
  } else {
    childCalc = lookupChildSupportMD(combinedAdjustedMonthly, numChildren, asOfDate);
    basicSupportMonthly = childCalc.basicSupport;
    if (childCalc.scheduleStatus === 'above') {
      surfaceCallout(callouts, 'statutory_above_cap_callout', { state: 'MD', scenario: 'md_child' });
      surfaceCallout(callouts, 'high_asset_caveat', { state: 'MD' });
    }
    perStepNarrative.push({
      step: 3,
      stepId: 'step_3_compute_child_support',
      label: 'Compute child support basic obligation',
      computation: `lookupChildSupportMD(${combinedAdjustedMonthly.toFixed(2)}, ${numChildren})`,
      result: basicSupportMonthly,
    });
  }

  // STEP 3a — Pro-rate to non-custodial obligor (S5a-1).
  let childMonthly = 0;
  if (numChildren > 0) {
    if (highEarnerIsCustodial) {
      childMonthly = 0;
      surfaceCallout(callouts, 'bidirectional_flow_disclosure', { state: 'MD' });
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

  // STEP 4 — Duration (post-divorce only; surfaced by lookupSpousalMD).
  if (temporal === 'post_divorce' && spousalCalc.duration) {
    surfaceCallout(callouts, 'aaml_duration_advisory', {
      state: 'MD',
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
    surfaceCallout(callouts, 'short_marriage_caveat', { state: 'MD', marriageLengthYears });
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
      'Md. Fam. Law §11-106',
      'Md. Fam. Law §12-204',
      'Boemio v. Boemio, 414 Md. 118 (2010)',
      'Voishan v. Palma, 327 Md. 318 (1992)',
    ],
  };
}

export default computeMD;
