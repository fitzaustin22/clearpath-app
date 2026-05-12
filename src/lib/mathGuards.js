/**
 * mathGuards.js — numeric safety helpers for M5 tools and formula engines.
 *
 * CRITICAL: safeDiv returns null (not 0, not NaN) on failure.
 * In JavaScript, null coerces to 0 in numeric comparisons:
 *   null <= 28    // true  (!)
 *   null === null // true
 * ALWAYS check for null explicitly BEFORE numeric comparisons:
 *   const dti = safeDiv(piti * 100, income);
 *   if (dti == null) verdict = 'incomplete';       // ✓ correct
 *   else if (dti <= 28) verdict = 'affordable';
 *
 *   // NOT:
 *   const verdict = dti <= 28 ? 'affordable' : 'stretch';  // ✗ treats null as affordable
 */

/**
 * Safe numeric division.
 * Returns null when the operation cannot produce a finite number — including
 * divide-by-zero, null/undefined inputs, NaN, or Infinity. Callers must
 * explicitly null-check before numeric comparisons (see top-of-file note).
 *
 * @param {number|null|undefined} num
 * @param {number|null|undefined} denom
 * @returns {number|null}
 * @example
 *   safeDiv(10, 2)  // 5
 *   safeDiv(10, 0)  // null
 *   safeDiv(null, 4) // null
 */
export function safeDiv(num, denom) {
  if (num == null || denom == null) return null;
  if (typeof num !== 'number' || typeof denom !== 'number') return null;
  if (!Number.isFinite(num) || !Number.isFinite(denom)) return null;
  if (denom === 0) return null;
  const result = num / denom;
  if (!Number.isFinite(result)) return null;
  return result;
}

/**
 * Clamp a value to be non-negative. Returns null for null/undefined/NaN/Infinity.
 *
 * @param {number|null|undefined} v
 * @returns {number|null}
 * @example
 *   safePositive(-3)   // 0
 *   safePositive(5)    // 5
 *   safePositive(null) // null
 */
export function safePositive(v) {
  if (v == null) return null;
  if (typeof v !== 'number') return null;
  if (!Number.isFinite(v)) return null;
  return Math.max(0, v);
}

/**
 * Format a numeric value for display, or return an em-dash for invalid/missing.
 * Used anywhere the UI may render a potentially-null numeric value.
 *
 * @param {number|null|undefined} v
 * @returns {number|string}
 * @example
 *   formatOrDash(42)   // 42
 *   formatOrDash(null) // '—'
 *   formatOrDash(NaN)  // '—'
 */
export function formatOrDash(v) {
  if (v == null) return '—';
  if (typeof v !== 'number') return '—';
  if (!Number.isFinite(v)) return '—';
  return v;
}

/**
 * Calendar months between two dates (or ISO date strings YYYY-MM-DD).
 * Clamped to be non-negative. Returns 0 for invalid inputs.
 * Strings are parsed as local time (T00:00:00 appended) to avoid UTC
 * off-by-one bugs.
 *
 * @param {Date|string} d1
 * @param {Date|string} d2
 * @returns {number}
 * @example
 *   monthsBetween('2020-01-15', '2020-07-15')      // 6
 *   monthsBetween('bad-input', new Date())         // 0
 *   monthsBetween(new Date(2024, 0), new Date(2023, 0)) // 0 (clamped)
 */
export function monthsBetween(d1, d2) {
  const a = toLocalDate(d1);
  const b = toLocalDate(d2);
  if (!a || !b) return 0;
  return Math.max(0, (b.getFullYear() - a.getFullYear()) * 12 + (b.getMonth() - a.getMonth()));
}

function toLocalDate(d) {
  if (d == null) return null;
  if (d instanceof Date) {
    return isNaN(d.getTime()) ? null : d;
  }
  if (typeof d === 'string') {
    const iso = /^\d{4}-\d{2}-\d{2}$/.test(d) ? `${d}T00:00:00` : d;
    const parsed = new Date(iso);
    return isNaN(parsed.getTime()) ? null : parsed;
  }
  return null;
}

/**
 * Normalize a filing status string to canonical lowercase form.
 * Returns 'single' for null/undefined/empty input. Otherwise lowercases and
 * returns; the caller is responsible for validating it's one of the three
 * canonical values ('single' | 'mfj' | 'hoh').
 *
 * @param {string|null|undefined} status
 * @returns {string}
 * @example
 *   normalizeFilingStatus('MFJ')   // 'mfj'
 *   normalizeFilingStatus(null)    // 'single'
 *   normalizeFilingStatus('')      // 'single'
 *   normalizeFilingStatus('Hoh')   // 'hoh'
 */
export function normalizeFilingStatus(status) {
  if (status == null) return 'single';
  if (typeof status !== 'string') return 'single';
  if (status.trim() === '') return 'single';
  return status.toLowerCase();
}
