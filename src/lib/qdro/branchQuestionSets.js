/**
 * QDRO Decision Guide — per-branch question sets and locked disclaimer /
 * callout literals (§8.5.4 DC, §8.5.5 IRA, §8.5.6 flag-only, §8.9).
 *
 * Step-4 scope only: DC + IRA + flag-only. The private_db branch (§8.5.3) is
 * §13 step 6 (PVA-dependent) and is intentionally absent here.
 *
 * Question descriptor shape:
 *   { id, wording, inputType, options?, perspectiveSymmetric,
 *     alternatePayeeOnly?, whyThisMatters }
 * `inputType` ∈ 'radio' | 'radio+numeric' | 'radio+date' | 'freetext+notes'
 *             | 'informational'. The UI (PR2+) renders from these; this module
 * is pure data + selection helpers.
 */

// ─── §8.5.4 DC branch — 3 questions ────────────────────────────────────────
export const DC_QUESTIONS = [
  {
    // §8.5.4.1 Q1 — perspective-symmetric, mechanical (no why-this-matters)
    id: 'allocation',
    wording: "How is the alternate payee's portion calculated?",
    inputType: 'radio+numeric',
    options: ['percentage', 'fixed_dollar'],
    perspectiveSymmetric: true,
    alternatePayeeOnly: false,
    whyThisMatters: false,
  },
  {
    // §8.5.4.2 Q2 — alternate-payee-only; carries tax consequences →
    // why-this-matters wrapper (only fires on AP flow per §8.5.2)
    id: 'receiptMethod',
    wording: 'How will you receive your portion?',
    inputType: 'radio',
    options: ['rollover_ira', 'cash_72t', 'leave_in_plan', 'not_yet_decided'],
    perspectiveSymmetric: true,
    alternatePayeeOnly: true,
    whyThisMatters: true,
  },
  {
    // §8.5.4.3 Q3 — perspective-symmetric, mechanical
    id: 'valuationDate',
    wording:
      "Does the QDRO order specify a valuation date for the alternate payee's share?",
    inputType: 'radio+date',
    options: ['divorce', 'separation', 'other', 'no_specific', 'not_yet_decided'],
    perspectiveSymmetric: true,
    alternatePayeeOnly: false,
    whyThisMatters: false,
  },
];

// ─── §8.5.5 IRA branch — 3 items, no perspective conditioning ──────────────
export const IRA_QUESTIONS = [
  {
    // §8.5.5.1 — informational block, not a question input
    id: 'transferMechanic',
    wording:
      "IRA division uses a §408(d)(6) trustee-to-trustee transfer. No QDRO is required. Decree must explicitly characterize the transfer as 'incident to divorce' for tax-free treatment.",
    inputType: 'informational',
    perspectiveSymmetric: true,
    whyThisMatters: false,
  },
  {
    // §8.5.5.2 — decree language confirmation
    id: 'decreeLanguageConfirmed',
    wording:
      "Does your divorce decree (or proposed decree) explicitly state that the IRA transfer is 'incident to divorce' under §408(d)(6)?",
    inputType: 'radio',
    options: ['yes', 'no', 'not_yet_drafted', 'not_sure'],
    perspectiveSymmetric: true,
    whyThisMatters: false,
  },
  {
    // §8.5.5.3 — custodian process
    id: 'custodian',
    wording:
      'Which IRA custodian holds the account? (Each custodian has its own transfer-incident-to-divorce procedure.)',
    inputType: 'freetext+notes',
    perspectiveSymmetric: true,
    whyThisMatters: false,
  },
];

// ─── §8.5.6 flag-only branches — 3 starter Qs + locked consult callout ─────
export const FLAG_ONLY_BRANCHES = {
  gov_civilian: {
    planType: 'gov_civilian',
    starterQuestions: [
      {
        id: 'gov_civilian_q1',
        wording:
          'Will the former-spouse share be expressed as a marital fraction (e.g., months-of-marriage-during-service / total-months-of-service) or a fixed dollar amount?',
      },
      {
        id: 'gov_civilian_q2',
        wording:
          'Will the order designate the former spouse for a survivor annuity (and at what level: full, partial, or none)?',
      },
      {
        id: 'gov_civilian_q3',
        wording:
          "Does the order preserve the participant's election rights (refund vs. annuity) consistent with the apportionment?",
      },
    ],
    consultSpecialistCallout:
      'Federal civilian retirement (CSRS/FERS) requires a Court Order Acceptable for Processing (COAP), processed by OPM under 5 CFR Part 838. Procedural rules differ materially from ERISA QDROs. Engage an attorney experienced with COAP drafting; a generalist domestic-relations attorney without federal-retirement experience often runs into rejection.',
  },
  military: {
    planType: 'military',
    starterQuestions: [
      {
        id: 'military_q1',
        wording:
          'Does the 10/10 rule apply (at least 10 years of marriage overlapping at least 10 years of creditable military service) for direct DFAS payment to the former spouse?',
      },
      {
        id: 'military_q2',
        wording:
          'What definition of disposable retired pay applies to the apportionment, and what USFSPA-allowed deductions are taken (federal tax withholding, SBP premiums, etc.)?',
      },
      {
        id: 'military_q3',
        wording:
          'Will the former spouse be designated for SBP (Survivor Benefit Plan) coverage, and within the 1-year deemed-election window?',
      },
    ],
    consultSpecialistCallout:
      "Military retired pay division under the Uniformed Services Former Spouses' Protection Act (USFSPA, 10 USC §1408) involves DFAS-specific drafting requirements and SBP timing rules. Engage an attorney experienced with military divorce; civilian-only domestic-relations attorneys frequently miss SBP deemed-election deadlines.",
  },
  state_municipal: {
    planType: 'state_municipal',
    starterQuestions: [
      {
        id: 'state_municipal_q1',
        wording:
          'Does the state or municipal plan administrator publish a model order or required-elements list, and have you obtained it?',
      },
      {
        id: 'state_municipal_q2',
        wording:
          'What valuation date convention does the plan use (separation date, divorce date, order date, other)?',
      },
      {
        id: 'state_municipal_q3',
        wording:
          'What distribution mechanic does the plan support (lump sum, life-only annuity, joint annuity, monthly partition, other)?',
      },
    ],
    consultSpecialistCallout:
      'State and municipal retirement systems vary widely in their division mechanics and required order language. Some plans (e.g., VRS, MD State Retirement) have standardized procedures; others require plan-administrator pre-approval before order entry. Engage an attorney experienced with the specific plan, or one willing to coordinate directly with the plan administrator.',
  },
};

// ─── §8.9.2 locked 4-bullet disclaimer (verbatim) ──────────────────────────
export const QDG_DISCLAIMER_BULLETS = [
  'This tool produces a decision-capture and handoff document, NOT a legal order.',
  'The actual QDRO/COAP/DRO/IRA-transfer order must be drafted and reviewed by a licensed attorney (and frequently a QDRO drafting specialist for complex DB plans).',
  "The handoff packet represents one side's preferences; opposing-counsel review and negotiation will follow.",
  'Plan-specific procedural requirements (plan administrator pre-approval, model-order availability) vary and must be verified by the drafting attorney.',
];

// ─── §8.9.1 three named callouts ───────────────────────────────────────────
// `qdg_attorney_review_required` per-branch body text is authored at build
// phase (§8.9.1) — no single locked literal at v1 for the non-DB branches.
export const QDG_CALLOUTS = {
  qdg_not_legal_order: {
    id: 'qdg_not_legal_order',
    bullets: QDG_DISCLAIMER_BULLETS,
  },
  qdg_attorney_review_required: {
    id: 'qdg_attorney_review_required',
    body: null,
  },
  qdg_packet_ready: {
    id: 'qdg_packet_ready',
    body: 'All asset decisions captured. You can now generate the attorney handoff packet.',
  },
};

const FLAG_ONLY_PLAN_TYPES = new Set(['gov_civilian', 'military', 'state_municipal']);

/**
 * §8.5.4.2 / §8.10.2 — DC question set conditioned on perspective. The
 * receipt-method question (Q2) renders only for the alternate payee; the
 * participant sees only allocation + valuation date.
 */
export function getDcQuestions(userRole) {
  if (userRole === 'alternatePayee') return DC_QUESTIONS;
  return DC_QUESTIONS.filter((q) => !q.alternatePayeeOnly);
}

/**
 * §8.5.5 / §8.5.1 — IRA question set. No perspective conditioning: the same
 * set renders regardless of userRole.
 */
export function getIraQuestions(userRole) {
  void userRole; // accepted for §8.5.1 cross-branch signature symmetry; IRA has no perspective delta
  return IRA_QUESTIONS;
}

/**
 * §8.5.6 — flag-only branch descriptor (3 starter Qs + consult-specialist
 * callout) for a flag-only planType; null for any non-flag planType.
 */
export function getFlagOnlyBranch(planType) {
  if (!FLAG_ONLY_PLAN_TYPES.has(planType)) return null;
  return FLAG_ONLY_BRANCHES[planType];
}

/**
 * Step-4 branch dispatcher. Returns:
 *   - dc        → perspective-conditioned DC question array
 *   - ira       → IRA question array
 *   - flag-only → flag-only branch descriptor
 *   - private_db / unknown → null (private_db is §13 step 6, out of scope)
 */
export function getBranchQuestionSet({ planType, userRole }) {
  if (planType === 'dc') return getDcQuestions(userRole);
  if (planType === 'ira') return getIraQuestions(userRole);
  if (FLAG_ONLY_PLAN_TYPES.has(planType)) return getFlagOnlyBranch(planType);
  return null;
}
