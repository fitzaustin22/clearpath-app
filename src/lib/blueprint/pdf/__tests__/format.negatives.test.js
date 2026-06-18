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
    expect(formatValue({ value: -2212, valueClass: 'currency_projection' })).toBe('($2,212)');
  });
  it('currency_actual negative whole → parentheses, no .00', () => {
    expect(formatValue({ value: -8940, valueClass: 'currency_actual' })).toBe('($8,940)');
  });
  it('isNegativeValue flags negatives (for color), not positives', () => {
    expect(isNegativeValue({ value: -2212, valueClass: 'currency_projection' })).toBe(true);
    expect(isNegativeValue({ value: 5922, valueClass: 'currency_projection' })).toBe(false);
  });
});

describe('currency drops redundant .00 (R-B), keeps real cents', () => {
  it('whole-dollar actual → no cents', () => {
    expect(formatValue({ value: 8940, valueClass: 'currency_actual' })).toBe('$8,940');
  });
  it('fractional actual → cents kept', () => {
    expect(formatValue({ value: 5747.66, valueClass: 'currency_actual' })).toBe('$5,747.66');
  });
  it('projection stays whole-dollar', () => {
    expect(formatValue({ value: 365975, valueClass: 'currency_projection' })).toBe('$365,975');
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
  it('formatPercentFromFraction → 2-decimal percent, whole when exact', () => {
    expect(formatPercentFromFraction(0.6824)).toBe('68.24%');
    expect(formatPercentFromFraction(1)).toBe('100%');
    expect(formatPercentFromFraction(0.8938)).toBe('89.38%');
  });
  it('fraction valueClass now renders as percent (R-A coverture)', () => {
    expect(formatValue({ value: 0.6204, valueClass: 'fraction' })).toBe('62.04%');
    expect(formatValue({ value: 1, valueClass: 'fraction' })).toBe('100%');
    expect(formatValue({ value: 0.8938, valueClass: 'fraction' })).toBe('89.38%');
  });
  it('rate valueClass unchanged (2-decimal %)', () => {
    expect(formatValue({ value: 9.79, valueClass: 'rate' })).toBe('9.79%');
  });
});
