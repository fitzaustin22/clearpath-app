/**
 * m5Store PVA slice tests (§7.6.4 / §7.10.3).
 *
 * Covers the §13 step 4 PR 2 setter extension to `pensionValuation.assets[assetId]`:
 *   - setPVAAssetInputs
 *   - setPVAAssetPrePopSources
 *   - setPVAAssetResults
 *   - setPVAAssetFlags
 *   - clearPVAAsset
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

  it('TC-M5PVA-Slice-4: setPVAAssetFlags merges flag fields', () => {
    useM5Store.getState().setPVAAssetInputs('a3', { planName: 'Z' });

    useM5Store.getState().setPVAAssetFlags('a3', {
      _legacyCurrentValueDetected: true,
      _legacyValue: 300000,
    });
    let stored = useM5Store.getState().pensionValuation.assets['a3'];
    expect(stored._legacyCurrentValueDetected).toBe(true);
    expect(stored._legacyValue).toBe(300000);
    expect(stored.inputs).toEqual({ planName: 'Z' });

    // Subsequent merge adds frozen flag without losing prior flags.
    useM5Store.getState().setPVAAssetFlags('a3', { _frozenRoutingApplied: true });
    stored = useM5Store.getState().pensionValuation.assets['a3'];
    expect(stored._frozenRoutingApplied).toBe(true);
    expect(stored._legacyCurrentValueDetected).toBe(true);
    expect(stored._legacyValue).toBe(300000);
  });

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
    const inputs = { planName: 'Persistence Test' };
    useM5Store.getState().setPVAAssetInputs('persist-1', inputs);
    useM5Store.getState().setPVAAssetFlags('persist-1', { _frozenRoutingApplied: true });

    // Verify it landed in localStorage under the canonical 'clearpath-m5' key.
    const raw = localStorage.getItem('clearpath-m5');
    expect(raw).not.toBeNull();
    const parsed = JSON.parse(raw);
    expect(parsed?.state?.pensionValuation?.assets?.['persist-1']?.inputs).toEqual(inputs);
    expect(parsed?.state?.pensionValuation?.assets?.['persist-1']?._frozenRoutingApplied).toBe(true);
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
