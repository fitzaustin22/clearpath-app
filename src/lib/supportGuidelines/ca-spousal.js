/**
 * California Spousal Support Estimator
 * 
 * IMPORTANT: California has NO statewide statutory formula for spousal support.
 * Post-divorce support is determined by a factor test under Cal. Fam. Code § 4320.
 * 
 * Temporary (pendente lite) support is often calculated using county-specific
 * formulas. These are NOT statutory authority — they are local guidelines used
 * by practitioners and judges in specific counties.
 * 
 * This file provides:
 *   1. Santa Clara County temporary formula (most commonly referenced statewide)
 *   2. Factor test checklist for post-divorce support
 *   3. Duration guidelines (rule of thumb, not statutory)
 * 
 * Effective: Current as of 2026-04-20
 * Last reviewed: 2026-04-20
 */

// ─── COUNTY FORMULAS ────────────────────────────────────────────────

/**
 * Santa Clara County Temporary Spousal Support Formula
 * 
 * 40% × payor net disposable income
 * − 50% × payee net disposable income
 * − 50% × child support (if applicable)
 * 
 * Result cannot be less than $0.
 * 
 * NOTE: This is commonly referenced across California but is NOT
 * statewide statutory authority. Different counties may use different
 * formulas or no formula at all.
 * 
 * @param {Object} params
 * @param {number} params.payorNetMonthly - Payor's net monthly disposable income
 * @param {number} params.payeeNetMonthly - Payee's net monthly disposable income
 * @param {number} [params.monthlyChildSupport=0] - Monthly child support payor pays
 * @returns {Object} Spousal support estimate
 * 
 * @example
 * calculateSantaClaraSpousal({
 *   payorNetMonthly: 8000,
 *   payeeNetMonthly: 3000,
 *   monthlyChildSupport: 1200,
 * });
 * // → { monthlyAmount: 1100, ... }
 */
export function calculateSantaClaraSpousal({
  payorNetMonthly,
  payeeNetMonthly,
  monthlyChildSupport = 0,
}) {
  const raw = 0.40 * payorNetMonthly
            - 0.50 * payeeNetMonthly
            - 0.50 * monthlyChildSupport;

  const monthlyAmount = Math.max(0, Math.round(raw * 100) / 100);

  return {
    monthlyAmount,
    annualAmount: Math.round(monthlyAmount * 12 * 100) / 100,
    formula: 'Santa Clara County Temporary',
    formulaDescription: `40% × $${payorNetMonthly.toLocaleString()} − 50% × $${payeeNetMonthly.toLocaleString()}${monthlyChildSupport > 0 ? ` − 50% × $${monthlyChildSupport.toLocaleString()} (child support)` : ''}`,
    scope: 'county-specific',
    tcjaAssumption: 'post-2019',
    citation: 'Santa Clara County Local Guidelines (not statutory)',
    warnings: [
      'This formula is from Santa Clara County and is NOT statewide statutory authority.',
      'Results are estimates only. Actual support depends on judicial discretion and the § 4320 factor test.',
      ...(monthlyAmount === 0
        ? ['Formula produces $0 support. The court may still award temporary support based on need and ability to pay.']
        : []),
    ],
  };
}

// ─── ADDITIONAL COUNTY FORMULAS ─────────────────────────────────────

/**
 * Alameda County Temporary Spousal Support Formula
 * Similar to Santa Clara with slight coefficient variations.
 * 
 * TODO: Confirm exact Alameda coefficients from local bar association
 * or family law practitioners. Placeholder uses Santa Clara as base.
 */

// ─── FACTOR TEST (POST-DIVORCE) ─────────────────────────────────────

/**
 * Cal. Fam. Code § 4320 — Factors for Post-Divorce Spousal Support
 * 
 * The court considers ALL of these factors when determining the amount
 * and duration of post-divorce spousal support. No single factor is
 * determinative. There is no formula — this is a judicial discretion
 * determination.
 */
export const CA_SPOUSAL_FACTORS = [
  {
    id: 'standard-of-living',
    factor: 'The marital standard of living',
    description: 'The standard of living established during the marriage is the benchmark. The goal is for both parties to maintain a comparable lifestyle, recognizing that two separate households cost more than one.',
    section: '§ 4320(a)',
  },
  {
    id: 'ability-to-pay',
    factor: 'Supporting party\'s ability to pay',
    description: 'Whether the payor has sufficient income and assets to pay support while maintaining their own reasonable standard of living.',
    section: '§ 4320(c)',
  },
  {
    id: 'needs-based-on-standard',
    factor: 'Supported party\'s needs based on the marital standard of living',
    description: 'What the recipient needs to approximate the marital standard, considering their own income and earning ability.',
    section: '§ 4320(d)',
  },
  {
    id: 'obligations-and-assets',
    factor: 'Obligations and assets of each party',
    description: 'Including separate property. A party with substantial separate assets may need less support.',
    section: '§ 4320(e)',
  },
  {
    id: 'duration-of-marriage',
    factor: 'Duration of the marriage',
    description: 'Longer marriages generally support longer-duration or even permanent support awards. Marriages of 10+ years are considered "long-term" in California.',
    section: '§ 4320(f)',
  },
  {
    id: 'employment-ability',
    factor: 'Supported party\'s ability to engage in gainful employment',
    description: 'Whether employment would interfere with the interests of dependent children in the supported party\'s custody.',
    section: '§ 4320(g)',
  },
  {
    id: 'age-and-health',
    factor: 'Age and health of the parties',
    description: 'Physical and mental health conditions that affect earning capacity or the need for support.',
    section: '§ 4320(h)',
  },
  {
    id: 'domestic-violence',
    factor: 'History of domestic violence',
    description: 'Documented domestic violence by either party is a relevant factor.',
    section: '§ 4320(i)',
  },
  {
    id: 'tax-consequences',
    factor: 'Tax consequences to each party',
    description: 'Post-TCJA (2019+): spousal support is not deductible by payor and not taxable to payee. Pre-2019 orders retain deductibility.',
    section: '§ 4320(j)',
  },
  {
    id: 'balance-of-hardships',
    factor: 'Balance of hardships to each party',
    description: 'The court weighs relative hardship to both parties in setting support.',
    section: '§ 4320(k)',
  },
  {
    id: 'self-sufficiency-goal',
    factor: 'Goal that the supported party shall be self-supporting within a reasonable period of time',
    description: 'Generally, a "reasonable period" is one-half the length of the marriage, except for marriages of long duration (10+ years) where no presumption applies.',
    section: '§ 4320(l)',
  },
  {
    id: 'catch-all',
    factor: 'Any other factors the court determines are just and equitable',
    description: 'The court has broad discretion to consider additional relevant circumstances.',
    section: '§ 4320(n)',
  },
];

// ─── DURATION GUIDELINES ────────────────────────────────────────────

/**
 * California duration rule of thumb (NOT statutory for long-term marriages)
 * 
 * For marriages under 10 years: support duration typically = ½ the length of marriage
 * For marriages of 10+ years ("long-term"): no presumptive end date
 * 
 * The court retains jurisdiction indefinitely for long-term marriages
 * unless both parties agree otherwise.
 */
export const CA_DURATION_GUIDELINES = {
  shortTermThreshold: 10, // years — marriages < 10 years
  shortTermRule: 'Duration typically equals one-half the length of the marriage',
  longTermRule: 'No presumptive end date. Court retains jurisdiction indefinitely unless parties agree otherwise.',
  longTermNote: 'A marriage of 10+ years is considered a "marriage of long duration" under Cal. Fam. Code § 4336.',

  /**
   * Estimate duration range for a given marriage length
   * @param {number} marriageYears
   * @returns {{ minMonths, maxMonths, isLongTerm, label }}
   */
  estimateDuration(marriageYears) {
    if (marriageYears >= 10) {
      return {
        minMonths: Math.round(marriageYears * 0.5 * 12),
        maxMonths: null, // indefinite
        isLongTerm: true,
        label: `Long-term marriage (${marriageYears} years). No presumptive end date. Court retains jurisdiction.`,
      };
    }
    const halfMonths = Math.round(marriageYears * 0.5 * 12);
    return {
      minMonths: halfMonths,
      maxMonths: halfMonths,
      isLongTerm: false,
      label: `Estimated duration: ~${halfMonths} months (half the ${marriageYears}-year marriage)`,
    };
  },
};

// ─── MULTI-FORMULA SELECTOR ─────────────────────────────────────────

/**
 * All available formula options for the CA multi-formula selector UI.
 * User picks which formula to apply; tool computes estimate under
 * selected method with prominent disclaimers.
 */
export const CA_FORMULA_OPTIONS = [
  {
    id: 'santa-clara',
    name: 'Santa Clara County Temporary',
    description: '40% × payor net − 50% × payee net − 50% × child support',
    scope: 'county-specific',
    type: 'temporary',
    tcjaAssumption: 'post-2019',
    calculate: calculateSantaClaraSpousal,
    warning: 'Santa Clara formula is commonly referenced but is NOT statewide authority.',
  },
  // TODO: Add Alameda County formula when coefficients confirmed
  // TODO: Add other county-specific formulas as identified
];

export default {
  calculateSantaClaraSpousal,
  CA_SPOUSAL_FACTORS,
  CA_DURATION_GUIDELINES,
  CA_FORMULA_OPTIONS,
};
