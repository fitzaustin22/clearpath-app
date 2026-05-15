// src/lib/homeDecision/index.js
//
// Public API barrel for the Home Decision Analyzer lib per spec §13 step 7.

export { calculateHomeDecision } from './calculateHomeDecision';
export { evaluateRefiVerdict } from './refiQualifier';
export {
  calculateLtv,
  getStateClosingCostsDefault,
  isUnderwater,
} from './ltvCalculator';
export {
  lookupPmiRate,
  calculateMonthlyPmi,
  projectPmiDropYear,
} from './pmiCalculator';
export { evaluateOwnershipTest } from './ownershipTestEligibility';
export { evaluateUseTest } from './useTestEligibility';
export { calculateMfjDifferential } from './mfjDifferentialFootnote';
export {
  existingMortgageAmortizedBalance,
  calculateKeepAndRefi,
  calculateSellNow,
  calculateDeferredSale,
} from './projectionEngine';
export {
  REFI_RATE_BY_CREDIT_BAND,
  PMI_MATRIX,
  STATE_CLOSING_COSTS_DEFAULT,
  V1_ASSUMPTIONS,
  PROJECTION_HORIZONS,
  INFLATION_ASSUMPTION,
} from './homeDecisionConstants';
