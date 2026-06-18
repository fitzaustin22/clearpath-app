// @vitest-environment node
//
// TEXT-LAYER / SEARCHABILITY GUARD (the heading fi/ff ligatures must copy & search
// as their component letters — "Profile"/"Offer", not "Profle"/"Ofer").
//
// The display headings render the fi/ff ligatures as single glyphs (correct
// typography). For an attorney document, copy/paste and full-text search must
// still return every letter. react-pdf builds the PDF `/ToUnicode` CMap from
// fontkit's `glyph.codePoints`, which carry the ligature's components
// (fi → [U+0066,U+0069]); it writes them SPACE-SEPARATED (`<0016><0066 0069>`).
// This asserts the *text layer* (not just the painted glyphs) round-trips every
// letter — decoded straight from the embedded `/ToUnicode` (pdfTextProbe), which
// is exactly what a PDF reader's copy/search uses.
//
// FAILS-IF: a font/react-pdf change drops the ligature `/ToUnicode` mapping (the
// glyph would still paint, but copy/search would yield "Profle"/"Ofer").

import { describe, it, expect, beforeAll } from 'vitest';
import React from 'react';
import { Document, Page, Text, renderToBuffer } from '@react-pdf/renderer';
import payload from '../../../../test/fixtures/v2-golden/F1.documentModel.json';
import { renderAttorneyBlueprint } from '../renderAttorneyBlueprint.js';
import { registerBlueprintFonts } from '../registerFonts.js';
import { extractAllText } from './pdfTextProbe.js';

const h = React.createElement;

describe('text-layer searchability — heading ligatures copy/search as every letter', () => {
  let f1Text;
  let ligText;
  beforeAll(async () => {
    const f1 = await renderAttorneyBlueprint(payload.model, payload.opts);
    f1Text = extractAllText(f1);

    registerBlueprintFonts();
    const probe = h(
      Document,
      null,
      h(Page, { size: 'LETTER', style: { padding: 40 } },
        h(Text, { style: { fontFamily: 'Playfair', fontWeight: 700, fontSize: 24 } }, 'fi fl ff ffi')),
    );
    ligText = extractAllText(await renderToBuffer(probe));
  }, 60000);

  it('F1 §1 heading extracts as "Personal Profile" (fi round-trips)', () => {
    expect(f1Text, 'extracted text missing full "Personal Profile"').toContain('Personal Profile');
    expect(f1Text).not.toMatch(/Profle/);
  });

  it('F1 §11 heading extracts as "Settlement Offer Overview" (ff round-trips)', () => {
    expect(f1Text, 'extracted text missing full "Settlement Offer Overview"').toContain('Settlement Offer Overview');
    expect(f1Text).not.toMatch(/\bOfer\b/);
  });

  it('fi/fl/ff/ffi all round-trip to their component letters in the text layer', () => {
    const norm = ligText.replace(/\s+/g, ' ').trim();
    expect(norm, `ligature probe extracted as "${norm}"`).toBe('fi fl ff ffi');
  });
});
