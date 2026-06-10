// src/lib/homeDecision/projectionEngine.js
//
// Per-scenario projection engines for HDA per M5-Tool-Specs.md §9.4 + §9.4.3.1.
// Real-vs-nominal conversion per §9.4.2 applied at engine boundary (amortization
// uses real rate; user-facing inputs remain in their natural units).
//
// Exported scenarios:
//   - calculateKeepAndRefi
//   - calculateSellNow
//   - calculateDeferredSale (accepts { stressTest } option per §9.4.5)
//
// Helper:
//   - existingMortgageAmortizedBalance per §9.4.3.1

import {
  INFLATION_ASSUMPTION,
  PROJECTION_HORIZONS,
  DEFAULT_REFI_TERM_MONTHS,
} from './homeDecisionConstants';
import { calculateLtv } from './ltvCalculator';
import {
  lookupPmiRate,
  calculateMonthlyPmi,
  projectPmiDropYear,
} from './pmiCalculator';
import { evaluateRefiVerdict } from './refiQualifier';
import { evaluateBuyoutFeasibility } from './buyoutFeasibility';
import { evaluateOwnershipTest } from './ownershipTestEligibility';
import { evaluateUseTest } from './useTestEligibility';
import { calculateMfjDifferential } from './mfjDifferentialFootnote';
import { calculateSection121Exclusion } from '../section121';

// v1 simplification — flat federal long-term capital-gains rate applied to
// post-§121 taxable gain. Bracket-aware modeling deferred to v1.1 (no §15
// entry on the spec side at v1, but the simplification is acknowledged).
const CAPITAL_GAINS_RATE = 0.15;

const LTV_PMI_THRESHOLD = 0.80;

/**
 * §9.4.3.1 amortization function. Uses real rate per §9.4.2 (real-vs-nominal
 * convention applied at engine boundary for projection consistency).
 *
 * @param {Object} args
 * @param {number} args.initialBalance - P₀ at year 0
 * @param {number} args.annualRatePercent - nominal APR as decimal (e.g., 0.0625)
 * @param {number} args.termMonths
 * @param {number} args.yearsElapsed
 * @returns {number} remaining principal balance at year `yearsElapsed` (in real dollars)
 */
export function existingMortgageAmortizedBalance({
  initialBalance,
  annualRatePercent,
  termMonths,
  yearsElapsed,
}) {
  const realRate = annualRatePercent - INFLATION_ASSUMPTION;
  const r = realRate / 12;
  const n = termMonths;
  const t = yearsElapsed * 12;
  if (t >= n) return 0;
  if (r === 0) return initialBalance * (1 - t / n);
  return (initialBalance * (Math.pow(1 + r, n) - Math.pow(1 + r, t))) /
    (Math.pow(1 + r, n) - 1);
}

/** Standard mortgage P&I per nominal contract terms. */
function calculateMonthlyPandI({ loanAmount, annualRatePercent, termMonths }) {
  const r = annualRatePercent / 12;
  if (r === 0) return loanAmount / termMonths;
  return (loanAmount * r * Math.pow(1 + r, termMonths)) /
    (Math.pow(1 + r, termMonths) - 1);
}

/** Keep & refinance scenario per §9.4.1 / §9.4.3 / §9.4.4. */
export function calculateKeepAndRefi(inputs) {
  const {
    currentFMV,
    existingMortgageBalance,
    monthlyPropertyTax = 0,
    monthlyInsurance = 0,
    monthlyHOA = 0,
    userPostDivorceGrossMonthlyIncome = 0,
    userTotalMonthlyDebtPayments = 0,
    startingLiquidCash = 0,
    propertyAppreciationRateReal = 0,
    spouseEquityShare = 0.5,
    buyoutAmount,
    refiRate,
    refiClosingCostsPercent,
    userCreditScoreBand,
    refiTermMonths = DEFAULT_REFI_TERM_MONTHS,
  } = inputs;

  const effectiveBuyout =
    buyoutAmount ?? Math.max(0, (currentFMV - existingMortgageBalance)) * spouseEquityShare;

  const { ltv, closingCostsRolledIn, totalLoan } = calculateLtv({
    existingMortgageBalance,
    buyoutAmount: effectiveBuyout,
    refiClosingCostsPercent,
    currentFMV,
  });

  const pmiRate = lookupPmiRate({ creditBand: userCreditScoreBand, ltv });
  const monthlyPmi = calculateMonthlyPmi({ loanAmount: totalLoan, pmiRatePercent: pmiRate });
  const projectedPmiDropYr =
    ltv > LTV_PMI_THRESHOLD
      ? projectPmiDropYear({
          loanAmount: totalLoan,
          currentFMV,
          refiRatePercent: refiRate,
          propertyAppreciationRateReal,
        })
      : null;

  const monthlyPandI = calculateMonthlyPandI({
    loanAmount: totalLoan,
    annualRatePercent: refiRate,
    termMonths: refiTermMonths,
  });

  const housingPayment =
    monthlyPandI + monthlyPropertyTax + monthlyInsurance + monthlyHOA + monthlyPmi;
  const frontEndDti =
    userPostDivorceGrossMonthlyIncome > 0
      ? housingPayment / userPostDivorceGrossMonthlyIncome
      : Infinity;
  const backEndDti =
    userPostDivorceGrossMonthlyIncome > 0
      ? (housingPayment + userTotalMonthlyDebtPayments) / userPostDivorceGrossMonthlyIncome
      : Infinity;

  const refiQualification = evaluateRefiVerdict({
    frontEndDti,
    backEndDti,
    ltv,
    creditBand: userCreditScoreBand,
    currentFMV,
    existingMortgageBalance,
  });
  const feasibility = evaluateBuyoutFeasibility({
    verdictTier: refiQualification.verdictTier,
    bindingConstraint: refiQualification.bindingConstraint,
  });

  const monthlyNetCashflow = userPostDivorceGrossMonthlyIncome - housingPayment;

  const horizons = PROJECTION_HORIZONS.map((year) => {
    const refiBalance = existingMortgageAmortizedBalance({
      initialBalance: totalLoan,
      annualRatePercent: refiRate,
      termMonths: refiTermMonths,
      yearsElapsed: year,
    });
    const appreciatedFMV = currentFMV * Math.pow(1 + propertyAppreciationRateReal, year);
    const homeEquity = appreciatedFMV - refiBalance;
    const accumulatedCashflow = monthlyNetCashflow * 12 * year;
    const liquidCash = startingLiquidCash + accumulatedCashflow;
    const netWealth = homeEquity + liquidCash;
    return { year, netWealth, liquidCash, homeEquity };
  });

  return {
    horizons,
    section121: null,
    refiQualification,
    feasibility,
    callouts: [],
    metadata: {
      scenario: 'keepAndRefi',
      ltvAtRefi: ltv,
      closingCostsRolledIn,
      totalLoan,
      refiRate,
      monthlyPandI,
      monthlyPmi,
      pmiRatePercent: pmiRate,
      projectedPmiDropYear: projectedPmiDropYr,
      housingPayment,
      frontEndDti,
      backEndDti,
      effectiveBuyout,
      verdictTier: refiQualification.verdictTier,
      bindingConstraint: refiQualification.bindingConstraint,
      shortfall: feasibility.shortfall,
    },
  };
}

/** Sell-now scenario per §9.4.1 / §9.4.3 / §9.4.4. */
export function calculateSellNow(inputs) {
  const {
    currentFMV,
    existingMortgageBalance,
    startingLiquidCash = 0,
    spouseEquityShare = 0.5,
    realtorCommissionPercent = 0.05,
    saleClosingCostsPercent = 0.02,
    expectedFilingStatusAtSellNow,
    costBasisFilingStatus,
    userMovedOutYearsAgo = 0,
    homeAcquisitionYear,
    currentYear,
    costBasis = 0,
  } = inputs;

  const useTest = evaluateUseTest({ userMovedOutYearsAgo });

  // §121(c) period facts at the flow's native year granularity (the same
  // continuous-ownership assumption as ownershipTestEligibility). Underivable
  // (missing year facts) → null → calculateSection121Exclusion applies the
  // full cap, byte-identical to the pre-§121(c) behavior.
  const ownershipMonths =
    Number.isFinite(currentYear) && Number.isFinite(homeAcquisitionYear)
      ? Math.max(0, (currentYear - homeAcquisitionYear) * 12)
      : null;
  const useMonths =
    ownershipMonths === null
      ? null
      : Math.max(0, ownershipMonths - Math.round(userMovedOutYearsAgo * 12));

  const grossSaleProceeds =
    currentFMV * (1 - realtorCommissionPercent - saleClosingCostsPercent);
  const netEquity = grossSaleProceeds - existingMortgageBalance;
  const gainAtSale = grossSaleProceeds - costBasis;

  const filingStatusAtSale = expectedFilingStatusAtSellNow ?? costBasisFilingStatus ?? 'single';
  let section121;
  let taxOnGainPostSection121 = 0;
  const callouts = [];

  if (!useTest.passes) {
    section121 = { excludedAmount: 0, taxableGain: Math.max(0, gainAtSale) };
    taxOnGainPostSection121 = section121.taxableGain * CAPITAL_GAINS_RATE;
    callouts.push(useTest.callout);
  } else if (gainAtSale > 0) {
    section121 = calculateSection121Exclusion({
      gain: gainAtSale,
      filingStatusAtSale,
      ...(ownershipMonths === null ? {} : { ownershipMonths, useMonths }),
    });
    taxOnGainPostSection121 = section121.taxableGain * CAPITAL_GAINS_RATE;
  } else {
    section121 = { excludedAmount: 0, taxableGain: 0 };
  }

  const saleProceedsNet = (1 - spouseEquityShare) * netEquity - taxOnGainPostSection121;

  // Sale event at year 0; proceeds persist through all horizons.
  // accumulatedCashflow = 0 per §9.4.4 (no post-sale housing assumption in v1).
  const horizons = PROJECTION_HORIZONS.map((year) => {
    const homeEquity = 0;
    const liquidCash = startingLiquidCash + saleProceedsNet;
    const netWealth = homeEquity + liquidCash;
    return { year, netWealth, liquidCash, homeEquity };
  });

  return {
    horizons,
    section121,
    refiQualification: null,
    callouts,
    metadata: {
      scenario: 'sellNow',
      grossSaleProceeds,
      netEquity,
      saleProceedsNet,
      gainAtSale,
      taxOnGainPostSection121,
      filingStatusAtSale,
      userMovedOutYearsAgo,
      useTestPassed: useTest.passes,
      // §121(c) disclosure facts (D-V2-7): the periods actually applied.
      section121OwnershipMonths: ownershipMonths,
      section121UseMonths: useMonths,
    },
  };
}

/** Deferred-sale scenario per §9.4.1 / §9.4.3 / §9.4.4 / §9.4.5. */
export function calculateDeferredSale(inputs, { stressTest = false } = {}) {
  const {
    currentFMV,
    existingMortgageBalance,
    existingMortgageRate = 0,
    existingMortgageRemainingTermMonths = DEFAULT_REFI_TERM_MONTHS,
    monthlyPropertyTax = 0,
    monthlyInsurance = 0,
    monthlyHOA = 0,
    userPostDivorceGrossMonthlyIncome = 0,
    startingLiquidCash = 0,
    spouseEquityShare = 0.5,
    propertyAppreciationRateReal = 0,
    realtorCommissionPercent = 0.05,
    saleClosingCostsPercent = 0.02,
    occupancyYears,
    interimCostSharePct = 0.5,
    deferredSaleMortgageContinuity = 'refi-at-current',
    refiRate,
    refiTermMonths = DEFAULT_REFI_TERM_MONTHS,
    homeAcquisitionYear,
    currentYear,
    costBasis = 0,
  } = inputs;

  const effectiveInterimCostShare = stressTest ? 1.0 : interimCostSharePct;

  const ownershipTest = evaluateOwnershipTest({
    currentYear,
    homeAcquisitionYear,
    occupancyYears,
  });

  const isRefiAtCurrent = deferredSaleMortgageContinuity === 'refi-at-current';
  const amortRate = isRefiAtCurrent ? refiRate : existingMortgageRate;
  const amortTerm = isRefiAtCurrent ? refiTermMonths : existingMortgageRemainingTermMonths;

  const monthlyPandI = calculateMonthlyPandI({
    loanAmount: existingMortgageBalance,
    annualRatePercent: amortRate,
    termMonths: amortTerm,
  });

  const interimHousingCost = monthlyPandI + monthlyPropertyTax + monthlyInsurance + monthlyHOA;
  const userInterimHousingCost = interimHousingCost * effectiveInterimCostShare;
  const monthlyNetCashflowPreSale = userPostDivorceGrossMonthlyIncome - userInterimHousingCost;

  const appreciatedFMV = currentFMV * Math.pow(1 + propertyAppreciationRateReal, occupancyYears);
  const grossSaleProceeds =
    appreciatedFMV * (1 - realtorCommissionPercent - saleClosingCostsPercent);
  const mortgageAtSale = existingMortgageAmortizedBalance({
    initialBalance: existingMortgageBalance,
    annualRatePercent: amortRate,
    termMonths: amortTerm,
    yearsElapsed: occupancyYears,
  });
  const netEquityAtSale = grossSaleProceeds - mortgageAtSale;

  const gainAtSale = grossSaleProceeds - costBasis;
  let section121;
  let taxOnGainPostSection121 = 0;
  const callouts = [];

  if (!ownershipTest.passes) {
    section121 = { excludedAmount: 0, taxableGain: Math.max(0, gainAtSale) };
    taxOnGainPostSection121 = section121.taxableGain * CAPITAL_GAINS_RATE;
    callouts.push(ownershipTest.callout);
  } else if (gainAtSale > 0) {
    // Q-9 hard-lock to Single, regardless of costBasisFilingStatus.
    section121 = calculateSection121Exclusion({ gain: gainAtSale, filingStatusAtSale: 'single' });
    taxOnGainPostSection121 = section121.taxableGain * CAPITAL_GAINS_RATE;
  } else {
    section121 = { excludedAmount: 0, taxableGain: 0 };
  }

  const mfjDifferentialResult =
    ownershipTest.passes && gainAtSale > 0
      ? calculateMfjDifferential({ gainAtSale })
      : null;

  const userSaleProceeds =
    (1 - spouseEquityShare) * netEquityAtSale - taxOnGainPostSection121;
  const preSaleAccumulatedCashflow = monthlyNetCashflowPreSale * 12 * occupancyYears;

  const horizons = PROJECTION_HORIZONS.map((year) => {
    if (year < occupancyYears) {
      const fmvY = currentFMV * Math.pow(1 + propertyAppreciationRateReal, year);
      const mortY = existingMortgageAmortizedBalance({
        initialBalance: existingMortgageBalance,
        annualRatePercent: amortRate,
        termMonths: amortTerm,
        yearsElapsed: year,
      });
      const homeEquity = (1 - spouseEquityShare) * (fmvY - mortY);
      const accumulatedCashflow = monthlyNetCashflowPreSale * 12 * year;
      const liquidCash = startingLiquidCash + accumulatedCashflow;
      const netWealth = homeEquity + liquidCash;
      return { year, netWealth, liquidCash, homeEquity };
    }
    // post-sale: home equity converts to liquid cash; zero real return per Q-7
    const homeEquity = 0;
    const liquidCash = startingLiquidCash + preSaleAccumulatedCashflow + userSaleProceeds;
    const netWealth = homeEquity + liquidCash;
    return { year, netWealth, liquidCash, homeEquity };
  });

  return {
    horizons,
    section121,
    refiQualification: null,
    callouts,
    metadata: {
      scenario: 'deferredSale',
      gainAtSale,
      appreciatedFMV,
      grossSaleProceeds,
      netEquityAtSale,
      mortgageAtSale,
      userSaleProceeds,
      taxOnGainPostSection121,
      ownershipYearsAtSale: ownershipTest.ownershipYearsAtSale,
      ownershipTestPassed: ownershipTest.passes,
      mfjSingleDifferentialAtSaleYear: mfjDifferentialResult?.differential ?? null,
      effectiveInterimCostShare,
      stressTest,
      filingStatusAtSale: 'single',
      deferredSaleMortgageContinuity,
    },
  };
}
