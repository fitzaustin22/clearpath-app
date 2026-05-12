import { describe, it, expect } from 'vitest';
import {
  NY_MAINTENANCE_INCOME_CAP,
  VA_CHILD_SUPPORT_CAP,
  lookupAtDate,
} from './effectiveDateConstants.js';

describe('lookupAtDate', () => {
  it('NY_MAINTENANCE_INCOME_CAP at 2026-06-01 → annualValue 241000', () => {
    const r = lookupAtDate(NY_MAINTENANCE_INCOME_CAP, new Date('2026-06-01'));
    expect(r.annualValue).toBe(241000);
  });

  it('NY_MAINTENANCE_INCOME_CAP at 2024-06-01 → annualValue 228000', () => {
    const r = lookupAtDate(NY_MAINTENANCE_INCOME_CAP, new Date('2024-06-01'));
    expect(r.annualValue).toBe(228000);
  });

  it('VA_CHILD_SUPPORT_CAP at 2026-06-01 → monthlyValue 42500', () => {
    const r = lookupAtDate(VA_CHILD_SUPPORT_CAP, new Date('2026-06-01'));
    expect(r.monthlyValue).toBe(42500);
  });

  it('out-of-order input array is sorted internally before lookup', () => {
    const records = [
      { effectiveDate: '2022-01-01', annualValue: 100 },
      { effectiveDate: '2026-01-01', annualValue: 300 },
      { effectiveDate: '2024-01-01', annualValue: 200 },
    ];
    const r = lookupAtDate(records, new Date('2024-06-01'));
    expect(r.annualValue).toBe(200);
  });
});
