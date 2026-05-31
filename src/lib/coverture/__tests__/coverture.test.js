import { describe, it, expect } from 'vitest';
import {
  covertureFraction,
  analyzeTranche,
  analyzeGrant,
  intrinsicValue,
} from '../coverture.js';

// Worked anchor (§9.7 #1): hire 2018, grant 2022, separation 2024, vest 2026.
// Hug start = hire (2018), Nelson start = grant (2022); sep + vest shared.
// Calendar-day ratios are leap-year-aware, so the fractions land a hair off the
// clean 6/8 and 2/4 — assert with toBeCloseTo, and maritalShares (round) land exact.
const ANCHOR = {
  hireDate: '2018-01-01',
  grantDate: '2022-01-01',
  separationDate: '2024-01-01',
};

describe('covertureFraction (§9.3)', () => {
  it('TC-1a: Hug anchor — hire→sep / hire→vest ≈ 6/8 = 0.75', () => {
    const f = covertureFraction({
      startDate: '2018-01-01',
      separationDate: '2024-01-01',
      vestDate: '2026-01-01',
    });
    expect(f).toBeCloseTo(0.75, 2);
  });

  it('TC-1b: Nelson anchor — grant→sep / grant→vest ≈ 2/4 = 0.50', () => {
    const f = covertureFraction({
      startDate: '2022-01-01',
      separationDate: '2024-01-01',
      vestDate: '2026-01-01',
    });
    expect(f).toBeCloseTo(0.5, 2);
  });

  it('TC-3: vested before separation (vest ≤ sep) → fraction 1 (wholly marital)', () => {
    const f = covertureFraction({
      startDate: '2018-01-01',
      separationDate: '2024-01-01',
      vestDate: '2023-01-01',
    });
    expect(f).toBe(1);
  });

  it('TC-4: post-separation vest → fraction in (0,1), still APPLIES (not zeroed)', () => {
    const f = covertureFraction({
      startDate: '2018-01-01',
      separationDate: '2024-01-01',
      vestDate: '2026-01-01',
    });
    expect(f).toBeGreaterThan(0);
    expect(f).toBeLessThan(1);
  });

  it('TC-5: separation before the start (grant after DOS) → clamped to 0', () => {
    const f = covertureFraction({
      startDate: '2025-01-01',
      separationDate: '2024-01-01',
      vestDate: '2026-01-01',
    });
    expect(f).toBe(0);
  });

  it('TC-6: divide-by-zero guard (vest ≤ start) → 0, never NaN/Infinity', () => {
    const f = covertureFraction({
      startDate: '2026-01-01',
      separationDate: '2024-01-01',
      vestDate: '2026-01-01',
    });
    expect(f).toBe(0);
    expect(Number.isFinite(f)).toBe(true);
  });

  it('TC-6b: missing/invalid dates → 0, never NaN', () => {
    expect(covertureFraction({ startDate: null, separationDate: '2024-01-01', vestDate: '2026-01-01' })).toBe(0);
    expect(covertureFraction({ startDate: '2018-01-01', separationDate: '2024-01-01', vestDate: '' })).toBe(0);
    expect(Number.isNaN(covertureFraction({}))).toBe(false);
  });
});

describe('analyzeTranche (§9.3)', () => {
  it('TC-1: worked anchor — Hug ≈0.75 / Nelson ≈0.50; maritalShares round (shares 100 → 75 / 50)', () => {
    const r = analyzeTranche({ id: 't1', vestDate: '2026-01-01', shares: 100 }, ANCHOR);
    expect(r.hug.fraction).toBeCloseTo(0.75, 2);
    expect(r.nelson.fraction).toBeCloseTo(0.5, 2);
    expect(r.hug.maritalShares).toBe(75);
    expect(r.nelson.maritalShares).toBe(50);
  });

  it('TC-5: separation before grant → Nelson 0 shares while Hug stays positive', () => {
    const r = analyzeTranche(
      { id: 't1', vestDate: '2026-01-01', shares: 100 },
      { hireDate: '2018-01-01', grantDate: '2025-01-01', separationDate: '2024-01-01' },
    );
    expect(r.nelson.fraction).toBe(0);
    expect(r.nelson.maritalShares).toBe(0);
    expect(r.hug.fraction).toBeGreaterThan(0);
    expect(r.hug.maritalShares).toBeGreaterThan(0);
  });

  it('TC-8: both formulas always computed — output carries hug AND nelson, each {fraction, maritalShares}', () => {
    const r = analyzeTranche({ id: 't1', vestDate: '2026-01-01', shares: 100 }, ANCHOR);
    expect(r.hug).toMatchObject({ fraction: expect.any(Number), maritalShares: expect.any(Number) });
    expect(r.nelson).toMatchObject({ fraction: expect.any(Number), maritalShares: expect.any(Number) });
  });

  it('coerces string shares and tolerates blanks', () => {
    const r = analyzeTranche({ id: 't1', vestDate: '2026-01-01', shares: '100' }, ANCHOR);
    expect(r.hug.maritalShares).toBe(75);
    const blank = analyzeTranche({ id: 't2', vestDate: '2026-01-01', shares: '' }, ANCHOR);
    expect(blank.hug.maritalShares).toBe(0);
  });
});

describe('analyzeGrant (§9.3)', () => {
  it('TC-2: multi-tranche — sums maritalShares per formula; perTranche length matches; both totals present', () => {
    const analysis = {
      ...ANCHOR,
      tranches: [
        { id: 't1', vestDate: '2026-01-01', shares: 100 }, // Hug 75 / Nelson 50
        { id: 't2', vestDate: '2023-01-01', shares: 100 }, // vested before sep → 100 / 100
      ],
    };
    const g = analyzeGrant(analysis);
    expect(g.perTranche).toHaveLength(2);
    expect(g.perTranche[0].id).toBe('t1');
    expect(g.totals.hug.maritalShares).toBe(175);
    expect(g.totals.nelson.maritalShares).toBe(150);
    expect(g.totals.hug).toBeDefined();
    expect(g.totals.nelson).toBeDefined();
  });

  it('empty/missing tranches → empty perTranche, zero totals (no throw)', () => {
    expect(analyzeGrant({ ...ANCHOR, tranches: [] }).totals.hug.maritalShares).toBe(0);
    expect(analyzeGrant({ ...ANCHOR }).perTranche).toHaveLength(0);
    expect(analyzeGrant(null).totals.nelson.maritalShares).toBe(0);
  });
});

describe('intrinsicValue (§9.3, D3 — intrinsic only)', () => {
  it('TC-7: RSU (no/zero strike) = shares * fmv', () => {
    expect(intrinsicValue(100, 50, null)).toBe(5000);
    expect(intrinsicValue(100, 50, 0)).toBe(5000);
    expect(intrinsicValue(100, 50, undefined)).toBe(5000);
  });

  it('TC-7: option (strike > 0) = shares * max(0, fmv - strike)', () => {
    expect(intrinsicValue(100, 50, 30)).toBe(2000);
  });

  it('TC-7: option with strike ≥ fmv → 0, never negative', () => {
    expect(intrinsicValue(100, 50, 60)).toBe(0);
    expect(intrinsicValue(100, 50, 50)).toBe(0);
  });
});
