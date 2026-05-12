/**
 * Generic fallback path (state === 'OTHER') — M5-Tool-Specs.md §6.3.2 B5b-1.
 *
 * Child support: Federal HHS/OCSE national approximation via lookupSupportGeneric.
 * Spousal support: 0 + factorTestApplies (no national spousal formula; per S5a-6).
 *
 * Spec/codebase reconciliation note: spec §6.3.2:543 describes
 * lookupSupportGeneric as returning `{ spousalCalc, childCalc }`, but the
 * implementation in src/lib/supportGuidelines/generic-income-shares.js
 * returns `{ child, spousal }`. Codebase wins per session-14 lock; this
 * path destructures `{ child, spousal }` and surfaces in PR description.
 */

import { lookupSupportGeneric } from '@/src/lib/supportGuidelines';
import { surfaceCallout } from '../surfaceCallout.js';

function emptyChildCalcGeneric() {
  return {
    basicSupport: 0,
    source: 'generic',
    scheduleStatus: 'within',
    scheduleMax: 0,
    aboveScheduleMethod: null,
    hollandExtrapolation: null,
    capValue: null,
    notes: ['no children'],
  };
}

export function computeGeneric(ctx) {
  const { inputs, payor_raw, payee_raw, highEarnerIsCustodial, callouts, perStepNarrative } = ctx;
  const { numChildren } = inputs;

  // STEP 1 — Generic Federal HHS/OCSE fallback. Returns { child, spousal }.
  const generic = lookupSupportGeneric({
    payorGrossMonthly: payor_raw,
    payeeGrossMonthly: payee_raw,
    numChildren,
  });
  const spousalCalc = generic.spousal;
  const spousalMonthly = spousalCalc.monthlyAmount;
  perStepNarrative.push({
    step: 1,
    stepId: 'step_1_compute_spousal',
    label: 'Compute spousal (factor test — no national formula)',
    computation: 'spousalMonthly = 0; factorTestApplies = true',
    result: spousalMonthly,
  });
  surfaceCallout(callouts, 'factor_test_approximation', { state: 'OTHER' });
  surfaceCallout(callouts, 'generic_fallback_disclaimer', { state: 'OTHER' });
  surfaceCallout(callouts, 'state_specific_educational', {
    state: 'OTHER',
    framing: 'Result is a Federal HHS/OCSE national approximation, not your state\'s law.',
  });

  // STEP 2 — Child portion (within generic.child per §6.5.3).
  let childCalc;
  let basicSupportMonthly = 0;
  if (numChildren === 0) {
    childCalc = emptyChildCalcGeneric();
  } else {
    childCalc = generic.child;
    basicSupportMonthly = childCalc.basicSupport;
    perStepNarrative.push({
      step: 3,
      stepId: 'step_3_compute_child_support',
      label: 'Compute child support (generic Federal HHS/OCSE)',
      computation: `lookupSupportGeneric(payor=${payor_raw}, payee=${payee_raw}, kids=${numChildren}) → ${basicSupportMonthly.toFixed(2)}`,
      result: basicSupportMonthly,
    });
  }

  // STEP 1a — Pro-rate to non-custodial obligor.
  let childMonthly = 0;
  if (numChildren > 0) {
    if (highEarnerIsCustodial) {
      childMonthly = 0;
      surfaceCallout(callouts, 'bidirectional_flow_disclosure', { state: 'OTHER' });
      perStepNarrative.push({
        step: 3.5,
        stepId: 'step_3a_pro_rate_to_non_custodial',
        label: 'Pro-rate to non-custodial obligor',
        computation: 'high-earner-custodial: childMonthly suppressed per S5a-2',
        result: 0,
      });
    } else {
      const payorIncomeShare = payor_raw / (payor_raw + payee_raw);
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

  // STEP 3 — Combine.
  perStepNarrative.push({
    step: 5,
    stepId: 'step_5_combine',
    label: 'Combine',
    computation: `${childMonthly.toFixed(2)} + ${spousalMonthly.toFixed(2)}`,
    result: childMonthly + spousalMonthly,
  });
  perStepNarrative.sort((a, b) => a.step - b.step);

  // Spec §6.5.4 lists 'generic_income_shares' as formulaUsed for the child
  // portion of OTHER, but spousal returns 'factor_test_approximation'.
  // childCalc.source carries the child-portion provenance separately.
  return {
    childMonthly,
    spousalMonthly,
    spousalCalc,
    childCalc,
    alimonyFirstOrderingApplied: false,
    adjustedIncomes: null,
    citations: [
      'Federal HHS/OCSE income-shares national model',
      'state-specific factor analysis (no federal spousal formula)',
    ],
  };
}

export default computeGeneric;
