/**
 * m5Store — `reconcileQDROPvSources` action (PR-B2-α / §8.6.1 / §8.10.1
 * pvSource writer). Same-key (M2 item id) reconciliation between
 * pensionValuation.assets[k].results.formulaId and
 * qdroDecision.assets[k].pvSource for every `private_db` asset.
 *
 * Invariants:
 *   - private_db + usable PVA results → pvSource := results.formulaId
 *   - private_db + no usable PVA results → pvSource := null
 *   - non-private_db (dc | ira | gov_civilian | military | state_municipal)
 *     → pvSource is NEVER written by the reconciler
 *   - idempotent: a second call with unchanged input writes nothing
 *   - never reads `pvSource` to decide what to write (it derives target
 *     solely from `pensionValuation` + `planType`)
 *
 * Usable-results probe is `getHeadlinePV(results) != null` per Phase-3
 * design — this absorbs flag-only (pv === null) and missing-results.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { useM5Store } from '../m5Store.js';

beforeEach(() => {
  localStorage.clear();
  useM5Store.persist.rehydrate();
  useM5Store.setState((s) => ({
    qdroDecision: { ...s.qdroDecision, assets: {} },
    pensionValuation: { ...s.pensionValuation, assets: {} },
  }));
});

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

function seedQDROAsset(assetId, partial) {
  useM5Store.getState().addQDROAsset(assetId, partial);
}

// Synthesize a non-coverture PVA results object (tier 1/2-shaped).
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

function makeCovertureResults(formulaId = 'pva_db_tier3_coverture_v1') {
  return {
    path: 'tier_3',
    formulaId,
    pv: {
      total: { best: 500000, low: 450000, high: 550000 },
      marital: { best: 200000, low: 180000, high: 220000 },
    },
    coverture: {
      fraction: 0.4,
      numeratorMonths: 120,
      denominatorMonths: 300,
      maritalServiceStart: '2010-01-01',
      maritalServiceEnd: '2020-01-01',
    },
    maritalPortion: null,
    metadata: { formulaId, path: 'tier_3', citations: [] },
  };
}

function makeFlagOnlyResults() {
  return {
    path: 'flag_only',
    formulaId: null,
    pv: null,
    coverture: null,
    maritalPortion: null,
    metadata: { formulaId: null, path: 'flag_only', citations: [] },
  };
}

describe('reconcileQDROPvSources — action exists and is exposed', () => {
  it('is a function on the store', () => {
    const action = useM5Store.getState().reconcileQDROPvSources;
    expect(typeof action).toBe('function');
  });
});

describe('reconcileQDROPvSources — private_db pairing on same key', () => {
  it('sets pvSource to results.formulaId when PVA has usable results (tier 1/2)', () => {
    seedQDROAsset('a1', { planType: 'private_db' });
    seedPVAResults('a1', makeNonCovertureResults('pva_db_tier2_v1'));

    useM5Store.getState().reconcileQDROPvSources();

    expect(useM5Store.getState().qdroDecision.assets.a1.pvSource).toBe('pva_db_tier2_v1');
  });

  it('sets pvSource to results.formulaId for coverture path (tier 3)', () => {
    seedQDROAsset('a1', { planType: 'private_db' });
    seedPVAResults('a1', makeCovertureResults('pva_db_tier3_coverture_v1'));

    useM5Store.getState().reconcileQDROPvSources();

    expect(useM5Store.getState().qdroDecision.assets.a1.pvSource).toBe(
      'pva_db_tier3_coverture_v1',
    );
  });

  it('leaves pvSource null when no PVA results exist for the asset', () => {
    seedQDROAsset('a1', { planType: 'private_db' });
    // No PVA results seeded.

    useM5Store.getState().reconcileQDROPvSources();

    expect(useM5Store.getState().qdroDecision.assets.a1.pvSource).toBeNull();
  });

  it('leaves pvSource null when PVA has flag-only results (pv === null)', () => {
    seedQDROAsset('a1', { planType: 'private_db' });
    seedPVAResults('a1', makeFlagOnlyResults());

    useM5Store.getState().reconcileQDROPvSources();

    expect(useM5Store.getState().qdroDecision.assets.a1.pvSource).toBeNull();
  });

  it('clears stale pvSource back to null when PVA results are removed', () => {
    seedQDROAsset('a1', { planType: 'private_db' });
    seedPVAResults('a1', makeNonCovertureResults('pva_db_tier2_v1'));
    useM5Store.getState().reconcileQDROPvSources();
    expect(useM5Store.getState().qdroDecision.assets.a1.pvSource).toBe('pva_db_tier2_v1');

    // PVA recompute clears results.
    useM5Store.setState((s) => ({
      pensionValuation: {
        ...s.pensionValuation,
        assets: {
          ...s.pensionValuation.assets,
          a1: { ...s.pensionValuation.assets.a1, results: null },
        },
      },
    }));

    useM5Store.getState().reconcileQDROPvSources();

    expect(useM5Store.getState().qdroDecision.assets.a1.pvSource).toBeNull();
  });

  it('updates pvSource to a new formulaId when PVA recomputes with a different path', () => {
    seedQDROAsset('a1', { planType: 'private_db' });
    seedPVAResults('a1', makeNonCovertureResults('pva_db_tier1_v1'));
    useM5Store.getState().reconcileQDROPvSources();
    expect(useM5Store.getState().qdroDecision.assets.a1.pvSource).toBe('pva_db_tier1_v1');

    seedPVAResults('a1', makeCovertureResults('pva_db_tier3_coverture_v1'));
    useM5Store.getState().reconcileQDROPvSources();

    expect(useM5Store.getState().qdroDecision.assets.a1.pvSource).toBe(
      'pva_db_tier3_coverture_v1',
    );
  });
});

describe('reconcileQDROPvSources — non-private_db assets never touched', () => {
  it.each([['dc'], ['ira'], ['gov_civilian'], ['military'], ['state_municipal']])(
    'leaves pvSource untouched for planType=%s even if PVA results happen to exist at the same key',
    (planType) => {
      seedQDROAsset('k1', { planType });
      // Even if PVA somehow has a results slot at the same key (it shouldn't
      // for non-pensions, but a hand-crafted state shouldn't be modified):
      seedPVAResults('k1', makeNonCovertureResults('pva_db_tier2_v1'));

      useM5Store.getState().reconcileQDROPvSources();

      // pvSource is initialized to null by addQDROAsset and the reconciler
      // never writes a non-null value for non-private_db assets.
      expect(useM5Store.getState().qdroDecision.assets.k1.pvSource).toBeNull();
    },
  );

  it('does not clear a pre-existing pvSource on a non-private_db asset (defensive)', () => {
    // Defensive: a non-private_db asset arrived with a non-null pvSource
    // (legacy persistence or hand-crafted state). The reconciler must not
    // touch it.
    seedQDROAsset('k1', { planType: 'dc', pvSource: 'legacy_sentinel' });

    useM5Store.getState().reconcileQDROPvSources();

    expect(useM5Store.getState().qdroDecision.assets.k1.pvSource).toBe('legacy_sentinel');
  });
});

describe('reconcileQDROPvSources — idempotency', () => {
  it('second call with unchanged input does not mutate the assets reference', () => {
    seedQDROAsset('a1', { planType: 'private_db' });
    seedPVAResults('a1', makeNonCovertureResults('pva_db_tier2_v1'));

    useM5Store.getState().reconcileQDROPvSources();
    const afterFirst = useM5Store.getState().qdroDecision.assets;

    useM5Store.getState().reconcileQDROPvSources();
    const afterSecond = useM5Store.getState().qdroDecision.assets;

    // Same reference — no set() write happened.
    expect(afterSecond).toBe(afterFirst);
  });

  it('only mutates assets that actually changed; untouched assets keep reference', () => {
    seedQDROAsset('a1', { planType: 'private_db' });
    seedQDROAsset('a2', { planType: 'private_db' });
    seedPVAResults('a1', makeNonCovertureResults('pva_db_tier2_v1'));
    // a2 has no PVA results — pvSource stays null.

    useM5Store.getState().reconcileQDROPvSources();
    const a2BeforeSecond = useM5Store.getState().qdroDecision.assets.a2;

    // Now seed a2's PVA — second call mutates only a2.
    seedPVAResults('a2', makeCovertureResults('pva_db_tier3_coverture_v1'));
    useM5Store.getState().reconcileQDROPvSources();
    const stateAfter = useM5Store.getState().qdroDecision.assets;

    expect(stateAfter.a1.pvSource).toBe('pva_db_tier2_v1');
    expect(stateAfter.a2.pvSource).toBe('pva_db_tier3_coverture_v1');
    // a2 reference changed (its pvSource changed)
    expect(stateAfter.a2).not.toBe(a2BeforeSecond);
  });
});

describe('reconcileQDROPvSources — preserves sibling fields', () => {
  it('does not clobber decisions, userRole, planName, employer, metadata, _prePopSources', () => {
    seedQDROAsset('a1', {
      planType: 'private_db',
      userRole: 'alternatePayee',
      planName: 'MegaCorp Pension',
      employer: 'MegaCorp Inc.',
      decisions: { interestStructure: 'separate' },
      _prePopSources: { planType: { source: 'm2.pensionClaim', timestamp: 'T' } },
      metadata: { formulaId: 'qdg_private_db_v1', citations: ['ERISA §206(d)(3)'], qdroPacketGeneratedAt: null },
    });
    seedPVAResults('a1', makeNonCovertureResults('pva_db_tier2_v1'));

    useM5Store.getState().reconcileQDROPvSources();

    const slot = useM5Store.getState().qdroDecision.assets.a1;
    expect(slot.userRole).toBe('alternatePayee');
    expect(slot.planName).toBe('MegaCorp Pension');
    expect(slot.employer).toBe('MegaCorp Inc.');
    expect(slot.decisions).toEqual({ interestStructure: 'separate' });
    expect(slot._prePopSources).toEqual({
      planType: { source: 'm2.pensionClaim', timestamp: 'T' },
    });
    expect(slot.metadata).toEqual({
      formulaId: 'qdg_private_db_v1',
      citations: ['ERISA §206(d)(3)'],
      qdroPacketGeneratedAt: null,
    });
    expect(slot.pvSource).toBe('pva_db_tier2_v1');
  });
});

describe('reconcileQDROPvSources — empty / sparse states', () => {
  it('is a safe no-op when qdroDecision.assets is empty', () => {
    expect(() => useM5Store.getState().reconcileQDROPvSources()).not.toThrow();
    expect(useM5Store.getState().qdroDecision.assets).toEqual({});
  });

  it('is a safe no-op when pensionValuation.assets is empty', () => {
    seedQDROAsset('a1', { planType: 'private_db' });
    expect(() => useM5Store.getState().reconcileQDROPvSources()).not.toThrow();
    expect(useM5Store.getState().qdroDecision.assets.a1.pvSource).toBeNull();
  });

  it('handles a private_db asset whose PVA slot exists but has no results field', () => {
    seedQDROAsset('a1', { planType: 'private_db' });
    useM5Store.setState((s) => ({
      pensionValuation: {
        ...s.pensionValuation,
        assets: { ...s.pensionValuation.assets, a1: { inputs: {} } }, // no `results`
      },
    }));

    useM5Store.getState().reconcileQDROPvSources();

    expect(useM5Store.getState().qdroDecision.assets.a1.pvSource).toBeNull();
  });
});
