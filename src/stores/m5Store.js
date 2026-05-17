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
      existingMortgageRemainingTermMonths: 360,
      monthlyPropertyTax: null,
      monthlyInsurance: null,
      monthlyHOA: 0,
      userPostDivorceGrossMonthlyIncome: null,
      userTotalMonthlyDebtPayments: 0,
      startingLiquidCash: null,
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

// Strip transient `_prePopSources` from each keyed asset slot; preserve
// inputs/results and the pre-pop-derived `_legacy*`/`_frozen*` flags (PVA
// reload contract — see TC-M5PVA-Slice-6).
function stripAssetPrePopSources(assets) {
  const out = {};
  for (const [id, slot] of Object.entries(assets || {})) {
    // eslint-disable-next-line no-unused-vars
    const { _prePopSources, ...rest } = slot;
    out[id] = rest;
  }
  return out;
}

// ─── Store ──────────────────────────────────────────────────────────────────
export const useM5Store = create(
  persist(
    (set) => ({
      homeDecision: makeInitialHomeDecision(),
      qdroDecision: makeInitialQDRODecision(),
      pensionValuation: makeInitialPensionValuation(),
      supportEstimator: makeInitialSupportEstimator(),

      // ─── Support Estimator setters (§6.5.1 / §6.5.2 / §6.5.7) ──────────
      // Partial-merge pattern mirrors m4Store (setFilingStatusInputs).
      setSupportEstimatorInputs: (partial) =>
        set((state) => ({
          supportEstimator: {
            ...state.supportEstimator,
            inputs: { ...state.supportEstimator.inputs, ...partial },
          },
        })),

      // Whole-object replacement — used by pre-pop and dev-route scenario seed.
      replaceSupportEstimatorInputs: (nextInputs) =>
        set((state) => ({
          supportEstimator: {
            ...state.supportEstimator,
            inputs: nextInputs,
          },
        })),

      setSupportEstimatorPrePopSources: (sources) =>
        set((state) => ({
          supportEstimator: {
            ...state.supportEstimator,
            _prePopSources: sources,
          },
        })),

      setSupportEstimatorResults: (results) =>
        set((state) => ({
          supportEstimator: {
            ...state.supportEstimator,
            results,
          },
        })),

      // ─── Home Decision Analyzer setters (§9.3 / §9.10 / §14.1) ─────────
      // Partial-merge into homeDecision.inputs (mirrors setSupportEstimatorInputs).
      setHomeDecisionInputs: (partial) =>
        set((state) => ({
          homeDecision: {
            ...state.homeDecision,
            inputs: { ...state.homeDecision.inputs, ...partial },
          },
        })),

      // Whole-object replacement of homeDecision.inputs (mirrors replaceSupportEstimatorInputs).
      // Used by the future pre-pop seed flow.
      replaceHomeDecisionInputs: (nextInputs) =>
        set((state) => ({
          homeDecision: {
            ...state.homeDecision,
            inputs: nextInputs,
          },
        })),

      // Set homeDecision.results; must not disturb inputs/metadata/userSelection/_prePopSources.
      setHomeDecisionResults: (results) =>
        set((state) => ({
          homeDecision: {
            ...state.homeDecision,
            results,
          },
        })),

      // Set homeDecision.metadata (§14.1 HomeDecisionMetadata block); must not disturb siblings.
      setHomeDecisionMetadata: (metadata) =>
        set((state) => ({
          homeDecision: {
            ...state.homeDecision,
            metadata,
          },
        })),

      // Set homeDecision.userSelection to one of 'keepAndRefi' | 'sellNow' | 'deferredSale' | null.
      // Pure — no blueprint side-effect.
      setHomeDecisionUserSelection: (scenarioId) =>
        set((state) => ({
          homeDecision: {
            ...state.homeDecision,
            userSelection: scenarioId,
          },
        })),

      // Set homeDecision._prePopSources (mirrors setSupportEstimatorPrePopSources).
      setHomeDecisionPrePopSources: (sources) =>
        set((state) => ({
          homeDecision: {
            ...state.homeDecision,
            _prePopSources: sources,
          },
        })),

      // Reset entire homeDecision slice to initial state. Reuses makeInitialHomeDecision().
      clearHomeDecision: () =>
        set(() => ({
          homeDecision: makeInitialHomeDecision(),
        })),

      // ─── PVA setters (§7.6.4 / §7.10.3) ────────────────────────────────
      // Object-keyed asset CRUD per the §7.6.4 locked-literal `assets[assetId]`
      // shape. Each asset slot carries `{ inputs, results, _prePopSources }`
      // plus pre-pop derived flag fields (`_legacyCurrentValueDetected`,
      // `_legacyValue`, `_frozenRoutingApplied`) per [R5b-18] / [R5b-5].
      //
      // `_prePopSources` is a SIBLING of `inputs` (not nested) per the
      // cross-tool B5b-3 attribution convention shared with Support Estimator,
      // Home Decision, and QDRO Decision Guide.

      // Whole-object inputs replace (typical UI flow merges via spread at
      // component level; orchestrator first-write seeds the full inputs
      // object from prePopulatePVAInputs).
      setPVAAssetInputs: (assetId, inputs) =>
        set((state) => ({
          pensionValuation: {
            ...state.pensionValuation,
            assets: {
              ...state.pensionValuation.assets,
              [assetId]: {
                ...state.pensionValuation.assets[assetId],
                inputs,
              },
            },
          },
        })),

      setPVAAssetPrePopSources: (assetId, prePopSources) =>
        set((state) => ({
          pensionValuation: {
            ...state.pensionValuation,
            assets: {
              ...state.pensionValuation.assets,
              [assetId]: {
                ...state.pensionValuation.assets[assetId],
                _prePopSources: prePopSources,
              },
            },
          },
        })),

      setPVAAssetResults: (assetId, results) =>
        set((state) => ({
          pensionValuation: {
            ...state.pensionValuation,
            assets: {
              ...state.pensionValuation.assets,
              [assetId]: {
                ...state.pensionValuation.assets[assetId],
                results,
              },
            },
          },
        })),

      // Merges flag fields without disturbing sibling inputs/results/_prePopSources.
      // Used by orchestrator post-prePopulate to surface routing-derived flags.
      setPVAAssetFlags: (assetId, flags) =>
        set((state) => ({
          pensionValuation: {
            ...state.pensionValuation,
            assets: {
              ...state.pensionValuation.assets,
              [assetId]: {
                ...state.pensionValuation.assets[assetId],
                ...flags,
              },
            },
          },
        })),

      clearPVAAsset: (assetId) =>
        set((state) => {
          // eslint-disable-next-line no-unused-vars
          const { [assetId]: _removed, ...rest } = state.pensionValuation.assets;
          return {
            pensionValuation: { ...state.pensionValuation, assets: rest },
          };
        }),
    }),
    {
      name: 'clearpath-m5',
      storage: createJSONStorage(() => localStorage),
      // H1 fix: `_prePopSources` is transient pre-pop attribution, never user
      // state. Persisting it locked HDA pre-pop out forever (a non-null
      // sentinel rehydrated and the orchestrator skipped pre-pop). partialize
      // omits it from every slice (m2Store allow-list idiom); merge resets it
      // and strips any copy already baked into a user's localStorage (m1Store
      // merge idiom), so affected installs self-heal without a version/migrate.
      partialize: (state) => ({
        homeDecision: {
          inputs: state.homeDecision.inputs,
          results: state.homeDecision.results,
          metadata: state.homeDecision.metadata,
          userSelection: state.homeDecision.userSelection,
        },
        supportEstimator: {
          inputs: state.supportEstimator.inputs,
          results: state.supportEstimator.results,
        },
        pensionValuation: {
          assets: stripAssetPrePopSources(state.pensionValuation.assets),
        },
        qdroDecision: {
          assets: stripAssetPrePopSources(state.qdroDecision.assets),
        },
      }),
      merge: (persistedState, currentState) => {
        const persisted = persistedState || {};
        return {
          ...currentState,
          ...persisted,
          homeDecision: {
            ...currentState.homeDecision,
            ...(persisted.homeDecision || {}),
            _prePopSources: null,
          },
          supportEstimator: {
            ...currentState.supportEstimator,
            ...(persisted.supportEstimator || {}),
            _prePopSources: null,
          },
          pensionValuation: {
            ...currentState.pensionValuation,
            ...(persisted.pensionValuation || {}),
            assets: stripAssetPrePopSources(
              persisted.pensionValuation?.assets ?? currentState.pensionValuation.assets,
            ),
          },
          qdroDecision: {
            ...currentState.qdroDecision,
            ...(persisted.qdroDecision || {}),
            assets: stripAssetPrePopSources(
              persisted.qdroDecision?.assets ?? currentState.qdroDecision.assets,
            ),
          },
        };
      },
    },
  ),
);

export default useM5Store;
