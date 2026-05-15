import { describe, it, expect } from 'vitest';
import { generateReferenceTable } from '../generateReferenceTable.js';

describe('generateReferenceTable', () => {
  it('TC-1: structure — 4 ages × 5 rates × 3 scenarios = 60 cells', () => {
    const r = generateReferenceTable(4);
    expect(r).toHaveLength(4);
    for (const ageRow of r) {
      expect(ageRow.rates).toHaveLength(5);
      for (const rateRow of ageRow.rates) {
        expect(rateRow.scenarios).toHaveLength(3);
      }
    }
    const totalCells = r.reduce(
      (sum, ageRow) => sum + ageRow.rates.reduce((s, rateRow) => s + rateRow.scenarios.length, 0),
      0,
    );
    expect(totalCells).toBe(60);
  });

  it('TC-2: actualStart = max(startAge, currentAge) — at currentAge 65, Early (55) scenario uses startAge 65 (n === 10)', () => {
    const r = generateReferenceTable(4);
    const age65 = r.find((row) => row.age === 65);
    const rate25 = age65.rates.find((rate) => rate.rate === 25);
    const early = rate25.scenarios.find((s) => s.label === 'Early (55)');
    // ((max(55,65) - 65) + (85 - 65)) / 2 === (0 + 20) / 2 === 10
    expect(early.n).toBe(10);
  });

  it('TC-3: at discountRate 0 — every tdPercent equals its rate', () => {
    const r = generateReferenceTable(0);
    for (const ageRow of r) {
      for (const rateRow of ageRow.rates) {
        for (const scenario of rateRow.scenarios) {
          expect(scenario.tdPercent).toBeCloseTo(rateRow.rate, 10);
        }
      }
    }
  });

  it('TC-4: discountRate parameter flows through — discountRate 0 vs 5 produces different output for same age × rate', () => {
    const zero = generateReferenceTable(0);
    const five = generateReferenceTable(5);
    const zeroCell = zero.find((row) => row.age === 45).rates.find((r) => r.rate === 25).scenarios.find((s) => s.label === 'Normal (65)');
    const fiveCell = five.find((row) => row.age === 45).rates.find((r) => r.rate === 25).scenarios.find((s) => s.label === 'Normal (65)');
    expect(zeroCell.tdPercent).not.toBeCloseTo(fiveCell.tdPercent, 4);
  });

  it('TC-5: all ages [35, 45, 55, 65] and all rates [20, 25, 30, 35, 40] present in output', () => {
    const r = generateReferenceTable(4);
    expect(r.map((row) => row.age)).toEqual([35, 45, 55, 65]);
    for (const ageRow of r) {
      expect(ageRow.rates.map((rate) => rate.rate)).toEqual([20, 25, 30, 35, 40]);
    }
  });
});
