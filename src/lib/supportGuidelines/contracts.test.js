/**
 * Shape-level contract tests for the supportGuidelines barrel.
 * Per §6.5.9 gate: each public API exports correctly and returns spec-shaped
 * objects on representative inputs. Full calc validation lands in §13 step 3.
 */

import { describe, it, expect } from 'vitest';
import {
  lookupChildSupportVA,
  lookupChildSupportMD,
  lookupChildSupportDC,
  lookupChildSupportNY,
  lookupSpousalNY,
  lookupSpousalCA,
  lookupSpousalVA_PL,
  lookupSpousalMD,
  lookupSpousalDC,
  lookupSupportGeneric,
} from './index.js';

// Representative inputs: $5K + $3K combined → $8K monthly, 2 kids.
const COMBINED_MONTHLY = 8000;
const NUM_KIDS = 2;

const CHILD_LOOKUPS = [
  { name: 'lookupChildSupportVA', fn: lookupChildSupportVA, source: 'va' },
  { name: 'lookupChildSupportMD', fn: lookupChildSupportMD, source: 'md' },
  { name: 'lookupChildSupportDC', fn: lookupChildSupportDC, source: 'dc' },
  { name: 'lookupChildSupportNY', fn: lookupChildSupportNY, source: 'ny' },
];

describe('§6.5.3 child support return shape', () => {
  for (const { name, fn, source } of CHILD_LOOKUPS) {
    it(`${name} returns the guaranteed §6.5.3 fields`, () => {
      const r = fn(COMBINED_MONTHLY, NUM_KIDS);
      expect(typeof r.basicSupport).toBe('number');
      expect(r.source).toBe(source);
      expect(['within', 'above']).toContain(r.scheduleStatus);
      expect(typeof r.scheduleMax).toBe('number');
      expect(Array.isArray(r.notes)).toBe(true);
    });

    it(`${name} reports aboveScheduleMethod === null when scheduleStatus === 'within'`, () => {
      const r = fn(COMBINED_MONTHLY, NUM_KIDS);
      if (r.scheduleStatus === 'within') {
        expect(r.aboveScheduleMethod).toBeNull();
      }
    });
  }
});

const SPOUSAL_LOOKUPS = [
  {
    name: 'lookupSpousalNY',
    fn: () =>
      lookupSpousalNY({
        payorGrossMonthly: 5000,
        payeeGrossMonthly: 3000,
        numChildren: NUM_KIDS,
        nyCustodyConfig: 'kids_with_payee',
        marriageLengthYears: 10,
        temporal: 'post_divorce',
      }),
    expectSsrShape: 'object_or_null',
    durationExpect: 'object',
  },
  {
    name: 'lookupSpousalCA (post_divorce → factor test)',
    fn: () =>
      lookupSpousalCA({
        payorGrossMonthly: 5000,
        payeeGrossMonthly: 3000,
        temporal: 'post_divorce',
      }),
    expectSsrShape: 'null',
    durationExpect: 'null',
  },
  {
    name: 'lookupSpousalCA (pendente_lite → Santa Clara)',
    fn: () =>
      lookupSpousalCA({
        payorGrossMonthly: 5000,
        payeeGrossMonthly: 3000,
        temporal: 'pendente_lite',
      }),
    expectSsrShape: 'null',
    durationExpect: 'null',
  },
  {
    name: 'lookupSpousalVA_PL',
    fn: () =>
      lookupSpousalVA_PL({
        payorGrossMonthly: 5000,
        payeeGrossMonthly: 3000,
        numChildren: NUM_KIDS,
      }),
    expectSsrShape: 'null',
    durationExpect: 'null',
  },
  {
    name: 'lookupSpousalMD',
    fn: () =>
      lookupSpousalMD({
        payorGrossMonthly: 5000,
        payeeGrossMonthly: 3000,
        marriageLengthYears: 10,
        temporal: 'post_divorce',
      }),
    expectSsrShape: 'null',
    durationExpect: 'object',
  },
  {
    name: 'lookupSpousalDC',
    fn: () =>
      lookupSpousalDC({
        payorGrossMonthly: 5000,
        payeeGrossMonthly: 3000,
        marriageLengthYears: 10,
        temporal: 'post_divorce',
      }),
    expectSsrShape: 'null',
    durationExpect: 'object',
  },
];

describe('§6.5.4 spousal return shape', () => {
  for (const { name, fn, expectSsrShape, durationExpect } of SPOUSAL_LOOKUPS) {
    it(`${name} returns the guaranteed §6.5.4 fields`, () => {
      const r = fn();
      expect(typeof r.monthlyAmount).toBe('number');
      expect(r.monthlyAmount).toBeGreaterThanOrEqual(0);
      expect(typeof r.formulaUsed).toBe('string');
      expect(r.cap).toBeDefined();
      expect(typeof r.cap.hit).toBe('boolean');
      expect(typeof r.capBinds).toBe('boolean');
      expect(typeof r.factorTestApplies).toBe('boolean');
      expect(Array.isArray(r.notes)).toBe(true);
    });

    it(`${name} ssr conditional shape`, () => {
      const r = fn();
      if (expectSsrShape === 'null') {
        expect(r.ssr).toBeNull();
      } else {
        // NY: ssr is either null OR a full object — both valid.
        if (r.ssr !== null) {
          expect(r.ssr).toMatchObject({
            activated: expect.any(Boolean),
            ssrAnnual: expect.any(Number),
            formulaResultBeforeSSR: expect.any(Number),
            formulaResultAfterSSR: expect.any(Number),
          });
        }
      }
    });

    it(`${name} duration conditional shape`, () => {
      const r = fn();
      if (durationExpect === 'null') {
        expect(r.duration).toBeNull();
      } else {
        expect(r.duration).toMatchObject({
          type: expect.stringMatching(/^(advisory_range|aaml_advisory_multiplier)$/),
          minMonths: expect.any(Number),
          statutorySource: expect.any(String),
        });
        expect(['number']).toContain(typeof r.duration.maxMonths);
      }
    });
  }
});

describe('lookupSupportGeneric (generic fallback)', () => {
  it('returns { child, spousal } per §6.5.5 generic-fallback description', () => {
    const r = lookupSupportGeneric({
      payorGrossMonthly: 5000,
      payeeGrossMonthly: 3000,
      numChildren: NUM_KIDS,
    });
    expect(r.child).toBeDefined();
    expect(r.spousal).toBeDefined();
  });

  it('child portion conforms to §6.5.3 shape', () => {
    const { child } = lookupSupportGeneric({
      payorGrossMonthly: 5000,
      payeeGrossMonthly: 3000,
      numChildren: NUM_KIDS,
    });
    expect(typeof child.basicSupport).toBe('number');
    expect(child.source).toBe('generic');
    expect(['within', 'above']).toContain(child.scheduleStatus);
    expect(typeof child.scheduleMax).toBe('number');
    expect(Array.isArray(child.notes)).toBe(true);
  });

  it('spousal portion: monthlyAmount: 0, formulaUsed: factor_test_approximation, factorTestApplies: true', () => {
    const { spousal } = lookupSupportGeneric({
      payorGrossMonthly: 5000,
      payeeGrossMonthly: 3000,
      numChildren: NUM_KIDS,
    });
    expect(spousal.monthlyAmount).toBe(0);
    expect(spousal.formulaUsed).toBe('factor_test_approximation');
    expect(spousal.factorTestApplies).toBe(true);
  });
});
