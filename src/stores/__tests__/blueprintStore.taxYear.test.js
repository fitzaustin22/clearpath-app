/**
 * taxYear rider (2026-06-10): the §4 writer's persisted taxYear is pinned to
 * the engine's Rev. Proc.-sourced constant — store-vs-engine agreement is now
 * structural, not coincidental. (The read-time mismatch flag in the V2
 * normalizer stays live for legacy persisted states written under the old
 * 2024 literal.)
 */
import { describe, it, expect, beforeEach } from 'vitest';
import useBlueprintStore from '../blueprintStore';
import { ENGINE_TAX_YEAR } from '@/src/lib/tax/taxYear';

const FSO_PAYLOAD = {
  bestOption: 'single',
  scenarios: {
    single: { netTax: 31000, effectiveRate: 0.18, marginalRate: 0.24 },
    mfs: { netTax: 35200, effectiveRate: 0.2, marginalRate: 0.24 },
  },
  maxSavings: 4200,
  divorceTimeline: 'beforeDec31',
};

describe('blueprintStore §4 taxYear — store/engine agreement', () => {
  beforeEach(() => {
    localStorage.clear();
    useBlueprintStore.persist.rehydrate();
    useBlueprintStore.getState().resetBlueprint();
  });

  it('persists the engine source of truth, not a literal', () => {
    useBlueprintStore.getState().updateTaxAnalysis(FSO_PAYLOAD);
    const s4 = useBlueprintStore.getState().sections.s4;
    expect(s4.data.taxYear).toBe(ENGINE_TAX_YEAR);
    // Regression guard on the defect this rider repairs: the stale literal.
    expect(s4.data.taxYear).not.toBe(2024);
  });
});
