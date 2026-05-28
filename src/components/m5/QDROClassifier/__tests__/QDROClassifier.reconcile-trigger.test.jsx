/**
 * QDROClassifier — PR-B2-α reconciliation trigger.
 *
 * The QDROClassifier host runs `reconcileQDROPvSources()` in a useEffect
 * keyed on:
 *   - `pensionValuation.assets` (PVA results slice changes)
 *   - the *set* of `private_db` asset keys (new private_db assets seeded
 *     after mount must reconcile)
 *
 * The effect is NEVER keyed on `pvSource` values — the action is idempotent,
 * so an over-broad dep at worst causes a no-op pass; but depending on
 * `pvSource` itself would invite a self-trigger loop if idempotency ever
 * regressed.
 *
 * These tests render the container and assert that `pvSource` lands at
 * the expected formulaId, covering both orderings:
 *   - PVA-then-QDRO: PVA results already present when the QDRO asset is
 *     added (this run case covers the on-mount-with-results path).
 *   - QDRO-then-PVA: QDRO asset exists; PVA results land after mount; the
 *     trigger must re-fire on the pensionValuation-slice change.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { act, render } from '@testing-library/react';
import QDROClassifier from '../QDROClassifier.jsx';
import { useM2Store } from '@/src/stores/m2Store';
import { useM5Store } from '@/src/stores/m5Store';

function seedM2(items) {
  useM2Store.setState((state) => ({
    maritalEstateInventory: { ...state.maritalEstateInventory, items },
  }));
}

function seedQDRO(assets) {
  useM5Store.setState((state) => ({
    qdroDecision: { ...state.qdroDecision, assets },
  }));
}

function seedPVAResults(assetId, results) {
  useM5Store.setState((s) => ({
    pensionValuation: {
      ...s.pensionValuation,
      assets: {
        ...s.pensionValuation.assets,
        [assetId]: { ...(s.pensionValuation.assets[assetId] ?? {}), results },
      },
    },
  }));
}

function makeNonCovertureResults(formulaId = 'pva_db_tier2_v1') {
  return {
    path: 'tier_2',
    formulaId,
    pv: { best: 400000, low: 360000, high: 450000 },
    coverture: null,
    maritalPortion: null,
    metadata: { formulaId, path: 'tier_2', citations: [] },
  };
}

function asset(overrides = {}) {
  return {
    userRole: null,
    planType: null,
    planName: null,
    employer: null,
    decisions: {},
    pvSource: null,
    _prePopSources: {},
    metadata: { formulaId: null, citations: [], qdroPacketGeneratedAt: null },
    ...overrides,
  };
}

beforeEach(() => {
  localStorage.clear();
  useM2Store.persist?.rehydrate?.();
  useM5Store.persist?.rehydrate?.();
  seedM2([]);
  seedQDRO({});
  useM5Store.setState((s) => ({
    pensionValuation: { ...s.pensionValuation, assets: {} },
  }));
});

describe('QDROClassifier — reconcile-pvSource trigger (PR-B2-α)', () => {
  it('PVA-then-QDRO: reconciles on mount when PVA results already exist', () => {
    // PVA computed for pen1 before any QDRO mount.
    seedPVAResults('pen1', makeNonCovertureResults('pva_db_tier2_v1'));
    // QDRO slice has pen1 (private_db) seeded but pvSource is null.
    seedQDRO({ pen1: asset({ planType: 'private_db' }) });
    // M2 has pen1 so QDROClassifier renders an asset card path
    // (otherwise it goes through empty-state branch).
    seedM2([{ id: 'pen1', category: 'pensions', label: 'ACME Pension' }]);

    render(<QDROClassifier />);

    expect(useM5Store.getState().qdroDecision.assets.pen1.pvSource).toBe(
      'pva_db_tier2_v1',
    );
  });

  it('QDRO-then-PVA: reconciles when PVA results land after the container is mounted', () => {
    seedQDRO({ pen1: asset({ planType: 'private_db' }) });
    seedM2([{ id: 'pen1', category: 'pensions', label: 'ACME Pension' }]);

    render(<QDROClassifier />);
    expect(useM5Store.getState().qdroDecision.assets.pen1.pvSource).toBeNull();

    act(() => {
      seedPVAResults('pen1', makeNonCovertureResults('pva_db_tier2_v1'));
    });

    expect(useM5Store.getState().qdroDecision.assets.pen1.pvSource).toBe(
      'pva_db_tier2_v1',
    );
  });

  it('newly seeded private_db asset (after mount) reconciles against existing PVA results', () => {
    seedPVAResults('pen2', makeNonCovertureResults('pva_db_tier1_v1'));
    // Initially only pen1 in M2/QDRO; pen2 will land later.
    seedM2([{ id: 'pen1', category: 'pensions', label: 'ACME' }]);
    seedQDRO({ pen1: asset({ planType: 'dc' }) }); // pen1 is DC, untouched

    render(<QDROClassifier />);

    // pen1 (dc) has no PVA pairing; pvSource stays null.
    expect(useM5Store.getState().qdroDecision.assets.pen1.pvSource).toBeNull();

    act(() => {
      // pen2 added directly to the QDRO slice (e.g. via wizard add or store
      // setState — for the test, simulate the post-mount asset arrival).
      useM5Store.setState((s) => ({
        qdroDecision: {
          ...s.qdroDecision,
          assets: {
            ...s.qdroDecision.assets,
            pen2: asset({ planType: 'private_db' }),
          },
        },
      }));
    });

    // The trigger reconciles pen2 against its same-key PVA results.
    expect(useM5Store.getState().qdroDecision.assets.pen2.pvSource).toBe(
      'pva_db_tier1_v1',
    );
  });
});
