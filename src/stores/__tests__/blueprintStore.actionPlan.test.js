/**
 * blueprintStore §12 Action Plan & Timeline — NEW dedicated writer (M7 Phase A).
 *
 * §12 had NO writer before Phase A — only the (dead) generic updateSection
 * touched sections, and nothing wrote s12, so s12.data sat null. This suite
 * covers the new dedicated `updateActionPlan(payload)` (symmetry with the
 * s11/s10/s9 feeders): it sets s12.data = { nextSteps, professionals,
 * keyDates }, derives a TWO-state status from the PAYLOAD lists (any non-empty
 * → 'complete', else 'empty'; FIX-2), and returns { status }. It satisfies the
 * two independent obligations the renderer imposes: a non-null `data` (the body
 * is driven purely by data) AND a `status` (which feeds the §12 progress dot).
 */

import { describe, it, expect, beforeEach } from 'vitest';
import useBlueprintStore from '../blueprintStore.js';

const ISO_REGEX = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/;

// A realistic payload as produced by buildActionPlanPayload (no in-tool id;
// optional fields present here, omitted when empty).
const FULL_PAYLOAD = {
  nextSteps: [{ step: 'Open my own checking account', timeline: '30 days', responsible: 'Me' }],
  professionals: [{ role: 'Attorney', name: 'Jane Doe', contact: 'jane@law.test' }],
  keyDates: [{ date: '2026-09-01', event: 'Mediation session' }],
};

beforeEach(() => {
  localStorage.clear();
  useBlueprintStore.persist.rehydrate();
  useBlueprintStore.getState().resetBlueprint();
});

describe('blueprintStore §12 — updateActionPlan writer', () => {
  it('TC-BPSt-S12-1: is a function on the store (NEW writer — no prior s12 writer existed)', () => {
    expect(typeof useBlueprintStore.getState().updateActionPlan).toBe('function');
  });

  it('TC-BPSt-S12-2 (case 7): stores { nextSteps, professionals, keyDates } in s12.data and returns { status }', () => {
    const ret = useBlueprintStore.getState().updateActionPlan(FULL_PAYLOAD);

    const s12 = useBlueprintStore.getState().sections.s12;
    expect(s12.data).toEqual({
      nextSteps: FULL_PAYLOAD.nextSteps,
      professionals: FULL_PAYLOAD.professionals,
      keyDates: FULL_PAYLOAD.keyDates,
    });
    expect(Object.keys(s12.data).sort()).toEqual(['keyDates', 'nextSteps', 'professionals']);
    expect(ret).toEqual({ status: s12.status });
  });

  it('TC-BPSt-S12-3 (case 7): spread-preserves label + sourceModule ("m7")', () => {
    useBlueprintStore.getState().updateActionPlan(FULL_PAYLOAD);
    const s12 = useBlueprintStore.getState().sections.s12;
    expect(s12.label).toBe('Action Plan & Timeline');
    expect(s12.sourceModule).toBe('m7');
  });

  it('TC-BPSt-S12-4 (case 8): TWO OBLIGATIONS — data non-null AND status "complete", asserted together', () => {
    useBlueprintStore.getState().updateActionPlan(FULL_PAYLOAD);
    const s12 = useBlueprintStore.getState().sections.s12;
    expect(s12.data).not.toBeNull();
    expect(s12.status).toBe('complete');
  });

  it('TC-BPSt-S12-5: status "complete" when ONLY nextSteps is non-empty', () => {
    const ret = useBlueprintStore
      .getState()
      .updateActionPlan({ nextSteps: [{ step: 'A' }], professionals: [], keyDates: [] });
    expect(ret).toEqual({ status: 'complete' });
  });

  it('TC-BPSt-S12-6: status "complete" when ONLY professionals is non-empty', () => {
    const ret = useBlueprintStore
      .getState()
      .updateActionPlan({ nextSteps: [], professionals: [{ role: 'Attorney', name: 'J' }], keyDates: [] });
    expect(ret).toEqual({ status: 'complete' });
  });

  it('TC-BPSt-S12-7: status "complete" when ONLY keyDates is non-empty', () => {
    const ret = useBlueprintStore
      .getState()
      .updateActionPlan({ nextSteps: [], professionals: [], keyDates: [{ date: '2026-01-01', event: 'E' }] });
    expect(ret).toEqual({ status: 'complete' });
  });

  it('TC-BPSt-S12-8 (case 1, status half): status "empty" when all three lists are empty; data is non-null { [], [], [] }', () => {
    const ret = useBlueprintStore
      .getState()
      .updateActionPlan({ nextSteps: [], professionals: [], keyDates: [] });
    expect(ret).toEqual({ status: 'empty' });
    const s12 = useBlueprintStore.getState().sections.s12;
    expect(s12.status).toBe('empty');
    // data is a non-null object so the renderer never crashes (mirrors §11).
    expect(s12.data).toEqual({ nextSteps: [], professionals: [], keyDates: [] });
  });

  it('TC-BPSt-S12-9: coerces missing/non-array fields to [] (renderer-safe)', () => {
    useBlueprintStore.getState().updateActionPlan({ nextSteps: [{ step: 'A' }] }); // pro/keyDates missing
    const s12 = useBlueprintStore.getState().sections.s12;
    expect(s12.data.professionals).toEqual([]);
    expect(s12.data.keyDates).toEqual([]);

    useBlueprintStore.getState().updateActionPlan({ nextSteps: 'nope', professionals: null, keyDates: 7 });
    const s12b = useBlueprintStore.getState().sections.s12;
    expect(s12b.data).toEqual({ nextSteps: [], professionals: [], keyDates: [] });
  });

  it('TC-BPSt-S12-10 (case 7): derives status itself from the payload — it is NOT the generic updateSection', () => {
    const state = useBlueprintStore.getState();
    // Distinct functions: the dead generic updateSection is not revived.
    expect(state.updateActionPlan).not.toBe(state.updateSection);
    // updateActionPlan takes a single payload and DERIVES status (no status arg
    // is passed, unlike updateSection(sectionKey, status, data)).
    const ret = state.updateActionPlan({ nextSteps: [{ step: 'X' }], professionals: [], keyDates: [] });
    expect(ret).toEqual({ status: 'complete' });
  });

  it('TC-BPSt-S12-11: stamps lastUpdated as an ISO 8601 string', () => {
    useBlueprintStore.getState().updateActionPlan(FULL_PAYLOAD);
    expect(ISO_REGEX.test(useBlueprintStore.getState().lastUpdated)).toBe(true);
  });

  it('TC-BPSt-S12-12: last-write-wins — second call fully overwrites first s12.data', () => {
    useBlueprintStore.getState().updateActionPlan(FULL_PAYLOAD);
    const SECOND = { nextSteps: [{ step: 'Only this' }], professionals: [], keyDates: [] };
    useBlueprintStore.getState().updateActionPlan(SECOND);

    const s12 = useBlueprintStore.getState().sections.s12;
    expect(s12.data).toEqual({ nextSteps: [{ step: 'Only this' }], professionals: [], keyDates: [] });
  });

  it('TC-BPSt-S12-13: sibling isolation — s11 and s10 untouched by updateActionPlan', () => {
    const s11Before = useBlueprintStore.getState().sections.s11;
    const s10Before = useBlueprintStore.getState().sections.s10;

    useBlueprintStore.getState().updateActionPlan(FULL_PAYLOAD);

    expect(useBlueprintStore.getState().sections.s11).toEqual(s11Before);
    expect(useBlueprintStore.getState().sections.s10).toEqual(s10Before);
  });

  it('TC-BPSt-S12-14: localStorage round-trip preserves s12.data + status', () => {
    useBlueprintStore.getState().updateActionPlan(FULL_PAYLOAD);
    const before = useBlueprintStore.getState().sections.s12;

    useBlueprintStore.persist.rehydrate();

    const after = useBlueprintStore.getState().sections.s12;
    expect(after.data).toEqual(before.data);
    expect(after.status).toBe(before.status);
    expect(after.label).toBe('Action Plan & Timeline');
  });

  it('TC-BPSt-S12-15: resetBlueprint clears s12.data back to null + status empty + keeps label/sourceModule', () => {
    useBlueprintStore.getState().updateActionPlan(FULL_PAYLOAD);
    expect(useBlueprintStore.getState().sections.s12.data).not.toBeNull();

    useBlueprintStore.getState().resetBlueprint();

    const s12 = useBlueprintStore.getState().sections.s12;
    expect(s12.data).toBeNull();
    expect(s12.status).toBe('empty');
    expect(s12.label).toBe('Action Plan & Timeline');
    expect(s12.sourceModule).toBe('m7');
  });
});
