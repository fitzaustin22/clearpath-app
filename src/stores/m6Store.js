import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import useBlueprintStore from '@/src/stores/blueprintStore';
import { analyzeGrant, intrinsicValue } from '@/src/lib/coverture/coverture';

/**
 * m6Store — Negotiate from Strength. Tool slices accrue per build phase.
 *
 * Phase 1 adds the `priorities` slice (Priorities Worksheet, Tool 1). The slice
 * is additive — the persist key (`clearpath-m6`) and version (0) are unchanged,
 * so no migrate is required.
 *
 * Phase 2 adds the `tradeOffs` slice (Trade-Off Analyzer, Tool 2) — likewise
 * additive (same persist key/version). It reads two upstream sources: the
 * get-side from this store's `priorities` (selectSecureGets) and the give-side
 * from m2Store's marital-estate assets (selectTradeableGives). willing-to-trade
 * is private leverage: never a give source, never written to the Blueprint.
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

// App id convention (mirrors blueprintStore deferredCompStubs): `<prefix>_` +
// Date.now() + random suffix. No uuid dep; does NOT assume crypto.randomUUID
// exists in tests. Phase 1 uses the default 'prio'; Phase 2 passes 'trade'/'give'.
const makeId = (prefix = 'prio') => `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

// §14 forward-compat citation — the verified coverture case law (Hug / Nelson).
// Stored in the resolved-stub metadata for V2 Attorney Blueprint extraction.
const DEFERRED_COMP_CITATION =
  'In re Marriage of Hug (1984) 154 Cal.App.3d 780; In re Marriage of Nelson (1986) 177 Cal.App.3d 150';

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

// Asset categories that may be offered as a "give" (the give-picker source).
// ALLOWLIST, not denylist: liabilities (loans/creditCards/otherDebt),
// personalProperty, and any future non-asset category stay out by default.
// Mirrors m2Store's SUMMARY_ASSET_ROWS keys, minus personalProperty.
export const TRADEABLE_ASSET_CATEGORIES = [
  'realEstate',
  'workingCapital',
  'retirement',
  'pensions',
  'stockOptions',
  'corporateIncentives',
  'businessInterests',
  'otherAssets',
];

/**
 * selectTradeableGives — pure. The give-picker source. Reads ONLY
 * `m2State.maritalEstateInventory.items`; keeps items whose `category` is in the
 * asset allowlist (so liabilities and personalProperty are excluded by
 * construction); drops blank-`description` rows; snapshots each to
 * `{ id, label: description, value: Number(currentValue) || null }`.
 *
 * Reads M2 only — never priorities — so a willing-to-trade priority can never
 * surface here (give-side privacy invariant).
 */
export function selectTradeableGives(m2State) {
  const items = m2State?.maritalEstateInventory?.items ?? [];
  if (!Array.isArray(items)) return [];
  return items
    .filter((it) => it && TRADEABLE_ASSET_CATEGORIES.includes(it.category))
    .filter((it) => typeof it.description === 'string' && it.description.trim() !== '')
    .map((it) => ({
      id: it.id,
      label: it.description,
      value: Number(it.currentValue) || null,
    }));
}

/**
 * selectSecureGets — pure. The get-picker source: the secure priorities
 * (must-have, would-like), in array order, snapshotted to `{ id, label }`
 * (label = the priority's `item` text). willing-to-trade (private leverage)
 * and unsorted are excluded.
 */
export function selectSecureGets(m6State) {
  const items = m6State?.priorities?.items ?? [];
  if (!Array.isArray(items)) return [];
  return items
    .filter((it) => it && (it.importance === 'must-have' || it.importance === 'would-like'))
    .map((it) => ({ id: it.id, label: it.item }));
}

/**
 * buildTradeOffsPayload — pure. Builds the Blueprint §10 tradeOffs payload.
 *
 * For each row with a non-blank get.label AND at least one non-blank give
 * label, emit `{ get: <get.label>, give: <give labels joined with " + "> }`.
 * Multi-give rows are pre-joined into ONE string (the §10 renderer reads `give`
 * as a plain string, S10NegotiationStrategy.jsx:94). Incomplete rows are
 * dropped. note / value / source / sourceId never enter the payload. Returns
 * [] when nothing qualifies.
 */
export function buildTradeOffsPayload(rows) {
  const list = Array.isArray(rows) ? rows : [];
  const out = [];
  for (const row of list) {
    if (!row || !row.get) continue;
    const getLabel = typeof row.get.label === 'string' ? row.get.label.trim() : '';
    if (!getLabel) continue;
    const gives = Array.isArray(row.give) ? row.give : [];
    const giveLabels = gives
      .map((g) => (g && typeof g.label === 'string' ? g.label.trim() : ''))
      .filter(Boolean);
    if (giveLabels.length === 0) continue;
    out.push({ get: getLabel, give: giveLabels.join(' + ') });
  }
  return out;
}

// ── Settlement Offer Organizer (Phase 3, §8) — pure helpers ───────────────────
// The Organizer ORGANIZES and MAPS an offer against the user's priorities; it
// NEVER scores, grades, ranks, or says better/worse/fair/accept/reject. These
// helpers carry that contract: buildOfferMap echoes the user's own labels and
// reads status VERBATIM from the user's tags (two values only, never a tool
// inference); buildOfferGaps lists structurally-absent sections in neutral
// "silent on" language (never "fails").

// True when the offer's support sub-object carries any entered field.
const hasSupport = (s) =>
  Boolean(
    s &&
      (s.amount != null ||
        s.durationMonths != null ||
        (typeof s.kind === 'string' && s.kind.trim() !== '')),
  );

// The six offer sections, in canonical order, each with its neutral gap line and
// a presence test. One source of truth for both the gap list and which fields
// the summary may carry.
const OFFER_SECTIONS = [
  { key: 'assets', gap: 'The offer is silent on assets.', present: (o) => (o.assetItems ?? []).length > 0 },
  { key: 'support', gap: 'The offer is silent on support.', present: (o) => hasSupport(o.support) },
  { key: 'residence', gap: 'The offer is silent on the home.', present: (o) => Boolean(o.residence && o.residence.disposition) },
  { key: 'retirement', gap: 'The offer is silent on retirement.', present: (o) => Boolean(o.retirement && o.retirement.divisionPct != null) },
  { key: 'debts', gap: 'The offer is silent on debts.', present: (o) => (o.debts ?? []).length > 0 },
  { key: 'otherTerms', gap: 'The offer is silent on other terms.', present: (o) => typeof o.otherTerms === 'string' && o.otherTerms.trim() !== '' },
];

// A fresh, empty offer (lazily created on first write; offer stays null until then).
const emptyOffer = () => ({
  assetItems: [],
  support: { amount: null, durationMonths: null, kind: '' },
  residence: { disposition: '', note: '' },
  retirement: { divisionPct: null, note: '' },
  debts: [],
  otherTerms: '',
  priorityTags: {},
});

/**
 * buildOfferMap — pure. Spine = the user's secure priorities (the Phase 1
 * payload, [{ item, importance, rank }]). For each priority, `status` comes
 * VERBATIM from offer.priorityTags (keyed by the priority's own label):
 * 'addressed' when the user tagged it, else 'silent' — TWO values only, never
 * 'partial', never a tool inference. `offerSays` is the user's own label,
 * verbatim (the tool refuses to characterize what the offer "says" about it).
 * Returns [{ priority, offerSays, status }]; [] when there are no priorities.
 */
export function buildOfferMap(offer, priorities) {
  const list = Array.isArray(priorities) ? priorities : [];
  const tags = (offer && offer.priorityTags) || {};
  return list
    .filter((p) => p && typeof p.item === 'string' && p.item.trim() !== '')
    .map((p) => {
      const label = p.item;
      const status = tags[label] === 'addressed' ? 'addressed' : 'silent';
      return { priority: label, offerSays: label, status };
    });
}

/**
 * buildOfferGaps — pure. The neutral list of structurally-absent offer sections,
 * each phrased "The offer is silent on X" (never "fails" / "missing"). Returns
 * [{ key, text }] for every section the offer does not address; [] when the
 * offer covers all six. A null/empty offer is silent on everything.
 */
export function buildOfferGaps(offer) {
  const o = offer ?? {};
  return OFFER_SECTIONS.filter((s) => !s.present(o)).map((s) => ({ key: s.key, text: s.gap }));
}

/**
 * buildOfferSummary — local (not exported). The DISPLAYED offer fields only —
 * every in-tool `note` is stripped, so notes can never reach the Blueprint (the
 * §11 payload). Only present fields are included, so a wholly-empty offer yields
 * null (which the §11 writer reads as "not populated"). Asset/debt `id` handles
 * are internal and also dropped.
 */
function buildOfferSummary(offer) {
  if (!offer) return null;
  const s = {};
  const assets = (offer.assetItems ?? []).map((a) => ({ label: a.label, toUser: a.toUser ?? '' }));
  if (assets.length) s.assetItems = assets;
  if (hasSupport(offer.support)) {
    s.support = {
      amount: offer.support.amount ?? null,
      durationMonths: offer.support.durationMonths ?? null,
      kind: offer.support.kind ?? '',
    };
  }
  if (offer.residence && offer.residence.disposition) {
    s.residence = { disposition: offer.residence.disposition };
  }
  if (offer.retirement && offer.retirement.divisionPct != null) {
    s.retirement = { divisionPct: offer.retirement.divisionPct };
  }
  const debts = (offer.debts ?? []).map((d) => ({ label: d.label, toUser: d.toUser ?? '' }));
  if (debts.length) s.debts = debts;
  const other = typeof offer.otherTerms === 'string' ? offer.otherTerms.trim() : '';
  if (other) s.otherTerms = other;
  return Object.keys(s).length ? s : null;
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

      // ── Trade-Off Analyzer (Phase 2, §7) ──────────────────────────────────
      // tradeOffs.rows: TradeOffRow[]
      //   TradeOffRow = { id, get: { label, sourceId|null }, give: GiveItem[], note? }
      //   GiveItem    = { id, label, value: number|null,
      //                   source: 'm2-asset'|'free-text', sourceId|null }
      // The give `id` is an internal handle (react key + removeGiveFromTrade);
      // it never reaches the Blueprint payload. label/value are snapshots copied
      // at build time, so a saved trade is frozen against later renames of the
      // upstream priority/asset. `note` is in-tool only — never to the Blueprint.
      tradeOffs: { rows: [] },

      // Append a row for a chosen get. Trims the label; rejects a blank get.
      addTradeOff: ({ get } = {}) => {
        const label = get && typeof get.label === 'string' ? get.label.trim() : '';
        if (!label) return;
        set((state) => ({
          tradeOffs: {
            ...state.tradeOffs,
            rows: [
              ...state.tradeOffs.rows,
              { id: makeId('trade'), get: { label, sourceId: get.sourceId ?? null }, give: [] },
            ],
          },
        }));
      },

      // Append a snapshotted give to a row. Trims the label; rejects a blank
      // label. value is kept only when a finite number (else null); source
      // defaults to 'free-text' for anything that isn't the literal 'm2-asset'.
      addGiveToTrade: (rowId, give = {}) => {
        const label = typeof give.label === 'string' ? give.label.trim() : '';
        if (!label) return;
        const value =
          typeof give.value === 'number' && Number.isFinite(give.value) ? give.value : null;
        const source = give.source === 'm2-asset' ? 'm2-asset' : 'free-text';
        set((state) => ({
          tradeOffs: {
            ...state.tradeOffs,
            rows: state.tradeOffs.rows.map((row) =>
              row.id === rowId
                ? {
                    ...row,
                    give: [
                      ...row.give,
                      { id: makeId('give'), label, value, source, sourceId: give.sourceId ?? null },
                    ],
                  }
                : row,
            ),
          },
        }));
      },

      removeGiveFromTrade: (rowId, giveId) =>
        set((state) => ({
          tradeOffs: {
            ...state.tradeOffs,
            rows: state.tradeOffs.rows.map((row) =>
              row.id === rowId
                ? { ...row, give: row.give.filter((g) => g.id !== giveId) }
                : row,
            ),
          },
        })),

      // In-tool note (never written to the Blueprint). Clamped to NOTE_MAX.
      updateTradeOffNote: (rowId, note) =>
        set((state) => ({
          tradeOffs: {
            ...state.tradeOffs,
            rows: state.tradeOffs.rows.map((row) =>
              row.id === rowId
                ? { ...row, note: typeof note === 'string' ? note.slice(0, NOTE_MAX) : '' }
                : row,
            ),
          },
        })),

      removeTradeOff: (rowId) =>
        set((state) => ({
          tradeOffs: {
            ...state.tradeOffs,
            rows: state.tradeOffs.rows.filter((row) => row.id !== rowId),
          },
        })),

      // Whole-list reorder. Rejects (no-op) unless orderedIds is exactly a
      // permutation of the current row ids (mirrors reorderWithin's guard).
      reorderTradeOffs: (orderedIds) => {
        set((state) => {
          const ids = state.tradeOffs.rows.map((r) => r.id);
          const ordered = Array.isArray(orderedIds) ? orderedIds : [];
          const isPermutation =
            ordered.length === ids.length && ordered.every((oid) => ids.includes(oid));
          if (!isPermutation) return state;
          const byId = new Map(state.tradeOffs.rows.map((r) => [r.id, r]));
          return {
            tradeOffs: { ...state.tradeOffs, rows: ordered.map((oid) => byId.get(oid)) },
          };
        });
      },

      resetTradeOffs: () => set({ tradeOffs: { rows: [] } }),

      // Explicit, user-triggered write into Blueprint §10. Builds the payload
      // and merges it into the tradeOffs slot via the multi-source negotiation
      // action (which preserves any priorities already written). Returns
      // { status } from the Blueprint action.
      saveTradeOffsToBlueprint: () => {
        const payload = buildTradeOffsPayload(get().tradeOffs.rows);
        return useBlueprintStore
          .getState()
          .updateNegotiationStrategy('tradeOffs', payload);
      },

      // ── Settlement Offer Organizer (Phase 3, §8) ──────────────────────────
      // offerOrganizer.offer: Offer | null
      //   Offer = { assetItems: AssetItem[], support: { amount, durationMonths,
      //     kind }, residence: { disposition, note? }, retirement: { divisionPct,
      //     note? }, debts: DebtItem[], otherTerms: string,
      //     priorityTags: { [priorityLabel]: 'addressed' } }
      //   AssetItem = { id, label, toUser, note? }   DebtItem = { id, label, toUser }
      // The offer is null until the first write (lazily seeded from emptyOffer()).
      // `note` is in-tool only — never written to the Blueprint (stripped by
      // buildOfferSummary). priorityTags is keyed by the priority's own label and
      // carries ONLY the user's explicit 'addressed' marks; the tool never infers.
      offerOrganizer: { offer: null },

      // Set a top-level ('otherTerms') or one-deep ('support.amount',
      // 'residence.disposition', 'retirement.note', …) field. Seeds the offer on
      // first write.
      setOfferField: (path, value) =>
        set((state) => {
          const offer = state.offerOrganizer.offer ?? emptyOffer();
          const segs = String(path).split('.');
          let next;
          if (segs.length === 1) {
            next = { ...offer, [segs[0]]: value };
          } else {
            const [a, b] = segs;
            next = { ...offer, [a]: { ...(offer[a] ?? {}), [b]: value } };
          }
          return { offerOrganizer: { offer: next } };
        }),

      // Append an asset line { id, label, toUser, note? }. Trims; rejects a blank
      // label. note is kept only when non-blank (clamped to NOTE_MAX, in-tool only).
      addAssetItem: ({ label, toUser, note } = {}) => {
        const trimmed = typeof label === 'string' ? label.trim() : '';
        if (!trimmed) return;
        set((state) => {
          const offer = state.offerOrganizer.offer ?? emptyOffer();
          const item = { id: makeId('offer'), label: trimmed, toUser: toUser ?? '' };
          if (typeof note === 'string' && note.trim()) item.note = note.slice(0, NOTE_MAX);
          return {
            offerOrganizer: { offer: { ...offer, assetItems: [...offer.assetItems, item] } },
          };
        });
      },

      removeAssetItem: (id) =>
        set((state) => {
          const offer = state.offerOrganizer.offer;
          if (!offer) return state;
          return {
            offerOrganizer: {
              offer: { ...offer, assetItems: offer.assetItems.filter((a) => a.id !== id) },
            },
          };
        }),

      // Append a debt line { id, label, toUser }. Trims; rejects a blank label.
      addDebtItem: ({ label, toUser } = {}) => {
        const trimmed = typeof label === 'string' ? label.trim() : '';
        if (!trimmed) return;
        set((state) => {
          const offer = state.offerOrganizer.offer ?? emptyOffer();
          const item = { id: makeId('debt'), label: trimmed, toUser: toUser ?? '' };
          return {
            offerOrganizer: { offer: { ...offer, debts: [...offer.debts, item] } },
          };
        });
      },

      removeDebtItem: (id) =>
        set((state) => {
          const offer = state.offerOrganizer.offer;
          if (!offer) return state;
          return {
            offerOrganizer: { offer: { ...offer, debts: offer.debts.filter((d) => d.id !== id) } },
          };
        }),

      // Mark a priority (by its own label) as addressed by the offer. The USER
      // decides — the tool never guesses. Seeds the offer on first write.
      tagPriority: (key) => {
        if (typeof key !== 'string' || !key) return;
        set((state) => {
          const offer = state.offerOrganizer.offer ?? emptyOffer();
          return {
            offerOrganizer: {
              offer: { ...offer, priorityTags: { ...offer.priorityTags, [key]: 'addressed' } },
            },
          };
        });
      },

      untagPriority: (key) =>
        set((state) => {
          const offer = state.offerOrganizer.offer;
          if (!offer) return state;
          const nextTags = { ...offer.priorityTags };
          delete nextTags[key];
          return { offerOrganizer: { offer: { ...offer, priorityTags: nextTags } } };
        }),

      resetOffer: () => set({ offerOrganizer: { offer: null } }),

      // Explicit, user-triggered write into Blueprint §11. Builds the neutral
      // overview — { offerSummary (displayed fields, NO in-tool notes), map (the
      // two-status priority map), gaps (neutral structural absences) } — and hands
      // it to the dedicated updateSettlementOverview writer. Returns { status }.
      saveOfferToBlueprint: () => {
        const offer = get().offerOrganizer.offer;
        const priorities = buildPrioritiesPayload(get().priorities.items);
        const payload = {
          offerSummary: buildOfferSummary(offer),
          map: buildOfferMap(offer, priorities),
          gaps: buildOfferGaps(offer),
        };
        return useBlueprintStore.getState().updateSettlementOverview(payload);
      },

      // ── Deferred Compensation Analyzer (Phase 4, §9) ──────────────────────
      // deferredCompAnalyzer.{ stubId, analysis } holds ONE in-progress analysis
      // keyed to the M2-minted deferredComp stub being resolved. It does NOT own
      // the stub — it references it by stubId and reads the M2-captured fields
      // (grantDate, strikePrice, category); on save it patches the analysis back
      // onto that stub via updateDeferredCompStub (no new writer, no results slot).
      //   analysis = { hireDate, grantDate (prefill), separationDate, state, fmv,
      //                tranches: [{ id, vestDate, shares }], intentNote }
      // tranche ids use the in-scope makeId('tranche'). The stub's free-text
      // vestingSchedule is a display-only hint — it is NEVER parsed into tranches.
      deferredCompAnalyzer: { stubId: null, analysis: null },

      // Select an M2 stub to resolve: prefill a fresh analysis, including
      // grantDate from the stub (the Nelson fraction start). No-op for an unknown
      // id. RSU/option is read from the stub at compute time, never re-entered.
      selectStub: (stubId) => {
        const stub = useBlueprintStore
          .getState()
          .deferredCompStubs.find((s) => s.id === stubId);
        if (!stub) return;
        set({
          deferredCompAnalyzer: {
            stubId,
            analysis: {
              hireDate: null,
              grantDate: stub.grantDate ?? null,
              separationDate: null,
              state: null,
              fmv: null,
              tranches: [],
              intentNote: '',
            },
          },
        });
      },

      // Set an analysis field. Top-level path ('hireDate', 'fmv', 'state', …) or a
      // tranche-field path 'tranches.<id>.<field>' (vestDate / shares). No-op when
      // no analysis is in progress.
      setAnalysisField: (path, value) =>
        set((state) => {
          const dca = state.deferredCompAnalyzer;
          if (!dca.analysis) return state;
          const segs = String(path).split('.');
          if (segs[0] === 'tranches' && segs.length === 3) {
            const [, id, field] = segs;
            const tranches = dca.analysis.tranches.map((tr) =>
              tr.id === id ? { ...tr, [field]: value } : tr,
            );
            return {
              deferredCompAnalyzer: { ...dca, analysis: { ...dca.analysis, tranches } },
            };
          }
          return {
            deferredCompAnalyzer: {
              ...dca,
              analysis: { ...dca.analysis, [segs[0]]: value },
            },
          };
        }),

      // Append an empty vesting tranche (the user fills vestDate + shares via
      // setAnalysisField). id via the in-scope makeId('tranche'). No-op when no
      // analysis is in progress.
      addTranche: () =>
        set((state) => {
          const dca = state.deferredCompAnalyzer;
          if (!dca.analysis) return state;
          return {
            deferredCompAnalyzer: {
              ...dca,
              analysis: {
                ...dca.analysis,
                tranches: [
                  ...dca.analysis.tranches,
                  { id: makeId('tranche'), vestDate: '', shares: null },
                ],
              },
            },
          };
        }),

      removeTranche: (trancheId) =>
        set((state) => {
          const dca = state.deferredCompAnalyzer;
          if (!dca.analysis) return state;
          return {
            deferredCompAnalyzer: {
              ...dca,
              analysis: {
                ...dca.analysis,
                tranches: dca.analysis.tranches.filter((tr) => tr.id !== trancheId),
              },
            },
          };
        }),

      resetAnalysis: () => set({ deferredCompAnalyzer: { stubId: null, analysis: null } }),

      // The deliberate commit. Computes BOTH formulas (analyzeGrant) and the
      // per-formula intrinsic estimate (intrinsicValue) of the marital PORTION,
      // then patches the resolved stub additively via updateDeferredCompStub —
      // exactly { resolved, analysis, metadata }. NO final-split math anywhere; NO
      // new writer; NO deferredCompResults slot. The §14 metadata block is
      // forward-compat for the V2 Attorney Blueprint. No-op when no analysis is in
      // progress or the stub is unknown.
      saveAnalysisToBlueprint: (stubId) => {
        const { analysis } = get().deferredCompAnalyzer;
        const stub = useBlueprintStore
          .getState()
          .deferredCompStubs.find((s) => s.id === stubId);
        if (!analysis || !stub) return undefined;
        const grant = analyzeGrant(analysis);
        const hugShares = grant.totals.hug.maritalShares;
        const nelsonShares = grant.totals.nelson.maritalShares;
        const patch = {
          resolved: true,
          analysis,
          metadata: {
            formula: 'both',
            hireDate: analysis.hireDate,
            grantDate: analysis.grantDate,
            separationDate: analysis.separationDate,
            perTrancheFractions: grant.perTranche.map((t) => ({
              id: t.id,
              hug: t.hug.fraction,
              nelson: t.nelson.fraction,
            })),
            maritalShares: { hug: hugShares, nelson: nelsonShares },
            intrinsicValue: {
              hug: intrinsicValue(hugShares, analysis.fmv, stub.strikePrice),
              nelson: intrinsicValue(nelsonShares, analysis.fmv, stub.strikePrice),
            },
            fmvSource: 'user-entered',
            citation: DEFERRED_COMP_CITATION,
          },
        };
        return useBlueprintStore.getState().updateDeferredCompStub(stubId, patch);
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
