import { describe, it, expect } from 'vitest';
import {
  FREQUENCY_MULTIPLIER,
  EXPENSE_FIELDS,
  EXPENSE_KEYS,
  DONUT_PALETTE,
  convertToMonthly,
  computeBudgetGap,
  getVerdictPresentation,
  getBarModel,
  getDonutModel,
} from '@/src/lib/m1/budgetGapMath';

// ─── Sample datasets ───────────────────────────────────────────
// Build-ready datasets from the design prototype's presetData() — the
// authoritative source for the three verdict states. (The README prose says
// the Tight set is "≈$4,150", which would be +$500 and is actually OUTSIDE its
// own 10% band; the prototype's tight preset sums to $4,350 → +$300, genuinely
// within band. We follow the prototype.)
//
// Keys use the FROZEN m1Store input names (healthInsurance / debtPayments),
// not the prototype's short labels (health / debt).
const SURPLUS = {
  grossPerCheck: 4292, freq: 'biweekly', share: 50,
  expenses: {
    housing: 1650, utilities: 240, groceries: 520, transportation: 380,
    healthInsurance: 450, childcare: 200, debtPayments: 220, personal: 290,
  },
};
const TIGHT = {
  grossPerCheck: 4292, freq: 'biweekly', share: 50,
  expenses: {
    housing: 1850, utilities: 250, groceries: 540, transportation: 400,
    healthInsurance: 470, childcare: 320, debtPayments: 240, personal: 280,
  },
};
const SHORTFALL = {
  grossPerCheck: 3157, freq: 'biweekly', share: 50,
  expenses: {
    housing: 1850, utilities: 260, groceries: 560, transportation: 420,
    healthInsurance: 520, childcare: 600, debtPayments: 250, personal: 200,
  },
};

describe('FREQUENCY_MULTIPLIER / convertToMonthly', () => {
  it('maps each pay frequency to a monthly multiplier', () => {
    expect(FREQUENCY_MULTIPLIER.weekly).toBeCloseTo(52 / 12, 10);
    expect(FREQUENCY_MULTIPLIER.biweekly).toBeCloseTo(26 / 12, 10);
    expect(FREQUENCY_MULTIPLIER.semimonthly).toBe(2);
    expect(FREQUENCY_MULTIPLIER.monthly).toBe(1);
  });

  it('converts a per-paycheck gross into a monthly figure per frequency', () => {
    expect(convertToMonthly(1200, 'weekly')).toBe(5200);     // 1200 × 52/12
    expect(convertToMonthly(1200, 'biweekly')).toBe(2600);   // 1200 × 26/12
    expect(convertToMonthly(1200, 'semimonthly')).toBe(2400);
    expect(convertToMonthly(1200, 'monthly')).toBe(1200);
  });

  it('treats blank / non-positive gross as zero', () => {
    expect(convertToMonthly(0, 'monthly')).toBe(0);
    expect(convertToMonthly('', 'biweekly')).toBe(0);
    expect(convertToMonthly(-100, 'monthly')).toBe(0);
  });

  it('parses formatted currency strings (commas)', () => {
    expect(convertToMonthly('1,200', 'monthly')).toBe(1200);
  });
});

describe('computeBudgetGap — surplus', () => {
  const r = computeBudgetGap(SURPLUS);
  it('income = grossMonthly × share', () => {
    expect(Math.round(r.income)).toBe(4650);
  });
  it('sums all eight expense lines', () => {
    expect(r.totalExpenses).toBe(3950);
  });
  it('gap = income − expenses ≈ +$700', () => {
    expect(Math.round(r.gap)).toBe(700);
  });
  it('verdict is surplus (gap exceeds the 10% band, positive)', () => {
    expect(Math.abs(r.gap)).toBeGreaterThan(r.tightBand);
    expect(r.kind).toBe('surplus');
  });
});

describe('computeBudgetGap — tight but workable', () => {
  const r = computeBudgetGap(TIGHT);
  it('gap ≈ +$300, within the 10% band', () => {
    expect(r.totalExpenses).toBe(4350);
    expect(Math.round(r.gap)).toBe(300);
    expect(Math.abs(r.gap)).toBeLessThanOrEqual(r.tightBand);
  });
  it('verdict is tight', () => {
    expect(r.kind).toBe('tight');
  });
  it('tightBand is exactly 10% of income', () => {
    expect(r.tightBand).toBeCloseTo(0.1 * r.income, 8);
  });
});

describe('computeBudgetGap — shortfall', () => {
  const r = computeBudgetGap(SHORTFALL);
  it('income ≈ $3,420', () => {
    expect(Math.round(r.income)).toBe(3420);
  });
  it('expenses sum to $4,660', () => {
    expect(r.totalExpenses).toBe(4660);
  });
  it('gap ≈ −$1,240', () => {
    expect(Math.round(r.gap)).toBe(-1240);
  });
  it('verdict is shortfall (gap exceeds band, negative)', () => {
    expect(Math.abs(r.gap)).toBeGreaterThan(r.tightBand);
    expect(r.kind).toBe('shortfall');
  });
});

describe('computeBudgetGap — edge cases', () => {
  it('0% share yields $0 income → shortfall when expenses exist', () => {
    const r = computeBudgetGap({ ...SURPLUS, share: 0 });
    expect(r.income).toBe(0);
    expect(r.kind).toBe('shortfall');
  });
  it('exactly balanced (gap 0) is tight', () => {
    const r = computeBudgetGap({
      grossPerCheck: 3950, freq: 'monthly', share: 100,
      expenses: { housing: 3950 },
    });
    expect(r.gap).toBe(0);
    expect(r.kind).toBe('tight');
  });
});

describe('getVerdictPresentation', () => {
  it('surplus → green, breathing-room copy', () => {
    const v = getVerdictPresentation('surplus', 700);
    expect(v.color).toBe('#2D8A4E');
    expect(v.narrative).toContain('breathing room');
    expect(v.barCaption).toBe('The green slice is yours to plan with.');
    expect(v.ctaBody).toContain('room to plan');
  });
  it('shortfall → red, gap copy', () => {
    const v = getVerdictPresentation('shortfall', -1240);
    expect(v.color).toBe('#C0392B');
    expect(v.narrative).toContain('a starting point');
    expect(v.barCaption).toContain('light slice');
    expect(v.ctaBody).toContain('seeing everything in one place');
  });
  it('tight → gold; bar caption flips on gap sign', () => {
    const pos = getVerdictPresentation('tight', 300);
    expect(pos.color).toBe('#8A7028');
    expect(pos.narrative).toContain('tight, but workable');
    expect(pos.barCaption).toContain('slim margin');
    expect(pos.barCaption).toContain('left after expenses');
    const neg = getVerdictPresentation('tight', -100);
    expect(neg.barCaption).toContain('slim gap');
    expect(neg.barCaption).toContain('light slice');
  });
});

describe('getBarModel', () => {
  it('surplus: cover + gap segments fill the income bar to 100%', () => {
    const { income, totalExpenses, gap } = computeBudgetGap(SURPLUS);
    const bar = getBarModel({ income, totalExpenses, gap });
    expect(bar.posGap).toBe(true);
    expect(bar.coverPct + bar.gapPct).toBeCloseTo(100, 6);
    expect(bar.coverPct).toBeCloseTo((totalExpenses / income) * 100, 6);
  });
  it('shortfall: cover + gap segments fill the expense bar to 100%', () => {
    const { income, totalExpenses, gap } = computeBudgetGap(SHORTFALL);
    const bar = getBarModel({ income, totalExpenses, gap });
    expect(bar.posGap).toBe(false);
    expect(bar.coverPct + bar.gapPct).toBeCloseTo(100, 6);
    expect(bar.coverPct).toBeCloseTo((income / totalExpenses) * 100, 6);
  });
});

describe('getDonutModel', () => {
  it('builds one full-circle segment per non-zero line', () => {
    const d = getDonutModel(SURPLUS.expenses);
    expect(d.total).toBe(3950);
    expect(d.segments).toHaveLength(8);
    expect(d.segments[0].key).toBe('housing');
    expect(d.segments[0].color).toBe('#1B2A4A');
    expect(d.segments[1].color).toBe('#C8A96E');
    expect(d.segments[d.segments.length - 1].endDeg).toBeCloseTo(360, 6);
    expect(d.gradient.startsWith('conic-gradient(')).toBe(true);
  });

  it('colors each line by its FIXED field index, skipping zeros', () => {
    // Drop childcare (index 5) to $0 — debtPayments (index 6) must keep
    // palette[6], not slide down to palette[5].
    const d = getDonutModel({ ...SURPLUS.expenses, childcare: 0 });
    expect(d.segments).toHaveLength(7);
    expect(d.segments.some((s) => s.key === 'childcare')).toBe(false);
    const debt = d.segments.find((s) => s.key === 'debtPayments');
    expect(debt.color).toBe(DONUT_PALETTE[6]); // #8A93A8
    const personal = d.segments.find((s) => s.key === 'personal');
    expect(personal.color).toBe(DONUT_PALETTE[7]); // #B9B2A2
  });

  it('empty expenses → no segments, neutral gradient', () => {
    const d = getDonutModel({});
    expect(d.total).toBe(0);
    expect(d.segments).toHaveLength(0);
  });
});

describe('shared config', () => {
  it('exposes the eight frozen-store expense keys in order', () => {
    expect(EXPENSE_KEYS).toEqual([
      'housing', 'utilities', 'groceries', 'transportation',
      'healthInsurance', 'childcare', 'debtPayments', 'personal',
    ]);
    expect(EXPENSE_FIELDS).toHaveLength(8);
  });
  it('donut palette is the eight spec colors in order', () => {
    expect(DONUT_PALETTE).toEqual([
      '#1B2A4A', '#C8A96E', '#33476B', '#D4B16A',
      '#4A5876', '#8A7028', '#8A93A8', '#B9B2A2',
    ]);
  });
});
