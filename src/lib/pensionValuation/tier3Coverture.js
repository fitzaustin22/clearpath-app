import { computeAnnuityFactor } from './annuityFactor.js';
import { CITATIONS_BY_PATH } from './citations.js';

// ─── Private date utilities ─────────────────────────────────
// Centralized here per §7.4.3a (coverture is the most date-intensive path).
// Other engines inline yearsBetween privately to avoid cross-engine import for a
// 4-line helper. addYears is exported because cashBalancePassthrough's coverture
// extension needs to derive retirement from participantDOB.

function parseISODate(s) {
  const [y, m, d] = s.split('-').map(Number);
  return { y, m, d };
}

function pad2(n) {
  return n < 10 ? `0${n}` : `${n}`;
}

function pad4(n) {
  if (n < 10) return `000${n}`;
  if (n < 100) return `00${n}`;
  if (n < 1000) return `0${n}`;
  return `${n}`;
}

/**
 * Add `years` to an ISO8601 date string. Preserves month + day.
 * Used by Tier 3 + Cash Balance to derive retirement from participantDOB.
 */
export function addYears(dateStr, years) {
  const { y, m, d } = parseISODate(dateStr);
  return `${pad4(y + years)}-${pad2(m)}-${pad2(d)}`;
}

/**
 * Months between two ISO8601 dates d1 ≤ d2. Counts from d1's month through the
 * month containing (d2 − 1 day), inclusive — equivalently: full months elapsed,
 * with the trailing partial month counted as one full month when d2 isn't on
 * the first.
 *
 * Verified anchors per §7.11.2:
 *   monthsBetween('2010-01-01', '2040-01-01') === 360  (denominator, Coverture-1)
 *   monthsBetween('2015-06-01', '2024-12-31') === 115  (numerator, Coverture-1)
 *   monthsBetween('2010-01-01', '2024-12-31') === 180  (numerator, Coverture-2)
 */
function monthsBetween(d1, d2) {
  const a = parseISODate(d1);
  const b = parseISODate(d2);
  const baseDiff = (b.y - a.y) * 12 + (b.m - a.m);
  return b.d === 1 ? baseDiff : baseDiff + 1;
}

function maxIsoDate(d1, d2) {
  return d1 > d2 ? d1 : d2;
}

function minIsoDate(d1, d2) {
  return d1 < d2 ? d1 : d2;
}

function yearsBetween(d1, d2) {
  const a = parseISODate(d1);
  const b = parseISODate(d2);
  return (b.y - a.y) + (b.m - a.m) / 12 + (b.d - a.d) / 365.25;
}

// ─── §7.4.3a shared utility ─────────────────────────────────

/**
 * Per spec §7.4.3a [R5b-13]. Shared by Tier 3 and Cash Balance coverture extension.
 * Surfaces 'coverture_zero_fraction' when marital service end ≤ start (the cutoff
 * predates hire, or marriage and cutoff don't overlap employment at all).
 *
 * @param {{hire: string, marriage: string, cutoff: string, retirement: string}} dates
 * @param {(type: string, runtimeData?: object) => void} surfaceCallout
 * @returns {{
 *   fraction: number,
 *   numeratorMonths: number,
 *   denominatorMonths: number,
 *   maritalServiceStart: string,
 *   maritalServiceEnd: string,
 * }}
 */
export function computeCovertureFraction({ hire, marriage, cutoff, retirement }, surfaceCallout) {
  const maritalServiceStart = maxIsoDate(hire, marriage);
  const maritalServiceEnd = minIsoDate(cutoff, retirement);
  const denominatorMonths = monthsBetween(hire, retirement);

  if (maritalServiceEnd <= maritalServiceStart) {
    surfaceCallout('coverture_zero_fraction', { hire, marriage, cutoff, retirement });
    return {
      fraction: 0,
      numeratorMonths: 0,
      denominatorMonths,
      maritalServiceStart,
      maritalServiceEnd,
    };
  }

  const numeratorMonths = monthsBetween(maritalServiceStart, maritalServiceEnd);
  return {
    fraction: numeratorMonths / denominatorMonths,
    numeratorMonths,
    denominatorMonths,
    maritalServiceStart,
    maritalServiceEnd,
  };
}

// ─── §7.4.3 Tier 3 calc engine ──────────────────────────────

/**
 * Per spec §7.4.3 — frozen-at-valuation-date coverture. Uses
 * `currentAccruedMonthlyBenefit` (not projected) and `expectedRetirementAge`
 * (not planNRA) for both deferral and coverture denominator.
 *
 * @param {object} inputs — §7.3.4 input shape
 * @param {(type: string, runtimeData?: object) => void} surfaceCallout
 */
export function calculateTier3Coverture(inputs, surfaceCallout) {
  const asOfDate = inputs.caseEffectiveDate ?? new Date().toISOString().slice(0, 10);

  // STEP T3.1 — Coverture fraction via shared utility
  const retirement = addYears(inputs.participantDOB, inputs.expectedRetirementAge);
  const coverture = computeCovertureFraction(
    {
      hire: inputs.dateOfHire,
      marriage: inputs.dateOfMarriage,
      cutoff: inputs.maritalCutoffDate,
      retirement,
    },
    surfaceCallout
  );

  // STEP T3.2 — Compute deferral period
  const participantAgeToday = yearsBetween(inputs.participantDOB, asOfDate);
  const yearsToRetirement = Math.max(0, inputs.expectedRetirementAge - participantAgeToday);

  // STEP T3.3 — Determine annuity factor age [R5b-1, mirrors T1.2]
  const annuityFactorAge = yearsToRetirement === 0
    ? Math.min(Math.floor(participantAgeToday), 119)
    : inputs.expectedRetirementAge;

  // See tier1And2.js for the /100000 vs /10000 discountRateBps note (spec
  // §7.3.1 e.g. vs §7.4 formula inconsistency; /100000 matches §417(e) reality).
  const baseDiscount = inputs.discountRateBps / 100000;
  const cola = inputs.cola / 100;

  // STEP T3.4 + T3.5 + T3.6 — total PV at given discount rate
  const computeTotalPv = (discountRate) => {
    const af = computeAnnuityFactor({
      age: annuityFactorAge,
      mortalityTable: inputs.mortalityTable,
      discountRate,
      cola,
    });
    const deferralFactor = 1 / Math.pow(1 + discountRate, yearsToRetirement);
    return inputs.currentAccruedMonthlyBenefit * 12 * af * deferralFactor;
  };

  const pvTotalBest = computeTotalPv(baseDiscount);
  // STEP T3.8 — Sensitivity (coverture held constant per P-4)
  const pvTotalLow = computeTotalPv(baseDiscount + 0.01);
  const pvTotalHigh = computeTotalPv(baseDiscount - 0.01);

  // STEP T3.7 — Apply coverture to marital portion
  const pvMaritalBest = pvTotalBest * coverture.fraction;
  const pvMaritalLow = pvTotalLow * coverture.fraction;
  const pvMaritalHigh = pvTotalHigh * coverture.fraction;

  return {
    path: 'tier_3',
    formulaId: 'pva_db_tier3_coverture_v1',
    pv: {
      total: { best: pvTotalBest, low: pvTotalLow, high: pvTotalHigh },
      marital: { best: pvMaritalBest, low: pvMaritalLow, high: pvMaritalHigh },
    },
    coverture,
    metadata: {
      formulaId: 'pva_db_tier3_coverture_v1',
      path: 'tier_3',
      mortalityTable: inputs.mortalityTable,
      discountRateBps: inputs.discountRateBps,
      cola: inputs.cola,
      formOfBenefitOnStatement: inputs.formOfBenefitOnStatement ?? null,
      formOfBenefitInPay: null,
      vestingStatus: inputs.vestingStatus ?? null,
      benefitSource: inputs.benefitSource ?? null,
      planAdministratorOfferedLumpSum: inputs.planAdministratorOfferedLumpSum ?? null,
      citations: CITATIONS_BY_PATH.tier_3,
      calculationTimestamp: new Date().toISOString(),
      asOfDateForStatutoryConstants: asOfDate,
    },
  };
}
