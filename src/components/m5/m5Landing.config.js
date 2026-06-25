// Module 5 "Value What Matters" landing content — the static half of the
// ModuleLanding contract. M5 is the FINAL module-landing migration and the second
// wholesale-gated consumer (after M4): every worksheet is `gated`, so free/essentials
// users see the whole module as a Full-Access preview (Option C locked cards + sidebar
// upsell), while navigator/signature users get real per-worksheet status from the
// (heterogeneous) m5Landing.adapter.
//
// Copy provenance:
//   - VERBATIM from the prior M5ModulePage TOOLS array: each worksheet's title /
//     description / route (the §1.6 tool inventory). The module title "Value What
//     Matters" is lifted from the old h1 "M5 — Value What Matters".
//   - NET-NEW for the Primary layout (the old card-grid page had no slot for these),
//     drafted and approved 2026-06-25 at the M5 migration checkpoint: the eyebrow, the
//     gold accent word ("Matters"), a trimmed lead (a 2-sentence reconciliation of the
//     old ~600-char EDU_PARAGRAPH, for visual parity with M2/M3/M4), the readiness
//     callout copy + pills (grounded in real M1 domains — assetAwareness for the home/
//     pension/retirement valuations, incomeAwareness for support), the per-card step
//     labels, the not-started CTA verbs (kept UNIQUE so each resolves unambiguously —
//     note Pension and Home both used "analyzer" copy, so Home's verb is "Compare
//     scenarios"), and the upgrade promo (worded for wholesale-gating — M2/M3's "you
//     already have the worksheets" would be FALSE here).
//
// No orphan worksheet: unlike M4 (which dropped the routeless Tax-Adjusted Asset View),
// all four M5 tools back a real /modules/m5/* route AND a real m5Store slice.
//
// Note `id` ≠ route slug for every worksheet (e.g. id `pensionValuation` → /modules/m5/pva):
// the id matches the adapter's ProgressEntry.id (store-slice aligned); the route is explicit.
// The dynamic half (per-worksheet progress) comes from m5Landing.adapter.

/** @type {import('@/src/components/module-landing/types').ModuleLandingConfig} */
export const M5_LANDING = {
  module: 'm5',
  eyebrow: 'Module 05 · Your Tools',
  headline: { text: 'Value What Matters', goldWord: 'Matters' },
  lead:
    "Some of the most consequential assets in a divorce — a pension, the marital home, a " +
    "support obligation, a retirement account — can't be valued at face. The four tools in " +
    'this module give you CDFA-grade valuations and decision frameworks for exactly these, ' +
    'so you negotiate from clarity rather than guesswork.',
  readiness: {
    copy:
      'Your readiness assessment flagged asset and income awareness as areas to strengthen — ' +
      'the marital home, pensions, and support are exactly what Module 5 helps you value.',
    // Static for v1 (mirrors M2/M3/M4). Both labels are real M1 readiness domains
    // (m1Store.readinessAssessment.results.domainScores): assetAwareness (the home,
    // pensions, and how property is titled) and incomeAwareness (the income basis for
    // support) — the two M5 leans on most.
    pills: ['Asset Awareness', 'Income Awareness'],
  },
  worksheets: [
    {
      id: 'supportEstimator',
      stepLabel: 'Step 1 · Estimate support',
      title: 'Support Estimator',
      description:
        'Estimate state-specific child and spousal support — pendente lite or post-divorce.',
      route: '/modules/m5/support-estimator',
      ctaCopy: 'Start estimator',
      gated: true,
    },
    {
      id: 'pensionValuation',
      stepLabel: 'Step 2 · Value the pension',
      title: 'Pension Valuation Analyzer',
      description:
        'Value a defined-benefit pension at present value, with marital-portion and sensitivity ranges.',
      route: '/modules/m5/pva',
      ctaCopy: 'Start analyzer',
      gated: true,
    },
    {
      id: 'qdroDecision',
      stepLabel: 'Step 3 · Plan the retirement split',
      title: 'QDRO Decision Guide',
      description:
        'Map how each retirement account divides, and produce an attorney handoff packet.',
      route: '/modules/m5/qdro',
      ctaCopy: 'Start guide',
      gated: true,
    },
    {
      id: 'homeDecision',
      stepLabel: 'Step 4 · Decide on the home',
      title: 'Home Decision Analyzer',
      description:
        'Compare keep, sell, and deferred-sale outcomes for the marital home across 3-, 6-, and 10-year horizons.',
      route: '/modules/m5/home-decision',
      ctaCopy: 'Compare scenarios',
      gated: true,
    },
  ],
  // Full Access = navigator (and legacy signature). Below that, both the per-worksheet
  // locked treatment AND the sidebar promo fire (M5 is wholesale-gated).
  tierGate: 'navigator',
  upgrade: {
    headline: 'Unlock CDFA-grade valuations.',
    body:
      "Module 5's support estimator, pension valuation, QDRO decision guide, and home-decision " +
      'analyzer are part of Full Access — along with every tool in Modules 4 through 7 and guided ' +
      'education across the module.',
    ctaCopy: 'Learn about Full Access',
  },
  links: {
    dashboard: '/dashboard',
    blueprint: '/blueprint',
    upgrade: '/upgrade',
  },
};
