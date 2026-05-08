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
