// src/stores/blueprintStore.js
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

/**
 * Derive §6 sourceModule from which slots in `data` are populated, per §10.8's
 * locked table (qdro added to the original pit/pva pair):
 *   pit only              → 'm4'
 *   pva only              → 'm5'
 *   qdro only             → 'm5'
 *   pva + qdro            → 'm5'
 *   pit + pva             → 'm4+m5'
 *   pit + qdro            → 'm4+m5'
 *   pit + pva + qdro      → 'm4+m5'
 *   none                  → null
 *
 * Both pva and qdro contribute an 'm5' signal; pit contributes the 'm4' signal.
 */
export function deriveSourceModule(data) {
  const hasPit = data?.pit != null;
  const hasPva = data?.pva != null;
  const hasQdro = data?.qdro != null;
  const hasM5 = hasPva || hasQdro;
  if (hasPit && hasM5) return 'm4+m5';
  if (hasPit) return 'm4';
  if (hasM5) return 'm5';
  return null;
}

/**
 * Derive §10 Negotiation Strategy status from the two M6 feeder slots, mirroring
 * rollupStatus's empty/partial/complete semantics. A slot counts as populated
 * only when it is a non-empty array — so `[]`, `null`, and `undefined` all read
 * as empty (a tool may write `[]` to clear a slot).
 *   both slots empty      → 'empty'
 *   both slots populated  → 'complete'
 *   exactly one populated → 'partial'
 *
 * Input is `s10.data` = { priorities, tradeOffs }.
 */
export function deriveNegotiationStatus(data) {
  const states = [data?.priorities, data?.tradeOffs].map((slot) =>
    Array.isArray(slot) && slot.length > 0 ? 'complete' : 'empty',
  );
  if (states.every((s) => s === 'empty')) return 'empty';
  if (states.every((s) => s === 'complete')) return 'complete';
  return 'partial';
}

const useBlueprintStore = create(
  persist(
    (set, get) => ({
      // Document metadata
      documentTitle: 'ClearPath Financial Blueprint',
      userName: '',           // From Clerk user profile
      lastUpdated: null,

      // 12 sections — each has status ('empty' | 'partial' | 'complete'), label, sourceModule, and data
      sections: {
        s1: { status: 'empty', label: 'Personal Profile', sourceModule: 'm1', data: null },
        s2: { status: 'empty', label: 'Income Analysis', sourceModule: 'm3', data: null },
        s3: { status: 'empty', label: 'Asset Inventory', sourceModule: 'm2', data: null },
        s4: { status: 'empty', label: 'Tax Analysis', sourceModule: 'm4', data: null },
        s5: { status: 'empty', label: 'Property Division', sourceModule: 'm2+m4', data: null },
        // §6 carries multi-source data: PIT (M4) writes to data.pit, PVA (M5)
        // writes to data.pva. sourceModule is dynamically derived via
        // deriveSourceModule (see updateRetirementDivision / updatePensionValuation).
        s6: { status: 'empty', label: 'Retirement Plan Division', sourceModule: null, data: { pit: null, pva: null, qdro: null } },
        s7: { status: 'empty', label: 'Expense Analysis', sourceModule: 'm3', data: null },
        s8: { status: 'empty', label: 'Support Analysis', sourceModule: 'm5', data: null },
        s9: { status: 'empty', label: 'Home Decision', sourceModule: 'm5', data: null },
        s10: { status: 'empty', label: 'Negotiation Strategy', sourceModule: 'm6', data: { priorities: null, tradeOffs: null } },
        s11: { status: 'empty', label: 'Settlement Offer Overview', sourceModule: 'm6', data: null },
        s12: { status: 'empty', label: 'Action Plan & Timeline', sourceModule: 'm7', data: null },
      },

      // Cost basis data (lives here, not in m4Store, because it modifies §3 and §5)
      // costBasisEntries[i] shape (DEF-9 + DEF-6):
      //   {
      //     assetId, description, category,
      //     fmv,                  // Number — face value from m2Store currentValue
      //     costBasis,            // Number|null — what was originally paid (null = N/A for accountSubType='bank' or no-basis assets)
      //     baseline,             // Number — DEF-6: realEstate = FMV − outstandingBalance (net equity); all others = FMV
      //     builtInGain,          // Number — fmv − costBasis (or 0 when costBasis is null)
      //     estimatedTax,         // Number — branch-routed per category (LTCG, ordinary income, §121 exclusion, etc.)
      //     taxAdjustedValue,     // Number — DEF-6 invariant: baseline − estimatedTax === taxAdjustedValue
      //     isPrimaryResidence,   // Boolean (realEstate only)
      //     accountSubType,       // 'brokerage' | 'bank' | undefined (workingCapital only)
      //   }
      costBasisEntries: [],
      costBasisViewEnabled: false,
      costBasisFilingStatus: null,   // 'single' | 'mfj' | null — null on first mount triggers one-shot pre-pop from FSO divorceTimeline

      // DEF-9: Deferred-comp stubs for unvested/unexercised equity (stockOptions, corporateIncentives).
      // Stored as a list of placeholders the user creates from the M2 vested/exercised gate.
      // Tracked separately from costBasisEntries because they have no current FMV — they surface
      // as a "Deferred Comp Pending" advisory in §3 + §5 displays.
      // Shape: { id, category ('stockOptions'|'corporateIncentives'), company, grantDate, sharesGranted, vestingSchedule, strikePrice, deferredComp: true, createdAt }
      deferredCompStubs: [],

      // §10.8 — QDRO Decision Guide → Blueprint write target (PR5-2). savedProjection
      // carries a stamped copy of the QDRO projection; savedAt is the write moment.
      qdroBlueprint: { savedProjection: null, savedAt: null },

      // Computed — these are functions, NOT Zustand getters
      getCompletedCount: () => Object.values(get().sections).filter(s => s.status === 'complete').length,
      getPartialCount: () => Object.values(get().sections).filter(s => s.status === 'partial').length,
      getProgressLabel: () => {
        const completed = Object.values(get().sections).filter(s => s.status === 'complete').length;
        const partial = Object.values(get().sections).filter(s => s.status === 'partial').length;
        let label = `${completed} of 12 sections`;
        if (partial > 0) label += ` · ${partial} in progress`;
        return label;
      },

      // Generic section updater
      updateSection: (sectionKey, status, data) => set(state => ({
        sections: {
          ...state.sections,
          [sectionKey]: { ...state.sections[sectionKey], status, data },
        },
        lastUpdated: new Date().toISOString(),
      })),

      // §1 — called by M1 Readiness Assessment AND Budget Gap Calculator on completion
      // Field mapping from m1Store:
      //   readinessAssessment.results → { totalScore, domainScores, tier }
      //   budgetGap.results → { adjustedMonthlyIncome, totalMonthlyExpenses, monthlyGap, gapPercent }
      // Section is 'complete' when BOTH assessment AND budgetGap have data.
      // Section is 'partial' when only one of the two has data.
      updatePersonalProfile: (profileData) => set(state => ({
        sections: {
          ...state.sections,
          s1: {
            ...state.sections.s1,
            status: (profileData.assessment && profileData.budgetGap) ? 'complete' : 'partial',
            data: {
              totalScore: profileData.assessment?.totalScore || null,
              tier: profileData.assessment?.tier || null,
              domainScores: profileData.assessment?.domainScores || null,
              assessmentCompletedAt: profileData.assessment?.completedAt || null,
              adjustedMonthlyIncome: profileData.budgetGap?.adjustedMonthlyIncome || null,
              totalMonthlyExpenses: profileData.budgetGap?.totalMonthlyExpenses || null,
              monthlyGap: profileData.budgetGap?.monthlyGap || null,
              gapPercent: profileData.budgetGap?.gapPercent || null,
              budgetGapCompletedAt: profileData.budgetGap?.completedAt || null,
            },
          },
        },
        lastUpdated: new Date().toISOString(),
      })),

      // §2 — called by M3 Pay Stub Decoder on completion
      updateIncomeAnalysis: (payStubData) => set(state => ({
        sections: {
          ...state.sections,
          s2: {
            ...state.sections.s2,
            status: 'complete',
            data: {
              grossMonthlyIncome: payStubData.grossMonthlyIncome,
              netMonthlyIncome: payStubData.netMonthlyIncome,
              payFrequency: payStubData.payFrequency,
              grossPerPaycheck: payStubData.grossPerPaycheck,
              deductions: payStubData.deductions,
              otherIncome: payStubData.otherIncome || 0,
              annualGrossIncome: payStubData.grossMonthlyIncome * 12,
            },
          },
        },
        lastUpdated: new Date().toISOString(),
      })),

      // §3 — called by M2 Marital Estate Inventory on change (debounced 500ms in the component)
      // Data shapes:
      //   assetsByCategory: Record<string, { total: number, count: number }>
      //     e.g. { realEstate: { total: 675000, count: 2 }, retirementAccounts: { total: 385000, count: 3 } }
      //   liabilitiesByCategory: Record<string, { total: number, count: number }>
      //   divisionStatus: { client: number, spouse: number, undecided: number }
      //   personalProperty: { totalEstimatedValue: number, itemCount: number, roomCount: number } | null
      //
      // Completion threshold: 3+ asset categories AND at least one allocation (client > 0 or spouse > 0)
      // This action ALSO updates §5 face-value allocations automatically
      updateAssetInventory: (inventoryData) => {
        const hasItems = inventoryData.itemCount > 0;
        const hasMultipleCategories = Object.keys(inventoryData.assetsByCategory || {}).length >= 3;
        const hasAllocations = (inventoryData.divisionStatus?.client > 0 || inventoryData.divisionStatus?.spouse > 0);
        const status = !hasItems ? 'empty' : (hasMultipleCategories && hasAllocations) ? 'complete' : 'partial';

        set(state => ({
          sections: {
            ...state.sections,
            s3: {
              ...state.sections.s3,
              status,
              data: {
                totalAssets: inventoryData.totalAssets,
                totalLiabilities: inventoryData.totalLiabilities,
                netWorth: inventoryData.totalAssets - Math.abs(inventoryData.totalLiabilities),
                assetsByCategory: inventoryData.assetsByCategory,
                liabilitiesByCategory: inventoryData.liabilitiesByCategory,
                divisionStatus: inventoryData.divisionStatus,
                documentsGathered: inventoryData.documentsGathered,
                documentsTotal: inventoryData.documentsTotal,
                personalProperty: inventoryData.personalProperty || null,
              },
            },
            // Also update §5 face-value allocations whenever §3 changes
            s5: {
              ...state.sections.s5,
              status: hasAllocations ? (state.costBasisEntries.length > 0 ? 'complete' : 'partial') : 'empty',
              data: {
                ...state.sections.s5.data,
                faceValue: inventoryData.divisionStatus || null,
                totalMaritalEstate: inventoryData.totalAssets,
              },
            },
          },
          lastUpdated: new Date().toISOString(),
        }));
      },

      // §4 — called by M4 Filing Status Optimizer on completion
      updateTaxAnalysis: (filingStatusData) => set(state => ({
        sections: {
          ...state.sections,
          s4: {
            ...state.sections.s4,
            status: 'complete',
            data: {
              bestOption: filingStatusData.bestOption,
              bestOptionTax: filingStatusData.scenarios[filingStatusData.bestOption].netTax,
              effectiveRate: filingStatusData.scenarios[filingStatusData.bestOption].effectiveRate,
              marginalRate: filingStatusData.scenarios[filingStatusData.bestOption].marginalRate,
              scenarios: filingStatusData.scenarios,
              maxSavings: filingStatusData.maxSavings,
              divorceTimeline: filingStatusData.divorceTimeline,
              taxYear: 2024,
            },
          },
        },
        lastUpdated: new Date().toISOString(),
      })),

      // §5 — called by Tax-Adjusted Asset View when cost basis is calculated
      // Face-value allocations are written by updateAssetInventory (§3 action) automatically.
      // This action adds the tax-adjusted overlay on top.
      updatePropertyDivisionTaxAdjusted: (costBasisData) => set(state => ({
        sections: {
          ...state.sections,
          s5: {
            ...state.sections.s5,
            status: 'complete',
            data: {
              ...state.sections.s5.data, // preserves faceValue and totalMaritalEstate from §3
              taxAdjusted: costBasisData.taxAdjusted,   // { client: number, spouse: number, undecided: number }
              hiddenTax: costBasisData.hiddenTax,        // { client: number, spouse: number, undecided: number }
              hasCostBasis: true,
            },
          },
        },
        lastUpdated: new Date().toISOString(),
      })),

      // §6 — Retirement Plan Division. Multi-source writers:
      //   updateRetirementDivision (M4 PIT)  → data.pit
      //   updatePensionValuation   (M5 PVA)  → data.pva
      // sourceModule is dynamically derived from which slots are populated.
      updateRetirementDivision: (pitData) => set(state => {
        const nextData = {
          ...state.sections.s6.data,
          pit: {
            planBalance: pitData.planBalance,
            planType: pitData.planType,
            taxDiscountPercent: pitData.taxDiscountPercent,
            taxDiscountDollars: pitData.taxDiscountDollars,
            taxAdjustedValue: pitData.taxAdjustedValue,
            traditionalDiscountDollars: pitData.traditionalDiscountDollars,
            overage: pitData.overage,
            n: pitData.n,
            effectiveTaxRate: pitData.effectiveTaxRate,
            discountRate: pitData.discountRate,
          },
        };
        return {
          sections: {
            ...state.sections,
            s6: {
              ...state.sections.s6,
              status: 'complete',
              sourceModule: deriveSourceModule(nextData),
              data: nextData,
            },
          },
          lastUpdated: new Date().toISOString(),
        };
      }),

      // §6 PVA writer — called by M5 PVA orchestrator on every result update.
      // For flag_only paths, pvaData carries `{ path: 'flag_only', headlinePV: null,
      // maritalPV: null }` to record that a pension exists but isn't valued.
      updatePensionValuation: (pvaData) => set(state => {
        const nextData = {
          ...state.sections.s6.data,
          pva: pvaData,
        };
        return {
          sections: {
            ...state.sections,
            s6: {
              ...state.sections.s6,
              status: 'complete',
              sourceModule: deriveSourceModule(nextData),
              data: nextData,
            },
          },
          lastUpdated: new Date().toISOString(),
        };
      }),

      // §6 QDRO writer (§10.8, PR-A m5/qdro-s108-blueprint-wiring). Code-name
      // `updateQDRODivision` is architect-locked; the §10.8 spec still uses the
      // legacy `updateQDRODecision` name (separate vault rename task). Writes
      // `sections.s6.data.qdro = { assets, status, lastUpdated }`, last-write-
      // wins (full overwrite of the qdro sub-slot). Section status propagates
      // from `qdroData.status`, mirroring the PIT/PVA siblings' last-write-wins
      // on `s6.status`; the broader §6 multi-source rollup gap is tracked in
      // vault Roadmap/Deferred/Blueprint-S6-Multi-Source-Status-Rollup.md.
      //
      // Input shape (matches `selectQDRODivisionData`'s output):
      //   { assets: { [assetId]: { userRole, planType, decisions, pvSource,
      //     completionState, metadata } },
      //     status: 'empty' | 'partial' | 'complete' }
      //
      // §10.8 status logic — the empty/partial/complete tri-state aggregation
      // over per-asset `completionState` (including the private_db
      // `pvSource: null` carve-out) — is computed inside `selectQDRODivisionData`;
      // this action consumes the rolled-up status, it does not recompute it.
      updateQDRODivision: (qdroData) => {
        const ts = new Date().toISOString();
        const status = qdroData?.status ?? 'empty';
        set(state => {
          const nextData = {
            ...state.sections.s6.data,
            qdro: {
              assets: qdroData?.assets ?? {},
              status,
              lastUpdated: ts,
            },
          };
          return {
            sections: {
              ...state.sections,
              s6: {
                ...state.sections.s6,
                status,
                sourceModule: deriveSourceModule(nextData),
                data: nextData,
              },
            },
            lastUpdated: ts,
          };
        });
        return { status };
      },

      // §9 — Home Decision (HDA, spec §10.6). Dedicated single-source section:
      // sourceModule is the static 'm5' (preserved via ...state.sections.s9 spread).
      // deriveSourceModule is NOT used for §9 — only §6 (multi-source) needs it.
      // Last-write-wins: each call fully overwrites s9.data with the new payload.
      //
      // NOTE: spec §10.6 types `scenarios` as ScenarioOutput[] but the HDA lib's
      // calculateHomeDecision returns `scenarios` as an object {keepAndRefi, sellNow,
      // deferredSale}. This action is shape-agnostic and persists the payload as-is;
      // the array-vs-object reconciliation is the PR-3 orchestrator's concern.
      updateHomeDecision: ({ scenarios, userSelection, selectionTimestamp, metadata }) => {
        // Status: null userSelection → partial; any selection value → complete
        const status = userSelection == null ? 'partial' : 'complete';
        set(state => ({
          sections: {
            ...state.sections,
            s9: {
              ...state.sections.s9,
              status,
              data: {
                scenarios,
                userSelection,
                selectionTimestamp: selectionTimestamp ?? null,
                metadata,
              },
            },
          },
          lastUpdated: new Date().toISOString(),
        }));
        return { status };
      },

      // §10 — Negotiation Strategy (M6 multi-source, Phase 0b). Two feeder
      // tools write independent slots into s10.data: Priorities Worksheet →
      // data.priorities, Trade-Off Analyzer → data.tradeOffs. Merge-don't-
      // clobber (mirrors updateRetirementDivision): each call updates one slot
      // and preserves the other. sourceModule is the static 'm6' (preserved via
      // the ...state.sections.s10 spread) — deriveSourceModule is NOT used here
      // (that derivation is §6-only). status is the tri-state rollup over both
      // slots (deriveNegotiationStatus). An invalid slot is a safe no-op: state
      // is left completely unchanged (no stray key written into s10.data), no
      // throw. Returns { status }, mirroring updateQDRODivision/updateHomeDecision.
      updateNegotiationStrategy: (slot, payload) => {
        if (slot !== 'priorities' && slot !== 'tradeOffs') {
          return { status: get().sections.s10.status };
        }
        const nextData = { ...get().sections.s10.data, [slot]: payload };
        const status = deriveNegotiationStatus(nextData);
        set(state => ({
          sections: {
            ...state.sections,
            s10: {
              ...state.sections.s10,
              status,
              data: nextData,
            },
          },
          lastUpdated: new Date().toISOString(),
        }));
        return { status };
      },

      // §11 — Settlement Offer Overview (M6 Tool 3, Settlement Offer Organizer).
      // Dedicated single-source writer (symmetry with updateNegotiationStrategy /
      // updateQDRODivision / updateHomeDecision — NOT the generic updateSection;
      // §11 had no writer before Phase 3). Sets s11.data = { offerSummary, map,
      // gaps } and derives a TWO-state status. §11 is an ORGANIZING overview,
      // never an evaluation: it stores the neutral readout the Organizer produced
      // (priority map + structural gaps) and never scores, ranks, or judges.
      // Status is binary — no 'partial' (a single save captures whatever the
      // offer holds): 'complete' when there is something to show (a present
      // offerSummary OR a non-empty priority map), else 'empty'. gaps alone
      // (which a wholly-empty offer always produces) do NOT populate the section.
      // map/gaps are coerced to [] so the renderer never guards on shape. Last-
      // write-wins; sourceModule stays the static 'm6'. Returns { status },
      // mirroring the sibling feeders.
      updateSettlementOverview: (payload) => {
        const offerSummary = payload?.offerSummary ?? null;
        const map = Array.isArray(payload?.map) ? payload.map : [];
        const gaps = Array.isArray(payload?.gaps) ? payload.gaps : [];
        const hasSummary =
          offerSummary != null &&
          (typeof offerSummary !== 'object' || Object.keys(offerSummary).length > 0);
        const status = hasSummary || map.length > 0 ? 'complete' : 'empty';
        set(state => ({
          sections: {
            ...state.sections,
            s11: { ...state.sections.s11, status, data: { offerSummary, map, gaps } },
          },
          lastUpdated: new Date().toISOString(),
        }));
        return { status };
      },

      // §7 — called by M3 Budget Modeler on completion
      // categories shape: Array<{ name: string, current: number, projected: number, change: number }>
      updateExpenseAnalysis: (budgetData) => set(state => ({
        sections: {
          ...state.sections,
          s7: {
            ...state.sections.s7,
            status: budgetData.hasProjected ? 'complete' : 'partial',
            data: {
              currentTotal: budgetData.currentTotal,
              projectedTotal: budgetData.projectedTotal,
              monthlyDifference: budgetData.currentTotal - budgetData.projectedTotal,
              categories: budgetData.categories,
              monthlyIncome: budgetData.monthlyIncome,
              monthlyGap: budgetData.monthlyGap,
            },
          },
        },
        lastUpdated: new Date().toISOString(),
      })),

      // §10.8 — write the QDRO projection into the Blueprint. PR5-2/PR5-4: stamp
      // generatedAt + savedAt with ONE timestamp; idempotent last-write-wins.
      writeQDROToBlueprint: (projection) =>
        set(() => {
          const ts = new Date().toISOString();
          return {
            qdroBlueprint: {
              savedProjection: { ...projection, generatedAt: ts },
              savedAt: ts,
            },
            lastUpdated: ts,
          };
        }),

      // Cost basis actions
      setCostBasisEntries: (entries) => set({ costBasisEntries: entries, lastUpdated: new Date().toISOString() }),
      toggleCostBasisView: () => set(state => ({ costBasisViewEnabled: !state.costBasisViewEnabled })),
      setCostBasisFilingStatus: (status) => set({ costBasisFilingStatus: status, lastUpdated: new Date().toISOString() }),

      // DEF-9: Deferred-comp stub actions (used by M2 vested/exercised gate)
      addDeferredCompStub: (stub) => set(state => ({
        deferredCompStubs: [
          ...state.deferredCompStubs,
          {
            id: stub.id ?? `dcs_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
            category: stub.category, // 'stockOptions' | 'corporateIncentives'
            company: stub.company ?? '',
            grantDate: stub.grantDate ?? null,
            sharesGranted: stub.sharesGranted ?? null,
            vestingSchedule: stub.vestingSchedule ?? '',
            strikePrice: stub.strikePrice ?? null,
            deferredComp: true,
            createdAt: new Date().toISOString(),
          },
        ],
        lastUpdated: new Date().toISOString(),
      })),
      updateDeferredCompStub: (id, patch) => set(state => ({
        deferredCompStubs: state.deferredCompStubs.map((s) =>
          s.id === id ? { ...s, ...patch } : s
        ),
        lastUpdated: new Date().toISOString(),
      })),
      removeDeferredCompStub: (id) => set(state => ({
        deferredCompStubs: state.deferredCompStubs.filter((s) => s.id !== id),
        lastUpdated: new Date().toISOString(),
      })),

      // Reset — clears all section data, preserves labels and sourceModule
      resetBlueprint: () => set({
        userName: '',
        sections: {
          s1: { status: 'empty', label: 'Personal Profile', sourceModule: 'm1', data: null },
          s2: { status: 'empty', label: 'Income Analysis', sourceModule: 'm3', data: null },
          s3: { status: 'empty', label: 'Asset Inventory', sourceModule: 'm2', data: null },
          s4: { status: 'empty', label: 'Tax Analysis', sourceModule: 'm4', data: null },
          s5: { status: 'empty', label: 'Property Division', sourceModule: 'm2+m4', data: null },
          s6: { status: 'empty', label: 'Retirement Plan Division', sourceModule: null, data: { pit: null, pva: null, qdro: null } },
          s7: { status: 'empty', label: 'Expense Analysis', sourceModule: 'm3', data: null },
          s8: { status: 'empty', label: 'Support Analysis', sourceModule: 'm5', data: null },
          s9: { status: 'empty', label: 'Home Decision', sourceModule: 'm5', data: null },
          s10: { status: 'empty', label: 'Negotiation Strategy', sourceModule: 'm6', data: { priorities: null, tradeOffs: null } },
          s11: { status: 'empty', label: 'Settlement Offer Overview', sourceModule: 'm6', data: null },
          s12: { status: 'empty', label: 'Action Plan & Timeline', sourceModule: 'm7', data: null },
        },
        costBasisEntries: [],
        costBasisViewEnabled: false,
        costBasisFilingStatus: null,
        deferredCompStubs: [],
        qdroBlueprint: { savedProjection: null, savedAt: null },
        lastUpdated: null,
      }),
    }),
    {
      name: 'clearpath-blueprint',
      // Persists to localStorage so the blueprint survives across tabs and
      // browser sessions. All M1–M4 stores use the same engine; mismatched
      // storage previously let PP retrofit clobber §3 when m2Store (then
      // sessionStorage) emptied while blueprint (localStorage) retained
      // stale MEI categories. Authenticated users will sync to Supabase
      // in a future iteration on top of this local cache.
      storage: createJSONStorage(() => localStorage),
    }
  )
);

export default useBlueprintStore;
