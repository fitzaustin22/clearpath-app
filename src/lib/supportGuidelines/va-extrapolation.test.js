import { describe, it, expect } from 'vitest';
import { lookupChildSupportVA } from './index.js';

// Memo D, row V10 — Va. Code § 20-108.2(B): "For combined monthly gross income
// amounts falling between amounts shown in the schedule, basic child support
// obligation amounts shall be extrapolated." The engine previously floor-looked
// (lower row); it now linearly interpolates between adjacent rows.
//
// Anchor rows (1-child column): [350,68], [400,78], [450,88] … top [42500,3306].
describe('VA between-row linear extrapolation (§ 20-108.2(B))', () => {
  it('exact schedule rows are unchanged', () => {
    expect(lookupChildSupportVA(400, 1).basicSupport).toBe(78);
    expect(lookupChildSupportVA(450, 1).basicSupport).toBe(88);
    expect(lookupChildSupportVA(350, 1).basicSupport).toBe(68);
  });

  it('the top schedule row ($42,500) is unchanged and stays within-schedule', () => {
    const r = lookupChildSupportVA(42500, 1);
    expect(r.basicSupport).toBe(3306);
    expect(r.scheduleStatus).toBe('within');
  });

  it('a midpoint income interpolates linearly between adjacent rows', () => {
    // 425 is halfway between 400 ($78) and 450 ($88) → 83.
    expect(lookupChildSupportVA(425, 1).basicSupport).toBe(83);
  });

  it('one dollar over a row interpolates a fractional value, not the floor', () => {
    // 401 between 400 ($78) and 450 ($88): 78 + (1/50)*(88-78) = 78.2.
    expect(lookupChildSupportVA(401, 1).basicSupport).toBeCloseTo(78.2, 6);
    // The old floor behavior (returning 78) is explicitly rejected:
    expect(lookupChildSupportVA(401, 1).basicSupport).not.toBe(78);
  });

  it('above-cap path (income > $42,500) is unchanged — marginal-percentage method', () => {
    const r = lookupChildSupportVA(50000, 1);
    expect(r.scheduleStatus).toBe('above');
    // top row 3306 + 2.6% × (50000 − 42500) = 3306 + 195 = 3501.
    expect(r.basicSupport).toBeCloseTo(3501, 6);
  });
});
