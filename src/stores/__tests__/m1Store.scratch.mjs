/**
 * Scratch test for m1Store — run with: node src/stores/__tests__/m1Store.scratch.mjs
 *
 * Simulates the sessionStorage persist layer in Node (no browser required)
 * and verifies that state survives a simulated page refresh by rehydrating
 * a second store instance from the same in-memory storage backing.
 */

// --- Minimal sessionStorage shim ---
const storage = {};
const sessionStorageShim = {
  getItem: (key) => storage[key] ?? null,
  setItem: (key, value) => { storage[key] = value; },
  removeItem: (key) => { delete storage[key]; },
};
global.sessionStorage = sessionStorageShim;

// --- Dynamic import of store (after shim is in place) ---
const { createStore } = await import('zustand/vanilla');
const { persist, createJSONStorage } = await import('zustand/middleware');

function makeStore() {
  const initialReadinessAssessment = {
    answers: [],
    completed: false,
    results: null,
  };
  const initialBudgetGap = {
    inputs: {},
    completed: false,
    results: null,
    emailCaptured: false,
  };

  return createStore(
    persist(
      (set) => ({
        readinessAssessment: { ...initialReadinessAssessment },
        budgetGap: { ...initialBudgetGap },

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

        setBudgetGapInputs: (inputs) =>
          set((state) => ({
            budgetGap: {
              ...state.budgetGap,
              inputs: { ...state.budgetGap.inputs, ...inputs },
            },
          })),

        setEmailCaptured: () =>
          set((state) => ({
            budgetGap: { ...state.budgetGap, emailCaptured: true },
          })),
      }),
      {
        name: 'm1-store',
        storage: createJSONStorage(() => sessionStorageShim),
        partialize: (state) => ({
          readinessAssessment: state.readinessAssessment,
          budgetGap: state.budgetGap,
        }),
      }
    )
  );
}

// --- Test ---
function assert(condition, label) {
  if (!condition) throw new Error(`FAIL: ${label}`);
  console.log(`  PASS: ${label}`);
}

console.log('\n=== m1Store scratch test ===\n');

// 1. Create "first session" store and mutate state
const store1 = makeStore();
await store1.persist.rehydrate();

store1.getState().setReadinessAnswer('q1', 4);
store1.getState().setReadinessAnswer('q2', 3);
store1.getState().setBudgetGapInputs({ monthlyIncome: 5000, monthlyExpenses: 4200 });
store1.getState().setEmailCaptured();

const s1 = store1.getState();
assert(s1.readinessAssessment.answers.length === 2, 'two readiness answers recorded');
assert(s1.readinessAssessment.answers.find(a => a.questionId === 'q1')?.score === 4, 'q1 score is 4');
assert(s1.budgetGap.inputs.monthlyIncome === 5000, 'budget income captured');
assert(s1.budgetGap.emailCaptured === true, 'email captured flag set');

// 2. Confirm data landed in sessionStorage
const raw = sessionStorageShim.getItem('m1-store');
assert(raw !== null, 'sessionStorage key "m1-store" written');
const parsed = JSON.parse(raw);
assert(parsed.state.readinessAssessment.answers.length === 2, 'sessionStorage has 2 answers');
console.log('  INFO: stored payload:', JSON.stringify(parsed.state, null, 2).split('\n').slice(0,12).join('\n'), '\n  ...');

// 3. Simulate page refresh — new store instance reads from same sessionStorage
const store2 = makeStore();
await store2.persist.rehydrate();

const s2 = store2.getState();
assert(s2.readinessAssessment.answers.length === 2, '[rehydrated] answers survive refresh');
assert(s2.readinessAssessment.answers.find(a => a.questionId === 'q2')?.score === 3, '[rehydrated] q2 score is 3');
assert(s2.budgetGap.inputs.monthlyExpenses === 4200, '[rehydrated] budget expenses survive refresh');
assert(s2.budgetGap.emailCaptured === true, '[rehydrated] emailCaptured survives refresh');

console.log('\nAll checks passed.\n');
