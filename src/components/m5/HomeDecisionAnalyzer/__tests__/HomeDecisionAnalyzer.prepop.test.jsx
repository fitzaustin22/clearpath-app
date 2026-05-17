/**
 * HomeDecisionAnalyzer pre-pop lockout regression (H1 hotfix).
 *
 * H1: the orchestrator wrote the `_prePopSources` sentinel UNCONDITIONALLY on
 * first mount (prePopulateHomeDecisionInputs always returns a non-null sources
 * object), even when no upstream data existed and `inputs` was `{}`. Combined
 * with the missing m5Store partialize, the sentinel persisted to localStorage
 * and every later mount's `_prePopSources != null` gate skipped pre-pop
 * forever — so filling M1/M2/M3 afterward never pre-popped HDA.
 *
 * The existing orchestrator suite always seeds real upstream BEFORE mount, so
 * it never exercised the empty-upstream path that shipped the bug. These tests
 * pin the fix from both ends:
 *   - empty upstream on mount → sentinel NOT written, inputs NOT seeded
 *   - upstream filled later in the same session → pre-pop fires (no lockout)
 *   - an already-affected localStorage blob self-heals (merge) so a real
 *     mount pre-pops normally — the exact cross-module smoke scenario
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { render, act, waitFor } from '@testing-library/react';
import { useM1Store } from '@/src/stores/m1Store';
import { useM2Store } from '@/src/stores/m2Store';
import { useM3Store } from '@/src/stores/m3Store';
import { useM5Store } from '@/src/stores/m5Store';
import useBlueprintStore from '@/src/stores/blueprintStore';
import HomeDecisionAnalyzer from '../HomeDecisionAnalyzer.jsx';

beforeEach(() => {
  localStorage.clear();
  useM1Store.persist?.rehydrate?.();
  useM2Store.persist?.rehydrate?.();
  useM3Store.persist?.rehydrate?.();
  useM5Store.persist.rehydrate();
  useBlueprintStore.persist.rehydrate();
  useM5Store.getState().clearHomeDecision();
  useBlueprintStore.getState().resetBlueprint();
  useM1Store.setState({ budgetGap: { results: null } });
  useM2Store.setState({ maritalEstateInventory: { items: [] } });
  useM3Store.setState({ budgetModeler: null });
  useBlueprintStore.setState({ costBasisFilingStatus: null, costBasisEntries: [] });
});

function seedUpstream() {
  useM1Store.setState({ budgetGap: { results: { adjustedMonthlyIncome: 9000 } } });
  useM2Store.setState({
    maritalEstateInventory: {
      items: [
        { id: 're1', category: 'realEstate', outstandingBalance: 320000, currentValue: 600000 },
        { id: 'wc1', category: 'workingCapital', currentValue: 45000 },
      ],
    },
  });
  useM3Store.setState({
    budgetModeler: {
      projected: { home: { propertyTaxes: 650, hoaFees: 0 }, insurance: { home: 180 } },
      current: {},
    },
  });
  useBlueprintStore.setState({
    costBasisFilingStatus: 'mfj',
    costBasisEntries: [{ isPrimaryResidence: true, costBasis: 250000 }],
  });
}

describe('HomeDecisionAnalyzer pre-pop lockout (H1)', () => {
  it('empty upstream on mount: sentinel NOT written and inputs NOT seeded', async () => {
    // No seedUpstream() — every upstream store is empty (beforeEach state).
    render(<HomeDecisionAnalyzer />);

    // Give the one-shot effect a tick to (not) run.
    await act(async () => {
      await new Promise((r) => setTimeout(r, 0));
    });

    const hd = useM5Store.getState().homeDecision;
    // Pre-fix: this was a non-null all-null sources object → permanent lockout.
    expect(hd._prePopSources).toBeNull();
    // Inputs untouched — still the makeInitialHomeDecision defaults.
    expect(hd.inputs.userPostDivorceGrossMonthlyIncome).toBeNull();
    expect(hd.inputs.existingMortgageBalance).toBeNull();
    expect(hd.inputs.startingLiquidCash).toBeNull();
  });

  it('upstream filled AFTER an empty mount: pre-pop fires (no lockout)', async () => {
    const { rerender } = render(<HomeDecisionAnalyzer />);
    await act(async () => {
      await new Promise((r) => setTimeout(r, 0));
    });
    // Confirm the lockout precondition is NOT set.
    expect(useM5Store.getState().homeDecision._prePopSources).toBeNull();

    // User goes back and completes M1/M2/M3, then returns to HDA.
    act(() => seedUpstream());
    rerender(<HomeDecisionAnalyzer />);

    await waitFor(() => {
      expect(useM5Store.getState().homeDecision._prePopSources).not.toBeNull();
    });
    const hd = useM5Store.getState().homeDecision.inputs;
    expect(hd.userPostDivorceGrossMonthlyIncome).toBe(9000);
    expect(hd.existingMortgageBalance).toBe(320000);
    expect(hd.startingLiquidCash).toBe(45000);
  });

  it('real upstream on mount still pre-pops (happy path unregressed)', async () => {
    seedUpstream();
    render(<HomeDecisionAnalyzer />);

    await waitFor(() => {
      expect(useM5Store.getState().homeDecision._prePopSources).not.toBeNull();
    });
    expect(useM5Store.getState().homeDecision.inputs.existingMortgageBalance).toBe(320000);
  });

  it('end-to-end: an already-affected localStorage blob self-heals and a real mount pre-pops', async () => {
    // Reproduce the cross-module smoke state: localStorage written by the OLD
    // config with the lockout sentinel baked in (inputs were init defaults
    // because nothing upstream was sourced at the time).
    const affected = {
      state: {
        homeDecision: {
          inputs: { currentFMV: null },
          results: null,
          metadata: null,
          userSelection: null,
          _prePopSources: { existingMortgageBalance: null, startingLiquidCash: null },
        },
        supportEstimator: { inputs: {}, results: null },
        pensionValuation: { assets: {} },
        qdroDecision: { assets: {} },
      },
      version: 0,
    };
    localStorage.setItem('clearpath-m5', JSON.stringify(affected));
    useM5Store.persist.rehydrate();
    // merge healed the sentinel even before any mount.
    expect(useM5Store.getState().homeDecision._prePopSources).toBeNull();

    // Now the user has completed upstream and opens HDA.
    seedUpstream();
    render(<HomeDecisionAnalyzer />);

    await waitFor(() => {
      expect(useM5Store.getState().homeDecision._prePopSources).not.toBeNull();
    });
    expect(useM5Store.getState().homeDecision.inputs.startingLiquidCash).toBe(45000);
  });
});
