/**
 * m5Store PVA slice tests (§7.6.4 / §7.10.3 / §7.2 v2).
 *
 * Covers the per-asset setters at `pensionValuation.assets[assetId]`:
 *   - setPVAAssetInputs
 *   - setPVAAssetPrePopSources
 *   - setPVAAssetResults
 *   - clearPVAAsset
 *
 * §7.2 v2: `setPVAAssetFlags` was removed — routing-derived state (e.g.
 * frozen-routing) is computed reactively from `inputs.accrualStatus` in the
 * orchestrator; the m5Store no longer owns a flag slot.
 *
 * Persistence is the existing `clearpath-m5` Zustand `persist` middleware (localStorage).
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { useM5Store } from '../m5Store.js';

beforeEach(() => {
  localStorage.clear();
  useM5Store.persist.rehydrate();
  // Reset pensionValuation.assets to {} for a clean per-test slate.
  useM5Store.setState((state) => ({
    pensionValuation: { ...state.pensionValuation, assets: {} },
  }));
});

describe('m5Store PVA slice extension (§7.6.4 / §7.10.3)', () => {
  it('TC-M5PVA-Slice-1: setPVAAssetInputs adds new asset entry, idempotent on re-set', () => {
    const inputs = {
      planName: 'ABC Corp Pension',
      whoseplan: 'Client',
      participantDOB: '1981-05-01',
    };
    useM5Store.getState().setPVAAssetInputs('asset-123', inputs);

    const stored = useM5Store.getState().pensionValuation.assets['asset-123'];
    expect(stored).toBeDefined();
    expect(stored.inputs).toEqual(inputs);

    // Re-set with same inputs — idempotent semantically (value-equal).
    useM5Store.getState().setPVAAssetInputs('asset-123', inputs);
    expect(useM5Store.getState().pensionValuation.assets['asset-123'].inputs).toEqual(inputs);
  });

  it('TC-M5PVA-Slice-2: setPVAAssetPrePopSources writes sibling without disturbing inputs', () => {
    const inputs = { planName: 'X', whoseplan: 'Client' };
    const sources = {
      planName: { source: 'm2.pensionClaim', timestamp: '2026-05-14T00:00:00.000Z' },
      whoseplan: { source: 'm2.pensionClaim', timestamp: '2026-05-14T00:00:00.000Z' },
    };

    useM5Store.getState().setPVAAssetInputs('a1', inputs);
    useM5Store.getState().setPVAAssetPrePopSources('a1', sources);

    const stored = useM5Store.getState().pensionValuation.assets['a1'];
    expect(stored.inputs).toEqual(inputs);
    expect(stored._prePopSources).toEqual(sources);
  });

  it('TC-M5PVA-Slice-3: setPVAAssetResults writes results without disturbing inputs / _prePopSources', () => {
    const inputs = { planName: 'Y' };
    const sources = { planName: { source: 'm2.pensionClaim', timestamp: '2026-05-14T00:00:00.000Z' } };
    const results = {
      path: 'tier_1',
      formulaId: 'pva_db_tier1_v1',
      pv: { best: 165783, low: 126443, high: 218973 },
      coverture: null,
    };

    useM5Store.getState().setPVAAssetInputs('a2', inputs);
    useM5Store.getState().setPVAAssetPrePopSources('a2', sources);
    useM5Store.getState().setPVAAssetResults('a2', results);

    const stored = useM5Store.getState().pensionValuation.assets['a2'];
    expect(stored.inputs).toEqual(inputs);
    expect(stored._prePopSources).toEqual(sources);
    expect(stored.results).toEqual(results);
  });

  // TC-M5PVA-Slice-4 removed: §7.2 v2 retires `setPVAAssetFlags`. The
  // `_frozenRoutingApplied` value is now a derived (`inputs.accrualStatus
  // === 'frozen'`) read in the PVA orchestrator — there's no store slot
  // to merge into, so the action and its test no longer apply.

  it('TC-M5PVA-Slice-5: clearPVAAsset removes the keyed entry, leaves others intact', () => {
    useM5Store.getState().setPVAAssetInputs('keep', { planName: 'Keep Plan' });
    useM5Store.getState().setPVAAssetInputs('drop', { planName: 'Drop Plan' });
    expect(Object.keys(useM5Store.getState().pensionValuation.assets).sort()).toEqual(['drop', 'keep']);

    useM5Store.getState().clearPVAAsset('drop');

    const assets = useM5Store.getState().pensionValuation.assets;
    expect(Object.keys(assets)).toEqual(['keep']);
    expect(assets.keep.inputs.planName).toBe('Keep Plan');
  });

  it('TC-M5PVA-Slice-6: persists across `clearpath-m5` localStorage round-trip', () => {
    // §7.2 v2: the slot persists inputs/results; `accrualStatus` lives
    // inside `inputs` and is therefore the persisted routing signal.
    const inputs = { planName: 'Persistence Test', accrualStatus: 'frozen' };
    useM5Store.getState().setPVAAssetInputs('persist-1', inputs);

    const raw = localStorage.getItem('clearpath-m5');
    expect(raw).not.toBeNull();
    const parsed = JSON.parse(raw);
    expect(parsed?.state?.pensionValuation?.assets?.['persist-1']?.inputs).toEqual(inputs);
    expect(parsed?.state?.pensionValuation?.assets?.['persist-1']?.inputs?.accrualStatus).toBe('frozen');
  });

  it('TC-M5PVA-Slice-7: setPVAAssetInputs whole-object replace overwrites prior inputs entirely', () => {
    useM5Store.getState().setPVAAssetInputs('a4', { planName: 'Old', whoseplan: 'Client' });
    useM5Store.getState().setPVAAssetInputs('a4', { planName: 'New' });

    const stored = useM5Store.getState().pensionValuation.assets['a4'];
    // Whole-object replace semantics — `whoseplan` is gone, not preserved.
    expect(stored.inputs).toEqual({ planName: 'New' });
    expect(stored.inputs).not.toHaveProperty('whoseplan');
  });
});
