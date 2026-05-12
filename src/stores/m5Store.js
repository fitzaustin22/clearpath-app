/**
 * m5Store — Zustand state for the four M5 tools, conformed to spec literals at §13 step 2:
 *   - Marital Home Decision Analyzer (homeDecision; §9.3 / §9.10 / §14.1)
 *   - QDRO Decision Guide       (qdroDecision; §8.10.1)
 *   - Pension Valuation Analyzer (pensionValuation; §7.6.4)
 *   - Support Estimator          (supportEstimator; §6.5.1 / §6.5.2 / §6.5.7)
 *
 * Initial state matches the locked-literal shapes from the §13 step 2 prompt. Asset-CRUD
 * setters (qdroDecision / pensionValuation) and per-tool calc setters land alongside the
 * respective tool implementations in §13 steps 3 / 4 / 5 / 7.
 *
 * Zustand consumer convention: never use array methods (.filter/.map/.reduce/.sort) inside
 * selectors — they return new references on every call and cause infinite re-renders.
 *   CORRECT: const scenarios = useM5Store((s) => s.homeDecision.savedScenarios);
 *            const labels = useMemo(() => scenarios.map(s => s.label), [scenarios]);
 *   WRONG:   const labels = useM5Store((s) => s.homeDecision.savedScenarios.map(s => s.label));
 */

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

// ─── §6.5.1 Support Estimator inputs (locked literal) ──────────────────────
const initialPartyInputs = {
  grossMonthly: null,
  imputeIncome: false,
  imputedEarningCapacity: null,
  healthInsurance: 0,
  childcare: 0,
  parentingTimeNights: 0,
  otherSupportObligations: 0,
};

function makeInitialSupportEstimator() {
  return {
    inputs: {
      partyA: { ...initialPartyInputs },
      partyB: { ...initialPartyInputs },
      numChildren: 0,
      state: 'OTHER',
      marriageLengthYears: null,
      nyCustodyConfig: null,
      temporal: 'post_divorce',
      depth: 'standard',
      caseEffectiveDate: null,
      fullWorksheet: null,
    },
    results: null,
    _prePopSources: null,
  };
}

// ─── §9.3 Home Decision Analyzer inputs ────────────────────────────────────
function makeInitialHomeDecision() {
  return {
    inputs: {
      // §9.3.1 shared inputs
      currentFMV: null,
      existingMortgageBalance: null,
      existingMortgageRate: null,
      monthlyPropertyTax: null,
      monthlyInsurance: null,
      monthlyHOA: 0,
      userPostDivorceGrossMonthlyIncome: null,
      userTotalMonthlyDebtPayments: 0,
      userCreditScoreBand: null,
      userState: null,
      homeAcquisitionYear: null,
      propertyAppreciationRateReal: 0,
      spouseEquityShare: 0.5,
      // §9.3.2 keep & refinance
      buyoutAmount: null,
      refiRate: null,
      refiClosingCostsPercent: null,
      refiTerm: '30-year',
      // §9.3.2 sell now (realtor/closing constants shared with deferred-sale per Q-3)
      realtorCommissionPercent: 0.05,
      saleClosingCostsPercent: 0.02,
      expectedFilingStatusAtSellNow: null,
      userMovedOutYearsAgo: 0,
      // §9.3.2 deferred sale
      occupancyYears: null,
      interimCostSharePct: 50,
      stressTestUserPays100Pct: false,
      deferredSaleMortgageContinuity: 'refi-at-current',
    },
    results: null,
    // §9.10 / §14.1 forward-compat metadata — populated at calc time, not at init.
    metadata: null,
    userSelection: null,
    _prePopSources: null,
  };
}

// ─── §8.10.1 QDRO Decision Guide slice (object-keyed by assetId) ──────────
function makeInitialQDRODecision() {
  return { assets: {} };
}

// ─── §7.6.4 Pension Valuation Analyzer slice (object-keyed by assetId) ────
function makeInitialPensionValuation() {
  return { assets: {} };
}

// ─── Store ──────────────────────────────────────────────────────────────────
export const useM5Store = create(
  persist(
    () => ({
      homeDecision: makeInitialHomeDecision(),
      qdroDecision: makeInitialQDRODecision(),
      pensionValuation: makeInitialPensionValuation(),
      supportEstimator: makeInitialSupportEstimator(),
    }),
    {
      name: 'clearpath-m5',
      storage: createJSONStorage(() => localStorage),
    },
  ),
);

export default useM5Store;
