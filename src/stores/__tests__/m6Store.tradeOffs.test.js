/**
 * m6Store — Trade-Off Analyzer slice + pure helpers (M6 Phase 2, §7).
 *
 * Mirrors the Phase 1 priorities test discipline (m6Store.priorities.test.js):
 * pure-helper cases on hand-built inputs, store-action cases on the live store,
 * and the multi-source Blueprint write (the tradeOffs slot must not clobber a
 * pre-existing priorities slot). All store assertions; no render.
 *
 * Privacy invariant (give-side mirror of the §10 priorities guard): a
 * willing-to-trade priority is never a give source and never reaches the
 * Blueprint payload. selectTradeableGives reads M2 only — never priorities.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  useM6Store,
  buildTradeOffsPayload,
  selectTradeableGives,
  selectSecureGets,
} from '../m6Store.js';
import useBlueprintStore from '../blueprintStore.js';

// ── Fixtures ──────────────────────────────────────────────────────────────────

// An m2State shaped like the real store for selectTradeableGives(m2State).
function m2(items) {
  return { maritalEstateInventory: { items } };
}

// Seed m6 priorities (the get source) and return the live items array.
function seedPriorities(specs) {
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

// Append a row + a single give, returning the new row's id (the common UI path).
function addTrade(getLabel, give) {
  useM6Store.getState().addTradeOff({ get: { label: getLabel, sourceId: null } });
  const rows = useM6Store.getState().tradeOffs.rows;
  const rowId = rows[rows.length - 1].id;
  if (give) useM6Store.getState().addGiveToTrade(rowId, give);
  return rowId;
}

beforeEach(() => {
  localStorage.clear();
  useM6Store.getState().resetTradeOffs();
  useM6Store.getState().resetPriorities();
  useBlueprintStore.getState().resetBlueprint();
});

// ── buildTradeOffsPayload — pure (§7 payload contract) ──────────────────────────

describe('buildTradeOffsPayload — pure', () => {
  it('returns [] for an empty list (and tolerates non-arrays)', () => {
    expect(buildTradeOffsPayload([])).toEqual([]);
    expect(buildTradeOffsPayload(undefined)).toEqual([]);
    expect(buildTradeOffsPayload(null)).toEqual([]);
  });

  it('one complete row → [{ get, give }] with both as plain strings', () => {
    const rows = [
      {
        id: 'r1',
        get: { label: 'Primary residence', sourceId: null },
        give: [{ id: 'g1', label: 'Vacation home', value: null, source: 'free-text', sourceId: null }],
      },
    ];
    const out = buildTradeOffsPayload(rows);
    expect(out).toEqual([{ get: 'Primary residence', give: 'Vacation home' }]);
    expect(typeof out[0].get).toBe('string');
    expect(typeof out[0].give).toBe('string');
  });

  it('drops a row that has a get but zero gives', () => {
    const rows = [{ id: 'r1', get: { label: 'House', sourceId: null }, give: [] }];
    expect(buildTradeOffsPayload(rows)).toEqual([]);
  });

  it('drops a row that has gives but no get (blank or missing get.label)', () => {
    expect(
      buildTradeOffsPayload([{ id: 'r1', get: { label: '   ', sourceId: null }, give: [{ label: 'Cash' }] }]),
    ).toEqual([]);
    expect(buildTradeOffsPayload([{ id: 'r2', give: [{ label: 'Cash' }] }])).toEqual([]);
  });

  it('joins a multi-give row into ONE string ("A + B"), not an array', () => {
    const rows = [
      {
        id: 'r1',
        get: { label: 'House', sourceId: null },
        give: [
          { id: 'g1', label: 'Vacation home', value: null, source: 'free-text', sourceId: null },
          { id: 'g2', label: 'Boat', value: null, source: 'free-text', sourceId: null },
        ],
      },
    ];
    const out = buildTradeOffsPayload(rows);
    expect(out).toEqual([{ get: 'House', give: 'Vacation home + Boat' }]);
    expect(typeof out[0].give).toBe('string');
    expect(Array.isArray(out[0].give)).toBe(false);
  });

  it('never carries value, source, sourceId, or the in-tool note into the payload', () => {
    const rows = [
      {
        id: 'r1',
        get: { label: 'House', sourceId: 'p1' },
        give: [{ id: 'g1', label: 'Cash', value: 50000, source: 'm2-asset', sourceId: 'a1' }],
        note: 'private reason just for me',
      },
    ];
    const out = buildTradeOffsPayload(rows);
    expect(Object.keys(out[0]).sort()).toEqual(['get', 'give']);
    expect(out[0]).not.toHaveProperty('note');
    expect(out[0]).not.toHaveProperty('value');
    expect(out[0]).not.toHaveProperty('source');
    expect(out[0]).not.toHaveProperty('sourceId');
  });
});

// ── selectTradeableGives — pure, allowlist (§7 give source) ──────────────────────

describe('selectTradeableGives — asset allowlist (give source)', () => {
  it('returns only the 8 asset categories, mapped to { id, label, value } from currentValue', () => {
    const items = [
      { id: 'a1', category: 'realEstate', description: 'House', currentValue: 500000 },
      { id: 'a2', category: 'workingCapital', description: 'Checking', currentValue: 10000 },
      { id: 'a3', category: 'retirement', description: '401(k)', currentValue: 200000 },
      { id: 'a4', category: 'pensions', description: 'Pension', currentValue: 0 },
      { id: 'a5', category: 'stockOptions', description: 'RSUs', currentValue: 50000 },
      { id: 'a6', category: 'corporateIncentives', description: 'Bonus plan', currentValue: 12000 },
      { id: 'a7', category: 'businessInterests', description: 'LLC stake', currentValue: 300000 },
      { id: 'a8', category: 'otherAssets', description: 'Art', currentValue: 8000 },
    ];
    const gives = selectTradeableGives(m2(items));
    expect(gives.map((g) => g.label)).toEqual([
      'House', 'Checking', '401(k)', 'Pension', 'RSUs', 'Bonus plan', 'LLC stake', 'Art',
    ]);
    const byLabel = Object.fromEntries(gives.map((g) => [g.label, g.value]));
    expect(byLabel['House']).toBe(500000);
    expect(byLabel['Art']).toBe(8000);
    // value = Number(currentValue) || null → a 0 value reads as null.
    expect(byLabel['Pension']).toBeNull();
    // id is carried through (sourceId for the snapshot + react key).
    expect(gives[0].id).toBe('a1');
  });

  it('excludes liabilities AND personalProperty (fails safe via the allowlist)', () => {
    const items = [
      { id: 'a1', category: 'realEstate', description: 'House', currentValue: 500000 },
      { id: 'l1', category: 'loans', description: 'Car loan', currentValue: 15000 },
      { id: 'l2', category: 'creditCards', description: 'Visa', currentValue: 3000 },
      { id: 'l3', category: 'otherDebt', description: 'IOU', currentValue: 2000 },
      { id: 'p1', category: 'personalProperty', description: 'Living-room couch', currentValue: 400 },
      { id: 'x1', category: 'someFutureCategory', description: 'Mystery', currentValue: 100 },
    ];
    const gives = selectTradeableGives(m2(items));
    expect(gives.map((g) => g.label)).toEqual(['House']);
    expect(gives.find((g) => g.label === 'Living-room couch')).toBeUndefined();
    expect(gives.find((g) => g.label === 'Car loan')).toBeUndefined();
    expect(gives.find((g) => g.label === 'Mystery')).toBeUndefined();
  });

  it('drops blank-description rows and tolerates a missing/empty inventory', () => {
    const items = [
      { id: 'a1', category: 'realEstate', description: '   ', currentValue: 100000 },
      { id: 'a2', category: 'otherAssets', description: '', currentValue: 5000 },
      { id: 'a3', category: 'retirement', description: 'IRA', currentValue: 75000 },
    ];
    expect(selectTradeableGives(m2(items)).map((g) => g.label)).toEqual(['IRA']);
    expect(selectTradeableGives(undefined)).toEqual([]);
    expect(selectTradeableGives({})).toEqual([]);
    expect(selectTradeableGives(m2([]))).toEqual([]);
  });
});

// ── selectSecureGets — pure (§7 get source) ─────────────────────────────────────

describe('selectSecureGets — secure priorities (get source)', () => {
  it('returns must-have + would-like only (no willing-to-trade, no unsorted)', () => {
    seedPriorities([
      { item: 'House', importance: 'must-have' },
      { item: 'Cabin', importance: 'would-like' },
      { item: 'Frequent-flyer miles', importance: 'willing-to-trade' },
      { item: 'Loose end', importance: 'unsorted' },
    ]);
    const gets = selectSecureGets(useM6Store.getState());
    expect(gets.map((g) => g.label)).toEqual(['House', 'Cabin']);
    expect(gets.find((g) => g.label === 'Frequent-flyer miles')).toBeUndefined();
    expect(gets.find((g) => g.label === 'Loose end')).toBeUndefined();
    // each get carries an id (sourceId for the snapshot + react key).
    expect(typeof gets[0].id).toBe('string');
  });

  it('tolerates a missing/empty priorities slice', () => {
    expect(selectSecureGets(undefined)).toEqual([]);
    expect(selectSecureGets({})).toEqual([]);
    expect(selectSecureGets(useM6Store.getState())).toEqual([]);
  });
});

// ── tradeOffs slice actions ─────────────────────────────────────────────────────

describe('useM6Store — tradeOffs slice actions', () => {
  it('initializes the tradeOffs slice as { rows: [] }', () => {
    expect(useM6Store.getState().tradeOffs).toEqual({ rows: [] });
  });

  it('addTradeOff trims the get label, rejects a blank get, and starts with empty gives', () => {
    useM6Store.getState().addTradeOff({ get: { label: '  Primary residence  ', sourceId: 'p1' } });
    useM6Store.getState().addTradeOff({ get: { label: '   ', sourceId: null } });
    useM6Store.getState().addTradeOff({ get: { label: '', sourceId: null } });
    const { rows } = useM6Store.getState().tradeOffs;
    expect(rows).toHaveLength(1);
    expect(rows[0].get).toEqual({ label: 'Primary residence', sourceId: 'p1' });
    expect(rows[0].give).toEqual([]);
    expect(typeof rows[0].id).toBe('string');
  });

  it('addGiveToTrade snapshots the give (label/value/source/sourceId), trims, and rejects a blank label', () => {
    const rowId = addTrade('House', null);
    useM6Store.getState().addGiveToTrade(rowId, { label: '  Vacation home  ', value: 250000, source: 'm2-asset', sourceId: 'a1' });
    useM6Store.getState().addGiveToTrade(rowId, { label: '   ', value: null, source: 'free-text', sourceId: null });
    const give = useM6Store.getState().tradeOffs.rows[0].give;
    expect(give).toHaveLength(1);
    expect(give[0]).toMatchObject({ label: 'Vacation home', value: 250000, source: 'm2-asset', sourceId: 'a1' });
    expect(typeof give[0].id).toBe('string');
  });

  it('coerces a non-finite give value to null and defaults an unknown source to free-text', () => {
    const rowId = addTrade('House', null);
    useM6Store.getState().addGiveToTrade(rowId, { label: 'Cash', value: NaN, source: 'bogus', sourceId: null });
    const give = useM6Store.getState().tradeOffs.rows[0].give[0];
    expect(give.value).toBeNull();
    expect(give.source).toBe('free-text');
  });

  it('removeGiveFromTrade removes a single give by its id', () => {
    const rowId = addTrade('House', null);
    useM6Store.getState().addGiveToTrade(rowId, { label: 'Boat', value: null, source: 'free-text', sourceId: null });
    useM6Store.getState().addGiveToTrade(rowId, { label: 'Cabin', value: null, source: 'free-text', sourceId: null });
    const [g1] = useM6Store.getState().tradeOffs.rows[0].give;
    useM6Store.getState().removeGiveFromTrade(rowId, g1.id);
    expect(useM6Store.getState().tradeOffs.rows[0].give.map((g) => g.label)).toEqual(['Cabin']);
  });

  it('updateTradeOffNote sets and clamps the note to 140 chars', () => {
    const rowId = addTrade('House', null);
    useM6Store.getState().updateTradeOffNote(rowId, 'x'.repeat(200));
    expect(useM6Store.getState().tradeOffs.rows[0].note).toHaveLength(140);
  });

  it('removeTradeOff drops the row; resetTradeOffs clears all', () => {
    const r1 = addTrade('House', { label: 'Cash', value: null, source: 'free-text', sourceId: null });
    addTrade('Car', { label: 'Furniture', value: null, source: 'free-text', sourceId: null });
    useM6Store.getState().removeTradeOff(r1);
    expect(useM6Store.getState().tradeOffs.rows.map((r) => r.get.label)).toEqual(['Car']);
    useM6Store.getState().resetTradeOffs();
    expect(useM6Store.getState().tradeOffs.rows).toEqual([]);
  });

  it('reorderTradeOffs reorders by a permutation of row ids and rejects a non-permutation (no-op)', () => {
    const r1 = addTrade('House', null);
    const r2 = addTrade('Car', null);
    useM6Store.getState().reorderTradeOffs([r2, r1]);
    expect(useM6Store.getState().tradeOffs.rows.map((r) => r.get.label)).toEqual(['Car', 'House']);
    // not a permutation (unknown id) → no-op
    useM6Store.getState().reorderTradeOffs([r2, 'bogus']);
    expect(useM6Store.getState().tradeOffs.rows.map((r) => r.get.label)).toEqual(['Car', 'House']);
  });
});

// ── saveTradeOffsToBlueprint — multi-source §10 write ───────────────────────────

describe('useM6Store — saveTradeOffsToBlueprint (multi-source §10 write)', () => {
  it('writes the tradeOffs slot and preserves a pre-existing priorities slot (rolls up to complete)', () => {
    // Pre-seed the OTHER feeder slot with a non-empty payload.
    useBlueprintStore
      .getState()
      .updateNegotiationStrategy('priorities', [{ item: 'House', importance: 'must-have', rank: 1 }]);

    const rowId = addTrade('Primary residence', {
      label: 'Vacation home', value: null, source: 'free-text', sourceId: null,
    });
    expect(rowId).toBeTruthy();

    const ret = useM6Store.getState().saveTradeOffsToBlueprint();
    const s10 = useBlueprintStore.getState().sections.s10;
    expect(s10.data.priorities).toEqual([{ item: 'House', importance: 'must-have', rank: 1 }]); // not clobbered
    expect(s10.data.tradeOffs).toEqual([{ get: 'Primary residence', give: 'Vacation home' }]);
    expect(s10.status).toBe('complete'); // both slots populated
    expect(ret.status).toBe('complete');
  });

  it('a single complete trade with no priorities reports partial', () => {
    addTrade('House', { label: 'Cash savings', value: null, source: 'free-text', sourceId: null });
    const ret = useM6Store.getState().saveTradeOffsToBlueprint();
    expect(ret.status).toBe('partial');
    expect(useBlueprintStore.getState().sections.s10.data.tradeOffs).toEqual([
      { get: 'House', give: 'Cash savings' },
    ]);
  });

  it('clear-all path: resetTradeOffs then save writes [] (empty when no priorities)', () => {
    addTrade('House', { label: 'Cash', value: null, source: 'free-text', sourceId: null });
    useM6Store.getState().saveTradeOffsToBlueprint();
    useM6Store.getState().resetTradeOffs();
    const ret = useM6Store.getState().saveTradeOffsToBlueprint();
    expect(useBlueprintStore.getState().sections.s10.data.tradeOffs).toEqual([]);
    expect(ret.status).toBe('empty');
  });

  it('an incomplete trade (get, no gives) contributes nothing to the payload', () => {
    addTrade('House', null); // get only, no gives
    const ret = useM6Store.getState().saveTradeOffsToBlueprint();
    expect(useBlueprintStore.getState().sections.s10.data.tradeOffs).toEqual([]);
    expect(ret.status).toBe('empty');
  });
});

// ── Snapshot integrity (§7: a saved trade must not mutate with its source) ───────

describe('useM6Store — snapshot integrity', () => {
  it('renaming the source priority or asset upstream does not change a saved row', () => {
    seedPriorities([{ item: 'House', importance: 'must-have' }]);
    const gets = selectSecureGets(useM6Store.getState());
    useM6Store.getState().addTradeOff({ get: { label: gets[0].label, sourceId: gets[0].id } });
    const rowId = useM6Store.getState().tradeOffs.rows[0].id;

    const asset = { id: 'a1', category: 'realEstate', description: 'Vacation home', currentValue: 250000 };
    const gives = selectTradeableGives(m2([asset]));
    useM6Store.getState().addGiveToTrade(rowId, {
      label: gives[0].label, value: gives[0].value, source: 'm2-asset', sourceId: gives[0].id,
    });

    // Mutate both upstream sources.
    useM6Store.getState().updatePriority(gets[0].id, { item: 'Houseboat' });
    asset.description = 'Beach condo';
    asset.currentValue = 999999;

    const row = useM6Store.getState().tradeOffs.rows[0];
    expect(row.get.label).toBe('House');
    expect(row.give[0].label).toBe('Vacation home');
    expect(row.give[0].value).toBe(250000);
  });
});

// ── Privacy invariant (give-side mirror of the §10 priorities guard) ─────────────

describe('useM6Store — willing-to-trade privacy invariant', () => {
  it('a willing-to-trade priority is never a give source and never reaches the payload', () => {
    seedPriorities([
      { item: 'House', importance: 'must-have' },
      { item: 'Frequent-flyer miles', importance: 'willing-to-trade' },
    ]);

    // selectTradeableGives reads M2 only — never priorities.
    expect(selectTradeableGives(m2([]))).toEqual([]);
    const sneaky = {
      priorities: useM6Store.getState().priorities, // willing-to-trade lives here
      maritalEstateInventory: { items: [] },
    };
    expect(selectTradeableGives(sneaky)).toEqual([]);

    // selectSecureGets (the get source) also excludes willing-to-trade.
    expect(
      selectSecureGets(useM6Store.getState()).find((g) => g.label === 'Frequent-flyer miles'),
    ).toBeUndefined();

    // Build + save a legitimate trade. The WT text appears nowhere in the payload.
    const rowId = addTrade('House', { label: 'Cash savings', value: null, source: 'free-text', sourceId: null });
    expect(rowId).toBeTruthy();
    useM6Store.getState().saveTradeOffsToBlueprint();
    const tradeOffs = useBlueprintStore.getState().sections.s10.data.tradeOffs;
    expect(tradeOffs).toEqual([{ get: 'House', give: 'Cash savings' }]);
    expect(JSON.stringify(tradeOffs)).not.toContain('Frequent-flyer miles');
  });
});
