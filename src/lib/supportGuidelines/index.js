// Per-state child support lookups
export { lookupChildSupport as lookupChildSupportVA } from './va_child_support_schedule.js';
export { lookupChildSupport as lookupChildSupportMD } from './md-child-support-schedule.js';
export { lookupChildSupport as lookupChildSupportDC } from './dcChildSupport.js';
export { lookupChildSupport as lookupChildSupportNY } from './ny_child_support.js';

// Per-state spousal support lookups
export { lookupSpousal as lookupSpousalNY } from './ny-spousal.js';
export { lookupSpousal as lookupSpousalCA } from './ca-spousal.js';
export { lookupSpousal as lookupSpousalVA_PL } from './va_pendente_lite_spousal.js';
export { lookupSpousal as lookupSpousalMD } from './md-spousal.js';
export { lookupSpousal as lookupSpousalDC } from './dc-spousal.js';

// Generic fallback (wraps both child + spousal portions per B5b-1; spousal returns 0 + factor-test)
export { lookupSupportGeneric } from './generic-income-shares.js';

// Shared utility (consumed by md-spousal.js + dc-spousal.js; exposed for direct testing)
export { calculateAAMLSpousal, AAML_COEFFICIENTS, aamlDurationGuidance } from './aaml-spousal.js';

// Effective-date constants
export {
  NY_MAINTENANCE_INCOME_CAP,
  NY_SSR,
  NY_CSSA_INCOME_CAP,
  VA_CHILD_SUPPORT_CAP,
  MD_CHILD_SUPPORT_CAP,
  DC_CHILD_SUPPORT_CAP,
  lookupAtDate,
} from './effectiveDateConstants.js';
