import { describe, it, expect } from 'vitest';
import { formatAppendixValue } from '../format';

describe('appendix leak closure — strings', () => {
  it('booleans → Yes/No', () => {
    expect(formatAppendixValue(false)).toBe('No');
    expect(formatAppendixValue(true)).toBe('Yes');
  });
  it('hyphen-slug enums → human (mapped)', () => {
    expect(formatAppendixValue('refi-at-current')).toBe('Refinance at current rate');
    expect(formatAppendixValue('margin-of-safety')).toBe('Margin of safety');
  });
  it('unmapped hyphen-slug → Title-cased fallback (no raw slug)', () => {
    expect(formatAppendixValue('sell-now')).toBe('Sell now');
  });
  it('single-word verdict enum Title-cased', () => {
    expect(formatAppendixValue('yellow')).toBe('Yellow');
  });
  it('divorce-timeline enum → readable (no "dec31")', () => {
    expect(formatAppendixValue('beforeDec31')).toBe('Before December 31');
  });
  it('free-text citations pass through untouched', () => {
    expect(formatAppendixValue('26 U.S.C. § 121')).toBe('26 U.S.C. § 121');
  });
});

describe('appendix format hints (wired at the model push site)', () => {
  it('percent hint', () => {
    expect(formatAppendixValue(0.6824, 'percent')).toBe('68.24%');
    expect(formatAppendixValue(0.05, 'percent')).toBe('5%');
    expect(formatAppendixValue(0, 'percent')).toBe('0%');
  });
  it('currency hint', () => {
    expect(formatAppendixValue(260000, 'currency_actual')).toBe('$260,000');
    expect(formatAppendixValue(61, 'currency_actual')).toBe('$61');
    expect(formatAppendixValue(22.5, 'currency_actual')).toBe('$22.50');
  });
  it('boolean hint', () => {
    expect(formatAppendixValue(true, 'boolean')).toBe('Yes');
    expect(formatAppendixValue(false, 'boolean')).toBe('No');
  });
  it('date hint', () => {
    expect(formatAppendixValue('1998-04-01', 'date')).toBe('April 1, 1998');
  });
  it('no hint, plain integer passes through', () => {
    expect(formatAppendixValue(360)).toBe('360');
    expect(formatAppendixValue(2008)).toBe('2008');
  });
});
