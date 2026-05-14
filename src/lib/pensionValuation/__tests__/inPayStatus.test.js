import { describe, test, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { calculateInPayStatus } from '../inPayStatus.js';

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
  const result = calculateInPayStatus(f.inputs, surfaceCallout);
  return { f, result, collected };
}

describe('In-Pay Status calc engine (§7.4.4)', () => {
  test('TC-PVA-InPayStatus-1: canonical single-life, age 67, $4200/mo', () => {
    const { f, result, collected } = runFixture('tc-pva-inpaystatus-1.json');
    expect(result.path).toBe('in_pay_status');
    expect(result.formulaId).toBe('pva_db_inpaystatus_v1');
    closePV(result.pv.best, f.expected.pv.best, 'pv.best');
    closePV(result.pv.low, f.expected.pv.low, 'pv.low');
    closePV(result.pv.high, f.expected.pv.high, 'pv.high');
    expect(result.pv.low).toBeLessThan(result.pv.best);
    expect(result.pv.high).toBeGreaterThan(result.pv.best);
    expect(result.coverture).toBeNull();
    expect(result.maritalPortion).toBeNull();
    expect(result.metadata.formOfBenefitInPay).toBe('single_life');
    expect(result.metadata.citations).toEqual([
      'IRC §417(e)(3)',
      'SOA actuarial standards (commutation methodology)',
    ]);
    expect(collected).toHaveLength(0);
  });

  test('TC-PVA-InPayStatus-2 [R5b-19]: joint_50 form — PV unchanged (single-life calc at v1)', () => {
    const { f, result, collected } = runFixture('tc-pva-inpaystatus-2.json');
    const canonical = runFixture('tc-pva-inpaystatus-1.json');
    closePV(result.pv.best, canonical.result.pv.best, 'pv.best identical to InPayStatus-1');
    closePV(result.pv.low, canonical.result.pv.low, 'pv.low identical to InPayStatus-1');
    closePV(result.pv.high, canonical.result.pv.high, 'pv.high identical to InPayStatus-1');
    expect(result.metadata.formOfBenefitInPay).toBe('joint_50');
    expect(collected).toHaveLength(0);   // form callout surfaced by router CP.4, not engine
    closePV(result.pv.best, f.expected.pv.best, 'pv.best');
  });
});
