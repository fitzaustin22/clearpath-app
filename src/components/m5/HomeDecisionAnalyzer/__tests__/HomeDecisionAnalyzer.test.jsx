/**
 * HomeDecisionAnalyzer orchestrator integration test (Phase 3.1) — the
 * critical PR 3 safety net. Exercises the full cross-store dance:
 *
 *   seed m1/m2/m3/blueprint ─▶ mount ─▶ pre-pop merged into m5Store.inputs
 *   ─▶ one-shot sentinel holds ─▶ calc ─▶ Save ─▶ blueprintStore §9
 *
 * Also pins the Fitz resolutions at their boundaries:
 *   #1 blueprint write only on Save (not auto-on-calc)
 *   #2 scenarios object → ordered array at the §10.6 boundary
 *   #3 metadata._prePopSources keeps prePopulate's {source,timestamp} shape
 *   #4 interimCostSharePct converted ×0.01 (store 50 → lib/metadata 0.5)
 *   #5 one-shot pre-pop gated on _prePopSources == null
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, act, waitFor } from '@testing-library/react';
import { useM1Store } from '@/src/stores/m1Store';
import { useM2Store } from '@/src/stores/m2Store';
import { useM3Store } from '@/src/stores/m3Store';
import { useM5Store } from '@/src/stores/m5Store';
import useBlueprintStore from '@/src/stores/blueprintStore';
import { m5NormalizeProgress } from '@/src/components/m5/m5Landing.adapter.js';
import HomeDecisionAnalyzer from '../HomeDecisionAnalyzer.jsx';

afterEach(() => {
  // Reset viewport to jsdom default so mobile-width mutations from new tests
  // do not leak into subsequent tests (test-order safety).
  window.innerWidth = 1024;
  window.dispatchEvent(new Event('resize'));
});

beforeEach(() => {
  localStorage.clear();
  useM1Store.persist?.rehydrate?.();
  useM2Store.persist?.rehydrate?.();
  useM3Store.persist?.rehydrate?.();
  useM5Store.persist.rehydrate();
  useBlueprintStore.persist.rehydrate();
  // Clean per-test slate via the stores' own reset actions.
  useM5Store.getState().clearHomeDecision();
  useBlueprintStore.getState().resetBlueprint();
  useM1Store.setState({ budgetGap: { results: null } });
  useM2Store.setState({ maritalEstateInventory: { items: [] } });
  useM3Store.setState({ budgetModeler: null });
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

// Fill the non-pre-popped inputs a user would complete so calc is finite.
function completeUserInputs() {
  act(() => {
    useM5Store.getState().setHomeDecisionInputs({
      currentFMV: 600000,
      refiRate: 6.5,
      refiClosingCostsPercent: 0.03,
      userCreditScoreBand: 'good',
      homeAcquisitionYear: 2015,
      occupancyYears: 7,
    });
  });
}

describe('HomeDecisionAnalyzer orchestrator integration', () => {
  it('pre-pops m5Store.homeDecision.inputs from m1/m2/m3/blueprint on mount', async () => {
    seedUpstream();
    render(<HomeDecisionAnalyzer />);

    await waitFor(() => {
      expect(useM5Store.getState().homeDecision._prePopSources).not.toBeNull();
    });

    const hd = useM5Store.getState().homeDecision.inputs;
    expect(hd.userPostDivorceGrossMonthlyIncome).toBe(9000); // m1.budgetGap
    expect(hd.existingMortgageBalance).toBe(320000); // m2 realEstate
    expect(hd.startingLiquidCash).toBe(45000); // m2 workingCapital sum
    expect(hd.monthlyPropertyTax).toBe(650); // m3 budgetModeler.projected
    expect(hd.monthlyInsurance).toBe(180); // m3 insurance.home
    expect(hd.expectedFilingStatusAtSellNow).toBe('mfj'); // blueprint costBasisFilingStatus
    // makeInitialHomeDecision defaults preserved (partial-merge, not replace).
    // spouseEquityShare/interimCostSharePct are NOT prePopulate-sourced fields
    // (HDA correctness fix PR1: they seed null, not a real number, so the
    // store stays null here — the calc boundary restores 0.5/50% only for
    // the engine, once currentFMV makes the scenario genuine).
    expect(hd.spouseEquityShare).toBeNull();
    expect(hd.refiTerm).toBe('30-year');
    expect(hd.interimCostSharePct).toBeNull();
  });

  it('_prePopSources keeps prePopulate {source,timestamp} shape (resolution #3)', async () => {
    seedUpstream();
    render(<HomeDecisionAnalyzer />);
    await waitFor(() => {
      expect(useM5Store.getState().homeDecision._prePopSources).not.toBeNull();
    });
    const src = useM5Store.getState().homeDecision._prePopSources;
    expect(src.userPostDivorceGrossMonthlyIncome).toMatchObject({
      source: 'm1.budgetGap',
    });
    expect(typeof src.userPostDivorceGrossMonthlyIncome.timestamp).toBe('string');
    // not the §14.1 {module,tool,timestamp} shape — precedent preserved
    expect(src.userPostDivorceGrossMonthlyIncome.module).toBeUndefined();
  });

  it('one-shot: an upstream change after pre-pop does NOT re-seed (sentinel, resolution #5)', async () => {
    seedUpstream();
    render(<HomeDecisionAnalyzer />);
    await waitFor(() => {
      expect(useM5Store.getState().homeDecision._prePopSources).not.toBeNull();
    });
    // User edits the pre-popped value, then upstream m1 changes.
    act(() => {
      useM5Store.getState().setHomeDecisionInputs({ userPostDivorceGrossMonthlyIncome: 7777 });
      useM1Store.setState({ budgetGap: { results: { adjustedMonthlyIncome: 12000 } } });
    });
    await new Promise((r) => setTimeout(r, 0));
    // Sentinel blocks re-seed — the user's edit survives.
    expect(useM5Store.getState().homeDecision.inputs.userPostDivorceGrossMonthlyIncome).toBe(7777);
  });

  it('does not write Blueprint §9 until Save is clicked (resolution #1)', async () => {
    seedUpstream();
    render(<HomeDecisionAnalyzer />);
    await waitFor(() => {
      expect(useM5Store.getState().homeDecision._prePopSources).not.toBeNull();
    });
    completeUserInputs();
    await waitFor(() => {
      expect(useM5Store.getState().homeDecision.results).not.toBeNull();
    });
    // Calc ran + persisted to m5Store, but Blueprint §9 is still empty.
    expect(useBlueprintStore.getState().sections.s9.status).toBe('empty');

    fireEvent.click(screen.getByTestId('hda-save-button'));
    expect(useBlueprintStore.getState().sections.s9.status).not.toBe('empty');
  });

  it('Save without a selection writes §9 partial; scenarios is an ordered 3-array (resolutions #1/#2)', async () => {
    seedUpstream();
    render(<HomeDecisionAnalyzer />);
    await waitFor(() =>
      expect(useM5Store.getState().homeDecision._prePopSources).not.toBeNull(),
    );
    completeUserInputs();
    await waitFor(() =>
      expect(useM5Store.getState().homeDecision.results).not.toBeNull(),
    );

    fireEvent.click(screen.getByTestId('hda-save-button'));

    const s9 = useBlueprintStore.getState().sections.s9;
    expect(s9.status).toBe('partial');
    expect(s9.sourceModule).toBe('m5');
    expect(Array.isArray(s9.data.scenarios)).toBe(true);
    expect(s9.data.scenarios).toHaveLength(3);
    // ordered [keepAndRefi, sellNow, deferredSale] — only keepAndRefi carries
    // a refiQualification, so position 0 is identifiable.
    expect(s9.data.scenarios[0].refiQualification).not.toBeNull();
    expect(s9.data.scenarios[1].refiQualification).toBeNull();
    expect(s9.data.scenarios[2].refiQualification).toBeNull();
    expect(s9.data.userSelection).toBeNull();
    expect(s9.data.selectionTimestamp).toBeNull();
  });

  it('selecting a scenario then Save writes §9 complete with timestamp', async () => {
    seedUpstream();
    render(<HomeDecisionAnalyzer />);
    await waitFor(() =>
      expect(useM5Store.getState().homeDecision._prePopSources).not.toBeNull(),
    );
    completeUserInputs();
    await waitFor(() =>
      expect(useM5Store.getState().homeDecision.results).not.toBeNull(),
    );

    fireEvent.click(screen.getByTestId('hda-col-sellNow')); // select
    fireEvent.click(screen.getByTestId('hda-save-button'));

    const s9 = useBlueprintStore.getState().sections.s9;
    expect(s9.status).toBe('complete');
    expect(s9.data.userSelection).toBe('sellNow');
    expect(typeof s9.data.selectionTimestamp).toBe('string');
    expect(Number.isNaN(Date.parse(s9.data.selectionTimestamp))).toBe(false);
    // save confirmation surfaces in the UI
    expect(screen.getByTestId('hda-save-confirmation')).toHaveTextContent(/selection recorded/i);
  });

  it('interimCostSharePct is converted ×0.01 at the calc/metadata boundary (resolution #4)', async () => {
    seedUpstream();
    render(<HomeDecisionAnalyzer />);
    await waitFor(() =>
      expect(useM5Store.getState().homeDecision._prePopSources).not.toBeNull(),
    );
    completeUserInputs();
    await waitFor(() =>
      expect(useM5Store.getState().homeDecision.metadata).not.toBeNull(),
    );
    // Store stays null — completeUserInputs() never touches this field, and
    // it no longer seeds a real percent by default (HDA correctness fix PR1).
    expect(useM5Store.getState().homeDecision.inputs.interimCostSharePct).toBeNull();
    // …but the metadata block still carries the lib fraction (calc-boundary
    // null-coalesce, unchanged behavior).
    expect(useM5Store.getState().homeDecision.metadata.interimCostSharePct).toBe(0.5);

    fireEvent.click(screen.getByTestId('hda-save-button'));
    expect(
      useBlueprintStore.getState().sections.s9.data.metadata.interimCostSharePct,
    ).toBe(0.5);
  });

  it('re-Save after changing the selection overwrites §9 (last-write-wins)', async () => {
    seedUpstream();
    render(<HomeDecisionAnalyzer />);
    await waitFor(() =>
      expect(useM5Store.getState().homeDecision._prePopSources).not.toBeNull(),
    );
    completeUserInputs();
    await waitFor(() =>
      expect(useM5Store.getState().homeDecision.results).not.toBeNull(),
    );

    fireEvent.click(screen.getByTestId('hda-save-button')); // partial
    expect(useBlueprintStore.getState().sections.s9.status).toBe('partial');

    fireEvent.click(screen.getByTestId('hda-col-keepAndRefi'));
    fireEvent.click(screen.getByTestId('hda-save-button')); // complete
    const s9 = useBlueprintStore.getState().sections.s9;
    expect(s9.status).toBe('complete');
    expect(s9.data.userSelection).toBe('keepAndRefi');
  });
});

describe('responsive breakpoint switching', () => {
  it('desktop (default ≥1024): shows Comparator, hides mobile carousel', async () => {
    // jsdom default innerWidth is 1024 — desktop branch resolves to true.
    seedUpstream();
    completeUserInputs();
    render(<HomeDecisionAnalyzer />);
    await waitFor(() =>
      expect(useM5Store.getState().homeDecision.results).not.toBeNull(),
    );

    expect(screen.getByTestId('hda-comparator')).toBeTruthy();
    expect(screen.queryByTestId('hda-mobile-carousel')).toBeNull();
  });

  it('mobile (<1024): shows mobile summary/inputs/carousel, hides Comparator', async () => {
    window.innerWidth = 375;
    act(() => window.dispatchEvent(new Event('resize')));

    seedUpstream();
    completeUserInputs();
    render(<HomeDecisionAnalyzer />);
    // Trigger resize again after mount so the hook picks up the mobile width.
    act(() => window.dispatchEvent(new Event('resize')));

    await waitFor(() =>
      expect(useM5Store.getState().homeDecision.results).not.toBeNull(),
    );

    expect(screen.getByTestId('hda-mobile-summary')).toBeTruthy();
    expect(screen.getByTestId('hda-mobile-carousel')).toBeTruthy();
    expect(screen.getByTestId('hda-inputs')).toBeTruthy();
    expect(screen.queryByTestId('hda-comparator')).toBeNull();
  });

  it('resize desktop→mobile swaps render branch', async () => {
    // Start at desktop (jsdom default 1024).
    seedUpstream();
    completeUserInputs();
    render(<HomeDecisionAnalyzer />);
    await waitFor(() =>
      expect(useM5Store.getState().homeDecision.results).not.toBeNull(),
    );
    expect(screen.getByTestId('hda-comparator')).toBeTruthy();

    // Shrink to mobile — hook fires resize listener.
    act(() => {
      window.innerWidth = 375;
      window.dispatchEvent(new Event('resize'));
    });

    await waitFor(() => expect(screen.queryByTestId('hda-comparator')).toBeNull());
    expect(screen.getByTestId('hda-mobile-carousel')).toBeTruthy();
  });
});

// HDA correctness fix PR1 — hasGenuineHomeData gating. These pin the four
// click-through checklist behaviors at the automated-test layer (this does
// NOT substitute for the mandatory human/Cowork browser click-through — it
// only proves the mechanism the click-through will exercise).
describe('HDA correctness fix PR1 — hasGenuineHomeData gating', () => {
  it('a completely blank form computes nothing: no results/metadata persisted, grid placeholder shown, no verdict badge, Save is a no-op', async () => {
    render(<HomeDecisionAnalyzer />);

    // Give any stray effect a tick, then assert the non-genuine steady state.
    await new Promise((r) => setTimeout(r, 0));
    expect(useM5Store.getState().homeDecision.results).toBeNull();
    expect(useM5Store.getState().homeDecision.metadata).toBeNull();

    expect(screen.getByTestId('hda-grid-placeholder')).toBeInTheDocument();
    expect(screen.queryByTestId('hda-col-keepAndRefi')).not.toBeInTheDocument();
    expect(screen.queryByTestId('hda-shortfall-banner')).not.toBeInTheDocument();

    fireEvent.click(screen.getByTestId('hda-save-button'));
    expect(useBlueprintStore.getState().sections.s9.status).toBe('empty');
  });

  it('the module-landing progress pill stays not_started on a blank HDA visit (was: complete on mere presence)', async () => {
    render(<HomeDecisionAnalyzer />);
    await new Promise((r) => setTimeout(r, 0));

    const homeDecision = useM5Store.getState().homeDecision;
    const entries = m5NormalizeProgress({ homeDecision });
    const hdaEntry = entries.find((e) => e.id === 'homeDecision');
    expect(hdaEntry).toEqual({ id: 'homeDecision', status: 'not_started', pct: 0 });
  });

  it('currentFMV alone is NOT enough (addendum): the gate also requires a finite existingMortgageBalance and refiRate', async () => {
    render(<HomeDecisionAnalyzer />);
    // currentFMV only — still non-genuine after the addendum (balance + refiRate
    // blank), because a blank balance would coerce to $0 (home looks paid off)
    // and a blank refiRate to 0% interest. Grid holds the empty state.
    act(() => {
      useM5Store.getState().setHomeDecisionInputs({ currentFMV: 500000 });
    });
    await new Promise((r) => setTimeout(r, 0));
    expect(useM5Store.getState().homeDecision.results).toBeNull();
    expect(screen.getByTestId('hda-grid-placeholder')).toBeInTheDocument();

    // Add a real balance — still not enough (refiRate still blank).
    act(() => {
      useM5Store.getState().setHomeDecisionInputs({ existingMortgageBalance: 300000 });
    });
    await new Promise((r) => setTimeout(r, 0));
    expect(useM5Store.getState().homeDecision.results).toBeNull();
    expect(screen.getByTestId('hda-grid-placeholder')).toBeInTheDocument();

    // Add refiRate (decimal fraction) — now all three present → genuine.
    act(() => {
      useM5Store.getState().setHomeDecisionInputs({ refiRate: 0.065 });
    });
    await waitFor(() =>
      expect(useM5Store.getState().homeDecision.results).not.toBeNull(),
    );
    expect(screen.queryByTestId('hda-grid-placeholder')).not.toBeInTheDocument();
    expect(screen.getByTestId('hda-projection-grid')).toBeInTheDocument();
  });

  it('an explicit existingMortgageBalance of 0 (paid-off home) is genuine, not gated', async () => {
    render(<HomeDecisionAnalyzer />);
    act(() => {
      useM5Store.getState().setHomeDecisionInputs({
        currentFMV: 500000,
        existingMortgageBalance: 0, // explicitly free-and-clear
        refiRate: 0.065,
      });
    });
    await waitFor(() =>
      expect(useM5Store.getState().homeDecision.results).not.toBeNull(),
    );
    expect(screen.getByTestId('hda-projection-grid')).toBeInTheDocument();
    // Paid-off home: sell-now net equity is the full gross proceeds (no debt).
    expect(
      useM5Store.getState().homeDecision.results.sellNow.metadata.netEquity,
    ).toBe(500000 * (1 - 0.05 - 0.02));
  });

  it('an explicit monthlyHOA of 0 does not block or alter a genuine scenario', async () => {
    seedUpstream();
    render(<HomeDecisionAnalyzer />);
    await waitFor(() =>
      expect(useM5Store.getState().homeDecision._prePopSources).not.toBeNull(),
    );
    completeUserInputs();
    act(() => {
      useM5Store.getState().setHomeDecisionInputs({ monthlyHOA: 0 });
    });
    await waitFor(() =>
      expect(useM5Store.getState().homeDecision.results).not.toBeNull(),
    );
    expect(useM5Store.getState().homeDecision.inputs.monthlyHOA).toBe(0);
    expect(screen.getByTestId('hda-projection-grid')).toBeInTheDocument();
  });

  it('un-filling currentFMV after a genuine calc clears results/metadata back to null (stale-results invalidation)', async () => {
    seedUpstream();
    render(<HomeDecisionAnalyzer />);
    await waitFor(() =>
      expect(useM5Store.getState().homeDecision._prePopSources).not.toBeNull(),
    );
    completeUserInputs();
    await waitFor(() =>
      expect(useM5Store.getState().homeDecision.results).not.toBeNull(),
    );

    act(() => {
      useM5Store.getState().setHomeDecisionInputs({ currentFMV: null });
    });

    await waitFor(() =>
      expect(useM5Store.getState().homeDecision.results).toBeNull(),
    );
    expect(useM5Store.getState().homeDecision.metadata).toBeNull();
    expect(screen.getByTestId('hda-grid-placeholder')).toBeInTheDocument();

    const homeDecision = useM5Store.getState().homeDecision;
    const entries = m5NormalizeProgress({ homeDecision });
    expect(entries.find((e) => e.id === 'homeDecision').status).toBe('not_started');
  });

  it('fill → Save (writes real data) → edit an input while staying genuine does NOT auto-rewrite Blueprint (still Save-gated)', async () => {
    seedUpstream();
    render(<HomeDecisionAnalyzer />);
    await waitFor(() =>
      expect(useM5Store.getState().homeDecision._prePopSources).not.toBeNull(),
    );
    completeUserInputs();
    await waitFor(() =>
      expect(useM5Store.getState().homeDecision.results).not.toBeNull(),
    );
    fireEvent.click(screen.getByTestId('hda-save-button'));
    const savedProceeds =
      useBlueprintStore.getState().sections.s9.data.scenarios[1].metadata.saleProceedsNet;

    act(() => {
      useM5Store.getState().setHomeDecisionInputs({ currentFMV: 750000 });
    });
    // Live m5Store recomputes reactively (higher FMV -> higher sale proceeds).
    await waitFor(() => {
      expect(
        useM5Store.getState().homeDecision.results.sellNow.metadata.saleProceedsNet,
      ).not.toBe(savedProceeds);
    });
    // Blueprint §9 is untouched until the next explicit Save click — still
    // exactly the pre-edit value.
    expect(
      useBlueprintStore.getState().sections.s9.data.scenarios[1].metadata.saleProceedsNet,
    ).toBe(savedProceeds);
  });
});
