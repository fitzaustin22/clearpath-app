/**
 * A1 recompute runner — Phase 1 SKELETON with data-driven pin gating.
 *
 * Spec §4-A1 + Phase 1 scope: the runner inspects ACTUAL slot state per
 * fixture. Any fixture containing 'PIN_PENDING_FITZ' slots → refuse, naming
 * the unpinned slots (the harness must not run A1 against unverified
 * expectations). Any fully-pinned fixture (including zero-slot F4) → execute
 * the recompute path: each pinned slot dispatches to a registered recomputer
 * that re-derives the value INDEPENDENTLY from the fixture source-of-truth
 * JSON (never from store state). Slots without a registered recomputer report
 * 'recompute_not_implemented_phase2' — full A1 100% is the Phase 2 gate.
 */
import {
  recomputeInventoryAssetFooting,
  recomputePensionPVAtBaseSegmentRate,
  recomputeMaritalPVBest,
  recomputeCovertureFraction,
  recomputeSensitivityMaritalLow,
  recomputeSensitivityMaritalHigh,
  recomputeMdAamlSupportFigure,
  recomputeBuiltaExtrapolatedFigure,
  recomputeMdAamlDurationBand,
  recomputeHdaScenarioBNetProceedsAfter121,
  recomputeS121PartialExclusionAmount,
  recomputeHugTrancheValue,
  recomputeNelsonTrancheValue,
  recomputeFsoFilingStatusDelta,
  recomputeS2NetIncomeDerivationFromPayStub,
  recomputeBudgetGapMonthlyFigure,
  recomputeReadinessTierBoundaryValue,
} from './a1Recomputers';

export const PIN_LITERAL = 'PIN_PENDING_FITZ';

/**
 * Slot-name → recomputer registry (numeric lane). Every pinned numeric slot
 * across F1/F2/F3/F4b dispatches to a registered recomputer that re-derives the
 * value INDEPENDENTLY from the fixture source-of-truth JSON (spec §4-A1). Two
 * slot names share one engine where the fixtures pin the same field on
 * different fixtures (the §3 footing spellings; the marital-PV-best field on
 * F1 tier-3 vs F3 cash-balance; the coverture fraction on both pensions).
 */
export const SLOT_RECOMPUTERS = {
  // §3 inventory footing (both fixture spellings)
  s3InventoryTotalFooting: recomputeInventoryAssetFooting,
  s3InventoryTotalsFooting: recomputeInventoryAssetFooting,
  // §2 income + M1 budget gap (F2)
  s2NetIncomeDerivationFromPayStub: recomputeS2NetIncomeDerivationFromPayStub,
  budgetGapMonthlyFigure: recomputeBudgetGapMonthlyFigure,
  // F1 pension (tier-3 coverture / §417(e) PV)
  pensionPVAtBaseSegmentRate: recomputePensionPVAtBaseSegmentRate,
  covertureFractionPensionTranche: recomputeCovertureFraction,
  covertureMaritalSharePensionTranche: recomputeMaritalPVBest,
  // F3 pension (cash-balance passthrough; degenerate ±100bp)
  covertureFraction14Months: recomputeCovertureFraction,
  cashBalancePassThroughPV: recomputeMaritalPVBest,
  sensitivityLowMinus100bp: recomputeSensitivityMaritalLow,
  sensitivityHighPlus100bp: recomputeSensitivityMaritalHigh,
  // F1 deferred comp (per-tranche Hug/Nelson intrinsic value)
  hugTrancheValue: recomputeHugTrancheValue,
  nelsonTrancheValue: recomputeNelsonTrancheValue,
  // F1 home decision + F3 §121 partial
  hdaScenarioBNetProceedsAfter121: recomputeHdaScenarioBNetProceedsAfter121,
  s121PartialExclusionAmount: recomputeS121PartialExclusionAmount,
  // Support (F1 MD AAML / F3 DC Builta)
  mdAamlSupportFigure: recomputeMdAamlSupportFigure,
  builtaExtrapolatedFigure: recomputeBuiltaExtrapolatedFigure,
  // F1 filing-status delta
  fsoFilingStatusDelta: recomputeFsoFilingStatusDelta,
};

/**
 * Categorical lane: slotName → (fixture) => string. Audit truths that are
 * labels, not numbers (F4b readiness tier, F1 AAML duration band) live in the
 * fixture's `auditAssertions` block and compare strict === against the
 * engine/classifier-derived categorical.
 */
export const CATEGORICAL_RECOMPUTERS = {
  mdAamlDurationBand: recomputeMdAamlDurationBand,
  readinessTierBoundaryValue: recomputeReadinessTierBoundaryValue,
};

export function runA1(fixture) {
  const pins = fixture.auditPins || {};
  const assertions = fixture.auditAssertions || {};

  // Pending slots in EITHER lane refuse the run — numeric pins first, then
  // categorical assertions (consumers rely on this merge order).
  const unpinnedSlots = [...Object.entries(pins), ...Object.entries(assertions)]
    .filter(([, v]) => v === PIN_LITERAL)
    .map(([slot]) => slot);

  if (unpinnedSlots.length > 0) {
    return {
      fixtureId: fixture.fixtureId,
      status: 'refused',
      reason: `A1 refuses to run with unpinned audit slots: ${unpinnedSlots.join(', ')}`,
      unpinnedSlots,
    };
  }

  const numericResults = Object.entries(pins).map(([slot, pinnedValue]) => {
    const recompute = SLOT_RECOMPUTERS[slot];
    if (!recompute) return { slot, status: 'recompute_not_implemented_phase2', pinnedValue };
    const recomputed = recompute(fixture);
    return {
      slot,
      status: recomputed === pinnedValue ? 'match' : 'mismatch',
      recomputed,
      pinnedValue,
    };
  });

  const categoricalResults = Object.entries(assertions).map(([slot, pinnedValue]) => {
    const recompute = CATEGORICAL_RECOMPUTERS[slot];
    if (!recompute) return { slot, status: 'recompute_not_implemented_phase2', pinnedValue };
    const recomputed = recompute(fixture);
    return {
      slot,
      status: recomputed === pinnedValue ? 'match' : 'mismatch',
      recomputed,
      pinnedValue,
    };
  });

  return {
    fixtureId: fixture.fixtureId,
    status: 'executed',
    results: [...numericResults, ...categoricalResults],
  };
}
