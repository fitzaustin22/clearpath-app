// @vitest-environment node
//
// RENDER-PAINT REGRESSION GUARD (the gap that let the F1 notdef sample pass A4).
//
// A4's existing renderer test asserts only `%PDF-` magic + buffer length — a PDF
// whose every glyph is an empty .notdef box satisfies both, which is exactly how
// the 2026-06-17 F1 attorney sample shipped as rows of dots. This suite renders
// the brand typefaces to a real PDF and asserts the embedded font subsets carry
// actual drawable glyph outlines (see pdfGlyphProbe.js for the mechanism).
//
// ── Why `@vitest-environment node` (this IS the fix) ────────────────────────
// The dots were NOT a font-file problem. @react-pdf/renderer (and @react-pdf/
// font, /pdfkit, /image, fontkit) ship a `browser` package.json field; under
// Vitest's default `jsdom` environment that browser build is resolved, and its
// font-subsetting emits empty `glyf` outlines → every glyph paints as .notdef.
// The committed VARIABLE fonts render perfectly through react-pdf's *Node* build
// (plain Node, and production server-side rendering). Forcing the Node build by
// pinning this file to the `node` environment is the fix.
//
// FAILS-BEFORE / PASSES-AFTER: remove the `// @vitest-environment node` line
// above and this suite renders under jsdom (the broken state) → the glyph-paint
// assertions FAIL. With the line (the fix) → they PASS. Demonstrated in the PR.
//
// What this CATCHES: any render that produces empty/notdef glyph subsets — the
// jsdom/browser-build regression, a corrupt or missing registered font file, or
// a registration that resolves to no drawable face.
// What this does NOT catch: correct glyphs at the wrong weight (a variable-axis
// fidelity concern, tracked separately), kerning/positioning, or content errors
// (those are covered by the A4 model/denylist suites).

import { describe, it, expect, beforeAll } from 'vitest';
import React from 'react';
import { Document, Page, Text, View, renderToBuffer } from '@react-pdf/renderer';
import { registerBlueprintFonts } from '../registerFonts.js';
import { summarizeGlyphPainting } from './pdfGlyphProbe.js';

const h = React.createElement;

// A representative document that exercises every registered face/weight the
// Attorney Blueprint uses: Playfair 700 (display), Inter 400/500/600/700 (body
// + labels), Inter italic 400 (case-name citations). Rich enough text that a
// healthy render embeds dozens of distinct outlined glyphs.
function SampleDoc() {
  return h(
    Document,
    null,
    h(
      Page,
      { size: 'LETTER', style: { padding: 48 } },
      h(View, null,
        h(Text, { style: { fontFamily: 'Playfair', fontWeight: 700, fontSize: 30 } }, 'ClearPath Financial Blueprint'),
        h(Text, { style: { fontFamily: 'Inter', fontWeight: 600, fontSize: 10, textTransform: 'uppercase', letterSpacing: 2 } }, 'Attorney Edition'),
        h(Text, { style: { fontFamily: 'Inter', fontWeight: 400, fontSize: 10, marginTop: 16 } }, 'Prepared for Margaret Carter — Jurisdiction: Maryland. The defined-benefit pension present value reflects the coverture fraction 0.6859 (214 of 312 months).'),
        h(Text, { style: { fontFamily: 'Inter', fontWeight: 700, fontSize: 10, marginTop: 12 } }, 'Marital share of present value: $487,340'),
        h(Text, { style: { fontFamily: 'Inter', fontWeight: 500, fontSize: 9, marginTop: 8 } }, 'Sensitivity (−100bp / +100bp): $512,003 / $464,118'),
        h(Text, { style: { fontFamily: 'Inter', fontStyle: 'italic', fontWeight: 400, fontSize: 9, marginTop: 8 } }, 'Deering v. Deering, 292 Md. 115 (1981).'),
      ),
    ),
  );
}

describe('render-paint regression — brand typefaces paint real glyphs', () => {
  let summary;
  beforeAll(async () => {
    registerBlueprintFonts();
    const buffer = await renderToBuffer(h(SampleDoc));
    summary = summarizeGlyphPainting(buffer);
  });

  it('runs through react-pdf’s Node build (not the jsdom/browser build)', () => {
    expect(typeof window).toBe('undefined');
  });

  it('embeds the brand typefaces as TrueType subsets', () => {
    expect(summary.embeddedFontCount).toBeGreaterThanOrEqual(2);
    const joined = summary.baseFonts.join(' ');
    expect(joined).toMatch(/Inter/);
    expect(joined).toMatch(/Playfair/);
  });

  it('does not emit a malformed full-font dump (the browser-build signature)', () => {
    expect(summary.hasMalformedFullFontDump, JSON.stringify(summary.fonts)).toBe(false);
  });

  it('paints real glyph outlines — NOT empty .notdef boxes', () => {
    // Broken (jsdom) renders yield <=17 glyphs-with-contours for this document;
    // a correct Node render yields ~150+. 60 is a wide, non-brittle floor.
    expect(
      summary.totalGlyphsWithContours,
      `glyphs-with-contours too low — text likely rendered as .notdef. ${JSON.stringify(summary.fonts)}`,
    ).toBeGreaterThan(60);
  });

  it('each embedded subset is mostly outlined (high contour ratio)', () => {
    for (const f of summary.fonts) {
      if (f.numGlyphs <= 4) continue; // tiny subset (e.g. digits-only) — skip ratio
      const ratio = f.withContours / f.numGlyphs;
      expect(ratio, `subset obj${f.obj} contour ratio ${ratio.toFixed(3)} ${JSON.stringify(f)}`).toBeGreaterThan(0.5);
    }
  });
});
