// src/lib/homeDecision/mfjDifferentialFootnote.js
//
// Q-9 MFJ-vs-Single differential for the Deferred-sale scenario per
// M5-Tool-Specs.md §9.5.3.
//
// Deferred-sale §121 is hard-locked to Single in v1 (Q-9). The MFJ differential
// is computed as a footnote — surfaced in §9.8 narrative copy but never replaces
// the Single result as the primary projected value. Result is bounded:
// 0 ≤ differential ≤ $250,000 (the MFJ exclusion adds at most $250k beyond
// the Single $250k floor).

import { calculateSection121Exclusion } from '../section121';

const MFJ_DIFFERENTIAL_CAP = 250_000;

/**
 * @param {Object} args
 * @param {number} args.gainAtSale - realized capital gain at projected sale year (saleFMV − costBasis)
 * @returns {{
 *   exclusionSingle: number,
 *   exclusionMfj: number,
 *   differential: number,
 *   isBoundedAt250k: boolean
 * }}
 */
export function calculateMfjDifferential({ gainAtSale }) {
  const { excludedAmount: exclusionSingle } = calculateSection121Exclusion({
    gain: gainAtSale,
    filingStatusAtSale: 'single',
  });
  const { excludedAmount: exclusionMfj } = calculateSection121Exclusion({
    gain: gainAtSale,
    filingStatusAtSale: 'mfj',
  });
  const differential = Math.max(0, exclusionMfj - exclusionSingle);
  return {
    exclusionSingle,
    exclusionMfj,
    differential,
    isBoundedAt250k: differential === MFJ_DIFFERENTIAL_CAP,
  };
}
