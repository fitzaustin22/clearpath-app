// __tests__/pmiCalculator.test.js
//
// Coverage for §9.6.5 (Q-13) PMI matrix lookup + projected drop year.
// Maps to TC-HDA-8: three credit×LTV combos + drop-year variant.

import { describe, it, expect } from 'vitest';
import { lookupPmiRate, calculateMonthlyPmi, projectPmiDropYear } from '../pmiCalculator';

describe('lookupPmiRate', () => {
  it('excellent credit, LTV 82% → 0.30% per TC-HDA-8 combo 1', () => {
    expect(lookupPmiRate({ creditBand: 'excellent', ltv: 0.82 })).toBe(0.0030);
  });

  it('good credit, LTV 88% → 0.65% per TC-HDA-8 combo 2', () => {
    expect(lookupPmiRate({ creditBand: 'good', ltv: 0.88 })).toBe(0.0065);
  });

  it('fair credit, LTV 92% → 1.40% per TC-HDA-8 combo 3', () => {
    expect(lookupPmiRate({ creditBand: 'fair', ltv: 0.92 })).toBe(0.0140);
  });

  it('poor credit returns null (verdict forced red upstream per §9.6.2)', () => {
    expect(lookupPmiRate({ creditBand: 'poor', ltv: 0.85 })).toBeNull();
  });

  it('LTV ≤ 80% returns null (no PMI)', () => {
    expect(lookupPmiRate({ creditBand: 'excellent', ltv: 0.78 })).toBeNull();
    expect(lookupPmiRate({ creditBand: 'excellent', ltv: 0.80 })).toBeNull();
  });

  it('LTV > 95% returns null (not modeled per §9.6.5)', () => {
    expect(lookupPmiRate({ creditBand: 'good', ltv: 0.96 })).toBeNull();
  });
});

describe('calculateMonthlyPmi', () => {
  it('loanAmount 400k × 0.5% / 12 ≈ $166.67', () => {
    const monthly = calculateMonthlyPmi({ loanAmount: 400_000, pmiRatePercent: 0.0050 });
    expect(monthly).toBeCloseTo(166.67, 1);
  });

  it('null pmiRatePercent → 0 monthly PMI', () => {
    expect(calculateMonthlyPmi({ loanAmount: 400_000, pmiRatePercent: null })).toBe(0);
  });
});

describe('projectPmiDropYear', () => {
  it('standard 82% LTV at 6.25% nominal drops in early years (drop year ≤ 6); verifies LTV ≤ 78% at returned year', () => {
    const dropYear = projectPmiDropYear({
      loanAmount: 410_000,
      currentFMV: 500_000,
      refiRatePercent: 0.0625,
      propertyAppreciationRateReal: 0,
    });
    expect(dropYear).not.toBeNull();
    expect(Number.isInteger(dropYear)).toBe(true);
    expect(dropYear).toBeGreaterThanOrEqual(1);
    expect(dropYear).toBeLessThanOrEqual(6);
    // Nominal-rate amortization per HPA convention; threshold 78% (auto-cancel)
    const monthlyRate = 0.0625 / 12;
    const n = 360;
    const t = dropYear * 12;
    const balanceAt = (410_000 * (Math.pow(1 + monthlyRate, n) - Math.pow(1 + monthlyRate, t))) /
      (Math.pow(1 + monthlyRate, n) - 1);
    expect(balanceAt / 500_000).toBeLessThanOrEqual(0.78);
  });

  it('higher starting LTV (90%) at 6.25% nominal extends the drop year to the 8-12 year range per spec narrative', () => {
    const dropYear = projectPmiDropYear({
      loanAmount: 450_000,
      currentFMV: 500_000,
      refiRatePercent: 0.0625,
      propertyAppreciationRateReal: 0,
    });
    expect(dropYear).not.toBeNull();
    expect(dropYear).toBeGreaterThanOrEqual(8);
    expect(dropYear).toBeLessThanOrEqual(12);
  });

  it('returns null when LTV already ≤ 80%', () => {
    const dropYear = projectPmiDropYear({
      loanAmount: 350_000,
      currentFMV: 500_000,
      refiRatePercent: 0.0625,
    });
    expect(dropYear).toBeNull();
  });
});
