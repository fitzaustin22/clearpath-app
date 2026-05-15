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

// ---------------------------------------------------------------------------
// §9 Home Decision (HDA, §10.6)
// ---------------------------------------------------------------------------

// Realistic HDA fixtures — scenarios is an object (not an array) because
// calculateHomeDecision returns { keepAndRefi, sellNow, deferredSale };
// the action is shape-agnostic and persists whatever it receives.
const HDA_SCENARIOS = {
  keepAndRefi: { horizons: [{ year: 3, netWealth: 1, liquidCash: 2 }] },
  sellNow: {},
  deferredSale: {},
};
const HDA_METADATA = {
  verdictTier: 'green',
  realDollarConvention: true,
  _prePopSources: {},
};

describe('blueprintStore §9 Home Decision (HDA, §10.6)', () => {
  it('TC-BPSt-HDA-1: initial s9 shape before any write', () => {
    const s9 = useBlueprintStore.getState().sections.s9;
    expect(s9).toEqual({
      status: 'empty',
      label: 'Home Decision',
      sourceModule: 'm5',
      data: null,
    });
  });

  it('TC-BPSt-HDA-2: updateHomeDecision with null userSelection → partial status + data stored', () => {
    const payload = {
      scenarios: HDA_SCENARIOS,
      userSelection: null,
      selectionTimestamp: null,
      metadata: HDA_METADATA,
    };

    const ret = useBlueprintStore.getState().updateHomeDecision(payload);

    const s9 = useBlueprintStore.getState().sections.s9;
    expect(s9.status).toBe('partial');
    expect(s9.data).toEqual({
      scenarios: HDA_SCENARIOS,
      userSelection: null,
      selectionTimestamp: null,
      metadata: HDA_METADATA,
    });
    expect(s9.sourceModule).toBe('m5');
    expect(ret).toEqual({ status: 'partial' });
  });

  it('TC-BPSt-HDA-3: updateHomeDecision with userSelection → complete status + data carries selection + timestamp', () => {
    const payload = {
      scenarios: HDA_SCENARIOS,
      userSelection: 'keepAndRefi',
      selectionTimestamp: '2026-05-15T00:00:00.000Z',
      metadata: HDA_METADATA,
    };

    const ret = useBlueprintStore.getState().updateHomeDecision(payload);

    const s9 = useBlueprintStore.getState().sections.s9;
    expect(s9.status).toBe('complete');
    expect(s9.data.userSelection).toBe('keepAndRefi');
    expect(s9.data.selectionTimestamp).toBe('2026-05-15T00:00:00.000Z');
    expect(ret).toEqual({ status: 'complete' });
  });

  it('TC-BPSt-HDA-4: last-write-wins — second call fully overwrites first payload', () => {
    // First call — no selection
    useBlueprintStore.getState().updateHomeDecision({
      scenarios: HDA_SCENARIOS,
      userSelection: null,
      selectionTimestamp: null,
      metadata: HDA_METADATA,
    });

    const SECOND_SCENARIOS = { keepAndRefi: { horizons: [{ year: 5, netWealth: 99, liquidCash: 50 }] }, sellNow: {}, deferredSale: {} };

    // Second call — different scenarios + a selection
    useBlueprintStore.getState().updateHomeDecision({
      scenarios: SECOND_SCENARIOS,
      userSelection: 'sellNow',
      selectionTimestamp: '2026-05-15T12:00:00.000Z',
      metadata: HDA_METADATA,
    });

    const s9 = useBlueprintStore.getState().sections.s9;
    expect(s9.status).toBe('complete');
    // Only second payload present — no stale keys from first call
    expect(s9.data).toEqual({
      scenarios: SECOND_SCENARIOS,
      userSelection: 'sellNow',
      selectionTimestamp: '2026-05-15T12:00:00.000Z',
      metadata: HDA_METADATA,
    });
  });

  it('TC-BPSt-HDA-5: sibling isolation — s4 and s6 are untouched after updateHomeDecision; s9.sourceModule is static m5', () => {
    // Pre-populate §4 via updateTaxAnalysis
    useBlueprintStore.getState().updateTaxAnalysis({
      bestOption: 'mfj',
      scenarios: { mfj: { netTax: 12000, effectiveRate: 0.15, marginalRate: 0.22 } },
      maxSavings: 3000,
      divorceTimeline: 'finalized_before_dec31',
    });

    // Pre-populate §6 via updatePensionValuation
    useBlueprintStore.getState().updatePensionValuation(PVA_FIXTURE);

    const s4Before = useBlueprintStore.getState().sections.s4;
    const s6Before = useBlueprintStore.getState().sections.s6;

    // Now write §9
    useBlueprintStore.getState().updateHomeDecision({
      scenarios: HDA_SCENARIOS,
      userSelection: 'deferredSale',
      selectionTimestamp: '2026-05-15T00:00:00.000Z',
      metadata: HDA_METADATA,
    });

    const s4After = useBlueprintStore.getState().sections.s4;
    const s6After = useBlueprintStore.getState().sections.s6;
    const s9 = useBlueprintStore.getState().sections.s9;

    // Sibling sections untouched
    expect(s4After).toEqual(s4Before);
    expect(s6After).toEqual(s6Before);
    // §6 sourceModule was derived from PVA_FIXTURE — still 'm5' from deriveSourceModule
    expect(s6After.sourceModule).toBe('m5');
    // §9 sourceModule is the static 'm5' — NOT from deriveSourceModule
    expect(s9.sourceModule).toBe('m5');
  });

  it('TC-BPSt-HDA-6: localStorage round-trip — s9.data + status + static sourceModule survive rehydrate', () => {
    const payload = {
      scenarios: HDA_SCENARIOS,
      userSelection: 'keepAndRefi',
      selectionTimestamp: '2026-05-15T00:00:00.000Z',
      metadata: HDA_METADATA,
    };
    useBlueprintStore.getState().updateHomeDecision(payload);

    // Force re-hydration from localStorage
    useBlueprintStore.persist.rehydrate();

    const s9 = useBlueprintStore.getState().sections.s9;
    expect(s9.status).toBe('complete');
    expect(s9.sourceModule).toBe('m5');
    expect(s9.data).toEqual({
      scenarios: HDA_SCENARIOS,
      userSelection: 'keepAndRefi',
      selectionTimestamp: '2026-05-15T00:00:00.000Z',
      metadata: HDA_METADATA,
    });
  });
});
