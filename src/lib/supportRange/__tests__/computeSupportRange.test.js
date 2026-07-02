import { describe, it, expect } from 'vitest';
import {
  RANGE_SPREAD, ROUND_TO, roundToIncrement, computeSupport, deriveSupportEstimate,
} from '../computeSupportRange';

const base = {
  region: 'MD', incomeYou: '', incomeSpouse: '', numChildren: '0',
  parentingPct: 65, childcare: '', health: '', marriageYears: '', existingSupport: '',
};

describe('roundToIncrement', () => {
  it('rounds to the nearest $25 by default', () => {
    expect(roundToIncrement(0)).toBe(0);
    expect(roundToIncrement(12)).toBe(0);
    expect(roundToIncrement(13)).toBe(25);
    expect(roundToIncrement(2087)).toBe(2075);
    expect(roundToIncrement(2090)).toBe(2100);
  });
  it('honors a custom increment', () => {
    expect(roundToIncrement(2087, 100)).toBe(2100);
  });
  it('exposes the documented defaults', () => {
    expect(RANGE_SPREAD).toBe(0.15);
    expect(ROUND_TO).toBe(25);
  });
});

describe('computeSupport — spousal AAML rule + 40% cap', () => {
  it('applies 30%/20% with the 40%-of-combined cap binding', () => {
    const c = computeSupport({ ...base, incomeYou: '2000', incomeSpouse: '12000' });
    expect(c.sheIsPayee).toBe(true);
    expect(c.alimony).toBeCloseTo(3200, 6);
  });
  it('caps alimony so payee share stays under 40% of combined', () => {
    const c = computeSupport({ ...base, incomeYou: '3500', incomeSpouse: '6500' });
    expect(c.alimony).toBeCloseTo(500, 6);
  });
  it('reduces payor capacity by existing support before the 30/20', () => {
    const c = computeSupport({ ...base, incomeYou: '2000', incomeSpouse: '12000', existingSupport: '2000' });
    expect(c.alimony).toBeCloseTo(2600, 6);
  });
  it('floors alimony at 0 when incomes are close (drives the no-spousal copy)', () => {
    const c = computeSupport({ ...base, incomeYou: '5000', incomeSpouse: '5200' });
    expect(c.alimony).toBe(0);
  });
});

describe('computeSupport — direction when she is the higher earner', () => {
  it('sets sheIsPayee=false when you > sp (she pays)', () => {
    const c = computeSupport({ ...base, incomeYou: '12000', incomeSpouse: '2000' });
    expect(c.sheIsPayee).toBe(false);
    expect(c.alimony).toBeCloseTo(3200, 6);
  });
  it('treats an exact tie as she-receives (<= )', () => {
    const c = computeSupport({ ...base, incomeYou: '5000', incomeSpouse: '5000' });
    expect(c.sheIsPayee).toBe(true);
  });
  it('caps numChildren at 5', () => {
    expect(computeSupport({ ...base, incomeYou: '4000', incomeSpouse: '6000', numChildren: '6' }).n).toBe(5);
  });
});

describe('computeSupport — child cross-credit sign (positive => she receives)', () => {
  it('is positive when children are mostly with her', () => {
    const c = computeSupport({ ...base, incomeYou: '4000', incomeSpouse: '6000', numChildren: '2', parentingPct: 70 });
    expect(c.childToHer).toBeGreaterThan(0);
  });
  it('is negative when children are mostly with the higher-earning spouse and she is the higher earner', () => {
    const c = computeSupport({ ...base, incomeYou: '8000', incomeSpouse: '2000', numChildren: '2', parentingPct: 20 });
    expect(c.childToHer).toBeLessThan(0);
  });
  it('is zero with no children', () => {
    const c = computeSupport({ ...base, incomeYou: '5000', incomeSpouse: '5000', numChildren: '0', parentingPct: 50 });
    expect(c.childToHer).toBe(0);
  });
});

describe('deriveSupportEstimate — bands, no-spousal threshold, duration, summary', () => {
  it('rounds each band figure to the nearest $25', () => {
    const e = deriveSupportEstimate({ ...base, incomeYou: '2000', incomeSpouse: '12000' });
    expect(e.spousal.likely).toBe(3200);
    expect(e.spousal.low).toBe(2725);
    expect(e.spousal.high).toBe(3675);
  });
  it('flags no spousal support when alimony < 1', () => {
    const e = deriveSupportEstimate({ ...base, incomeYou: '5000', incomeSpouse: '5000' });
    expect(e.spousal.direction).toBe('none');
    expect(e.spousal.label).toBe('No spousal support indicated');
    expect(e.duration).toBe('—');
  });
  it('labels spousal receive/pay from her perspective', () => {
    expect(deriveSupportEstimate({ ...base, incomeYou: '2000', incomeSpouse: '12000' }).spousal.direction).toBe('receive');
    expect(deriveSupportEstimate({ ...base, incomeYou: '12000', incomeSpouse: '2000' }).spousal.direction).toBe('pay');
  });
  it('duration is blank with no marriage length, long-term at >= 20 yrs, else max(1, round(years*0.4))', () => {
    const recv = { ...base, incomeYou: '2000', incomeSpouse: '12000' };
    expect(deriveSupportEstimate({ ...recv, marriageYears: '' }).duration).toBe('—');
    expect(deriveSupportEstimate({ ...recv, marriageYears: '22' }).duration).toBe('Often long-term');
    expect(deriveSupportEstimate({ ...recv, marriageYears: '10' }).duration).toBe('About 4 years');
    expect(deriveSupportEstimate({ ...recv, marriageYears: '2' }).duration).toBe('About 1 year');
  });
  it('builds the summary line with the state name and child count', () => {
    const e = deriveSupportEstimate({ ...base, region: 'MD', incomeYou: '2000', incomeSpouse: '12000', numChildren: '2' });
    expect(e.summaryLine).toBe('Maryland · 2 children · AAML guideline');
  });
  it('combined headline is |netToHer| rounded to $25 with the receive/pay direction', () => {
    const e = deriveSupportEstimate({ ...base, incomeYou: '2000', incomeSpouse: '12000', numChildren: '2', parentingPct: 65 });
    expect(e.combined.direction).toBe('receive');
    expect(e.combined.headline).toBe(4975);
  });
});

describe('deriveSupportEstimate — child zero-state (twin of the spousal none branch)', () => {
  it('~$0 child support with kids -> direction none, sibling label, calm dynamic sentence', () => {
    // Equal incomes + 50/50 nights: spOwes === youOwes -> childToHer exactly 0.
    const e = deriveSupportEstimate({
      ...base, incomeYou: '4000', incomeSpouse: '4000', numChildren: '2', parentingPct: 50,
    });
    expect(e.child.direction).toBe('none');
    expect(e.child.label).toBe('No child support indicated');
    expect(e.child.driver).toBe(
      'With 2 children in your care 50% of nights, the guideline points to little or no child support changing hands here.',
    );
  });

  it('uses singular copy for one child', () => {
    const e = deriveSupportEstimate({
      ...base, incomeYou: '4000', incomeSpouse: '4000', numChildren: '1', parentingPct: 65,
    });
    // 65/35 with equal incomes is NOT zero; force zero via 50/50.
    const z = deriveSupportEstimate({
      ...base, incomeYou: '4000', incomeSpouse: '4000', numChildren: '1', parentingPct: 50,
    });
    expect(e.child.direction).not.toBe('none');
    expect(z.child.direction).toBe('none');
    expect(z.child.driver).toBe(
      'With 1 child in your care 50% of nights, the guideline points to little or no child support changing hands here.',
    );
  });

  it('blank incomes with kids -> none (the reported $0/$0/$0 band bug path)', () => {
    const e = deriveSupportEstimate({ ...base, numChildren: '2', parentingPct: 65 });
    expect(e.child.direction).toBe('none');
    expect(e.child.label).toBe('No child support indicated');
    expect(e.child.driver).toContain('2 children in your care 65% of nights');
  });

  it('keeps the dedicated no-children branch unchanged', () => {
    const e = deriveSupportEstimate({ ...base, incomeYou: '4000', incomeSpouse: '4000', numChildren: '0' });
    expect(e.child.direction).toBe('none');
    expect(e.child.label).toBe('No child support');
    expect(e.child.driver).toBe('You told us there are no children to support.');
  });

  it('a real nonzero child amount still returns a receive/pay band', () => {
    const r = deriveSupportEstimate({ ...base, incomeYou: '2000', incomeSpouse: '12000', numChildren: '2', parentingPct: 65 });
    expect(r.child.direction).toBe('receive');
    expect(r.child.likely).toBeGreaterThan(0);
    const p = deriveSupportEstimate({ ...base, incomeYou: '12000', incomeSpouse: '2000', numChildren: '2', parentingPct: 20 });
    expect(p.child.direction).toBe('pay');
  });
});
