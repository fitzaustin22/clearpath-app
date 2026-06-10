/**
 * V2 Attorney Blueprint — intermediate document model builder (R1, spec §8).
 *
 * Plain JSON out. The Phase 2 react-pdf renderer consumes ONLY this model.
 * Reads a blueprintStore snapshot (twelve sections per D5 PLUS the three
 * out-of-section carriers explicitly) and never writes anything anywhere.
 *
 * Pinned Phase 1 resolutions (do not re-decide):
 * - jurisdiction is an EXPLICIT PARAMETER (harness injects from fixture
 *   clientState; production wiring is the D-V2-8 Phase 4 design item).
 * - inclusion reuses the factored v1 predicate (sectionInclusion.js) —
 *   status-only, consumer-faithful.
 * - D-V2-7 appendix: entries derivable from lineage + normalized metadata now;
 *   the engine-constant assumption sweep is Phase 2 (structured, labeled
 *   placeholders below).
 *
 * Block shape:
 *   { id, label, value, valueClass, lineage: { inputs: [store paths],
 *     formulaId }, citations: [registry keys], meta: normalized-metadata }
 */

import { isSectionIncluded } from '../../components/blueprint/sectionInclusion';
import {
  normalizePvaSection,
  normalizeQdroAssetMetadata,
  normalizeDcaStubMetadata,
  normalizePitSection,
  normalizeFsoSection,
  normalizeHdaMetadata,
  normalizeTavMetadata,
  normalizePayStubMetadata,
  normalizeUnmappedSection,
  KNOWN_ENGINE_TAX_YEAR,
} from './metadataNormalizer';

export const SECTION_ORDER = Object.freeze([
  's1', 's2', 's3', 's4', 's5', 's6', 's7', 's8', 's9', 's10', 's11', 's12',
]);

export const VALUE_CLASSES = Object.freeze([
  'currency_actual',
  'currency_projection',
  'rate',
  'fraction',
  'count',
  'text',
]);

function block(id, label, value, valueClass, { inputs = [], meta }) {
  return {
    id,
    label,
    value,
    valueClass,
    lineage: { inputs, formulaId: meta?.formulaId ?? null },
    citations: meta ? [...meta.citations] : [],
    meta,
  };
}

/** Numeric block helper — skips null/undefined values entirely. */
function num(blocks, id, label, value, valueClass, opts) {
  if (value === null || value === undefined) return;
  blocks.push(block(id, label, Number(value), valueClass, opts));
}

function text(blocks, id, label, value, opts) {
  if (value === null || value === undefined || value === '') return;
  blocks.push(block(id, label, String(value), 'text', opts));
}

// ── Per-section extractors ───────────────────────────────────────────────────
// Each receives the section's `data` and a ctx { appendix } and returns blocks.

function extractS1(data) {
  const meta = normalizeUnmappedSection('readinessAssessment', 'clearpath-blueprint:s1', [
    // Registry §7: proprietary self-assessment, reworded to non-methodology.
    'non_methodology_by_design',
  ]);
  const blocks = [];
  const src = (p) => ({ inputs: [`m1-store:${p}`], meta });
  num(blocks, 's1.totalScore', 'Readiness total score', data.totalScore, 'count', src('readinessAssessment.answers'));
  text(blocks, 's1.tier', 'Readiness tier', data.tier, src('readinessAssessment.answers'));
  num(blocks, 's1.adjustedMonthlyIncome', 'Adjusted monthly income', data.adjustedMonthlyIncome, 'currency_actual', src('budgetGap.inputs'));
  num(blocks, 's1.totalMonthlyExpenses', 'Total monthly expenses', data.totalMonthlyExpenses, 'currency_actual', src('budgetGap.inputs'));
  num(blocks, 's1.monthlyGap', 'Monthly gap', data.monthlyGap, 'currency_actual', src('budgetGap.inputs'));
  num(blocks, 's1.gapPercent', 'Gap percent', data.gapPercent, 'rate', src('budgetGap.inputs'));
  return blocks;
}

function extractS2(data, ctx) {
  const meta = normalizePayStubMetadata();
  const blocks = [];
  const src = { inputs: ['clearpath-m3-store:payStubDecoder.inputs'], meta };
  num(blocks, 's2.grossMonthlyIncome', 'Gross monthly income', data.grossMonthlyIncome, 'currency_actual', src);
  num(blocks, 's2.netMonthlyIncome', 'Net monthly income', data.netMonthlyIncome, 'currency_actual', src);
  num(blocks, 's2.grossPerPaycheck', 'Gross per paycheck', data.grossPerPaycheck, 'currency_actual', src);
  num(blocks, 's2.otherIncome', 'Other monthly income', data.otherIncome, 'currency_actual', src);
  num(blocks, 's2.annualGrossIncome', 'Annual gross income', data.annualGrossIncome, 'currency_actual', src);
  ctx.appendix.push({
    sectionId: 's2',
    label: 'Pay frequency',
    value: data.payFrequency ?? null,
    source: 'clearpath-m3-store:payStubDecoder.inputs.payFrequency',
  });
  return blocks;
}

function extractS3(data) {
  const meta = normalizeUnmappedSection('maritalEstateInventory', 'clearpath-blueprint:s3');
  const blocks = [];
  const src = { inputs: ['m2-store:maritalEstateInventory.items'], meta };
  num(blocks, 's3.totalAssets', 'Total assets', data.totalAssets, 'currency_actual', src);
  num(blocks, 's3.totalLiabilities', 'Total liabilities', data.totalLiabilities, 'currency_actual', src);
  num(blocks, 's3.netWorth', 'Net worth', data.netWorth, 'currency_actual', src);
  for (const [cat, total] of Object.entries(data.assetsByCategory || {})) {
    const v = typeof total === 'object' ? total?.total : total;
    num(blocks, `s3.assets.${cat}`, `Assets — ${cat}`, v, 'currency_actual', src);
  }
  for (const [cat, total] of Object.entries(data.liabilitiesByCategory || {})) {
    const v = typeof total === 'object' ? total?.total : total;
    num(blocks, `s3.liabilities.${cat}`, `Liabilities — ${cat}`, v, 'currency_actual', src);
  }
  num(blocks, 's3.documentsGathered', 'Documents gathered', data.documentsGathered, 'count', {
    inputs: ['m2-store:documentChecklist.items'],
    meta,
  });
  return blocks;
}

function extractS4(data, ctx) {
  const meta = normalizeFsoSection(data);
  const blocks = [];
  const src = { inputs: ['clearpath-m4:filingStatusOptimizer.inputs'], meta };
  text(blocks, 's4.bestOption', 'Best filing status', data.bestOption, src);
  num(blocks, 's4.maxSavings', 'Potential tax savings', data.maxSavings, 'currency_projection', src);
  for (const [status, scenario] of Object.entries(data.scenarios || {})) {
    num(blocks, `s4.scenario.${status}.netTax`, `Net tax — ${status}`, scenario?.netTax, 'currency_projection', src);
  }
  text(blocks, 's4.taxYear', 'Tax year (as persisted)', data.taxYear, src);
  ctx.appendix.push({
    sectionId: 's4',
    label: 'Divorce timeline (Dec-31 determination input)',
    value: data.divorceTimeline ?? null,
    source: 'clearpath-m4:filingStatusOptimizer.inputs.divorceTimeline',
  });
  ctx.appendix.push({
    sectionId: 's4',
    label: 'Engine tax year (Rev. Proc. 2025-32) vs persisted store year',
    value: { engine: KNOWN_ENGINE_TAX_YEAR, persisted: data.taxYear ?? null },
    source: 'metadataNormalizer.KNOWN_ENGINE_TAX_YEAR',
  });
  return blocks;
}

function extractS5(data) {
  const inventoryMeta = normalizeUnmappedSection('maritalEstateInventory', 'clearpath-blueprint:s5');
  const tavMeta = normalizeTavMetadata();
  const blocks = [];
  const faceSrc = { inputs: ['m2-store:maritalEstateInventory.items'], meta: inventoryMeta };
  const tavSrc = { inputs: ['clearpath-blueprint:costBasisEntries'], meta: tavMeta };
  num(blocks, 's5.totalMaritalEstate', 'Total marital estate', data.totalMaritalEstate, 'currency_actual', faceSrc);
  for (const bucket of ['client', 'spouse', 'undecided']) {
    num(blocks, `s5.faceValue.${bucket}`, `Face value — ${bucket}`, data.faceValue?.[bucket], 'currency_actual', faceSrc);
    num(blocks, `s5.taxAdjusted.${bucket}`, `Tax-adjusted — ${bucket}`, data.taxAdjusted?.[bucket], 'currency_projection', tavSrc);
    num(blocks, `s5.hiddenTax.${bucket}`, `Hidden tax — ${bucket}`, data.hiddenTax?.[bucket], 'currency_projection', tavSrc);
  }
  return blocks;
}

function extractS6(data, ctx) {
  const blocks = [];
  if (data?.pit) {
    const meta = normalizePitSection(data.pit);
    const src = { inputs: ['clearpath-m4:pitTaxDiscount.inputs'], meta };
    const p = data.pit;
    num(blocks, 's6.pit.planBalance', 'Plan balance at division', p.planBalance, 'currency_actual', src);
    num(blocks, 's6.pit.taxDiscountPercent', 'PIT tax discount %', p.taxDiscountPercent, 'rate', src);
    num(blocks, 's6.pit.taxDiscountDollars', 'PIT tax discount $', p.taxDiscountDollars, 'currency_projection', src);
    num(blocks, 's6.pit.taxAdjustedValue', 'Tax-adjusted value', p.taxAdjustedValue, 'currency_projection', src);
    num(blocks, 's6.pit.traditionalDiscountDollars', 'Traditional-method discount $', p.traditionalDiscountDollars, 'currency_projection', src);
    num(blocks, 's6.pit.overage', 'Traditional-method overstatement', p.overage, 'currency_projection', src);
    for (const [label, key, cls] of [
      ['Years to withdrawal midpoint (n)', 'n', 'count'],
      ['Effective tax rate', 'effectiveTaxRate', 'rate'],
      ['Discount rate', 'discountRate', 'rate'],
    ]) {
      num(blocks, `s6.pit.${key}`, label, p[key], cls, src);
      ctx.appendix.push({ sectionId: 's6', label: `PIT assumption — ${label}`, value: p[key] ?? null, source: `clearpath-blueprint:s6.pit.${key}` });
    }
  }
  if (data?.pva) {
    const meta = normalizePvaSection(data.pva);
    const src = { inputs: ['clearpath-m5:pensionValuation.assets'], meta };
    const v = data.pva;
    num(blocks, 's6.pva.headlinePV', 'Pension present value', v.headlinePV, 'currency_projection', src);
    num(blocks, 's6.pva.maritalPV', 'Marital portion present value', v.maritalPV, 'currency_projection', src);
    num(blocks, 's6.pva.coverturePercent', 'Coverture fraction', v.coverturePercent, 'fraction', src);
    text(blocks, 's6.pva.path', 'Valuation path', v.path, src);
    ctx.appendix.push({ sectionId: 's6', label: 'PVA assumption — expected retirement age', value: v.expectedRetirementAge ?? null, source: 'clearpath-blueprint:s6.pva.expectedRetirementAge' });
  }
  if (data?.qdro && data.qdro.assets && Object.keys(data.qdro.assets).length > 0) {
    for (const [assetId, asset] of Object.entries(data.qdro.assets)) {
      const meta = normalizeQdroAssetMetadata(asset?.metadata ?? null);
      const src = { inputs: [`clearpath-m5:qdroDecision.assets.${assetId}`], meta };
      text(blocks, `s6.qdro.${assetId}.planType`, 'QDRO plan type', asset?.planType, src);
      text(blocks, `s6.qdro.${assetId}.userRole`, 'QDRO user role', asset?.userRole, src);
      text(blocks, `s6.qdro.${assetId}.completionState`, 'QDRO completion state', asset?.completionState, src);
      text(blocks, `s6.qdro.${assetId}.pvSource`, 'PV source (engine formula id)', asset?.pvSource, src);
    }
  }
  return blocks;
}

function extractS7(data) {
  const meta = normalizeUnmappedSection('budgetModeler', 'clearpath-blueprint:s7');
  const blocks = [];
  const src = { inputs: ['clearpath-m3-store:budgetModeler.current', 'clearpath-m3-store:budgetModeler.projected'], meta };
  num(blocks, 's7.currentTotal', 'Current monthly expenses', data.currentTotal, 'currency_actual', src);
  num(blocks, 's7.projectedTotal', 'Projected monthly expenses', data.projectedTotal, 'currency_projection', src);
  num(blocks, 's7.monthlyIncome', 'Monthly income', data.monthlyIncome, 'currency_actual', src);
  num(blocks, 's7.monthlyGap', 'Projected surplus/shortfall', data.monthlyGap, 'currency_projection', src);
  for (const cat of data.categories || []) {
    num(blocks, `s7.category.${cat.name}.current`, `${cat.name} — current`, cat.current, 'currency_actual', src);
    num(blocks, `s7.category.${cat.name}.projected`, `${cat.name} — projected`, cat.projected, 'currency_projection', src);
  }
  return blocks;
}

function extractS8(data) {
  // §8 Support Analysis has NO writer in v1 (the known defect pulled into V2
  // scope — the writer itself is Phase 2 §8-writer work). When it lands, this
  // extractor grows the support blocks; today it only handles data presence.
  if (!data) return [];
  const meta = normalizeUnmappedSection('supportEstimator', 'clearpath-blueprint:s8');
  const blocks = [];
  const src = { inputs: ['clearpath-m5:supportEstimator.inputs'], meta };
  num(blocks, 's8.totalMonthlySupport', 'Total monthly support', data.totalMonthlySupport, 'currency_projection', src);
  return blocks;
}

function extractS9(data, ctx) {
  const meta = normalizeHdaMetadata(data?.metadata ?? null);
  const blocks = [];
  const src = { inputs: ['clearpath-m5:homeDecision.inputs'], meta };
  // Phase 1 represents scenario presence + selection; numeric scenario
  // internals land in Phase 2 alongside the renderer's scenario-shape
  // contract (documented in the PR body).
  const scenarios = Array.isArray(data?.scenarios) ? data.scenarios : [];
  const SCENARIO_IDS = ['keepAndRefi', 'sellNow', 'deferredSale'];
  scenarios.forEach((s, i) => {
    if (s) text(blocks, `s9.scenario.${SCENARIO_IDS[i] ?? `slot${i}`}`, 'HDA scenario present', SCENARIO_IDS[i] ?? `slot${i}`, src);
  });
  text(blocks, 's9.userSelection', 'Selected scenario', data?.userSelection, src);
  for (const [key, value] of Object.entries(data?.metadata || {})) {
    if (key === '_prePopSources') continue;
    if (typeof value === 'number' || typeof value === 'string' || typeof value === 'boolean') {
      ctx.appendix.push({ sectionId: 's9', label: `HDA assumption — ${key}`, value, source: `clearpath-blueprint:s9.metadata.${key}` });
    }
  }
  return blocks;
}

function extractS10(data) {
  const meta = normalizeUnmappedSection('negotiationStrategy', 'clearpath-blueprint:s10');
  const blocks = [];
  const src = { inputs: ['clearpath-m6:priorities.items', 'clearpath-m6:tradeOffs.rows'], meta };
  const priorities = data?.priorities || [];
  const tradeOffs = data?.tradeOffs || [];
  num(blocks, 's10.priorityCount', 'Priorities recorded', priorities.length, 'count', src);
  num(blocks, 's10.tradeOffCount', 'Trade-offs recorded', tradeOffs.length, 'count', src);
  priorities.forEach((p, i) => text(blocks, `s10.priority.${i}`, `Priority ${p.rank ?? i + 1} (${p.importance})`, p.item, src));
  tradeOffs.forEach((t, i) => text(blocks, `s10.tradeOff.${i}`, 'Trade-off', `${t.get} ⇄ ${t.give}`, src));
  return blocks;
}

function extractS11(data) {
  const meta = normalizeUnmappedSection('settlementOfferOrganizer', 'clearpath-blueprint:s11');
  const blocks = [];
  const src = { inputs: ['clearpath-m6:offerOrganizer.offer'], meta };
  num(blocks, 's11.mapCount', 'Priorities mapped against offer', (data?.map || []).length, 'count', src);
  num(blocks, 's11.gapCount', 'Offer silences (gaps)', (data?.gaps || []).length, 'count', src);
  (data?.map || []).forEach((row, i) =>
    text(blocks, `s11.map.${i}`, `Offer vs priority — ${row.status}`, row.priority, src)
  );
  return blocks;
}

function extractS12(data) {
  const meta = normalizeUnmappedSection('actionPlan', 'clearpath-blueprint:s12');
  const blocks = [];
  const src = { inputs: ['clearpath-m7:actionPlan'], meta };
  num(blocks, 's12.nextStepCount', 'Next steps', (data?.nextSteps || []).length, 'count', src);
  num(blocks, 's12.professionalCount', 'Professionals', (data?.professionals || []).length, 'count', src);
  num(blocks, 's12.keyDateCount', 'Key dates', (data?.keyDates || []).length, 'count', src);
  (data?.nextSteps || []).forEach((s, i) => text(blocks, `s12.nextStep.${i}`, 'Next step', s.step, src));
  (data?.keyDates || []).forEach((d, i) => text(blocks, `s12.keyDate.${i}`, d.date, d.event, src));
  return blocks;
}

const SECTION_EXTRACTORS = {
  s1: extractS1,
  s2: extractS2,
  s3: extractS3,
  s4: extractS4,
  s5: extractS5,
  s6: extractS6,
  s7: extractS7,
  s8: extractS8,
  s9: extractS9,
  s10: extractS10,
  s11: extractS11,
  s12: extractS12,
};

// ── Carriers (D5: read explicitly, never dropped) ───────────────────────────

function extractDeferredCompStubs(stubs, ctx) {
  const blocks = [];
  for (const stub of stubs || []) {
    const meta = stub.resolved
      ? normalizeDcaStubMetadata(stub.metadata ?? null)
      : normalizeDcaStubMetadata(null);
    const src = { inputs: [`clearpath-blueprint:deferredCompStubs.${stub.id}`], meta };
    text(blocks, `carrier.dcs.${stub.id}.company`, 'Deferred comp — company', stub.company, src);
    text(blocks, `carrier.dcs.${stub.id}.category`, 'Deferred comp — category', stub.category, src);
    num(blocks, `carrier.dcs.${stub.id}.sharesGranted`, 'Shares granted', stub.sharesGranted, 'count', src);
    num(blocks, `carrier.dcs.${stub.id}.strikePrice`, 'Strike price', stub.strikePrice, 'currency_actual', src);
    if (stub.resolved && stub.metadata) {
      num(blocks, `carrier.dcs.${stub.id}.maritalShares.hug`, 'Marital shares — Hug', stub.metadata.maritalShares?.hug, 'count', src);
      num(blocks, `carrier.dcs.${stub.id}.maritalShares.nelson`, 'Marital shares — Nelson', stub.metadata.maritalShares?.nelson, 'count', src);
      num(blocks, `carrier.dcs.${stub.id}.intrinsicValue.hug`, 'Intrinsic value — Hug', stub.metadata.intrinsicValue?.hug, 'currency_projection', src);
      num(blocks, `carrier.dcs.${stub.id}.intrinsicValue.nelson`, 'Intrinsic value — Nelson', stub.metadata.intrinsicValue?.nelson, 'currency_projection', src);
      for (const t of stub.metadata.perTrancheFractions || []) {
        num(blocks, `carrier.dcs.${stub.id}.tranche.${t.id}.hug`, 'Tranche coverture — Hug', t.hug, 'fraction', src);
        num(blocks, `carrier.dcs.${stub.id}.tranche.${t.id}.nelson`, 'Tranche coverture — Nelson', t.nelson, 'fraction', src);
      }
      for (const dateKey of ['hireDate', 'grantDate', 'separationDate']) {
        ctx.appendix.push({ sectionId: 'carrier.deferredCompStubs', label: `DCA ${dateKey} (${stub.id})`, value: stub.metadata[dateKey] ?? null, source: `clearpath-blueprint:deferredCompStubs.${stub.id}.metadata.${dateKey}` });
      }
    }
  }
  return blocks;
}

function extractQdroBlueprintCarrier(qdroBlueprint) {
  const meta = normalizeUnmappedSection('qdroDecisionGuide', 'clearpath-blueprint:qdroBlueprint');
  const blocks = [];
  const proj = qdroBlueprint?.savedProjection;
  if (!proj) return blocks;
  const src = { inputs: ['clearpath-blueprint:qdroBlueprint.savedProjection'], meta };
  text(blocks, 'carrier.qdro.generatedAt', 'QDRO projection generated at', proj.generatedAt, src);
  (proj.assets || []).forEach((a) => {
    text(blocks, `carrier.qdro.${a.id}.planType`, 'QDRO projection — plan type', a.planType, src);
  });
  return blocks;
}

function extractCostBasisEntries(entries) {
  const blocks = [];
  for (const e of entries || []) {
    const meta = normalizeTavMetadata();
    const src = { inputs: [`clearpath-blueprint:costBasisEntries.${e.assetId}`], meta };
    num(blocks, `carrier.cbe.${e.assetId}.fmv`, 'FMV', e.fmv, 'currency_actual', src);
    num(blocks, `carrier.cbe.${e.assetId}.costBasis`, 'Cost basis', e.costBasis, 'currency_actual', src);
    num(blocks, `carrier.cbe.${e.assetId}.builtInGain`, 'Built-in gain', e.builtInGain, 'currency_projection', src);
    num(blocks, `carrier.cbe.${e.assetId}.estimatedTax`, 'Estimated hidden tax', e.estimatedTax, 'currency_projection', src);
    num(blocks, `carrier.cbe.${e.assetId}.taxAdjustedValue`, 'Tax-adjusted value', e.taxAdjustedValue, 'currency_projection', src);
  }
  return blocks;
}

// ── D-V2-7 appendix placeholders (engine-constant sweep = Phase 2) ──────────

const PHASE2_ASSUMPTION_PLACEHOLDERS = Object.freeze(
  [
    'Refi-rate credit bands (build-dated)',
    'PMI rate matrix',
    'DTI front/back-end thresholds',
    '50-state + DC closing-cost table',
    'Inflation assumption 2.5% (Fed long-run target)',
    '35% housing-affordability benchmark',
    'Realtor 5% / closing 2% / 50% interim-cost-share defaults',
    'Fisher real-rate convention',
    'Annuity-factor annual approximation (no Woolhouse; terminal age 120)',
    'Intrinsic-value-only equity valuation (never Black-Scholes)',
    'Business-interest LTCG-as-baseline caveat',
  ].map((label) => ({ label, status: 'phase2_engine_constant_sweep_pending' }))
);

/**
 * Build the intermediate document model from a blueprintStore snapshot.
 *
 * @param {object} state  blueprintStore state snapshot ({ sections, deferredCompStubs, qdroBlueprint, costBasisEntries, ... })
 * @param {object} opts   { jurisdiction } — REQUIRED, explicit (D-V2-8 deferral)
 */
export function buildDocumentModel(state, { jurisdiction } = {}) {
  if (!jurisdiction) {
    throw new Error(
      'buildDocumentModel requires an explicit jurisdiction (production wiring is the D-V2-8 Phase 4 design item)'
    );
  }
  const sections = state?.sections || {};
  const appendix = [];
  const ctx = { appendix };

  const modelSections = SECTION_ORDER.map((key) => {
    const included = isSectionIncluded(key, sections);
    const data = sections[key]?.data;
    const blocks = included && SECTION_EXTRACTORS[key] ? SECTION_EXTRACTORS[key](data || {}, ctx) : [];
    return { id: key, included, blocks };
  });

  const carriers = {
    deferredCompStubs: extractDeferredCompStubs(state?.deferredCompStubs, ctx),
    qdroBlueprint: extractQdroBlueprintCarrier(state?.qdroBlueprint),
    costBasisEntries: extractCostBasisEntries(state?.costBasisEntries),
  };

  return {
    jurisdiction,
    sections: modelSections,
    carriers,
    scopeDisclosure: {
      omittedSections: modelSections.filter((s) => !s.included).map((s) => s.id),
    },
    appendices: {
      inputsAndAssumptions: {
        entries: appendix,
        phase2Placeholders: [...PHASE2_ASSUMPTION_PLACEHOLDERS],
      },
      methodology: {
        roundingContractDisclosure: {
          slot: 'd_v2_5_rounding_contract',
          status: 'placeholder_phase2',
          summary:
            'Per value class, applied at render time only: actuals/affidavit figures to the cent; projections, PVs, scenario outputs to the whole dollar; rates/percentages to two decimals; coverture fractions to four decimals with months/months alongside.',
        },
        entries: [],
      },
      provenance: {
        methodologyAttribution: {
          slot: 'd_v2_4_provenance_page',
          status: 'placeholder_phase2',
          text: 'Methodologies developed by ClearPath, founded by Austin Fitzpatrick, CDFA®',
        },
      },
    },
  };
}
