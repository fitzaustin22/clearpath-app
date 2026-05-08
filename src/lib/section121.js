// src/lib/section121.js
//
// IRC §121 primary residence capital gains exclusion utility.
// Source of truth per M5-Tool-Specs.md §5.3 (locked signature) + §10.3.
// Extracted from M4 TAV (CostBasisEntryPanel.jsx) per build sequence step 1.

const SINGLE_EXCLUSION_CAP = 250_000;
const MFJ_EXCLUSION_CAP = 500_000;

/**
 * IRC §121 primary residence capital gains exclusion.
 *
 * Single filers can exclude up to $250K of gain on the sale of a primary
 * residence; MFJ up to $500K. Excluded amount is capped at the gain itself
 * (cannot exclude a loss). Taxable gain is gain minus excluded amount,
 * floored at zero.
 *
 * Caller is responsible for the §121 eligibility gate (use test, ownership
 * test, primary-residence flag). The utility itself does no eligibility
 * check — calling it on a non-primary-residence asset will return non-zero
 * exclusion if the caller didn't filter.
 *
 * Filing status defaults to single semantics for any value other than 'mfj'
 * (including null and undefined). This matches M4 TAV's pre-extraction
 * behavior where `costBasisFilingStatus === 'mfj' ? 500000 : 250000`
 * produced the single-filer cap (250K) for any non-'mfj' value, including
 * the initial-mount null state.
 *
 * @param {Object} args
 * @param {number} args.gain - realized capital gain (FMV − cost basis); negative permitted (returns zeroed)
 * @param {'single'|'mfj'|null|undefined} args.filingStatusAtSale - filing status at the time of sale
 * @returns {{ excludedAmount: number, taxableGain: number }}
 */
export function calculateSection121Exclusion({ gain, filingStatusAtSale }) {
  const cap = filingStatusAtSale === 'mfj' ? MFJ_EXCLUSION_CAP : SINGLE_EXCLUSION_CAP;
  const excludedAmount = Math.max(0, Math.min(gain, cap));
  const taxableGain = Math.max(0, gain - excludedAmount);
  return { excludedAmount, taxableGain };
}
