// __tests__/ltvCalculator.test.js
//
// Coverage for §9.6.4 (Q-12) LTV formula + state-aware closing-cost default
// + underwater check per §9.4.3. Maps to TC-HDA-7.

import { describe, it, expect } from 'vitest';
import { calculateLtv, getStateClosingCostsDefault, isUnderwater } from '../ltvCalculator';

describe('calculateLtv', () => {
  it('TC-HDA-7 standard: $400k mortgage + $100k buyout + 5% NY closing + $700k FMV → LTV 75%', () => {
    const r = calculateLtv({
      existingMortgageBalance: 400_000,
      buyoutAmount: 100_000,
      refiClosingCostsPercent: 0.05,
      currentFMV: 700_000,
    });
    expect(r.closingCostsRolledIn).toBe(25_000);
    expect(r.totalLoan).toBe(525_000);
    expect(r.ltv).toBeCloseTo(0.75, 5);
  });

  it('TC-HDA-7 override variant: 2.5% closing → LTV ~73.2%', () => {
    const r = calculateLtv({
      existingMortgageBalance: 400_000,
      buyoutAmount: 100_000,
      refiClosingCostsPercent: 0.025,
      currentFMV: 700_000,
    });
    expect(r.closingCostsRolledIn).toBe(12_500);
    expect(r.ltv).toBeCloseTo(0.7321, 4);
  });
});

describe('getStateClosingCostsDefault', () => {
  it('NY is high-cost (5%) per §9.6.4', () => {
    expect(getStateClosingCostsDefault('NY')).toBe(0.05);
  });

  it('UT is low-cost (~2.2%) per §9.6.4', () => {
    expect(getStateClosingCostsDefault('UT')).toBe(0.022);
  });

  it('unknown state falls back to DEFAULT 3.5%', () => {
    expect(getStateClosingCostsDefault('XX')).toBe(0.035);
    expect(getStateClosingCostsDefault(undefined)).toBe(0.035);
  });
});

describe('isUnderwater', () => {
  it('FMV $300k < mortgage $400k → underwater', () => {
    expect(isUnderwater({ currentFMV: 300_000, existingMortgageBalance: 400_000 })).toBe(true);
  });

  it('FMV equals mortgage → not underwater', () => {
    expect(isUnderwater({ currentFMV: 400_000, existingMortgageBalance: 400_000 })).toBe(false);
  });
});
