/**
 * m5Store persist contract — partialize + custom merge (H1 hotfix).
 *
 * H1 root cause: the `clearpath-m5` persist config had no `partialize`, so the
 * transient `_prePopSources` pre-pop sentinel persisted to localStorage. A
 * non-null sentinel rehydrated and the HDA orchestrator's `_prePopSources !=
 * null` gate then skipped pre-pop forever (lockout).
 *
 * These tests assert the two store-side halves of the fix:
 *   1. partialize NEVER writes `_prePopSources` to localStorage (any slice).
 *   2. merge resets `_prePopSources` to its init value AND strips any copy
 *      already baked into an affected user's localStorage (self-heal, no
 *      version/migrate) — mirrors m1Store's merge idiom.
 *
 * The orchestrator half (gate on `Object.keys(prePop.inputs).length > 0`) is
 * covered by the HDA orchestrator integration test.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { useM5Store } from '../m5Store.js';

const KEY = 'clearpath-m5';

function readPersisted() {
  const raw = localStorage.getItem(KEY);
  return raw == null ? null : JSON.parse(raw);
}

beforeEach(() => {
  localStorage.clear();
  useM5Store.persist.rehydrate();
  // Clean per-test slate across all four slices.
  useM5Store.getState().clearHomeDecision();
  useM5Store.setState((s) => ({
    supportEstimator: { ...s.supportEstimator, results: null, _prePopSources: null },
    pensionValuation: { ...s.pensionValuation, assets: {} },
    qdroDecision: { ...s.qdroDecision, assets: {} },
  }));
});

describe('m5Store partialize — _prePopSources is never persisted', () => {
  it('TC-M5Persist-1: homeDecision persists inputs/results/metadata/userSelection but NOT _prePopSources', () => {
    useM5Store.getState().setHomeDecisionInputs({ currentFMV: 700000 });
    useM5Store.getState().setHomeDecisionUserSelection('keepAndRefi');
    useM5Store.getState().setHomeDecisionMetadata({ formulaId: 'hda_v1' });
    // Simulate the orchestrator having (incorrectly, pre-fix) set the sentinel.
    useM5Store.getState().setHomeDecisionPrePopSources({
      currentFMV: { source: 'm2.maritalEstateInventory', timestamp: '2026-05-16T00:00:00.000Z' },
    });

    const persisted = readPersisted();
    const hd = persisted?.state?.homeDecision;
    expect(hd).toBeDefined();
    expect(hd.inputs.currentFMV).toBe(700000);
    expect(hd.userSelection).toBe('keepAndRefi');
    expect(hd.metadata).toEqual({ formulaId: 'hda_v1' });
    // The H1 vector: must be absent from the persisted payload.
    expect(hd).not.toHaveProperty('_prePopSources');
  });

  it('TC-M5Persist-2: supportEstimator persists inputs/results but NOT _prePopSources', () => {
    useM5Store.getState().setSupportEstimatorResults({ guideline: 1234 });
    useM5Store.getState().setSupportEstimatorPrePopSources({
      'partyA.grossMonthly': { source: 'm3.payStubDecoder', timestamp: '2026-05-16T00:00:00.000Z' },
    });

    const se = readPersisted()?.state?.supportEstimator;
    expect(se).toBeDefined();
    expect(se.results).toEqual({ guideline: 1234 });
    expect(se).not.toHaveProperty('_prePopSources');
  });

  it('TC-M5Persist-3: pensionValuation strips per-asset _prePopSources, preserves inputs/results/_frozenRoutingApplied', () => {
    useM5Store.getState().setPVAAssetInputs('a1', { planName: 'ABC Pension' });
    useM5Store.getState().setPVAAssetResults('a1', { path: 'tier_1', pv: { best: 100 } });
    useM5Store.getState().setPVAAssetFlags('a1', {
      _frozenRoutingApplied: true,
    });
    useM5Store.getState().setPVAAssetPrePopSources('a1', {
      planName: { source: 'm2.pensionClaim', timestamp: '2026-05-16T00:00:00.000Z' },
    });

    const slot = readPersisted()?.state?.pensionValuation?.assets?.a1;
    expect(slot).toBeDefined();
    expect(slot.inputs).toEqual({ planName: 'ABC Pension' });
    expect(slot.results).toEqual({ path: 'tier_1', pv: { best: 100 } });
    // Pre-pop-derived flag IS preserved (PVA reload contract — TC-M5PVA-Slice-6).
    expect(slot._frozenRoutingApplied).toBe(true);
    // Only _prePopSources is stripped.
    expect(slot).not.toHaveProperty('_prePopSources');
  });
});

describe('m5Store merge — self-heals already-affected localStorage (no version/migrate)', () => {
  it('TC-M5Persist-4: a stale non-null homeDecision._prePopSources rehydrates as null (H1 self-heal), inputs/userSelection preserved', () => {
    // Simulate an install affected by H1: localStorage written by the OLD
    // (pre-fix) config — _prePopSources is the always-non-null object that
    // prePopulateHomeDecisionInputs returns even with no upstream data.
    const staleBlob = {
      state: {
        homeDecision: {
          inputs: { currentFMV: 825000, refiTerm: '30-year' },
          results: null,
          metadata: null,
          userSelection: 'sellNow',
          _prePopSources: {
            userPostDivorceGrossMonthlyIncome: null,
            existingMortgageBalance: null,
            startingLiquidCash: null,
          },
        },
        supportEstimator: { inputs: {}, results: null },
        pensionValuation: { assets: {} },
        qdroDecision: { assets: {} },
      },
      version: 0,
    };
    localStorage.setItem(KEY, JSON.stringify(staleBlob));

    useM5Store.persist.rehydrate();
    const hd = useM5Store.getState().homeDecision;

    // Lockout healed: sentinel back to init value → orchestrator gate
    // (`_prePopSources != null`) will NOT early-return.
    expect(hd._prePopSources).toBeNull();
    // User data survives the heal.
    expect(hd.inputs.currentFMV).toBe(825000);
    expect(hd.userSelection).toBe('sellNow');
  });

  it('TC-M5Persist-5: a stale per-asset pensionValuation._prePopSources is stripped on rehydrate, inputs + flags preserved', () => {
    const staleBlob = {
      state: {
        homeDecision: { inputs: {}, results: null, metadata: null, userSelection: null },
        supportEstimator: { inputs: {}, results: null },
        pensionValuation: {
          assets: {
            p1: {
              inputs: { planName: 'Legacy Plan' },
              results: { path: 'tier_3' },
              _frozenRoutingApplied: true,
              _prePopSources: {
                planName: { source: 'm2.pensionClaim', timestamp: '2026-01-01T00:00:00.000Z' },
              },
            },
          },
        },
        qdroDecision: { assets: {} },
      },
      version: 0,
    };
    localStorage.setItem(KEY, JSON.stringify(staleBlob));

    useM5Store.persist.rehydrate();
    const slot = useM5Store.getState().pensionValuation.assets.p1;

    expect(slot.inputs).toEqual({ planName: 'Legacy Plan' });
    expect(slot.results).toEqual({ path: 'tier_3' });
    expect(slot._frozenRoutingApplied).toBe(true);
    expect(slot._prePopSources).toBeUndefined();
  });

  it('TC-M5Persist-6: a clean round-trip preserves user data with _prePopSources reset to null', () => {
    useM5Store.getState().setHomeDecisionInputs({ currentFMV: 550000, refiTerm: '15-year' });
    useM5Store.getState().setHomeDecisionUserSelection('deferredSale');
    useM5Store.getState().setHomeDecisionResults({ keepAndRefi: { monthlyPayment: 3100 } });

    // Re-read persisted payload back into the store (simulates a fresh load).
    useM5Store.persist.rehydrate();
    const hd = useM5Store.getState().homeDecision;

    expect(hd.inputs.currentFMV).toBe(550000);
    expect(hd.inputs.refiTerm).toBe('15-year');
    expect(hd.userSelection).toBe('deferredSale');
    expect(hd.results).toEqual({ keepAndRefi: { monthlyPayment: 3100 } });
    expect(hd._prePopSources).toBeNull();
  });

  it('TC-M5Persist-7: H1 regression guard — orchestrator sentinel gate is unlocked after rehydrating an affected blob', () => {
    // Before the fix this exact blob (sentinel set, but inputs were the init
    // defaults because nothing upstream was sourced) locked pre-pop forever.
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
    localStorage.setItem(KEY, JSON.stringify(affected));

    useM5Store.persist.rehydrate();

    // The orchestrator's guard is `if (homeDecision._prePopSources != null) return;`
    // With the heal, this is null → loose-inequality is false → pre-pop is
    // free to run again.
    const sentinel = useM5Store.getState().homeDecision._prePopSources;
    expect(sentinel).toBeNull();
    expect(sentinel != null).toBe(false);
  });
});
