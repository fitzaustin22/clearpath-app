/**
 * Shared "is this a genuine, displayable PV result?" predicate.
 *
 * Single source of truth for the residual-risk guard first added to
 * ResultsPanel (a blank required numeric reaches the frozen engine as
 * `null`, which arithmetic silently coerces to a FINITE 0 rather than NaN —
 * `null * 12 * af * deferralFactor === 0` — so a confident "$0"/"valued"
 * signal would otherwise render instead of a broken result). Reused by
 * PVA.jsx to decide whether a Calculate click's result is genuine enough to
 * persist at all — the same predicate that governs the on-screen placeholder
 * must govern the "valued" tag in the pension list, or the two can drift.
 *
 * Checked against the headline/TOTAL figure (never legitimately $0 for a real
 * pension), not the marital figure — marital legitimately IS $0 when
 * coverture.fraction === 0 (see TC-PVA-Results-4). flag_only legitimately has
 * no PV at all and is excluded — callers handle that path separately.
 */

import { getHeadlinePV } from '@/src/lib/pensionValuation';

/**
 * @param {object | null | undefined} results
 * @returns {boolean}
 */
export function hasGenuinePV(results) {
  if (!results || results.path === 'flag_only') return false;
  const headlinePV = getHeadlinePV(results);
  return Number.isFinite(headlinePV) && headlinePV !== 0;
}
