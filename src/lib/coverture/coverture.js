/**
 * coverture.js — the pure Deferred Compensation Analyzer engine (M6 Tool 4, §9.3).
 *
 * Time-rule coverture math only. BOTH Hug and Nelson are ALWAYS computed (D2) —
 * the tool never picks one — and there is NO final-split math anywhere (D1). The
 * output is the marital PORTION (a share count), never a "you receive" figure.
 *
 *   Hug    → time-rule fraction measured from the date of HIRE  (includes premarital service)
 *   Nelson → time-rule fraction measured from the date of GRANT (excludes premarital service)
 *
 * Methodology (verified family-law recon, May 2026): In re Marriage of Hug (1984)
 * 154 Cal.App.3d 780; In re Marriage of Nelson (1986) 177 Cal.App.3d 150. The
 * coverture FRACTION is portable across states; the SPLIT of the marital portion
 * is a discretionary legal allocation this engine never asserts.
 *
 * Pure functions — no store access, no I/O. Consumed by the m6Store
 * `saveAnalysisToBlueprint` action and read directly by the Review screen and the
 * Blueprint §3/§5 resolved-stub summaries.
 */

// Parse an ISO date string to epoch ms; NaN for anything unparseable. Treats a
// falsy value (null / '' / undefined) as unparseable rather than 1970 (which
// `new Date(null)` would yield).
function toMs(date) {
  if (!date) return NaN;
  const t = new Date(date).getTime();
  return Number.isFinite(t) ? t : NaN;
}

/**
 * covertureFraction — the time-rule fraction, clamped to [0, 1].
 *
 *   (startDate → min(separationDate, vestDate)) / (startDate → vestDate)
 *
 * Hug passes startDate = hireDate; Nelson passes startDate = grantDate.
 *   - vested before separation (vestDate ≤ separationDate): numerator === denominator → 1
 *   - post-separation vest: fraction in (0, 1) APPLIES (work spanned the marriage)
 *   - separation before the start (e.g. grant after DOS, Nelson): numerator ≤ 0 → 0
 * Returns 0 when the denominator is non-positive (vestDate ≤ startDate) — guards
 * divide-by-zero — and 0 for any missing/invalid date. Never returns NaN/Infinity.
 */
export function covertureFraction({ startDate, separationDate, vestDate } = {}) {
  const start = toMs(startDate);
  const sep = toMs(separationDate);
  const vest = toMs(vestDate);
  if (!Number.isFinite(start) || !Number.isFinite(sep) || !Number.isFinite(vest)) return 0;
  const denominator = vest - start;
  if (!(denominator > 0)) return 0; // vestDate ≤ startDate — divide-by-zero guard
  const numerator = Math.min(sep, vest) - start;
  const fraction = numerator / denominator;
  return Math.max(0, Math.min(1, fraction));
}

/**
 * analyzeTranche — one vesting tranche under both formulas.
 * → { hug: { fraction, maritalShares }, nelson: { fraction, maritalShares } }.
 * maritalShares = round(shares × fraction). Both formulas always present.
 */
export function analyzeTranche(tranche = {}, { hireDate, grantDate, separationDate } = {}) {
  const vestDate = tranche.vestDate;
  const shares = Number(tranche.shares) || 0;
  const hugFraction = covertureFraction({ startDate: hireDate, separationDate, vestDate });
  const nelsonFraction = covertureFraction({ startDate: grantDate, separationDate, vestDate });
  return {
    hug: { fraction: hugFraction, maritalShares: Math.round(shares * hugFraction) },
    nelson: { fraction: nelsonFraction, maritalShares: Math.round(shares * nelsonFraction) },
  };
}

/**
 * analyzeGrant — iterate the analysis's tranches, run analyzeTranche on each, and
 * SUM maritalShares per formula. Pure over the analysis slice; no Blueprint access.
 * → { perTranche: [{ id, hug, nelson }], totals: { hug: { maritalShares }, nelson: { maritalShares } } }.
 */
export function analyzeGrant(analysis) {
  const { hireDate, grantDate, separationDate } = analysis ?? {};
  const tranches = Array.isArray(analysis?.tranches) ? analysis.tranches : [];
  const perTranche = tranches.map((tranche) => {
    const { hug, nelson } = analyzeTranche(tranche, { hireDate, grantDate, separationDate });
    return { id: tranche.id, hug, nelson };
  });
  const sumShares = (formula) =>
    perTranche.reduce((total, t) => total + t[formula].maritalShares, 0);
  return {
    perTranche,
    totals: {
      hug: { maritalShares: sumShares('hug') },
      nelson: { maritalShares: sumShares('nelson') },
    },
  };
}

/**
 * intrinsicValue — the labeled intrinsic-value dollar estimate (D3 — intrinsic
 * only, never Black-Scholes). RSU (no/zero strike): shares × fmv. Option
 * (strike > 0): shares × max(0, fmv − strike) — never negative. The RSU/option
 * MATH keys off strikePrice presence; the RSU/option LABEL keys off the stub's
 * `category` (decided by the caller). Applied to maritalShares for the estimate.
 */
export function intrinsicValue(shares, fmv, strikePrice) {
  const s = Number(shares) || 0;
  const f = Number(fmv) || 0;
  const strike = Number(strikePrice) || 0;
  if (strike > 0) return s * Math.max(0, f - strike); // option
  return s * f; // RSU
}
