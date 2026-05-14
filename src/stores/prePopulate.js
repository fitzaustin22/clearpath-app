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

/**
 * Pre-populate PVA inputs from an M2 pension claim per spec §7.10.3.
 *
 * Return-shape union:
 *   - `null` — no claim found at assetId (caller should not have invoked PVA).
 *   - `{ error: 'in_pay_data_incomplete', missingFields, path: null }` —
 *     R3 routing data-completeness guard per [R5b-8]: accrualStatus is
 *     'in_pay_status' but monthlyBenefit and/or benefitStartDate are missing.
 *     PVA must NOT enter the in-pay path; orchestrator surfaces validation to UI.
 *     (§7.10.3 spec slice puts the guard at "caller must verify"; we centralize
 *     it inside prePopulatePVAInputs for unit-testability — orchestrator becomes
 *     a thin consumer of the return-union. Queued as spec-amendment item.)
 *   - Normal pre-pop result with `{ path, inputs, _prePopSources, _legacyCurrentValueDetected,
 *     _legacyValue, _frozenRoutingApplied }` per §7.10.3.
 *
 * Path selection:
 *   - accrualStatus === 'in_pay_status' → path = 'in_pay_status' (pre-pops
 *     monthlyBenefit + benefitStartDate from claim).
 *   - accrualStatus === 'frozen'         → path = 'tier_1' default
 *     (UI hides Tier 3 option for frozen plans); _frozenRoutingApplied = true.
 *   - accrualStatus === 'accruing' OR absent → path = 'tier_3' default
 *     (user may override to Tier 1/2 in UI).
 *
 * Legacy detection per [R5b-5]: pre-M2-TICKET-3 entries have currentValue set
 * but no accrualStatus. Flagged via `_legacyCurrentValueDetected = true` and
 * `_legacyValue` carries the legacy currentValue forward. The calc engine
 * router surfaces `legacy_currentvalue_ignored` callout via STEP CP.4.
 *
 * m1Store/m3Store unused at v1 (deferred per P-7a); accepted for §6.5.7 cross-tool
 * signature symmetry.
 *
 * @param {{m1Store: any, m2Store: any, m3Store: any, assetId: string}} args
 * @returns {object | null}
 */
export function prePopulatePVAInputs({ m1Store, m2Store, m3Store, assetId }) {
  void m1Store;
  void m3Store;

  const claim = m2Store?.maritalEstateInventory?.items?.find(
    (i) => i.id === assetId && i.category === 'pensions'
  );
  if (!claim) return null;

  // R3 routing data-completeness guard per [R5b-8]
  if (claim.accrualStatus === 'in_pay_status') {
    const missingFields = [];
    if (claim.monthlyBenefit == null) missingFields.push('monthlyBenefit');
    if (claim.benefitStartDate == null) missingFields.push('benefitStartDate');
    if (missingFields.length > 0) {
      return {
        error: 'in_pay_data_incomplete',
        missingFields,
        path: null,
      };
    }
  }

  // Legacy currentValue detection per [R5b-5]: fires only when accrualStatus
  // is absent (a hallmark of pre-M2-TICKET-3 entries).
  const hasLegacyCurrentValue = claim.currentValue != null && claim.accrualStatus == null;

  const now = () => new Date().toISOString();
  const baseInputs = {
    planName: claim.planName,
    whoseplan: claim.whoseplan,
  };
  const baseProvenance = {
    planName: { source: 'm2.pensionClaim', timestamp: now() },
    whoseplan: { source: 'm2.pensionClaim', timestamp: now() },
  };

  if (claim.accrualStatus === 'in_pay_status') {
    return {
      path: 'in_pay_status',
      inputs: {
        ...baseInputs,
        monthlyBenefit: claim.monthlyBenefit,
        benefitStartDate: claim.benefitStartDate,
      },
      _prePopSources: {
        ...baseProvenance,
        monthlyBenefit: { source: 'm2.pensionClaim', timestamp: now() },
        benefitStartDate: { source: 'm2.pensionClaim', timestamp: now() },
      },
      _legacyCurrentValueDetected: hasLegacyCurrentValue,
      _legacyValue: hasLegacyCurrentValue ? claim.currentValue : null,
    };
  }

  if (claim.accrualStatus === 'frozen') {
    return {
      path: 'tier_1',
      inputs: { ...baseInputs },
      _prePopSources: { ...baseProvenance },
      _legacyCurrentValueDetected: hasLegacyCurrentValue,
      _legacyValue: hasLegacyCurrentValue ? claim.currentValue : null,
      _frozenRoutingApplied: true,
    };
  }

  // accruing OR legacy entry without accrualStatus → tier_3 default
  return {
    path: 'tier_3',
    inputs: { ...baseInputs },
    _prePopSources: { ...baseProvenance },
    _legacyCurrentValueDetected: hasLegacyCurrentValue,
    _legacyValue: hasLegacyCurrentValue ? claim.currentValue : null,
    _frozenRoutingApplied: false,
  };
}

// TODO §13 step 4 (QDG implementation) — fill per §8.10.7 (M2 two-category pre-pop).
export function prePopulateQDROInputs(_) {
  return {};
}

// TODO §13 step 7 (HDA implementation) — fill per §10.7 (m1+m2+m3+M4 sources).
export function prePopulateHomeDecisionInputs(_) {
  return {};
}

/**
 * Support Estimator — fresh-default detector. Gates one-time pre-pop on first
 * tool entry per §6.2. Returns true when inputs match post-init default state
 * across primary fields.
 *
 * "Fresh default" = grossMonthly null both parties, numChildren 0, state OTHER,
 * marriageLengthYears null, temporal post_divorce, depth standard.
 *
 * Imputation toggles, add-ons (HI/childcare/etc.), and nyCustodyConfig are NOT
 * checked — those default to 0/null at init and the pre-pop function doesn't
 * source them, so a user setting them before partyA.grossMonthly is exotic
 * enough that we ignore it for v1.
 */
export function isInputsFreshDefault(inputs) {
  if (!inputs) return false;
  return (
    inputs.partyA?.grossMonthly === null &&
    inputs.partyB?.grossMonthly === null &&
    inputs.numChildren === 0 &&
    inputs.state === 'OTHER' &&
    inputs.marriageLengthYears === null &&
    inputs.temporal === 'post_divorce' &&
    inputs.depth === 'standard'
  );
}

/**
 * Clears the _prePopSources entry for a given field path. Called when the user
 * overrides a pre-popped value — the badge stops surfacing for that field per
 * §6.5.7. Immutable — returns a new object; does not mutate input.
 *
 * Usage: clearPrePopSource(_prePopSources, 'partyA.grossMonthly')
 */
export function clearPrePopSource(prePopSources, fieldPath) {
  if (!prePopSources || !(fieldPath in prePopSources)) return prePopSources;
  const next = { ...prePopSources };
  delete next[fieldPath];
  return next;
}
