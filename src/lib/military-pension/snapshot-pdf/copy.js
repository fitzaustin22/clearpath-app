// src/lib/military-pension/snapshot-pdf/copy.js
//
// All report copy in one place. Static page text is transcribed from the design
// mock (design_handoff_pension_report/Pension Snapshot Report.dc.html); the four
// risk flags are rewritten as "Ask your attorney:" QUESTIONS per the README's
// UPL guardrail (information side of the line — never advice), with copy for
// EVERY conditional branch the tool exposes (the mock shows only one branch
// each). Citations follow the ratified decision: match the audited tool's flag
// citations AND add § 1450(f)(3)(C) to the SBP flag (the flag discusses the
// one-year deemed-election deadline that section governs); Mansell and
// § 1408(a)(4)(B) — trimmed by the mock — are restored. Each cite traces to a
// SOURCES id in ../getCalc.js.

// ── Flag citations ───────────────────────────────────────────────────────────
export const CITES = {
  tenten: '10 U.S.C. § 1408(d)(2)', //                          → SOURCES.ten_ten_rule
  frozen: 'Pub. L. 114-328, § 641(a) (Dec. 23, 2016); 10 U.S.C. § 1408(a)(4)(B)(i)–(ii)', // → SOURCES.frozen_benefit_rule (full audited form; the cutoff date is the rule's trigger)
  sbp: '10 U.S.C. §§ 1447–1455; 10 U.S.C. § 1450(f)(3)(C)', //   → SOURCES.sbp + sbp_deemed_election
  va: 'Mansell, 490 U.S. 581 (1989); Howell, 581 U.S. 214 (2017); Yourko, 302 Va. 149 (2023)', // → mansell/howell/yourko
};

// ── Conditional flag builders ────────────────────────────────────────────────
// Each returns { id, tone, title, body, cite }. tone drives the callout color
// (good=green, caution=amber, info=gold). Every body ends in a question.

const roundYears = (y) => Math.round(Math.max(0, y));

export function tenTenFlag(calc) {
  const yrs = roundYears(calc.overlapYears);
  if (calc.meets1010) {
    return {
      id: 'tenten', tone: 'good', title: 'The 10/10 rule — who pays you', cite: CITES.tenten,
      body: `Your marriage overlaps the service by about ${yrs} years, so you likely meet 10/10 — meaning DFAS can pay your court-awarded share to you directly. The rule decides who cuts the check, not whether you're owed a share. Ask your attorney: is direct payment by DFAS set up in the order?`,
    };
  }
  return {
    id: 'tenten', tone: 'caution', title: 'The 10/10 rule — who pays you', cite: CITES.tenten,
    body: `Your marriage-to-service overlap looks like about ${yrs} years. The 10/10 rule only decides whether DFAS pays your share directly — not whether you're owed one. Even if it's under 10 years, a court can still award you a share. Ask your attorney: if we don't meet 10/10, how will my share actually be paid and secured?`,
  };
}

export function frozenFlag(inp, calc) {
  const base = { id: 'frozen', tone: 'info', title: 'The frozen benefit rule', cite: CITES.frozen };
  if (calc.isFrozen) {
    return { ...base, body: `For divorces after Dec. 23, 2016 where the member isn't retired yet, the divisible pension is frozen to the member's rank and years of service at the divorce (plus cost-of-living bumps). Promotions and extra years earned later don't grow your share. Ask your attorney: does the freeze apply to us, and is the decree's language consistent with it?` };
  }
  if (inp.alreadyReceivingPay) {
    return { ...base, body: `The member is already drawing retired pay, so the freeze doesn't apply — the actual retired pay is the base for division. Ask your attorney: confirm the order divides the retired pay actually being paid.` };
  }
  const boundary = calc.onCutoffBoundary
    ? ' Your date is right at the cutoff, so the exact decree date matters — confirm it.'
    : '';
  return { ...base, body: `Your divorce date appears to be on or before Dec. 23, 2016, so the freeze likely doesn't apply and the member's pay at actual retirement may govern.${boundary} Ask your attorney: which pay base governs given our decree date?` };
}

export function sbpFlag(inp) {
  const base = { id: 'sbp', title: 'Survivor Benefit Plan (SBP)', cite: CITES.sbp };
  if (inp.sbpElected === 'yes') {
    return { ...base, tone: 'good', body: `With former-spouse SBP coverage in place, income can continue to you after the retiree dies. If a court order requires it and it isn't actually elected, a "deemed election" must reach DFAS within one year. Ask your attorney: is former-spouse SBP ordered, and what's our deadline to perfect it?` };
  }
  return { ...base, tone: 'caution', body: `Your share of the pension stops when the retiree dies unless former-spouse SBP coverage is in place — and a deemed election must reach DFAS within one year, or the right can be permanently forfeited. Ask your attorney: is former-spouse SBP ordered, and what's our deadline to perfect it?` };
}

export function vaFlag() {
  return {
    id: 'va', tone: 'caution', title: 'VA disability waiver (and Virginia indemnification)', cite: CITES.va,
    body: `A VA-disability waiver can shrink your share in real dollars, and a court can't order the veteran to make you whole. In Virginia, the parties may agree to an indemnification provision a court can enforce. Ask your attorney: should we negotiate a guaranteed-payment clause?`,
  };
}

// ── Static report copy (transcribed from the mock) ───────────────────────────
export const COPY = Object.freeze({
  brand: 'ClearPath',
  brandEyebrow: 'for Women',
  runningLabel: 'Military Pension Snapshot',

  cover: {
    eyebrow: 'Your personal snapshot',
    title: ['Your Military', 'Pension Snapshot'],
    subhead: 'A plain-language summary of what the military pension may be worth in your divorce — and the questions to take to your attorney and CDFA®.',
    statLabel: 'Estimated present value of your share',
  },

  recapSection: {
    eyebrow: 'Section one',
    title: 'What you told us',
    intro: 'These are the figures this snapshot is built on. If any of them are off, re-run the tool — small changes here can move the result meaningfully.',
  },
  resultSection: {
    eyebrow: 'Section two',
    title: 'Your result',
    grossLabel: 'Gross monthly pension',
    grossSub: 'full member benefit (estimate)',
    shareLabel: 'Your estimated share',
    explainer: 'Your share is figured on the divisible (disposable) base — the gross pension minus the SBP premium and any VA-disability waiver — multiplied by your marital (coverture) fraction and your court-awarded percentage. The federal law that allows this division is the USFSPA, 10 U.S.C. § 1408; how it is applied is governed by the law of your state.',
    footer: 'Educational estimate only — not legal, tax, or financial advice, and not an actuarial valuation.',
  },
  pvSection: {
    eyebrow: 'Section three',
    title: "What it's worth today — a range",
    intro: "A lump-sum value of your future monthly share, expressed in today's dollars. There is no single “right” number — the value swings with the discount rate, the cost-of-living assumption, and how long payments are assumed to last.",
    lowerLabel: 'Lower', middleLabel: 'Middle', higherLabel: 'Higher',
    whyTitle: 'Why the methods disagree',
    whyBody: 'A pension can be valued several defensible ways. Each uses its own mortality table and the interest rate published for the valuation date — so the same pension produces different numbers. Present value rises as the discount rate falls.',
    cdfaPrompt: 'Bring this to your CDFA®: ask which method fits your case and which interest rate applies on your valuation date. A credentialed actuary or CDFA® runs the precise figure; this snapshot shows you the realistic spread so no single number surprises you.',
    footer: 'Present-value range built by varying the discount rate ±1.5%. Illustrative, not a court-grade actuarial valuation.',
  },
  flagsSection: {
    eyebrow: 'Section four',
    title: 'Four issues — and what to ask',
    intro: "These are the things most people get wrong. We've turned each into questions to raise with your attorney — not instructions, just the right things to put on the table.",
    footer: 'These are questions to discuss with a licensed professional, not legal conclusions about your case.',
  },
  checklistSection: {
    eyebrow: 'Section five',
    title: 'Bring these to your CDFA® and attorney',
    intro: 'A short checklist so your first meeting is productive. Print this page, or check the boxes as you gather each item.',
  },
});

export const METHOD_CHIPS = [
  { name: 'Life-expectancy', driver: 'Life table + a bond-based discount rate.' },
  { name: 'PBGC', driver: 'Group annuity mortality + PBGC’s published rates.' },
  { name: 'GATT / § 417(e)', driver: 'Applicable mortality + 30-yr Treasury / segment rates.' },
];

export const CHECKLIST = [
  'The member’s Leave & Earnings Statement (LES), or a retirement-points statement for Reserve/Guard.',
  'Exact dates: date of marriage, date of separation, and date service began.',
  'Ask: which valuation method fits my case, and what discount rate applies on my valuation date?',
  'Ask: is former-spouse SBP coverage ordered, and what is my deadline to perfect a deemed election?',
  "Ask: how will my share be paid if we don’t meet 10/10, and how is it secured?",
  'Ask: should we negotiate a guaranteed-payment / indemnification clause for a possible VA waiver?',
  "Confirm the QDRO / military pension division order is drafted to DFAS’s requirements before it’s signed.",
];

export const CTA = Object.freeze({
  title: 'See the whole picture, not just the pension',
  body: 'ClearPath Full Access values every account, models the taxes and support, and assembles your complete printable Blueprint — the document you walk into mediation with.',
  pill: 'Start your Blueprint at clearpathforwomen.com →',
});

export const COVER_DISCLAIMER =
  'Not legal advice. An educational estimate prepared for you by the ClearPath Military Pension Value Tool. ClearPath Divorce Financial LLC is not a law firm.';

export const DISCLAIMER =
  'Educational estimate only — not legal, tax, or financial advice, and not an actuarial valuation. Military pension division is governed by the USFSPA (10 U.S.C. § 1408) and the law of your state; outcomes vary with your specific facts. ClearPath Divorce Financial LLC is not a law firm and does not provide legal advice. Always consult a CDFA® and a licensed family-law attorney before making decisions.';
