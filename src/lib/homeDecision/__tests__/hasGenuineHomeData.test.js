import { describe, it, expect } from 'vitest';
import { hasGenuineHomeData } from '../hasGenuineHomeData';

// Addendum (mortgage-balance coercion fix): the predicate now requires all
// three core inputs — currentFMV (> 0), existingMortgageBalance (finite;
// explicit 0 passes, blank fails), refiRate (finite; explicit 0 passes). See
// the deliberate-asymmetry note in hasGenuineHomeData.js.
const GENUINE = { currentFMV: 650000, existingMortgageBalance: 300000, refiRate: 0.0625 };

describe('hasGenuineHomeData', () => {
  it('false for null inputs', () => {
    expect(hasGenuineHomeData(null)).toBe(false);
  });

  it('false for undefined inputs', () => {
    expect(hasGenuineHomeData(undefined)).toBe(false);
  });

  it('true when all three core inputs are genuine', () => {
    expect(hasGenuineHomeData(GENUINE)).toBe(true);
  });

  // ── currentFMV (must be > 0) ──────────────────────────────────────────────
  it('false when currentFMV is null (blank field)', () => {
    expect(hasGenuineHomeData({ ...GENUINE, currentFMV: null })).toBe(false);
  });

  it('false when currentFMV is 0 (a $0 home is nonsense — the one > 0 field)', () => {
    expect(hasGenuineHomeData({ ...GENUINE, currentFMV: 0 })).toBe(false);
  });

  it('false when currentFMV is negative', () => {
    expect(hasGenuineHomeData({ ...GENUINE, currentFMV: -50000 })).toBe(false);
  });

  it('false when currentFMV is NaN', () => {
    expect(hasGenuineHomeData({ ...GENUINE, currentFMV: NaN })).toBe(false);
  });

  it('false when currentFMV is a non-numeric string', () => {
    expect(hasGenuineHomeData({ ...GENUINE, currentFMV: 'abc' })).toBe(false);
  });

  // ── existingMortgageBalance (finite; explicit 0 passes, blank fails) ──────
  it('false when existingMortgageBalance is null (blank ≠ paid-off)', () => {
    expect(hasGenuineHomeData({ ...GENUINE, existingMortgageBalance: null })).toBe(false);
  });

  it('false when existingMortgageBalance is missing entirely', () => {
    expect(hasGenuineHomeData({ currentFMV: 650000, refiRate: 0.0625 })).toBe(false);
  });

  it('true when existingMortgageBalance is an explicit 0 (paid-off / free-and-clear home)', () => {
    expect(hasGenuineHomeData({ ...GENUINE, existingMortgageBalance: 0 })).toBe(true);
  });

  it('false when existingMortgageBalance is NaN', () => {
    expect(hasGenuineHomeData({ ...GENUINE, existingMortgageBalance: NaN })).toBe(false);
  });

  // ── refiRate (finite; explicit 0 passes genuineness) ─────────────────────
  it('false when refiRate is null (blank field)', () => {
    expect(hasGenuineHomeData({ ...GENUINE, refiRate: null })).toBe(false);
  });

  it('false when refiRate is missing entirely', () => {
    expect(hasGenuineHomeData({ currentFMV: 650000, existingMortgageBalance: 300000 })).toBe(false);
  });

  it('true when refiRate is an explicit 0 (genuineness passes; 0% is a separate validation concern)', () => {
    expect(hasGenuineHomeData({ ...GENUINE, refiRate: 0 })).toBe(true);
  });

  it('false when refiRate is NaN', () => {
    expect(hasGenuineHomeData({ ...GENUINE, refiRate: NaN })).toBe(false);
  });
});
