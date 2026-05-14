import { lookupMortalityTable } from './mortalityTables/index.js';

/**
 * Compute annual annuity-due factor (ä_x) for $1/yr starting at age `age`.
 *
 * Per spec §7.4.6 — standard actuarial commutation. Returns the present value of
 * an annuity-due paying $1/yr for life, accounting for survival probability and
 * time value of money. v1 uses annual approximation; the Woolhouse monthly
 * correction (≈ −11/24) is NOT applied per [R5a-2].
 *
 * Mortality contract per [R5a-5]: tables MUST define values for ages 0–119 with
 * `table[119] = 0` (terminal), guarding against NaN propagation past the last
 * supported age.
 *
 * @param {object} args
 * @param {number} args.age — integer age at which annuity begins
 * @param {'irs_417e' | 'pub_2010' | 'rp_2014'} args.mortalityTable — table name
 * @param {number} args.discountRate — annual discount rate as decimal (e.g., 0.05234 for 5.234%)
 * @param {number} args.cola — annual COLA as decimal (e.g., 0.02 for 2%)
 * @returns {number}
 */
export function computeAnnuityFactor({ age, mortalityTable, discountRate, cola }) {
  const maxAge = 120;
  const survivalProbabilities = lookupMortalityTable(mortalityTable);

  let annuityFactor = 0;
  let cumulativeSurvival = 1;

  for (let k = 0; k + age < maxAge; k++) {
    const colaFactor = Math.pow(1 + cola, k);
    const discountFactor = Math.pow(1 + discountRate, k);
    annuityFactor += (cumulativeSurvival * colaFactor) / discountFactor;
    cumulativeSurvival *= survivalProbabilities[age + k];
  }

  return annuityFactor;
}
