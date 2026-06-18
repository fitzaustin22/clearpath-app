import { describe, it, expect } from 'vitest';
import {
  formatValue,
  formatBoolean,
  formatIsoDate,
  formatPercentFromFraction,
  isNegativeValue,
} from '../format';

describe('negatives — accounting style', () => {
  it('currency_projection negative → parentheses, negative color, no minus', () => {
    expect(formatValue({ value: -2212, valueClass: 'currency_projection' })).toBe('($2,212.00)');
  });
  it('currency_actual negative → parentheses', () => {
    expect(formatValue({ value: -8940, valueClass: 'currency_actual' })).toBe('($8,940.00)');
  });
  it('isNegativeValue flags negatives (for color), not positives', () => {
    expect(isNegativeValue({ value: -2212, valueClass: 'currency_projection' })).toBe(true);
    expect(isNegativeValue({ value: 5922, valueClass: 'currency_projection' })).toBe(false);
  });
});

describe('currency is uniform 2-decimal (R2 — one convention, no mismatch)', () => {
  it('whole-dollar actual → .00 (uniform with cents siblings)', () => {
    expect(formatValue({ value: 8940, valueClass: 'currency_actual' })).toBe('$8,940.00');
  });
  it('fractional actual → cents', () => {
    expect(formatValue({ value: 5747.66, valueClass: 'currency_actual' })).toBe('$5,747.66');
  });
  it('projection → .00 (matches actuals on the same page)', () => {
    expect(formatValue({ value: 365975, valueClass: 'currency_projection' })).toBe('$365,975.00');
  });
});

describe('booleans, dates, percent', () => {
  it('formatBoolean → Yes/No', () => {
    expect(formatBoolean(true)).toBe('Yes');
    expect(formatBoolean(false)).toBe('No');
  });
  it('formatIsoDate → long form, timezone-safe', () => {
    expect(formatIsoDate('2026-08-15')).toBe('August 15, 2026');
    expect(formatIsoDate('2026-06-18T00:34:40.562Z')).toBe('June 18, 2026');
  });
  it('formatPercentFromFraction → always 2-decimal percent (uniform convention)', () => {
    expect(formatPercentFromFraction(0.6824)).toBe('68.24%');
    expect(formatPercentFromFraction(1)).toBe('100.00%');
    expect(formatPercentFromFraction(0.8938)).toBe('89.38%');
  });
  it('fraction valueClass now renders as percent (R-A coverture)', () => {
    expect(formatValue({ value: 0.6204, valueClass: 'fraction' })).toBe('62.04%');
    expect(formatValue({ value: 1, valueClass: 'fraction' })).toBe('100.00%');
    expect(formatValue({ value: 0.8938, valueClass: 'fraction' })).toBe('89.38%');
  });
  it('rate valueClass unchanged (2-decimal %)', () => {
    expect(formatValue({ value: 9.79, valueClass: 'rate' })).toBe('9.79%');
  });
});
