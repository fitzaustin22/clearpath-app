// src/lib/homeDecision/pmiCalculator.js
//
// PMI matrix lookup + projected drop-year computation per
// M5-Tool-Specs.md §9.6.5 (Q-13).
//
// v1 assumes BPMI (borrower-paid PMI), cancellable per HPA at 78% scheduled
// LTV (auto) or 80% borrower-initiated. LPMI is deferred to v1.1.

import { PMI_MATRIX, DEFAULT_REFI_TERM_MONTHS } from './homeDecisionConstants';

const PMI_LTV_FLOOR = 0.80;
const PMI_LTV_CEIL = 0.95;
// HPA auto-cancellation threshold per §9.6.5. PMI scheduling follows the
// actual nominal amortization schedule (contractual), not the projection
// engine's real-rate cashflow modeling per §9.4.2.
const HPA_AUTO_CANCEL_LTV = 0.78;

/**
 * 2D credit × LTV PMI matrix lookup per §9.6.5.
 *
 * @param {Object} args
 * @param {'excellent'|'good'|'fair'|'poor'} args.creditBand
 * @param {number} args.ltv - decimal LTV (e.g., 0.82 for 82%)
 * @returns {number|null} annual PMI rate as decimal, or null if PMI does not apply
 */
export function lookupPmiRate({ creditBand, ltv }) {
  if (ltv <= PMI_LTV_FLOOR) return null;        // no PMI ≤ 80%
  if (ltv > PMI_LTV_CEIL) return null;          // > 95% not modeled per §9.6.5
  if (creditBand === 'poor') return null;       // forces red upstream per §9.6.2
  if (!PMI_MATRIX[creditBand]) return null;

  let ltvKey;
  if (ltv <= 0.85) ltvKey = '80-85';
  else if (ltv <= 0.90) ltvKey = '85-90';
  else ltvKey = '90-95';

  return PMI_MATRIX[creditBand][ltvKey] ?? null;
}

/**
 * Monthly PMI payment per §9.6.5.
 *
 * @param {Object} args
 * @param {number} args.loanAmount
 * @param {number|null} args.pmiRatePercent - annual PMI rate as decimal
 * @returns {number} monthly PMI in dollars
 */
export function calculateMonthlyPmi({ loanAmount, pmiRatePercent }) {
  if (!pmiRatePercent) return 0;
  return (loanAmount * pmiRatePercent) / 12;
}

/**
 * Projected PMI drop year per §9.6.5 — HPA auto-cancellation at 78% LTV
 * against the projection's real-dollar appreciation rate.
 *
 * @param {Object} args
 * @param {number} args.loanAmount
 * @param {number} args.currentFMV
 * @param {number} args.refiRatePercent - nominal APR as decimal (e.g., 0.0625)
 * @param {number} [args.propertyAppreciationRateReal=0]
 * @param {number} [args.termMonths=360]
 * @returns {number|null} smallest integer year where LTV ≤ 78%, or null if no PMI / not reached
 */
export function projectPmiDropYear({
  loanAmount,
  currentFMV,
  refiRatePercent,
  propertyAppreciationRateReal = 0,
  termMonths = DEFAULT_REFI_TERM_MONTHS,
}) {
  if (loanAmount / currentFMV <= PMI_LTV_FLOOR) return null;

  // Use nominal rate per HPA convention; PMI drop is contractual, not a
  // real-dollar projection construct.
  const r = refiRatePercent / 12;
  const n = termMonths;

  for (let year = 1; year <= 30; year++) {
    const t = year * 12;
    const balance =
      r === 0
        ? loanAmount * (1 - t / n)
        : (loanAmount * (Math.pow(1 + r, n) - Math.pow(1 + r, t))) /
          (Math.pow(1 + r, n) - 1);
    const appreciatedFMV = currentFMV * Math.pow(1 + propertyAppreciationRateReal, year);
    if (balance / appreciatedFMV <= HPA_AUTO_CANCEL_LTV) return year;
  }
  return null;
}
