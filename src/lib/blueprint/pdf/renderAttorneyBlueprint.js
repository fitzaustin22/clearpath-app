// src/lib/blueprint/pdf/renderAttorneyBlueprint.js
//
// Headless render entry for the Attorney Blueprint PDF. Consumes the document
// model (R1) + presentation opts and returns a PDF Buffer. Used by the
// deterministic A4 PDF-level harness and the A5-M adversarial loop. Production
// export wiring (entitlement gate, response stream) is the D-V2-1 Phase 4 item.
import React from 'react';
import { renderToBuffer } from '@react-pdf/renderer';
import { AttorneyBlueprintDocument, buildRenderPlan, collectRenderableStrings } from './AttorneyBlueprintDocument';

/**
 * @param {object} model  buildDocumentModel(...) output
 * @param {object} opts   { clientName, preparedDate, variants } — presentation only
 * @returns {Promise<Buffer>} the generated PDF
 *
 * Two-pass render so the Table of Contents carries accurate page numbers:
 * pass 1 has no Contents page but each section/appendix heading records its
 * page via an invisible capture; pass 2 inserts the 1-page Contents and offsets
 * every captured page by +1 (the inserted page). The Contents page is bounded
 * to a single page, so the offset is uniform.
 */
export async function renderAttorneyBlueprint(model, opts = {}) {
  const pageMap = {};
  const pass1Opts = { ...opts, tocPages: null, capturePage: (key, page) => { pageMap[key] = page; } };
  await renderToBuffer(React.createElement(AttorneyBlueprintDocument, { model, opts: pass1Opts }));
  const tocPages = {};
  for (const key of Object.keys(pageMap)) tocPages[key] = pageMap[key] + 1;
  const pass2Opts = { ...opts, tocPages, capturePage: null };
  return renderToBuffer(React.createElement(AttorneyBlueprintDocument, { model, opts: pass2Opts }));
}

export { buildRenderPlan, collectRenderableStrings };
