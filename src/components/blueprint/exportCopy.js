/**
 * exportCopy — static copy for the M7 Blueprint Export (Phase B).
 *
 * Two constants, both consumed by BlueprintCover (the print-only cover/
 * disclaimer page). Kept as plain data (no JSX, no 'use client') so the copy is
 * importable from tests and centralized in one place.
 *
 * EXPORT_COVER_COPY leads with document identity (brand + "Financial Blueprint"
 * + the user's name). EXPORT_DISCLAIMER is first-class in importance — legible,
 * real-contrast, and explicit that this is an organizing document, NOT advice.
 *
 * Compliance note: the disclaimer DISCLAIMS advice ("not legal, tax, or
 * financial advice"); it never GIVES advice. The cover carries no
 * recommendation/verdict language (see the §7.7 unit test).
 */

export const EXPORT_COVER_COPY = {
  brand: 'ClearPath for Women',
  documentTitle: 'Financial Blueprint',
  preparedForLabel: 'Prepared for',
  // Fallback when Clerk returns no name — never print "undefined" or a blank
  // line. "you" keeps the prepared-for line whole and reads naturally.
  fallbackName: 'you',
  generatedLabel: 'Generated:',
};

export const EXPORT_DISCLAIMER =
  'This Financial Blueprint is an organizing document that brings together the ' +
  'information you entered across ClearPath. ClearPath is not a law firm, and this ' +
  'Blueprint is not legal, tax, or financial advice. Please confirm all figures and ' +
  'decisions with your attorney, CPA, or Certified Divorce Financial Analyst® before ' +
  'acting on them.';
