/**
 * Shared currency formatter — extracted from PVA's inline `formatUSD` so
 * QDRO §8.6.2 (and any future consumer) can reuse the same wording without
 * a hand-roll (PR-B2-α discipline).
 *
 * Consumers:
 *   - src/components/m5/PVA/ResultsPanel.jsx — was byte-identical inline; now
 *     consumes this util.
 *   - src/components/m5/PVA/callouts/LumpSumOfferDivergence.jsx — intentionally
 *     diverges: it returns the '$—' sentinel (not '—') for the callout's
 *     compact-currency rendering, and stays inline by design. Do not
 *     "consolidate" it onto this util without changing that sentinel.
 *
 * @param {number | null | undefined} value
 * @returns {string} formatted USD string or the em-dash sentinel '—'
 */
export function formatUSD(value) {
  if (value == null || !Number.isFinite(value)) return '—';
  return value.toLocaleString('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  });
}
