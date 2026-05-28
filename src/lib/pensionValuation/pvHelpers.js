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

/**
 * Range-aware sibling of `getHeadlinePV` per PR-B2-α / §8.6.2. Returns
 * `{ best, low, high }` for the headline PV in any path:
 *   - Non-coverture: pulls from `pv.{best, low, high}`.
 *   - Coverture:     pulls from `pv.total.{best, low, high}`.
 *   - Flag-only:     null (no PV to range).
 *
 * QDRO §8.6.2 / §8.6.5 consumers render the "(range $low–$high)" disclosure
 * via this helper; they MUST NOT dereference the `pv` union themselves.
 *
 * @param {object | null | undefined} results
 * @returns {{ best: number, low: number, high: number } | null}
 */
export function getHeadlinePVRange(results) {
  if (!results || results.pv === null) return null;
  if (results.coverture !== null) {
    const { best, low, high } = results.pv.total;
    return { best, low, high };
  }
  const { best, low, high } = results.pv;
  return { best, low, high };
}

/**
 * Range-aware sibling of `getMaritalPV` per PR-B2-α / §8.6.2. Returns
 * `{ best, low, high }` of `pv.marital` for coverture paths; null otherwise
 * (no-coverture has no marital narrowing; flag-only has no PV).
 *
 * @param {object | null | undefined} results
 * @returns {{ best: number, low: number, high: number } | null}
 */
export function getMaritalPVRange(results) {
  if (!results || results.pv === null || results.coverture === null) return null;
  const { best, low, high } = results.pv.marital;
  return { best, low, high };
}
