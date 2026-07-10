import { describe, it, expect, beforeEach } from 'vitest';
import { useM5Store } from './m5Store.js';

beforeEach(() => {
  // Clear any persisted state from prior tests/files.
  localStorage.clear();
  useM5Store.persist.rehydrate();
});

describe('m5Store initial-state shapes (§13 step 2 conformance)', () => {
  it('supportEstimator.inputs matches the §6.5.1 locked-literal defaults', () => {
    const partyDefaults = {
      grossMonthly: null,
      imputeIncome: false,
      imputedEarningCapacity: null,
      healthInsurance: 0,
      childcare: 0,
      parentingTimeNights: 0,
      otherSupportObligations: 0,
    };
    expect(useM5Store.getState().supportEstimator.inputs).toEqual({
      partyA: partyDefaults,
      partyB: partyDefaults,
      numChildren: 0,
      state: 'OTHER',
      marriageLengthYears: null,
      nyCustodyConfig: null,
      temporal: 'post_divorce',
      depth: 'standard',
      caseEffectiveDate: null,
      fullWorksheet: null,
    });
  });

  it('supportEstimator.results === null initially', () => {
    expect(useM5Store.getState().supportEstimator.results).toBeNull();
  });

  it('supportEstimator._prePopSources === null initially', () => {
    expect(useM5Store.getState().supportEstimator._prePopSources).toBeNull();
  });

  it('pensionValuation.assets equals {} (§7.6.4 slice)', () => {
    expect(useM5Store.getState().pensionValuation.assets).toEqual({});
  });

  it('qdroDecision.assets equals {} (rename from qdroModeler verified)', () => {
    expect(useM5Store.getState().qdroDecision.assets).toEqual({});
  });

  it('no qdroModeler property exists anywhere in the store state', () => {
    const state = useM5Store.getState();
    expect(state).not.toHaveProperty('qdroModeler');
  });

  it('homeDecision.inputs hydrated with §9.3 input model defaults (not §14 metadata schema)', () => {
    const inputs = useM5Store.getState().homeDecision.inputs;
    // §9.3.1 shared inputs — blank-≠-default discipline (HDA correctness fix
    // PR1): these seed null now, not a real number, so an untouched field
    // can't be mistaken for a user-confirmed value. The engine still sees
    // the same sensible defaults, restored at the calc boundary in
    // HomeDecisionAnalyzer.jsx once a scenario is genuine.
    expect(inputs.monthlyHOA).toBeNull();
    expect(inputs.userTotalMonthlyDebtPayments).toBeNull();
    expect(inputs.propertyAppreciationRateReal).toBeNull();
    expect(inputs.spouseEquityShare).toBeNull();
    // §9.3.2 keep-refi
    expect(inputs.refiTerm).toBe('30-year');
    // §9.3.2 sell-now
    expect(inputs.realtorCommissionPercent).toBeNull();
    expect(inputs.saleClosingCostsPercent).toBeNull();
    expect(inputs.userMovedOutYearsAgo).toBeNull();
    // §9.3.2 deferred-sale
    expect(inputs.interimCostSharePct).toBeNull();
    expect(inputs.stressTestUserPays100Pct).toBe(false);
    expect(inputs.deferredSaleMortgageContinuity).toBe('refi-at-current');
    // Sentinel: shape does NOT use the §14 post-calc metadata fields.
    expect(inputs).not.toHaveProperty('verdictTier');
    expect(inputs).not.toHaveProperty('bindingConstraint');
  });

  it('homeDecision.metadata === null initially', () => {
    expect(useM5Store.getState().homeDecision.metadata).toBeNull();
  });

  it('homeDecision.userSelection === null initially', () => {
    expect(useM5Store.getState().homeDecision.userSelection).toBeNull();
  });
});
