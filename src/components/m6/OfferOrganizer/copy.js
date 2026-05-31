/**
 * Settlement Offer Organizer — copy-as-data (M6 Tool 3).
 *
 * Every user-facing string lives here as a plain constant and is rendered via a
 * `{...}` JSX expression, NOT as literal JSX text. That keeps apostrophes and
 * quotation marks out of JSX text nodes (which `react/no-unescaped-entities`
 * would flag) and gives the architect a single byte-clean copy surface to audit.
 *
 * Byte-clean contract: straight quotes only (U+0027 / U+0022). Em-dash (—) is
 * intentional typography. No smart quotes, zero-width chars, BOM, or markdown
 * auto-link artifacts.
 *
 * Compliance contract (the whole reason this tool exists): it ORGANIZES and MAPS;
 * it never scores, grades, ranks, or says better/worse/fair/accept/reject. The
 * ONE exception is OFFER_DISCLAIMER, which must name those words precisely in
 * order to disclaim them — and is therefore deliberately excluded from the
 * generated-output verdict-vocabulary ban (see copy.compliance.test.js, the
 * §8.8 / §8.9 split).
 */

export const OFFER_DISCLAIMER =
  `This is an organizing tool, not an evaluation. It does not score an offer, call it fair or unfair, or tell you whether to accept or reject it — those decisions are yours, with your attorney or CDFA. It only lays out what the offer says and what it leaves unsaid.`;

export const OFFER_COPY = {
  // M6 landing card line (single-offer framing).
  landingCard: `Lay an offer beside your priorities and your Blueprint numbers — see what it covers and what it leaves unsaid.`,

  framing: {
    title: `See the whole offer`,
    body: [
      `An offer can look generous in the parts you read first and go quiet on the things that matter most. This tool lays an offer next to the priorities you set and the numbers in your Blueprint, so you can see — in one place — what it addresses and what it leaves unsaid.`,
      `It organizes; it doesn't judge. You decide what the offer is worth.`,
    ],
    disclaimer: OFFER_DISCLAIMER,
    cta: `Let's start`,
  },

  enter: {
    title: `What does the offer say?`,
    subhead: `Enter the terms you have. Leave anything the offer doesn't mention blank — what's missing is part of the picture.`,
    sections: {
      assets: `Assets`,
      support: `Support`,
      home: `The home`,
      retirement: `Retirement`,
      debts: `Debts`,
      other: `Anything else`,
    },
    assetPlaceholder: `What the offer assigns…`,
    debtPlaceholder: `A debt the offer assigns…`,
    toUserLabel: `To whom?`,
    toUser: { you: `You`, spouse: `Spouse`, shared: `Shared` },
    support: {
      amount: `Amount`,
      duration: `For how long`,
      kind: `Type (spousal / child / combined)`,
      kinds: { spousal: `Spousal`, child: `Child`, combined: `Combined` },
    },
    home: {
      label: `What happens to the home?`,
      options: { keep: `You keep it`, sell: `Sell it`, buyout: `Buy-out`, transfer: `Goes to spouse` },
    },
    retirementLabel: `Share to you (%)`,
    otherPlaceholder: `Anything else the offer spells out…`,
    noteToggle: `Add a private note`,
    notePlaceholder: `Just for you — not added to your Blueprint (140 characters)`,
    continue: `Continue to mapping`,
  },

  map: {
    title: `Does the offer touch your priorities?`,
    subhead: `For each priority you set, mark whether the offer addresses it. You decide — the tool won't guess for you.`,
    addressed: `The offer addresses this`,
    silent: `The offer is silent on this`,
    empty: `You haven't set priorities yet. You can still record the offer; add priorities in the Priorities Worksheet to map against them.`,
    continue: `Continue to review`,
  },

  review: {
    title: `Your offer overview`,
    mapHeading: `Your priorities and what the offer says`,
    gapsHeading: `What the offer is silent on`,
    referenceHeading: `For reference — your Blueprint figures`,
    disclaimer: `An organizing overview, not an evaluation. Whether to accept any offer is your decision, with your attorney.`,
    save: `Save to my Blueprint`,
    success: `Saved. Your offer overview is in your Blueprint.`,
    viewBlueprint: `View your Blueprint`,
    emptyMap: `No priorities to map yet — the offer and what it leaves unsaid are still recorded below.`,
  },

  reference: {
    priorities: `Your priorities`,
    assets: `Assets (from your inventory)`,
    division: `Property division`,
    retirement: `Retirement`,
    none: `Nothing recorded yet.`,
  },

  lock: {
    title: `Settlement Offer Organizer`,
    cta: `Unlock with Full Access`,
    body: `Lay any offer beside the priorities you set and your own Blueprint numbers — and see, in one place, what it covers and what it quietly leaves out.`,
  },

  common: {
    edit: `Edit`,
    remove: `Remove`,
    back: `Back`,
    add: `Add`,
  },
};

export default OFFER_COPY;
