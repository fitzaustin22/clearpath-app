// @vitest-environment node
//
// TABLE-OF-CONTENTS PAGE-NUMBER ACCURACY (the F1 two-pass off-by-one).
//
// The Contents page prints a page number for every section, supplement, and
// appendix, derived from a two-pass render (pass 1 records each heading's page
// via an invisible capture; pass 2 reprints with those numbers). Two defects
// drifted the printed numbers from the headings' real pages:
//   1. The passes laid out DIFFERENTLY — pass 1 had no Contents page and a
//      different node tree — so a uniform +1 offset was wrong non-uniformly.
//   2. The capture node sat OUTSIDE the `wrap:false` heading group, so when
//      `minPresenceAhead` pushed a heading to the next page the capture stayed
//      behind (§4 captured on 4 but rendered on 5).
//
// This asserts the printed numbers against the ACTUAL page each title renders on,
// extracted INDEPENDENTLY from the generated PDF (pdfTextProbe decodes the 20.25pt
// title runs via /ToUnicode — it never consults the capture hook under test).
//
// FAILS-BEFORE / PASSES-AFTER: with the capture outside the heading group (or
// the +1 offset) the printed numbers drift from the decoded heading pages → FAIL.
// With both fixes → exact match for every entry → PASS.

import { describe, it, expect, beforeAll } from 'vitest';
import payload from '../../../../test/fixtures/v2-golden/F1.documentModel.json';
import { renderAttorneyBlueprint, auditTocPageNumbers } from '../renderAttorneyBlueprint.js';
import { headingPages } from './pdfTextProbe.js';

// TOC capture key → a substring of the title as it renders (decoded via
// /ToUnicode — fi/ff ligatures round-trip to their component letters, so the full
// titles match; see renderer.textlayer.test.js for the searchability guard).
const ENTRIES = [
  ['Section 1', 'Personal Profile'],
  ['Section 2', 'Income Analysis'],
  ['Section 3', 'Asset Inventory'],
  ['Section 4', 'Tax Analysis'],
  ['Section 5', 'Property Division'],
  ['Section 6', 'Retirement Plan Division'],
  ['Section 7', 'Expense Analysis'],
  ['Section 8', 'Support Analysis'],
  ['Section 9', 'Marital Home Decision'],
  ['Section 10', 'Negotiation Strategy'],
  ['Section 11', 'Settlement Offer Overview'],
  ['Section 12', 'Action Plan'],
  ['Deferred Compensation', 'Deferred Compensation'],
  ['Tax-Adjusted Asset Values', 'Tax-Adjusted Asset Values'],
  ['QDRO Projection', 'QDRO Projection'],
  ['Appendix A', 'Methodologies and Authorities'],
  ['Appendix B', 'Inputs and Assumptions'],
];

describe('TOC page numbers match the actual rendered heading pages (F1, all entries)', () => {
  let tocPages; // the numbers the Contents page prints
  let actual; // page each title actually renders on (decoded from the PDF)
  let audit;
  beforeAll(async () => {
    audit = await auditTocPageNumbers(payload.model, payload.opts);
    tocPages = audit.tocPages; // identical orchestration to renderAttorneyBlueprint → the printed numbers
    const buffer = await renderAttorneyBlueprint(payload.model, payload.opts);
    actual = headingPages(buffer, ENTRIES.map(([, sub]) => sub));
  }, 60000);

  it('decodes a real page for every TOC entry’s title', () => {
    const missing = ENTRIES.filter(([, sub]) => actual[sub] == null).map(([, sub]) => sub);
    expect(missing, `titles not found in the rendered PDF: ${missing.join(', ')}`).toEqual([]);
  });

  it('every printed TOC page number equals the title’s actual rendered page', () => {
    const mismatches = [];
    for (const [key, sub] of ENTRIES) {
      const listed = tocPages[key];
      const rendered = actual[sub];
      if (listed !== rendered) mismatches.push(`${key}: TOC prints ${listed}, "${sub}" renders on ${rendered}`);
    }
    expect(mismatches, `TOC page-number mismatches:\n${mismatches.join('\n')}`).toEqual([]);
  });

  it('the two render passes converge (pass-1 capture equals the final layout)', () => {
    const drift = Object.keys(audit.tocPages).filter((k) => audit.tocPages[k] !== audit.actualPages[k]);
    expect(drift, `passes diverge for: ${drift.join(', ')}`).toEqual([]);
  });
});
