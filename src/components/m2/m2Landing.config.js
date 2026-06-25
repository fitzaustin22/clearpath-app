// Module 2 "Know What You Own" landing content — the static half of the
// ModuleLanding contract. Copy/routes are lifted verbatim from the shipped
// M2ModulePage / WORKSHEETS so the reskin renders byte-for-byte identically;
// the dynamic half (per-worksheet progress) comes from m2Landing.adapter.

/** @type {import('@/src/components/module-landing/types').ModuleLandingConfig} */
export const M2_LANDING = {
  module: 'm2',
  eyebrow: 'Module 02 · Your Tools',
  headline: { text: 'Know what you own.', goldWord: 'own' },
  lead:
    'Before you can make good decisions about dividing assets, you need a complete picture of ' +
    'what exists. This module walks you through three steps — gathering your documents, building ' +
    'your asset inventory, and cataloging your personal property.',
  readiness: {
    copy:
      'Your assessment showed some gaps — exactly what Module 2 is designed to close. Start with the ' +
      'Documentation Checklist and work down.',
    // Static for v1 (the design shows the three module themes with generic copy);
    // the real per-user weak domains live in
    // m1Store.readinessAssessment.results.domainScores and can drive these later.
    pills: ['Debt Awareness', 'Asset Awareness', 'Document Access'],
  },
  worksheets: [
    {
      id: 'documentChecklist',
      stepLabel: 'Step 1 · Gather documents',
      title: 'Documentation Checklist',
      description:
        'Track every document you need — tax returns, account statements, deeds, and more.',
      route: '/modules/m2/checklist',
      ctaCopy: 'Start checklist',
    },
    {
      id: 'maritalEstateInventory',
      stepLabel: 'Step 2 · Build inventory',
      title: 'Marital Estate Inventory',
      description:
        'Map every asset and debt, classify them, and see the full picture of your marital estate.',
      route: '/modules/m2/inventory',
      ctaCopy: 'Start inventory',
    },
    {
      id: 'personalPropertyInventory',
      stepLabel: 'Step 3 · Personal property',
      title: 'Personal Property Inventory',
      description: "Go room by room through your household and catalog what's there.",
      route: '/modules/m2/personal-property',
      ctaCopy: 'Start inventory',
    },
  ],
  // Full Access = navigator (and legacy signature). Below that, show the promo.
  tierGate: 'navigator',
  upgrade: {
    headline: 'Unlock AI-guided classification.',
    body:
      'You already have all three worksheets. Upgrade for guided classification and education across the ' +
      'whole module.',
    ctaCopy: 'Learn about Full Access',
  },
  links: {
    dashboard: '/dashboard',
    blueprint: '/blueprint',
    upgrade: '/upgrade',
  },
};
