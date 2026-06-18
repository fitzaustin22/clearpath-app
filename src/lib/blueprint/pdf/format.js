// src/lib/blueprint/pdf/format.js
//
// Presentation helpers for the Attorney Blueprint renderer: D-V2-5 value
// formatting by value class, enum→human humanization (the A4 raw-token-leak
// defense — no internal key/enum/token ever renders), section titles, and
// cover/header display metadata. Pure; no react-pdf imports.

// ── D-V2-5 rounding/format by value class ───────────────────────────────────
// Accounting negatives: format the magnitude, wrap in parens (no locale minus).
// The renderer colors a parenthesized value with the negative token (R3).
const usd = (n, fractionDigits) => {
  const v = Number(n);
  const body = Math.abs(v).toLocaleString('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits,
  });
  return v < 0 ? `(${body})` : body;
};

export function formatValue(block) {
  const { value, valueClass } = block;
  switch (valueClass) {
    case 'currency_actual':
      // Actuals are stated to the cent — but a whole-dollar actual drops the
      // redundant .00 so it doesn't sit jarringly next to whole-dollar
      // projections on the same page (R-B). Real cents are always kept.
      return usd(value, Number.isInteger(Number(value)) ? 0 : 2);
    case 'currency_projection':
      return usd(value, 0); // projections/PVs/scenario outputs to the whole dollar
    case 'rate':
      return `${Number(value).toFixed(2)}%`; // rates/percentages to two decimals
    case 'fraction':
      // R-A: coverture fractions are shown as a percentage to two decimals
      // (0.6204 → 62.04%, 1.0000 → 100%). Underlying value is unchanged; the
      // disclosed rounding-contract sentence is updated to match.
      return formatPercentFromFraction(value);
    case 'count':
      return Number(value).toLocaleString('en-US', { maximumFractionDigits: 0 });
    case 'text':
    default:
      return humanizeText(value);
  }
}

/** Yes/No for a boolean (never render a raw true/false on the page). */
export function formatBoolean(value) {
  if (value === true) return 'Yes';
  if (value === false) return 'No';
  return String(value);
}

/** A 0–1 fraction as a 2-decimal percent, dropping a trailing .00 (100%, 68.24%). */
export function formatPercentFromFraction(fraction) {
  const pct = Number(fraction) * 100;
  return Number.isInteger(pct) ? `${pct}%` : `${pct.toFixed(2)}%`;
}

/** True when a numeric value is negative (drives the negative color + parens). */
export function isNegativeValue(block) {
  if (!block || block.valueClass === 'text') return false;
  return Number(block.value) < 0;
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

/**
 * Long-form date from an ISO date or datetime — timezone-safe (parses the
 * YYYY-MM-DD prefix directly, never constructs a Date). '2026-08-15' →
 * 'August 15, 2026'; '2026-06-18T00:34:40.562Z' → 'June 18, 2026'. Used to
 * kill raw ISO timestamps reaching the page (QDRO generatedAt, key dates).
 */
export function formatIsoDate(iso) {
  if (!iso) return '';
  const m = String(iso).match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!m) return String(iso);
  const [, y, mo, d] = m;
  const name = MONTHS[Number(mo) - 1];
  return name ? `${name} ${Number(d)}, ${y}` : String(iso);
}

export function preparedLabel(isoDate) {
  if (!isoDate || !/^\d{4}-\d{2}/.test(String(isoDate))) return '';
  const [y, m] = String(isoDate).split('-');
  const idx = Number(m) - 1;
  return MONTHS[idx] ? `${MONTHS[idx]} ${y}` : y;
}

// Known appendix enum VALUES that aren't camelCase/snake_case (so the generic
// token humanizer leaves them raw): hyphen-slugs, verdict colors, timeline +
// pay-frequency words. Each maps to attorney-readable copy.
const APPENDIX_ENUMS = Object.freeze({
  'refi-at-current': 'Refinance at current rate',
  'margin-of-safety': 'Margin of safety',
  yellow: 'Yellow',
  green: 'Green',
  red: 'Red',
  beforeDec31: 'Before December 31',
  afterDec31: 'After December 31',
  biweekly: 'Biweekly',
  weekly: 'Weekly',
  semimonthly: 'Semi-monthly',
  monthly: 'Monthly',
});

/**
 * Inputs-&-assumptions appendix value formatter. An explicit `format` hint
 * (wired at the model push site) gives the value its unit — `percent`,
 * `currency_actual`/`currency_projection`, `boolean`, `date`, `rate` — so a
 * bare 0.6824 / 260000 / false never reaches the page. Without a hint:
 * booleans → Yes/No, known enums → readable copy, hyphen-slugs → Title-cased,
 * non-integer numerics round to four decimals, free text passes through.
 */
export function formatAppendixValue(value, format) {
  if (value == null) return '';
  if (format) {
    switch (format) {
      case 'boolean':
        return formatBoolean(value);
      case 'percent':
        return formatPercentFromFraction(value);
      case 'currency_actual':
        return usd(Number(value), Number.isInteger(Number(value)) ? 0 : 2);
      case 'currency_projection':
        return usd(Number(value), 0);
      case 'date':
        return formatIsoDate(value);
      case 'rate':
        return `${Number(value).toFixed(2)}%`;
      default:
        break;
    }
  }
  if (typeof value === 'boolean') return formatBoolean(value);
  if (typeof value === 'number') {
    return Number.isInteger(value) ? String(value) : String(Math.round(value * 10000) / 10000);
  }
  const s = String(value);
  if (Object.prototype.hasOwnProperty.call(APPENDIX_ENUMS, s)) return APPENDIX_ENUMS[s];
  if (/^-?\d+(\.\d+)?$/.test(s.trim())) {
    const n = Number(s);
    if (Number.isFinite(n) && !Number.isInteger(n)) return String(Math.round(n * 10000) / 10000);
    return s.trim();
  }
  // Bare hyphen-slug with no spaces (sell-now) → Title-cased phrase so no raw
  // enum slug ever renders, even when it isn't in the known-enum map.
  if (/-/.test(s) && !/\s/.test(s)) {
    const phrase = s.replace(/-/g, ' ').toLowerCase();
    return phrase.charAt(0).toUpperCase() + phrase.slice(1);
  }
  return humanizeLabel(s);
}

/** Header short form — surname when a multi-word name is given. */
export function headerName(clientName) {
  if (!clientName) return 'ClearPath';
  const parts = String(clientName).trim().split(/\s+/);
  return parts[parts.length - 1];
}
