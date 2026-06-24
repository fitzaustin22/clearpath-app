// Estate division math for the Marital Estate Inventory "Guided Path" UI.
//
// This is a thin, README-faithful (`rollup` / `computeTotals`) presentation
// layer over the FROZEN m2Store division model. It does NOT introduce a new
// allocation axis — it reads the existing `titleholder` field and applies the
// exact same rules the store's `recomputeSummary` and `m2Sections`'
// `computeCategoryTotals` already use, so the screen, the persisted store
// summary, and the Blueprint §3 payload all agree by construction. The
// reconciliation test in __tests__/estateRollup.test.js proves the equality.
//
// Two allocation lenses per item:
//   • intentAlloc    — the user's raw `titleholder` choice (drives the
//                      segmented control's selected pill; always responsive).
//   • effectiveAlloc — `titleholder` GATED by classification (disputed/unknown
//                      classification → unallocated, matching the store). Drives
//                      the dollars that flow into category totals + the estate.
// For a classified item the two agree; they only diverge for an item that
// cannot yet be classified (no marriage/acquisition date) or is disputed —
// which the store already excludes from the client/spouse columns.

import { LIABILITY_KEYS } from '@/src/lib/m2Sections';

// Net value: assets net the loan held against them; a liability's currentValue
// IS the balance owed (its outstandingBalance field is unused). Mirrors
// recomputeSummary() / computeCategoryTotals().
export function itemNetValue(item) {
  const isLiab = LIABILITY_KEYS.has(item.category);
  const cv = Number(item.currentValue) || 0;
  const ob = Number(item.outstandingBalance) || 0;
  return isLiab ? cv : cv - ob;
}

// Raw titleholder → division axis, no classification gate.
export function intentAlloc(item) {
  switch (item.titleholder) {
    case 'self':
      return 'you';
    case 'spouse':
      return 'spouse';
    case 'joint':
      return 'split';
    default:
      return 'unalloc'; // 'other' | 'unknown' | undefined
  }
}

// Effective division axis: classification override first (disputed/unknown go
// to unallocated regardless of titleholder), then the titleholder map.
export function effectiveAlloc(item) {
  if (item.classification === 'disputed' || item.classification === 'unknown') {
    return 'unalloc';
  }
  return intentAlloc(item);
}

// Division axis → the frozen titleholder field the control writes back.
const ALLOC_TO_TITLEHOLDER = {
  you: 'self',
  spouse: 'spouse',
  split: 'joint',
  unalloc: 'unknown',
};
export function titleholderForAlloc(alloc) {
  return ALLOC_TO_TITLEHOLDER[alloc] || 'unknown';
}

// One-sided proportions for a single item's split bar. `split` reads as an
// equal you/spouse bar (each side carries value/2 in the rollup).
export function allocOneSided(alloc) {
  if (alloc === 'you') return { you: 1, spouse: 0, unalloc: 0 };
  if (alloc === 'spouse') return { you: 0, spouse: 1, unalloc: 0 };
  if (alloc === 'split') return { you: 1, spouse: 1, unalloc: 0 };
  return { you: 0, spouse: 0, unalloc: 1 };
}

// Aggregate a list of store items into { you, spouse, unalloc, total } using
// net value + effectiveAlloc. A `split` item contributes value/2 to each side.
export function rollup(items) {
  let you = 0;
  let spouse = 0;
  let unalloc = 0;
  let total = 0;
  for (const item of items || []) {
    const net = itemNetValue(item);
    if (net === 0) continue;
    total += net;
    const alloc = effectiveAlloc(item);
    if (alloc === 'you') you += net;
    else if (alloc === 'spouse') spouse += net;
    else if (alloc === 'split') {
      you += net / 2;
      spouse += net / 2;
    } else unalloc += net;
  }
  return { you, spouse, unalloc, total };
}

function pct(part, whole) {
  return whole !== 0 ? Math.round((part / whole) * 100) : 0;
}

// Whole-estate rollup: split items by asset/liability, net each side, derive
// allocation percentages (guarded against divide-by-zero). `net` is the
// "Estate so far" you/spouse/unalloc the navy box + review cards display.
export function computeTotals(items) {
  const assetItems = [];
  const liabItems = [];
  for (const item of items || []) {
    if (LIABILITY_KEYS.has(item.category)) liabItems.push(item);
    else assetItems.push(item);
  }
  const assets = rollup(assetItems);
  const liabilities = rollup(liabItems);
  const net = {
    you: assets.you - liabilities.you,
    spouse: assets.spouse - liabilities.spouse,
    unalloc: assets.unalloc - liabilities.unalloc,
    total: assets.total - liabilities.total,
  };
  const allocated = net.you + net.spouse;
  return {
    assets,
    liabilities,
    net,
    allocated,
    youPct: pct(net.you, allocated),
    spousePct: pct(net.spouse, allocated),
  };
}

// Adapt a store category total { total, client, spouse, unallocated } to the
// SplitBar's { you, spouse, unalloc, total }. Used for the per-category bars in
// the stepper rail and the review step, which read straight from
// computeCategoryTotals (PP merged) so they match the persisted summary.
export function splitFromCategoryTotals(cat) {
  const c = cat || {};
  return {
    you: c.client || 0,
    spouse: c.spouse || 0,
    unalloc: c.unallocated || 0,
    total: c.total || 0,
  };
}
