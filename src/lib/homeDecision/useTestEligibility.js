// src/lib/homeDecision/useTestEligibility.js
//
// IRC §121 use-test pre-check for the Sell-now scenario per
// M5-Tool-Specs.md §9.5.2 (Q-8b, fractional userMovedOutYearsAgo supported).
//
// The §121 use test requires use as principal residence for at least 2 of
// the 5 years before sale. When use fails the §121 utility is not called
// and a callout fires; HDA routes to a no-exclusion branch.

/**
 * Q-8b use-test pre-check for Sell-now scenario.
 *
 * @param {Object} args
 * @param {number} args.userMovedOutYearsAgo - years since user moved out (default 0 = currently occupying); fractional supported
 * @param {number} [args.projectedSaleYearOffset=0] - years from now until sale; 0 for immediate Sell-now
 * @returns {{
 *   passes: boolean,
 *   yearsOfUseInLookbackWindow: number,
 *   callout: { type: 'use_test_failed', copy: string } | null
 * }}
 */
export function evaluateUseTest({
  userMovedOutYearsAgo,
  projectedSaleYearOffset = 0,
}) {
  const yearsOfUseInLookbackWindow = Math.max(
    0,
    5 - (userMovedOutYearsAgo + projectedSaleYearOffset)
  );
  const passes = yearsOfUseInLookbackWindow >= 2;
  return {
    passes,
    yearsOfUseInLookbackWindow,
    callout: passes
      ? null
      : {
          type: 'use_test_failed',
          copy:
            `Based on when you moved out (${userMovedOutYearsAgo} years ago) and the projected sale year, ` +
            `you may not satisfy the §121 use test ` +
            `(use as principal residence for at least 2 of the 5 years before sale). ` +
            `Discuss with your CDFA.`,
        },
  };
}
