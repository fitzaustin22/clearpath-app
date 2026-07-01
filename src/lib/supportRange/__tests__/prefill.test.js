import { describe, it, expect } from 'vitest';
import { makeInitialSupportRangeInputs, prePopulateSupportRange, isSupportRangeFreshDefault } from '../prefill';

describe('prePopulateSupportRange', () => {
  it('seeds incomeYou from M3 gross MONTHLY income with a badge source', () => {
    const r = prePopulateSupportRange({
      m3: { payStubDecoder: { results: { grossMonthlyIncome: 7200 } } },
      m4: null,
    });
    expect(r.inputs.incomeYou).toBe('7200');
    expect(r.sources.incomeYou).toEqual({ label: 'from M3 Pay Stub Decoder', source: 'm3.payStubDecoder' });
  });

  it('seeds incomeSpouse from M4 spouse gross ANNUAL ÷ 12 with a badge source', () => {
    const r = prePopulateSupportRange({
      m3: null,
      m4: { filingStatusOptimizer: { inputs: { spouseGrossAnnualIncome: 120000 } } },
    });
    expect(r.inputs.incomeSpouse).toBe('10000');
    expect(r.sources.incomeSpouse).toEqual({ label: 'from M4 Filing Status Optimizer', source: 'm4.filingStatusOptimizer' });
  });

  it('does NOT seed spouse income when the M4 figure is 0', () => {
    const r = prePopulateSupportRange({ m3: null, m4: { filingStatusOptimizer: { inputs: { spouseGrossAnnualIncome: 0 } } } });
    expect(r.inputs.incomeSpouse).toBe('');
  });

  it('does NOT seed spouse income when M4 is absent', () => {
    const r = prePopulateSupportRange({ m3: null, m4: null });
    expect(r.inputs.incomeSpouse).toBe('');
    expect(r.sources.incomeSpouse).toBeNull();
  });

  it('seeds BOTH incomes independently when M3 and M4 are both present', () => {
    const r = prePopulateSupportRange({
      m3: { payStubDecoder: { results: { grossMonthlyIncome: 5000 } } },
      m4: { filingStatusOptimizer: { inputs: { spouseGrossAnnualIncome: 96000 } } },
    });
    expect(r.inputs.incomeYou).toBe('5000');
    expect(r.inputs.incomeSpouse).toBe('8000');
    expect(r.sources.incomeYou).toEqual({ label: 'from M3 Pay Stub Decoder', source: 'm3.payStubDecoder' });
    expect(r.sources.incomeSpouse).toEqual({ label: 'from M4 Filing Status Optimizer', source: 'm4.filingStatusOptimizer' });
  });

  it('rejects negative or non-finite incomes (both paths)', () => {
    const r = prePopulateSupportRange({
      m3: { payStubDecoder: { results: { grossMonthlyIncome: -1 } } },
      m4: { filingStatusOptimizer: { inputs: { spouseGrossAnnualIncome: -12000 } } },
    });
    expect(r.inputs.incomeYou).toBe('');
    expect(r.inputs.incomeSpouse).toBe('');
    expect(r.sources.incomeYou).toBeNull();
    expect(r.sources.incomeSpouse).toBeNull();
  });

  it('leaves all other fields at the documented defaults', () => {
    const r = prePopulateSupportRange({ m3: null, m4: null });
    expect(r.inputs).toEqual(makeInitialSupportRangeInputs());
  });

  it('isSupportRangeFreshDefault is true only for untouched inputs', () => {
    expect(isSupportRangeFreshDefault(makeInitialSupportRangeInputs())).toBe(true);
    expect(isSupportRangeFreshDefault({ ...makeInitialSupportRangeInputs(), incomeYou: '5000' })).toBe(false);
  });

  it('isSupportRangeFreshDefault returns false for null/undefined input', () => {
    expect(isSupportRangeFreshDefault(null)).toBe(false);
    expect(isSupportRangeFreshDefault(undefined)).toBe(false);
  });
});
