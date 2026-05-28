// Public API barrel for src/lib/pensionValuation per spec §7.10.1.

// Top-level entry point
export { calculatePensionValue, DEFAULT_RECEIPT_FORM_BY_PATH } from './calculatePensionValue.js';

// Per-path calculation functions (exposed for unit testing + Blueprint v2 forward-compat)
export { calculateTier1Or2 } from './tier1And2.js';
export { calculateTier3Coverture, computeCovertureFraction } from './tier3Coverture.js';
export { calculateInPayStatus } from './inPayStatus.js';
export { calculateCashBalance } from './cashBalancePassthrough.js';

// Shared utilities
export { computeAnnuityFactor } from './annuityFactor.js';
export { lookupMortalityTable } from './mortalityTables/index.js';
export { IRS_417E_SEGMENT_2_RATES, lookupAtDate } from './effectiveDateConstants.js';

// Constants
export { CITATIONS_BY_PATH } from './citations.js';
export { CALLOUT_PRECEDENCE } from './calculatePensionValue.js';

// Type-narrow helpers for discriminated-union pv field per [R5b-16]
export {
  getHeadlinePV,
  getMaritalPV,
  getHeadlinePVRange,
  getMaritalPVRange,
} from './pvHelpers.js';
