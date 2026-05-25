import { calculateTier1Or2 } from './tier1And2.js';
import { calculateTier3Coverture } from './tier3Coverture.js';
import { calculateInPayStatus } from './inPayStatus.js';
import { calculateCashBalance } from './cashBalancePassthrough.js';
import { CITATIONS_BY_PATH } from './citations.js';

/**
 * Default `receiptForm` per path. User can override via `inputs.receiptForm`.
 * `flag_only` has no `receiptForm` (no PV computed).
 */
export const DEFAULT_RECEIPT_FORM_BY_PATH = Object.freeze({
  tier_1: 'monthly_db_stream',
  tier_2: 'monthly_db_stream',
  tier_3: 'monthly_db_stream',
  in_pay_status: 'monthly_db_stream',
  cash_balance: 'lump_sum_rollover_to_ira',
  flag_only: null,
});

// §7.9.1 callout rendering precedence. Surfacing order is NOT semantically
// meaningful per [R5b-11]; the show-the-math UI consumes the sorted array.
export const CALLOUT_PRECEDENCE = Object.freeze({
  multi_employer_flag_only: 1,
  gov_flag_only: 2,
  frozen_plan_tier1_routing: 4,
  coverture_zero_fraction: 5,
  vesting_status_callout: 6,
  form_of_benefit_callout: 7,
  qpsa_election_callout: 8,
  cash_balance_passthrough_explanation: 9,
  lump_sum_offer_divergence: 10,
  qdro_handoff_recommended: 11,
  liability_disclaimer: 12,
});

const GOV_FLAG_ONLY_VARIANT_BY_PLAN_TYPE = Object.freeze({
  gov_civilian: 'csrs_fers',
  military: 'military',
  state_municipal: 'state_municipal',
});

function todayISODate() {
  return new Date().toISOString().slice(0, 10);
}

function buildFlagOnlyResult(inputs, asOfDate) {
  return {
    path: 'flag_only',
    formulaId: null,
    pv: null,
    coverture: null,
    maritalPortion: null,
    metadata: {
      formulaId: null,
      path: 'flag_only',
      planName: inputs.planName ?? null,
      whoseplan: inputs.whoseplan ?? null,
      planType: inputs.planType ?? null,
      mortalityTable: inputs.mortalityTable ?? null,
      discountRateBps: inputs.discountRateBps ?? null,
      cola: inputs.cola ?? null,
      formOfBenefitOnStatement: inputs.formOfBenefitOnStatement ?? null,
      formOfBenefitInPay: null,
      vestingStatus: inputs.vestingStatus ?? null,
      benefitSource: inputs.benefitSource ?? null,
      planAdministratorOfferedLumpSum: inputs.planAdministratorOfferedLumpSum ?? null,
      citations: CITATIONS_BY_PATH.flag_only,
      calculationTimestamp: new Date().toISOString(),
      asOfDateForStatutoryConstants: asOfDate,
    },
  };
}

function buildPerStepNarrative(path, inputs, result) {
  // v1 lib foundation: emit the locked step IDs from §7.6.2 with minimal label/
  // computation strings. PR 2 (UI integration) will populate richer narrative
  // text — fixtures and tests don't pin label/computation content at v1.
  const steps = [
    { step: 0, stepId: 'step_cp_resolve_constants', label: 'Resolve constants', computation: '', result: null },
    { step: 1, stepId: 'step_cp_dispatch_path', label: `Dispatch to ${path}`, computation: '', result: null },
  ];
  if (path === 'flag_only') return steps;

  const hasCBCoverture = path === 'cash_balance' && result.coverture !== null;
  let idx = steps.length;

  if (path === 'tier_1' || path === 'tier_2' || path === 'tier_3') {
    steps.push({ step: idx++, stepId: 'step_t_compute_deferral_period', label: 'Deferral period', computation: '', result: null });
  }
  if (path === 'tier_3' || hasCBCoverture) {
    steps.push({ step: idx++, stepId: 'step_t_compute_coverture_fraction', label: 'Coverture fraction', computation: '', result: null });
  }
  if (path !== 'cash_balance') {
    steps.push({ step: idx++, stepId: 'step_t_compute_annuity_factor', label: 'Annuity factor', computation: '', result: null });
  }
  steps.push({ step: idx++, stepId: 'step_t_compute_pv', label: 'Present value', computation: '', result: null });
  if (path === 'tier_3' || hasCBCoverture) {
    steps.push({ step: idx++, stepId: 'step_t_apply_coverture', label: 'Apply coverture', computation: '', result: null });
  }
  if (path !== 'cash_balance') {
    steps.push({ step: idx++, stepId: 'step_t_compute_sensitivity_bracket', label: '±100bp sensitivity', computation: '', result: null });
  }
  if (inputs.planAdministratorOfferedLumpSum != null) {
    steps.push({ step: idx++, stepId: 'step_cp_lump_sum_comparison', label: 'Lump sum comparison', computation: '', result: null });
  }
  return steps;
}

/**
 * Top-level PVA entry point per spec §7.4.1.
 *
 * Routing model per §7.2 + build prompt: caller is responsible for choosing the
 * path (typically via UI based on planType / accrualStatus / R3 guards). This
 * function dispatches by `inputs.path` and assembles the full result envelope.
 *
 * Callout flow per [R5b-24]: closure-scoped collector accumulates from both the
 * dispatched engine (engine-surfaced callouts like coverture_zero_fraction) and
 * STEP CP.4 (router-surfaced meta callouts). The merged array is sorted by
 * §7.9.1 rendering precedence at STEP CP.5.
 *
 * @param {object} inputs
 * @returns {object} — full result with metadata, breakdown, receiptForm
 */
export function calculatePensionValue(inputs) {
  const callouts = [];
  const surfaceCallout = (type, runtimeData = {}) => callouts.push({ type, ...runtimeData });

  // STEP CP.0 — Resolve constants
  const asOfDate = inputs.caseEffectiveDate ?? todayISODate();

  // STEP CP.1 — Dispatch by path
  let result;
  if (inputs.path === 'tier_1' || inputs.path === 'tier_2') {
    result = calculateTier1Or2(inputs, surfaceCallout);
  } else if (inputs.path === 'tier_3') {
    result = calculateTier3Coverture(inputs, surfaceCallout);
  } else if (inputs.path === 'in_pay_status') {
    result = calculateInPayStatus(inputs, surfaceCallout);
  } else if (inputs.path === 'cash_balance') {
    result = calculateCashBalance(inputs, surfaceCallout);
  } else if (inputs.path === 'flag_only') {
    result = buildFlagOnlyResult(inputs, asOfDate);
    // Flag-only educational callout (gated by planType)
    if (inputs.planType === 'multi_employer') {
      surfaceCallout('multi_employer_flag_only', { planName: inputs.planName ?? null });
    } else if (GOV_FLAG_ONLY_VARIANT_BY_PLAN_TYPE[inputs.planType]) {
      surfaceCallout('gov_flag_only', {
        variant: GOV_FLAG_ONLY_VARIANT_BY_PLAN_TYPE[inputs.planType],
        planName: inputs.planName ?? null,
      });
    }
  } else {
    throw new Error(
      `Unknown path: ${inputs.path}. Expected one of: tier_1, tier_2, tier_3, in_pay_status, cash_balance, flag_only`
    );
  }

  // STEP CP.3 — Lump-sum offer comparison [R5b-6]
  // Plan administrators quote full PV (not marital portion), so compare against
  // pv.total for coverture paths.
  if (inputs.planAdministratorOfferedLumpSum != null && inputs.path !== 'flag_only') {
    const toolPv = result.coverture !== null ? result.pv.total.best : result.pv.best;
    const offer = inputs.planAdministratorOfferedLumpSum;
    const diff = offer - toolPv;
    if (toolPv === 0) {
      // Divide-by-zero guard per §7.4.8
      if (Math.abs(diff) > 0) {
        surfaceCallout('lump_sum_offer_divergence', { offer, toolPv: 0, diff, pctDiff: null });
      }
    } else {
      const pctDiff = diff / toolPv;
      if (Math.abs(pctDiff) > 0.10) {
        surfaceCallout('lump_sum_offer_divergence', { offer, toolPv, diff, pctDiff });
      }
    }
  }

  // STEP CP.4 — Surface mandatory meta callouts [R5b-10, R5b-18, R5b-19]
  if (inputs._frozenRoutingApplied) {
    surfaceCallout('frozen_plan_tier1_routing', { planName: inputs.planName ?? null });
  }
  if (inputs.vestingStatus && inputs.vestingStatus !== 'fully_vested') {
    surfaceCallout('vesting_status_callout', { vestingStatus: inputs.vestingStatus });
  }
  if (inputs.path === 'in_pay_status' && inputs.formOfBenefitInPay && inputs.formOfBenefitInPay !== 'single_life') {
    surfaceCallout('form_of_benefit_callout', { context: 'in_pay', form: inputs.formOfBenefitInPay });
  } else if (inputs.formOfBenefitOnStatement && inputs.formOfBenefitOnStatement !== 'single_life') {
    surfaceCallout('form_of_benefit_callout', { context: 'on_statement', form: inputs.formOfBenefitOnStatement });
  }
  if (inputs.path === 'cash_balance') {
    surfaceCallout('cash_balance_passthrough_explanation');
  }
  if (inputs.path !== 'flag_only') {
    surfaceCallout('qpsa_election_callout');
    surfaceCallout('qdro_handoff_recommended', { path: inputs.path, planType: inputs.planType ?? null });
  }
  // Always-last (rendered last per §7.9.1 precedence)
  surfaceCallout('liability_disclaimer');

  // STEP CP.5 — Sort callouts by §7.9.1 rendering precedence (stable sort)
  callouts.sort((a, b) => CALLOUT_PRECEDENCE[a.type] - CALLOUT_PRECEDENCE[b.type]);

  // STEP CP.6 — Derive receiptForm [R5b-12]
  let receiptForm;
  if (inputs.path === 'flag_only') {
    receiptForm = null;
  } else if (inputs.receiptForm) {
    receiptForm = inputs.receiptForm;
  } else {
    receiptForm = DEFAULT_RECEIPT_FORM_BY_PATH[inputs.path];
  }

  // STEP CP.7 — Attach receiptForm + breakdown (citations already in engine metadata)
  result.receiptForm = receiptForm;
  result.metadata.receiptForm = receiptForm;
  result.breakdown = {
    callouts,
    perStepNarrative: buildPerStepNarrative(inputs.path, inputs, result),
  };

  return result;
}
