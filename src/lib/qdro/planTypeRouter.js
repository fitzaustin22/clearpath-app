/**
 * QDRO Decision Guide — plan-type classifier routing (§8.3).
 *
 * Pure functions. The second per-asset classifier (after the §8.2 perspective
 * classifier): a 6-choice radio group maps to a `planType` enum (§8.3.3), an
 * optional informational accrual-status follow-up that does NOT affect routing
 * (§8.3.2), and the §8.3.5 "still not sure" 3-question diagnostic.
 */

// §8.3.2 — the 6 plan-type-distinguishing radio choices, in spec order.
// `label` strings are the spec-locked radio wording; `planType` is the
// §8.3.3 routing target.
export const PLAN_TYPE_RADIO_CHOICES = [
  {
    id: 'db_pension',
    label: 'Pension that pays a monthly benefit at retirement (defined benefit / DB)',
    planType: 'private_db',
  },
  {
    id: 'account_balance',
    label: 'Account-balance plan: 401(k), 403(b), 457(b)',
    planType: 'dc',
  },
  {
    id: 'ira',
    label: 'IRA (Traditional, Roth, SEP, SIMPLE)',
    planType: 'ira',
  },
  {
    id: 'federal_civilian',
    label: 'Federal civilian: CSRS, FERS',
    planType: 'gov_civilian',
  },
  {
    id: 'military',
    label: 'Military: active duty, Reserve, National Guard',
    planType: 'military',
  },
  {
    id: 'state_municipal',
    label: 'State or municipal employee retirement',
    planType: 'state_municipal',
  },
];

// §8.3.2 — optional accrual-status follow-up. Informational only; never
// changes the routed planType.
export const ACCRUAL_STATUS_OPTIONS = ['accruing', 'frozen', 'in_pay'];

const PLAN_TYPE_BY_RADIO_ID = Object.fromEntries(
  PLAN_TYPE_RADIO_CHOICES.map((c) => [c.id, c.planType]),
);

/**
 * §8.3.3 — map a radio choice id to its planType. Returns null for an
 * unrecognized / missing id (no hard validation per §8.3.5; caller decides).
 */
export function routePlanType(radioChoiceId) {
  return PLAN_TYPE_BY_RADIO_ID[radioChoiceId] ?? null;
}

/**
 * §8.3.2 — carry the accrual-status follow-up alongside the routed planType.
 * planType is derived purely from the radio choice; accrualStatus is passed
 * through untouched so callers can persist it as informational metadata.
 */
export function applyAccrualStatus({ radioChoiceId, accrualStatus }) {
  return {
    planType: routePlanType(radioChoiceId),
    accrualStatus: accrualStatus ?? null,
  };
}

/**
 * §8.3.5 — "still not sure" diagnostic. Three yes/no questions resolve the
 * common DB-vs-DC-vs-IRA confusion and surface a best-guess radio choice id
 * with a plain-language rationale. No hard validation: the user can still
 * override the surfaced best guess.
 *
 * @param {{paysMonthlyAtRetirement: boolean, hasAccountBalance: boolean,
 *          w2Box12CodeMatches: boolean}} answers
 * @returns {{bestGuess: string | null, rationale: string}}
 */
export function diagnosePlanType({
  paysMonthlyAtRetirement,
  hasAccountBalance,
  w2Box12CodeMatches,
}) {
  if (hasAccountBalance) {
    if (paysMonthlyAtRetirement) {
      return {
        bestGuess: 'account_balance',
        rationale:
          'It has an account balance but also describes a monthly retirement benefit — this looks like a hybrid or cash-balance arrangement. The divisible mechanic follows the account balance, so an account-balance (DC) classification is the best starting point; confirm with the plan administrator.',
      };
    }
    if (w2Box12CodeMatches) {
      return {
        bestGuess: 'account_balance',
        rationale:
          'It has an account balance and appears on your W-2 box 12 as an employer-plan contribution — characteristic of a 401(k) / 403(b) / 457(b) account-balance plan.',
      };
    }
    return {
      bestGuess: 'ira',
      rationale:
        'It has an account balance but no employer W-2 box 12 code — characteristic of an IRA, which divides by §408(d)(6) transfer rather than a QDRO.',
    };
  }

  if (paysMonthlyAtRetirement) {
    return {
      bestGuess: 'db_pension',
      rationale:
        'It pays a monthly benefit at retirement with no account balance — characteristic of a defined-benefit pension.',
    };
  }

  return {
    bestGuess: null,
    rationale:
      'These answers do not point clearly to one plan type. Select the closest plan-type option manually, or consult your attorney or the plan administrator to confirm before proceeding.',
  };
}
