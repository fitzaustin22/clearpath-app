import { describe, test, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { calculateTier3Coverture, computeCovertureFraction } from '../tier3Coverture.js';

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
  const result = calculateTier3Coverture(f.inputs, surfaceCallout);
  return { f, result, collected };
}

describe('Tier 3 coverture calc engine (§7.4.3 + §7.4.3a)', () => {
  test('TC-PVA-Coverture-1: marriage-after-hire standard case', () => {
    const { f, result, collected } = runFixture('tc-pva-coverture-1.json');
    expect(result.path).toBe('tier_3');
    expect(result.formulaId).toBe('pva_db_tier3_coverture_v1');

    // Coverture exact anchors per §7.11.2
    expect(result.coverture.numeratorMonths).toBe(115);
    expect(result.coverture.denominatorMonths).toBe(360);
    expect(result.coverture.fraction).toBeCloseTo(0.3194, 4);
    expect(result.coverture.maritalServiceStart).toBe('2015-06-01');
    expect(result.coverture.maritalServiceEnd).toBe('2024-12-31');

    // PV anchors (build-time pinned)
    closePV(result.pv.total.best, f.expected.pv.total.best, 'pv.total.best');
    closePV(result.pv.marital.best, f.expected.pv.marital.best, 'pv.marital.best');

    // Sensitivity monotonicity (both total and marital)
    expect(result.pv.total.low).toBeLessThan(result.pv.total.best);
    expect(result.pv.total.high).toBeGreaterThan(result.pv.total.best);
    expect(result.pv.marital.low).toBeLessThan(result.pv.marital.best);
    expect(result.pv.marital.high).toBeGreaterThan(result.pv.marital.best);

    // Marital = total × fraction (coverture held constant per P-4)
    closePV(result.pv.marital.best, result.pv.total.best * result.coverture.fraction, 'marital == total × fraction');

    // Citations (3 entries for tier_3 — the Lehman projected-at-retirement
    // variant was pulled per founder decision; the variant it cites is
    // v1.1-deferred, so it must not surface in the export.)
    expect(result.metadata.citations).toHaveLength(3);
    expect(result.metadata.citations[0]).toContain('Bender');
    expect(result.metadata.citations[1]).toContain('Mosley');
    expect(result.metadata.citations[2]).toContain('Deering');
    expect(result.metadata.citations.some((c) => c.includes('Lehman'))).toBe(false);

    // No zero-fraction callout
    expect(collected).toHaveLength(0);
  });

  test('TC-PVA-Coverture-2: marriage-before-hire — numerator collapses to entire pre-cutoff employment', () => {
    const { result, collected } = runFixture('tc-pva-coverture-2.json');
    // max('2010-01-01', '2005-01-01') = '2010-01-01' (hire dominates marriage)
    expect(result.coverture.maritalServiceStart).toBe('2010-01-01');
    expect(result.coverture.numeratorMonths).toBe(180);
    expect(result.coverture.denominatorMonths).toBe(360);
    expect(result.coverture.fraction).toBeCloseTo(0.5, 4);
    expect(collected).toHaveLength(0);
  });

  test('TC-PVA-Coverture-3: zero coverture — cutoff before hire triggers callout', () => {
    const { result, collected } = runFixture('tc-pva-coverture-3.json');
    expect(result.coverture.fraction).toBe(0);
    expect(result.coverture.numeratorMonths).toBe(0);
    expect(result.pv.marital.best).toBe(0);
    expect(result.pv.marital.low).toBe(0);
    expect(result.pv.marital.high).toBe(0);

    // Total PV still computed (the participant's pension is still valued for context)
    expect(result.pv.total.best).toBeGreaterThan(0);

    // coverture_zero_fraction callout surfaced exactly once by the shared utility
    expect(collected).toHaveLength(1);
    expect(collected[0].type).toBe('coverture_zero_fraction');
    expect(collected[0].hire).toBe('2010-01-01');
    expect(collected[0].marriage).toBe('2005-01-01');
    expect(collected[0].cutoff).toBe('2009-12-31');
  });

  test('TC-PVA-Coverture-4: cutoff equals retirement — NOT a zero-coverture trigger', () => {
    const { result, collected } = runFixture('tc-pva-coverture-4.json');
    expect(result.coverture.maritalServiceEnd).toBe('2040-01-01');
    expect(result.coverture.fraction).toBeGreaterThan(0);   // normal path, not zero
    expect(collected).toHaveLength(0);                       // no zero-fraction callout
  });
});

describe('computeCovertureFraction shared utility (§7.4.3a)', () => {
  test('marriage equals hire AND cutoff equals retirement → fraction = 1.0', () => {
    const { surfaceCallout, collected } = captureCallouts();
    const c = computeCovertureFraction(
      { hire: '2010-01-01', marriage: '2010-01-01', cutoff: '2040-01-01', retirement: '2040-01-01' },
      surfaceCallout
    );
    expect(c.fraction).toBeCloseTo(1.0, 4);
    expect(c.numeratorMonths).toBe(c.denominatorMonths);
    expect(collected).toHaveLength(0);
  });

  test('marital end equals marital start → returns fraction=0 (boundary)', () => {
    const { surfaceCallout, collected } = captureCallouts();
    const c = computeCovertureFraction(
      { hire: '2010-01-01', marriage: '2010-01-01', cutoff: '2010-01-01', retirement: '2040-01-01' },
      surfaceCallout
    );
    expect(c.fraction).toBe(0);
    expect(collected).toHaveLength(1);
    expect(collected[0].type).toBe('coverture_zero_fraction');
  });
});
