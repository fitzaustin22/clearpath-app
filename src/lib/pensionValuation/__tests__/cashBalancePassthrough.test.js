import { describe, test, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { calculateCashBalance } from '../cashBalancePassthrough.js';

const fixturesDir = path.join(path.dirname(fileURLToPath(import.meta.url)), 'fixtures');
const loadFixture = (n) => JSON.parse(readFileSync(path.join(fixturesDir, n), 'utf-8'));
const captureCallouts = () => {
  const collected = [];
  return {
    surfaceCallout: (type, data = {}) => collected.push({ type, ...data }),
    collected,
  };
};
const closePV = (actual, expected, label) =>
  expect(Math.abs(actual - expected), `${label}: ${actual} vs ${expected}`).toBeLessThanOrEqual(100);

function runFixture(name) {
  const f = loadFixture(name);
  const { surfaceCallout, collected } = captureCallouts();
  const result = calculateCashBalance(f.inputs, surfaceCallout);
  return { f, result, collected };
}

describe('Cash Balance pass-through calc engine (§7.4.5)', () => {
  test('TC-PVA-CashBalance-1: pass-through, no coverture', () => {
    const { f, result, collected } = runFixture('tc-pva-cashbalance-1.json');
    expect(result.path).toBe('cash_balance');
    expect(result.formulaId).toBe('pva_cashbalance_passthrough_v1');

    // PV = balance, degenerate sensitivity
    expect(result.pv.best).toBe(245600);
    expect(result.pv.low).toBe(245600);
    expect(result.pv.high).toBe(245600);

    expect(result.coverture).toBeNull();
    expect(result.maritalPortion).toBeNull();

    expect(result.metadata.citations).toEqual([
      'IRS Notice 96-8',
      'Pension Protection Act of 2006 §1107 (lump-sum-equals-balance safe harbor)',
      'Cooper v. IBM Personal Pension Plan, 457 F.3d 636 (7th Cir. 2006)',
    ]);
    expect(collected).toHaveLength(0);
    closePV(result.pv.best, f.expected.pv.best, 'pv.best');
  });

  test('TC-PVA-CashBalance-2: pass-through with coverture extension', () => {
    const { f, result, collected } = runFixture('tc-pva-cashbalance-2.json');
    expect(result.path).toBe('cash_balance');
    expect(result.formulaId).toBe('pva_cashbalance_passthrough_v1');

    // Total PV = balance across all sensitivity legs
    expect(result.pv.total.best).toBe(245600);
    expect(result.pv.total.low).toBe(245600);
    expect(result.pv.total.high).toBe(245600);

    // Coverture reused from shared utility — same anchors as TC-PVA-Coverture-1
    expect(result.coverture.numeratorMonths).toBe(115);
    expect(result.coverture.denominatorMonths).toBe(360);
    expect(result.coverture.fraction).toBeCloseTo(0.3194, 4);

    // Marital = balance × fraction (same across sensitivity legs since balance is fixed)
    closePV(result.pv.marital.best, f.expected.pv.marital.best, 'pv.marital.best');
    closePV(result.pv.marital.best, 245600 * result.coverture.fraction, 'pv.marital = balance × fraction');
    expect(result.pv.marital.low).toBe(result.pv.marital.best);
    expect(result.pv.marital.high).toBe(result.pv.marital.best);

    expect(collected).toHaveLength(0);   // no zero fraction
  });
});
