// src/lib/homeDecision/ltvCalculator.js
//
// LTV computation per M5-Tool-Specs.md §9.6.4 (Q-12).
// Industry-standard non-iterative roll-in: closing costs are computed against
// the pre-roll-in base (existingMortgageBalance + buyoutAmount), then added.

import { STATE_CLOSING_COSTS_DEFAULT } from './homeDecisionConstants';

/**
 * State-aware default closing-costs percentage per §9.6.4.
 *
 * @param {string} userState - USPS code
 * @returns {number} decimal percent (e.g., 0.035 for 3.5%)
 */
export function getStateClosingCostsDefault(userState) {
  return STATE_CLOSING_COSTS_DEFAULT[userState] ?? STATE_CLOSING_COSTS_DEFAULT.DEFAULT;
}

/**
 * Refined LTV formula per §9.6.4 (Q-12).
 *
 *   LTV = (existingMortgageBalance + buyoutAmount + closingCostsRolledIn) / currentFMV
 *   closingCostsRolledIn = (existingMortgageBalance + buyoutAmount) × refiClosingCostsPercent
 *
 * @param {Object} args
 * @param {number} args.existingMortgageBalance
 * @param {number} args.buyoutAmount
 * @param {number} args.refiClosingCostsPercent - decimal (e.g., 0.05 for 5%)
 * @param {number} args.currentFMV
 * @returns {{ ltv: number, closingCostsRolledIn: number, totalLoan: number }}
 */
export function calculateLtv({
  existingMortgageBalance,
  buyoutAmount,
  refiClosingCostsPercent,
  currentFMV,
}) {
  const preRollInBase = existingMortgageBalance + buyoutAmount;
  const closingCostsRolledIn = preRollInBase * refiClosingCostsPercent;
  const totalLoan = preRollInBase + closingCostsRolledIn;
  return {
    ltv: totalLoan / currentFMV,
    closingCostsRolledIn,
    totalLoan,
  };
}

/**
 * Underwater check per §9.4.3. Used by refiQualifier to short-circuit to red.
 *
 * @param {Object} args
 * @param {number} args.currentFMV
 * @param {number} args.existingMortgageBalance
 * @returns {boolean}
 */
export function isUnderwater({ currentFMV, existingMortgageBalance }) {
  return currentFMV < existingMortgageBalance;
}
