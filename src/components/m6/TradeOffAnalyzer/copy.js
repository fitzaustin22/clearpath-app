/**
 * Trade-Off Analyzer — copy-as-data (M6 Tool 2).
 *
 * Every user-facing string lives here as a plain constant and is rendered via a
 * `{...}` JSX expression, NOT as literal JSX text. That keeps apostrophes and
 * quotation marks out of JSX text nodes (which `react/no-unescaped-entities`
 * would flag) and gives the architect a single byte-clean copy surface to audit.
 *
 * Byte-clean contract: straight quotes only (U+0027 / U+0022). Em-dash (—) is
 * intentional typography. No smart quotes, zero-width chars, BOM, or markdown
 * auto-link artifacts. Compliance: no verdict, recommendation, fees-vs-value, or
 * "worth it" steer anywhere; the garage-sale note is purely factual.
 */

export const TRADEOFF_DISCLAIMER =
  `This is a tool for organizing your own thinking, not legal advice. It won't tell you which trade to make — that's your call, with your attorney.`;

export const TRADEOFF_COPY = {
  framing: {
    title: `Trade on purpose`,
    body: [
      `You'll rarely win something you care about without offering something in return. The question isn't whether you'll give things up — it's whether you choose what, in advance, or have it taken in the moment.`,
      `Here you'll pair each thing you want to win with what you'd offer to secure it. Decided ahead of time, a concession stops being a loss and becomes a move.`,
    ],
    disclaimer: TRADEOFF_DISCLAIMER,
    cta: `Let's start`,
  },

  build: {
    title: `Build your trades`,
    subhead: `Pick something you want to win, then choose what you'd offer to secure it.`,
    getLabel: `What do you want to win?`,
    getHelp: `These come from your Priorities Worksheet — or type your own.`,
    getEmpty: `You haven't set priorities yet. Add them in the Priorities Worksheet, or just type what you want to win here.`,
    getPlaceholder: `Something you want to win…`,
    giveLabel: `What would you offer to secure it?`,
    giveHelp: `Pulled from your asset inventory — or type your own.`,
    givePlaceholder: `Something you'd offer…`,
    garageSaleNote: `A note as you choose: courts value used household goods at garage-sale prices, not what you paid to replace them.`,
    wtHint: `You marked these as willing to trade — kept private. To use one in a trade, add it as your own entry; it stays out of your Blueprint until you do.`,
    wtPrivateLabel: `Private`,
    noteToggle: `Why this trade?`,
    notePlaceholder: `A few words — just for you (140 characters)`,
    continue: `Continue to review`,
  },

  review: {
    title: `Your trades`,
    body: `Each trade pairs what you'd offer with what you want to win. This is what appears in your Blueprint.`,
    giveLabel: `Give`,
    getLabel: `Get`,
    disclaimer: `An organizing tool, not legal advice. Which trades to make is your call, with your attorney.`,
    save: `Save to my Blueprint`,
    success: `Saved. Your trades are now in your Blueprint.`,
    viewBlueprint: `View your Blueprint`,
    incomplete: `Trades missing a "want" or an "offer" won't carry forward.`,
    empty: `No complete trades yet. Pair a "want" with at least one "offer" to carry it forward.`,
  },

  lock: {
    title: `Trade-Off Analyzer`,
    cta: `Unlock with Full Access`,
    body: `Pair what you most want to keep with what you'd offer to secure it — so every concession is one you chose, not one you were cornered into.`,
  },

  common: {
    add: `Add`,
    edit: `Edit`,
    remove: `Remove`,
    back: `Back`,
  },
};

export default TRADEOFF_COPY;
