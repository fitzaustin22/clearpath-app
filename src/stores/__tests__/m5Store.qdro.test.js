/**
 * m5Store — QDRO Decision Guide slice CRUD setters (§8.10.1 / §8.10.2).
 *
 * Scope: the new object-keyed setters only. makeInitialQDRODecision /
 * partialize / merge are NOT modified by PR1 (already conformant via
 * stripAssetPrePopSources) — the last two tests regression-lock that the
 * existing partialize/merge correctly strip qdro per-asset _prePopSources.
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
  useM5Store.setState((s) => ({ qdroDecision: { ...s.qdroDecision, assets: {} } }));
});

describe('addQDROAsset (§8.10.1 slot creation)', () => {
  it('creates a slot with the locked default skeleton', () => {
    useM5Store.getState().addQDROAsset('a1');
    const slot = useM5Store.getState().qdroDecision.assets.a1;
    expect(slot).toEqual({
      userRole: null,
      planType: null,
      planName: null,
      employer: null,
      decisions: {},
      pvSource: null,
      _prePopSources: {},
      metadata: { formulaId: null, citations: [], qdroPacketGeneratedAt: null },
    });
  });

  it('merges init over the default skeleton', () => {
    useM5Store.getState().addQDROAsset('a1', { planType: 'dc', userRole: 'participant' });
    const slot = useM5Store.getState().qdroDecision.assets.a1;
    expect(slot.planType).toBe('dc');
    expect(slot.userRole).toBe('participant');
    expect(slot.pvSource).toBeNull();
    expect(slot.decisions).toEqual({});
  });

  it('does not clobber a sibling asset', () => {
    useM5Store.getState().addQDROAsset('a1', { planType: 'dc' });
    useM5Store.getState().addQDROAsset('a2', { planType: 'ira' });
    expect(useM5Store.getState().qdroDecision.assets.a1.planType).toBe('dc');
    expect(useM5Store.getState().qdroDecision.assets.a2.planType).toBe('ira');
  });
});

describe('updateQDRODecision (m5Store slice setter — partial-merge into decisions)', () => {
  it('partial-merges into decisions without clobbering sibling decision keys', () => {
    useM5Store.getState().addQDROAsset('a1', { planType: 'dc', userRole: 'alternatePayee' });
    useM5Store.getState().updateQDRODecision('a1', { allocationType: 'percentage', allocationValue: 50 });
    useM5Store.getState().updateQDRODecision('a1', { receiptMethod: 'rollover_ira' });
    expect(useM5Store.getState().qdroDecision.assets.a1.decisions).toEqual({
      allocationType: 'percentage',
      allocationValue: 50,
      receiptMethod: 'rollover_ira',
    });
  });

  it('does not clobber userRole / planType / pvSource / metadata / _prePopSources', () => {
    useM5Store.getState().addQDROAsset('a1', { planType: 'ira', userRole: 'participant' });
    useM5Store.getState().updateQDRODecision('a1', { custodian: 'Fidelity' });
    const slot = useM5Store.getState().qdroDecision.assets.a1;
    expect(slot.planType).toBe('ira');
    expect(slot.userRole).toBe('participant');
    expect(slot.pvSource).toBeNull();
    expect(slot.metadata).toEqual({ formulaId: null, citations: [], qdroPacketGeneratedAt: null });
  });
});

describe('setQDROClassifiers (§8.2 / §8.3 classifiers)', () => {
  it('sets userRole + planType without disturbing decisions / _prePopSources', () => {
    useM5Store.getState().addQDROAsset('a1');
    useM5Store.getState().updateQDRODecision('a1', { decreeLanguageConfirmed: 'yes' });
    useM5Store.getState().setQDROClassifiers('a1', { userRole: 'alternatePayee', planType: 'ira' });
    const slot = useM5Store.getState().qdroDecision.assets.a1;
    expect(slot.userRole).toBe('alternatePayee');
    expect(slot.planType).toBe('ira');
    expect(slot.decisions).toEqual({ decreeLanguageConfirmed: 'yes' });
    expect(slot._prePopSources).toEqual({});
  });
});

describe('removeQDROAsset (§8.10.1 key deletion)', () => {
  it('deletes the asset by key, leaving siblings intact', () => {
    useM5Store.getState().addQDROAsset('a1', { planType: 'dc' });
    useM5Store.getState().addQDROAsset('a2', { planType: 'ira' });
    useM5Store.getState().removeQDROAsset('a1');
    expect(useM5Store.getState().qdroDecision.assets.a1).toBeUndefined();
    expect(useM5Store.getState().qdroDecision.assets.a2.planType).toBe('ira');
  });

  it('is a no-op for a non-existent assetId', () => {
    useM5Store.getState().addQDROAsset('a1', { planType: 'dc' });
    expect(() => useM5Store.getState().removeQDROAsset('nope')).not.toThrow();
    expect(useM5Store.getState().qdroDecision.assets.a1.planType).toBe('dc');
  });
});

describe('seedQDROAssetsFromM2 (Q-A3 pre-pop fold-in, §8.3.4)', () => {
  const prePopResult = {
    assets: {
      pen1: {
        planType: 'private_db',
        planName: 'MegaCorp Pension',
        employer: 'MegaCorp',
        _prePopSources: {
          planType: { source: 'm2.pensionClaim', timestamp: '2026-05-18T00:00:00.000Z' },
          planName: { source: 'm2.pensionClaim', timestamp: '2026-05-18T00:00:00.000Z' },
        },
      },
      ret1: {
        planType: 'dc',
        planName: 'MegaCorp 401(k)',
        employer: null,
        _prePopSources: {
          planType: { source: 'm2.retirementAsset', timestamp: '2026-05-18T00:00:00.000Z' },
        },
      },
    },
  };

  it('folds the object-keyed map into qdroDecision.assets with full slot shape', () => {
    useM5Store.getState().seedQDROAssetsFromM2(prePopResult);
    const ret = useM5Store.getState().qdroDecision.assets.ret1;
    expect(ret.planType).toBe('dc');
    expect(ret.planName).toBe('MegaCorp 401(k)');
    expect(ret.userRole).toBeNull();
    expect(ret.decisions).toEqual({});
    expect(ret.pvSource).toBeNull();
    expect(ret._prePopSources).toEqual(prePopResult.assets.ret1._prePopSources);
    expect(ret.metadata).toEqual({ formulaId: null, citations: [], qdroPacketGeneratedAt: null });
  });

  it('preserves an existing asset slot — does NOT reseed/clobber user override (§8.3.4)', () => {
    useM5Store.getState().addQDROAsset('ret1', { planType: 'ira', userRole: 'participant' });
    useM5Store.getState().updateQDRODecision('ret1', { custodian: 'Vanguard' });
    useM5Store.getState().seedQDROAssetsFromM2(prePopResult);
    const ret = useM5Store.getState().qdroDecision.assets.ret1;
    // user override wins: planType stays 'ira', decisions preserved
    expect(ret.planType).toBe('ira');
    expect(ret.decisions).toEqual({ custodian: 'Vanguard' });
    // the not-yet-present asset is still seeded
    expect(useM5Store.getState().qdroDecision.assets.pen1.planType).toBe('private_db');
  });

  it('empty / missing prePop map is a safe no-op', () => {
    useM5Store.getState().addQDROAsset('a1', { planType: 'dc' });
    expect(() => useM5Store.getState().seedQDROAssetsFromM2({ assets: {} })).not.toThrow();
    expect(() => useM5Store.getState().seedQDROAssetsFromM2({})).not.toThrow();
    expect(() => useM5Store.getState().seedQDROAssetsFromM2(undefined)).not.toThrow();
    expect(Object.keys(useM5Store.getState().qdroDecision.assets)).toEqual(['a1']);
  });

  it('pvSource stays null for every seeded non-DB asset (step-4 invariant)', () => {
    useM5Store.getState().seedQDROAssetsFromM2(prePopResult);
    for (const a of Object.values(useM5Store.getState().qdroDecision.assets)) {
      expect(a.pvSource).toBeNull();
    }
  });
});

describe('persist contract — qdro per-asset _prePopSources (regression-lock; PR1 does not modify partialize/merge)', () => {
  it('partialize strips qdro per-asset _prePopSources, preserves decisions/classifiers/pvSource/metadata', () => {
    useM5Store.getState().addQDROAsset('a1', { planType: 'dc', userRole: 'participant' });
    useM5Store.getState().updateQDRODecision('a1', { allocationType: 'percentage' });
    useM5Store.setState((s) => ({
      qdroDecision: {
        ...s.qdroDecision,
        assets: {
          ...s.qdroDecision.assets,
          a1: {
            ...s.qdroDecision.assets.a1,
            _prePopSources: {
              planType: { source: 'm2.retirementAsset', timestamp: '2026-05-18T00:00:00.000Z' },
            },
          },
        },
      },
    }));

    const slot = readPersisted()?.state?.qdroDecision?.assets?.a1;
    expect(slot).toBeDefined();
    expect(slot.planType).toBe('dc');
    expect(slot.userRole).toBe('participant');
    expect(slot.decisions).toEqual({ allocationType: 'percentage' });
    expect(slot.pvSource).toBeNull();
    expect(slot.metadata).toEqual({ formulaId: null, citations: [], qdroPacketGeneratedAt: null });
    expect(slot).not.toHaveProperty('_prePopSources');
  });

  it('merge strips a stale qdro per-asset _prePopSources on rehydrate, preserves decisions/classifiers', () => {
    const staleBlob = {
      state: {
        homeDecision: { inputs: {}, results: null, metadata: null, userSelection: null },
        supportEstimator: { inputs: {}, results: null },
        pensionValuation: { assets: {} },
        qdroDecision: {
          assets: {
            q1: {
              userRole: 'alternatePayee',
              planType: 'dc',
              planName: 'SpouseCorp 401(k)',
              employer: null,
              decisions: { allocationType: 'fixed_dollar', allocationValue: 90000 },
              pvSource: null,
              _prePopSources: {
                planType: { source: 'm2.retirementAsset', timestamp: '2026-01-01T00:00:00.000Z' },
              },
              metadata: { formulaId: null, citations: [], qdroPacketGeneratedAt: null },
            },
          },
        },
      },
      version: 0,
    };
    localStorage.setItem(KEY, JSON.stringify(staleBlob));

    useM5Store.persist.rehydrate();
    const slot = useM5Store.getState().qdroDecision.assets.q1;

    expect(slot.userRole).toBe('alternatePayee');
    expect(slot.planType).toBe('dc');
    expect(slot.decisions).toEqual({ allocationType: 'fixed_dollar', allocationValue: 90000 });
    expect(slot._prePopSources).toBeUndefined();
  });
});
