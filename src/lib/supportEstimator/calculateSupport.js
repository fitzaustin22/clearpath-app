/**
 * Support Estimator — top-level entry point per M5-Tool-Specs.md §6.3.1.
 *
 * Resolves asOfDate (STEP 0), derives payor/payee + custodial parent (STEP 0b),
 * routes to the per-state path module, then assembles the §6.5.2 results shape.
 * Per-state paths handle their distinctive STEP 1-5 mechanics; this entry point
 * is purely orchestration + result assembly.
 *
 * @see src/lib/supportEstimator/paths/ for per-state implementations
 */

import { computeVA } from './paths/va.js';
import { computeMD } from './paths/md.js';
import { computeDC } from './paths/dc.js';
import { computeNY } from './paths/ny.js';
import { computeCA } from './paths/ca.js';
import { computeGeneric } from './paths/generic.js';

function deriveGross(party) {
  return party.imputeIncome ? party.imputedEarningCapacity : party.grossMonthly;
}

function deriveCustodialIsPartyA(inputs, payorIsPartyA) {
  const { state, nyCustodyConfig, partyA, partyB } = inputs;
  if (state === 'NY' && nyCustodyConfig) {
    // 'kids_with_payee'  → custodial = payee
    // 'kids_with_payor'  → custodial = payor (Formula B, S5a-2 suppression)
    // 'shared'           → Formula B (v1 conservative per §6.3.2 B3) → custodial = payor
    if (nyCustodyConfig === 'kids_with_payor' || nyCustodyConfig === 'shared') {
      return payorIsPartyA;
    }
    return !payorIsPartyA; // kids_with_payee
  }
  if (partyA.parentingTimeNights > partyB.parentingTimeNights) return true;
  if (partyA.parentingTimeNights < partyB.parentingTimeNights) return false;
  return true; // tie → partyA
}

export function calculateSupport(inputs) {
  // STEP 0 — Resolve asOfDate for all statutory constant lookups.
  const asOfDate = inputs.caseEffectiveDate
    ? new Date(inputs.caseEffectiveDate)
    : new Date();

  // STEP 0b — Derive payor/payee + custodial parent.
  const { partyA, partyB } = inputs;
  const aGross = deriveGross(partyA);
  const bGross = deriveGross(partyB);
  const payor_raw = Math.max(aGross, bGross);
  const payee_raw = Math.min(aGross, bGross);
  const payorIsPartyA = aGross >= bGross;
  const custodialIsPartyA = deriveCustodialIsPartyA(inputs, payorIsPartyA);
  const highEarnerIsCustodial = payorIsPartyA === custodialIsPartyA;

  // STEP 0c — Initialize accumulators + always-present STEP 0 narrative entry.
  const callouts = [];
  const perStepNarrative = [
    {
      step: 0,
      stepId: 'step_0_resolve_constants',
      label: 'Resolve constants',
      computation: `asOfDate = ${asOfDate.toISOString()}`,
      result: null,
    },
  ];

  const ctx = {
    inputs,
    payor_raw,
    payee_raw,
    payorIsPartyA,
    highEarnerIsCustodial,
    asOfDate,
    callouts,
    perStepNarrative,
  };

  let pathResult;
  switch (inputs.state) {
    case 'VA': pathResult = computeVA(ctx); break;
    case 'MD': pathResult = computeMD(ctx); break;
    case 'DC': pathResult = computeDC(ctx); break;
    case 'NY': pathResult = computeNY(ctx); break;
    case 'CA': pathResult = computeCA(ctx); break;
    case 'OTHER': pathResult = computeGeneric(ctx); break;
    default:
      throw new Error(`calculateSupport: unsupported state "${inputs.state}"`);
  }

  const calculationTimestamp = new Date().toISOString();
  return {
    combinedMonthly: pathResult.childMonthly + pathResult.spousalMonthly,
    childMonthly: pathResult.childMonthly,
    spousalMonthly: pathResult.spousalMonthly,
    spousalCalc: pathResult.spousalCalc,
    childCalc: pathResult.childCalc,
    alimonyFirstOrderingApplied: pathResult.alimonyFirstOrderingApplied,
    adjustedIncomes: pathResult.adjustedIncomes,
    breakdown: { callouts, perStepNarrative },
    metadata: {
      formulaId: pathResult.spousalCalc.formulaUsed,
      state: inputs.state,
      temporal: inputs.temporal,
      depth: inputs.depth,
      imputationApplied: {
        partyA: partyA.imputeIncome,
        partyB: partyB.imputeIncome,
      },
      citations: pathResult.citations ?? [],
      calculationTimestamp,
      asOfDateForStatutoryConstants: asOfDate.toISOString(),
    },
  };
}

export default calculateSupport;
