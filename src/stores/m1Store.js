import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

// TODO: For authenticated users (Essentials+), swap storage engine from
// sessionStorage to a Supabase-backed custom storage adapter so state
// survives across sessions and devices. The store shape stays identical;
// only the `storage` option in the persist config changes. Gate the swap
// on Clerk's `useUser().isSignedIn` (or server-side session) before
// creating the store, or use a `rehydrate` call after sign-in.

const initialReadinessAssessment = {
  answers: [],     // [{ questionId: string, score: number }]
  completed: false,
  results: null,   // { totalScore: number, domainScores: Record<string,number>, tier: string }
};

const initialBudgetGap = {
  inputs: {},          // form field state keyed by field name
  completed: false,
  results: null,       // { adjustedMonthlyIncome, totalExpenses, gap, gapPercent: number|null }
  emailCaptured: false,
};

export const useM1Store = create(
  persist(
    (set, get) => ({
      readinessAssessment: { ...initialReadinessAssessment },
      budgetGap: { ...initialBudgetGap },

      // --- Readiness Assessment actions ---
      setReadinessAnswer: (questionId, score) =>
        set((state) => {
          const existing = state.readinessAssessment.answers.filter(
            (a) => a.questionId !== questionId
          );
          return {
            readinessAssessment: {
              ...state.readinessAssessment,
              answers: [...existing, { questionId, score }],
            },
          };
        }),

      completeReadinessAssessment: (results) =>
        set((state) => ({
          readinessAssessment: {
            ...state.readinessAssessment,
            completed: true,
            results,
          },
        })),

      resetReadinessAssessment: () =>
        set({ readinessAssessment: { ...initialReadinessAssessment } }),

      // --- Budget Gap Calculator actions ---
      setBudgetGapInputs: (inputs) =>
        set((state) => ({
          budgetGap: {
            ...state.budgetGap,
            inputs: { ...state.budgetGap.inputs, ...inputs },
          },
        })),

      completeBudgetGap: (results) =>
        set((state) => ({
          budgetGap: {
            ...state.budgetGap,
            completed: true,
            results,
          },
        })),

      setEmailCaptured: () =>
        set((state) => ({
          budgetGap: { ...state.budgetGap, emailCaptured: true },
        })),

      resetBudgetGap: () =>
        set({ budgetGap: { ...initialBudgetGap } }),
    }),
    {
      name: 'm1-store',
      storage: createJSONStorage(() => sessionStorage),
      partialize: (state) => ({
        readinessAssessment: state.readinessAssessment,
        budgetGap: state.budgetGap,
      }),
      // Guard against stale/partial sessionStorage payloads that are missing
      // keys added after the first write (e.g. `answers`). The default shallow
      // merge would replace `readinessAssessment` wholesale and leave
      // `answers` undefined, crashing any `.map`/`.find` call on mount.
      merge: (persistedState, currentState) => {
        const persisted = persistedState || {};
        return {
          ...currentState,
          ...persisted,
          readinessAssessment: {
            ...currentState.readinessAssessment,
            ...(persisted.readinessAssessment || {}),
            answers: Array.isArray(persisted.readinessAssessment?.answers)
              ? persisted.readinessAssessment.answers
              : [],
          },
          budgetGap: {
            ...currentState.budgetGap,
            ...(persisted.budgetGap || {}),
          },
        };
      },
    }
  )
);
