// __tests__/calculateHomeDecision.test.js
//
// Coverage for top-level orchestrator + barrel completeness per
// M5-Tool-Specs.md §9.4.1 / §9.10 / §14.1. Maps to TC-HDA-11.

import { describe, it, expect } from 'vitest';
import { calculateHomeDecision } from '../calculateHomeDecision';
import * as barrel from '..';

const BASE_INPUTS = {
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
  occupancyYears: 5,
  interimCostSharePct: 0.5,
};

describe('calculateHomeDecision', () => {
  it('returns three scenarios + metadata block', () => {
    const r = calculateHomeDecision(BASE_INPUTS);
    expect(r.scenarios.keepAndRefi).toBeDefined();
    expect(r.scenarios.sellNow).toBeDefined();
    expect(r.scenarios.deferredSale).toBeDefined();
    expect(r.metadata).toBeDefined();
  });

  it('each scenario has horizons array of length 3 (years 3/6/10)', () => {
    const r = calculateHomeDecision(BASE_INPUTS);
    expect(r.scenarios.keepAndRefi.horizons).toHaveLength(3);
    expect(r.scenarios.sellNow.horizons).toHaveLength(3);
    expect(r.scenarios.deferredSale.horizons).toHaveLength(3);
    [3, 6, 10].forEach((year, i) => {
      expect(r.scenarios.keepAndRefi.horizons[i].year).toBe(year);
      expect(r.scenarios.sellNow.horizons[i].year).toBe(year);
      expect(r.scenarios.deferredSale.horizons[i].year).toBe(year);
    });
  });

  it('TC-HDA-11 partial-state — userSelection null at default', () => {
    const r = calculateHomeDecision(BASE_INPUTS);
    expect(r.metadata.userSelection).toBeNull();
    expect(r.metadata.selectionTimestamp).toBeNull();
  });

  it('stressTest option flows to Deferred-sale only', () => {
    const standard = calculateHomeDecision(BASE_INPUTS, { stressTest: false });
    const stressed = calculateHomeDecision(BASE_INPUTS, { stressTest: true });
    expect(stressed.metadata.stressTestUserPays100Pct).toBe(true);
    expect(standard.metadata.stressTestUserPays100Pct).toBe(false);
    expect(stressed.scenarios.deferredSale.metadata.effectiveInterimCostShare).toBe(1.0);
    expect(standard.scenarios.deferredSale.metadata.effectiveInterimCostShare).toBe(0.5);
    // Sell-now / Keep & refi should be identical regardless of stressTest
    expect(stressed.scenarios.sellNow.horizons[0].liquidCash).toBe(
      standard.scenarios.sellNow.horizons[0].liquidCash
    );
    expect(stressed.scenarios.keepAndRefi.horizons[0].liquidCash).toBe(
      standard.scenarios.keepAndRefi.horizons[0].liquidCash
    );
  });

  it('underwater home propagates to Keep & refi verdict (red, underwater)', () => {
    const r = calculateHomeDecision({
      ...BASE_INPUTS,
      currentFMV: 300_000,
      existingMortgageBalance: 400_000,
    });
    expect(r.scenarios.keepAndRefi.refiQualification.verdictTier).toBe('red');
    expect(r.scenarios.keepAndRefi.refiQualification.bindingConstraint).toBe('underwater');
  });

  it('metadata schema has all 26 value-type fields per §14.1', () => {
    const r = calculateHomeDecision(BASE_INPUTS);
    const m = r.metadata;
    const requiredFields = [
      // Theme A (9 fields)
      'expectedFilingStatusAtSellNow', 'realtorCommissionPercent', 'saleClosingCostsPercent',
      'propertyAppreciationRateReal', 'deferredSaleMortgageContinuity', 'interimCostSharePct',
      'stressTestUserPays100Pct', 'startingLiquidCash', 'existingMortgageRemainingTermMonths',
      // Theme B (4 fields)
      'homeAcquisitionYear', 'ownershipYearsAtSale', 'userMovedOutYearsAgo',
      'mfjSingleDifferentialAtSaleYear',
      // Theme C (8 fields)
      'verdictTier', 'bindingConstraint', 'refiRateProvenance', 'refiRate', 'closingCostsSource',
      'ltvAtRefi', 'pmiRatePercent', 'projectedPmiDropYear',
      // Theme D (2 fields, plus nested liquidCashComponents)
      'userSelection', 'selectionTimestamp',
      // Locked v1 assumptions (3 fields)
      'bpmiAssumption', 'conventionalLoanAssumption', 'realDollarConvention',
    ];
    expect(requiredFields).toHaveLength(26);
    requiredFields.forEach((f) => {
      expect(m).toHaveProperty(f);
    });
    // Nested objects
    expect(m.liquidCashComponents).toBeDefined();
    expect(m._prePopSources).toBeDefined();
  });

  it('cross-scenario invariant: §121 routing consistent (no cross-contamination)', () => {
    const r = calculateHomeDecision({
      ...BASE_INPUTS,
      costBasisFilingStatus: 'mfj',
      costBasis: 100_000,
      currentFMV: 500_000,
      realtorCommissionPercent: 0,
      saleClosingCostsPercent: 0,
      occupancyYears: 7,
    });
    // Sell-now uses costBasisFilingStatus (mfj) per Q-2 default
    expect(r.scenarios.sellNow.metadata.filingStatusAtSale).toBe('mfj');
    // Deferred-sale hard-locked to single per Q-9, regardless of mfj input
    expect(r.scenarios.deferredSale.metadata.filingStatusAtSale).toBe('single');
  });
});

describe('barrel completeness', () => {
  it('exports all 14+ named symbols from index.js', () => {
    const expected = [
      'calculateHomeDecision',
      'evaluateRefiVerdict',
      'calculateLtv', 'getStateClosingCostsDefault', 'isUnderwater',
      'lookupPmiRate', 'calculateMonthlyPmi', 'projectPmiDropYear',
      'evaluateOwnershipTest',
      'evaluateUseTest',
      'calculateMfjDifferential',
      'existingMortgageAmortizedBalance',
      'calculateKeepAndRefi', 'calculateSellNow', 'calculateDeferredSale',
      // Constants
      'REFI_RATE_BY_CREDIT_BAND', 'PMI_MATRIX', 'STATE_CLOSING_COSTS_DEFAULT',
      'V1_ASSUMPTIONS', 'PROJECTION_HORIZONS', 'INFLATION_ASSUMPTION',
    ];
    expected.forEach((name) => {
      expect(barrel[name], `barrel should export ${name}`).toBeDefined();
    });
  });
});
