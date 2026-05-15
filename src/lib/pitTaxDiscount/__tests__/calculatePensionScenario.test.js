import { describe, it, expect } from 'vitest';
import { calculatePensionScenario } from '../calculatePensionScenario.js';

const STANDARD = {
  planBalance: 500000,
  currentAge: 45,
  withdrawalStartAge: 65,
  withdrawalEndAge: 84,
  effectiveTaxRate: 25,
  discountRate: 4,
};

describe('calculatePensionScenario', () => {
  it('TC-1: inclusive year count — start 65, end 84 → yearRows.length === 20', () => {
    const r = calculatePensionScenario(STANDARD);
    expect(r.yearRows).toHaveLength(20);
  });

  it('TC-2: per-year allocations sum to ≈100%', () => {
    const r = calculatePensionScenario(STANDARD);
    const sum = r.yearRows.reduce((acc, row) => acc + row.allocation, 0);
    expect(sum).toBeCloseTo(100, 6);
  });

  it('TC-3: single-year case — start === end → 1 row with allocation 100%', () => {
    const r = calculatePensionScenario({ ...STANDARD, withdrawalStartAge: 65, withdrawalEndAge: 65 });
    expect(r.yearRows).toHaveLength(1);
    expect(r.yearRows[0].allocation).toBeCloseTo(100, 10);
  });

  it('TC-4: weighted-sum identity — scenarioTDPercent === sum(yearRows.weightedTD)', () => {
    const r = calculatePensionScenario(STANDARD);
    const sum = r.yearRows.reduce((acc, row) => acc + row.weightedTD, 0);
    expect(r.scenarioTDPercent).toBeCloseTo(sum, 6);
  });

  it('TC-5: scenarioTDDollars === planBalance × (scenarioTDPercent / 100)', () => {
    const r = calculatePensionScenario(STANDARD);
    expect(r.scenarioTDDollars).toBeCloseTo(STANDARD.planBalance * (r.scenarioTDPercent / 100), 4);
  });

  it('TC-6: yearRows[0].n === withdrawalStartAge − currentAge', () => {
    const r = calculatePensionScenario(STANDARD);
    expect(r.yearRows[0].n).toBe(STANDARD.withdrawalStartAge - STANDARD.currentAge);
  });
});
