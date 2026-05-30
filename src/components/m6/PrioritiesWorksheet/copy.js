/**
 * Priorities Worksheet — copy-as-data (M6 Tool 1).
 *
 * Every user-facing string lives here as a plain constant and is rendered via
 * a `{...}` JSX expression, NOT as literal JSX text. That keeps apostrophes and
 * quotation marks out of JSX text nodes (which `react/no-unescaped-entities`
 * would flag) and gives the architect a single byte-clean copy surface to audit.
 *
 * Byte-clean contract: straight quotes only (U+0027 / U+0022). Em-dash (—) and
 * ellipsis (…) are intentional typography. No smart quotes, zero-width chars, or
 * markdown auto-link artifacts.
 */

export const PRIORITIES_DISCLAIMER =
  `This is a tool for organizing your own thinking, not legal advice. It won't tell you what to keep or give up — those decisions are yours and your attorney's.`;

export const PRIORITIES_COPY = {
  framing: {
    title: `Choose your battles`,
    body: [
      `Walking into a divorce, it's natural to want to fight for everything. But fighting for every item is how people wear themselves down — and drain the settlement — over things that were never worth it.`,
      `The people who come out ahead do the opposite. They decide on a few things they truly can't walk away without, and treat everything else as currency — things they can trade to win what matters.`,
      `You'll build three short lists: what you Must Have, what you'd Like to Have, and what you're Willing to Trade — your private leverage. Then you'll rank the things worth fighting for.`,
    ],
    disclaimer: PRIORITIES_DISCLAIMER,
    cta: `Let's start`,
    reviewBasics: `Review the basics`,
  },

  capture: {
    title: `What matters to you?`,
    subhead: `Get it all out first — don't sort yet. List anything you'd protect, keep, or might trade away to win something else. You'll organize on the next step.`,
    inputPlaceholder: `Something you'd protect — or trade away to win something else…`,
    add: `Add`,
    noteToggle: `Why does this matter?`,
    notePlaceholder: `A few words on why — just for you (140 characters)`,
    suggestHeader: `Easy to forget — tap to add any that apply`,
    chips: [
      `Pension`,
      `Stock options`,
      `Accrued sick & vacation pay`,
      `Life-insurance cash value`,
      `Frequent-flyer miles`,
      `Prepaid dues (club, season tickets)`,
      `Timeshare`,
    ],
    emptyState: `Nothing here yet. Start with whatever's loudest — the house, your retirement account, the dog. You can always edit or remove anything later.`,
    continue: `Continue to sorting`,
    continueDisabled: `Add at least one thing to keep going.`,
  },

  sort: {
    title: `Sort into three lists`,
    subhead: `Give each item a home. The thinking's mostly done — this is just where it lands.`,
    // Keyed by the importance enum the store stores.
    options: {
      'must-have': {
        label: `Must-Have`,
        help: `A non-negotiable. Keep this list short.`,
      },
      'would-like': {
        label: `Would-Like`,
        help: `You'd prefer it — but you'd trade it to win a Must-Have.`,
      },
      'willing-to-trade': {
        label: `Willing to Trade`,
        help: `You'd give it up on purpose. Leverage to win what matters.`,
        private: true,
        privateLabel: `Private`,
      },
    },
    privacyExplainer: `Private means private from the other side. These never appear in your Blueprint or anything you'd hand to an attorney. We keep them so a later tool can help you plan trades — never deleted, never shared.`,
    reflectionNudge: `A quick gut-check: is this something you need, or something it would just sting to lose? Both are worth noticing — no wrong answer.`,
    reflectionDismiss: `Got it`,
    oversizedCoaching: `When everything's a Must-Have, nothing is. If you had to walk away with only two or three, which would they be? The rest can move to Would-Like — still yours to fight for, easier to trade.`,
    unsortedFlag: (n) =>
      `${n} ${n === 1 ? 'item' : 'items'} still need a home. Sort them, or continue — anything unsorted just won't carry forward.`,
    continue: `Continue to ranking`,
  },

  rank: {
    title: `Order what you'll fight for`,
    subhead: `Most important at the top. Use the arrows on each row to reorder.`,
    mustHavesHeader: `Must-Haves — most important first`,
    wouldLikesHeader: `Would-Likes — most important first`,
    willingBlockHeading: `Willing to trade (not ranked)`,
    willingBlockBody: `These aren't ranked — they're not things you're trying to win. They stay here, private, ready to trade.`,
    continue: `Continue to review`,
  },

  review: {
    title: `Your priorities`,
    sec1Heading: `What you'll fight for`,
    sec1Body: `Ranked most important first. This is exactly what appears in your Blueprint.`,
    // Group sub-headers for Section 1 — plural, matching the §10 Blueprint render
    // (S10NegotiationStrategy) and the Rank-step zone headers.
    groupLabels: {
      'must-have': `Must-Haves`,
      'would-like': `Would-Likes`,
    },
    sec2Heading: `Your private leverage`,
    sec2Body: `Stays with you. It's never written into your Blueprint and never shown to the other side.`,
    disclaimer: `An organizing tool, not legal advice. What to keep or trade is your call, with your attorney.`,
    save: `Save to my Blueprint`,
    success: `Saved. Your priorities are now in your Blueprint.`,
    viewBlueprint: `View your Blueprint`,
    onlyWillingEmpty: `You've named what you'd trade away — but nothing you're fighting for yet. Name at least one Must-Have or Would-Like to build your priority list.`,
  },

  lock: {
    title: `Priorities Worksheet`,
    cta: `Unlock with Full Access`,
    body: `Turn "I want everything" into a short, ranked list of what's actually worth fighting for — plus a private list of what you'll trade to get it. The single most useful thing you can hand your attorney.`,
  },

  common: {
    edit: `Edit`,
    remove: `Remove`,
    back: `Back`,
  },
};

// Importance tiers, in their canonical Sort display order. The store's enum also
// includes 'unsorted' (the pre-Sort landing state), which never appears here.
export const SORT_TIERS = ['must-have', 'would-like', 'willing-to-trade'];

// Oversized-Must-Have coaching fires at this count (non-blocking nudge).
export const OVERSIZED_MUST_HAVE_THRESHOLD = 5;

export default PRIORITIES_COPY;
