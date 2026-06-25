// Module 4 "Tax Landscape" landing content — the static half of the ModuleLanding
// contract. M4 is the FIRST wholesale-gated consumer: every worksheet is `gated`, so
// free/essentials users see the whole module as a Full-Access preview (Option C
// locked cards + sidebar upsell), while navigator/signature users get real status.
// As with M3 (the second Primary-layout migration), some copy is intentionally new:
//   - VERBATIM from the prior M4ModulePage TOOLS array: each worksheet's title /
//     description / route. (The bare module title "Tax Landscape" is lifted from the
//     old h1 "Module 4: Tax Landscape".)
//   - NET-NEW for the Primary layout (the old card-grid page had no slot for these),
//     drafted and approved 2026-06-25: the eyebrow, the gold accent word, the
//     reconciled lead (the old tier-dependent subtitles referenced the REMOVED
//     Tax-Adjusted Asset View — that clause is dropped), the readiness callout copy +
//     pills (grounded in real M1 domains: documentAccess asks about tax-return access,
//     assetAwareness covers retirement accounts), the per-card step labels, the
//     not-started CTA verbs, and the upgrade promo (reworded for wholesale-gating —
//     M2/M3's "you already have the worksheets" is FALSE here).
// The REMOVED orphan: "Tax-Adjusted Asset View" (backed by blueprintStore
// .costBasisEntries, linked to /blueprint#section-5) was never an M4 worksheet — no
// /modules/m4 route, no m4Store backing. It is intentionally absent here; the
// Blueprint cost-basis surface remains reachable from the Blueprint route.
// The dynamic half (per-worksheet progress) comes from m4Landing.adapter.

/** @type {import('@/src/components/module-landing/types').ModuleLandingConfig} */
export const M4_LANDING = {
  module: 'm4',
  eyebrow: 'Module 04 · Your Tools',
  headline: { text: 'Tax Landscape', goldWord: 'Landscape' },
  lead:
    'Module 4 explores the tax implications of divorce — filing status and the proper ' +
    'tax treatment of dividing retirement plans.',
  readiness: {
    copy:
      'Your readiness assessment flagged tax-return access and retirement-account awareness ' +
      'as areas to strengthen — exactly what Module 4 closes.',
    // Static for v1 (mirrors M2/M3). Both labels are real M1 readiness domains
    // (m1Store.readinessAssessment.results.domainScores): documentAccess (which asks
    // about access to the last 3 years of tax returns) and assetAwareness (retirement
    // accounts + how property is titled) — the two M4 leans on most.
    pills: ['Document Access', 'Asset Awareness'],
  },
  worksheets: [
    {
      id: 'filingStatusOptimizer',
      stepLabel: 'Step 1 · Optimize your filing status',
      title: 'Filing Status Optimizer',
      description:
        'Compare how different filing statuses affect your taxes — and why the date of your divorce matters.',
      route: '/modules/m4/filing-status',
      ctaCopy: 'Start optimizer',
      gated: true,
    },
    {
      id: 'pitTaxDiscount',
      stepLabel: 'Step 2 · Discount retirement fairly',
      title: 'PIT Tax Discount Calculator',
      description:
        'Calculate the proper tax discount on retirement plan division.',
      route: '/modules/m4/tax-discount',
      ctaCopy: 'Start calculator',
      gated: true,
    },
  ],
  // Full Access = navigator (and legacy signature). Below that, both the per-worksheet
  // locked treatment AND the sidebar promo fire (M4 is wholesale-gated).
  tierGate: 'navigator',
  upgrade: {
    headline: 'Unlock your tax picture.',
    body:
      "Module 4's filing-status optimizer and retirement-division tax calculator are part of " +
      'Full Access — along with every tool in Modules 4 through 7 and guided education across the module.',
    ctaCopy: 'Learn about Full Access',
  },
  links: {
    dashboard: '/dashboard',
    blueprint: '/blueprint',
    upgrade: '/upgrade',
  },
};
