/**
 * ═══════════════════════════════════════════════════════════════════════════
 * CORRECTNESS TEST — asserts CORRECTED behavior (predicate expansion, addendum).
 *
 * History: this file began as a characterization test that deliberately encoded
 * the WRONG numbers (the mortgage-balance coercion bug that survived PR1's
 * `currentFMV > 0`-only predicate — blank balance → $558k equity vs $158k at a
 * real $400k balance, all persisted to Blueprint §9). The addendum expanded
 * `hasGenuineHomeData` to also require a finite `existingMortgageBalance` and
 * `refiRate`, so a blank one now makes the scenario non-genuine → `calc` null →
 * nothing computes, renders, or persists. The assertions below were FLIPPED
 * from "asserts the bug" to "asserts the fix"; the git history reads proof → fix.
 *
 * Deliberate asymmetry under test: an explicit `existingMortgageBalance: 0`
 * (paid-off home) is genuine; a blank/`null` balance is NOT (blank ≠ paid-off).
 *
 * Drives the REAL orchestrator (renders <HomeDecisionAnalyzer/>, seeds the real
 * m5Store input shape, reads the real computed `results`) — it does NOT mock a
 * `scenarios` object. Mocking `scenarios` is exactly how the presentational
 * component tests let the original gap stay hidden.
 * ═══════════════════════════════════════════════════════════════════════════
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, act, waitFor } from '@testing-library/react';
import { useM1Store } from '@/src/stores/m1Store';
import { useM2Store } from '@/src/stores/m2Store';
import { useM3Store } from '@/src/stores/m3Store';
import { useM5Store } from '@/src/stores/m5Store';
import useBlueprintStore from '@/src/stores/blueprintStore';
import HomeDecisionAnalyzer from '../HomeDecisionAnalyzer.jsx';
import S9HomeDecision from '@/src/components/blueprint/sections/S9HomeDecision.jsx';

afterEach(() => {
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
  useM5Store.getState().clearHomeDecision();
  useBlueprintStore.getState().resetBlueprint();
  // Empty upstream → the one-shot pre-pop writes nothing (prePop.inputs is {}),
  // so `existingMortgageBalance` stays genuinely BLANK unless a test sets it.
  useM1Store.setState({ budgetGap: { results: null } });
  useM2Store.setState({ maritalEstateInventory: { items: [] } });
  useM3Store.setState({ budgetModeler: null });
});

// Balance-blank fill: currentFMV + income + credit + refiRate, but NO
// existingMortgageBalance. Under the addendum this is NON-genuine (a blank
// balance would coerce to $0 → home looks paid off). refiRate is a DECIMAL
// FRACTION per RefiRateInput's contract (0.065 = 6.5% APR).
function seedBalanceBlank(extra = {}) {
  act(() => {
    useM5Store.getState().setHomeDecisionInputs({
      currentFMV: 600000,
      // existingMortgageBalance intentionally omitted (stays null → blank)
      userPostDivorceGrossMonthlyIncome: 8000,
      userCreditScoreBand: 'excellent',
      refiRate: 0.065,
      ...extra,
    });
  });
}

// Fully-genuine fill: adds a real existingMortgageBalance so all three required
// inputs (currentFMV, balance, refiRate) are present.
function seedGenuine(extra = {}) {
  seedBalanceBlank({ existingMortgageBalance: 400000, ...extra });
}

async function waitForResults() {
  await waitFor(() =>
    expect(useM5Store.getState().homeDecision.results).not.toBeNull(),
  );
  return useM5Store.getState().homeDecision.results;
}

describe('HDA balance-coercion — corrected behavior (predicate expansion, addendum)', () => {
  // ── Test 1 — the genuineness gate now catches a blank balance ────────────
  it('Test 1: a balance-blank fill is NON-genuine — nothing computes, grid holds the empty state', async () => {
    render(<HomeDecisionAnalyzer />);
    seedBalanceBlank(); // currentFMV + refiRate present, balance blank
    await new Promise((r) => setTimeout(r, 0));

    // FLIPPED from "results not null / equity 558000": a blank balance no longer
    // coerces to $0 — the predicate returns calc:null before the engine runs.
    expect(useM5Store.getState().homeDecision.results).toBeNull();
    expect(useM5Store.getState().homeDecision.metadata).toBeNull();
    expect(screen.getByTestId('hda-grid-placeholder')).toBeInTheDocument();
  });

  it('Test 1b: an explicit paid-off balance (0) IS genuine — the asymmetry (blank ≠ paid-off)', async () => {
    render(<HomeDecisionAnalyzer />);
    seedBalanceBlank({ existingMortgageBalance: 0 });
    const results = await waitForResults();

    // Paid-off home: sell-now net equity is the full gross proceeds, no debt.
    expect(results.sellNow.metadata.netEquity).toBe(600000 * (1 - 0.05 - 0.02));
    expect(screen.getByTestId('hda-projection-grid')).toBeInTheDocument();
  });

  // ── Test 2 — equity tracks a REAL balance one-for-one (no coercion) ──────
  it('Test 2: equity reflects the real balance and moves one-for-one between two genuine balances', async () => {
    render(<HomeDecisionAnalyzer />);
    seedGenuine(); // balance 400000
    let results = await waitForResults();

    const equity400k = results.sellNow.metadata.netEquity;
    // grossSaleProceeds 558000 − real balance 400000 (NOT − 0).
    expect(equity400k).toBe(158000);

    // Change to another genuine balance; equity moves one-for-one with it.
    act(() => {
      useM5Store.getState().setHomeDecisionInputs({ existingMortgageBalance: 300000 });
    });
    await waitFor(() =>
      expect(
        useM5Store.getState().homeDecision.results.sellNow.metadata.netEquity,
      ).not.toBe(equity400k),
    );
    results = useM5Store.getState().homeDecision.results;
    const equity300k = results.sellNow.metadata.netEquity;

    expect(equity300k).toBe(258000);
    // −100,000 of debt ⇒ +100,000 of equity, one-for-one (the correctness
    // invariant the buggy blank-vs-$400k swing used to fake against a $0).
    expect(equity300k - equity400k).toBe(100000);
  });

  // ── Test 3(a) — a balance-blank scenario does NOT reach Blueprint §9 ─────
  it('Test 3(a): a balance-blank scenario cannot persist to Blueprint §9 (Save is a no-op, §9 stays empty)', async () => {
    render(<HomeDecisionAnalyzer />);
    seedBalanceBlank();
    await new Promise((r) => setTimeout(r, 0));
    expect(useM5Store.getState().homeDecision.results).toBeNull();

    // The Save button is always mounted; clicking it with calc:null is a no-op
    // (handleSave early-returns), so the §9 leak is closed.
    fireEvent.click(screen.getByTestId('hda-save-button'));
    const s9 = useBlueprintStore.getState().sections.s9;
    expect(s9.status).toBe('empty');
    expect(s9.data).toBeNull();
  });

  // ── Test 3(b) — genuine §9 renders financials, no verdict/qualification ──
  it('Test 3(b) [genuine partial/no selection]: §9 renders real financials and NO qualification/verdict language', async () => {
    render(<HomeDecisionAnalyzer />);
    seedGenuine(); // real balance → genuine
    await waitForResults();
    fireEvent.click(screen.getByTestId('hda-save-button'));
    const s9data = useBlueprintStore.getState().sections.s9.data;
    expect(s9data.scenarios[1].metadata.netEquity).toBe(158000); // real equity, not 558000

    act(() => {
      window.innerWidth = 1024;
      window.dispatchEvent(new Event('resize'));
    });
    const { container } = render(<S9HomeDecision data={s9data} status="partial" />);
    const text = container.textContent;

    // Enduring correctness property (confirmed with Fitz): §9 prints no refi
    // verdict tier ("likely qualifies"/"likely doesn't"), nor verdict/qualif.
    expect(text).not.toMatch(/likely (qualifies|doesn|does not)/i);
    expect(text).not.toMatch(/\bverdict\b/i);
    expect(text).not.toMatch(/\bqualif/i);
    expect(text.toLowerCase()).toContain('net wealth');
  });

  // ── Control — a genuine red+shortfall scenario is unchanged by the fix ───
  // This case supplies a REAL $400k balance, so it was genuine before AND after
  // the predicate expansion — it proves the fix gates blanks WITHOUT breaking
  // real data. It also documents the one verdict-DERIVED string §9 legitimately
  // carries (the factual shortfall callout), which is appropriate for the export.
  it('Control [genuine red+shortfall, keepAndRefi selected]: §9 still surfaces the factual shortfall callout', async () => {
    render(<HomeDecisionAnalyzer />);
    seedGenuine(); // real $400k balance → red verdict + shortfall
    await waitForResults();

    fireEvent.click(screen.getByTestId('hda-col-keepAndRefi'));
    fireEvent.click(screen.getByTestId('hda-save-button'));
    const s9data = useBlueprintStore.getState().sections.s9.data;
    expect(s9data.userSelection).toBe('keepAndRefi');

    const { container } = render(<S9HomeDecision data={s9data} status="complete" />);
    const text = container.textContent;

    expect(text).toMatch(/cannot fund the full buyout/i);
    expect(text).not.toMatch(/likely (qualifies|doesn|does not)/i);
  });
});
