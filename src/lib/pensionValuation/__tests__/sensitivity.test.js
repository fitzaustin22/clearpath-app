import { describe, test, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { calculatePensionValue } from '../calculatePensionValue.js';
import { getHeadlinePV } from '../pvHelpers.js';

const fixturesDir = path.join(path.dirname(fileURLToPath(import.meta.url)), 'fixtures');
const loadFixture = (n) => JSON.parse(readFileSync(path.join(fixturesDir, n), 'utf-8'));

describe('±100bp sensitivity bracket monotonicity (§7.4.2 STEP T1.6 via router)', () => {
  test('TC-PVA-Sensitivity-1: pvLow < pvBest < pvHigh for Tier1-1 inputs', () => {
    const f = loadFixture('tc-pva-sensitivity-1.json');
    const result = calculatePensionValue(f.inputs);

    // Strict monotonicity — sensitivity reflects discount-rate impact direction
    expect(result.pv.low).toBeLessThan(result.pv.best);
    expect(result.pv.best).toBeLessThan(result.pv.high);

    // Anchors pinned at fixture-gen time (within $100 tolerance per §7.11.1)
    expect(Math.abs(result.pv.best - f.expected.pv.best)).toBeLessThanOrEqual(100);
    expect(Math.abs(result.pv.low - f.expected.pv.low)).toBeLessThanOrEqual(100);
    expect(Math.abs(result.pv.high - f.expected.pv.high)).toBeLessThanOrEqual(100);

    // pvHelpers headline narrowing on a non-coverture path returns pv.best
    expect(getHeadlinePV(result)).toBe(result.pv.best);
  });
});
