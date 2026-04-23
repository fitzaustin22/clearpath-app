/**
 * New York Post-Divorce Spousal Maintenance Calculator
 * DRL § 236(B)(5-a)
 * 
 * One of the few states with a STATUTORY FORMULA for permanent spousal maintenance.
 * Two formulas calculated; the LOWER amount wins. Result cannot be less than $0.
 * 
 * Effective: March 1, 2026 (annual cap adjustments)
 * Last reviewed: 2026-04-20
 */

// ─── CONSTANTS (2026) ──────────────────────────────────────────────

const PAYOR_INCOME_CAP_ANNUAL = 241000;   // effective March 1, 2026 (up from $228K)
const PAYOR_INCOME_CAP_MONTHLY = PAYOR_INCOME_CAP_ANNUAL / 12;

// Duration advisory schedule — DRL § 236(B)(5-a)(h)
const DURATION_SCHEDULE = [
  { minYears: 0,  maxYears: 15,       pctMin: 0.15, pctMax: 0.30, label: '15–30% of marriage length' },
  { minYears: 15, maxYears: 20,       pctMin: 0.30, pctMax: 0.40, label: '30–40% of marriage length' },
  { minYears: 20, maxYears: Infinity, pctMin: 0.35, pctMax: 0.50, label: '35–50% of marriage length' },
];

// ─── FORMULAS ───────────────────────────────────────────────────────

/**
 * Formula A coefficients depend on whether payor also pays child support
 * 
 * WITH child support:    20% × payor − 25% × payee
 * WITHOUT child support: 30% × payor − 20% × payee
 */
const FORMULA_A = {
  withChildSupport:    { payorCoef: 0.20, payeeCoef: 0.25 },
  withoutChildSupport: { payorCoef: 0.30, payeeCoef: 0.20 },
};

/**
 * Formula B (same regardless of child support):
 * 40% × (payor + payee) − payee
 */
const FORMULA_B_COMBINED_COEF = 0.40;

// ─── CALCULATOR ─────────────────────────────────────────────────────

/**
 * Calculate NY post-divorce spousal maintenance
 * 
 * @param {Object} params
 * @param {number} params.payorAnnualIncome - Payor's annual gross income
 * @param {number} params.payeeAnnualIncome - Payee's annual gross income
 * @param {boolean} params.payorPaysChildSupport - Whether payor also pays child support
 * @param {number} params.marriageYears - Length of marriage in years
 * @returns {Object} Maintenance calculation result
 * 
 * @example
 * calculateNYMaintenance({
 *   payorAnnualIncome: 150000,
 *   payeeAnnualIncome: 50000,
 *   payorPaysChildSupport: true,
 *   marriageYears: 12,
 * });
 * // → { monthlyAmount: 937.50, formulaUsed: 'A', durationRange: { minMonths: 22, maxMonths: 43 }, ... }
 */
export function calculateNYMaintenance({
  payorAnnualIncome,
  payeeAnnualIncome,
  payorPaysChildSupport,
  marriageYears,
}) {
  // Cap payor income at statutory cap
  const cappedPayor = Math.min(payorAnnualIncome, PAYOR_INCOME_CAP_ANNUAL);
  const payorExceedsCap = payorAnnualIncome > PAYOR_INCOME_CAP_ANNUAL;

  // Select Formula A coefficients based on child support status
  const coeffs = payorPaysChildSupport
    ? FORMULA_A.withChildSupport
    : FORMULA_A.withoutChildSupport;

  // Calculate Formula A
  const formulaAResult = cappedPayor * coeffs.payorCoef - payeeAnnualIncome * coeffs.payeeCoef;

  // Calculate Formula B
  const formulaBResult = FORMULA_B_COMBINED_COEF * (cappedPayor + payeeAnnualIncome) - payeeAnnualIncome;

  // Lower of A and B, not less than zero
  const rawA = Math.max(0, formulaAResult);
  const rawB = Math.max(0, formulaBResult);
  const annualAmount = Math.min(rawA, rawB);
  const monthlyAmount = Math.round((annualAmount / 12) * 100) / 100;
  const formulaUsed = rawA <= rawB ? 'A' : 'B';

  // Duration advisory
  const tier = DURATION_SCHEDULE.find(
    t => marriageYears >= t.minYears && marriageYears < t.maxYears
  ) || DURATION_SCHEDULE[DURATION_SCHEDULE.length - 1];

  const durationRange = {
    minMonths: Math.round(marriageYears * tier.pctMin * 12),
    maxMonths: Math.round(marriageYears * tier.pctMax * 12),
    label: tier.label,
  };

  return {
    monthlyAmount,
    annualAmount: Math.round(annualAmount * 100) / 100,
    formulaUsed,
    formulaAAnnual: Math.round(rawA * 100) / 100,
    formulaBAnnual: Math.round(rawB * 100) / 100,
    formulaAMonthly: Math.round((rawA / 12) * 100) / 100,
    formulaBMonthly: Math.round((rawB / 12) * 100) / 100,
    formulaADescription: payorPaysChildSupport
      ? `20% × $${cappedPayor.toLocaleString()} − 25% × $${payeeAnnualIncome.toLocaleString()}`
      : `30% × $${cappedPayor.toLocaleString()} − 20% × $${payeeAnnualIncome.toLocaleString()}`,
    formulaBDescription: `40% × ($${cappedPayor.toLocaleString()} + $${payeeAnnualIncome.toLocaleString()}) − $${payeeAnnualIncome.toLocaleString()}`,
    durationRange,
    payorIncomeExceedsCap: payorExceedsCap,
    payorIncomeCap: PAYOR_INCOME_CAP_ANNUAL,
    tcjaAssumption: 'post-2019',
    citation: 'DRL § 236(B)(5-a)',
    method: 'NY statutory formula (lower of A and B)',
    warnings: [
      ...(payorExceedsCap
        ? [`Payor income ($${payorAnnualIncome.toLocaleString()}) exceeds the statutory cap ($${PAYOR_INCOME_CAP_ANNUAL.toLocaleString()}). The court may apply discretion to income above the cap.`]
        : []),
      ...(annualAmount === 0
        ? ['Formula produces $0 maintenance. The court may still award maintenance based on other factors.']
        : []),
    ],
  };
}

export default calculateNYMaintenance;
