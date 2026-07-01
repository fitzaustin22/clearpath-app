import { describe, it, expect } from 'vitest';
import { hasGenuinePV } from '../resultValidity.js';

describe('hasGenuinePV — shared "genuine PV" predicate (residual-risk guard reuse)', () => {
  it('returns false for results=null', () => {
    expect(hasGenuinePV(null)).toBe(false);
  });

  it('returns false for a non-finite headline PV (missing required date → engine yields null upstream, but guard covers NaN too)', () => {
    const broken = {
      path: 'tier_1',
      coverture: null,
      pv: { best: NaN, low: NaN, high: NaN },
    };
    expect(hasGenuinePV(broken)).toBe(false);
  });

  it('returns false for an exactly-zero headline PV (blank required numeric — the reported "valued" tag bug)', () => {
    const invalidZero = {
      path: 'tier_1',
      coverture: null,
      pv: { best: 0, low: 0, high: 0 },
    };
    expect(hasGenuinePV(invalidZero)).toBe(false);
  });

  it('returns false for an exactly-zero TOTAL PV on a coverture path (same root cause, tier_3 shape)', () => {
    const invalidZero = {
      path: 'tier_3',
      coverture: { fraction: 0.25 },
      pv: { total: { best: 0, low: 0, high: 0 }, marital: { best: 0, low: 0, high: 0 } },
    };
    expect(hasGenuinePV(invalidZero)).toBe(false);
  });

  it('returns true for a normal, finite, nonzero tier_1 result', () => {
    const valid = {
      path: 'tier_1',
      coverture: null,
      pv: { best: 165783, low: 126443, high: 218973 },
    };
    expect(hasGenuinePV(valid)).toBe(true);
  });

  it('returns true for a REAL zero-coverture case (marital=$0 legitimately, total nonzero) — must NOT overcorrect (TC-PVA-Results-4 parity)', () => {
    const realZeroCoverture = {
      path: 'tier_3',
      coverture: { fraction: 0, numeratorMonths: 0, denominatorMonths: 360 },
      pv: {
        total: { best: 190845, low: 154543, high: 237284 },
        marital: { best: 0, low: 0, high: 0 },
      },
    };
    expect(hasGenuinePV(realZeroCoverture)).toBe(true);
  });

  it('returns false for flag_only (no PV to have — excluded, callers handle separately)', () => {
    const flagOnly = { path: 'flag_only', coverture: null, pv: null };
    expect(hasGenuinePV(flagOnly)).toBe(false);
  });
});
