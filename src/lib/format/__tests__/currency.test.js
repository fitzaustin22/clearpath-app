/**
 * Tests for the shared `formatUSD` currency formatter (PR-B2-α).
 *
 * Behavior pinned by the existing PVA inline `formatUSD` implementations
 * (src/components/m5/PVA/ResultsPanel.jsx, .../callouts/LumpSumOfferDivergence.jsx)
 * — this is the canonical extraction those (and future QDRO §8.6.2)
 * consumers share.
 */

import { describe, it, expect } from 'vitest';
import { formatUSD } from '../currency.js';

describe('formatUSD', () => {
  it('renders whole-dollar USD with no fractional cents', () => {
    expect(formatUSD(400000)).toBe('$400,000');
    expect(formatUSD(0)).toBe('$0');
    expect(formatUSD(1)).toBe('$1');
  });

  it('renders thousands separators', () => {
    expect(formatUSD(1234567)).toBe('$1,234,567');
  });

  it('rounds fractional values to whole dollars', () => {
    expect(formatUSD(99.4)).toBe('$99');
    expect(formatUSD(99.6)).toBe('$100');
  });

  it('renders negative values with a leading dash', () => {
    expect(formatUSD(-250)).toBe('-$250');
  });

  it('returns the em-dash sentinel for null / undefined / non-finite values', () => {
    expect(formatUSD(null)).toBe('—');
    expect(formatUSD(undefined)).toBe('—');
    expect(formatUSD(NaN)).toBe('—');
    expect(formatUSD(Infinity)).toBe('—');
    expect(formatUSD(-Infinity)).toBe('—');
  });
});
