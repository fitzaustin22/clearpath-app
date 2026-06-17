// src/lib/blueprint/pdf/format.js
//
// Presentation helpers for the Attorney Blueprint renderer: D-V2-5 value
// formatting by value class, enum→human humanization (the A4 raw-token-leak
// defense — no internal key/enum/token ever renders), section titles, and
// cover/header display metadata. Pure; no react-pdf imports.

// ── D-V2-5 rounding/format by value class ───────────────────────────────────
const usd = (n, fractionDigits) =>
  Number(n).toLocaleString('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits,
  });

export function formatValue(block) {
  const { value, valueClass } = block;
  switch (valueClass) {
    case 'currency_actual':
      return usd(value, 2); // actuals/affidavit figures to the cent
    case 'currency_projection':
      return usd(value, 0); // projections/PVs/scenario outputs to the whole dollar
    case 'rate':
      return `${Number(value).toFixed(2)}%`; // rates/percentages to two decimals
    case 'fraction':
      return Number(value).toFixed(4); // coverture fractions to four decimals
    case 'count':
      return Number(value).toLocaleString('en-US', { maximumFractionDigits: 0 });
    case 'text':
    default:
      return humanizeText(value);
  }
}

// ── Enum humanization ───────────────────────────────────────────────────────
const HUMANIZE = Object.freeze({
  // PVA valuation path
  tier_1: 'Defined-benefit present value',
  tier_2: 'Defined-benefit present value',
  tier_3: 'Defined-benefit present value (coverture)',
  in_pay_status: 'Defined-benefit in-pay status',
  cash_balance: 'Cash-balance plan (account balance)',
  flag_only: 'Pension flagged — not valued',
  // QDRO classifiers
  dc: 'Defined-contribution plan',
  db: 'Defined-benefit plan',
  alternatePayee: 'Alternate payee',
  participant: 'Participant',
  // filing status
  single: 'Single',
  hoh: 'Head of household',
  mfj: 'Married filing jointly',
  mfs: 'Married filing separately',
  // home-decision scenarios
  keepAndRefi: 'Keep and refinance',
  sellNow: 'Sell now',
  deferredSale: 'Deferred sale',
  // deferred-comp category
  stockOptions: 'Stock options',
  corporateIncentives: 'Restricted stock units',
});

// Split a single camelCase/snake_case token to a Title-case phrase.
function humanizeToken(token) {
  const phrase = token
    .replace(/_/g, ' ')
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .toLowerCase();
  return phrase.charAt(0).toUpperCase() + phrase.slice(1);
}

/**
 * Human-readable rendering for a text VALUE. Known enums map to authored
 * labels; any other token-like string (camelCase or snake_case, no spaces) is
 * split to Title Case so NO raw internal token ever reaches the page; free text
 * and numerics pass through unchanged.
 */
export function humanizeText(value) {
  if (value == null) return '';
  const s = String(value);
  if (Object.prototype.hasOwnProperty.call(HUMANIZE, s)) return HUMANIZE[s];
  if (!/\s/.test(s) && /[a-z][A-Z]|_/.test(s)) return humanizeToken(s);
  return s;
}

// camelCase / snake_case token patterns (the A4 raw-token classes).
const CAMEL_TOKEN = /\b[a-z][a-z0-9]*[A-Z][a-zA-Z0-9]*\b/g;
const SNAKE_TOKEN = /\b[a-z0-9]+_[a-z0-9_]+\b/g;

/**
 * Humanize embedded internal tokens inside a LABEL (e.g. a category key
 * interpolated into "Assets — workingCapital"). The label-layer analog of
 * formatValue: the model may carry a raw category key in a label; the renderer
 * presents it cleanly. Leaves ordinary English (and ALL-CAPS acronyms like
 * QDRO/PIT/HDA) untouched — only lowercase camelCase / snake_case fragments.
 */
export function humanizeLabel(label) {
  if (label == null) return '';
  return String(label).replace(CAMEL_TOKEN, humanizeToken).replace(SNAKE_TOKEN, humanizeToken);
}

// ── Section numbering & titles (D-V2-3: canonical numbering preserved) ──────
export const SECTION_TITLES = Object.freeze({
  s1: 'Personal Profile',
  s2: 'Income Analysis',
  s3: 'Asset Inventory',
  s4: 'Tax Analysis',
  s5: 'Property Division',
  s6: 'Retirement Plan Division',
  s7: 'Expense Analysis',
  s8: 'Support Analysis',
  s9: 'Marital Home Decision',
  s10: 'Negotiation Strategy',
  s11: 'Settlement Offer Overview',
  s12: 'Action Plan & Timeline',
});

export function sectionNumberLabel(sectionId) {
  const n = String(sectionId).replace(/^s/, '');
  return `Section ${n}`;
}

export const CARRIER_TITLES = Object.freeze({
  deferredCompStubs: 'Deferred Compensation',
  costBasisEntries: 'Tax-Adjusted Asset Values',
  qdroBlueprint: 'QDRO Projection',
});

// ── Cover / header display metadata ─────────────────────────────────────────
const JURISDICTIONS = Object.freeze({ MD: 'Maryland', DC: 'District of Columbia', VA: 'Virginia' });
export function jurisdictionLabel(code) {
  return JURISDICTIONS[code] ?? code ?? '';
}

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
export function preparedLabel(isoDate) {
  if (!isoDate || !/^\d{4}-\d{2}/.test(String(isoDate))) return '';
  const [y, m] = String(isoDate).split('-');
  const idx = Number(m) - 1;
  return MONTHS[idx] ? `${MONTHS[idx]} ${y}` : y;
}

/**
 * Inputs-&-assumptions appendix value formatter: round non-integer numerics to
 * four decimals (D-V2-5 — no raw engine floats like 0.6823529411764706 on the
 * page); humanize token-bearing strings; pass through everything else.
 */
export function formatAppendixValue(value) {
  if (value == null) return '';
  if (typeof value === 'number') {
    return Number.isInteger(value) ? String(value) : String(Math.round(value * 10000) / 10000);
  }
  const s = String(value);
  if (/^-?\d+(\.\d+)?$/.test(s.trim())) {
    const n = Number(s);
    if (Number.isFinite(n) && !Number.isInteger(n)) return String(Math.round(n * 10000) / 10000);
    return s.trim();
  }
  return humanizeLabel(s);
}

/** Header short form — surname when a multi-word name is given. */
export function headerName(clientName) {
  if (!clientName) return 'ClearPath';
  const parts = String(clientName).trim().split(/\s+/);
  return parts[parts.length - 1];
}
