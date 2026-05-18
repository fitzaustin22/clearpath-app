/**
 * prePopulateQDROInputs — §8.3.4 M2 two-category pre-pop + §10.7 provenance.
 * Q-A3 return contract: { assets: { [assetId]: {planType, planName,
 * employer, _prePopSources} } }. Includes the anomaly #1 regression guard
 * (§G): the source must no longer reference §8.10.7.
 */

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { prePopulateQDROInputs } from '../prePopulate.js';

function m2With(items) {
  return { maritalEstateInventory: { items } };
}

describe('prePopulateQDROInputs — §8.3.4 category routing', () => {
  it("category 'pensions' → private_db default, source m2.pensionClaim", () => {
    const m2Store = m2With([
      { id: 'pen1', category: 'pensions', label: 'MegaCorp Pension', employer: 'MegaCorp' },
    ]);
    const out = prePopulateQDROInputs({ m1Store: {}, m2Store, m3Store: {} });
    const a = out.assets.pen1;
    expect(a.planType).toBe('private_db');
    expect(a.planName).toBe('MegaCorp Pension');
    expect(a.employer).toBe('MegaCorp');
    expect(a._prePopSources.planType.source).toBe('m2.pensionClaim');
    expect(a._prePopSources.planName.source).toBe('m2.pensionClaim');
    expect(a._prePopSources.employer.source).toBe('m2.pensionClaim');
  });

  it("category 'retirement' → dc default, source m2.retirementAsset", () => {
    const m2Store = m2With([
      { id: 'ret1', category: 'retirement', planName: 'MegaCorp 401(k)' },
    ]);
    const out = prePopulateQDROInputs({ m1Store: {}, m2Store, m3Store: {} });
    const a = out.assets.ret1;
    expect(a.planType).toBe('dc');
    expect(a.planName).toBe('MegaCorp 401(k)');
    expect(a._prePopSources.planType.source).toBe('m2.retirementAsset');
  });

  it('asset map is keyed by the M2 item id', () => {
    const m2Store = m2With([{ id: 'X-42', category: 'retirement', label: 'TSP' }]);
    const out = prePopulateQDROInputs({ m1Store: {}, m2Store, m3Store: {} });
    expect(Object.keys(out.assets)).toEqual(['X-42']);
  });

  it('planName resolves label → planName → subcategory; employer null when absent', () => {
    const m2Store = m2With([
      { id: 'a', category: 'retirement', subcategory: '401(k) / 403(b) / 457 Plan' },
    ]);
    const a = prePopulateQDROInputs({ m1Store: {}, m2Store, m3Store: {} }).assets.a;
    expect(a.planName).toBe('401(k) / 403(b) / 457 Plan');
    expect(a.employer).toBeNull();
    expect(a._prePopSources.employer).toBeNull();
  });

  it('_prePopSources.planName is null when no plan name is resolvable', () => {
    const m2Store = m2With([{ id: 'a', category: 'pensions' }]);
    const a = prePopulateQDROInputs({ m1Store: {}, m2Store, m3Store: {} }).assets.a;
    expect(a.planName).toBeNull();
    expect(a._prePopSources.planName).toBeNull();
    // planType is always category-defaulted, so its provenance is always set
    expect(a._prePopSources.planType.source).toBe('m2.pensionClaim');
  });

  it('mixed inventory → only pensions + retirement items become assets', () => {
    const m2Store = m2With([
      { id: 'home', category: 'realEstate', currentValue: 500000 },
      { id: 'cash', category: 'workingCapital', currentValue: 20000 },
      { id: 'pen1', category: 'pensions', label: 'Gov Pension' },
      { id: 'ret1', category: 'retirement', label: 'My 401(k)' },
    ]);
    const out = prePopulateQDROInputs({ m1Store: {}, m2Store, m3Store: {} });
    expect(Object.keys(out.assets).sort()).toEqual(['pen1', 'ret1']);
    expect(out.assets.pen1.planType).toBe('private_db');
    expect(out.assets.ret1.planType).toBe('dc');
  });
});

describe('prePopulateQDROInputs — empty/edge (TC-QDG-9)', () => {
  it('empty M2 inventory → empty asset-map', () => {
    expect(prePopulateQDROInputs({ m1Store: {}, m2Store: m2With([]), m3Store: {} })).toEqual({
      assets: {},
    });
  });

  it('no pensions/retirement items → empty asset-map', () => {
    const m2Store = m2With([{ id: 'home', category: 'realEstate' }]);
    expect(prePopulateQDROInputs({ m1Store: {}, m2Store, m3Store: {} })).toEqual({ assets: {} });
  });

  it('missing m2Store / inventory is a safe empty result', () => {
    expect(prePopulateQDROInputs({ m1Store: {}, m2Store: undefined, m3Store: {} })).toEqual({
      assets: {},
    });
    expect(prePopulateQDROInputs({ m1Store: {}, m2Store: {}, m3Store: {} })).toEqual({
      assets: {},
    });
  });
});

describe('prePopulateQDROInputs — no write-back + DI signature (§10.7)', () => {
  it('does not mutate m2Store.maritalEstateInventory.items', () => {
    const items = [{ id: 'pen1', category: 'pensions', label: 'P' }];
    const m2Store = m2With(items);
    const snapshot = JSON.stringify(items);
    prePopulateQDROInputs({ m1Store: { x: 1 }, m2Store, m3Store: { y: 2 } });
    expect(JSON.stringify(m2Store.maritalEstateInventory.items)).toBe(snapshot);
  });

  it('m1Store / m3Store are unused — output depends only on m2Store (§8.3.4)', () => {
    const m2Store = m2With([{ id: 'ret1', category: 'retirement', label: 'R' }]);
    const a = prePopulateQDROInputs({ m1Store: { anything: true }, m2Store, m3Store: { foo: 9 } });
    const b = prePopulateQDROInputs({ m1Store: null, m2Store, m3Store: null });
    expect(a).toEqual(b);
  });
});

describe('anomaly #1 regression (§G) — prePopulate.js no longer cites §8.10.7', () => {
  const src = readFileSync(path.join(process.cwd(), 'src/stores/prePopulate.js'), 'utf8');

  it('source contains NO "§8.10.7" substring', () => {
    expect(src.includes('§8.10.7')).toBe(false);
  });

  it('source cites the correct §8.3.4 pre-pop rule', () => {
    expect(src.includes('§8.3.4')).toBe(true);
  });
});
