/**
 * Tests for `pvHelpers` type-narrow + range-aware helpers per [R5b-16].
 *
 * The pre-existing `getHeadlinePV` and `getMaritalPV` return single `best`
 * numbers. PR-B2-α adds two range-aware siblings, `getHeadlinePVRange` and
 * `getMaritalPVRange`, returning `{ best, low, high }` so QDRO §8.6.2 can
 * render the "(range $X–$Y)" disclosure mirroring §8.6.5's wording — without
 * dereferencing the discriminated `pv` union outside this module.
 */

import { describe, it, expect } from 'vitest';
import {
  getHeadlinePV,
  getMaritalPV,
  getHeadlinePVRange,
  getMaritalPVRange,
} from '../pvHelpers.js';

function nonCovertureResults(best = 400000, low = 360000, high = 450000) {
  return {
    path: 'tier_2',
    formulaId: 'pva_db_tier2_v1',
    pv: { best, low, high },
    coverture: null,
  };
}

function covertureResults() {
  return {
    path: 'tier_3',
    formulaId: 'pva_db_tier3_coverture_v1',
    pv: {
      total: { best: 500000, low: 450000, high: 550000 },
      marital: { best: 200000, low: 180000, high: 220000 },
    },
    coverture: { fraction: 0.4 },
  };
}

function flagOnlyResults() {
  return {
    path: 'flag_only',
    formulaId: null,
    pv: null,
    coverture: null,
  };
}

describe('getHeadlinePVRange', () => {
  it('returns { best, low, high } for non-coverture paths from pv.{best,low,high}', () => {
    expect(getHeadlinePVRange(nonCovertureResults())).toEqual({
      best: 400000,
      low: 360000,
      high: 450000,
    });
  });

  it('returns the total range for coverture paths from pv.total.{best,low,high}', () => {
    expect(getHeadlinePVRange(covertureResults())).toEqual({
      best: 500000,
      low: 450000,
      high: 550000,
    });
  });

  it('returns null for flag-only results (pv === null)', () => {
    expect(getHeadlinePVRange(flagOnlyResults())).toBeNull();
  });

  it('returns null for null/undefined results', () => {
    expect(getHeadlinePVRange(null)).toBeNull();
    expect(getHeadlinePVRange(undefined)).toBeNull();
  });
});

describe('getMaritalPVRange', () => {
  it('returns { best, low, high } for coverture paths from pv.marital.{best,low,high}', () => {
    expect(getMaritalPVRange(covertureResults())).toEqual({
      best: 200000,
      low: 180000,
      high: 220000,
    });
  });

  it('returns null for non-coverture paths', () => {
    expect(getMaritalPVRange(nonCovertureResults())).toBeNull();
  });

  it('returns null for flag-only results', () => {
    expect(getMaritalPVRange(flagOnlyResults())).toBeNull();
  });

  it('returns null for null/undefined results', () => {
    expect(getMaritalPVRange(null)).toBeNull();
    expect(getMaritalPVRange(undefined)).toBeNull();
  });
});

describe('range helpers agree with point helpers on the headline best/marital best', () => {
  it('getHeadlinePVRange(...).best === getHeadlinePV(...) when result is non-null', () => {
    const nc = nonCovertureResults();
    expect(getHeadlinePVRange(nc).best).toBe(getHeadlinePV(nc));

    const c = covertureResults();
    expect(getHeadlinePVRange(c).best).toBe(getHeadlinePV(c));
  });

  it('getMaritalPVRange(...).best === getMaritalPV(...) for coverture paths', () => {
    const c = covertureResults();
    expect(getMaritalPVRange(c).best).toBe(getMaritalPV(c));
  });

  it('both range helpers return null exactly when their point helpers return null', () => {
    const flag = flagOnlyResults();
    expect(getHeadlinePVRange(flag)).toBeNull();
    expect(getHeadlinePV(flag)).toBeNull();

    const nc = nonCovertureResults();
    expect(getMaritalPVRange(nc)).toBeNull();
    expect(getMaritalPV(nc)).toBeNull();
  });
});
