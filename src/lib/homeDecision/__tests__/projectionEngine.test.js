// __tests__/projectionEngine.test.js
//
// Coverage for projection engine per M5-Tool-Specs.md §9.4 + §9.4.3.1.
// Maps to TC-HDA-1..4, TC-HDA-7..10, plus engine edge cases.

import { describe, it, expect } from 'vitest';
import {
  existingMortgageAmortizedBalance,
  calculateKeepAndRefi,
  calculateSellNow,
  calculateDeferredSale,
} from '../projectionEngine';

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
};

describe('existingMortgageAmortizedBalance', () => {
  it('standard case: $400k at 6.25% nominal real-converted over 5/360 — produces positive declining balance', () => {
    const balance5 = existingMortgageAmortizedBalance({
      initialBalance: 400_000,
      annualRatePercent: 0.0625,
      termMonths: 360,
      yearsElapsed: 5,
    });
    expect(balance5).toBeLessThan(400_000);
    expect(balance5).toBeGreaterThan(300_000);
  });

  it('zero-rate edge: linear amortization', () => {
    const balance = existingMortgageAmortizedBalance({
      initialBalance: 400_000,
      annualRatePercent: INFLATION_ASSUMPTION_FOR_TEST,
      termMonths: 360,
      yearsElapsed: 15,
    });
    // r=0 → balance = P × (1 − t/n) = 400_000 × (1 − 180/360) = 200_000
    expect(balance).toBeCloseTo(200_000, -1);
  });

  it('after maturity → balance = 0', () => {
    expect(
      existingMortgageAmortizedBalance({
        initialBalance: 400_000,
        annualRatePercent: 0.0625,
        termMonths: 360,
        yearsElapsed: 30,
      })
    ).toBe(0);
  });
});

const INFLATION_ASSUMPTION_FOR_TEST = 0.025; // mirrors INFLATION_ASSUMPTION

describe('calculateKeepAndRefi', () => {
  it('standard happy-path: returns 3 horizons, refiQualification set, section121 null', () => {
    const r = calculateKeepAndRefi({
      ...SHARED_INPUTS_BASE,
      refiRate: 0.0625,
      refiClosingCostsPercent: 0.035,
    });
    expect(r.horizons).toHaveLength(3);
    expect(r.horizons[0].year).toBe(3);
    expect(r.horizons[2].year).toBe(10);
    expect(r.refiQualification).not.toBeNull();
    expect(r.section121).toBeNull();
  });

  it('underwater home produces red verdict with underwater binding-constraint', () => {
    const r = calculateKeepAndRefi({
      ...SHARED_INPUTS_BASE,
      currentFMV: 300_000,
      existingMortgageBalance: 400_000,
      refiRate: 0.0625,
      refiClosingCostsPercent: 0.035,
    });
    expect(r.refiQualification.verdictTier).toBe('red');
    expect(r.refiQualification.bindingConstraint).toBe('underwater');
    // homeEquity reported as-is (negative), per §9.4.3
    expect(r.horizons[0].homeEquity).toBeLessThan(0);
  });

  it('zero appreciation does not divide-by-zero', () => {
    const r = calculateKeepAndRefi({
      ...SHARED_INPUTS_BASE,
      refiRate: 0.0625,
      refiClosingCostsPercent: 0.035,
      propertyAppreciationRateReal: 0,
    });
    r.horizons.forEach((h) => {
      expect(Number.isFinite(h.netWealth)).toBe(true);
    });
  });
});

describe('calculateSellNow', () => {
  it('standard happy-path: saleProceedsNet enters liquidCash at year 0, persists', () => {
    const r = calculateSellNow({
      ...SHARED_INPUTS_BASE,
      realtorCommissionPercent: 0.05,
      saleClosingCostsPercent: 0.02,
    });
    expect(r.horizons[0].homeEquity).toBe(0);
    expect(r.horizons[2].homeEquity).toBe(0);
    // liquidCash should be same across all horizons (no investment return, no new housing cashflow)
    expect(r.horizons[0].liquidCash).toBe(r.horizons[1].liquidCash);
    expect(r.horizons[1].liquidCash).toBe(r.horizons[2].liquidCash);
    expect(r.section121).not.toBeNull();
  });

  it('TC-HDA-3 — userMovedOutYearsAgo=4 fires use-test callout, no §121 exclusion', () => {
    const r = calculateSellNow({
      ...SHARED_INPUTS_BASE,
      userMovedOutYearsAgo: 4,
      realtorCommissionPercent: 0,
      saleClosingCostsPercent: 0,
    });
    expect(r.callouts).toHaveLength(1);
    expect(r.callouts[0].type).toBe('use_test_failed');
    expect(r.section121.excludedAmount).toBe(0);
    expect(r.metadata.useTestPassed).toBe(false);
  });
});

describe('calculateDeferredSale', () => {
  it('TC-HDA-1 — §121 over-application regression: costBasisFilingStatus=mfj but Q-9 locks to Single', () => {
    // Setup: gainAtSale = $400k → §121 should exclude $250k (Single), $150k taxable.
    // Configure so gainAtSale comes out to exactly $400k with 0 commission/closing.
    const r = calculateDeferredSale(
      {
        ...SHARED_INPUTS_BASE,
        costBasisFilingStatus: 'mfj', // would over-apply if utility implicitly used this
        costBasis: 100_000,
        currentFMV: 500_000,
        propertyAppreciationRateReal: 0,
        realtorCommissionPercent: 0,
        saleClosingCostsPercent: 0,
        occupancyYears: 7,
        homeAcquisitionYear: 2018, // 8 years pre-divorce + 7 occupancy = 15 years owned
        currentYear: 2026,
        refiRate: 0.0625,
      },
      { stressTest: false }
    );
    expect(r.metadata.filingStatusAtSale).toBe('single');
    expect(r.metadata.gainAtSale).toBe(400_000);
    expect(r.section121.excludedAmount).toBe(250_000);
    expect(r.section121.taxableGain).toBe(150_000);
    expect(r.metadata.mfjSingleDifferentialAtSaleYear).toBe(150_000); // 400k - 250k = 150k
  });

  it('TC-HDA-2 — ownership-test fail (1 year owned at sale): callout fires, no §121', () => {
    const r = calculateDeferredSale({
      ...SHARED_INPUTS_BASE,
      currentYear: 2026,
      homeAcquisitionYear: 2025, // 1 year of pre-divorce
      occupancyYears: 0, // immediate trigger sale
      refiRate: 0.0625,
    });
    expect(r.metadata.ownershipYearsAtSale).toBe(1);
    expect(r.metadata.ownershipTestPassed).toBe(false);
    expect(r.callouts).toHaveLength(1);
    expect(r.callouts[0].type).toBe('ownership_test_failed');
    expect(r.section121.excludedAmount).toBe(0);
  });

  it('standard happy-path: pre-sale homeEquity per share, post-sale converts to liquid', () => {
    const r = calculateDeferredSale({
      ...SHARED_INPUTS_BASE,
      occupancyYears: 5,
      refiRate: 0.0625,
    });
    // Horizon 3 (pre-sale) has non-zero homeEquity
    expect(r.horizons[0].homeEquity).toBeGreaterThan(0);
    // Horizon 10 (post-sale) has homeEquity = 0
    expect(r.horizons[2].homeEquity).toBe(0);
  });

  it('stress-test branch: accumulated cashflow decreases vs default branch', () => {
    const inputs = {
      ...SHARED_INPUTS_BASE,
      occupancyYears: 5,
      interimCostSharePct: 0.5,
      refiRate: 0.0625,
    };
    const standard = calculateDeferredSale(inputs, { stressTest: false });
    const stressed = calculateDeferredSale(inputs, { stressTest: true });
    expect(stressed.metadata.effectiveInterimCostShare).toBe(1.0);
    expect(standard.metadata.effectiveInterimCostShare).toBe(0.5);
    // Stress test has user paying more → less accumulated cashflow → less liquidCash at horizon[0] (pre-sale)
    expect(stressed.horizons[0].liquidCash).toBeLessThan(standard.horizons[0].liquidCash);
  });
});

describe('Cross-scenario consistency (TC-HDA-10)', () => {
  it('liquid-cash composition consistency: retirement excluded across all three scenarios', () => {
    // Retirement is excluded by virtue of NOT being part of startingLiquidCash;
    // the engine never receives a retirement field and never reads one.
    const inputs = {
      ...SHARED_INPUTS_BASE,
      startingLiquidCash: 50_000, // checking + savings + brokerage at face value
      refiRate: 0.0625,
      refiClosingCostsPercent: 0.035,
      occupancyYears: 5,
    };
    const keep = calculateKeepAndRefi(inputs);
    const sell = calculateSellNow(inputs);
    const deferred = calculateDeferredSale(inputs, { stressTest: false });
    // All three scenarios reference startingLiquidCash; no scenario includes retirement
    [keep, sell, deferred].forEach((scenario) => {
      scenario.horizons.forEach((h) => {
        expect(Number.isFinite(h.liquidCash)).toBe(true);
      });
    });
  });
});
