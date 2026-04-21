/**
 * Tooltip content for technical terms throughout M5 tools.
 * Content population is Step 13 of the M5 build sequence.
 * Keys per v4 spec §1.13.
 *
 * Shape when populated:
 *   { title: string, body: string }
 *
 * Keys with null values are "not yet written" — Tooltip will render children
 * unchanged and emit a console.warn.
 */
export const TOOLTIP_CONTENT = {
  // Home finance
  'DTI': null,
  'PITI': null,
  'front-end DTI': null,
  'back-end DTI': null,
  'amortization': null,
  'cash-out refi': null,
  'break-even': null,

  // Tax law
  '§121 exclusion': null,
  '§1041 transfer': null,
  '§1250 recapture': null,
  'partial exclusion safe harbor': null,
  'LTCG': null,
  'basis carryover': null,

  // QDRO
  'QDRO': null,
  'QPSA': null,
  'J&S': null,
  'RBCO': null,
  'COAP': null,
  'USFSPA': null,
  '§72(t)(2)(C)': null,
  '§408(d)(6)': null,
  'shared interest': null,
  'separate interest': null,
  'coverture fraction': null,
  'vesting': null,
  'alternate payee': null,

  // Support
  'alimony-first ordering': null,
  'pendente lite': null,
  'above-cap': null,
  'self-support reserve': null,
  'Income Shares': null,
  'CSSA': null,
  'K-factor': null,
  'Kaufman': null,
  'AAML': null,
  'Ginsburg': null,
  'imputation': null,
};

/**
 * Returns the content entry for a term, or null if the term is missing or
 * has not yet been written.
 */
export function getTooltipContent(term) {
  const entry = TOOLTIP_CONTENT[term];
  return entry;
}
