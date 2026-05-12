// src/lib/supportGuidelines/effectiveDateConstants.js
// Date-keyed lookup tables for statutory income caps and floors per §6.5.6.
// All effectiveDate / expirationDate values are ISO8601 strings (per B5b-13).
// Runtime Date objects only inside lookupAtDate during comparison.

export const NY_MAINTENANCE_INCOME_CAP = [
  { effectiveDate: '2026-03-01', expirationDate: '2028-02-29', annualValue: 241000, source: 'OCA AO 3/1/2026' },
  { effectiveDate: '2024-03-01', expirationDate: '2026-02-28', annualValue: 228000, source: 'OCA AO 3/1/2024' },
  { effectiveDate: '2022-03-01', expirationDate: '2024-02-29', annualValue: 203000, source: 'OCA AO 3/1/2022' },
  { effectiveDate: '2020-03-01', expirationDate: '2022-02-28', annualValue: 192000, source: 'OCA AO 3/1/2020' },
  { effectiveDate: '2018-03-01', expirationDate: '2020-02-29', annualValue: 184000, source: 'OCA AO 3/1/2018' },
  { effectiveDate: '2016-01-23', expirationDate: '2018-02-28', annualValue: 178000, source: 'DRL §236(B)(5-a) original' },
];

export const NY_SSR = [
  { effectiveDate: '2026-03-01', expirationDate: '2028-02-29', annualValue: 21546, source: 'OCA AO 3/1/2026' },
  { effectiveDate: '2024-03-01', expirationDate: '2026-02-28', annualValue: 19683, source: 'OCA AO 3/1/2024' },
  { effectiveDate: '2022-03-01', expirationDate: '2024-02-29', annualValue: 18347, source: 'OCA AO 3/1/2022' },
];

export const NY_CSSA_INCOME_CAP = [
  { effectiveDate: '2026-03-01', expirationDate: '2028-02-29', annualValue: 193000, source: 'OCA AO 3/1/2026' },
  { effectiveDate: '2024-03-01', expirationDate: '2026-02-28', annualValue: 183000, source: 'OCA AO 3/1/2024' },
  { effectiveDate: '2022-03-01', expirationDate: '2024-02-29', annualValue: 163000, source: 'OCA AO 3/1/2022' },
];

export const VA_CHILD_SUPPORT_CAP = [
  { effectiveDate: '2025-07-01', monthlyValue: 42500, source: 'SB 805 (2025 Va. Acts ch. 702)' },
  { effectiveDate: '2014-07-01', expirationDate: '2025-06-30', monthlyValue: 35000, source: 'prior to SB 805' },
];

export const MD_CHILD_SUPPORT_CAP = [
  { effectiveDate: '2022-07-01', monthlyValue: 30000, source: '2020 Md. Laws ch. 384 (effective 7/1/2022)' },
  { effectiveDate: '0000-01-01', expirationDate: '2022-06-30', monthlyValue: 15000, source: 'prior to 2020 amendments' },
];

export const DC_CHILD_SUPPORT_CAP = [
  { effectiveDate: '2006-04-01', annualValue: 240000, source: 'D.C. Law 16-79 (2006); not inflation-adjusted' },
];

/**
 * Resolve the record in `records` whose effectiveDate is ≤ asOfDate.
 * Records sorted internally so callers may pass them in any order.
 * Calc engine resolves asOfDate as: `inputs.caseEffectiveDate ?? new Date()`
 * per §6.5.1 input shape and STEP 0 (§6.3.1).
 *
 * @param {Array<{effectiveDate: string}>} records
 * @param {Date|string} [asOfDate=new Date()]
 * @returns {object|undefined}
 */
export function lookupAtDate(records, asOfDate = new Date()) {
  const target = asOfDate instanceof Date ? asOfDate : new Date(asOfDate);
  const sorted = [...records].sort((a, b) =>
    b.effectiveDate.localeCompare(a.effectiveDate));
  return sorted.find(r => new Date(r.effectiveDate) <= target);
}
