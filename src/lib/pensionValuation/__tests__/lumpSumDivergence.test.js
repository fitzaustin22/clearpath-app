import { describe, test, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { calculatePensionValue } from '../calculatePensionValue.js';

const fixturesDir = path.join(path.dirname(fileURLToPath(import.meta.url)), 'fixtures');
const loadFixture = (n) => JSON.parse(readFileSync(path.join(fixturesDir, n), 'utf-8'));

function findCallout(result, type) {
  return result.breakdown.callouts.find(c => c.type === type) ?? null;
}

describe('Plan-offered lump-sum divergence callout (§7.4.8 / STEP CP.3)', () => {
  test('TC-PVA-LumpSumDivergence-1: offer 21.6% below tool PV — callout fires', () => {
    const f = loadFixture('tc-pva-lumpsumdivergence-1.json');
    const result = calculatePensionValue(f.inputs);
    const callout = findCallout(result, 'lump_sum_offer_divergence');

    expect(callout).not.toBeNull();
    expect(callout.offer).toBe(130000);
    expect(callout.toolPv).toBeCloseTo(result.pv.best, 0);   // Tier 1 — toolPv == pv.best
    expect(callout.diff).toBeLessThan(0);                    // offer below PV
    expect(callout.pctDiff).toBeLessThan(-0.10);             // past >10% threshold
    expect(Math.abs(callout.pctDiff)).toBeGreaterThan(0.10); // belt-and-suspenders

    // Verify fixture's pinned shape
    expect(Math.abs(callout.toolPv - f.expected.callout.toolPv)).toBeLessThanOrEqual(100);
  });

  test('TC-PVA-LumpSumDivergence-2: offer 2.5% above tool PV — no callout', () => {
    const f = loadFixture('tc-pva-lumpsumdivergence-2.json');
    const result = calculatePensionValue(f.inputs);
    const callout = findCallout(result, 'lump_sum_offer_divergence');

    expect(callout).toBeNull();
    expect(f.expected.callout).toBeNull();   // fixture anchor
  });

  test('TC-PVA-LumpSumDivergence-3 [R5b-6]: Tier 3 coverture — divergence compares against pv.total (NOT marital)', () => {
    const f = loadFixture('tc-pva-lumpsumdivergence-3.json');
    const result = calculatePensionValue(f.inputs);
    const callout = findCallout(result, 'lump_sum_offer_divergence');

    expect(callout).not.toBeNull();

    // The key regression: toolPv MUST equal pv.total.best, NOT pv.marital.best.
    // Plan administrators offer full PV; comparing against marital would understate divergence.
    expect(callout.toolPv).toBeCloseTo(result.pv.total.best, 0);
    expect(callout.toolPv).not.toBeCloseTo(result.pv.marital.best, -2);

    // Offer was set to ~80% of pv.total.best, so callout fires
    expect(callout.offer).toBe(152676);
    expect(callout.pctDiff).toBeLessThan(-0.10);

    // Sanity: marital is much smaller than total (coverture fraction ≈ 0.32)
    expect(result.pv.marital.best).toBeLessThan(result.pv.total.best * 0.5);
  });
});
