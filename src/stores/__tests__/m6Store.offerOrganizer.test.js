/**
 * m6Store — Settlement Offer Organizer slice + pure helpers (M6 Phase 3, §8).
 *
 * Mirrors the Phase 1/2 test discipline: pure-helper cases on hand-built inputs,
 * store-action cases on the live store, and the explicit Blueprint write
 * (the §11 overview must not clobber a pre-existing §10 negotiation slot).
 *
 * Compliance spine (the non-negotiable for this tool): the Organizer ORGANIZES
 * and MAPS an offer against the user's own priorities and surfaces what it is
 * silent on. It NEVER scores, grades, rates, ranks, or says better/worse/fair/
 * accept/reject. Two invariants enforce that here:
 *   - buildOfferMap emits ONLY {addressed, silent} (never 'partial'), and the
 *     status comes verbatim from the user's own tags — never tool inference.
 *   - in-tool `note` fields never reach the §11 payload (offerSummary).
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { useM6Store, buildOfferMap, buildOfferGaps } from '../m6Store.js';
import useBlueprintStore from '../blueprintStore.js';

// The Phase 1 priorities payload shape (the spine of buildOfferMap):
//   [{ item, importance, rank }]
const PRIORITIES = [
  { item: 'Keep the house', importance: 'must-have', rank: 1 },
  { item: 'Retirement security', importance: 'must-have', rank: 2 },
  { item: 'Time with the kids', importance: 'would-like', rank: 1 },
];

// Seed m6 priorities into the live store (capture → sort), returning nothing.
function seedPriorities(specs) {
  for (const spec of specs) {
    useM6Store.getState().addPriority({ item: spec.item });
    const items = useM6Store.getState().priorities.items;
    const justAdded = items[items.length - 1];
    if (spec.importance && spec.importance !== 'unsorted') {
      useM6Store.getState().setPriorityImportance(justAdded.id, spec.importance);
    }
  }
}

beforeEach(() => {
  localStorage.clear();
  useM6Store.getState().resetOffer();
  useM6Store.getState().resetPriorities();
  useBlueprintStore.getState().resetBlueprint();
});

// ── buildOfferMap — pure (the priority↔offer mapping, two statuses only) ───────

describe('buildOfferMap — pure', () => {
  it('returns [] when priorities is empty (and tolerates non-arrays)', () => {
    expect(buildOfferMap({ priorityTags: {} }, [])).toEqual([]);
    expect(buildOfferMap({ priorityTags: {} }, undefined)).toEqual([]);
    expect(buildOfferMap(null, null)).toEqual([]);
  });

  it('untagged priorities → every status is "silent"; offerSays is the label verbatim', () => {
    const map = buildOfferMap({ priorityTags: {} }, PRIORITIES);
    expect(map).toEqual([
      { priority: 'Keep the house', offerSays: 'Keep the house', status: 'silent' },
      { priority: 'Retirement security', offerSays: 'Retirement security', status: 'silent' },
      { priority: 'Time with the kids', offerSays: 'Time with the kids', status: 'silent' },
    ]);
  });

  it('status mirrors the user tags EXACTLY — tagged → addressed, untagged → silent', () => {
    const offer = { priorityTags: { 'Keep the house': 'addressed', 'Time with the kids': 'addressed' } };
    const map = buildOfferMap(offer, PRIORITIES);
    expect(map.map((m) => m.status)).toEqual(['addressed', 'silent', 'addressed']);
  });

  it('emits ONLY {addressed, silent} — never "partial", even for a partially-tagged offer', () => {
    const offer = { priorityTags: { 'Retirement security': 'addressed' } };
    const map = buildOfferMap(offer, PRIORITIES);
    const statuses = new Set(map.map((m) => m.status));
    expect(statuses).toEqual(new Set(['addressed', 'silent']));
    expect(map.some((m) => m.status === 'partial')).toBe(false);
  });

  it('every row has exactly the shape { priority, offerSays, status }', () => {
    const map = buildOfferMap({ priorityTags: { 'Keep the house': 'addressed' } }, PRIORITIES);
    for (const row of map) {
      expect(Object.keys(row).sort()).toEqual(['offerSays', 'priority', 'status']);
      expect(['addressed', 'silent']).toContain(row.status);
      expect(row.offerSays).toBe(row.priority); // verbatim — the user's own label
    }
  });

  it('a non-tag value in priorityTags is NOT treated as addressed (only the literal "addressed" counts)', () => {
    const offer = { priorityTags: { 'Keep the house': 'silent', 'Retirement security': true } };
    const map = buildOfferMap(offer, PRIORITIES);
    expect(map.map((m) => m.status)).toEqual(['silent', 'silent', 'silent']);
  });

  it('drops blank/invalid priority entries', () => {
    const map = buildOfferMap({ priorityTags: {} }, [
      { item: 'Keep the house', importance: 'must-have', rank: 1 },
      { item: '   ', importance: 'must-have', rank: 2 },
      null,
      { importance: 'would-like', rank: 1 },
    ]);
    expect(map).toHaveLength(1);
    expect(map[0].priority).toBe('Keep the house');
  });
});

// ── buildOfferGaps — pure (neutral structural-absence list, never "fails") ─────

describe('buildOfferGaps — pure', () => {
  const GAP_KEYS = ['assets', 'support', 'residence', 'retirement', 'debts', 'otherTerms'];

  it('a null/empty offer is silent on every section (all six gaps)', () => {
    const gapsNull = buildOfferGaps(null);
    const gapsEmpty = buildOfferGaps({});
    expect(gapsNull.map((g) => g.key)).toEqual(GAP_KEYS);
    expect(gapsEmpty.map((g) => g.key)).toEqual(GAP_KEYS);
    for (const g of gapsNull) {
      expect(g.text).toMatch(/^The offer is silent on /);
    }
  });

  it('every gap is phrased "silent on", never "fails" / "missing" / a verdict word', () => {
    for (const g of buildOfferGaps(null)) {
      expect(g.text).toContain('silent on');
      expect(g.text).not.toMatch(/fail|missing|lacks|short|weak|bad/i);
    }
  });

  it('lists ONLY the absent sections — present sections drop out', () => {
    const offer = {
      assetItems: [{ id: 'offer_1', label: 'House', toUser: 'you' }],
      support: { amount: 2000, durationMonths: 36, kind: 'spousal' },
      residence: { disposition: '' }, // absent (no disposition)
      retirement: { divisionPct: null }, // absent
      debts: [],
      otherTerms: '',
    };
    const keys = buildOfferGaps(offer).map((g) => g.key);
    expect(keys).toEqual(['residence', 'retirement', 'debts', 'otherTerms']);
  });

  it('a fully-populated offer has no gaps', () => {
    const offer = {
      assetItems: [{ id: 'offer_1', label: 'House', toUser: 'you' }],
      support: { amount: 2000, durationMonths: 36, kind: 'spousal' },
      residence: { disposition: 'sell' },
      retirement: { divisionPct: 50 },
      debts: [{ id: 'debt_1', label: 'Card', toUser: 'spouse' }],
      otherTerms: 'Each keeps their car.',
    };
    expect(buildOfferGaps(offer)).toEqual([]);
  });

  it('each gap has exactly the shape { key, text }', () => {
    for (const g of buildOfferGaps(null)) {
      expect(Object.keys(g).sort()).toEqual(['key', 'text']);
    }
  });
});

// ── offerOrganizer slice — store actions ──────────────────────────────────────

describe('offerOrganizer slice — actions', () => {
  it('initial offerOrganizer.offer is null', () => {
    expect(useM6Store.getState().offerOrganizer).toEqual({ offer: null });
  });

  it('setOfferField initializes the offer and sets a nested field', () => {
    useM6Store.getState().setOfferField('support.amount', 2500);
    expect(useM6Store.getState().offerOrganizer.offer.support.amount).toBe(2500);

    useM6Store.getState().setOfferField('residence.disposition', 'keep');
    expect(useM6Store.getState().offerOrganizer.offer.residence.disposition).toBe('keep');
  });

  it('setOfferField sets a top-level field (otherTerms)', () => {
    useM6Store.getState().setOfferField('otherTerms', 'Each keeps their own car.');
    expect(useM6Store.getState().offerOrganizer.offer.otherTerms).toBe('Each keeps their own car.');
  });

  it('addAssetItem appends { id, label, toUser } with an offer-prefixed id; rejects blank labels', () => {
    useM6Store.getState().addAssetItem({ label: '  The house  ', toUser: 'you' });
    useM6Store.getState().addAssetItem({ label: '', toUser: 'spouse' }); // rejected
    const items = useM6Store.getState().offerOrganizer.offer.assetItems;
    expect(items).toHaveLength(1);
    expect(items[0].label).toBe('The house');
    expect(items[0].toUser).toBe('you');
    expect(items[0].id).toMatch(/^offer_/);
  });

  it('removeAssetItem removes by id', () => {
    useM6Store.getState().addAssetItem({ label: 'House', toUser: 'you' });
    const id = useM6Store.getState().offerOrganizer.offer.assetItems[0].id;
    useM6Store.getState().removeAssetItem(id);
    expect(useM6Store.getState().offerOrganizer.offer.assetItems).toEqual([]);
  });

  it('addDebtItem appends { id, label, toUser } with a debt-prefixed id; rejects blank', () => {
    useM6Store.getState().addDebtItem({ label: 'Car loan', toUser: 'spouse' });
    useM6Store.getState().addDebtItem({ label: '   ' }); // rejected
    const debts = useM6Store.getState().offerOrganizer.offer.debts;
    expect(debts).toHaveLength(1);
    expect(debts[0].label).toBe('Car loan');
    expect(debts[0].toUser).toBe('spouse');
    expect(debts[0].id).toMatch(/^debt_/);
  });

  it('removeDebtItem removes by id', () => {
    useM6Store.getState().addDebtItem({ label: 'Card', toUser: 'you' });
    const id = useM6Store.getState().offerOrganizer.offer.debts[0].id;
    useM6Store.getState().removeDebtItem(id);
    expect(useM6Store.getState().offerOrganizer.offer.debts).toEqual([]);
  });

  it('tagPriority sets "addressed"; untagPriority removes the tag', () => {
    useM6Store.getState().tagPriority('Keep the house');
    expect(useM6Store.getState().offerOrganizer.offer.priorityTags).toEqual({
      'Keep the house': 'addressed',
    });
    useM6Store.getState().untagPriority('Keep the house');
    expect(useM6Store.getState().offerOrganizer.offer.priorityTags).toEqual({});
  });

  it('resetOffer returns the slice to { offer: null }', () => {
    useM6Store.getState().addAssetItem({ label: 'House', toUser: 'you' });
    expect(useM6Store.getState().offerOrganizer.offer).not.toBeNull();
    useM6Store.getState().resetOffer();
    expect(useM6Store.getState().offerOrganizer.offer).toBeNull();
  });
});

// ── saveOfferToBlueprint — the explicit §11 write (round-trip) ─────────────────

describe('saveOfferToBlueprint — explicit Blueprint write', () => {
  it('a wholly-empty offer with no priorities → offerSummary null, empty map, all gaps, status "empty"', () => {
    const ret = useM6Store.getState().saveOfferToBlueprint();
    expect(ret).toEqual({ status: 'empty' });

    const s11 = useBlueprintStore.getState().sections.s11;
    expect(s11.data.offerSummary).toBeNull();
    expect(s11.data.map).toEqual([]);
    expect(s11.data.gaps).toHaveLength(6); // silent on every section
    expect(s11.status).toBe('empty');
  });

  it('priorities present but no offer → map renders (all silent); offer summary null; status complete via map', () => {
    seedPriorities(PRIORITIES);
    const ret = useM6Store.getState().saveOfferToBlueprint();

    const s11 = useBlueprintStore.getState().sections.s11;
    expect(s11.data.map.map((m) => m.status)).toEqual(['silent', 'silent', 'silent']);
    expect(s11.data.offerSummary).toBeNull();
    expect(ret).toEqual({ status: 'complete' }); // non-empty map populates §11
  });

  it('a multi-field offer round-trips: summary (displayed fields), map (statuses mirror tags), gaps (absent sections)', () => {
    seedPriorities(PRIORITIES);
    useM6Store.getState().addAssetItem({ label: 'The house', toUser: 'you' });
    useM6Store.getState().setOfferField('support.amount', 2000);
    useM6Store.getState().setOfferField('support.durationMonths', 36);
    useM6Store.getState().setOfferField('support.kind', 'spousal');
    useM6Store.getState().tagPriority('Keep the house');

    const ret = useM6Store.getState().saveOfferToBlueprint();
    expect(ret).toEqual({ status: 'complete' });

    const s11 = useBlueprintStore.getState().sections.s11;
    expect(s11.data.offerSummary.assetItems).toEqual([{ label: 'The house', toUser: 'you' }]);
    expect(s11.data.offerSummary.support).toEqual({ amount: 2000, durationMonths: 36, kind: 'spousal' });
    expect(s11.data.map.find((m) => m.priority === 'Keep the house').status).toBe('addressed');
    expect(s11.data.map.find((m) => m.priority === 'Retirement security').status).toBe('silent');
    // gaps cover the sections the offer is silent on (residence/retirement/debts/otherTerms)
    expect(s11.data.gaps.map((g) => g.key)).toEqual(['residence', 'retirement', 'debts', 'otherTerms']);
  });

  it('ATTESTATION #4 — in-tool notes NEVER reach the §11 payload', () => {
    useM6Store.getState().addAssetItem({ label: 'The house', toUser: 'you', note: 'private reminder' });
    useM6Store.getState().setOfferField('residence.disposition', 'sell');
    useM6Store.getState().setOfferField('residence.note', 'private residence note');
    useM6Store.getState().setOfferField('retirement.divisionPct', 50);
    useM6Store.getState().setOfferField('retirement.note', 'private retirement note');

    useM6Store.getState().saveOfferToBlueprint();

    const summary = useBlueprintStore.getState().sections.s11.data.offerSummary;
    const json = JSON.stringify(summary);
    expect(json).not.toContain('note');
    expect(json).not.toContain('private');
    // displayed fields survive
    expect(summary.assetItems[0]).toEqual({ label: 'The house', toUser: 'you' });
    expect(summary.residence).toEqual({ disposition: 'sell' });
    expect(summary.retirement).toEqual({ divisionPct: 50 });
  });

  it('does NOT clobber a pre-existing §10 negotiation slot (sibling isolation)', () => {
    useBlueprintStore.getState().updateNegotiationStrategy('priorities', [{ item: 'X', importance: 'must-have', rank: 1 }]);
    useM6Store.getState().addAssetItem({ label: 'House', toUser: 'you' });

    useM6Store.getState().saveOfferToBlueprint();

    const s10 = useBlueprintStore.getState().sections.s10;
    expect(s10.data.priorities).toEqual([{ item: 'X', importance: 'must-have', rank: 1 }]);
  });
});
