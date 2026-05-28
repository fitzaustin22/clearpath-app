/**
 * Shared currency formatter — extracted from PVA's inline `formatUSD` so
 * QDRO §8.6.2 (and any future consumer) can reuse the same wording without
 * a hand-roll (PR-B2-α discipline).
 *
 * Behavior matches the canonical PVA inline copy at
 *   src/components/m5/PVA/ResultsPanel.jsx
 *   src/components/m5/PVA/callouts/LumpSumOfferDivergence.jsx
 * (which remain inline for PR-B2-α minimality; a follow-up may consolidate).
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
