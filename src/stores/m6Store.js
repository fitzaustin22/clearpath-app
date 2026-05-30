import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import useBlueprintStore from '@/src/stores/blueprintStore';

/**
 * m6Store — Negotiate from Strength. Tool slices accrue per build phase.
 *
 * Phase 1 adds the `priorities` slice (Priorities Worksheet, Tool 1). The slice
 * is additive — the persist key (`clearpath-m6`) and version (0) are unchanged,
 * so no migrate is required.
 *
 * PriorityItem = { id, item, importance, note? }
 *   importance ∈ {'unsorted','must-have','would-like','willing-to-trade'}
 *
 * Items enter via capture as 'unsorted'; the Sort step assigns one of the three
 * real tiers. Array order WITHIN an importance group is that group's rank — no
 * `rank` field is stored (rank is derived only at the Blueprint boundary by
 * buildPrioritiesPayload).
 */

// Importance enum (the four legal values). 'unsorted' is the capture landing tier.
export const PRIORITY_IMPORTANCE = ['unsorted', 'must-have', 'would-like', 'willing-to-trade'];

// Secure tiers that carry forward into the Blueprint, in render order:
// must-haves first, then would-likes. 'unsorted' and 'willing-to-trade' never
// reach the payload.
const SECURE_TIERS = ['must-have', 'would-like'];

const NOTE_MAX = 140;

// App id convention (mirrors blueprintStore deferredCompStubs): Date.now() +
// random suffix. No uuid dep; does NOT assume crypto.randomUUID exists in tests.
const makeId = () => `prio_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

/**
 * buildPrioritiesPayload — pure. Builds the Blueprint §10 priorities payload.
 *
 * For each secure tier (must-have, then would-like), in array order, assign
 * rank = index + 1 WITHIN that tier (numbering restarts per tier). Returns a
 * grouped, flat array: all must-haves (ranks 1..n) then all would-likes
 * (ranks 1..m). `importance` is kept as the enum; `note` is NOT included.
 * Everything non-secure ('unsorted', 'willing-to-trade') is excluded. Returns
 * [] when there are no secure items.
 */
export function buildPrioritiesPayload(items) {
  const list = Array.isArray(items) ? items : [];
  const out = [];
  for (const tier of SECURE_TIERS) {
    const inTier = list.filter((it) => it && it.importance === tier);
    inTier.forEach((it, idx) => {
      out.push({ item: it.item, importance: it.importance, rank: idx + 1 });
    });
  }
  return out;
}

/**
 * selectWillingToTrade — pure. The willing-to-trade items (private leverage),
 * for in-tool display and the Phase 2 Trade-Off feeder. Never written to the
 * Blueprint.
 */
export function selectWillingToTrade(items) {
  const list = Array.isArray(items) ? items : [];
  return list.filter((it) => it && it.importance === 'willing-to-trade');
}

export const useM6Store = create(
  persist(
    (set, get) => ({
      priorities: { items: [] },

      // Capture: append a new item as 'unsorted'. Trims; rejects empty.
      addPriority: ({ item } = {}) => {
        const trimmed = typeof item === 'string' ? item.trim() : '';
        if (!trimmed) return;
        set((state) => ({
          priorities: {
            ...state.priorities,
            items: [
              ...state.priorities.items,
              { id: makeId(), item: trimmed, importance: 'unsorted' },
            ],
          },
        }));
      },

      // Edit an item's text and/or note. Item is trimmed and never blanked;
      // note is clamped to 140 chars.
      updatePriority: (id, patch = {}) =>
        set((state) => ({
          priorities: {
            ...state.priorities,
            items: state.priorities.items.map((it) => {
              if (it.id !== id) return it;
              const next = { ...it };
              if (typeof patch.item === 'string' && patch.item.trim()) {
                next.item = patch.item.trim();
              }
              if (typeof patch.note === 'string') {
                next.note = patch.note.slice(0, NOTE_MAX);
              }
              return next;
            }),
          },
        })),

      // Sort assignment: set importance from 'unsorted' or between tiers. The
      // item lands at the END of its new importance group's order (achieved by
      // moving it to the end of the flat array — its group-filtered position is
      // then last, and no other group's relative order is disturbed).
      setPriorityImportance: (id, importance) => {
        if (!PRIORITY_IMPORTANCE.includes(importance)) return;
        set((state) => {
          const { items } = state.priorities;
          const target = items.find((it) => it.id === id);
          if (!target) return state;
          const without = items.filter((it) => it.id !== id);
          return {
            priorities: {
              ...state.priorities,
              items: [...without, { ...target, importance }],
            },
          };
        });
      },

      // Zone-scoped reorder. Rejects (no-op) unless orderedIds is exactly a
      // permutation of the ids currently in that importance group — so a
      // cross-tier or unknown id is refused and no cross-tier move is possible.
      // Post-condition: items.filter(i => i.importance === importance).map(id)
      // === orderedIds, with every other group's relative order preserved.
      reorderWithin: (importance, orderedIds) => {
        set((state) => {
          const { items } = state.priorities;
          const groupIds = items
            .filter((it) => it.importance === importance)
            .map((it) => it.id);
          const ordered = Array.isArray(orderedIds) ? orderedIds : [];
          const isPermutation =
            ordered.length === groupIds.length &&
            ordered.every((oid) => groupIds.includes(oid));
          if (!isPermutation) return state; // reject: cross-tier / unknown / wrong set
          const byId = new Map(items.map((it) => [it.id, it]));
          const queue = [...ordered];
          const nextItems = items.map((it) =>
            it.importance === importance ? byId.get(queue.shift()) : it,
          );
          return {
            priorities: { ...state.priorities, items: nextItems },
          };
        });
      },

      removePriority: (id) =>
        set((state) => ({
          priorities: {
            ...state.priorities,
            items: state.priorities.items.filter((it) => it.id !== id),
          },
        })),

      resetPriorities: () => set({ priorities: { items: [] } }),

      // Explicit, user-triggered write into Blueprint §10. Builds the secure
      // payload and merges it into the priorities slot via the multi-source
      // negotiation action (which preserves any tradeOffs already written).
      // Returns { status } from the Blueprint action.
      savePrioritiesToBlueprint: () => {
        const payload = buildPrioritiesPayload(get().priorities.items);
        return useBlueprintStore
          .getState()
          .updateNegotiationStrategy('priorities', payload);
      },
    }),
    {
      name: 'clearpath-m6',
      storage: createJSONStorage(() => localStorage),
      version: 0,
    },
  ),
);

export default useM6Store;
