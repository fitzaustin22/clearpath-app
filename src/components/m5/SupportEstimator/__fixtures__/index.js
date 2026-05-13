/**
 * ResultsPanel fixtures — 7 hero states + library showcase.
 * Each fixture is shaped to the locked data contract per §6.5.2.
 * Used for dev-route visual iteration only; not imported by production code.
 */

const stepResolveConstants = (state, asOf) => ({
  step: 0, stepId: 'step_0_resolve_constants',
  label: 'Resolve statutory constants',
  computation: `Load ${state} guideline table & constants effective ${asOf}`,
  result: null,
});

const stepComputeSpousal = (label, expr, value) => ({
  step: 1, stepId: 'step_1_compute_spousal',
  label, computation: expr, result: value,
});

const stepApplySSR = (expr, value) => ({
  step: 1.1, stepId: 'step_1b_apply_ssr',
  label: 'Apply NY Self-Support Reserve floor',
  computation: expr, result: value,
});

const stepAboveCapFlag = (expr) => ({
  step: 1.2, stepId: 'step_1c_above_cap_flag',
  label: 'Flag income above NY statutory cap',
  computation: expr, result: null,
});

const stepAlimonyFirst = () => ({
  step: 2, stepId: 'step_2_alimony_first_ordering',
  label: 'Alimony-first ordering',
  computation: 'Reduce payor gross by computed alimony before child support pass',
  result: null,
});

const stepComputeChild = (label, expr, value) => ({
  step: 3, stepId: 'step_3_compute_child_support',
  label, computation: expr, result: value,
});

const stepProRate = (expr, value) => ({
  step: 3.1, stepId: 'step_3a_pro_rate_to_non_custodial',
  label: 'Pro-rate basic obligation to non-custodial parent',
  computation: expr, result: value,
});

const stepDuration = (expr, value) => ({
  step: 4, stepId: 'step_4_compute_duration',
  label: 'Compute support duration',
  computation: expr, result: value,
});

const stepCombine = (a, b, v) => ({
  step: 5, stepId: 'step_5_combine',
  label: 'Combine monthly support',
  computation: `Child $${a.toLocaleString()} + Spousal $${b.toLocaleString()}`,
  result: v,
});

export const numericVA = {
  combinedMonthly: 1842,
  childMonthly: 1026,
  spousalMonthly: 816,
  metadata: {
    state: 'VA', temporal: 'post_divorce', depth: 'standard',
    imputationApplied: { partyA: false, partyB: false },
    asOfDateForStatutoryConstants: '2026-01-01',
    parties: { a: { name: 'Party A', gross: 8400 }, b: { name: 'Party B', gross: 3200 } },
  },
  breakdown: {
    callouts: [
      { type: 'factor_test_approximation', state: 'VA' },
      { type: 'tcja_tax_note' },
      { type: 'liability_disclaimer' },
    ],
    perStepNarrative: [
      stepResolveConstants('VA', 'Jan 1, 2026'),
      stepComputeChild(
        'Compute basic child-support obligation',
        'VA Schedule lookup @ combined $11,600/mo, 2 children → $1,704/mo',
        1704
      ),
      stepProRate('$1,704 × (8,400 ÷ 11,600 combined) − 0 overnights credit', 1026),
      stepComputeSpousal(
        'Approximate spousal support (factor-driven post-divorce)',
        'No statutory formula — national approximation from comparable cases',
        816
      ),
      stepCombine(1026, 816, 1842),
    ],
  },
};

export const factorTestZero = {
  combinedMonthly: 0,
  childMonthly: 0,
  spousalMonthly: 0,
  metadata: {
    state: 'VA', temporal: 'post_divorce', depth: 'standard',
    imputationApplied: { partyA: false, partyB: false },
    asOfDateForStatutoryConstants: '2026-01-01',
    parties: { a: { name: 'Party A', gross: 8400 }, b: { name: 'Party B', gross: 3200 } },
  },
  breakdown: {
    callouts: [
      { type: 'factor_test_approximation', state: 'VA' },
      { type: 'tcja_tax_note' },
      { type: 'liability_disclaimer' },
    ],
    perStepNarrative: [
      stepResolveConstants('VA', 'Jan 1, 2026'),
      stepComputeSpousal('Spousal support — factor test', 'No statutory formula (Va. Code §20-107.1)', 0),
      stepCombine(0, 0, 0),
    ],
  },
};

export const capHitNY = {
  combinedMonthly: 5414,
  childMonthly: 3142,
  spousalMonthly: 2272,
  metadata: {
    state: 'NY', temporal: 'post_divorce', depth: 'full_worksheet',
    imputationApplied: { partyA: false, partyB: false },
    asOfDateForStatutoryConstants: '2026-03-01',
    parties: { a: { name: 'Party A', gross: 24000 }, b: { name: 'Party B', gross: 6000 } },
  },
  breakdown: {
    callouts: [
      { type: 'ny_child_support_above_cap_discretionary' },
      { type: 'state_specific_educational', state: 'NY' },
      { type: 'tcja_tax_note' },
      { type: 'liability_disclaimer' },
    ],
    perStepNarrative: [
      stepResolveConstants('NY', 'Mar 1, 2026'),
      stepComputeSpousal(
        'NY Formula A (no children) — 30% payor − 20% payee',
        '(0.30 × $24,000) − (0.20 × $6,000) = $5,400',
        2272
      ),
      stepApplySSR('Floor satisfied — payee net retains > 135% of poverty guideline', 2272),
      stepAboveCapFlag('Combined parental income $360,000/yr > NY cap $193,000/yr'),
      stepAlimonyFirst(),
      stepComputeChild('NY 25% × combined parental income, 2 children, capped', 'Capped at $193K combined', 4023),
      stepProRate('$4,023 × (Party A pro-rata share 78.1%)', 3142),
      stepDuration('Marriage 16 yrs → advisory schedule 30%–40% of marriage length', null),
      stepCombine(3142, 2272, 5414),
    ],
  },
};

export const genericFallback = {
  combinedMonthly: 947,
  childMonthly: 947,
  spousalMonthly: 0,
  metadata: {
    state: 'OTHER', temporal: 'post_divorce', depth: 'standard',
    imputationApplied: { partyA: false, partyB: false },
    asOfDateForStatutoryConstants: '2026-01-01',
    parties: { a: { name: 'Party A', gross: 7200 }, b: { name: 'Party B', gross: 2800 } },
    stateName: 'Texas',
  },
  breakdown: {
    callouts: [
      { type: 'generic_fallback_disclaimer', stateName: 'Texas' },
      { type: 'factor_test_approximation', state: 'OTHER' },
      { type: 'liability_disclaimer' },
    ],
    perStepNarrative: [
      stepResolveConstants('national HHS/OCSE income-shares', 'Jan 1, 2026'),
      stepComputeChild(
        'HHS/OCSE income-shares basic obligation',
        'Combined $10,000/mo × 18.5% (2 children, national mean) = $1,850',
        1850
      ),
      stepProRate('$1,850 × (7,200 ÷ 10,000) − overnights adj', 947),
      stepCombine(947, 0, 947),
    ],
  },
};

export const highEarnerCustodial = {
  combinedMonthly: 3140,
  childMonthly: null,
  spousalMonthly: 3140,
  metadata: {
    state: 'NY', temporal: 'post_divorce', depth: 'full_worksheet',
    imputationApplied: { partyA: false, partyB: false },
    asOfDateForStatutoryConstants: '2026-03-01',
    parties: { a: { name: 'Party A', gross: 18000, custodial: true }, b: { name: 'Party B', gross: 4200 } },
    reverseChildFlow: true,
  },
  breakdown: {
    callouts: [
      { type: 'bidirectional_flow_disclosure', state: 'New York' },
      { type: 'state_specific_educational', state: 'NY' },
      { type: 'tcja_tax_note' },
      { type: 'liability_disclaimer' },
    ],
    perStepNarrative: [
      stepResolveConstants('NY', 'Mar 1, 2026'),
      stepComputeSpousal(
        'NY Formula B (with children) — 25% payor − 25% payee',
        '(0.25 × $18,000) − (0.25 × $4,200) = $3,450',
        3140
      ),
      stepApplySSR('Floor satisfied', 3140),
      stepAlimonyFirst(),
      stepComputeChild('Reverse-flow child support not computed in v1', '—', null),
      stepCombine(0, 3140, 3140),
    ],
  },
};

export const prePopBadge = {
  ...numericVA,
  metadata: {
    ...numericVA.metadata,
    prePopSources: { partyA: 'Pay Stub Decoder', partyB: null },
  },
};

export const placeholder = null;

export const libraryShowcase = {
  combinedMonthly: 4218,
  childMonthly: 2104,
  spousalMonthly: 2114,
  metadata: {
    state: 'MD', temporal: 'post_divorce', depth: 'full_worksheet',
    imputationApplied: { partyA: false, partyB: false },
    asOfDateForStatutoryConstants: '2026-01-01',
    parties: { a: { name: 'Party A', gross: 14000 }, b: { name: 'Party B', gross: 4400 } },
  },
  breakdown: { callouts: [], perStepNarrative: [] },
};

export const SE_FIXTURES = {
  numericVA, factorTestZero, capHitNY, genericFallback,
  highEarnerCustodial, prePopBadge, placeholder, libraryShowcase,
};
