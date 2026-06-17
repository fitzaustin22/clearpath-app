// src/lib/blueprint/pdf/renderAttorneyBlueprint.js
//
// Headless render entry for the Attorney Blueprint PDF. Consumes the document
// model (R1) + presentation opts and returns a PDF Buffer. Used by the
// deterministic A4 PDF-level harness and the A5-M adversarial loop. Production
// export wiring (entitlement gate, response stream) is the D-V2-1 Phase 4 item.
//
// ⚠ MUST run through react-pdf's Node build — call it from plain Node or a
// server runtime (Next.js route handler / server action), never from a jsdom
// test environment, where react-pdf resolves its browser build and embeds empty
// .notdef glyph subsets (the 2026-06-17 dotted-glyph sample). Tests that assert
// painted output pin `// @vitest-environment node`; see registerFonts.js and
// renderer.paint.test.js. The model is built separately (component-driven, so
// jsdom) and passed in here — keep that split when wiring the export.
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
