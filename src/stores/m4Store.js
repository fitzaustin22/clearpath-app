import { create } from 'zustand';
import { persist } from 'zustand/middleware';

const initialFilingStatusOptimizer = {
  inputs: {
    grossAnnualIncome: 0,
    spouseGrossAnnualIncome: 0,
    otherIncome: 0,
    dependents: 0,
    hasQualifyingChild: false,
    paidMoreThanHalfHouseholdCosts: false,
    separatedLastSixMonths: false,
    divorceTimeline: null,
  },
  results: null,
  completedAt: null,
  prePopulated: { fromM3: false },
};

const initialPITTaxDiscount = {
  inputs: {
    planBalance: 500000,
    planType: '401k',
    currentAge: 45,
    withdrawalStartAge: 65,
    withdrawalEndAge: 85,
    effectiveTaxRate: 25,
    discountRate: 5.0,
    totalCashAssets: 500000,
    showPropertyDivision: true,
  },
  results: null,
  completedAt: null,
  prePopulated: { fromM2: false, fromTool1: false },
};

export const useM4Store = create(
  persist(
    (set, get) => ({
      filingStatusOptimizer: { ...initialFilingStatusOptimizer, inputs: { ...initialFilingStatusOptimizer.inputs } },
      pitTaxDiscount: { ...initialPITTaxDiscount, inputs: { ...initialPITTaxDiscount.inputs } },

      setFilingStatusInputs: (inputs) =>
        set((state) => ({
          filingStatusOptimizer: {
            ...state.filingStatusOptimizer,
            inputs: { ...state.filingStatusOptimizer.inputs, ...inputs },
          },
        })),

      setFilingStatusResults: (results) =>
        set((state) => ({
          filingStatusOptimizer: {
            ...state.filingStatusOptimizer,
            results,
            completedAt: new Date().toISOString(),
          },
        })),

      setPITInputs: (inputs) =>
        set((state) => ({
          pitTaxDiscount: {
            ...state.pitTaxDiscount,
            inputs: { ...state.pitTaxDiscount.inputs, ...inputs },
          },
        })),

      setPITResults: (results) =>
        set((state) => ({
          pitTaxDiscount: {
            ...state.pitTaxDiscount,
            results,
            completedAt: new Date().toISOString(),
          },
        })),

      setPrePopulated: (tool, source) =>
        set((state) => ({
          [tool]: {
            ...state[tool],
            prePopulated: { ...state[tool].prePopulated, [source]: true },
          },
        })),

      resetM4: () =>
        set({
          filingStatusOptimizer: {
            ...initialFilingStatusOptimizer,
            inputs: { ...initialFilingStatusOptimizer.inputs },
          },
          pitTaxDiscount: {
            ...initialPITTaxDiscount,
            inputs: { ...initialPITTaxDiscount.inputs },
          },
        }),
    }),
    { name: 'clearpath-m4' }
  )
);

export default useM4Store;
