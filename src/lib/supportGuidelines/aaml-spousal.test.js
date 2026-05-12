import { describe, it, expect } from 'vitest';
import {
  AAML_COEFFICIENTS,
  calculateAAMLSpousal,
  aamlDurationGuidance,
} from './aaml-spousal.js';

describe('AAML_COEFFICIENTS', () => {
  it('v1_canonical matches the locked-literal §6.5.8 values', () => {
    expect(AAML_COEFFICIENTS.v1_canonical).toEqual({
      payorCoef: 0.30,
      payeeCoef: 0.20,
      capRatio: 0.40,
    });
  });
});

describe('calculateAAMLSpousal', () => {
  it('cap-binding case: payor 10k / payee 4k → monthlyAmount 1600, capBinds true', () => {
    const result = calculateAAMLSpousal({
      payorGrossMonthly: 10000,
      payeeGrossMonthly: 4000,
    });
    // calcA = 0.30*10000 − 0.20*4000 = 2200
    // calcB_cap = 0.40*14000 − 4000 = 1600
    expect(result.monthlyAmount).toBe(1600);
    expect(result.capBinds).toBe(true);
    expect(result.formulaUsed).toBe('aaml_30_20_with_40pct_cap');
    expect(result.intermediateValues).toEqual({ calcA: 2200, capValue: 1600 });
  });

  it('equal incomes case: 5k / 5k → monthlyAmount 0 (cap pushes result negative, clamped to 0)', () => {
    const result = calculateAAMLSpousal({
      payorGrossMonthly: 5000,
      payeeGrossMonthly: 5000,
    });
    expect(result.monthlyAmount).toBe(0);
  });
});

describe('aamlDurationGuidance', () => {
  it('5 years → multiplier 0.50, label "3-10 years"', () => {
    expect(aamlDurationGuidance(5)).toEqual({ multiplier: 0.50, label: '3-10 years' });
  });

  it('25 years → multiplier null, label "20+ years (permanent)"', () => {
    expect(aamlDurationGuidance(25)).toEqual({ multiplier: null, label: '20+ years (permanent)' });
  });
});
