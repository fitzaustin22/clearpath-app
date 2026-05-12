/**
 * Pre-population functions for the four M5 tools, matching the §6.5.7 cross-tool
 * convention: each takes `{ m1Store, m2Store, m3Store }` and returns the inputs
 * subset to merge into the corresponding `m5Store` slice, plus a `_prePopSources`
 * sibling per B5b-3 attribution pattern.
 *
 * Only `prePopulateSupportEstimatorInputs` ships full at §13 step 2 (per §6.5.7
 * locked literal). The other three tools' pre-pop wiring ships alongside their
 * implementations in §13 steps 4 / 5 / 7 — the empty-object stubs below are
 * intentional placeholders so callers don't need to null-check.
 */

const initialPartyDefaults = {
  grossMonthly: null,
  imputeIncome: false,
  imputedEarningCapacity: null,
  healthInsurance: 0,
  childcare: 0,
  parentingTimeNights: 0,
  otherSupportObligations: 0,
};

/**
 * Support Estimator pre-pop per §6.5.7.
 * Per F-2: Party A gross sourced only from m3.payStubDecoder; no m1 fallback.
 *
 * @param {{m1Store: any, m2Store: any, m3Store: any}} stores
 * @returns {{inputs: object, _prePopSources: object}}
 */
export function prePopulateSupportEstimatorInputs({ m1Store, m2Store, m3Store }) {
  void m1Store;
  void m2Store;
  const partyAGross = m3Store?.payStubDecoder?.results?.grossMonthlyIncome ?? null;

  return {
    inputs: {
      partyA: {
        ...initialPartyDefaults,
        grossMonthly: partyAGross,
      },
      partyB: { ...initialPartyDefaults },
      numChildren: 0,
      state: 'OTHER',
      marriageLengthYears: null,
      nyCustodyConfig: null,
      temporal: 'post_divorce',
      depth: 'standard',
      caseEffectiveDate: null,
      fullWorksheet: null,
    },
    _prePopSources: {
      'partyA.grossMonthly':
        partyAGross !== null
          ? { source: 'm3.payStubDecoder', timestamp: new Date().toISOString() }
          : null,
    },
  };
}

// TODO §13 step 5 (PVA implementation) — fill per PVA pre-pop pattern.
// Empty stub at step 2; caller in §13 step 5 will replace.
export function prePopulatePVAInputs(_) {
  return {};
}

// TODO §13 step 4 (QDG implementation) — fill per §8.10.7 (M2 two-category pre-pop).
export function prePopulateQDROInputs(_) {
  return {};
}

// TODO §13 step 7 (HDA implementation) — fill per §10.7 (m1+m2+m3+M4 sources).
export function prePopulateHomeDecisionInputs(_) {
  return {};
}
