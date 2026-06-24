/**
 * Budget Gap Calculator — pure math + presentation model.
 *
 * Extracted from the M1 tool so the income → gap → verdict logic is unit-tested
 * in isolation and shared by the live ledger (Stage 1) and the results view
 * (Stage 3). No React, no store, no I/O.
 *
 * Verdict logic follows the design hand-off (README + Flow prototype):
 *   grossMonthly = grossPerCheck × frequencyMultiplier
 *   income       = grossMonthly × share%
 *   gap          = income − totalExpenses
 *   tightBand    = 0.10 × income
 *   kind         = |gap| ≤ tightBand ? 'tight' : gap > 0 ? 'surplus' : 'shortfall'
 *
 * NOTE: this is the *display* verdict. The cumulative-data-pipeline result the
 * tool persists to the M1 store / Blueprint (gapPercent-based) is unchanged and
 * lives in the component — this module does not touch the store.
 */
import { T } from '@/src/lib/brand/tokens';

// Pay-frequency → monthly multiplier (README §Interactions / prototype mult()).
export const FREQUENCY_MULTIPLIER = {
  weekly: 52 / 12,
  biweekly: 26 / 12,
  semimonthly: 2,
  monthly: 1,
};

// The eight expense lines, keyed by the FROZEN m1Store input names
// (healthInsurance / debtPayments — not the prototype's short health / debt).
// Labels + helper copy are the exact design hand-off strings.
export const EXPENSE_FIELDS = [
  {
    key: 'housing',
    label: 'Housing (rent or mortgage)',
    helper:
      'What you’d pay on your own — current mortgage, a new rental, or an estimate.',
  },
  { key: 'utilities', label: 'Utilities (electric, gas, water, internet, phone)', helper: '' },
  { key: 'groceries', label: 'Groceries & household supplies', helper: '' },
  {
    key: 'transportation',
    label: 'Transportation (car payment, gas, insurance, maintenance)',
    helper: '',
  },
  {
    key: 'healthInsurance',
    label: 'Health insurance',
    helper:
      'If you’re on your spouse’s plan, estimate individual coverage — $400–$700/mo is typical.',
  },
  {
    key: 'childcare',
    label: 'Childcare & children’s expenses',
    helper: 'Daycare, school costs, extracurriculars, clothing, copays.',
  },
  {
    key: 'debtPayments',
    label: 'Debt payments (credit cards, student & personal loans)',
    helper: 'Monthly minimums on debts you’d be responsible for.',
  },
  { key: 'personal', label: 'Personal (clothing, subscriptions, dining, everything else)', helper: '' },
];

export const EXPENSE_KEYS = EXPENSE_FIELDS.map((f) => f.key);

// Donut segment palette (README §"Donut segment palette", in order).
export const DONUT_PALETTE = [
  '#1B2A4A', '#C8A96E', '#33476B', '#D4B16A',
  '#4A5876', '#8A7028', '#8A93A8', '#B9B2A2',
];

// Verdict colors. surplus = T.GREEN (#2D8A4E); tight = T.PILL_TEXT (#8A7028,
// gold text). shortfall is the design's #C0392B — distinct from brand T.RED
// (#A8351E) — matching the hi-fi hand-off and the prior tool's local red.
const SURPLUS_GREEN = T.GREEN;
const TIGHT_GOLD = T.PILL_TEXT;
export const SHORTFALL_RED = '#C0392B';
// Neutral fill for an empty donut (matches T.LINE).
const DONUT_EMPTY = T.LINE;

// Tolerant numeric parse: accepts numbers or formatted currency strings
// ("1,650"). The store holds numbers; this keeps the math robust regardless.
function parseAmount(v) {
  if (typeof v === 'number') return Number.isFinite(v) ? v : 0;
  const n = parseFloat(String(v ?? '').replace(/[^0-9.]/g, ''));
  return Number.isNaN(n) ? 0 : n;
}

export function convertToMonthly(grossPerCheck, freq) {
  const g = parseAmount(grossPerCheck);
  if (g <= 0) return 0;
  return g * (FREQUENCY_MULTIPLIER[freq] ?? 1);
}

export function computeBudgetGap({ grossPerCheck, freq, share, expenses } = {}) {
  const grossMonthly = convertToMonthly(grossPerCheck, freq);
  const sharePct = Math.max(0, Math.min(100, parseAmount(share)));
  const income = grossMonthly * (sharePct / 100);
  const totalExpenses = EXPENSE_KEYS.reduce(
    (sum, k) => sum + parseAmount(expenses?.[k]),
    0,
  );
  const gap = income - totalExpenses;
  const tightBand = 0.1 * income;
  const kind =
    Math.abs(gap) <= tightBand ? 'tight' : gap > 0 ? 'surplus' : 'shortfall';
  return { grossMonthly, income, totalExpenses, gap, tightBand, kind };
}

// Adaptive verdict copy + color per state. The tight bar caption flips on the
// sign of the gap (slim surplus vs. slim gap), per the prototype.
export function getVerdictPresentation(kind, gap = 0) {
  if (kind === 'surplus') {
    return {
      kind,
      color: SURPLUS_GREEN,
      narrative:
        'You have breathing room. The next step is understanding what you own and owe.',
      barCaption: 'The green slice is yours to plan with.',
      ctaBody:
        'You have room to plan. Module 2 shows you everything you own and owe — so your decisions are grounded in the full picture.',
    };
  }
  if (kind === 'shortfall') {
    return {
      kind,
      color: SHORTFALL_RED,
      narrative:
        'There’s a gap. That’s not a dead end — it’s a starting point, and now you know its exact size.',
      barCaption:
        'The light slice is the part of the month the current numbers don’t yet cover.',
      ctaBody:
        'Closing a gap starts with seeing everything in one place. Module 2 shows you everything you own and owe — so your next decisions are grounded in the full picture.',
    };
  }
  // tight but workable
  const posGap = gap >= 0;
  return {
    kind: 'tight',
    color: TIGHT_GOLD,
    narrative:
      'It’s tight, but workable. Small adjustments could open up more room — and seeing the full picture is how you find them.',
    barCaption: posGap
      ? 'A slim margin — the green slice is what’s left after expenses.'
      : 'A slim gap — the light slice is what the current numbers don’t yet cover.',
    ctaBody:
      'You’re close to balanced. Module 2 shows you everything you own and owe — so small adjustments are grounded in the full picture.',
  };
}

// Income-vs-expense bar fill model (README §"Bar fill math").
//   base    = max(income, total)
//   cover   = min(income, total) / base   (the shared/covered portion)
//   gap seg = |gap| / base                (rendered on income bar when surplus,
//                                           expense bar when shortfall)
export function getBarModel({ income, totalExpenses, gap }) {
  const base = Math.max(income, totalExpenses, 1);
  const coverPct = (Math.min(income, totalExpenses) / base) * 100;
  const gapPct = (Math.abs(gap) / base) * 100;
  return { base, coverPct, gapPct, posGap: gap >= 0 };
}

// Expense donut + legend model. Each non-zero line becomes one conic-gradient
// arc, colored by its FIXED field index (so a zeroed middle line doesn't shift
// the palette of the lines after it). Legend labels drop the trailing
// parenthetical, matching the prototype.
export function getDonutModel(expenses) {
  const total = EXPENSE_KEYS.reduce(
    (s, k) => s + parseAmount(expenses?.[k]),
    0,
  );
  const segments = [];
  let acc = 0;
  EXPENSE_FIELDS.forEach((f, i) => {
    const value = parseAmount(expenses?.[f.key]);
    if (value <= 0) return;
    const startDeg = (acc / Math.max(total, 1)) * 360;
    acc += value;
    const endDeg = (acc / Math.max(total, 1)) * 360;
    segments.push({
      key: f.key,
      label: f.label.replace(/ \(.*\)$/, ''),
      color: DONUT_PALETTE[i % DONUT_PALETTE.length],
      value,
      startDeg,
      endDeg,
    });
  });
  const gradient = segments.length
    ? `conic-gradient(${segments
        .map((s) => `${s.color} ${s.startDeg.toFixed(2)}deg ${s.endDeg.toFixed(2)}deg`)
        .join(', ')})`
    : DONUT_EMPTY;
  return { total, segments, gradient };
}
