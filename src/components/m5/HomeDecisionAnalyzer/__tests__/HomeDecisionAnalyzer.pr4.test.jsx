/**
 * HomeDecisionAnalyzer orchestrator integration test (Phase 3 / PR 4).
 *
 * Covers:
 *   §9.2.1  Shortfall banner — real pipeline trigger + control
 *   §9.8.5  Underwater-prefix flow — real lib short-circuit
 *   §9.6.3  TC-HDA-6 — RefiRateInput opt-in through the orchestrator
 *   §9.8.2  TC-HDA-9 — mobile breakpoint + no-scroll smoke
 *
 * Distinguished from HomeDecisionAnalyzer.test.jsx (PR-3 safety-net):
 * that file exercises cross-store/save/prePopulate invariants using
 * fixture-assisted completeUserInputs(); this file drives the REAL
 * calculateHomeDecision lib and verifies the verdicts it produces are
 * genuine (not asserted against a fixture). Do NOT modify the PR-3 file.
 *
 * Deterministic trigger verification (from reading the real lib):
 *   - Shortfall: userCreditScoreBand:'poor' → applyModifiers forces
 *     verdictTier:'red'; with FMV > mortgage isUnderwater=false →
 *     bindingConstraint='credit' → shortfall=true.
 *   - Underwater: currentFMV < existingMortgageBalance →
 *     evaluateRefiVerdict short-circuits: verdictTier:'red',
 *     bindingConstraint:'underwater' → shortfall=false (excluded per §9.2.1 Fitz Q1).
 *   - Control: userCreditScoreBand:'excellent' + generous income (low DTI) →
 *     evaluateDtiMatrix returns green, applyModifiers keeps green →
 *     shortfall=false.
 *   - RefiRateInput opt-in: REFI_RATE_BY_CREDIT_BAND.good = 0.065,
 *     provenance = 'banded-default-good'; handleInputChange dual-writes
 *     refiRate + refiRateProvenance via setHomeDecisionInputs.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, act, waitFor } from '@testing-library/react';
import { useM1Store } from '@/src/stores/m1Store';
import { useM2Store } from '@/src/stores/m2Store';
import { useM3Store } from '@/src/stores/m3Store';
import { useM5Store } from '@/src/stores/m5Store';
import useBlueprintStore from '@/src/stores/blueprintStore';
import HomeDecisionAnalyzer from '../HomeDecisionAnalyzer.jsx';

// ── Viewport safety (test-order isolation) ────────────────────────────────
afterEach(() => {
  window.innerWidth = 1024;
  window.dispatchEvent(new Event('resize'));
});

// ── Store hygiene (mirror PR-3 setup exactly) ─────────────────────────────
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
});

// ── Upstream seed (mirrors PR-3 seedUpstream) ─────────────────────────────
// existingMortgageBalance comes from m2 items[0].outstandingBalance = 320000.
// FMV will be supplied per-test via setHomeDecisionInputs so each test
// can choose underwater vs. solvent independently.
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

/**
 * Baseline inputs for a solvent home (FMV 600 000 > mortgage 320 000).
 * refiRate, refiClosingCostsPercent, occupancyYears, homeAcquisitionYear
 * are all set so the deferred-sale and keep-and-refi engines are finite.
 *
 * After seedUpstream() the store already has:
 *   existingMortgageBalance = 320 000 (pre-popped from m2)
 *   userPostDivorceGrossMonthlyIncome = 9 000 (pre-popped from m1)
 *   startingLiquidCash = 45 000 (pre-popped from m2)
 *   monthlyPropertyTax = 650, monthlyInsurance = 180 (pre-popped from m3)
 *
 * This helper supplies the remainder needed for all three scenario engines.
 * The creditBand param lets individual tests pick the verdict tier.
 */
function completeUserInputs({ userCreditScoreBand = 'good' } = {}) {
  act(() => {
    useM5Store.getState().setHomeDecisionInputs({
      currentFMV: 600000,
      refiRate: 0.065,
      refiClosingCostsPercent: 0.03,
      userCreditScoreBand,
      homeAcquisitionYear: 2015,
      occupancyYears: 7,
      // Keep other monthly debts zero so back-end DTI = front-end DTI (simpler).
      userTotalMonthlyDebtPayments: 0,
    });
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// Group 1: Shortfall flow (real pipeline → desktop banner)
// ─────────────────────────────────────────────────────────────────────────────

describe('Group 1: shortfall flow — real pipeline to desktop banner', () => {
  it('poor credit + solvent home → shortfall=true, banner present', async () => {
    seedUpstream();
    // Pre-pop fires on mount; afterwards we layer in user inputs.
    render(<HomeDecisionAnalyzer />);
    await waitFor(() =>
      expect(useM5Store.getState().homeDecision._prePopSources).not.toBeNull(),
    );

    // Seed: poor credit + FMV > mortgage (NOT underwater).
    // Trigger recipe: applyModifiers('good'+'dti-green', {credit:'poor'}) → 'red'
    // bindingConstraint → 'credit' (not 'underwater') → shortfall = true.
    completeUserInputs({ userCreditScoreBand: 'poor' });

    await waitFor(() =>
      expect(useM5Store.getState().homeDecision.results).not.toBeNull(),
    );

    // 1a. Verify the real lib produced the expected verdict.
    const results = useM5Store.getState().homeDecision.results;
    expect(results.keepAndRefi.feasibility.shortfall).toBe(true);
    expect(results.keepAndRefi.refiQualification.verdictTier).toBe('red');
    expect(results.keepAndRefi.refiQualification.bindingConstraint).not.toBe('underwater');

    // 1b. Banner present with spec-exact text.
    const banner = screen.getByTestId('hda-shortfall-banner');
    expect(banner).toHaveTextContent(
      /Cash-out refi cannot fund the full buyout — gap must come from other sources, discuss with your CDFA\./,
    );
  });

  it('excellent credit + generous income → shortfall=false, banner absent (control)', async () => {
    seedUpstream();
    render(<HomeDecisionAnalyzer />);
    await waitFor(() =>
      expect(useM5Store.getState().homeDecision._prePopSources).not.toBeNull(),
    );

    // Control: excellent credit + FMV 600 000 > mortgage 320 000.
    // DTI: housingPayment = P&I on ~460 800 loan @ 6.5% 30yr ≈ $2 914/mo
    //   + tax $650 + insurance $180 = ~$3 744 / income $9 000 ≈ 41.6% front-end.
    // Wait — 41.6% > 30% borderline. Need higher income or lower housing payment.
    // Use income $15 000 to guarantee green DTI for the control case.
    act(() => {
      useM5Store.getState().setHomeDecisionInputs({
        currentFMV: 600000,
        refiRate: 0.065,
        refiClosingCostsPercent: 0.03,
        userCreditScoreBand: 'excellent',
        homeAcquisitionYear: 2015,
        occupancyYears: 7,
        userTotalMonthlyDebtPayments: 0,
        // Override the pre-popped income with a value that pushes DTI well below 28%.
        userPostDivorceGrossMonthlyIncome: 15000,
      });
    });

    await waitFor(() =>
      expect(useM5Store.getState().homeDecision.results).not.toBeNull(),
    );

    const results = useM5Store.getState().homeDecision.results;
    // Verify the real lib did NOT produce red — control assertion.
    expect(results.keepAndRefi.refiQualification.verdictTier).not.toBe('red');
    expect(results.keepAndRefi.feasibility.shortfall).toBe(false);

    // Banner must be absent.
    expect(screen.queryByTestId('hda-shortfall-banner')).toBeNull();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Group 2: Underwater-prefix flow (real pipeline → Sell-now & Deferred narratives)
// ─────────────────────────────────────────────────────────────────────────────

describe('Group 2: underwater-prefix flow — real lib short-circuit', () => {
  it('FMV < mortgage → bindingConstraint=underwater, shortfall=false, underwater prefix on sell-now + deferred, NOT on keep-and-refi, no shortfall banner', async () => {
    seedUpstream();
    render(<HomeDecisionAnalyzer />);
    await waitFor(() =>
      expect(useM5Store.getState().homeDecision._prePopSources).not.toBeNull(),
    );

    // Underwater: currentFMV 300 000 < existingMortgageBalance 400 000.
    // Note: m2 pre-pop already set existingMortgageBalance=320 000. Override both
    // to make FMV explicitly less than the balance.
    act(() => {
      useM5Store.getState().setHomeDecisionInputs({
        currentFMV: 300000,
        existingMortgageBalance: 400000,
        refiRate: 0.065,
        refiClosingCostsPercent: 0.03,
        userCreditScoreBand: 'good',
        homeAcquisitionYear: 2015,
        occupancyYears: 7,
        userTotalMonthlyDebtPayments: 0,
      });
    });

    await waitFor(() =>
      expect(useM5Store.getState().homeDecision.results).not.toBeNull(),
    );

    // 2a. Real lib produced underwater verdict.
    const results = useM5Store.getState().homeDecision.results;
    expect(results.keepAndRefi.refiQualification.bindingConstraint).toBe('underwater');
    expect(results.keepAndRefi.refiQualification.verdictTier).toBe('red');
    // shortfall=false: underwater is excluded per §9.2.1 / Fitz Q1.
    expect(results.keepAndRefi.feasibility.shortfall).toBe(false);

    // 2b. Sell-now and Deferred-sale narratives carry the underwater-prefix.
    // Copy from HomeDecisionComparator.underwaterPrefixCopy:
    //   "Note: your home is currently underwater (FMV $300,000 < mortgage $400,000).
    //    This scenario's calculations remain meaningful and may be your primary path."
    const sellNowNarrative = screen.getByTestId('hda-narrative-sellNow');
    expect(sellNowNarrative).toHaveTextContent(
      /Note: your home is currently underwater \(FMV \$300,000 < mortgage \$400,000\)/,
    );
    expect(sellNowNarrative).toHaveTextContent(/may be your primary path/);

    const deferredNarrative = screen.getByTestId('hda-narrative-deferredSale');
    expect(deferredNarrative).toHaveTextContent(
      /Note: your home is currently underwater \(FMV \$300,000 < mortgage \$400,000\)/,
    );
    expect(deferredNarrative).toHaveTextContent(/may be your primary path/);

    // 2c. Keep & refi narrative does NOT get the underwater prefix (it has the
    //     dedicated binding-constraint mini-section instead).
    const keepNarrative = screen.getByTestId('hda-narrative-keepAndRefi');
    expect(keepNarrative).not.toHaveTextContent(/your home is currently underwater/);

    // 2d. Shortfall banner absent (underwater ≠ shortfall).
    expect(screen.queryByTestId('hda-shortfall-banner')).toBeNull();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Group 3: RefiRateInput TC-HDA-6 through the orchestrator (§9.6.3 / §5.7)
// ─────────────────────────────────────────────────────────────────────────────

describe('Group 3: RefiRateInput TC-HDA-6 — input-propagation through orchestrator', () => {
  it('opt-in click dual-writes refiRate+refiRateProvenance to m5Store; calc re-runs; force-input override writes user-quoted', async () => {
    seedUpstream();
    render(<HomeDecisionAnalyzer />);
    await waitFor(() =>
      expect(useM5Store.getState().homeDecision._prePopSources).not.toBeNull(),
    );

    // Baseline inputs — 'good' credit so the opt-in link renders.
    completeUserInputs({ userCreditScoreBand: 'good' });

    await waitFor(() =>
      expect(useM5Store.getState().homeDecision.results).not.toBeNull(),
    );

    // Expand the Keep & refi accordion to expose RefiRateInput.
    fireEvent.click(screen.getByTestId('hda-scenario-keepAndRefi-toggle'));

    // 3a. The refi-rate field and opt-in link are present.
    expect(screen.getByTestId('hda-input-refiRate')).toBeTruthy();
    expect(screen.getByTestId('hda-refiRate-optin')).toBeTruthy();

    // 3b. Click the opt-in → dual-writes refiRate:0.065 + provenance:'banded-default-good'
    //     (REFI_RATE_BY_CREDIT_BAND.good = 0.065, already in decimal fraction form).
    fireEvent.click(screen.getByTestId('hda-refiRate-optin'));

    expect(useM5Store.getState().homeDecision.inputs.refiRate).toBe(0.065);
    expect(useM5Store.getState().homeDecision.inputs.refiRateProvenance).toBe(
      'banded-default-good',
    );

    // 3c. Calc re-ran (results still populated) and metadata threaded provenance.
    await waitFor(() =>
      expect(useM5Store.getState().homeDecision.results).not.toBeNull(),
    );
    // buildMetadata writes: refiRateProvenance: inputs.refiRateProvenance
    // orchestrator then overlays _prePopSources onto the metadata block.
    expect(useM5Store.getState().homeDecision.metadata.refiRateProvenance).toBe(
      'banded-default-good',
    );

    // 3d. Force-input override: type a custom rate → provenance becomes 'user-quoted'.
    fireEvent.change(screen.getByTestId('hda-input-refiRate'), {
      target: { value: '0.0725' },
    });

    expect(useM5Store.getState().homeDecision.inputs.refiRate).toBe(0.0725);
    expect(useM5Store.getState().homeDecision.inputs.refiRateProvenance).toBe('user-quoted');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Group 4: Mobile breakpoint + TC-HDA-9 (real pipeline)
// ─────────────────────────────────────────────────────────────────────────────

describe('Group 4: mobile breakpoint + TC-HDA-9 no-scroll smoke', () => {
  it('desktop control (default 1024): shows Comparator, hides mobile carousel', async () => {
    // jsdom default innerWidth is 1024 — desktop branch expected.
    seedUpstream();
    completeUserInputs();
    render(<HomeDecisionAnalyzer />);
    await waitFor(() =>
      expect(useM5Store.getState().homeDecision.results).not.toBeNull(),
    );

    expect(screen.getByTestId('hda-comparator')).toBeTruthy();
    expect(screen.queryByTestId('hda-mobile-carousel')).toBeNull();
  });

  it('mobile (<1024): shows summary/carousel/inputs, hides Comparator; TC-HDA-9 no-scroll smoke', async () => {
    seedUpstream();
    completeUserInputs();

    const { container } = render(<HomeDecisionAnalyzer />);

    // Trigger mobile viewport AFTER mount (mirrors PR-3 breakpoint tests):
    act(() => {
      window.innerWidth = 375;
      window.dispatchEvent(new Event('resize'));
    });

    await waitFor(() =>
      expect(useM5Store.getState().homeDecision.results).not.toBeNull(),
    );

    // 4a. Mobile branch rendered.
    expect(screen.getByTestId('hda-mobile-summary')).toBeTruthy();
    expect(screen.getByTestId('hda-mobile-carousel')).toBeTruthy();
    expect(screen.queryByTestId('hda-comparator')).toBeNull();

    // 4b. TC-HDA-9 no-scroll smoke:
    //   The ONLY element whose inline style.overflowX is 'auto' or 'scroll'
    //   must be the one with data-testid="hda-carousel-track".
    //
    //   Walk ALL elements and collect those with overflowX set to auto/scroll.
    const allElements = Array.from(container.querySelectorAll('*'));
    const overflowEls = allElements.filter((el) => {
      const ox = el.style?.overflowX;
      return ox === 'auto' || ox === 'scroll';
    });

    // Exactly one element with overflowX auto/scroll …
    expect(overflowEls).toHaveLength(1);
    // … and it must be the carousel track.
    expect(overflowEls[0].dataset.testid).toBe('hda-carousel-track');

    // 4c. All carousel-table-* and hda-mobile-summary elements use tableLayout:'fixed'.
    //     This covers HomeDecisionMobileSummary (hda-mobile-summary table) and
    //     HomeDecisionScenarioCarousel (hda-carousel-table-* tables).
    const carouselTableEls = Array.from(
      container.querySelectorAll('[data-testid^="hda-carousel-table-"]'),
    );
    expect(carouselTableEls.length).toBeGreaterThan(0);
    carouselTableEls.forEach((el) => {
      expect(el.style.tableLayout).toBe('fixed');
    });

    // hda-mobile-summary targets the <table> element inside the wrapper div.
    const mobileSummaryTable = container.querySelector('[data-testid="hda-mobile-summary"]');
    expect(mobileSummaryTable).not.toBeNull();
    expect(mobileSummaryTable.style.tableLayout).toBe('fixed');
  });
});
