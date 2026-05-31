// Copy-as-data for the Deferred Compensation Analyzer (M6 Tool 4, §9.6).
// Every user-facing string lives here as plain text and is rendered via {…} so
// apostrophes never sit as literal JSX text. The disclaimer is the compliance
// backbone and is positively tested (copy.compliance.test.js): it must state the
// result is the marital PORTION not the final split, that the split is
// state-dependent and an attorney question, that the dollars are intrinsic-value
// estimates (not Black-Scholes), that which formula applies turns on grant intent,
// and that this is not legal or tax advice. The tool ESTIMATES the marital
// portion and shows BOTH formulas — it never asserts a split (no "you get" /
// "you'll receive" / "your share is" / "50-50" / "half of").

export const DCA_DISCLAIMER =
  "This analyzer applies a coverture time-rule to estimate the marital portion of a " +
  "deferred-compensation grant — a share count, not the final split. It shows both the " +
  "Hug and Nelson formulas because which one applies depends on the grant's intent, a legal " +
  "and factual question the tool does not decide. How the marital portion is ultimately " +
  "divided depends on your state and is a question for your attorney. The dollar figures are " +
  "intrinsic-value estimates only — shares times fair market value, less any strike price — " +
  "not a Black-Scholes or tax-adjusted valuation. This is educational information, not legal " +
  "or tax advice.";

export const DCA_COPY = {
  landingCard:
    'Value RSUs, options, and other deferred-comp grants so they do not slip out of the marital ledger.',

  lock: {
    title: 'Deferred Compensation Analyzer',
    body: 'This tool is part of Full Access. Upgrade to value unvested equity with the coverture time-rule and resolve the deferred-comp items flagged in your Blueprint.',
    cta: 'Unlock with Full Access',
  },

  intro: {
    title: 'Deferred Compensation Analyzer',
    body: 'Unvested equity — RSUs and stock options — is often part marital, part separate. This tool applies a coverture time-rule to estimate the marital portion of a grant, showing both the Hug and Nelson methods side by side. It estimates the marital portion; it never decides the split.',
  },

  select: {
    title: 'Select a grant to analyze',
    subhead: 'These are the deferred-comp items captured in your marital estate inventory.',
    empty:
      'No deferred-comp items are flagged yet. Add unvested RSUs or options in the Marital Estate Inventory (Module 2) and they will appear here.',
    resolvedBadge: 'Analyzed',
    pendingBadge: 'Not yet analyzed',
    open: 'Analyze',
    reopen: 'Re-analyze',
  },

  dates: {
    title: 'Dates & state',
    subhead: 'The coverture fraction is built from these dates. Hug measures from your hire date; Nelson measures from the grant date.',
    hire: 'Date of hire',
    hireHint: 'When employment began (Hug fraction start; includes premarital service).',
    grant: 'Grant date',
    grantHint: 'When this grant was awarded (Nelson fraction start). Prefilled from the inventory.',
    separation: 'Date of separation',
    separationHint: 'The marital cutoff (date of separation, not divorce-final).',
    state: 'State',
    statePlaceholder: 'e.g. VA',
    stateHint: 'Used only to frame community-property vs. equitable-distribution language — never the math.',
    fmv: 'Current value per share',
    fmvHint: 'Fair market value per share today, for the intrinsic-value estimate.',
    back: 'Back',
    continue: 'Continue',
  },

  tranches: {
    title: 'Vesting tranches',
    subhead: 'Enter each vesting block as its own tranche — a vest date and a number of shares. Each tranche gets its own coverture fraction.',
    add: 'Add a tranche',
    vest: 'Vest date',
    shares: 'Shares',
    scheduleHintLabel: 'Vesting schedule on file:',
    scheduleHintNote: 'Reference only — enter the tranches yourself; this note is never read into the numbers.',
    empty: 'No tranches yet. Add one for each vesting block.',
    remove: 'Remove',
    back: 'Back',
    continue: 'Continue',
  },

  review: {
    title: 'Review — Hug and Nelson side by side',
    subhead: 'Both formulas are shown because which one applies depends on why the grant was made. The result is the marital portion, not the split.',
    hugTitle: 'Hug',
    hugDesc: 'Measured from hire — includes premarital service. Tends to a larger marital portion.',
    nelsonTitle: 'Nelson',
    nelsonDesc: 'Measured from grant — excludes premarital service. Tends to a smaller marital portion.',
    perTrancheHeading: 'Per tranche',
    totalsHeading: 'Marital portion (totals)',
    maritalSharesLabel: 'Marital shares',
    intrinsicLabel: 'Intrinsic-value estimate',
    fractionLabel: 'Coverture fraction',
    framingHeading: 'In your state',
    framingCommunity:
      'This is a community-property state, where marital property is generally considered owned in common by both spouses. Exactly how the marital portion is divided is a legal question for your attorney.',
    framingEquitable:
      'This is an equitable-distribution state, where marital property is divided fairly — which does not necessarily mean equally. Exactly how the marital portion is divided is a legal question for your attorney.',
    framingUnknown:
      'How the marital portion is divided depends on your state and is a legal question for your attorney.',
    separateBeforeVestHeading: 'If you separate before a tranche vests',
    separateBeforeVest:
      'Some tranches may vest after your separation date. They are included because the work to earn them can span the marriage — but whether and how a not-yet-vested grant is divided can depend on the terms of the grant and your settlement. This is context to discuss, not a forfeiture calculation.',
    intentLabel: "Which formula matches this grant's intent? (your note)",
    intentPlaceholder: 'e.g. awarded as a retention incentive, so Nelson seems to fit — to discuss with my attorney',
    intentHint: 'Recorded for your own reference only. It is never sent to the Blueprint; the tool does not pick a formula.',
    disclaimerHeading: 'Important',
    back: 'Back',
    continue: 'Continue to save',
  },

  save: {
    title: 'Save to your Blueprint',
    subhead: 'Saving resolves this deferred-comp item in your Blueprint — the "Deferred Comp Pending" advisory clears for it, and a marital-portion summary (Hug and Nelson) appears in your Asset Inventory and Property Division sections.',
    confirm: 'Save analysis to Blueprint',
    success: 'Saved. This grant is now resolved in your Blueprint.',
    viewBlueprint: 'View your Blueprint',
    another: 'Analyze another grant',
  },

  common: {
    back: 'Back',
    remove: 'Remove',
  },
};

export default DCA_COPY;
