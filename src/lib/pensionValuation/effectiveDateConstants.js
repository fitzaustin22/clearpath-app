// src/lib/pensionValuation/effectiveDateConstants.js
// Date-keyed §417(e) segment-2 rates per spec §7.4.7. All effectiveDate /
// expirationDate values are ISO8601 strings (mirrors §6.5.6 convention).
// Runtime Date objects only inside the shared lookupAtDate utility during comparison.
//
// NOTE [R5c-9]: Two effectiveDateConstants.js files exist in src/lib/:
//   - src/lib/supportGuidelines/effectiveDateConstants.js (defines lookupAtDate + state support constants)
//   - src/lib/pensionValuation/effectiveDateConstants.js (this file — defines IRS_417E_SEGMENT_2_RATES + re-exports lookupAtDate)
// Parallel structure intentional at v1; consolidating into a neutral
// src/lib/dateConstants.js is a candidate Phase 6 refactor.

import { lookupAtDate } from '../supportGuidelines/effectiveDateConstants.js';

export const IRS_417E_SEGMENT_2_RATES = [
  { effectiveDate: '2026-04-01', expirationDate: '2026-04-30', annualRateBps: 5234, source: 'IRS Notice 2026-XX' },
  { effectiveDate: '2026-03-01', expirationDate: '2026-03-31', annualRateBps: 5198, source: 'IRS Notice 2026-XX' },
];

export { lookupAtDate };
