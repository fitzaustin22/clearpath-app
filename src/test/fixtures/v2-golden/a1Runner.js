/**
 * A1 recompute runner — Phase 1 SKELETON with data-driven pin gating.
 *
 * Spec §4-A1 + Phase 1 scope: the runner inspects ACTUAL slot state per
 * fixture. Any fixture containing 'PIN_PENDING_FITZ' slots → refuse, naming
 * the unpinned slots (the harness must not run A1 against unverified
 * expectations). Any fully-pinned fixture (including zero-slot F4) → execute
 * the recompute path: each pinned slot dispatches to a registered recomputer
 * that re-derives the value INDEPENDENTLY from the fixture source-of-truth
 * JSON (never from store state). Slots without a registered recomputer report
 * 'recompute_not_implemented_phase2' — full A1 100% is the Phase 2 gate.
 */
import { LIABILITY_KEYS } from '@/src/lib/m2Sections';

export const PIN_LITERAL = 'PIN_PENDING_FITZ';

/** §3 inventory footing — assets (incl. personal property) from fixture JSON. */
function recomputeInventoryAssetFooting(fixture) {
  const mei = fixture.stores?.['m2-store']?.maritalEstateInventory;
  const ppi = fixture.stores?.['m2-store']?.personalPropertyInventory;
  let total = 0;
  for (const item of mei?.items || []) {
    if (LIABILITY_KEYS.has(item.category)) continue; // LIABILITY_KEYS is a Set (m2Sections.js:102)
    total += Number(item.currentValue) || 0;
  }
  for (const room of ppi?.rooms || []) {
    for (const item of room.items || []) total += (Number(item.currentValue) || 0) * (item.quantity || 1);
  }
  for (const item of ppi?.highValueItems || []) total += (Number(item.currentValue) || 0) * (item.quantity || 1);
  return total;
}

/**
 * Slot-name → recomputer registry (numeric lane). One real recomputer
 * establishes the pattern (both fixture spellings of the §3 footing slot);
 * the remaining slots register as named Phase 2 work so a pinned fixture
 * reports them honestly instead of pretending coverage.
 */
export const SLOT_RECOMPUTERS = {
  s3InventoryTotalFooting: recomputeInventoryAssetFooting,
  s3InventoryTotalsFooting: recomputeInventoryAssetFooting,
};

/**
 * Categorical lane: slotName → (fixture) => string. Audit truths that are
 * labels, not numbers (readiness tier, AAML duration band), live in the
 * fixture's `auditAssertions` block and compare strict === against the
 * model/engine-derived categorical. Empty at Phase 1 — real categorical
 * recomputers are Phase 2 scope, so pinned categorical slots report as
 * named Phase 2 work, exactly like unregistered numeric slots.
 */
export const CATEGORICAL_RECOMPUTERS = {};

export function runA1(fixture) {
  const pins = fixture.auditPins || {};
  const assertions = fixture.auditAssertions || {};

  // Pending slots in EITHER lane refuse the run — numeric pins first, then
  // categorical assertions (consumers rely on this merge order).
  const unpinnedSlots = [...Object.entries(pins), ...Object.entries(assertions)]
    .filter(([, v]) => v === PIN_LITERAL)
    .map(([slot]) => slot);

  if (unpinnedSlots.length > 0) {
    return {
      fixtureId: fixture.fixtureId,
      status: 'refused',
      reason: `A1 refuses to run with unpinned audit slots: ${unpinnedSlots.join(', ')}`,
      unpinnedSlots,
    };
  }

  const numericResults = Object.entries(pins).map(([slot, pinnedValue]) => {
    const recompute = SLOT_RECOMPUTERS[slot];
    if (!recompute) return { slot, status: 'recompute_not_implemented_phase2', pinnedValue };
    const recomputed = recompute(fixture);
    return {
      slot,
      status: recomputed === pinnedValue ? 'match' : 'mismatch',
      recomputed,
      pinnedValue,
    };
  });

  const categoricalResults = Object.entries(assertions).map(([slot, pinnedValue]) => {
    const recompute = CATEGORICAL_RECOMPUTERS[slot];
    if (!recompute) return { slot, status: 'recompute_not_implemented_phase2', pinnedValue };
    const recomputed = recompute(fixture);
    return {
      slot,
      status: recomputed === pinnedValue ? 'match' : 'mismatch',
      recomputed,
      pinnedValue,
    };
  });

  return {
    fixtureId: fixture.fixtureId,
    status: 'executed',
    results: [...numericResults, ...categoricalResults],
  };
}
