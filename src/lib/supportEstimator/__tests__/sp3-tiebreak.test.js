import { describe, it, expect } from 'vitest';
import { calculateSupport } from '../calculateSupport.js';

const baseParty = {
  grossMonthly: 5000,
  imputeIncome: false,
  imputedEarningCapacity: null,
  healthInsurance: 0,
  childcare: 0,
  parentingTimeNights: 100,
  otherSupportObligations: 0,
};

const baseInputs = {
  partyA: { ...baseParty, grossMonthly: 8000 },
  partyB: { ...baseParty, grossMonthly: 4000 },
  numChildren: 2,
  state: 'VA',
  marriageLengthYears: 10,
  nyCustodyConfig: null,
  temporal: 'post_divorce',
  depth: 'standard',
  caseEffectiveDate: null,
  fullWorksheet: null,
};

describe('SP-3 — custodial tie-break throw guard', () => {
  it('throws when parentingTimeNights tied AND numChildren > 0 AND non-NY-override', () => {
    expect(() =>
      calculateSupport({
        ...baseInputs,
        partyA: { ...baseInputs.partyA, parentingTimeNights: 100 },
        partyB: { ...baseInputs.partyB, parentingTimeNights: 100 },
      })
    ).toThrow(/ambiguous custodial parent/);
  });

  it('does NOT throw when tied parentingTimeNights but numChildren === 0', () => {
    expect(() =>
      calculateSupport({
        ...baseInputs,
        partyA: { ...baseInputs.partyA, parentingTimeNights: 0 },
        partyB: { ...baseInputs.partyB, parentingTimeNights: 0 },
        numChildren: 0,
        marriageLengthYears: 8,
        state: 'MD',
      })
    ).not.toThrow();
  });

  it('does NOT throw when NY override is set, even with tied parentingTimeNights', () => {
    expect(() =>
      calculateSupport({
        ...baseInputs,
        partyA: { ...baseInputs.partyA, parentingTimeNights: 0 },
        partyB: { ...baseInputs.partyB, parentingTimeNights: 0 },
        state: 'NY',
        nyCustodyConfig: 'kids_with_payor',
      })
    ).not.toThrow();
  });
});
