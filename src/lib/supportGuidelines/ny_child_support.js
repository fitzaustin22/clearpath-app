/**
 * New York Child Support Standards Act (CSSA) — DRL §240(1-b).
 *
 * Percentages applied to combined parental income up to the CSSA cap
 * (per S5a-5). Above the cap, court has discretion per *Sinnott v. Sinnott*,
 * 194 A.D.3d 868 (2d Dep't 2021).
 *
 * Returns §6.5.3 child support shape (monetary fields monthly per spec).
 */

import {
  lookupAtDate,
  NY_CSSA_INCOME_CAP,
} from './effectiveDateConstants.js';

const FIXED_PERCENTAGES = { 1: 0.17, 2: 0.25, 3: 0.29, 4: 0.31 };

function cssaPercentage(numChildren) {
  if (numChildren >= 5) return 0.35;
  return FIXED_PERCENTAGES[numChildren] ?? 0;
}

/**
 * @param {number} combinedMonthlyIncome
 * @param {number} numChildren
 * @param {Date|string} [asOfDate]
 * @returns {object} §6.5.3 shape
 */
export function lookupChildSupport(combinedMonthlyIncome, numChildren, asOfDate) {
  const capRecord = lookupAtDate(NY_CSSA_INCOME_CAP, asOfDate);
  const incomeCapAnnual = capRecord?.annualValue ?? 193000;
  const incomeCapMonthly = incomeCapAnnual / 12;

  const pct = cssaPercentage(numChildren);
  const scheduleMaxMonthly = incomeCapMonthly * pct;

  if (numChildren < 1 || pct === 0) {
    return {
      basicSupport: 0,
      source: 'ny',
      scheduleStatus: 'within',
      scheduleMax: scheduleMaxMonthly,
      aboveScheduleMethod: null,
      hollandExtrapolation: null,
      capValue: incomeCapMonthly,
      notes: [],
    };
  }

  const above = combinedMonthlyIncome > incomeCapMonthly;
  const cappedMonthly = Math.min(combinedMonthlyIncome, incomeCapMonthly);
  const basicSupport = cappedMonthly * pct;

  return {
    basicSupport,
    source: 'ny',
    scheduleStatus: above ? 'above' : 'within',
    scheduleMax: scheduleMaxMonthly,
    aboveScheduleMethod: above ? 'ny_cssa_above_cap_discretionary' : null,
    hollandExtrapolation: null,
    capValue: incomeCapMonthly,
    notes: [],
  };
}

export default lookupChildSupport;
