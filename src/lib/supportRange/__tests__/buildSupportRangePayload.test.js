import { describe, it, expect } from 'vitest';
import { deriveSupportEstimate } from '../computeSupportRange';
import { buildSupportRangePayload } from '../buildSupportRangePayload';

const inputs = {
  region: 'MD', incomeYou: '2000', incomeSpouse: '12000', numChildren: '2',
  parentingPct: 65, childcare: '', health: '', marriageYears: '10', existingSupport: '',
};

describe('buildSupportRangePayload', () => {
  it('returns null when no estimate is given', () => {
    expect(buildSupportRangePayload(null, inputs)).toBeNull();
  });

  it('maps the LIKELY figures into the point-only §8 contract', () => {
    const e = deriveSupportEstimate(inputs);
    const p = buildSupportRangePayload(e, inputs);
    expect(p.totalMonthlySupport).toBe(e.combined.headline);
    expect(p.spousalSupport.monthly).toBe(e.spousal.likely);
    expect(p.childSupport.monthly).toBe(e.child.likely);
    expect(p.childSupport.children).toBe(2);
  });

  it('flips s8 to complete: totalMonthlySupport is a finite number', () => {
    const p = buildSupportRangePayload(deriveSupportEstimate(inputs), inputs);
    expect(Number.isFinite(Number(p.totalMonthlySupport))).toBe(true);
    expect(p.totalMonthlySupport).toBeGreaterThan(0);
  });

  it('persists region (display-only) and the full band in metadata', () => {
    const e = deriveSupportEstimate(inputs);
    const p = buildSupportRangePayload(e, inputs);
    expect(p.metadata.region).toBe('MD');
    expect(p.metadata.regionLabel).toBe('Maryland');
    expect(p.metadata.range.spousal).toEqual({ low: e.spousal.low, likely: e.spousal.likely, high: e.spousal.high });
    expect(p.metadata.range.child).toEqual({ low: e.child.low, likely: e.child.likely, high: e.child.high });
    expect(p.metadata.range.combined.likely).toBe(e.combined.headline);
  });

  it('emits payor/payee monthly so the §7 support-aware net position keeps working', () => {
    const e = deriveSupportEstimate(inputs);
    const p = buildSupportRangePayload(e, inputs);
    expect(p.metadata.payorMonthly).toBe(12000);
    expect(p.metadata.payeeMonthly).toBe(2000);
  });

  it('uses a uniform (non-state-specific) basis label', () => {
    const p = buildSupportRangePayload(deriveSupportEstimate(inputs), inputs);
    expect(p.spousalSupport.basis).toMatch(/AAML/);
    expect(p.metadata.formulaId).toBe('aaml_uniform_estimate');
  });

  it('omits spousal/child blocks when their likely figure is 0', () => {
    const noKidsNoSpousal = { ...inputs, incomeSpouse: '2000', numChildren: '0' };
    const p = buildSupportRangePayload(deriveSupportEstimate(noKidsNoSpousal), noKidsNoSpousal);
    expect(p.spousalSupport).toBeNull();
    expect(p.childSupport).toBeNull();
  });

  it('metadata.incomeEntered is true when at least one income is filled in', () => {
    const p = buildSupportRangePayload(deriveSupportEstimate(inputs), inputs);
    expect(p.metadata.incomeEntered).toBe(true);
  });

  it('metadata.incomeEntered is false when both incomes are blank (no genuine data — blueprintStore completion gate)', () => {
    const blank = { ...inputs, incomeYou: '', incomeSpouse: '' };
    const p = buildSupportRangePayload(deriveSupportEstimate(blank), blank);
    expect(p.metadata.incomeEntered).toBe(false);
    expect(Number.isFinite(Number(p.totalMonthlySupport))).toBe(true); // still finite (coerced 0) — the gate is metadata-driven, not this
  });

  it('metadata.incomeEntered is true when only one party’s income is entered (a real $0-earner spouse)', () => {
    const oneEntered = { ...inputs, incomeYou: '', incomeSpouse: '12000' };
    const p = buildSupportRangePayload(deriveSupportEstimate(oneEntered), oneEntered);
    expect(p.metadata.incomeEntered).toBe(true);
  });
});
