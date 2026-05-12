/**
 * California path — M5-Tool-Specs.md §6.3.2 B5.
 *
 * Pendente lite:
 *   STEP 1 — Santa Clara temp formula via lookupSpousalCA (40% payor net −
 *            50% payee net; net approximated at 75% of gross at Standard depth)
 *   STEP 2 — Child support via generic Federal HHS/OCSE fallback per F-1 Gap 2
 *            (DissoMaster v1.1 deferred per memory #18)
 *   STEP 3 — Combine; alimonyFirstOrderingApplied = false at v1
 *
 * Post-divorce:
 *   STEP 1 — Cal. Fam. Code §4320 factor test; lookupSpousalCA returns 0 +
 *            factorTestApplies (per R-2)
 *   STEP 2 — Child support via generic fallback
 *   STEP 3 — Combine
 *
 * Caveat: lookupSpousalCA assumes fullWorksheet.partyA is the payor net;
 * v1 fixtures all map partyA as higher earner so this is not exercised, but
 * a swap is needed when partyB is the payor under Full Worksheet depth.
 * Surface to spec/code reconciliation queue.
 */

import {
  lookupSpousalCA,
  lookupSupportGeneric,
} from '@/src/lib/supportGuidelines';
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

export function computeCA(ctx) {
  const { inputs, payor_raw, payee_raw, highEarnerIsCustodial, callouts, perStepNarrative } = ctx;
  const { numChildren, temporal, depth, fullWorksheet } = inputs;

  // STEP 1 — Compute spousal (Santa Clara PL or §4320 factor test post-div).
  const spousalCalc = lookupSpousalCA({
    payorGrossMonthly: payor_raw,
    payeeGrossMonthly: payee_raw,
    temporal,
    depth,
    fullWorksheet,
  });
  const spousalMonthly = spousalCalc.monthlyAmount;
  perStepNarrative.push({
    step: 1,
    stepId: 'step_1_compute_spousal',
    label: temporal === 'pendente_lite'
      ? 'Compute spousal (Santa Clara temp)'
      : 'Compute spousal (factor test, Cal. Fam. Code §4320)',
    computation: `lookupSpousalCA(temporal=${temporal}, depth=${depth})`,
    result: spousalMonthly,
  });
  if (temporal === 'pendente_lite' && depth === 'standard') {
    surfaceCallout(callouts, 'state_specific_educational', {
      state: 'CA',
      framing: 'Santa Clara temp formula at Standard depth uses 75%-of-gross net approximation; Full Worksheet improves accuracy.',
    });
  }
  if (spousalCalc.factorTestApplies) {
    surfaceCallout(callouts, 'factor_test_approximation', { state: 'CA' });
  }

  // STEP 2 — Child support via generic Federal HHS/OCSE fallback (F-1 Gap 2).
  let childCalc;
  let basicSupportMonthly = 0;
  if (numChildren === 0) {
    childCalc = emptyChildCalcGeneric();
  } else {
    const generic = lookupSupportGeneric({
      payorGrossMonthly: payor_raw,
      payeeGrossMonthly: payee_raw,
      numChildren,
    });
    childCalc = generic.child;
    basicSupportMonthly = childCalc.basicSupport;
    perStepNarrative.push({
      step: 3,
      stepId: 'step_3_compute_child_support',
      label: 'Compute child support (generic Federal HHS/OCSE fallback)',
      computation: `lookupSupportGeneric(payor=${payor_raw}, payee=${payee_raw}, kids=${numChildren})`,
      result: basicSupportMonthly,
    });
    surfaceCallout(callouts, 'generic_fallback_disclaimer', {
      state: 'CA',
      framing: 'CA child support runs through generic Federal HHS/OCSE fallback at v1; DissoMaster integration deferred to v1.1.',
    });
  }

  // STEP 3a — Pro-rate to non-custodial obligor.
  let childMonthly = 0;
  if (numChildren > 0) {
    if (highEarnerIsCustodial) {
      childMonthly = 0;
      surfaceCallout(callouts, 'bidirectional_flow_disclosure', { state: 'CA' });
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

  // STEP 5 — Combine. No alimony-first ordering for CA at v1.
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
    alimonyFirstOrderingApplied: false,
    adjustedIncomes: null,
    citations:
      temporal === 'pendente_lite'
        ? ['Cal. Fam. Code §3600', 'Santa Clara County local rule (temp formula)']
        : ['Cal. Fam. Code §4320', 'Cal. Fam. Code §4330'],
  };
}

export default computeCA;
