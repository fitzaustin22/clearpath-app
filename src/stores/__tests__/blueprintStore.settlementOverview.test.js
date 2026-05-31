/**
 * blueprintStore §11 Settlement Offer Overview — NEW dedicated writer
 * (M6 Phase 3, Settlement Offer Organizer).
 *
 * §11 had NO writer before Phase 3 — only the generic updateSection touched it,
 * and no caller wrote it, so s11.data sat null. This suite covers the new
 * dedicated `updateSettlementOverview(payload)` (symmetry with the s6/s10/s9
 * feeders): it sets s11.data = { offerSummary, map, gaps }, derives a two-state
 * status (filled → 'complete', else 'empty'; §11 has no 'partial' — a single
 * save captures whatever the offer holds), and returns { status }.
 *
 * It also guards the s11 relabel ('Settlement Evaluation' → 'Settlement Offer
 * Overview') in BOTH the initial-state and resetBlueprint literals, and the
 * init-null invariant (s11.data starts null so the dormant renderer's
 * `if (!data) return null` guard still fires before any save).
 *
 * Compliance note: this writer is a neutral container. It never scores, ranks,
 * or evaluates — it persists the organized readout the tool produced.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import useBlueprintStore from '../blueprintStore.js';

const ISO_REGEX = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/;

// A realistic payload as produced by saveOfferToBlueprint: displayed fields
// only (no in-tool notes), the two-status priority map, and the neutral gaps.
const OVERVIEW_PAYLOAD = {
  offerSummary: {
    assetItems: [{ label: 'The house', toUser: 'you' }],
    support: { amount: 2000, durationMonths: 36, kind: 'spousal' },
    residence: { disposition: 'sell' },
    retirement: { divisionPct: 50 },
    debts: [{ label: 'Car loan', toUser: 'spouse' }],
    otherTerms: 'Each keeps their own vehicle.',
  },
  map: [
    { priority: 'Keep the house', offerSays: 'Keep the house', status: 'addressed' },
    { priority: 'Time with the kids', offerSays: 'Time with the kids', status: 'silent' },
  ],
  gaps: [{ key: 'retirement', text: 'The offer is silent on retirement.' }],
};

beforeEach(() => {
  localStorage.clear();
  useBlueprintStore.persist.rehydrate();
  useBlueprintStore.getState().resetBlueprint();
});

describe('blueprintStore §11 — relabel + init-null invariant', () => {
  it('TC-BPSt-S11-1: s11 label is "Settlement Offer Overview" with data null at init', () => {
    const s11 = useBlueprintStore.getState().sections.s11;
    expect(s11.label).toBe('Settlement Offer Overview');
    expect(s11.data).toBeNull();
    expect(s11.status).toBe('empty');
    expect(s11.sourceModule).toBe('m6');
  });

  it('TC-BPSt-S11-2: the initial-state literal (getInitialState) also carries the new label + null data', () => {
    // Guards the INITIAL literal specifically — resetBlueprint (in beforeEach)
    // would otherwise mask a missed edit on the initial copy.
    const s11 = useBlueprintStore.getInitialState().sections.s11;
    expect(s11.label).toBe('Settlement Offer Overview');
    expect(s11.data).toBeNull();
  });

  it('TC-BPSt-S11-3: old "Settlement Evaluation" label is gone from both literals', () => {
    expect(useBlueprintStore.getState().sections.s11.label).not.toBe('Settlement Evaluation');
    expect(useBlueprintStore.getInitialState().sections.s11.label).not.toBe('Settlement Evaluation');
  });
});

describe('blueprintStore §11 — updateSettlementOverview writer', () => {
  it('TC-BPSt-S11-4: is a function on the store (NEW writer — no prior s11 writer existed)', () => {
    expect(typeof useBlueprintStore.getState().updateSettlementOverview).toBe('function');
  });

  it('TC-BPSt-S11-5: stores { offerSummary, map, gaps } in s11.data and returns { status }', () => {
    const ret = useBlueprintStore.getState().updateSettlementOverview(OVERVIEW_PAYLOAD);

    const s11 = useBlueprintStore.getState().sections.s11;
    expect(s11.data).toEqual({
      offerSummary: OVERVIEW_PAYLOAD.offerSummary,
      map: OVERVIEW_PAYLOAD.map,
      gaps: OVERVIEW_PAYLOAD.gaps,
    });
    expect(Object.keys(s11.data).sort()).toEqual(['gaps', 'map', 'offerSummary']);
    expect(ret).toEqual({ status: s11.status });
  });

  it('TC-BPSt-S11-6: status "complete" when offerSummary is present', () => {
    const ret = useBlueprintStore
      .getState()
      .updateSettlementOverview({ offerSummary: { otherTerms: 'X' }, map: [], gaps: [] });
    expect(ret).toEqual({ status: 'complete' });
    expect(useBlueprintStore.getState().sections.s11.status).toBe('complete');
  });

  it('TC-BPSt-S11-7: status "complete" when the map is non-empty even if offerSummary is null', () => {
    const ret = useBlueprintStore.getState().updateSettlementOverview({
      offerSummary: null,
      map: [{ priority: 'Keep the house', offerSays: 'Keep the house', status: 'addressed' }],
      gaps: [],
    });
    expect(ret).toEqual({ status: 'complete' });
    expect(useBlueprintStore.getState().sections.s11.status).toBe('complete');
  });

  it('TC-BPSt-S11-8: status "empty" when offerSummary is empty/null AND map is empty (gaps alone do not populate)', () => {
    // A wholly-empty offer still produces gaps for every absent section, but an
    // empty offer is not a populated §11.
    const ret = useBlueprintStore.getState().updateSettlementOverview({
      offerSummary: null,
      map: [],
      gaps: [
        { key: 'assets', text: 'The offer is silent on assets.' },
        { key: 'support', text: 'The offer is silent on support.' },
      ],
    });
    expect(ret).toEqual({ status: 'empty' });
    expect(useBlueprintStore.getState().sections.s11.status).toBe('empty');

    // An empty-object offerSummary is also not "present".
    useBlueprintStore.getState().updateSettlementOverview({ offerSummary: {}, map: [], gaps: [] });
    expect(useBlueprintStore.getState().sections.s11.status).toBe('empty');
  });

  it('TC-BPSt-S11-9: coerces missing map/gaps to [] (renderer-safe)', () => {
    useBlueprintStore.getState().updateSettlementOverview({ offerSummary: { otherTerms: 'X' } });
    const s11 = useBlueprintStore.getState().sections.s11;
    expect(s11.data.map).toEqual([]);
    expect(s11.data.gaps).toEqual([]);
  });

  it('TC-BPSt-S11-10: stamps lastUpdated as an ISO 8601 string', () => {
    useBlueprintStore.getState().updateSettlementOverview(OVERVIEW_PAYLOAD);
    expect(ISO_REGEX.test(useBlueprintStore.getState().lastUpdated)).toBe(true);
  });

  it('TC-BPSt-S11-11: last-write-wins — second call fully overwrites first s11.data', () => {
    useBlueprintStore.getState().updateSettlementOverview(OVERVIEW_PAYLOAD);
    const SECOND = { offerSummary: { otherTerms: 'Only this' }, map: [], gaps: [] };
    useBlueprintStore.getState().updateSettlementOverview(SECOND);

    const s11 = useBlueprintStore.getState().sections.s11;
    expect(s11.data).toEqual({ offerSummary: { otherTerms: 'Only this' }, map: [], gaps: [] });
    // No leftover keys from the first payload's map.
    expect(s11.data.map).toEqual([]);
  });

  it('TC-BPSt-S11-12: sibling isolation — s10 and s6 are untouched by updateSettlementOverview', () => {
    const s10Before = useBlueprintStore.getState().sections.s10;
    const s6Before = useBlueprintStore.getState().sections.s6;

    useBlueprintStore.getState().updateSettlementOverview(OVERVIEW_PAYLOAD);

    expect(useBlueprintStore.getState().sections.s10).toEqual(s10Before);
    expect(useBlueprintStore.getState().sections.s6).toEqual(s6Before);
  });

  it('TC-BPSt-S11-13: localStorage round-trip preserves s11.data + status', () => {
    useBlueprintStore.getState().updateSettlementOverview(OVERVIEW_PAYLOAD);
    const before = useBlueprintStore.getState().sections.s11;

    useBlueprintStore.persist.rehydrate();

    const after = useBlueprintStore.getState().sections.s11;
    expect(after.data).toEqual(before.data);
    expect(after.status).toBe(before.status);
    expect(after.label).toBe('Settlement Offer Overview');
  });

  it('TC-BPSt-S11-14: resetBlueprint clears s11.data back to null + status empty + keeps the new label', () => {
    useBlueprintStore.getState().updateSettlementOverview(OVERVIEW_PAYLOAD);
    expect(useBlueprintStore.getState().sections.s11.data).not.toBeNull();

    useBlueprintStore.getState().resetBlueprint();

    const s11 = useBlueprintStore.getState().sections.s11;
    expect(s11.data).toBeNull();
    expect(s11.status).toBe('empty');
    expect(s11.label).toBe('Settlement Offer Overview');
  });
});
