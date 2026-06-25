// Module 3 "Know What You Spend" landing content — the static half of the
// ModuleLanding contract. Unlike M2 (a byte-identical refactor), this is M3's
// first move to the Primary layout, so some copy is intentionally new:
//   - VERBATIM from the prior M3ModulePage: the headline text, the lead, and each
//     worksheet's title / description / route.
//   - NET-NEW for the Primary layout (the old page had no slot for these), drafted
//     and approved 2026-06-25: the eyebrow, the gold accent word, the readiness
//     callout copy + pills (the old page's dynamic M1-gap callouts and DataFlow
//     callout are folded into this static callout, mirroring M2's simplification),
//     the per-card step labels, the not-started CTA verbs, and the upgrade promo.
// The dynamic half (per-worksheet progress) comes from m3Landing.adapter.

/** @type {import('@/src/components/module-landing/types').ModuleLandingConfig} */
export const M3_LANDING = {
  module: 'm3',
  eyebrow: 'Module 03 · Your Tools',
  headline: { text: 'Know What You Spend', goldWord: 'Spend' },
  lead:
    'Understand your income, track your expenses, and prepare the financial data your attorney needs.',
  readiness: {
    copy:
      'Your readiness assessment flagged income and spending awareness as areas to strengthen — exactly ' +
      'what Module 3 closes. These tools build on each other: start with the Pay Stub Decoder and work down.',
    // Static for v1 (mirrors M2). The real per-user weak domains live in
    // m1Store.readinessAssessment.results.domainScores (incomeAwareness /
    // debtAwareness) and can drive these later — the old page rendered them as
    // dynamic dismissable callouts.
    pills: ['Income Awareness', 'Spending Awareness', 'Debt Awareness'],
  },
  worksheets: [
    {
      id: 'payStubDecoder',
      stepLabel: 'Step 1 · Decode your pay stub',
      title: 'Pay Stub Decoder',
      description:
        'Learn to read your pay stub correctly — pay frequency, deductions, and take-home pay.',
      route: '/modules/m3/pay-stub',
      ctaCopy: 'Start decoder',
    },
    {
      id: 'budgetModeler',
      stepLabel: 'Step 2 · Model your budget',
      title: 'Budget Modeler',
      description:
        'Compare your current household expenses to what life will cost on your own.',
      route: '/modules/m3/budget',
      ctaCopy: 'Start modeler',
    },
    {
      id: 'affidavitBuilder',
      stepLabel: 'Step 3 · Build your affidavit',
      title: 'Financial Affidavit Builder',
      description:
        'Organize your income, expenses, assets, and liabilities in the format your attorney needs.',
      route: '/modules/m3/affidavit',
      ctaCopy: 'Start affidavit',
    },
  ],
  // Mirror M2: the gate is the Full Access (navigator) upsell, shown to free +
  // essentials. M3's worksheets stay accessible at any tier — this only governs
  // the promo card. Full Access = navigator (and legacy signature).
  tierGate: 'navigator',
  upgrade: {
    headline: 'Unlock AI-guided budgeting.',
    body:
      'You already have all three worksheets. Upgrade for guided expense modeling, affidavit prep, and ' +
      'education across the whole module.',
    ctaCopy: 'Learn about Full Access',
  },
  links: {
    dashboard: '/dashboard',
    blueprint: '/blueprint',
    upgrade: '/upgrade',
  },
};
