/**
 * ACTIVE derivation — single source of truth for which card carries the gold
 * glow and which section the "up next" sidebar points to.
 *
 * Rule (Phase 1 ACTIVE rule, confirmed):
 *   The ACTIVE section is the FIRST card whose underlying store status is NOT
 *   `'complete'`, traversed in the visual card order (SCHEMATIC_CARDS). When
 *   every section is `'complete'`, NO card is active (the Blueprint is done —
 *   there is no "what writes next" sentinel).
 *
 * Tie-break: the natural card order in `SCHEMATIC_CARDS` (Zone A→B→C→D, design
 * order within each zone). Deterministic and stable.
 *
 * Returns: the storeKey of the active card (e.g. 's2'), or `null` if all
 * sections are `'complete'` or the input is missing.
 */

import { SCHEMATIC_CARDS } from './sections';

export function deriveActiveStoreKey(sections) {
  if (!sections || typeof sections !== 'object') return null;
  for (const card of SCHEMATIC_CARDS) {
    const status = sections[card.storeKey]?.status;
    if (status !== 'complete') return card.storeKey;
  }
  return null;
}
