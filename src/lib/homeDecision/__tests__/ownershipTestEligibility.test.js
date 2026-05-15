// __tests__/ownershipTestEligibility.test.js
//
// Coverage for §121 ownership-test pre-check per M5-Tool-Specs.md §9.5.2
// (Q-8 Deferred-sale, occupying-spouse persona).

import { describe, it, expect } from 'vitest';
import { evaluateOwnershipTest } from '../ownershipTestEligibility';

describe('evaluateOwnershipTest', () => {
  it('standard pass — acquisition 2020, current 2026, occupancy 5 → 11 years owned', () => {
    const result = evaluateOwnershipTest({
      currentYear: 2026,
      homeAcquisitionYear: 2020,
      occupancyYears: 5,
    });
    expect(result.passes).toBe(true);
    expect(result.ownershipYearsAtSale).toBe(11);
    expect(result.callout).toBeNull();
  });

  it('standard fail — acquisition 2025, current 2026, occupancy 0 → 1 year owned (TC-HDA-2)', () => {
    const result = evaluateOwnershipTest({
      currentYear: 2026,
      homeAcquisitionYear: 2025,
      occupancyYears: 0,
    });
    expect(result.passes).toBe(false);
    expect(result.ownershipYearsAtSale).toBe(1);
    expect(result.callout).not.toBeNull();
    expect(result.callout.type).toBe('ownership_test_failed');
  });

  it('boundary exactly 2 — passes (TC-HDA-2 boundary)', () => {
    const result = evaluateOwnershipTest({
      currentYear: 2026,
      homeAcquisitionYear: 2024,
      occupancyYears: 0,
    });
    expect(result.passes).toBe(true);
    expect(result.ownershipYearsAtSale).toBe(2);
    expect(result.callout).toBeNull();
  });

  it('boundary 1.99 (fractional ownership) — fails', () => {
    const result = evaluateOwnershipTest({
      currentYear: 2026,
      homeAcquisitionYear: 2025,
      occupancyYears: 0.99,
    });
    expect(result.passes).toBe(false);
    expect(result.ownershipYearsAtSale).toBeCloseTo(1.99, 5);
  });

  it('callout copy parameterizes acquisition year, projected sale year, ownership years', () => {
    const result = evaluateOwnershipTest({
      currentYear: 2026,
      homeAcquisitionYear: 2025,
      occupancyYears: 0,
    });
    expect(result.callout.copy).toContain('2025'); // acquisition year
    expect(result.callout.copy).toContain('2026'); // projected sale year (2026 + 0)
    expect(result.callout.copy).toContain('1 years'); // ownership years at sale
    expect(result.callout.copy).toContain('§121');
    expect(result.callout.copy).toContain('CDFA');
  });
});
