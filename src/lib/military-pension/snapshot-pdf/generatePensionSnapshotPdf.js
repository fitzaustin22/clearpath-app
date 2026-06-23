// src/lib/military-pension/snapshot-pdf/generatePensionSnapshotPdf.js
//
// The public server-side generator for "Your Military Pension Snapshot". The
// backend (the separate tool/capture handoff) calls this with the user's tool
// inputs + the audited getCalc() output and gets back a 5-page Letter PDF Buffer.
//
// PRIVACY (overrides the design's ambiguous "saved inputs"): this function is
// transient — it receives inputs, returns a Buffer, and persists NOTHING. No
// inputs and no PDF are written anywhere here. The only thing the system stores
// is the email, in the backend handoff. Never warehouse a user's divorce
// financials.
//
// Fonts: reuses registerBlueprintFonts() — the brand typefaces (Playfair /
// Newsreader / Inter) are shared assets already committed under blueprint/pdf,
// and that registration carries the Inter `kern` fix the numerals depend on.
// Two-stage discipline (model build vs PDF render) is unnecessary here: the
// document is single-pass (no table-of-contents back-references).
import React from 'react';
import { renderToBuffer } from '@react-pdf/renderer';
import { registerBlueprintFonts } from '../../blueprint/pdf/registerFonts';
import { getCalc } from '../getCalc';
import { buildSnapshotModel } from './presentation';
import { SnapshotReportDocument } from './SnapshotReportDocument';

function defaultPreparedDate() {
  return new Intl.DateTimeFormat('en-US', { year: 'numeric', month: 'long', day: 'numeric' }).format(new Date());
}

/**
 * Generate the Snapshot report PDF for one user, transiently.
 * @param {object}  args
 * @param {object}  args.inp           the tool's input field map (getCalc input shape)
 * @param {object} [args.calc]         getCalc(inp) output; recomputed from inp if omitted
 * @param {string} [args.preparedDate] display date (defaults to today, long form)
 * @returns {Promise<Buffer>} the 5-page Letter PDF
 */
export async function generatePensionSnapshotPdf({ inp, calc, preparedDate } = {}) {
  if (!inp) throw new Error('generatePensionSnapshotPdf: `inp` (the tool inputs) is required.');
  registerBlueprintFonts();
  const c = calc || getCalc(inp);
  const model = buildSnapshotModel({ inp, calc: c, preparedDate: preparedDate || defaultPreparedDate() });
  return renderToBuffer(React.createElement(SnapshotReportDocument, { model }));
}
