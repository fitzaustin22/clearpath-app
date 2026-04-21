/**
 * m5Store — Zustand state for all three M5 tools:
 *   - Marital Home Decision Analyzer
 *   - QDRO Modeler
 *   - Support Estimator
 *
 * No calculation logic here — that lives in formula engines (Step 4) and
 * the tool components themselves. This store only holds state + setters.
 *
 * CRITICAL — Zustand consumers of this store must NEVER use array methods
 * (.filter/.map/.reduce/.sort) inside selectors. Array methods return new
 * references on every call and cause infinite re-renders.
 *
 * CORRECT:
 *   const scenarios = useM5Store((s) => s.homeDecision.savedScenarios);
 *   const labels = useMemo(() => scenarios.map(s => s.label), [scenarios]);
 *
 * WRONG:
 *   const labels = useM5Store((s) => s.homeDecision.savedScenarios.map(s => s.label));
 */

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

// ─── Initial state fragments ────────────────────────────────────────────────
const initialHomeDecisionInputs = {
  A1: null, A2: null, A3: null, A4: 0, A5: false,
  B1: null, B2: null, B3: null, B4: null, B5: null, B6: 0,
  C1: null, C2: 0, C3: 0,
  D1: 7, D2: 'mfj', D3: 60, D4: 60, D5: false, D6: false, D7: false,
  E1: 7, E2: 360, E3: 0, E4: 2, E5: true,
};

const initialHomeDecisionSliders = { maintenancePct: 1.5, returnRate: 7.0 };

function makeInitialHomeDecision() {
  return {
    inputs: { ...initialHomeDecisionInputs },
    selectedM2ItemId: null,
    activeTab: 'affordability',
    c2ManuallyOverridden: false,
    results: {
      panels: {
        affordability: null,
        trueCost: null,
        section121: null,
        refinance: null,
      },
    },
    sliders: { ...initialHomeDecisionSliders },
    savedScenarios: [],
    completedAt: null,
    lastViewedAt: null,
    prePopulated: {
      fromM2: false, fromM3: false, fromM4: false,
      fromM5Support: false, fromBlueprintS3: false,
    },
  };
}

const initialQDROCovertureInputs = { CF1: null, CF2: null, CF3: null, CF4: null, CF5: 100 };
const initialQDROPensionInputs = { P1: null, P2: null, P3: null, P4: 65, P5: 50, P6: 82, P7: 85, P8: 4.0 };

function makeInitialQDRO() {
  return {
    selectedPlanType: null,
    activeSection: 'panel1',
    covertureInputs: { ...initialQDROCovertureInputs },
    covertureResults: null,
    pensionInputs: { ...initialQDROPensionInputs },
    pensionResults: null,
    survivorBenefitElections: { qpsa: null, postRetirement: null },
    completedAt: null,
    lastViewedAt: null,
  };
}

const initialSupportInputs = {
  I1: null, I2: null, I3: null, I4: null,
  K1: 1, K2: 'sole', K3: 182, primaryCustodian: null,
  youngestChildAge: 5,
  A1: 0, A2: 0, A3: 0, A4: 10, A5: 'post-2019',
};

function makeInitialSupport(preserveState) {
  return {
    selectedState: preserveState ?? 'va',
    activeStep: 1,
    inputs: { ...initialSupportInputs },
    spousalResults: null,
    childSupportResults: null,
    selectedSpousalFormula: null,
    skippedSpousal: false,
    completedAt: null,
    lastViewedAt: null,
    prePopulated: { fromM3: false },
  };
}

// Fields in the support estimator whose edits invalidate downstream results
// (per spec §5 "editing at prior step invalidates downstream results").
const SUPPORT_CASCADE_FIELDS = new Set([
  'I1', 'I2', 'K1', 'K2', 'K3', 'primaryCustodian',
  'A1', 'A2', 'A3', 'A4', 'A5',
]);

// ─── Store ──────────────────────────────────────────────────────────────────
export const useM5Store = create(
  persist(
    (set) => ({
      homeDecision: makeInitialHomeDecision(),
      qdroModeler: makeInitialQDRO(),
      supportEstimator: makeInitialSupport(),

      // ─── Home Decision ──────────────────────────────────────────────────
      updateHomeDecisionInput: (field, value) =>
        set((state) => {
          const next = {
            ...state.homeDecision,
            inputs: { ...state.homeDecision.inputs, [field]: value },
          };
          if (field === 'C2') {
            next.c2ManuallyOverridden = true;
          }
          return { homeDecision: next };
        }),

      setHomeDecisionActiveTab: (tab) =>
        set((state) => ({
          homeDecision: { ...state.homeDecision, activeTab: tab },
        })),

      setHomeDecisionC2Override: (bool) =>
        set((state) => {
          const next = {
            ...state.homeDecision,
            c2ManuallyOverridden: bool,
          };
          if (bool === false) {
            next.inputs = { ...state.homeDecision.inputs, C2: null };
          }
          return { homeDecision: next };
        }),

      setHomeDecisionSlider: (key, value) =>
        set((state) => ({
          homeDecision: {
            ...state.homeDecision,
            sliders: { ...state.homeDecision.sliders, [key]: value },
          },
        })),

      selectM2Item: (itemId) =>
        set((state) => ({
          homeDecision: { ...state.homeDecision, selectedM2ItemId: itemId },
        })),

      setHomeDecisionPrePopulated: (source, bool) =>
        set((state) => ({
          homeDecision: {
            ...state.homeDecision,
            prePopulated: { ...state.homeDecision.prePopulated, [source]: bool },
          },
        })),

      setHomeDecisionResult: (panel, result) =>
        set((state) => ({
          homeDecision: {
            ...state.homeDecision,
            results: {
              ...state.homeDecision.results,
              panels: { ...state.homeDecision.results.panels, [panel]: result },
            },
          },
        })),

      setHomeDecisionCompletedAt: (iso) =>
        set((state) => ({
          homeDecision: { ...state.homeDecision, completedAt: iso },
        })),

      // ─── QDRO ───────────────────────────────────────────────────────────
      updateQDROPlanType: (planType) =>
        set((state) => ({
          qdroModeler: { ...state.qdroModeler, selectedPlanType: planType },
        })),

      updateQDROCovertureInput: (field, value) =>
        set((state) => ({
          qdroModeler: {
            ...state.qdroModeler,
            covertureInputs: { ...state.qdroModeler.covertureInputs, [field]: value },
          },
        })),

      updateQDROPensionInput: (field, value) =>
        set((state) => ({
          qdroModeler: {
            ...state.qdroModeler,
            pensionInputs: { ...state.qdroModeler.pensionInputs, [field]: value },
          },
        })),

      updateQDROSurvivorElection: (which, value) =>
        set((state) => ({
          qdroModeler: {
            ...state.qdroModeler,
            survivorBenefitElections: {
              ...state.qdroModeler.survivorBenefitElections,
              [which]: value,
            },
          },
        })),

      setQDROActiveSection: (section) =>
        set((state) => ({
          qdroModeler: { ...state.qdroModeler, activeSection: section },
        })),

      setQDROCovertureResults: (results) =>
        set((state) => ({
          qdroModeler: { ...state.qdroModeler, covertureResults: results },
        })),

      setQDROPensionResults: (results) =>
        set((state) => ({
          qdroModeler: { ...state.qdroModeler, pensionResults: results },
        })),

      setQDROCompletedAt: (iso) =>
        set((state) => ({
          qdroModeler: { ...state.qdroModeler, completedAt: iso },
        })),

      // ─── Support Estimator ──────────────────────────────────────────────
      updateSupportState: (newState) =>
        set((state) => ({
          supportEstimator: {
            ...state.supportEstimator,
            selectedState: newState,
            spousalResults: null,
            childSupportResults: null,
            completedAt: null,
            selectedSpousalFormula: null,
            prePopulated: { ...state.supportEstimator.prePopulated, fromM3: false },
          },
        })),

      updateSupportInput: (field, value) =>
        set((state) => {
          const next = {
            ...state.supportEstimator,
            inputs: { ...state.supportEstimator.inputs, [field]: value },
          };
          if (SUPPORT_CASCADE_FIELDS.has(field)) {
            next.spousalResults = null;
            next.childSupportResults = null;
            next.completedAt = null;
            next.selectedSpousalFormula = null;
          }
          return { supportEstimator: next };
        }),

      setSupportActiveStep: (step) =>
        set((state) => ({
          supportEstimator: { ...state.supportEstimator, activeStep: step },
        })),

      setSelectedSpousalFormula: (formulaId) =>
        set((state) => ({
          supportEstimator: { ...state.supportEstimator, selectedSpousalFormula: formulaId },
        })),

      setSkippedSpousal: (bool) =>
        set((state) => ({
          supportEstimator: { ...state.supportEstimator, skippedSpousal: bool },
        })),

      setSupportPrePopulated: (source, bool) =>
        set((state) => ({
          supportEstimator: {
            ...state.supportEstimator,
            prePopulated: { ...state.supportEstimator.prePopulated, [source]: bool },
          },
        })),

      setSupportSpousalResults: (results) =>
        set((state) => ({
          supportEstimator: { ...state.supportEstimator, spousalResults: results },
        })),

      setSupportChildSupportResults: (results) =>
        set((state) => ({
          supportEstimator: { ...state.supportEstimator, childSupportResults: results },
        })),

      setSupportCompletedAt: (iso) =>
        set((state) => ({
          supportEstimator: { ...state.supportEstimator, completedAt: iso },
        })),

      // ─── Reset actions ──────────────────────────────────────────────────
      // `alsoClearBlueprint` is accepted to match the spec contract, but
      // blueprintStore integration happens in the component layer (importing
      // blueprintStore here would create a circular dependency risk).
      resetHomeDecision: (alsoClearBlueprint = false) => {
        void alsoClearBlueprint;
        set((state) => {
          const fresh = makeInitialHomeDecision();
          // Preserve slider values (user preference).
          fresh.sliders = { ...state.homeDecision.sliders };
          return { homeDecision: fresh };
        });
      },

      resetQDRO: (alsoClearBlueprint = false) => {
        void alsoClearBlueprint;
        set(() => ({ qdroModeler: makeInitialQDRO() }));
      },

      resetSupport: (alsoClearBlueprint = false) => {
        void alsoClearBlueprint;
        set((state) => {
          // Preserve selectedState (user preference).
          const fresh = makeInitialSupport(state.supportEstimator.selectedState);
          return { supportEstimator: fresh };
        });
      },

      // ─── Shared ─────────────────────────────────────────────────────────
      updateLastViewed: (tool) =>
        set((state) => ({
          [tool]: { ...state[tool], lastViewedAt: new Date().toISOString() },
        })),
    }),
    {
      name: 'clearpath-m5',
      storage: createJSONStorage(() => localStorage),
    }
  )
);

export default useM5Store;
