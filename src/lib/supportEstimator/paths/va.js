/**
 * Virginia path — M5-Tool-Specs.md §6.3.2 B4.
 *
 * v1 lock: VA does not require alimony-first ordering (TC-SE-Verify-1).
 * Rationale: research did not surface a VA equivalent to Md. §12-204(a)(2)
 * or D.C. §16-916.01(d)(3).
 *
 * Pendente lite spousal uses Va. Code §16.1-278.17:1 / §20-103 statutory
 * formula. Post-divorce spousal is committed to factor analysis (§20-107.1);
 * no native VA formula. Per R-2: returns 0 + factorTestApplies to avoid a
 * misleading approximation.
 */

import {
  lookupChildSupportVA,
  lookupSpousalVA_PL,
} from '@/src/lib/supportGuidelines';
import { surfaceCallout } from '../surfaceCallout.js';

function emptyChildCalcVA() {
  return {
    basicSupport: 0,
    source: 'va',
    scheduleStatus: 'within',
    scheduleMax: 0,
    aboveScheduleMethod: null,
    hollandExtrapolation: null,
    capValue: null,
    notes: ['no children'],
  };
}

function postDivorceFactorTestSpousal() {
  return {
    monthlyAmount: 0,
    formulaUsed: 'factor_test_approximation',
    duration: null,
    cap: { hit: false, capValue: null, aboveTreatment: null },
    capBinds: false,
    ssr: null,
    factorTestApplies: true,
    notes: [],
  };
}

export function computeVA(ctx) {
  const { inputs, payor_raw, payee_raw, highEarnerIsCustodial, asOfDate, callouts, perStepNarrative } = ctx;
  const { numChildren, temporal } = inputs;
  const combinedMonthly = payor_raw + payee_raw;

  // STEP 1 — Compute child support basic obligation.
  let childCalc;
  let basicSupportMonthly = 0;
  if (numChildren === 0) {
    childCalc = emptyChildCalcVA();
  } else {
    childCalc = lookupChildSupportVA(combinedMonthly, numChildren, asOfDate);
    basicSupportMonthly = childCalc.basicSupport;
    if (childCalc.scheduleStatus === 'above') {
      surfaceCallout(callouts, 'statutory_above_cap_callout', {
        state: 'VA',
        scenario: 'va_child',
      });
    }
  }
  if (numChildren > 0) {
    perStepNarrative.push({
      step: 3,
      stepId: 'step_3_compute_child_support',
      label: 'Compute child support basic obligation',
      computation: `lookupChildSupportVA(${combinedMonthly}, ${numChildren}) → ${basicSupportMonthly.toFixed(2)}`,
      result: basicSupportMonthly,
    });
  }

  // STEP 1a — Pro-rate to non-custodial obligor.
  let childMonthly = 0;
  if (numChildren > 0) {
    if (highEarnerIsCustodial) {
      childMonthly = 0;
      surfaceCallout(callouts, 'bidirectional_flow_disclosure', { state: 'VA' });
      perStepNarrative.push({
        step: 3.5,
        stepId: 'step_3a_pro_rate_to_non_custodial',
        label: 'Pro-rate to non-custodial obligor',
        computation: 'high-earner-custodial: childMonthly suppressed per S5a-2',
        result: 0,
      });
    } else {
      const payorIncomeShare = payor_raw / combinedMonthly;
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

  // STEP 2 — Compute spousal.
  let spousalCalc;
  if (temporal === 'pendente_lite') {
    spousalCalc = lookupSpousalVA_PL({
      payorGrossMonthly: payor_raw,
      payeeGrossMonthly: payee_raw,
      numChildren,
    });
    if (spousalCalc.cap.hit) {
      surfaceCallout(callouts, 'statutory_above_cap_callout', {
        state: 'VA',
        scenario: 'va_pl_spousal_above_120k',
      });
    }
  } else {
    spousalCalc = postDivorceFactorTestSpousal();
    surfaceCallout(callouts, 'factor_test_approximation', { state: 'VA' });
  }
  const spousalMonthly = spousalCalc.monthlyAmount;
  perStepNarrative.push({
    step: 1,
    stepId: 'step_1_compute_spousal',
    label: 'Compute spousal',
    computation: temporal === 'pendente_lite'
      ? `lookupSpousalVA_PL(payor=${payor_raw}, payee=${payee_raw}, kids=${numChildren})`
      : 'VA post-divorce: factor test (Va. Code §20-107.1)',
    result: spousalMonthly,
  });

  // STEP 3 — Combine. No alimony-first ordering for VA at v1.
  perStepNarrative.push({
    step: 5,
    stepId: 'step_5_combine',
    label: 'Combine',
    computation: `${childMonthly.toFixed(2)} + ${spousalMonthly.toFixed(2)}`,
    result: childMonthly + spousalMonthly,
  });

  // Sort narrative by step number ascending (§6.4.2).
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
        ? ['Va. Code §16.1-278.17:1', 'Va. Code §20-103', 'Va. Code §20-108.2']
        : ['Va. Code §20-107.1', 'Va. Code §20-108.2'],
  };
}

export default computeVA;
