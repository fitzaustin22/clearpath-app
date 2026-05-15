/**
 * blueprintStore tests — §6 schema (M4 PIT + M5 PVA dual-source).
 *
 * Covers the §6.data schema migration from flat-keyed to nested-by-source
 * (`{ pit, pva }`) and the new `updatePensionValuation` action introduced
 * for the PVA → §6 integration. `sourceModule` is now dynamically derived
 * via `deriveSourceModule` instead of being a static per-section string.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import useBlueprintStore, { deriveSourceModule } from '../blueprintStore.js';

const PIT_FIXTURE = {
  planBalance: 200000,
  planType: '401k',
  taxDiscountPercent: 0.18,
  taxDiscountDollars: 36000,
  taxAdjustedValue: 164000,
  traditionalDiscountDollars: 50000,
  overage: 14000,
  n: 18,
  effectiveTaxRate: 0.25,
  discountRate: 0.05,
};

const PVA_FIXTURE = {
  headlinePV: 425000,
  maritalPV: 280000,
  path: 'tier_3',
  expectedRetirementAge: 65,
  coverturePercent: 0.6588,
  citations: ['IRC §417(e)'],
};

beforeEach(() => {
  localStorage.clear();
  useBlueprintStore.persist.rehydrate();
  useBlueprintStore.getState().resetBlueprint();
});

describe('blueprintStore §6 schema (M4 PIT + M5 PVA dual-source)', () => {
  it('TC-BPSt-1: initial §6 has data.pit===null, data.pva===null, sourceModule===null', () => {
    const s6 = useBlueprintStore.getState().sections.s6;
    expect(s6.data).toEqual({ pit: null, pva: null });
    expect(s6.sourceModule).toBeNull();
    expect(s6.status).toBe('empty');
    expect(s6.label).toBe('Retirement Plan Division');
  });

  it('TC-BPSt-2: updateRetirementDivision writes only to data.pit; data.pva untouched; sourceModule===m4', () => {
    useBlueprintStore.getState().updateRetirementDivision(PIT_FIXTURE);

    const s6 = useBlueprintStore.getState().sections.s6;
    expect(s6.data.pit).toEqual(PIT_FIXTURE);
    expect(s6.data.pva).toBeNull();
    expect(s6.sourceModule).toBe('m4');
    expect(s6.status).toBe('complete');
  });

  it('TC-BPSt-3: updatePensionValuation writes only to data.pva; data.pit untouched; sourceModule===m5', () => {
    useBlueprintStore.getState().updatePensionValuation(PVA_FIXTURE);

    const s6 = useBlueprintStore.getState().sections.s6;
    expect(s6.data.pva).toEqual(PVA_FIXTURE);
    expect(s6.data.pit).toBeNull();
    expect(s6.sourceModule).toBe('m5');
    expect(s6.status).toBe('complete');
  });

  it('TC-BPSt-4: both writers in sequence → both slots populated; sourceModule===m4+m5', () => {
    useBlueprintStore.getState().updateRetirementDivision(PIT_FIXTURE);
    useBlueprintStore.getState().updatePensionValuation(PVA_FIXTURE);

    const s6 = useBlueprintStore.getState().sections.s6;
    expect(s6.data.pit).toEqual(PIT_FIXTURE);
    expect(s6.data.pva).toEqual(PVA_FIXTURE);
    expect(s6.sourceModule).toBe('m4+m5');

    // Reverse order — same outcome.
    useBlueprintStore.getState().resetBlueprint();
    useBlueprintStore.getState().updatePensionValuation(PVA_FIXTURE);
    useBlueprintStore.getState().updateRetirementDivision(PIT_FIXTURE);
    const s6b = useBlueprintStore.getState().sections.s6;
    expect(s6b.data.pit).toEqual(PIT_FIXTURE);
    expect(s6b.data.pva).toEqual(PVA_FIXTURE);
    expect(s6b.sourceModule).toBe('m4+m5');
  });

  it('TC-BPSt-5: deriveSourceModule covers all four data shapes', () => {
    expect(deriveSourceModule({ pit: null, pva: null })).toBeNull();
    expect(deriveSourceModule({ pit: PIT_FIXTURE, pva: null })).toBe('m4');
    expect(deriveSourceModule({ pit: null, pva: PVA_FIXTURE })).toBe('m5');
    expect(deriveSourceModule({ pit: PIT_FIXTURE, pva: PVA_FIXTURE })).toBe('m4+m5');
  });

  it('TC-BPSt-6: localStorage roundtrip preserves both slots + derived sourceModule', () => {
    useBlueprintStore.getState().updateRetirementDivision(PIT_FIXTURE);
    useBlueprintStore.getState().updatePensionValuation(PVA_FIXTURE);

    // Force re-hydration from localStorage.
    useBlueprintStore.persist.rehydrate();

    const s6 = useBlueprintStore.getState().sections.s6;
    expect(s6.data.pit).toEqual(PIT_FIXTURE);
    expect(s6.data.pva).toEqual(PVA_FIXTURE);
    expect(s6.sourceModule).toBe('m4+m5');
  });
});
