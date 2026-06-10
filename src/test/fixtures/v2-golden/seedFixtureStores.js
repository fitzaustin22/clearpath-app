/**
 * V2 golden-fixture seeding orchestrator (TEST-ONLY).
 *
 * Seeds the m1–m7 stores from a fixture's inputs-only `stores` block via the
 * stores' own contracts (actions / setState), then populates blueprintStore by
 * running the REAL writer payload paths: importable engines and store save
 * actions wherever they exist, and thin provenance-commented mirrors of the
 * component-internal payload mappers where they do not. Every mirror cites the
 * component code it replicates (file:line at main 6a08c3a). Resolved DCA stubs
 * are produced by REPLAYING the fixture's `replays` block through the m6
 * analyzer slice (fixture seeding contract) — never injected directly.
 *
 * FSO is the one writer whose engine is fully component-internal: it is
 * exercised by RENDERING the real component and clicking Calculate, so the
 * real engine runs through the real writer.
 */
import React from 'react';
import { render, fireEvent, screen, cleanup } from '@testing-library/react';

import { useM1Store } from '@/src/stores/m1Store';
import { useM2Store } from '@/src/stores/m2Store';
import { useM3Store, DEFAULT_DEDUCTIONS, CATEGORY_LABELS } from '@/src/stores/m3Store';
import { useM4Store } from '@/src/stores/m4Store';
import { useM5Store } from '@/src/stores/m5Store';
import { useM6Store } from '@/src/stores/m6Store';
import { useM7Store } from '@/src/stores/m7Store';
import useBlueprintStore from '@/src/stores/blueprintStore';

import { buildAssetInventoryPayload } from '@/src/lib/blueprintM2Payload';
import { ALL_SECTIONS, LIABILITY_KEYS, computeCategoryTotals } from '@/src/lib/m2Sections';
import { calculatePIT } from '@/src/lib/pitTaxDiscount';
import { calculatePensionValue, getHeadlinePV, getMaritalPV } from '@/src/lib/pensionValuation';
import { calculateHomeDecision } from '@/src/lib/homeDecision';
import { calculateSection121Exclusion } from '@/src/lib/section121';
import { selectQDROBlueprintProjection } from '@/src/lib/qdro/blueprint/projection';
import { selectQDRODivisionData } from '@/src/lib/qdro/blueprint/divisionData';

import FilingStatusOptimizer from '@/src/components/m4/FilingStatusOptimizer';

// ── Pristine slice snapshots (stores without full reset actions) ────────────
const deepClone = (v) => JSON.parse(JSON.stringify(v));
const pick = (state, keys) => Object.fromEntries(keys.map((k) => [k, deepClone(state[k])]));

const PRISTINE_M4 = pick(useM4Store.getState(), ['filingStatusOptimizer', 'pitTaxDiscount']);
const PRISTINE_M5 = pick(useM5Store.getState(), [
  'homeDecision',
  'qdroDecision',
  'pensionValuation',
  'supportEstimator',
]);
const PRISTINE_M6 = pick(useM6Store.getState(), ['offerOrganizer', 'deferredCompAnalyzer']);

export function resetAllStores() {
  localStorage.clear();
  useM1Store.getState().resetReadinessAssessment();
  useM1Store.getState().resetBudgetGap();
  useM2Store.getState().resetDocumentChecklist();
  useM2Store.getState().resetMaritalEstateInventory();
  useM2Store.getState().resetPersonalPropertyInventory();
  useM3Store.getState().resetPayStubDecoder();
  useM3Store.getState().resetBudgetModeler();
  useM3Store.getState().resetAffidavitBuilder();
  useM4Store.setState(deepClone(PRISTINE_M4));
  useM5Store.setState(deepClone(PRISTINE_M5));
  useM6Store.getState().resetPriorities();
  useM6Store.getState().resetTradeOffs();
  useM6Store.setState(deepClone(PRISTINE_M6));
  useM7Store.setState({ actionPlan: { nextSteps: [], professionals: [], keyDates: [] } });
  useBlueprintStore.getState().resetBlueprint();
  useBlueprintStore.setState({ deferredCompStubs: [], costBasisEntries: [], qdroBlueprint: { savedProjection: null } });
}

// ── M1 mirrors ───────────────────────────────────────────────────────────────

// Mirrors ReadinessAssessment.jsx computeResults/classify (:103-118) with the
// QUESTIONS domain map (:41-50): q1-2 income, q3-4 debt, q5-6 asset,
// q7-8 document, q9-10 professional.
const RA_DOMAIN_BY_QUESTION = {
  q1: 'incomeAwareness', q2: 'incomeAwareness',
  q3: 'debtAwareness', q4: 'debtAwareness',
  q5: 'assetAwareness', q6: 'assetAwareness',
  q7: 'documentAccess', q8: 'documentAccess',
  q9: 'professionalReadiness', q10: 'professionalReadiness',
};
export function mirrorComputeReadinessResults(answers) {
  const domainScores = {
    incomeAwareness: 0, debtAwareness: 0, assetAwareness: 0, documentAccess: 0, professionalReadiness: 0,
  };
  for (const a of answers) {
    const d = RA_DOMAIN_BY_QUESTION[a.questionId];
    if (d) domainScores[d] += a.score;
  }
  const totalScore = Object.values(domainScores).reduce((s, v) => s + v, 0);
  const tier = totalScore <= 10 ? 'exploring' : totalScore <= 20 ? 'preparing' : 'ready';
  return { totalScore, domainScores, tier };
}

// Mirrors BudgetGapCalculator.jsx convertToMonthly (:84-92) and
// buildPipelineResults (:530-552).
function convertToMonthly(gross, freq) {
  if (!gross || gross <= 0) return 0;
  switch (freq) {
    case 'weekly': return (gross * 52) / 12;
    case 'biweekly': return (gross * 26) / 12;
    case 'semimonthly': return gross * 2;
    default: return gross;
  }
}
const EXPENSE_KEYS = ['housing', 'utilities', 'groceries', 'transportation', 'healthInsurance', 'childcare', 'debtPayments', 'personal'];
function mirrorBuildPipelineResults(inputs) {
  const grossNum = Number(inputs.grossIncome) || 0;
  const payFrequency = inputs.payFrequency || 'monthly';
  const expectedShare = inputs.expectedShare ?? 50;
  const adjusted = convertToMonthly(grossNum, payFrequency) * (expectedShare / 100);
  const expenses = {};
  let total = 0;
  for (const k of EXPENSE_KEYS) {
    expenses[k] = Number(inputs[k]) || 0;
    total += expenses[k];
  }
  const gap = adjusted - total;
  return {
    completedAt: new Date().toISOString(),
    grossMonthlyIncome: grossNum,
    expectedSharePercent: expectedShare,
    payFrequency,
    adjustedMonthlyIncome: Math.round(adjusted * 100) / 100,
    expenses,
    totalMonthlyExpenses: Math.round(total * 100) / 100,
    monthlyGap: Math.round(gap * 100) / 100,
    gapPercent: adjusted === 0 ? null : Math.round((gap / adjusted) * 100 * 100) / 100,
  };
}

function seedM1(m1) {
  const s = useM1Store.getState();
  const ra = m1.readinessAssessment;
  if (ra) {
    for (const a of ra.answers || []) s.setReadinessAnswer(a.questionId, a.score);
    if (ra.completed) {
      const results = mirrorComputeReadinessResults(ra.answers || []);
      s.completeReadinessAssessment(results);
      // Mirrors ReadinessAssessment.jsx advance() blueprint write (:195-209).
      const bg = useM1Store.getState().budgetGap;
      useBlueprintStore.getState().updatePersonalProfile({
        assessment: { ...results, completedAt: new Date().toISOString() },
        budgetGap: bg?.completed && bg.results ? bg.results : null,
      });
    }
  }
  const bg = m1.budgetGap;
  if (bg) {
    if (bg.inputs && Object.keys(bg.inputs).length > 0) s.setBudgetGapInputs(bg.inputs);
    if (bg.emailCaptured) s.setEmailCaptured();
    if (bg.completed) {
      const results = mirrorBuildPipelineResults(bg.inputs || {});
      s.completeBudgetGap(results);
      // Mirrors BudgetGapCalculator.jsx writeBlueprintProfile (:555-564).
      const assessment = useM1Store.getState().readinessAssessment;
      useBlueprintStore.getState().updatePersonalProfile({
        assessment:
          assessment?.completed && assessment.results
            ? { ...assessment.results, completedAt: assessment.results.completedAt || new Date().toISOString() }
            : null,
        budgetGap: results,
      });
    }
  }
}

// ── M2 ───────────────────────────────────────────────────────────────────────

// The 42 checklist ids by category prefix (DocumentationChecklist MASTER_ITEMS
// inventory; persisted shape carries {id, category, status, notes} only).
const CHECKLIST_CATEGORIES = {
  'doc-tax': ['taxReturns', 6], 'doc-inc': ['incomeDocumentation', 5], 'doc-bank': ['bankAndCash', 5],
  'doc-inv': ['investmentAccounts', 5], 'doc-ret': ['retirementAccounts', 5], 'doc-re': ['realEstate', 5],
  'doc-debt': ['debtAndLiabilities', 6], 'doc-legal': ['legalAndInsurance', 5],
};
function fullChecklist(overlay) {
  const byId = new Map((overlay || []).map((i) => [i.id, i]));
  const items = [];
  for (const [prefix, [category, count]] of Object.entries(CHECKLIST_CATEGORIES)) {
    for (let n = 1; n <= count; n += 1) {
      const id = `${prefix}-${String(n).padStart(2, '0')}`;
      items.push({ id, category, status: byId.get(id)?.status ?? 'not-started', notes: byId.get(id)?.notes ?? '' });
    }
  }
  return items;
}

// Mirrors MaritalEstateInventory.jsx derived payload args (:250-297): category
// totals with the personal-property bucket injected, and the PP-adjusted
// summary used by buildAssetInventoryPayload.
function mirrorM2DerivedArgs(items, summary, pp) {
  const categoryTotals = computeCategoryTotals(items);
  const ppSummary = pp?.summary ?? { totalItems: 0, totalValue: 0, clientValue: 0, spouseValue: 0, disputedValue: 0, undecidedValue: 0 };
  categoryTotals.personalProperty = {
    total: ppSummary.totalValue,
    client: ppSummary.clientValue,
    spouse: ppSummary.spouseValue,
    unallocated: (ppSummary.disputedValue || 0) + (ppSummary.undecidedValue || 0),
  };
  const itemsBySection = {};
  for (const section of ALL_SECTIONS) itemsBySection[section.key] = items.filter((i) => i.category === section.key);
  const clientAssets = (summary.clientAssets || 0) + (ppSummary.clientValue || 0);
  const spouseAssets = (summary.spouseAssets || 0) + (ppSummary.spouseValue || 0);
  const unallocatedAssets =
    (summary.unallocatedAssets || 0) + (ppSummary.disputedValue || 0) + (ppSummary.undecidedValue || 0);
  const totalAssets = (summary.totalAssets || 0) + (ppSummary.totalValue || 0);
  const clientNetEstate = clientAssets - (summary.clientLiabilities || 0);
  const spouseNetEstate = spouseAssets - (summary.spouseLiabilities || 0);
  const allocatedNet = clientNetEstate + spouseNetEstate;
  const adjustedSummary = {
    ...summary,
    totalAssets,
    clientAssets,
    spouseAssets,
    unallocatedAssets,
    netMaritalEstate: totalAssets - (summary.totalLiabilities || 0),
    clientNetEstate,
    spouseNetEstate,
    clientPercentage: allocatedNet > 0 ? (clientNetEstate / allocatedNet) * 100 : 0,
    spousePercentage: allocatedNet > 0 ? (spouseNetEstate / allocatedNet) * 100 : 0,
  };
  return { categoryTotals, itemsBySection, adjustedSummary };
}

function seedM2(m2) {
  const s = useM2Store.getState();
  const mei = m2.maritalEstateInventory;
  if (mei?.marriageDate) s.setMarriageDate(mei.marriageDate);
  if (mei?.items) useM2Store.getState().initInventoryItems(mei.items);
  if (m2.documentChecklist?.items) useM2Store.getState().initChecklistItems(fullChecklist(m2.documentChecklist.items));
  const ppi = m2.personalPropertyInventory;
  if (ppi && ((ppi.rooms || []).length > 0 || (ppi.highValueItems || []).length > 0)) {
    useM2Store.getState().initPersonalProperty();
    for (const room of ppi.rooms || []) {
      for (const item of room.items || []) {
        useM2Store.getState().addPersonalPropertyItem(room.name, false);
        const all = useM2Store.getState().personalPropertyInventory.rooms;
        const target = all.find((r) => r.name === room.name);
        const justAdded = target.items[target.items.length - 1];
        useM2Store.getState().updatePersonalPropertyItem(justAdded.id, { ...item, id: justAdded.id }, false);
      }
    }
    for (const item of ppi.highValueItems || []) {
      useM2Store.getState().addPersonalPropertyItem(item.location, true);
      const hv = useM2Store.getState().personalPropertyInventory.highValueItems;
      const justAdded = hv[hv.length - 1];
      useM2Store.getState().updatePersonalPropertyItem(justAdded.id, { ...item, id: justAdded.id }, true);
    }
  }
  // Mirrors the MEI debounced writer effect (MaritalEstateInventory.jsx:334-361).
  const state = useM2Store.getState();
  const items = state.maritalEstateInventory.items;
  if (items.length > 0 || (state.personalPropertyInventory.summary?.totalItems ?? 0) > 0) {
    const { categoryTotals, itemsBySection, adjustedSummary } = mirrorM2DerivedArgs(
      items,
      state.maritalEstateInventory.summary,
      state.personalPropertyInventory
    );
    const payload = buildAssetInventoryPayload({
      items,
      summary: state.maritalEstateInventory.summary,
      categoryTotals,
      itemsBySection,
      adjustedSummary,
      checklistItems: state.documentChecklist.items,
      personalPropertySummary: state.personalPropertyInventory.summary,
      personalPropertyRooms: state.personalPropertyInventory.rooms,
      ALL_SECTIONS,
      LIABILITY_KEYS,
    });
    useBlueprintStore.getState().updateAssetInventory(payload);
  }
}

// ── M3 ───────────────────────────────────────────────────────────────────────

function seedM3(m3) {
  const psd = m3.payStubDecoder;
  if (psd?.inputs) {
    const s = useM3Store.getState();
    const scalars = { ...psd.inputs };
    const { deductions } = psd.inputs;
    delete scalars.deductions;
    delete scalars.otherIncomeSources;
    // setPayStubField takes `inputs.`-prefixed nested paths (m3Store.js:346-352).
    for (const [field, value] of Object.entries(scalars)) s.setPayStubField(`inputs.${field}`, value);
    if (deductions) {
      const merged = DEFAULT_DEDUCTIONS.map((row) => {
        const o = deductions.find((d) => d.id === row.id);
        return { ...row, perPaycheck: o ? o.perPaycheck : row.perPaycheck };
      });
      s.setPayStubField('inputs.deductions', merged);
    }
    if (psd.completed) {
      useM3Store.getState().calculatePayStubResults();
      // Mirrors the PayStubDecoder writer effect (PayStubDecoder.jsx:584-595).
      const st = useM3Store.getState().payStubDecoder;
      const r = st.results;
      useBlueprintStore.getState().updateIncomeAnalysis({
        grossMonthlyIncome: r.grossMonthlyIncome || 0,
        netMonthlyIncome: r.takeHomePay || 0,
        payFrequency: st.inputs?.payFrequency || null,
        grossPerPaycheck: st.inputs?.grossPayPerCheck || 0,
        deductions: r.deductionBreakdown || [],
        otherIncome: r.otherIncomeMonthly || 0,
      });
    }
  }
  const bm = m3.budgetModeler;
  if (bm) {
    for (const column of ['current', 'projected']) {
      for (const [category, fields] of Object.entries(bm[column] || {})) {
        for (const [field, value] of Object.entries(fields)) {
          useM3Store.getState().setBudgetField(column, category, field, value);
        }
      }
    }
    if (bm.completed) {
      useM3Store.getState().calculateBudgetResults();
      // Mirrors the BudgetModeler complete-branch writer (BudgetModeler.jsx:296-317).
      const r = useM3Store.getState().budgetModeler.results;
      const categories = (r.categoryDeltas || []).map((d) => ({
        name: CATEGORY_LABELS?.[d.category] || d.category,
        current: d.current || 0,
        projected: d.projected || 0,
        change: d.delta || 0,
      }));
      const monthlyIncome = r.incomeComparison?.monthlyIncome || 0;
      const monthlyGap =
        r.incomeComparison?.projectedSurplusShortfall != null
          ? r.incomeComparison.projectedSurplusShortfall
          : monthlyIncome - (r.projectedTotal || 0);
      useBlueprintStore.getState().updateExpenseAnalysis({
        currentTotal: r.currentTotal || 0,
        projectedTotal: r.projectedTotal || 0,
        categories,
        monthlyIncome,
        monthlyGap,
        hasProjected: (r.projectedTotal || 0) > 0,
      });
    }
  }
}

// ── M4 ───────────────────────────────────────────────────────────────────────

function seedM4(m4) {
  const fso = m4.filingStatusOptimizer;
  if (fso?.inputs) {
    useM4Store.getState().setFilingStatusInputs(fso.inputs);
    // The FSO tax engine is fully component-internal — run the REAL engine
    // through the REAL writer by rendering the component and clicking
    // Calculate (handleCalculate, FilingStatusOptimizer.jsx:525-535).
    render(React.createElement(FilingStatusOptimizer, { userTier: 'navigator' }));
    const button = screen.getByRole('button', { name: /compare filing statuses/i });
    fireEvent.click(button);
    cleanup();
  }
  const pit = m4.pitTaxDiscount;
  if (pit?.inputs) {
    useM4Store.getState().setPITInputs(pit.inputs);
    const results = calculatePIT(pit.inputs);
    useM4Store.getState().setPITResults(results);
    // Mirrors the PIT persist effect (PITTaxDiscountCalculator.jsx:522-539).
    useBlueprintStore.getState().updateRetirementDivision({
      planBalance: pit.inputs.planBalance,
      planType: pit.inputs.planType,
      taxDiscountPercent: results.tdPercent,
      taxDiscountDollars: results.tdDollars,
      taxAdjustedValue: results.taxAdjustedValue,
      traditionalDiscountDollars: results.traditionalTD,
      overage: results.overage,
      n: results.n,
      effectiveTaxRate: pit.inputs.effectiveTaxRate,
      discountRate: pit.inputs.discountRate,
    });
  }
}

// ── M5 ───────────────────────────────────────────────────────────────────────

// Mirrors the PVA routing rules R1–R6 (PVA.jsx:54-62, 139-147).
const PVA_FLAG_ONLY_PLAN_TYPES = new Set(['multi_employer', 'gov_civilian', 'military', 'state_municipal']);
function mirrorResolvePvaPath(inputs) {
  if (PVA_FLAG_ONLY_PLAN_TYPES.has(inputs.planType)) return 'flag_only';
  if (inputs.planType === 'private_db_cash_balance') return 'cash_balance';
  if (inputs.accrualStatus === 'in_pay_status') return 'in_pay_status';
  if (inputs.tierOverride) return inputs.tierOverride;
  return inputs.accrualStatus === 'frozen' ? 'tier_1' : 'tier_3';
}

function seedM5(m5, blueprintBlock) {
  const pva = m5.pensionValuation;
  if (pva?.assets) {
    for (const [assetId, slot] of Object.entries(pva.assets)) {
      useM5Store.getState().setPVAAssetInputs(assetId, slot.inputs);
      const path = mirrorResolvePvaPath(slot.inputs);
      const results = calculatePensionValue({
        ...slot.inputs,
        path,
        planType: slot.inputs.planType,
        _frozenRoutingApplied: slot.inputs.accrualStatus === 'frozen',
      });
      useM5Store.getState().setPVAAssetResults(assetId, results);
      // Mirrors the PVA writer effect (PVA.jsx:189-207).
      if (results.path === 'flag_only') {
        useBlueprintStore.getState().updatePensionValuation({ path: 'flag_only', headlinePV: null, maritalPV: null });
      } else {
        useBlueprintStore.getState().updatePensionValuation({
          path: results.path,
          headlinePV: getHeadlinePV(results),
          maritalPV: getMaritalPV(results),
          expectedRetirementAge: slot.inputs?.expectedRetirementAge ?? null,
          coverturePercent: results.coverture?.fraction ?? null,
          citations: results.metadata?.citations ?? null,
        });
      }
    }
  }
  const qdro = m5.qdroDecision;
  if (qdro?.assets) {
    for (const [assetId, asset] of Object.entries(qdro.assets)) {
      useM5Store.getState().addQDROAsset(assetId, { planName: asset.planName ?? null, employer: asset.employer ?? null });
      useM5Store.getState().setQDROClassifiers(assetId, { userRole: asset.userRole ?? null, planType: asset.planType ?? null });
      if (asset.decisions) useM5Store.getState().updateQDRODecision(assetId, asset.decisions);
    }
    useM5Store.getState().reconcileQDROPvSources();
    // Mirrors QDGBlueprintSavedCallout handleSave (:109-112) — both writers.
    const m5State = useM5Store.getState();
    useBlueprintStore.getState().writeQDROToBlueprint(selectQDROBlueprintProjection(m5State));
    useBlueprintStore.getState().updateQDRODivision(selectQDRODivisionData(m5State));
  }
  const hda = m5.homeDecision;
  if (hda?.inputs) {
    useM5Store.getState().setHomeDecisionInputs(hda.inputs);
    if (hda.userSelection) useM5Store.getState().setHomeDecisionUserSelection(hda.userSelection);
    // Mirrors the HDA calc boundary + handleSave (HomeDecisionAnalyzer.jsx:111-163).
    const inputs = useM5Store.getState().homeDecision.inputs;
    const interim = inputs.interimCostSharePct == null ? 0.5 : inputs.interimCostSharePct * 0.01;
    const primaryResidence = (blueprintBlock?.costBasisEntries ?? []).find((e) => e?.isPrimaryResidence);
    const calc = calculateHomeDecision(
      {
        ...inputs,
        interimCostSharePct: interim,
        costBasis: primaryResidence?.costBasis ?? 0,
        costBasisFilingStatus: blueprintBlock?.costBasisFilingStatus ?? null,
        currentYear: new Date().getFullYear(),
      },
      { stressTest: !!inputs.stressTestUserPays100Pct }
    );
    useM5Store.getState().setHomeDecisionResults(calc.scenarios);
    useM5Store.getState().setHomeDecisionMetadata({ ...calc.metadata, _prePopSources: {} });
    const sel = useM5Store.getState().homeDecision.userSelection ?? null;
    const SCENARIO_ORDER = ['keepAndRefi', 'sellNow', 'deferredSale'];
    useBlueprintStore.getState().updateHomeDecision({
      scenarios: SCENARIO_ORDER.map((id) => calc.scenarios[id]),
      userSelection: sel,
      selectionTimestamp: sel != null ? new Date().toISOString() : null,
      metadata: { ...calc.metadata, _prePopSources: {} },
    });
  }
  if (m5.supportEstimator?.inputs) {
    useM5Store.getState().setSupportEstimatorInputs(m5.supportEstimator.inputs);
    // No §8 writer exists in v1 (the defect pulled into V2 Phase 2 scope) —
    // estimator inputs are seeded for completeness; nothing reaches s8.
  }
}

// ── M6 / M7 ─────────────────────────────────────────────────────────────────

function seedM6(m6, replays) {
  if (m6.priorities?.items?.length) {
    for (const item of m6.priorities.items) {
      useM6Store.getState().addPriority({ item: item.item });
      const items = useM6Store.getState().priorities.items;
      const justAdded = items[items.length - 1];
      if (item.importance && item.importance !== 'unsorted') {
        useM6Store.getState().setPriorityImportance(justAdded.id, item.importance);
      }
    }
    useM6Store.getState().savePrioritiesToBlueprint();
  }
  if (m6.tradeOffs?.rows?.length) {
    for (const row of m6.tradeOffs.rows) {
      useM6Store.getState().addTradeOff({ get: row.get });
      const rows = useM6Store.getState().tradeOffs.rows;
      const justAdded = rows[rows.length - 1];
      for (const give of row.give || []) useM6Store.getState().addGiveToTrade(justAdded.id, give);
    }
    useM6Store.getState().saveTradeOffsToBlueprint();
  }
  if (m6.offerOrganizer?.offer) {
    const offer = m6.offerOrganizer.offer;
    for (const a of offer.assetItems || []) useM6Store.getState().addAssetItem({ label: a.label, toUser: a.toUser });
    for (const d of offer.debts || []) useM6Store.getState().addDebtItem({ label: d.label, toUser: d.toUser });
    for (const [k, v] of Object.entries(offer.support || {})) useM6Store.getState().setOfferField(`support.${k}`, v);
    for (const [k, v] of Object.entries(offer.residence || {})) useM6Store.getState().setOfferField(`residence.${k}`, v);
    for (const [k, v] of Object.entries(offer.retirement || {})) useM6Store.getState().setOfferField(`retirement.${k}`, v);
    if (offer.otherTerms) useM6Store.getState().setOfferField('otherTerms', offer.otherTerms);
    for (const key of Object.keys(offer.priorityTags || {})) useM6Store.getState().tagPriority(key);
    useM6Store.getState().saveOfferToBlueprint();
  }
  // DCA replays — the fixture contract: resolved stubs are produced by
  // replaying analyses through the m6 analyzer slice, never injected.
  for (const replay of replays?.dcaAnalyses || []) {
    useM6Store.getState().selectStub(replay.stubId);
    useM6Store.setState((s) => ({
      deferredCompAnalyzer: { ...s.deferredCompAnalyzer, analysis: { ...replay.analysis } },
    }));
    useM6Store.getState().saveAnalysisToBlueprint(replay.stubId);
  }
}

function seedM7(m7) {
  if (!m7?.actionPlan) return;
  useM7Store.setState((s) => ({ actionPlan: { ...s.actionPlan, ...deepClone(m7.actionPlan) } }));
  useM7Store.getState().saveActionPlanToBlueprint();
}

// ── Blueprint carriers ───────────────────────────────────────────────────────

const LTCG_RATE = 0.15; // mirrors CostBasisEntryPanel.jsx:19

// Mirrors the CBEP handleCalculate entry math + titleholder bucketing
// (CostBasisEntryPanel.jsx:394-531), with calculateSection121Exclusion
// imported from the real lib.
function seedCostBasis(entriesInput, filingStatus) {
  const items = useM2Store.getState().maritalEstateInventory.items;
  const newEntries = [];
  for (const input of entriesInput || []) {
    const item = items.find((i) => i.id === input.assetId) || {};
    const fmv = Number(input.fmv ?? item.currentValue) || 0;
    const parsed = input.costBasis ?? null;
    let costBasis = parsed;
    let baseline = fmv;
    let builtInGain = 0;
    let estimatedTax = 0;
    let isPrimaryResidence = false;
    let accountSubType;
    if (input.category === 'realEstate') {
      const mortgage = Number(item.outstandingBalance) || 0;
      const rawGain = parsed !== null ? fmv - parsed : 0;
      builtInGain = rawGain;
      isPrimaryResidence = !!input.isPrimaryResidence;
      const { taxableGain } = isPrimaryResidence
        ? calculateSection121Exclusion({ gain: rawGain, filingStatusAtSale: filingStatus })
        : { taxableGain: Math.max(0, rawGain) };
      estimatedTax = Math.max(0, taxableGain * LTCG_RATE);
      baseline = fmv - mortgage;
    } else if (input.category === 'workingCapital') {
      accountSubType = input.accountSubType || 'brokerage';
      if (accountSubType === 'bank') {
        costBasis = null;
      } else {
        const gain = parsed !== null ? Math.max(0, fmv - parsed) : 0;
        builtInGain = gain;
        estimatedTax = gain * LTCG_RATE;
      }
    } else {
      const gain = parsed !== null ? Math.max(0, fmv - parsed) : 0;
      builtInGain = gain;
      estimatedTax = gain * LTCG_RATE;
    }
    newEntries.push({
      assetId: input.assetId,
      description: input.description,
      category: input.category,
      fmv,
      costBasis,
      baseline,
      builtInGain,
      estimatedTax,
      taxAdjustedValue: baseline - estimatedTax,
      isPrimaryResidence,
      ...(accountSubType ? { accountSubType } : {}),
    });
  }
  useBlueprintStore.getState().setCostBasisEntries(newEntries);
  const buckets = { client: { adj: 0, tax: 0 }, spouse: { adj: 0, tax: 0 }, undecided: { adj: 0, tax: 0 } };
  for (const e of newEntries) {
    const holder = items.find((i) => i.id === e.assetId)?.titleholder;
    if (holder === 'self') {
      buckets.client.adj += e.taxAdjustedValue; buckets.client.tax += e.estimatedTax;
    } else if (holder === 'spouse') {
      buckets.spouse.adj += e.taxAdjustedValue; buckets.spouse.tax += e.estimatedTax;
    } else if (holder === 'joint') {
      buckets.client.adj += e.taxAdjustedValue / 2; buckets.client.tax += e.estimatedTax / 2;
      buckets.spouse.adj += e.taxAdjustedValue / 2; buckets.spouse.tax += e.estimatedTax / 2;
    } else {
      buckets.undecided.adj += e.taxAdjustedValue; buckets.undecided.tax += e.estimatedTax;
    }
  }
  useBlueprintStore.getState().updatePropertyDivisionTaxAdjusted({
    taxAdjusted: { client: buckets.client.adj, spouse: buckets.spouse.adj, undecided: buckets.undecided.adj },
    hiddenTax: { client: buckets.client.tax, spouse: buckets.spouse.tax, undecided: buckets.undecided.tax },
  });
}

// ── Entry point ──────────────────────────────────────────────────────────────

export function seedFixtureStores(fixture) {
  resetAllStores();
  const stores = fixture.stores || {};
  const bp = stores['clearpath-blueprint'];

  // Carriers that downstream seeding reads must land first.
  for (const stub of bp?.deferredCompStubs || []) useBlueprintStore.getState().addDeferredCompStub(stub);
  if (bp?.costBasisFilingStatus) useBlueprintStore.getState().setCostBasisFilingStatus(bp.costBasisFilingStatus);

  if (stores['m1-store']) seedM1(stores['m1-store']);
  if (stores['m2-store']) seedM2(stores['m2-store']);
  if (bp?.costBasisEntries?.length) seedCostBasis(bp.costBasisEntries, bp.costBasisFilingStatus ?? null);
  if (bp?.costBasisViewEnabled && !useBlueprintStore.getState().costBasisViewEnabled) {
    useBlueprintStore.getState().toggleCostBasisView();
  }
  if (stores['clearpath-m3-store']) seedM3(stores['clearpath-m3-store']);
  if (stores['clearpath-m4']) seedM4(stores['clearpath-m4']);
  if (stores['clearpath-m5']) seedM5(stores['clearpath-m5'], bp);
  if (stores['clearpath-m6'] || fixture.replays) seedM6(stores['clearpath-m6'] || {}, fixture.replays);
  if (stores['clearpath-m7']) seedM7(stores['clearpath-m7']);

  return useBlueprintStore.getState();
}
