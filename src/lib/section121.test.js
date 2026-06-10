import { describe, it, expect } from 'vitest';
import { calculateSection121Exclusion } from './section121.js';

describe('calculateSection121Exclusion', () => {
  it('TC-1: gain below single cap → fully excluded, zero taxable', () => {
    expect(calculateSection121Exclusion({ gain: 100_000, filingStatusAtSale: 'single' }))
      .toEqual({ excludedAmount: 100_000, taxableGain: 0 });
  });

  it('TC-2: gain above single cap → exclusion capped at $250K', () => {
    expect(calculateSection121Exclusion({ gain: 300_000, filingStatusAtSale: 'single' }))
      .toEqual({ excludedAmount: 250_000, taxableGain: 50_000 });
  });

  it('TC-3: gain below MFJ cap → fully excluded, zero taxable', () => {
    expect(calculateSection121Exclusion({ gain: 400_000, filingStatusAtSale: 'mfj' }))
      .toEqual({ excludedAmount: 400_000, taxableGain: 0 });
  });

  it('TC-4: gain above MFJ cap → exclusion capped at $500K', () => {
    expect(calculateSection121Exclusion({ gain: 600_000, filingStatusAtSale: 'mfj' }))
      .toEqual({ excludedAmount: 500_000, taxableGain: 100_000 });
  });

  it('TC-5: gain exactly at single cap → fully excluded', () => {
    expect(calculateSection121Exclusion({ gain: 250_000, filingStatusAtSale: 'single' }))
      .toEqual({ excludedAmount: 250_000, taxableGain: 0 });
  });

  it('TC-6: gain exactly at MFJ cap → fully excluded', () => {
    expect(calculateSection121Exclusion({ gain: 500_000, filingStatusAtSale: 'mfj' }))
      .toEqual({ excludedAmount: 500_000, taxableGain: 0 });
  });

  it('TC-7: zero gain → zero exclusion, zero taxable', () => {
    expect(calculateSection121Exclusion({ gain: 0, filingStatusAtSale: 'single' }))
      .toEqual({ excludedAmount: 0, taxableGain: 0 });
  });

  it('TC-8: negative gain (loss) → zero exclusion, zero taxable', () => {
    expect(calculateSection121Exclusion({ gain: -50_000, filingStatusAtSale: 'single' }))
      .toEqual({ excludedAmount: 0, taxableGain: 0 });
  });

  it('TC-9: filingStatusAtSale=null defaults to single semantics', () => {
    expect(calculateSection121Exclusion({ gain: 300_000, filingStatusAtSale: null }))
      .toEqual({ excludedAmount: 250_000, taxableGain: 50_000 });
  });

  it('TC-10: filingStatusAtSale=undefined defaults to single semantics', () => {
    expect(calculateSection121Exclusion({ gain: 300_000, filingStatusAtSale: undefined }))
      .toEqual({ excludedAmount: 250_000, taxableGain: 50_000 });
  });

  it('TC-11: unknown filingStatusAtSale string defaults to single semantics', () => {
    expect(calculateSection121Exclusion({ gain: 300_000, filingStatusAtSale: 'mfs' }))
      .toEqual({ excludedAmount: 250_000, taxableGain: 50_000 });
  });
});

describe('calculateSection121Exclusion — §121(c) reduced cap (partial exclusion)', () => {
  it('TC-12: qualifyingMonths < 24 (F3 shape: short ownership, shorter use) → cap × min(own, use)/24', () => {
    // ownership 12mo, use 6mo → qualifying 6 → reduced cap = 250,000 × 6/24 = 62,500
    expect(
      calculateSection121Exclusion({
        gain: 100_000,
        filingStatusAtSale: 'single',
        ownershipMonths: 12,
        useMonths: 6,
      })
    ).toEqual({ excludedAmount: 62_500, taxableGain: 37_500 });
  });

  it('TC-13: qualifyingMonths exactly 24 → full cap (boundary, no reduction)', () => {
    expect(
      calculateSection121Exclusion({
        gain: 300_000,
        filingStatusAtSale: 'single',
        ownershipMonths: 24,
        useMonths: 24,
      })
    ).toEqual({ excludedAmount: 250_000, taxableGain: 50_000 });
  });

  it('TC-14: gain below the reduced cap → fully excluded', () => {
    // qualifying 12 → reduced cap 125,000; gain 100,000 sits under it
    expect(
      calculateSection121Exclusion({
        gain: 100_000,
        filingStatusAtSale: 'single',
        ownershipMonths: 12,
        useMonths: 12,
      })
    ).toEqual({ excludedAmount: 100_000, taxableGain: 0 });
  });

  it('TC-15: gain above the reduced cap, single-sided months (ownership only) → known period binds', () => {
    // only ownershipMonths provided (18) → qualifying 18 → reduced cap 187,500
    expect(
      calculateSection121Exclusion({
        gain: 200_000,
        filingStatusAtSale: 'single',
        ownershipMonths: 18,
      })
    ).toEqual({ excludedAmount: 187_500, taxableGain: 12_500 });
  });

  it('TC-16: MFJ variant → reduction scales the $500K cap', () => {
    // qualifying 12 → 500,000 × 12/24 = 250,000
    expect(
      calculateSection121Exclusion({
        gain: 300_000,
        filingStatusAtSale: 'mfj',
        ownershipMonths: 12,
        useMonths: 12,
      })
    ).toEqual({ excludedAmount: 250_000, taxableGain: 50_000 });
  });

  it('TC-17: no months provided (or non-finite) → legacy full-cap behavior unchanged', () => {
    expect(
      calculateSection121Exclusion({
        gain: 300_000,
        filingStatusAtSale: 'single',
        ownershipMonths: undefined,
        useMonths: undefined,
      })
    ).toEqual({ excludedAmount: 250_000, taxableGain: 50_000 });
    expect(
      calculateSection121Exclusion({
        gain: 300_000,
        filingStatusAtSale: 'single',
        ownershipMonths: null,
        useMonths: NaN,
      })
    ).toEqual({ excludedAmount: 250_000, taxableGain: 50_000 });
  });

  it('TC-18: zero qualifying months → zero exclusion, all gain taxable', () => {
    expect(
      calculateSection121Exclusion({
        gain: 100_000,
        filingStatusAtSale: 'single',
        ownershipMonths: 0,
        useMonths: 0,
      })
    ).toEqual({ excludedAmount: 0, taxableGain: 100_000 });
  });
});
