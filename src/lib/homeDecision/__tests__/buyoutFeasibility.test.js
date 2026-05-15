// __tests__/buyoutFeasibility.test.js
//
// Coverage for §9.2.1 / §9.8.3 buyout-feasibility (shortfall) signal.
// Rule: shortfall = verdictTier === 'red' && bindingConstraint !== 'underwater'.
// Fitz Q1: underwater is excluded — handled by its own narrative, not the
// shortfall banner. No double-flagging.

import { describe, it, expect } from 'vitest';
import { evaluateBuyoutFeasibility } from '../buyoutFeasibility';
import { calculateKeepAndRefi } from '../projectionEngine';

// ── Unit tests — evaluateBuyoutFeasibility ──────────────────────────────────

describe('evaluateBuyoutFeasibility — shortfall signal', () => {
  it('red + dti → shortfall true', () => {
    expect(evaluateBuyoutFeasibility({ verdictTier: 'red', bindingConstraint: 'dti' }))
      .toEqual({ shortfall: true });
  });

  it('red + credit → shortfall true', () => {
    expect(evaluateBuyoutFeasibility({ verdictTier: 'red', bindingConstraint: 'credit' }))
      .toEqual({ shortfall: true });
  });

  it('red + multiple → shortfall true', () => {
    expect(evaluateBuyoutFeasibility({ verdictTier: 'red', bindingConstraint: 'multiple' }))
      .toEqual({ shortfall: true });
  });

  it('red + underwater → shortfall false (Fitz Q1 exclusion)', () => {
    expect(evaluateBuyoutFeasibility({ verdictTier: 'red', bindingConstraint: 'underwater' }))
      .toEqual({ shortfall: false });
  });

  it('yellow + dti → shortfall false', () => {
    expect(evaluateBuyoutFeasibility({ verdictTier: 'yellow', bindingConstraint: 'dti' }))
      .toEqual({ shortfall: false });
  });

  it('yellow + credit → shortfall false', () => {
    expect(evaluateBuyoutFeasibility({ verdictTier: 'yellow', bindingConstraint: 'credit' }))
      .toEqual({ shortfall: false });
  });

  it('yellow + margin-of-safety → shortfall false', () => {
    expect(evaluateBuyoutFeasibility({ verdictTier: 'yellow', bindingConstraint: 'margin-of-safety' }))
      .toEqual({ shortfall: false });
  });

  it('yellow + multiple → shortfall false', () => {
    expect(evaluateBuyoutFeasibility({ verdictTier: 'yellow', bindingConstraint: 'multiple' }))
      .toEqual({ shortfall: false });
  });

  it('green + none → shortfall false', () => {
    expect(evaluateBuyoutFeasibility({ verdictTier: 'green', bindingConstraint: 'none' }))
      .toEqual({ shortfall: false });
  });
});

// ── Integration tests — calculateKeepAndRefi threads feasibility ──────────

// Shared fixture matching projectionEngine.test.js convention.
const SHARED_INPUTS_BASE = {
  currentFMV: 600_000,
  existingMortgageBalance: 400_000,
  existingMortgageRate: 0.045,
  existingMortgageRemainingTermMonths: 300,
  monthlyPropertyTax: 500,
  monthlyInsurance: 100,
  monthlyHOA: 0,
  userPostDivorceGrossMonthlyIncome: 9_000,
  userTotalMonthlyDebtPayments: 300,
  startingLiquidCash: 50_000,
  userCreditScoreBand: 'excellent',
  userState: 'CA',
  homeAcquisitionYear: 2018,
  currentYear: 2026,
  propertyAppreciationRateReal: 0,
  spouseEquityShare: 0.5,
  costBasis: 350_000,
  costBasisFilingStatus: 'mfj',
  refiRate: 0.0625,
  refiClosingCostsPercent: 0.035,
};

describe('calculateKeepAndRefi — feasibility threading (integration)', () => {
  it('(a) high debt / low income → non-underwater red → shortfall true on both feasibility and metadata', () => {
    // Force back-end DTI >> 38% threshold: very high debt, low income.
    // housing payment ~ P&I on ~$300k + taxes + insurance ≈ $3,500/mo
    // back-end = (housingPayment + debt) / income >> 0.38
    const r = calculateKeepAndRefi({
      ...SHARED_INPUTS_BASE,
      userPostDivorceGrossMonthlyIncome: 4_000,
      userTotalMonthlyDebtPayments: 2_500,
    });
    expect(r.refiQualification.verdictTier).toBe('red');
    expect(r.refiQualification.bindingConstraint).not.toBe('underwater');
    expect(r.feasibility.shortfall).toBe(true);
    expect(r.metadata.shortfall).toBe(true);
  });

  it('(b) underwater inputs → feasibility.shortfall false (bindingConstraint is underwater)', () => {
    const r = calculateKeepAndRefi({
      ...SHARED_INPUTS_BASE,
      currentFMV: 300_000,
      existingMortgageBalance: 400_000,
    });
    expect(r.refiQualification.verdictTier).toBe('red');
    expect(r.refiQualification.bindingConstraint).toBe('underwater');
    expect(r.feasibility.shortfall).toBe(false);
    expect(r.metadata.shortfall).toBe(false);
  });

  it('(c) healthy green case → shortfall false', () => {
    // High FMV relative to mortgage → low LTV; high income → low DTI → green verdict.
    // FMV=1_000_000, mortgage=200_000, spouseEquity=0.5:
    //   buyout = 400_000, preRoll = 600_000, CC = 21_000, totalLoan = 621_000, LTV ≈ 0.621 < 0.80 ✓
    //   P&I ≈ $3,822/mo; with income $30k, FE ≈ 14%, BE ≈ 15% → well within green thresholds ✓
    const r = calculateKeepAndRefi({
      ...SHARED_INPUTS_BASE,
      currentFMV: 1_000_000,
      existingMortgageBalance: 200_000,
      userPostDivorceGrossMonthlyIncome: 30_000,
      userTotalMonthlyDebtPayments: 200,
    });
    expect(r.refiQualification.verdictTier).toBe('green');
    expect(r.feasibility.shortfall).toBe(false);
    expect(r.metadata.shortfall).toBe(false);
  });
});
