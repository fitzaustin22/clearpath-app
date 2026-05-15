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

/**
 * Home Decision Analyzer pre-pop per spec §10.7.
 *
 * m2 inventory category-key mapping (from src/lib/m2Sections.js ASSET_SECTIONS):
 *   §10.7 "realEstate"      → item.category === 'realEstate'
 *   §10.7 "cash+brokerage"  → item.category === 'workingCapital'
 *     (workingCapital covers cash, checking, savings, money-market, CDs, mutual funds,
 *      individual stocks/bonds — i.e. all liquid non-retirement assets in a single category)
 *   §10.7 "retirement" (EXCLUDED per Q-16/§9.4.4) → item.category === 'retirement'
 *     (IRA, Roth IRA, 401k/403b/457, TSP — these must NOT be summed into startingLiquidCash)
 *
 * m3 fallback chain for home/insurance fields (§10.7):
 *   projected → current → omit (0 treated as empty per §10.7)
 *
 * userState: M4 FSO userState write target not yet implemented — §10.7 row is a
 * no-op until M4 adds it. Always omitted from inputs; _prePopSources.userState = null.
 *
 * @param {{m1Store: any, m2Store: any, m3Store: any, blueprintStore: any}} stores
 * @returns {{inputs: object, _prePopSources: object}}
 */
export function prePopulateHomeDecisionInputs({ m1Store, m2Store, m3Store, blueprintStore }) {
  const now = () => new Date().toISOString();
  const inputs = {};
  const sources = {};

  // ── M1: userPostDivorceGrossMonthlyIncome ──────────────────────────────────
  const adjustedMonthlyIncome = m1Store?.budgetGap?.results?.adjustedMonthlyIncome ?? null;
  if (adjustedMonthlyIncome !== null) {
    inputs.userPostDivorceGrossMonthlyIncome = adjustedMonthlyIncome;
    sources.userPostDivorceGrossMonthlyIncome = { source: 'm1.budgetGap', timestamp: now() };
  } else {
    sources.userPostDivorceGrossMonthlyIncome = null;
  }

  // ── M2: existingMortgageBalance (first realEstate item) ───────────────────
  const estateItems = m2Store?.maritalEstateInventory?.items ?? [];
  const homeItem = estateItems.find((i) => i.category === 'realEstate');
  if (homeItem != null) {
    inputs.existingMortgageBalance = homeItem.outstandingBalance ?? null;
    sources.existingMortgageBalance = { source: 'm2.maritalEstateInventory', timestamp: now() };
  } else {
    sources.existingMortgageBalance = null;
  }

  // ── M2: startingLiquidCash (SUM workingCapital items; EXCLUDE retirement) ─
  // §10.7 "cash+brokerage" intent → workingCapital category (liquid non-retirement).
  // retirement category excluded per Q-16/§9.4.4 (mandatory exclusion).
  const liquidItems = estateItems.filter((i) => i.category === 'workingCapital');
  if (liquidItems.length > 0) {
    const liquidSum = liquidItems.reduce((sum, i) => sum + (Number(i.currentValue) || 0), 0);
    inputs.startingLiquidCash = liquidSum;
    sources.startingLiquidCash = { source: 'm2.maritalEstateInventory', timestamp: now() };
  } else {
    sources.startingLiquidCash = null;
  }

  // ── M3: m3 fallback helper (projected → current → omit) ──────────────────
  // 0 is treated as "empty" per §10.7; fall back to current when projected is 0/null/undefined.
  function resolveM3Field(projectedVal, currentVal, projectedSource, currentSource) {
    if (projectedVal != null && projectedVal !== 0) {
      return { value: projectedVal, source: projectedSource };
    }
    if (currentVal != null && currentVal !== 0) {
      return { value: currentVal, source: currentSource };
    }
    return null; // omit field entirely
  }

  const budgetModeler = m3Store?.budgetModeler;

  // monthlyPropertyTax
  const propertyTaxResolved = resolveM3Field(
    budgetModeler?.projected?.home?.propertyTaxes,
    budgetModeler?.current?.home?.propertyTaxes,
    'm3.budgetModeler.projected',
    'm3.budgetModeler.current'
  );
  if (propertyTaxResolved !== null) {
    inputs.monthlyPropertyTax = propertyTaxResolved.value;
    sources.monthlyPropertyTax = { source: propertyTaxResolved.source, timestamp: now() };
  } else {
    sources.monthlyPropertyTax = null;
  }

  // monthlyHOA
  const hoaResolved = resolveM3Field(
    budgetModeler?.projected?.home?.hoaFees,
    budgetModeler?.current?.home?.hoaFees,
    'm3.budgetModeler.projected',
    'm3.budgetModeler.current'
  );
  if (hoaResolved !== null) {
    inputs.monthlyHOA = hoaResolved.value;
    sources.monthlyHOA = { source: hoaResolved.source, timestamp: now() };
  } else {
    sources.monthlyHOA = null;
  }

  // monthlyInsurance (NB: insurance is its own category, NOT under home)
  const insuranceResolved = resolveM3Field(
    budgetModeler?.projected?.insurance?.home,
    budgetModeler?.current?.insurance?.home,
    'm3.budgetModeler.projected',
    'm3.budgetModeler.current'
  );
  if (insuranceResolved !== null) {
    inputs.monthlyInsurance = insuranceResolved.value;
    sources.monthlyInsurance = { source: insuranceResolved.source, timestamp: now() };
  } else {
    sources.monthlyInsurance = null;
  }

  // ── M4 FSO: userState — no write target at v1; always a no-op ─────────────
  // M4 FSO userState write target not yet implemented — §10.7 row is a no-op
  // until M4 adds it. inputs.userState is never set here.
  sources.userState = null;

  // ── M4 Blueprint: expectedFilingStatusAtSellNow ───────────────────────────
  const filingStatus = blueprintStore?.costBasisFilingStatus ?? null;
  if (filingStatus !== null) {
    inputs.expectedFilingStatusAtSellNow = filingStatus;
    sources.expectedFilingStatusAtSellNow = { source: 'm4.blueprintStore', timestamp: now() };
  } else {
    sources.expectedFilingStatusAtSellNow = null;
  }

  return {
    inputs,
    _prePopSources: sources,
  };
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
