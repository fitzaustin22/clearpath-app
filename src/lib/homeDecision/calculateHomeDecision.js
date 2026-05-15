// src/lib/homeDecision/calculateHomeDecision.js
//
// Top-level orchestrator for HDA per M5-Tool-Specs.md §9.4.1.
// Fans to three per-scenario engines and assembles the comparator artifact
// + forward-compat metadata block (per §9.10 / §14.1).

import {
  calculateKeepAndRefi,
  calculateSellNow,
  calculateDeferredSale,
} from './projectionEngine';
import { V1_ASSUMPTIONS } from './homeDecisionConstants';

/**
 * Orchestrates the three scenario engines and returns the comparator artifact.
 *
 * @param {Object} inputs - shared + per-scenario inputs (per §9.3)
 * @param {Object} [options]
 * @param {boolean} [options.stressTest=false] - flows to calculateDeferredSale only per §9.4.5
 * @returns {{
 *   scenarios: { keepAndRefi: Object, sellNow: Object, deferredSale: Object },
 *   metadata: Object
 * }}
 */
export function calculateHomeDecision(inputs, { stressTest = false } = {}) {
  const keepAndRefi = calculateKeepAndRefi(inputs);
  const sellNow = calculateSellNow(inputs);
  const deferredSale = calculateDeferredSale(inputs, { stressTest });

  return {
    scenarios: { keepAndRefi, sellNow, deferredSale },
    metadata: buildMetadata(inputs, { keepAndRefi, sellNow, deferredSale }),
  };
}

/**
 * Assembles the HomeDecisionMetadata block per §14.1. Single object per HDA
 * run, with scenario-specific fields optional/nullable where the scenario
 * doesn't apply.
 */
function buildMetadata(inputs, { keepAndRefi, sellNow, deferredSale }) {
  const horizonsTriple = (scenario) => ({
    year3: scenario.horizons[0].liquidCash,
    year6: scenario.horizons[1].liquidCash,
    year10: scenario.horizons[2].liquidCash,
  });

  const accumulatedCashflowTriple = (scenario) => {
    // For Sell-now (homeEquity=0 + no post-sale cashflow), accumulatedCashflow=0
    // For Keep & refi, accumulated = liquidCash − startingLiquidCash
    // For Deferred sale pre-sale, similar; post-sale includes saleProceedsNet
    const starting = inputs.startingLiquidCash ?? 0;
    return {
      year3: scenario.horizons[0].liquidCash - starting,
      year6: scenario.horizons[1].liquidCash - starting,
      year10: scenario.horizons[2].liquidCash - starting,
    };
  };

  return {
    // ── Theme A: Scenario economics inputs ──
    expectedFilingStatusAtSellNow: inputs.expectedFilingStatusAtSellNow,
    realtorCommissionPercent: inputs.realtorCommissionPercent ?? 0.05,
    saleClosingCostsPercent: inputs.saleClosingCostsPercent ?? 0.02,
    propertyAppreciationRateReal: inputs.propertyAppreciationRateReal ?? 0,
    deferredSaleMortgageContinuity:
      inputs.deferredSaleMortgageContinuity ?? 'refi-at-current',
    interimCostSharePct: inputs.interimCostSharePct ?? 0.5,
    stressTestUserPays100Pct: deferredSale.metadata.stressTest,
    startingLiquidCash: inputs.startingLiquidCash ?? 0,
    existingMortgageRemainingTermMonths:
      inputs.existingMortgageRemainingTermMonths ?? 360,

    // ── Theme B: §121 inputs and computed ──
    homeAcquisitionYear: inputs.homeAcquisitionYear,
    ownershipYearsAtSale: deferredSale.metadata.ownershipYearsAtSale,
    userMovedOutYearsAgo: inputs.userMovedOutYearsAgo ?? 0,
    mfjSingleDifferentialAtSaleYear:
      deferredSale.metadata.mfjSingleDifferentialAtSaleYear,

    // ── Theme C: Refi qualification per scenario (Keep & refi only) ──
    verdictTier: keepAndRefi.metadata.verdictTier,
    bindingConstraint: keepAndRefi.metadata.bindingConstraint,
    refiRateProvenance: inputs.refiRateProvenance,
    refiRate: inputs.refiRate,
    closingCostsSource: inputs.closingCostsSource,
    ltvAtRefi: keepAndRefi.metadata.ltvAtRefi,
    pmiRatePercent: keepAndRefi.metadata.pmiRatePercent,
    projectedPmiDropYear: keepAndRefi.metadata.projectedPmiDropYear,

    // ── Theme D: Output and selection ──
    liquidCashComponents: {
      startingLiquidCash: inputs.startingLiquidCash ?? 0,
      saleProceedsNet: {
        year3: sellNow.metadata.saleProceedsNet,
        year6: sellNow.metadata.saleProceedsNet,
        year10: sellNow.metadata.saleProceedsNet,
      },
      accumulatedCashflow: accumulatedCashflowTriple(keepAndRefi),
    },
    userSelection: null,
    selectionTimestamp: null,

    // ── Locked v1 assumptions ──
    bpmiAssumption: V1_ASSUMPTIONS.bpmiAssumption,
    conventionalLoanAssumption: V1_ASSUMPTIONS.conventionalLoanAssumption,
    realDollarConvention: V1_ASSUMPTIONS.realDollarConvention,

    // ── Cross-tool pre-pop attribution (HDA PR 2 wires this) ──
    _prePopSources: {},
  };
}
