import { describe, it, expect, beforeEach } from 'vitest';
import {
  useM3Store,
  ANNUAL_401K_LIMIT,
  CATCH_UP_401K_AMOUNT,
  SS_WAGE_CAP,
} from '../m3Store.js';
import F2 from '../../test/fixtures/v2-golden/F2.json';

// Memo C — year-pinned 2026 income constants. SS wage base $184,500 (ssa.gov
// cbb), 401(k) elective deferral $24,500 and age-50 catch-up ADD-ON $8,000
// (IRS Notice 2025-67). The catch-up constant is the add-on alone; the 50+
// total ($32,500) is computed at the warning site.
const F2_PAYSTUB_INPUTS = F2.stores['clearpath-m3-store'].payStubDecoder.inputs;

function runPayStub(inputs) {
  useM3Store.setState((s) => ({
    payStubDecoder: { ...s.payStubDecoder, inputs },
  }));
  useM3Store.getState().calculatePayStubResults();
  return useM3Store.getState().payStubDecoder.results;
}

describe('m3Store 2026 income constants (memo C)', () => {
  it('pins the published 2026 values', () => {
    expect(SS_WAGE_CAP).toBe(184500); // ssa.gov contribution & benefit base, 2026
    expect(ANNUAL_401K_LIMIT).toBe(24500); // Notice 2025-67, §402(g)(1)
    expect(CATCH_UP_401K_AMOUNT).toBe(8000); // Notice 2025-67, §414(v)(2)(B)(i) — add-on, not total
  });

  it('the 50+ total derives as deferral + catch-up = 32,500', () => {
    expect(ANNUAL_401K_LIMIT + CATCH_UP_401K_AMOUNT).toBe(32500);
  });
});

describe('F2 fixture pay-stub warning traps survive the 2026 update', () => {
  beforeEach(() => {
    // F2: grossPayPerCheck 7,800 × 24 (semimonthly) = 187,200/yr gross.
    runPayStub(F2_PAYSTUB_INPUTS);
  });

  it('SS-cap warning still fires (187,200 > 184,500) — the fixture trap survives', () => {
    const results = useM3Store.getState().payStubDecoder.results;
    const ssWarn = results.warnings.find((w) => /Social Security wage cap/.test(w));
    expect(ssWarn).toBeTruthy();
    expect(ssWarn).toContain('184,500');
  });

  it('401(k) warning intentionally does NOT fire for F2 (23,520 < 24,500)', () => {
    // F2 401(k): 980/check × 24 = 23,520/yr, now below the 2026 limit 24,500.
    const results = useM3Store.getState().payStubDecoder.results;
    const k401Warn = results.warnings.find((w) => /401\(k\) contributions/.test(w));
    expect(k401Warn).toBeUndefined();
  });
});

describe('401(k) warning text stays truthful (50+ total = 32,500)', () => {
  it('shows the under-50 limit and the 50+ total when contributions exceed the limit', () => {
    // 1,200/check × 24 = 28,800/yr > 24,500 → warning fires.
    const inputs = {
      ...F2_PAYSTUB_INPUTS,
      deductions: F2_PAYSTUB_INPUTS.deductions.map((d) =>
        d.id === '401k' ? { ...d, perPaycheck: 1200 } : d
      ),
    };
    const results = runPayStub(inputs);
    const k401Warn = results.warnings.find((w) => /401\(k\) contributions/.test(w));
    expect(k401Warn).toBeTruthy();
    expect(k401Warn).toContain('24,500'); // under 50
    expect(k401Warn).toContain('32,500'); // 50+ total (24,500 + 8,000)
  });
});
