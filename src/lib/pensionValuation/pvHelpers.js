/**
 * Type-narrow helpers for the discriminated-union pv field per [R5b-16].
 *
 * The `results.pv` shape varies by path:
 *   - Tier 1/2, In-Pay, Cash Balance (no coverture): `{ best, low, high }`
 *   - Tier 3, Cash Balance (with coverture):        `{ total: {best,low,high}, marital: {best,low,high} }`
 *   - Flag-only:                                     `null`
 *
 * These helpers absorb the union-narrow check so consumers (Blueprint §3,
 * QDRO Decision Guide, M4 PIT) don't reimplement the same pattern.
 */

/**
 * Returns the headline PV figure for any path:
 *   - For non-coverture paths: `pv.best`.
 *   - For coverture paths:     `pv.total.best`.
 *   - For flag_only:           `null`.
 *
 * @param {object | null | undefined} results
 * @returns {number | null}
 */
export function getHeadlinePV(results) {
  if (!results || results.pv === null) return null;
  if (results.coverture !== null) return results.pv.total.best;
  return results.pv.best;
}

/**
 * Returns the marital-portion PV for coverture paths.
 *   - For coverture paths:    `pv.marital.best`.
 *   - For non-coverture paths: `null` (no marital narrowing).
 *   - For flag_only:          `null`.
 *
 * @param {object | null | undefined} results
 * @returns {number | null}
 */
export function getMaritalPV(results) {
  if (!results || results.pv === null || results.coverture === null) return null;
  return results.pv.marital.best;
}
