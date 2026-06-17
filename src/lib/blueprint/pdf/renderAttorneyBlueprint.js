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
 */
export function renderAttorneyBlueprint(model, opts = {}) {
  return renderToBuffer(React.createElement(AttorneyBlueprintDocument, { model, opts }));
}

export { buildRenderPlan, collectRenderableStrings };
