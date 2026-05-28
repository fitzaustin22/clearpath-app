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
import { getHeadlinePV } from '@/src/lib/pensionValuation';

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
// inputs/results (PVA reload contract — see TC-M5PVA-Slice-6).
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

      // ─── PVA setters (§7.6.4 / §7.10.3 / §7.2 v2) ──────────────────────
      // Object-keyed asset CRUD per the §7.6.4 locked-literal `assets[assetId]`
      // shape. Each asset slot carries `{ inputs, results, _prePopSources }`.
      // Routing-derived state (e.g. frozen-routing) is computed reactively
      // from `inputs.accrualStatus` in the PVA orchestrator — no flag slot.
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

      clearPVAAsset: (assetId) =>
        set((state) => {
          // eslint-disable-next-line no-unused-vars
          const { [assetId]: _removed, ...rest } = state.pensionValuation.assets;
          return {
            pensionValuation: { ...state.pensionValuation, assets: rest },
          };
        }),

      // ─── QDRO Decision Guide setters (§8.10.1 / §8.10.2) ───────────────
      // Object-keyed asset CRUD per the §8.10.1 locked-literal
      // `assets[assetId]` shape. `_prePopSources` is a SIBLING of `decisions`
      // (not nested) per the cross-tool B5b-3 convention; it is session-scoped
      // and stripped by the existing partialize/merge (already conformant —
      // not modified by PR1).
      //
      // `updateQDRODecision` here is the m5Store per-asset decisions
      // partial-merge setter (Section 4 inventory). It is distinct from the
      // blueprintStore Blueprint-write action of the same name (§10.8), which
      // is deferred to PR5 per Q-A5 and is NOT added in PR1.

      addQDROAsset: (assetId, init = {}) =>
        set((state) => ({
          qdroDecision: {
            ...state.qdroDecision,
            assets: {
              ...state.qdroDecision.assets,
              [assetId]: {
                userRole: null,
                planType: null,
                planName: null,
                employer: null,
                decisions: {},
                pvSource: null,
                _prePopSources: {},
                metadata: { formulaId: null, citations: [], qdroPacketGeneratedAt: null },
                ...init,
              },
            },
          },
        })),

      updateQDRODecision: (assetId, partial) =>
        set((state) => ({
          qdroDecision: {
            ...state.qdroDecision,
            assets: {
              ...state.qdroDecision.assets,
              [assetId]: {
                ...state.qdroDecision.assets[assetId],
                decisions: {
                  ...state.qdroDecision.assets[assetId]?.decisions,
                  ...partial,
                },
              },
            },
          },
        })),

      setQDROClassifiers: (assetId, { userRole, planType }) =>
        set((state) => ({
          qdroDecision: {
            ...state.qdroDecision,
            assets: {
              ...state.qdroDecision.assets,
              [assetId]: {
                ...state.qdroDecision.assets[assetId],
                userRole,
                planType,
              },
            },
          },
        })),

      // §8.5.6 / §8.10.2 — flag-only starter-Q capture. `answers` is a
      // partial `{ [questionId]: response }` map; each pair is upserted by
      // questionId into the locked `Array<{ questionId, response }>` at
      // `decisions.starterQuestionResponses`. Entries for questionIds not in
      // `answers` are preserved — per-question partial-merge, never the
      // sibling-nulling full-replace failure mode. Empty array is allowed
      // per §8.10.2 (flag-only branches frequently defer to the attorney).
      setQDROFlagOnlyAnswers: (assetId, answers) =>
        set((state) => {
          const slot = state.qdroDecision.assets[assetId];
          const next = (slot?.decisions?.starterQuestionResponses ?? []).map((e) => ({
            ...e,
          }));
          for (const [questionId, response] of Object.entries(answers || {})) {
            const i = next.findIndex((e) => e.questionId === questionId);
            if (i === -1) next.push({ questionId, response });
            else next[i] = { questionId, response };
          }
          return {
            qdroDecision: {
              ...state.qdroDecision,
              assets: {
                ...state.qdroDecision.assets,
                [assetId]: {
                  ...slot,
                  decisions: {
                    ...slot?.decisions,
                    starterQuestionResponses: next,
                  },
                },
              },
            },
          };
        }),

      removeQDROAsset: (assetId) =>
        set((state) => {
          const assets = { ...state.qdroDecision.assets };
          delete assets[assetId];
          return { qdroDecision: { ...state.qdroDecision, assets } };
        }),

      // Q-A3: consumes the `prePopulateQDROInputs` object-keyed return map and
      // folds new asset slots into the slice. Per §8.3.4 an already-present
      // assetId is preserved (user override survives wizard re-runs) — never
      // reseeded. Missing/empty map is a safe no-op.
      seedQDROAssetsFromM2: (prePopResult) =>
        set((state) => {
          const incoming = prePopResult?.assets;
          if (!incoming || typeof incoming !== 'object') return {};
          const nextAssets = { ...state.qdroDecision.assets };
          for (const [assetId, prePop] of Object.entries(incoming)) {
            if (nextAssets[assetId]) continue;
            nextAssets[assetId] = {
              userRole: null,
              planType: null,
              planName: null,
              employer: null,
              decisions: {},
              pvSource: null,
              _prePopSources: {},
              metadata: { formulaId: null, citations: [], qdroPacketGeneratedAt: null },
              ...prePop,
            };
          }
          return { qdroDecision: { ...state.qdroDecision, assets: nextAssets } };
        }),

      // ─── §8.6.1 / §8.10.1 — PR-B2-α `pvSource` reconciler ──────────────
      //
      // Same-key pairing: `qdroDecision.assets[k]` ↔ `pensionValuation.assets[k]`
      // where `k = M2 item id` for M2-seeded assets (per `prePopulateQDROInputs`
      // and PVA `AssetPicker`'s `claim.id`). Wizard-added (synthetic-UUID)
      // assets have no PVA companion and stay `pvSource: null`.
      //
      // For each `private_db` QDRO asset, the target `pvSource` is:
      //   - `results.formulaId`  when PVA has usable results (`getHeadlinePV(results) != null`)
      //   - `null`               otherwise (no results, flag-only `pv === null`,
      //                          or PVA recompute cleared `results`)
      //
      // Idempotent: only assets whose `pvSource !== target` are rewritten; if no
      // diffs accrue, the entire `set()` returns `{}` (no state mutation, no
      // subscriber notifications). This loop-safety property is the contract
      // the QDROClassifier trigger relies on per Phase-3 design.
      //
      // Non-private_db assets (`dc` / `ira` / `gov_civilian` / `military` /
      // `state_municipal`) are NEVER touched — they have no PV consumption per
      // §8.6.1 and their `pvSource` (always `null` from `addQDROAsset`) is
      // outside this reconciler's domain.
      reconcileQDROPvSources: () =>
        set((state) => {
          const qdroAssets = state.qdroDecision?.assets;
          if (!qdroAssets || typeof qdroAssets !== 'object') return {};
          const pvaAssets = state.pensionValuation?.assets ?? {};

          let mutated = null;
          for (const [assetId, asset] of Object.entries(qdroAssets)) {
            if (asset?.planType !== 'private_db') continue;
            const results = pvaAssets[assetId]?.results;
            const usable = getHeadlinePV(results) != null;
            const target = usable ? results.formulaId : null;
            if (asset.pvSource === target) continue;
            if (mutated === null) mutated = { ...qdroAssets };
            mutated[assetId] = { ...asset, pvSource: target };
          }

          if (mutated === null) return {};
          return { qdroDecision: { ...state.qdroDecision, assets: mutated } };
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
