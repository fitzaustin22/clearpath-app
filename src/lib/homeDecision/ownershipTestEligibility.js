// src/lib/homeDecision/ownershipTestEligibility.js
//
// IRC §121 ownership-test pre-check for the Deferred-sale scenario per
// M5-Tool-Specs.md §9.5.2 (Q-8, occupying-spouse persona).
//
// Continuous-ownership assumption: the formula treats ownership as
// uninterrupted from `homeAcquisitionYear` through projected sale year.
// Non-continuous ownership patterns are out of scope at v1.

/**
 * Q-8 ownership-test pre-check for Deferred-sale scenario.
 *
 * If the user will not have owned the home for at least 2 years at the
 * projected sale year, §121 is not invoked and a callout fires.
 *
 * @param {Object} args
 * @param {number} args.currentYear - calendar year at which HDA runs
 * @param {number} args.homeAcquisitionYear - year home was acquired
 * @param {number} args.occupancyYears - years until trigger sale (Deferred-sale input)
 * @returns {{
 *   passes: boolean,
 *   ownershipYearsAtSale: number,
 *   callout: { type: 'ownership_test_failed', copy: string } | null
 * }}
 */
export function evaluateOwnershipTest({
  currentYear,
  homeAcquisitionYear,
  occupancyYears,
}) {
  const ownershipYearsAtSale = (currentYear - homeAcquisitionYear) + occupancyYears;
  const passes = ownershipYearsAtSale >= 2;
  const projectedSaleYear = currentYear + occupancyYears;
  return {
    passes,
    ownershipYearsAtSale,
    callout: passes
      ? null
      : {
          type: 'ownership_test_failed',
          copy:
            `Based on acquisition year ${homeAcquisitionYear} and projected sale year ${projectedSaleYear}, ` +
            `you'll have owned the home for ${ownershipYearsAtSale} years at sale — ` +
            `below the 2-year minimum for §121 exclusion. Discuss with your CDFA.`,
        },
  };
}
