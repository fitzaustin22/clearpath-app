import { describe, it, expect } from 'vitest';
import { calculatePIT } from '../calculatePIT.js';

const STANDARD = {
  planBalance: 500000,
  currentAge: 45,
  withdrawalStartAge: 65,
  withdrawalEndAge: 80,
  effectiveTaxRate: 25,
  discountRate: 4,
};

describe('calculatePIT', () => {
  it('TC-1: standard input — all 15 output fields populated with expected values', () => {
    const r = calculatePIT(STANDARD);
    expect(r.n).toBe(27.5);
    expect(r.tdPercent).toBeCloseTo(10.181835795975369, 6);
    expect(r.tdDollars).toBeCloseTo(50909.178979876844, 4);
    expect(r.taxAdjustedValue).toBeCloseTo(449090.82102012314, 4);
    expect(r.tdGrowth).toBeCloseTo(98787.76136016421, 4);
    expect(r.taxDiscountAtWithdrawal).toBeCloseTo(149696.94034004107, 4);
    expect(r.taxableDistribution).toBeCloseTo(598787.7613601643, 4);
    expect(r.taxes).toBeCloseTo(149696.94034004107, 4);
    expect(r.afterTaxDistribution).toBeCloseTo(449090.8210201232, 4);
    expect(r.traditionalTD).toBe(125000);
    expect(r.overage).toBeCloseTo(74090.82102012316, 4);
    expect(r.verified).toBe(true);
    expect(r.PB).toBe(500000);
    expect(r.TR).toBe(25);
    expect(r.i).toBe(4);
  });

  it('TC-2: math-verification invariant — afterTaxDistribution within 0.01 of taxAdjustedValue across 3 input sets', () => {
    const inputs = [
      STANDARD,
      { planBalance: 100000, currentAge: 30, withdrawalStartAge: 60, withdrawalEndAge: 85, effectiveTaxRate: 30, discountRate: 3 },
      { planBalance: 1_500_000, currentAge: 55, withdrawalStartAge: 70, withdrawalEndAge: 90, effectiveTaxRate: 35, discountRate: 5 },
    ];
    for (const input of inputs) {
      const r = calculatePIT(input);
      expect(Math.abs(r.afterTaxDistribution - r.taxAdjustedValue)).toBeLessThan(0.01);
    }
  });

  it('TC-3: withdrawalStartAge === currentAge → nCalc branch taken, tdPercent equals effectiveTaxRate', () => {
    const r = calculatePIT({ ...STANDARD, currentAge: 65, withdrawalStartAge: 65 });
    expect(r.tdPercent).toBeCloseTo(STANDARD.effectiveTaxRate, 10);
    expect(r.tdDollars).toBeCloseTo(STANDARD.planBalance * (STANDARD.effectiveTaxRate / 100), 4);
  });

  it('TC-4: withdrawalStartAge < currentAge → same immediate-withdrawal short-circuit', () => {
    const r = calculatePIT({ ...STANDARD, currentAge: 70, withdrawalStartAge: 65 });
    expect(r.tdPercent).toBeCloseTo(STANDARD.effectiveTaxRate, 10);
    expect(r.tdDollars).toBeCloseTo(STANDARD.planBalance * (STANDARD.effectiveTaxRate / 100), 4);
  });

  it('TC-5: discountRate === 0 → tdDollars equals planBalance × (effectiveTaxRate/100)', () => {
    const r = calculatePIT({ ...STANDARD, discountRate: 0 });
    expect(r.tdDollars).toBeCloseTo(STANDARD.planBalance * (STANDARD.effectiveTaxRate / 100), 6);
  });

  it('TC-6: n formula — n === ((start - current) + (end - current)) / 2', () => {
    const r = calculatePIT(STANDARD);
    const expected = ((STANDARD.withdrawalStartAge - STANDARD.currentAge) + (STANDARD.withdrawalEndAge - STANDARD.currentAge)) / 2;
    expect(r.n).toBe(expected);
  });

  it('TC-7: traditionalTD === planBalance × (effectiveTaxRate / 100)', () => {
    const r = calculatePIT(STANDARD);
    expect(r.traditionalTD).toBe(STANDARD.planBalance * (STANDARD.effectiveTaxRate / 100));
  });

  it('TC-8: overage === traditionalTD − tdDollars and is positive for non-trivial inputs', () => {
    const r = calculatePIT(STANDARD);
    expect(r.overage).toBeCloseTo(r.traditionalTD - r.tdDollars, 6);
    expect(r.overage).toBeGreaterThan(0);
  });

  it('TC-9: tdGrowth formula — tdGrowth === tdDollars × ((1 + i)^nCalc − 1)', () => {
    const r = calculatePIT(STANDARD);
    const i = STANDARD.discountRate / 100;
    const expected = r.tdDollars * (Math.pow(1 + i, r.n) - 1);
    expect(r.tdGrowth).toBeCloseTo(expected, 6);
  });

  it('TC-10: verified === true for all valid inputs across TC-1, TC-3, TC-5', () => {
    expect(calculatePIT(STANDARD).verified).toBe(true);
    expect(calculatePIT({ ...STANDARD, currentAge: 65, withdrawalStartAge: 65 }).verified).toBe(true);
    expect(calculatePIT({ ...STANDARD, discountRate: 0 }).verified).toBe(true);
  });

  it('TC-11: algebraic identity — taxableDistribution === planBalance + tdGrowth', () => {
    const r = calculatePIT(STANDARD);
    expect(r.taxableDistribution).toBeCloseTo(STANDARD.planBalance + r.tdGrowth, 6);
  });

  it('TC-12: output shape — all 15 keys present', () => {
    const r = calculatePIT(STANDARD);
    expect(Object.keys(r).sort()).toEqual(
      [
        'PB',
        'TR',
        'afterTaxDistribution',
        'i',
        'n',
        'overage',
        'taxAdjustedValue',
        'taxDiscountAtWithdrawal',
        'taxableDistribution',
        'taxes',
        'tdDollars',
        'tdGrowth',
        'tdPercent',
        'traditionalTD',
        'verified',
      ].sort(),
    );
  });
});
