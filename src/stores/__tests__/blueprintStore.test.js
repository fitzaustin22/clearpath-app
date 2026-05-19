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

// ---------------------------------------------------------------------------
// §10.8 QDRO Blueprint write (PR5-2, PR5-4)
// ---------------------------------------------------------------------------

const QDRO_PROJ = {
  perspective: 'participant',
  assets: [
    {
      id: 'a1',
      label: 'MegaCorp 401(k)',
      planType: 'dc',
      perspective: 'participant',
      branchCapture: { allocationType: 'percentage' },
      flagOnlyResponses: null,
    },
  ],
  generatedAt: null,
};

const ISO_REGEX = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/;

describe('blueprintStore §10.8 QDRO Blueprint write (PR5-2, PR5-4)', () => {
  it('TC-BPSt-QDG-1: initial qdroBlueprint is { savedProjection: null, savedAt: null }', () => {
    expect(useBlueprintStore.getState().qdroBlueprint).toEqual({
      savedProjection: null,
      savedAt: null,
    });
  });

  it('TC-BPSt-QDG-2: writeQDROToBlueprint stamps generatedAt on savedProjection; original fixture generatedAt stays null', () => {
    useBlueprintStore.getState().writeQDROToBlueprint(QDRO_PROJ);
    const { savedProjection } = useBlueprintStore.getState().qdroBlueprint;

    // savedProjection has all original fields plus a stamped generatedAt
    expect(savedProjection).toMatchObject({
      perspective: QDRO_PROJ.perspective,
      assets: QDRO_PROJ.assets,
    });
    expect(ISO_REGEX.test(savedProjection.generatedAt)).toBe(true);
    expect(!Number.isNaN(Date.parse(savedProjection.generatedAt))).toBe(true);

    // Original fixture is untouched
    expect(QDRO_PROJ.generatedAt).toBeNull();
  });

  it('TC-BPSt-QDG-3: after writeQDROToBlueprint, savedAt is a valid ISO 8601 string', () => {
    useBlueprintStore.getState().writeQDROToBlueprint(QDRO_PROJ);
    const { savedAt } = useBlueprintStore.getState().qdroBlueprint;
    expect(ISO_REGEX.test(savedAt)).toBe(true);
    expect(!Number.isNaN(Date.parse(savedAt))).toBe(true);
  });

  it('TC-BPSt-QDG-4: savedAt === savedProjection.generatedAt (one timestamp, reused)', () => {
    useBlueprintStore.getState().writeQDROToBlueprint(QDRO_PROJ);
    const { savedProjection, savedAt } = useBlueprintStore.getState().qdroBlueprint;
    expect(savedAt).toBe(savedProjection.generatedAt);
  });

  it('TC-BPSt-QDG-5: idempotency — second write fully overwrites first; no leftover keys from A', () => {
    const PROJ_A = { ...QDRO_PROJ, perspective: 'alternate_payee' };
    const PROJ_B = { perspective: 'participant', assets: [], generatedAt: null };

    useBlueprintStore.getState().writeQDROToBlueprint(PROJ_A);
    useBlueprintStore.getState().writeQDROToBlueprint(PROJ_B);

    const { savedProjection, savedAt } = useBlueprintStore.getState().qdroBlueprint;

    // B's fields are present
    expect(savedProjection.perspective).toBe('participant');
    expect(savedProjection.assets).toEqual([]);
    // A's unique field (perspective was 'alternate_payee') is gone — fully overwritten
    expect(savedProjection.perspective).not.toBe('alternate_payee');
    // generatedAt aligns with savedAt
    expect(savedProjection.generatedAt).toBe(savedAt);
    // savedProjection deep-equals { ...PROJ_B, generatedAt: savedAt }
    expect(savedProjection).toEqual({ ...PROJ_B, generatedAt: savedAt });
  });

  it('TC-BPSt-QDG-6: writeQDROToBlueprint is a function on the store', () => {
    expect(typeof useBlueprintStore.getState().writeQDROToBlueprint).toBe('function');
  });

  it('TC-BPSt-QDG-7: persist round-trip — qdroBlueprint survives rehydrate', () => {
    useBlueprintStore.getState().writeQDROToBlueprint(QDRO_PROJ);
    const { savedProjection: projBefore, savedAt: savedAtBefore } = useBlueprintStore.getState().qdroBlueprint;

    useBlueprintStore.persist.rehydrate();

    const { savedProjection, savedAt } = useBlueprintStore.getState().qdroBlueprint;
    expect(savedProjection).toEqual(projBefore);
    expect(savedAt).toBe(savedAtBefore);
  });

  it('TC-BPSt-QDG-8: existing-user migration — missing qdroBlueprint in persisted blob defaults to initial slice', () => {
    // Ensure something is in localStorage by calling an action
    useBlueprintStore.getState().resetBlueprint();

    const raw = JSON.parse(localStorage.getItem('clearpath-blueprint'));
    delete raw.state.qdroBlueprint;
    localStorage.setItem('clearpath-blueprint', JSON.stringify(raw));

    useBlueprintStore.persist.rehydrate();

    expect(useBlueprintStore.getState().qdroBlueprint).toEqual({
      savedProjection: null,
      savedAt: null,
    });
  });

  it('TC-BPSt-QDG-9: whole-state persist includes qdroBlueprint (no partialize)', () => {
    useBlueprintStore.getState().writeQDROToBlueprint(QDRO_PROJ);

    const inMemory = useBlueprintStore.getState().qdroBlueprint;
    const persisted = JSON.parse(localStorage.getItem('clearpath-blueprint')).state.qdroBlueprint;

    expect(persisted).toEqual(inMemory);
  });

  it('TC-BPSt-QDG-10: resetBlueprint clears qdroBlueprint back to initial shape', () => {
    useBlueprintStore.getState().writeQDROToBlueprint(QDRO_PROJ);
    // Confirm it was written
    expect(useBlueprintStore.getState().qdroBlueprint.savedProjection).not.toBeNull();

    useBlueprintStore.getState().resetBlueprint();
    expect(useBlueprintStore.getState().qdroBlueprint).toEqual({
      savedProjection: null,
      savedAt: null,
    });
  });

  it('TC-BPSt-QDG-11: sibling isolation — s6 is unchanged after writeQDROToBlueprint', () => {
    useBlueprintStore.getState().updatePensionValuation(PVA_FIXTURE);
    const s6Before = useBlueprintStore.getState().sections.s6;

    useBlueprintStore.getState().writeQDROToBlueprint(QDRO_PROJ);

    const s6After = useBlueprintStore.getState().sections.s6;
    expect(s6After).toEqual(s6Before);
  });
});
