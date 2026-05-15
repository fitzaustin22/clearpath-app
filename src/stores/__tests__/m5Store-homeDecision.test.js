/**
 * m5Store homeDecision slice tests (§9.3 / §9.10 / §14.1).
 *
 * Covers the HDA PR 2 Phase 1 setter extension to the `homeDecision` slice:
 *   - setHomeDecisionInputs
 *   - replaceHomeDecisionInputs
 *   - setHomeDecisionResults
 *   - setHomeDecisionMetadata
 *   - setHomeDecisionUserSelection
 *   - setHomeDecisionPrePopSources
 *   - clearHomeDecision
 *
 * Persistence is the existing `clearpath-m5` Zustand `persist` middleware (localStorage).
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { useM5Store } from '../m5Store.js';

beforeEach(() => {
  localStorage.clear();
  useM5Store.persist.rehydrate();
  // Reset homeDecision to a clean per-test slate via the store's own
  // clearHomeDecision() action — this tracks the real makeInitialHomeDecision()
  // shape so the test reset can never drift from the slice's locked §9.3 literal.
  useM5Store.getState().clearHomeDecision();
});

describe('m5Store homeDecision slice extension (§9.3 / §9.10 / §14.1)', () => {
  it('TC-M5HDA-Slice-1: initial state shape — defaults match §9.3 locked literals', () => {
    const hd = useM5Store.getState().homeDecision;
    expect(hd).toBeDefined();

    // Spot-check §9.3 locked defaults
    expect(hd.inputs.currentFMV).toBeNull();
    expect(hd.inputs.spouseEquityShare).toBe(0.5);
    expect(hd.inputs.interimCostSharePct).toBe(50);
    expect(hd.inputs.propertyAppreciationRateReal).toBe(0);
    expect(hd.inputs.monthlyHOA).toBe(0);
    expect(hd.inputs.userTotalMonthlyDebtPayments).toBe(0);
    // §9.3.1 fields the scaffold omitted — locked here so the pre-pop seam
    // (prePopulateHomeDecisionInputs emits startingLiquidCash) is explicit.
    expect(hd.inputs.startingLiquidCash).toBeNull();
    expect(hd.inputs.existingMortgageRemainingTermMonths).toBe(360);
    expect(hd.inputs.refiTerm).toBe('30-year');
    expect(hd.inputs.deferredSaleMortgageContinuity).toBe('refi-at-current');

    // Top-level sibling nulls
    expect(hd.results).toBeNull();
    expect(hd.metadata).toBeNull();
    expect(hd.userSelection).toBeNull();
    expect(hd._prePopSources).toBeNull();
  });

  it('TC-M5HDA-Slice-2: setHomeDecisionInputs merges without clobbering other input keys', () => {
    useM5Store.getState().setHomeDecisionInputs({ currentFMV: 700000 });

    const hd = useM5Store.getState().homeDecision;
    expect(hd.inputs.currentFMV).toBe(700000);
    // Other keys must survive
    expect(hd.inputs.spouseEquityShare).toBe(0.5);
    expect(hd.inputs.refiTerm).toBe('30-year');
    expect(hd.inputs.interimCostSharePct).toBe(50);
    // Top-level siblings untouched
    expect(hd.results).toBeNull();
    expect(hd.metadata).toBeNull();
    expect(hd.userSelection).toBeNull();
    expect(hd._prePopSources).toBeNull();
  });

  it('TC-M5HDA-Slice-3: replaceHomeDecisionInputs whole-replaces (other prior input keys gone)', () => {
    // First set some values
    useM5Store.getState().setHomeDecisionInputs({ currentFMV: 800000, spouseEquityShare: 0.6 });

    // Now whole-replace with a minimal object
    useM5Store.getState().replaceHomeDecisionInputs({ currentFMV: 1 });

    const hd = useM5Store.getState().homeDecision;
    expect(hd.inputs).toEqual({ currentFMV: 1 });
    expect(hd.inputs).not.toHaveProperty('spouseEquityShare');
    expect(hd.inputs).not.toHaveProperty('refiTerm');
    // Top-level siblings untouched
    expect(hd.results).toBeNull();
    expect(hd.metadata).toBeNull();
  });

  it('TC-M5HDA-Slice-4: setHomeDecisionResults sets results; inputs/metadata/userSelection/_prePopSources untouched', () => {
    useM5Store.getState().setHomeDecisionInputs({ currentFMV: 500000 });

    const results = {
      keepAndRefi: { monthlyPayment: 2800, netEquityAfterBuyout: 120000 },
      sellNow: { netProceeds: 310000 },
      deferredSale: { pvNetProceeds: 290000 },
    };
    useM5Store.getState().setHomeDecisionResults(results);

    const hd = useM5Store.getState().homeDecision;
    expect(hd.results).toEqual(results);
    expect(hd.inputs.currentFMV).toBe(500000);
    expect(hd.inputs.spouseEquityShare).toBe(0.5);
    expect(hd.metadata).toBeNull();
    expect(hd.userSelection).toBeNull();
    expect(hd._prePopSources).toBeNull();
  });

  it('TC-M5HDA-Slice-5: setHomeDecisionMetadata sets metadata; siblings untouched', () => {
    useM5Store.getState().setHomeDecisionInputs({ currentFMV: 600000 });
    useM5Store.getState().setHomeDecisionResults({ sellNow: { netProceeds: 200000 } });

    const metadata = {
      formulaId: 'hda_v1',
      calculatedAt: '2026-05-15T12:00:00.000Z',
      inputSnapshot: { currentFMV: 600000 },
    };
    useM5Store.getState().setHomeDecisionMetadata(metadata);

    const hd = useM5Store.getState().homeDecision;
    expect(hd.metadata).toEqual(metadata);
    expect(hd.inputs.currentFMV).toBe(600000);
    expect(hd.results).toEqual({ sellNow: { netProceeds: 200000 } });
    expect(hd.userSelection).toBeNull();
    expect(hd._prePopSources).toBeNull();
  });

  it('TC-M5HDA-Slice-6: setHomeDecisionUserSelection sets and clears; no other slice mutation', () => {
    useM5Store.getState().setHomeDecisionInputs({ currentFMV: 400000 });

    useM5Store.getState().setHomeDecisionUserSelection('keepAndRefi');
    let hd = useM5Store.getState().homeDecision;
    expect(hd.userSelection).toBe('keepAndRefi');
    // Siblings untouched
    expect(hd.inputs.currentFMV).toBe(400000);
    expect(hd.results).toBeNull();
    expect(hd.metadata).toBeNull();
    expect(hd._prePopSources).toBeNull();

    // Clear it
    useM5Store.getState().setHomeDecisionUserSelection(null);
    hd = useM5Store.getState().homeDecision;
    expect(hd.userSelection).toBeNull();
    // Still no blueprint coupling — only state
    expect(hd.inputs.currentFMV).toBe(400000);
  });

  it('TC-M5HDA-Slice-7: setHomeDecisionPrePopSources writes sibling without disturbing inputs/results', () => {
    useM5Store.getState().setHomeDecisionInputs({ currentFMV: 750000 });
    useM5Store.getState().setHomeDecisionResults({ keepAndRefi: { monthlyPayment: 3100 } });

    const sources = {
      currentFMV: { source: 'm2.realPropertyAsset', timestamp: '2026-05-15T00:00:00.000Z' },
      existingMortgageBalance: { source: 'm2.realPropertyAsset', timestamp: '2026-05-15T00:00:00.000Z' },
    };
    useM5Store.getState().setHomeDecisionPrePopSources(sources);

    const hd = useM5Store.getState().homeDecision;
    expect(hd._prePopSources).toEqual(sources);
    expect(hd.inputs.currentFMV).toBe(750000);
    expect(hd.results).toEqual({ keepAndRefi: { monthlyPayment: 3100 } });
  });

  it('TC-M5HDA-Slice-8: clearHomeDecision resets slice fully to initial after several mutations', () => {
    useM5Store.getState().setHomeDecisionInputs({ currentFMV: 900000, spouseEquityShare: 0.4 });
    useM5Store.getState().setHomeDecisionResults({ sellNow: { netProceeds: 400000 } });
    useM5Store.getState().setHomeDecisionMetadata({ formulaId: 'hda_v1' });
    useM5Store.getState().setHomeDecisionUserSelection('sellNow');
    useM5Store.getState().setHomeDecisionPrePopSources({ currentFMV: { source: 'm2' } });

    useM5Store.getState().clearHomeDecision();

    const hd = useM5Store.getState().homeDecision;
    expect(hd.inputs.currentFMV).toBeNull();
    expect(hd.inputs.spouseEquityShare).toBe(0.5);
    expect(hd.inputs.refiTerm).toBe('30-year');
    expect(hd.inputs.interimCostSharePct).toBe(50);
    expect(hd.results).toBeNull();
    expect(hd.metadata).toBeNull();
    expect(hd.userSelection).toBeNull();
    expect(hd._prePopSources).toBeNull();
  });

  it('TC-M5HDA-Slice-9: persists across `clearpath-m5` localStorage round-trip', () => {
    useM5Store.getState().setHomeDecisionInputs({ currentFMV: 550000, refiTerm: '15-year' });
    useM5Store.getState().setHomeDecisionUserSelection('deferredSale');

    const raw = localStorage.getItem('clearpath-m5');
    expect(raw).not.toBeNull();
    const parsed = JSON.parse(raw);
    expect(parsed?.state?.homeDecision?.inputs?.currentFMV).toBe(550000);
    expect(parsed?.state?.homeDecision?.inputs?.refiTerm).toBe('15-year');
    expect(parsed?.state?.homeDecision?.userSelection).toBe('deferredSale');
  });
});
