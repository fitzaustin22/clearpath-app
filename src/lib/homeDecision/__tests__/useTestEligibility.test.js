// __tests__/useTestEligibility.test.js
//
// Coverage for §121 use-test pre-check per M5-Tool-Specs.md §9.5.2
// (Q-8b Sell-now, fractional userMovedOutYearsAgo per §9.3.2 type).

import { describe, it, expect } from 'vitest';
import { evaluateUseTest } from '../useTestEligibility';

describe('evaluateUseTest', () => {
  it('default occupying (userMovedOutYearsAgo=0) — passes with 5 years of use', () => {
    const result = evaluateUseTest({ userMovedOutYearsAgo: 0 });
    expect(result.passes).toBe(true);
    expect(result.yearsOfUseInLookbackWindow).toBe(5);
    expect(result.callout).toBeNull();
  });

  it('above-threshold (userMovedOutYearsAgo=4) — fails per TC-HDA-3', () => {
    const result = evaluateUseTest({ userMovedOutYearsAgo: 4 });
    expect(result.passes).toBe(false);
    expect(result.yearsOfUseInLookbackWindow).toBe(1);
    expect(result.callout).not.toBeNull();
    expect(result.callout.type).toBe('use_test_failed');
  });

  it('boundary exactly 3 — passes per TC-HDA-3 boundary (> 3 threshold not ≥ 3)', () => {
    const result = evaluateUseTest({ userMovedOutYearsAgo: 3 });
    expect(result.passes).toBe(true);
    expect(result.yearsOfUseInLookbackWindow).toBe(2);
    expect(result.callout).toBeNull();
  });

  it('fractional 3.5 — fails per TC-HDA-3 fractional variant', () => {
    const result = evaluateUseTest({ userMovedOutYearsAgo: 3.5 });
    expect(result.passes).toBe(false);
    expect(result.yearsOfUseInLookbackWindow).toBe(1.5);
    expect(result.callout).not.toBeNull();
  });

  it('callout copy parameterizes userMovedOutYearsAgo and references §121 + CDFA', () => {
    const result = evaluateUseTest({ userMovedOutYearsAgo: 4 });
    expect(result.callout.copy).toContain('4 years ago');
    expect(result.callout.copy).toContain('§121');
    expect(result.callout.copy).toContain('CDFA');
    expect(result.callout.copy).toContain('2 of the 5 years');
  });
});
