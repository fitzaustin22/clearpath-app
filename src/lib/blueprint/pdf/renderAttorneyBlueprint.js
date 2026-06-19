// src/lib/blueprint/pdf/renderAttorneyBlueprint.js
//
// Headless render entry for the Attorney Blueprint PDF. Consumes the document
// model (R1) + presentation opts and returns a PDF Buffer. Used by the
// deterministic A4 PDF-level harness and the A5-M adversarial loop. Production
// export wiring (entitlement gate, response stream) is the D-V2-1 Phase 4 item.
import React from 'react';
import { renderToBuffer } from '@react-pdf/renderer';
import {
  AttorneyBlueprintDocument,
  buildRenderPlan,
  collectRenderableStrings,
  sortCitationsByJurisdiction,
} from './AttorneyBlueprintDocument';

/**
 * @param {object} model  buildDocumentModel(...) output
 * @param {object} opts   { clientName, preparedDate, variants } — presentation only
 * @returns {Promise<Buffer>} the generated PDF
 *
 * Two-pass render so the Table of Contents carries accurate page numbers. BOTH
 * passes render the full document structure — the Contents page (blank numbers
 * in pass 1) and the invisible per-heading capture nodes are present in each —
 * so the two passes lay out identically. Pass 1 records each heading's page;
 * pass 2 reprints with those exact numbers. No offset is applied: because the
 * Contents page is already present (and counted) in pass 1, a captured page IS
 * the final page (and this stays correct even if the Contents spans >1 page,
 * which a fixed +1 offset could not).
 */
export async function renderAttorneyBlueprint(model, opts = {}) {
  const pageMap = {};
  const pass1Opts = { ...opts, tocPages: null, capturePage: (key, page) => { pageMap[key] = page; } };
  await renderToBuffer(React.createElement(AttorneyBlueprintDocument, { model, opts: pass1Opts }));
  const tocPages = { ...pageMap };
  const pass2Opts = { ...opts, tocPages, capturePage: null };
  return renderToBuffer(React.createElement(AttorneyBlueprintDocument, { model, opts: pass2Opts }));
}

/**
 * Test/diagnostic audit of TOC page-number accuracy. Runs the same pass-1 capture
 * the renderer uses to build the printed numbers, then renders the FINAL layout
 * (with those numbers) while ALSO capturing each heading's actual page. Because
 * the capture nodes render identically whether or not they capture, the final
 * layout here is structurally identical to the shipped PDF — so `actualPages`
 * are the pages the shipped Contents prints on. A correct two-pass yields
 * tocPages === actualPages for every entry.
 * @returns {Promise<{tocPages: Object<string,number>, actualPages: Object<string,number>}>}
 */
export async function auditTocPageNumbers(model, opts = {}) {
  const pass1 = {};
  await renderToBuffer(
    React.createElement(AttorneyBlueprintDocument, {
      model,
      opts: { ...opts, tocPages: null, capturePage: (key, page) => { pass1[key] = page; } },
    }),
  );
  const tocPages = { ...pass1 };
  const actualPages = {};
  await renderToBuffer(
    React.createElement(AttorneyBlueprintDocument, {
      model,
      opts: { ...opts, tocPages, capturePage: (key, page) => { actualPages[key] = page; } },
    }),
  );
  return { tocPages, actualPages };
}

export { buildRenderPlan, collectRenderableStrings, sortCitationsByJurisdiction };
