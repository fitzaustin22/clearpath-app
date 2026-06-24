/**
 * UPL disclaimer-element guard.
 *
 * Every Blueprint disclaimer a user or attorney receives must carry the three
 * elements the Virginia UPL analysis prescribes (vault: Roadmap/Research/
 * Virginia-UPL-Analysis.md, "Three-stage action plan" / consumer-disclaimer note):
 *   (i)   not legal advice
 *   (ii)  not a law firm
 *   (iii) consult your own attorney / retained counsel
 *
 * Audience phrasing differs (consumer export vs. attorney edition), so each
 * constant is matched against its own element patterns. This locks the copy so a
 * future edit cannot silently drop a required element.
 */

import { describe, it, expect } from 'vitest';
import { EXPORT_DISCLAIMER } from '@/src/components/blueprint/exportCopy.js';
import { COVER_DISCLAIMER, FOOTER_DISCLAIMER } from '@/src/lib/blueprint/pdf/AttorneyBlueprintDocument.jsx';

const DISCLAIMERS = [
  {
    name: 'EXPORT_DISCLAIMER (consumer Blueprint export cover)',
    text: EXPORT_DISCLAIMER,
    elements: {
      'not a law firm': /not a law firm/i,
      'not legal, tax, or financial advice': /not legal, tax, or financial advice/i,
      'consult your own attorney': /your attorney/i,
    },
  },
  {
    name: 'COVER_DISCLAIMER (Attorney Blueprint cover)',
    text: COVER_DISCLAIMER,
    elements: {
      'not a law firm': /not a law firm/i,
      'not legal, tax, or investment advice': /not legal, tax, or investment advice/i,
      'review by retained counsel': /retained counsel/i,
    },
  },
  {
    name: 'FOOTER_DISCLAIMER (Attorney Blueprint footer)',
    text: FOOTER_DISCLAIMER,
    elements: {
      'not a law firm': /not a law firm/i,
      'not legal, tax, or investment advice': /not legal, tax, or investment advice/i,
      'review by retained counsel': /retained counsel/i,
    },
  },
];

const cases = DISCLAIMERS.flatMap((d) =>
  Object.entries(d.elements).map(([element, pattern]) => ({
    name: d.name,
    element,
    pattern,
    text: d.text,
  })),
);

describe('Blueprint disclaimers — UPL compliance elements', () => {
  it.each(cases)('$name carries "$element"', ({ text, pattern }) => {
    expect(text).toMatch(pattern);
  });
});
