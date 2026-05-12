/**
 * New York Spousal Maintenance Calculator — DRL §236(B)
 *
 * Returns the §6.5.4 spousal shape:
 *  - Formula A/B routing by custody config per §6.5.5 spec text and §6.6.2 callout copy:
 *      Formula A (20% payor − 25% payee) when maintenance payor is the non-custodial parent
 *        (`nyCustodyConfig === 'kids_with_payee'` AND `numChildren > 0`).
 *      Formula B (30% payor − 20% payee) in every other case.
 *  - 40%-of-combined cap applied internally (NY's statutory floor on the formula result);
 *    `capBinds` field on the §6.5.4 return shape is AAML-specific and remains `false` for NY.
 *  - Income cap ($241K post-2026-03-01) via `lookupAtDate(NY_MAINTENANCE_INCOME_CAP)` —
 *    surfaces in `cap` field.
 *  - Self-Support Reserve floor (per DRL §236(B)(5-a)(e) / §236(B)(6)(c)(1)(f)) —
 *    surfaces in `ssr` field.
 *  - Duration advisory schedule (post-divorce only) per DRL §236(B)(6)(f)(1).
 */

import {
  lookupAtDate,
  NY_MAINTENANCE_INCOME_CAP,
  NY_SSR,
} from './effectiveDateConstants.js';

const FORMULA_A_COEFS = { payorCoef: 0.20, payeeCoef: 0.25 };
const FORMULA_B_COEFS = { payorCoef: 0.30, payeeCoef: 0.20 };
const COMBINED_CAP_COEF = 0.40;

// DRL §236(B)(6)(f)(1) advisory duration schedule.
const DURATION_SCHEDULE = [
  { minYears: 0,  maxYears: 15,       pctMin: 0.15, pctMax: 0.30 },
  { minYears: 15, maxYears: 20,       pctMin: 0.30, pctMax: 0.40 },
  { minYears: 20, maxYears: Infinity, pctMin: 0.35, pctMax: 0.50 },
];

function selectFormulaRoute({ nyCustodyConfig, numChildren }) {
  if (numChildren > 0 && nyCustodyConfig === 'kids_with_payee') {
    return { formulaUsed: 'ny_2015_formula_a', coefs: FORMULA_A_COEFS };
  }
  return { formulaUsed: 'ny_2015_formula_b', coefs: FORMULA_B_COEFS };
}

function resolveDurationRange(marriageLengthYears) {
  if (typeof marriageLengthYears !== 'number' || marriageLengthYears < 0) return null;
  const tier =
    DURATION_SCHEDULE.find(
      t => marriageLengthYears >= t.minYears && marriageLengthYears < t.maxYears,
    ) || DURATION_SCHEDULE[DURATION_SCHEDULE.length - 1];
  return {
    type: 'advisory_range',
    minMonths: Math.round(marriageLengthYears * tier.pctMin * 12),
    maxMonths: Math.round(marriageLengthYears * tier.pctMax * 12),
    statutorySource: 'DRL §236(B)(6)(f)(1)',
  };
}

/**
 * @param {object} params
 * @param {number} params.payorGrossMonthly
 * @param {number} params.payeeGrossMonthly
 * @param {number} [params.numChildren=0]
 * @param {('kids_with_payor'|'kids_with_payee'|'shared'|null)} [params.nyCustodyConfig=null]
 * @param {number|null} [params.marriageLengthYears=null]
 * @param {('pendente_lite'|'post_divorce')} [params.temporal='post_divorce']
 * @param {Date|string} [params.caseEffectiveDate]
 * @returns {object} §6.5.4 shape
 */
export function lookupSpousal({
  payorGrossMonthly,
  payeeGrossMonthly,
  numChildren = 0,
  nyCustodyConfig = null,
  marriageLengthYears = null,
  temporal = 'post_divorce',
  caseEffectiveDate,
}) {
  const capRecord = lookupAtDate(NY_MAINTENANCE_INCOME_CAP, caseEffectiveDate);
  const incomeCapAnnual = capRecord?.annualValue ?? 241000;
  const incomeCapMonthly = incomeCapAnnual / 12;

  const payorAnnual = payorGrossMonthly * 12;
  const payorAnnualExceedsCap = payorAnnual > incomeCapAnnual;
  const cappedPayorMonthly = Math.min(payorGrossMonthly, incomeCapMonthly);

  const { formulaUsed, coefs } = selectFormulaRoute({ nyCustodyConfig, numChildren });
  const formulaResult = Math.max(
    0,
    cappedPayorMonthly * coefs.payorCoef - payeeGrossMonthly * coefs.payeeCoef,
  );
  // NY 40%-of-combined cap (DRL §236(B)). Internal; not the AAML 40% cap.
  const combinedCapResult = Math.max(
    0,
    COMBINED_CAP_COEF * (cappedPayorMonthly + payeeGrossMonthly) - payeeGrossMonthly,
  );
  const beforeSSR = Math.min(formulaResult, combinedCapResult);

  // SSR floor — protect payor's residual income.
  const ssrRecord = lookupAtDate(NY_SSR, caseEffectiveDate);
  const ssrAnnual = ssrRecord?.annualValue ?? 21546;
  const ssrMonthly = ssrAnnual / 12;
  const payorResidualAfterPayment = cappedPayorMonthly - beforeSSR;
  let ssr = null;
  let monthlyAmount = beforeSSR;
  if (payorResidualAfterPayment < ssrMonthly && beforeSSR > 0) {
    const afterSSR = Math.max(0, cappedPayorMonthly - ssrMonthly);
    ssr = {
      activated: true,
      ssrAnnual,
      formulaResultBeforeSSR: beforeSSR,
      formulaResultAfterSSR: afterSSR,
    };
    monthlyAmount = afterSSR;
  }

  return {
    monthlyAmount,
    formulaUsed,
    duration: temporal === 'post_divorce' ? resolveDurationRange(marriageLengthYears) : null,
    cap: {
      hit: payorAnnualExceedsCap,
      capValue: payorAnnualExceedsCap ? incomeCapAnnual : null,
      aboveTreatment: payorAnnualExceedsCap ? 'discretionary' : null,
    },
    capBinds: false,
    ssr,
    factorTestApplies: false,
    notes: [],
  };
}

export default lookupSpousal;
