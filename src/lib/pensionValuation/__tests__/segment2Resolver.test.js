/**
 * §417(e) segment-2 lookup convention tests (v1 repair, 2026-06-10).
 * Convention: the rate of the most recent published month ≤ the valuation
 * date; latest month serves all later dates; pre-floor dates use the earliest
 * month and flag 'rate_month_floor_applied'.
 */
import { describe, test, expect } from 'vitest';
import {
  IRS_417E_SEGMENT_2_RATES,
  resolveSegment2Rate,
} from '../effectiveDateConstants.js';
import { calculatePensionValue } from '../index.js';

describe('verified rate table integrity', () => {
  test('seven verified months, ascending, no placeholder Notices, irs.gov URLs', () => {
    expect(IRS_417E_SEGMENT_2_RATES).toHaveLength(7);
    const months = IRS_417E_SEGMENT_2_RATES.map((r) => r.month);
    expect([...months].sort()).toEqual(months);
    for (const row of IRS_417E_SEGMENT_2_RATES) {
      expect(row.month).toMatch(/^\d{4}-\d{2}$/);
      expect(typeof row.segment2Pct).toBe('number');
      expect(row.segment2Pct).toBeGreaterThan(0);
      expect(row.segment2Pct).toBeLessThan(20);
      expect(row.noticeId).toMatch(/^Notice \d{4}-\d+$/);
      expect(row.noticeId).not.toMatch(/XX/);
      expect(row.noticeUrl).toMatch(/^https:\/\/www\.irs\.gov\/pub\/irs-drop\//);
    }
  });

  test('the verified values match the evidence memo verbatim', () => {
    expect(IRS_417E_SEGMENT_2_RATES.map((r) => [r.month, r.segment2Pct, r.noticeId])).toEqual([
      ['2025-10', 5.04, 'Notice 2025-74'],
      ['2025-11', 5.15, 'Notice 2026-2'],
      ['2025-12', 5.17, 'Notice 2026-12'],
      ['2026-01', 5.2, 'Notice 2026-14'],
      ['2026-02', 5.15, 'Notice 2026-19'],
      ['2026-03', 5.35, 'Notice 2026-26'],
      ['2026-04', 5.34, 'Notice 2026-31'],
    ]);
  });
});

describe('lookup convention', () => {
  test('valuation date inside a seeded month resolves that month', () => {
    expect(resolveSegment2Rate('2026-02-15')).toEqual({
      segment2Pct: 5.15,
      rateMonth: '2026-02',
      noticeId: 'Notice 2026-19',
      flags: [],
    });
  });

  test('LIVE COVERAGE-GAP REGRESSION: a June 2026 valuation resolves the latest seeded month (2026-04 / 5.34)', () => {
    expect(resolveSegment2Rate('2026-06-01')).toEqual({
      segment2Pct: 5.34,
      rateMonth: '2026-04',
      noticeId: 'Notice 2026-31',
      flags: [],
    });
    // The latest month keeps serving arbitrarily later dates until a newer
    // month is seeded — no expiration windows.
    expect(resolveSegment2Rate('2027-01-15').rateMonth).toBe('2026-04');
  });

  test('valuation date before the earliest seeded month floors AND flags', () => {
    expect(resolveSegment2Rate('2025-09-30')).toEqual({
      segment2Pct: 5.04,
      rateMonth: '2025-10',
      noticeId: 'Notice 2025-74',
      flags: ['rate_month_floor_applied'],
    });
  });

  test('month boundary: the 1st belongs to its own month; the prior day to the prior month', () => {
    expect(resolveSegment2Rate('2026-03-01').rateMonth).toBe('2026-03');
    expect(resolveSegment2Rate('2026-03-01').segment2Pct).toBe(5.35);
    expect(resolveSegment2Rate('2026-02-28').rateMonth).toBe('2026-02');
    // Earliest-month 1st resolves cleanly with NO floor flag.
    expect(resolveSegment2Rate('2025-10-01')).toEqual({
      segment2Pct: 5.04,
      rateMonth: '2025-10',
      noticeId: 'Notice 2025-74',
      flags: [],
    });
  });
});

describe('engine carries the resolution into persisted metadata', () => {
  const baseInputs = {
    path: 'tier_1',
    participantDOB: '1981-05-01',
    planNRA: 65,
    accruedMonthlyBenefitAtNRA: 3000,
    formOfBenefitOnStatement: 'single_life',
    vestingStatus: 'fully_vested',
    benefitSource: 'official_statement',
    mortalityTable: 'irs_417e',
    cola: 0,
  };

  test('post-gap valuation date: segment2Pct/rateMonth/noticeId in metadata, no flags', () => {
    const r = calculatePensionValue({ ...baseInputs, caseEffectiveDate: '2026-05-01' });
    expect(r.metadata.segment2Pct).toBe(5.34);
    expect(r.metadata.rateMonth).toBe('2026-04');
    expect(r.metadata.noticeId).toBe('Notice 2026-31');
    expect(r.metadata.rateResolutionFlags).toEqual([]);
  });

  test('pre-floor valuation date: floor flag rides the persisted metadata', () => {
    const r = calculatePensionValue({ ...baseInputs, caseEffectiveDate: '2025-09-01' });
    expect(r.metadata.segment2Pct).toBe(5.04);
    expect(r.metadata.rateMonth).toBe('2025-10');
    expect(r.metadata.rateResolutionFlags).toEqual(['rate_month_floor_applied']);
  });

  test('the legacy discountRateBps input no longer moves the math', () => {
    const a = calculatePensionValue({ ...baseInputs, caseEffectiveDate: '2026-05-01', discountRateBps: 1234 });
    const b = calculatePensionValue({ ...baseInputs, caseEffectiveDate: '2026-05-01', discountRateBps: 9999 });
    expect(a.pv.best).toBe(b.pv.best);
    expect(a.metadata.discountRateBps).toBe(1234); // echoed only
    expect(b.metadata.discountRateBps).toBe(9999);
  });
});
