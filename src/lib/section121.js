// src/lib/section121.js
//
// IRC §121 primary residence capital gains exclusion utility.
// Source of truth per M5-Tool-Specs.md §5.3 (locked signature) + §10.3.
// Extracted from M4 TAV (CostBasisEntryPanel.jsx) per build sequence step 1.
//
// §121(c) REDUCED MAXIMUM (partial exclusion), added 2026-06-10:
// When the 2-of-5-year ownership/use tests are not met, §121(c) substitutes a
// reduced maximum exclusion: fullCap × (qualifyingMonths / 24), where
// qualifyingMonths is the shorter of the ownership and use periods. The
// reduced maximum is available only for sales whose failure to meet the
// 24-month tests stems from a change in place of employment, health, or
// unforeseen circumstances — Treas. Reg. § 1.121-3 — and divorce/legal
// separation is an enumerated unforeseen circumstance (§ 1.121-3(e)(2)(iii)(D)).
// This product operates exclusively in the divorce context, so the
// qualification is CATEGORICAL here: no user-facing "qualifying reason" input
// exists by design, and the registry's irc_121 scope note should carry this
// nuance rather than the UI. Callers that cannot supply period facts simply
// omit them and receive the pre-§121(c) full-cap behavior unchanged.
//
// Months convention: callers pass MONTH COUNTS. Where a caller derives months
// from calendar dates it must reuse tier3Coverture's monthsBetween convention
// (src/lib/pensionValuation/tier3Coverture.js:47-52) rather than writing a
// second months implementation. No date math is implemented here because no
// current §121 caller holds dates (HDA carries year-granularity facts and
// converts years × 12). [R5c-9]-style parallel-structure debt: when a
// date-bearing caller arrives (e.g. cost-basis flows reading m2
// dateAcquired), export monthsBetween from tier3Coverture and consume it
// there — do not fork the convention.

const SINGLE_EXCLUSION_CAP = 250_000;
const MFJ_EXCLUSION_CAP = 500_000;
const FULL_EXCLUSION_QUALIFYING_MONTHS = 24;

/**
 * IRC §121 primary residence capital gains exclusion.
 *
 * Single filers can exclude up to $250K of gain on the sale of a primary
 * residence; MFJ up to $500K. Excluded amount is capped at the gain itself
 * (cannot exclude a loss). Taxable gain is gain minus excluded amount,
 * floored at zero.
 *
 * §121(c): when ownership/use month counts are provided and the shorter
 * period is under 24 months, the cap is prorated to
 * fullCap × (qualifyingMonths / 24). Non-finite or omitted month inputs are
 * ignored; with neither period supplied the full cap applies (legacy
 * behavior, byte-identical to the pre-§121(c) implementation).
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
 * @param {number} [args.ownershipMonths] - months the residence was owned (§121(c); calendar-month convention)
 * @param {number} [args.useMonths] - months used as principal residence (§121(c); calendar-month convention)
 * @returns {{ excludedAmount: number, taxableGain: number }}
 */
export function calculateSection121Exclusion({
  gain,
  filingStatusAtSale,
  ownershipMonths,
  useMonths,
}) {
  const fullCap = filingStatusAtSale === 'mfj' ? MFJ_EXCLUSION_CAP : SINGLE_EXCLUSION_CAP;
  const periods = [ownershipMonths, useMonths].filter((m) => Number.isFinite(m));
  const qualifyingMonths = periods.length === 0 ? null : Math.max(0, Math.min(...periods));
  const cap =
    qualifyingMonths === null || qualifyingMonths >= FULL_EXCLUSION_QUALIFYING_MONTHS
      ? fullCap
      : fullCap * (qualifyingMonths / FULL_EXCLUSION_QUALIFYING_MONTHS);
  const excludedAmount = Math.max(0, Math.min(gain, cap));
  const taxableGain = Math.max(0, gain - excludedAmount);
  return { excludedAmount, taxableGain };
}
