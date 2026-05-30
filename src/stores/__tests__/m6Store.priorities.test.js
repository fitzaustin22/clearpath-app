/**
 * m6Store — Priorities Worksheet slice + pure helpers (M6 Phase 1).
 *
 * Covers the §6.7 payload/rank cases, the zone-scoped reorder contract, the
 * unsorted/willing-to-trade exclusions, and the multi-source Blueprint write
 * (priorities slot must not clobber a pre-existing tradeOffs slot). All store
 * assertions; no render.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  useM6Store,
  buildPrioritiesPayload,
  selectWillingToTrade,
} from '../m6Store.js';
import useBlueprintStore from '../blueprintStore.js';

// Convenience: seed items of given importances and return their ids in order.
function seed(specs) {
  for (const spec of specs) {
    useM6Store.getState().addPriority({ item: spec.item });
    const items = useM6Store.getState().priorities.items;
    const justAdded = items[items.length - 1];
    if (spec.importance && spec.importance !== 'unsorted') {
      useM6Store.getState().setPriorityImportance(justAdded.id, spec.importance);
    }
  }
  return useM6Store.getState().priorities.items;
}

beforeEach(() => {
  localStorage.clear();
  useM6Store.getState().resetPriorities();
  useBlueprintStore.getState().resetBlueprint();
});

describe('buildPrioritiesPayload — pure §6.7 rank cases', () => {
  it('returns [] for an empty list', () => {
    expect(buildPrioritiesPayload([])).toEqual([]);
    expect(buildPrioritiesPayload(undefined)).toEqual([]);
  });

  it('returns [] when there are no secure items (only unsorted / willing-to-trade)', () => {
    const items = [
      { id: 'a', item: 'A', importance: 'unsorted' },
      { id: 'b', item: 'B', importance: 'willing-to-trade' },
    ];
    expect(buildPrioritiesPayload(items)).toEqual([]);
  });

  it('a single must-have is rank 1', () => {
    const items = [{ id: 'a', item: 'House', importance: 'must-have' }];
    expect(buildPrioritiesPayload(items)).toEqual([
      { item: 'House', importance: 'must-have', rank: 1 },
    ]);
  });

  it('numbers each tier independently — a must-have AND a would-like can both be rank 1', () => {
    const items = [
      { id: 'a', item: 'House', importance: 'must-have' },
      { id: 'b', item: 'Cabin', importance: 'would-like' },
    ];
    const payload = buildPrioritiesPayload(items);
    expect(payload).toEqual([
      { item: 'House', importance: 'must-have', rank: 1 },
      { item: 'Cabin', importance: 'would-like', rank: 1 },
    ]);
  });

  it('groups must-haves before would-likes with ranks contiguous per tier (even when interleaved in the array)', () => {
    const items = [
      { id: 'a', item: 'MH1', importance: 'must-have' },
      { id: 'b', item: 'WL1', importance: 'would-like' },
      { id: 'c', item: 'MH2', importance: 'must-have' },
      { id: 'd', item: 'WL2', importance: 'would-like' },
    ];
    expect(buildPrioritiesPayload(items)).toEqual([
      { item: 'MH1', importance: 'must-have', rank: 1 },
      { item: 'MH2', importance: 'must-have', rank: 2 },
      { item: 'WL1', importance: 'would-like', rank: 1 },
      { item: 'WL2', importance: 'would-like', rank: 2 },
    ]);
  });

  it('excludes unsorted and willing-to-trade from the payload', () => {
    const items = [
      { id: 'a', item: 'MH', importance: 'must-have' },
      { id: 'b', item: 'U', importance: 'unsorted' },
      { id: 'c', item: 'WT', importance: 'willing-to-trade' },
      { id: 'd', item: 'WL', importance: 'would-like' },
    ];
    const payload = buildPrioritiesPayload(items);
    expect(payload.map((p) => p.importance)).toEqual(['must-have', 'would-like']);
    expect(payload.find((p) => p.item === 'U')).toBeUndefined();
    expect(payload.find((p) => p.item === 'WT')).toBeUndefined();
  });

  it('never carries the in-tool note into the payload', () => {
    const items = [{ id: 'a', item: 'House', importance: 'must-have', note: 'sentimental' }];
    const payload = buildPrioritiesPayload(items);
    expect(payload[0]).not.toHaveProperty('note');
    expect(Object.keys(payload[0]).sort()).toEqual(['importance', 'item', 'rank']);
  });
});

describe('selectWillingToTrade — pure', () => {
  it('returns only the willing-to-trade items', () => {
    const items = [
      { id: 'a', item: 'MH', importance: 'must-have' },
      { id: 'b', item: 'WT1', importance: 'willing-to-trade' },
      { id: 'c', item: 'WT2', importance: 'willing-to-trade' },
    ];
    expect(selectWillingToTrade(items).map((i) => i.item)).toEqual(['WT1', 'WT2']);
  });

  it('returns [] when there are none (and tolerates non-arrays)', () => {
    expect(selectWillingToTrade([{ id: 'a', item: 'MH', importance: 'must-have' }])).toEqual([]);
    expect(selectWillingToTrade(null)).toEqual([]);
  });
});

describe('useM6Store — capture + edit actions', () => {
  it('addPriority trims the text and enters the item as unsorted', () => {
    useM6Store.getState().addPriority({ item: '   Keep the house  ' });
    const items = useM6Store.getState().priorities.items;
    expect(items).toHaveLength(1);
    expect(items[0].item).toBe('Keep the house');
    expect(items[0].importance).toBe('unsorted');
    expect(typeof items[0].id).toBe('string');
  });

  it('addPriority rejects empty / whitespace-only / missing text', () => {
    useM6Store.getState().addPriority({ item: '   ' });
    useM6Store.getState().addPriority({ item: '' });
    useM6Store.getState().addPriority({});
    expect(useM6Store.getState().priorities.items).toHaveLength(0);
  });

  it('assigns distinct ids to items added in quick succession', () => {
    useM6Store.getState().addPriority({ item: 'A' });
    useM6Store.getState().addPriority({ item: 'B' });
    const [a, b] = useM6Store.getState().priorities.items;
    expect(a.id).not.toBe(b.id);
  });

  it('updatePriority edits the item text and clamps the note to 140 chars', () => {
    const [it] = seed([{ item: 'House', importance: 'unsorted' }]);
    useM6Store.getState().updatePriority(it.id, { item: 'The house', note: 'x'.repeat(200) });
    const updated = useM6Store.getState().priorities.items[0];
    expect(updated.item).toBe('The house');
    expect(updated.note).toHaveLength(140);
  });

  it('removePriority drops the item; resetPriorities clears all', () => {
    const items = seed([
      { item: 'A', importance: 'must-have' },
      { item: 'B', importance: 'would-like' },
    ]);
    useM6Store.getState().removePriority(items[0].id);
    expect(useM6Store.getState().priorities.items.map((i) => i.item)).toEqual(['B']);
    useM6Store.getState().resetPriorities();
    expect(useM6Store.getState().priorities.items).toEqual([]);
  });
});

describe('useM6Store — setPriorityImportance (Sort assignment)', () => {
  it('ignores an unknown importance value (no-op)', () => {
    const [it] = seed([{ item: 'House', importance: 'must-have' }]);
    useM6Store.getState().setPriorityImportance(it.id, 'bogus');
    expect(useM6Store.getState().priorities.items[0].importance).toBe('must-have');
  });

  it('promoting/demoting lands the item at the END of its new group and re-contiguates ranks', () => {
    const items = seed([
      { item: 'MH1', importance: 'must-have' },
      { item: 'MH2', importance: 'must-have' },
      { item: 'WL1', importance: 'would-like' },
    ]);
    const wl1 = items.find((i) => i.item === 'WL1');
    // Promote WL1 → must-have: it should land last among must-haves.
    useM6Store.getState().setPriorityImportance(wl1.id, 'must-have');
    let payload = buildPrioritiesPayload(useM6Store.getState().priorities.items);
    expect(payload.filter((p) => p.importance === 'must-have').map((p) => p.item)).toEqual([
      'MH1',
      'MH2',
      'WL1',
    ]);
    expect(payload.filter((p) => p.importance === 'must-have').map((p) => p.rank)).toEqual([1, 2, 3]);

    // Demote MH1 → would-like: must-haves re-contiguate to ranks 1,2.
    const mh1 = useM6Store.getState().priorities.items.find((i) => i.item === 'MH1');
    useM6Store.getState().setPriorityImportance(mh1.id, 'would-like');
    payload = buildPrioritiesPayload(useM6Store.getState().priorities.items);
    expect(payload.filter((p) => p.importance === 'must-have').map((p) => p.item)).toEqual(['MH2', 'WL1']);
    expect(payload.filter((p) => p.importance === 'must-have').map((p) => p.rank)).toEqual([1, 2]);
    expect(payload.filter((p) => p.importance === 'would-like').map((p) => p.item)).toEqual(['MH1']);
  });
});

describe('useM6Store — reorderWithin (zone-scoped, no cross-tier moves)', () => {
  it('reorders within a zone and preserves the relative order of every other group', () => {
    const items = seed([
      { item: 'MH1', importance: 'must-have' },
      { item: 'MH2', importance: 'must-have' },
      { item: 'WL1', importance: 'would-like' },
      { item: 'WL2', importance: 'would-like' },
    ]);
    const [mh1, mh2] = items.filter((i) => i.importance === 'must-have');
    useM6Store.getState().reorderWithin('must-have', [mh2.id, mh1.id]);
    const after = useM6Store.getState().priorities.items;
    expect(after.filter((i) => i.importance === 'must-have').map((i) => i.id)).toEqual([mh2.id, mh1.id]);
    // Would-likes are untouched.
    expect(after.filter((i) => i.importance === 'would-like').map((i) => i.item)).toEqual(['WL1', 'WL2']);
  });

  it('rejects an orderedIds list that contains a cross-tier id (no-op)', () => {
    const items = seed([
      { item: 'MH1', importance: 'must-have' },
      { item: 'MH2', importance: 'must-have' },
      { item: 'WL1', importance: 'would-like' },
    ]);
    const mh = items.filter((i) => i.importance === 'must-have');
    const wl1 = items.find((i) => i.item === 'WL1');
    const before = useM6Store.getState().priorities.items.map((i) => i.id);
    // mh[0] + a would-like id is not a permutation of the must-have group.
    useM6Store.getState().reorderWithin('must-have', [mh[0].id, wl1.id]);
    expect(useM6Store.getState().priorities.items.map((i) => i.id)).toEqual(before);
  });
});

describe('useM6Store — savePrioritiesToBlueprint (multi-source §10 write)', () => {
  it('a single must-have writes the priorities slot and reports partial status', () => {
    seed([{ item: 'House', importance: 'must-have' }]);
    const ret = useM6Store.getState().savePrioritiesToBlueprint();
    expect(ret.status).toBe('partial');
    const s10 = useBlueprintStore.getState().sections.s10;
    expect(s10.data.priorities).toEqual([{ item: 'House', importance: 'must-have', rank: 1 }]);
    expect(s10.status).toBe('partial');
  });

  it('preserves a pre-existing tradeOffs slot and rolls up to complete (multi-source guard)', () => {
    // Pre-seed the OTHER feeder slot with a minimal non-empty array.
    useBlueprintStore.getState().updateNegotiationStrategy('tradeOffs', [{}]);
    seed([
      { item: 'House', importance: 'must-have' },
      { item: 'Cabin', importance: 'would-like' },
    ]);
    const ret = useM6Store.getState().savePrioritiesToBlueprint();
    const s10 = useBlueprintStore.getState().sections.s10;
    expect(s10.data.tradeOffs).toEqual([{}]); // not clobbered
    expect(s10.data.priorities).toEqual([
      { item: 'House', importance: 'must-have', rank: 1 },
      { item: 'Cabin', importance: 'would-like', rank: 1 },
    ]);
    expect(s10.status).toBe('complete'); // both slots populated
    expect(ret.status).toBe('complete');
  });

  it('saving an empty/only-willing set writes [] and reports empty (clear-all path)', () => {
    seed([{ item: 'Miles', importance: 'willing-to-trade' }]);
    const ret = useM6Store.getState().savePrioritiesToBlueprint();
    expect(ret.status).toBe('empty');
    expect(useBlueprintStore.getState().sections.s10.data.priorities).toEqual([]);
    // The willing-to-trade item still persists in the tool (private leverage).
    expect(selectWillingToTrade(useM6Store.getState().priorities.items)).toHaveLength(1);
  });
});
