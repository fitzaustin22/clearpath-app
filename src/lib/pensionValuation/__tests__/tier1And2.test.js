import { describe, test, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { calculateTier1Or2 } from '../tier1And2.js';
import { computeAnnuityFactor } from '../annuityFactor.js';

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
  const result = calculateTier1Or2(f.inputs, surfaceCallout);
  return { f, result, collected };
}

describe('Tier 1/2 calc engine (§7.4.2)', () => {
  test('TC-PVA-Tier1-1: canonical Tier 1', () => {
    const { f, result, collected } = runFixture('tc-pva-tier1-1.json');
    expect(result.path).toBe('tier_1');
    expect(result.formulaId).toBe('pva_db_tier1_v1');
    closePV(result.pv.best, f.expected.pv.best, 'pv.best');
    closePV(result.pv.low, f.expected.pv.low, 'pv.low');
    closePV(result.pv.high, f.expected.pv.high, 'pv.high');
    expect(result.pv.low).toBeLessThan(result.pv.best);
    expect(result.pv.high).toBeGreaterThan(result.pv.best);
    expect(result.coverture).toBeNull();
    expect(result.maritalPortion).toBeNull();
    expect(result.metadata.benefitSource).toBe('official_statement');
    expect(result.metadata.citations).toEqual([
      'IRC §417(e)(3)',
      '26 CFR §1.417(e)-1',
      'SOA actuarial standards (commutation methodology)',
    ]);
    expect(collected).toHaveLength(0);
  });

  test('TC-PVA-Tier1-2: vesting status partial — PV unchanged (callout from router CP.4)', () => {
    const { f, result, collected } = runFixture('tc-pva-tier1-2.json');
    const canonical = runFixture('tc-pva-tier1-1.json');
    closePV(result.pv.best, canonical.result.pv.best, 'pv.best matches Tier1-1');
    closePV(result.pv.low, canonical.result.pv.low, 'pv.low matches Tier1-1');
    closePV(result.pv.high, canonical.result.pv.high, 'pv.high matches Tier1-1');
    expect(result.metadata.vestingStatus).toBe('partially_vested');
    expect(collected).toHaveLength(0);
    closePV(result.pv.best, f.expected.pv.best, 'pv.best');
  });

  test('TC-PVA-Tier1-3: form_of_benefit on_statement joint_50 — PV unchanged', () => {
    const { f, result, collected } = runFixture('tc-pva-tier1-3.json');
    const canonical = runFixture('tc-pva-tier1-1.json');
    closePV(result.pv.best, canonical.result.pv.best, 'pv.best matches Tier1-1');
    expect(result.metadata.formOfBenefitOnStatement).toBe('joint_50');
    expect(collected).toHaveLength(0);
    closePV(result.pv.best, f.expected.pv.best, 'pv.best');
  });

  test('TC-PVA-Tier1-4: already past NRA — yearsToNRA clamps to 0', () => {
    const { f, result } = runFixture('tc-pva-tier1-4.json');
    closePV(result.pv.best, f.expected.pv.best, 'pv.best');
    // PV must equal monthlyBenefit × 12 × annuityFactor(67) since deferralFactor = 1
    const expectedAf67 = computeAnnuityFactor({
      age: 67,
      mortalityTable: 'irs_417e',
      discountRate: 0.05234,
      cola: 0,
    });
    const expectedPvNoDeferral = 3000 * 12 * expectedAf67;
    closePV(result.pv.best, expectedPvNoDeferral, 'pv.best matches af(67) × 12 × monthly');
    // Sanity: PV is materially larger than the same monthly deferred (Tier1-1) — confirms no deferral applied
    const tier1_1 = runFixture('tc-pva-tier1-1.json');
    expect(result.pv.best).toBeGreaterThan(tier1_1.result.pv.best * 2);
  });

  test('TC-PVA-Tier1-5 [R5b-1]: annuityFactorAge = floor(currentAge) NOT planNRA', () => {
    const { result } = runFixture('tc-pva-tier1-5.json');
    // Regression guard: if engine had used planNRA (65) instead of floor(67.333) = 67,
    // PV would equal monthlyBenefit × 12 × af(65). Confirm it does NOT.
    const afAt65 = computeAnnuityFactor({
      age: 65,
      mortalityTable: 'irs_417e',
      discountRate: 0.05234,
      cola: 0,
    });
    const afAt67 = computeAnnuityFactor({
      age: 67,
      mortalityTable: 'irs_417e',
      discountRate: 0.05234,
      cola: 0,
    });
    const wrongPv = 3000 * 12 * afAt65;   // what we'd see if engine used planNRA
    const rightPv = 3000 * 12 * afAt67;   // what we should see (floor of 67.333)
    closePV(result.pv.best, rightPv, 'pv.best matches af(67)');
    expect(Math.abs(result.pv.best - wrongPv)).toBeGreaterThan(1000); // af(65) vs af(67) differ by enough
  });

  test('TC-PVA-Tier2-1: identical math to Tier1-1, distinct formulaId + benefitSource', () => {
    const { f, result, collected } = runFixture('tc-pva-tier2-1.json');
    const tier1_1 = runFixture('tc-pva-tier1-1.json');
    expect(result.path).toBe('tier_2');
    expect(result.formulaId).toBe('pva_db_tier2_v1');
    expect(result.metadata.benefitSource).toBe('plan_estimator_or_manual_calculation');
    closePV(result.pv.best, tier1_1.result.pv.best, 'pv.best identical to Tier1-1');
    closePV(result.pv.low, tier1_1.result.pv.low, 'pv.low identical to Tier1-1');
    closePV(result.pv.high, tier1_1.result.pv.high, 'pv.high identical to Tier1-1');
    closePV(result.pv.best, f.expected.pv.best, 'pv.best');
    expect(collected).toHaveLength(0);
  });
});
