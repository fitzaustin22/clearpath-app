// @vitest-environment node
//
// NUMERAL-SPACING REGRESSION GUARD (the F1 redesign "17.10%"/"$227,048.00" compression).
//
// The bundled VARIABLE Inter exposes a `kern` GPOS feature whose digit↔punctuation
// pairs over-tighten — a "7" before "." is pulled in ~0.25em, jamming numeric
// values like "17.10%", "$227,048.00", "$4,100.00", "62.04%". react-pdf 4.x calls
// `font.layout(string, undefined, …)` (no feature control) and offers no per-style
// OpenType toggle, so the only lever is the font file: the fix neuters Inter's
// `kern` feature. After the fix the content stream carries NO compressing (large
// positive) per-glyph adjustments for these numerals.
//
// This renders the exact compressed values through react-pdf's Node build in
// plain Inter (no letterSpacing — so every TJ adjustment in the run originates
// from the font's kerning, not from tracking) and reads the adjustments straight
// out of the content stream (see pdfGlyphProbe.summarizeTextKerning).
//
// FAILS-BEFORE / PASSES-AFTER: against the un-neutered Inter, the run carries
// large positive (tightening) adjustments → FAIL. With `kern` neutered → no
// tightening → PASS.

import { describe, it, expect, beforeAll } from 'vitest';
import React from 'react';
import { Document, Page, Text, View, renderToBuffer } from '@react-pdf/renderer';
import { registerBlueprintFonts } from '../registerFonts.js';
import { summarizeTextKerning } from './pdfGlyphProbe.js';

const h = React.createElement;

// Every numeric value class the document shows: a percentage (rate), a large
// projected currency value, smaller currency values, and a coverture percent —
// the four classes the F1 sample compressed. Rendered with NO letterSpacing so
// the only horizontal adjustments are the font's own kerning.
const NUMERALS = '17.10%  62.04%  9.79%  $227,048.00  $4,100.00  $16,100.00  $365,975.00';

function NumeralDoc() {
  return h(
    Document,
    null,
    h(
      Page,
      { size: 'LETTER', style: { padding: 48 } },
      h(View, null, h(Text, { style: { fontFamily: 'Inter', fontWeight: 500, fontSize: 12 } }, NUMERALS)),
    ),
  );
}

describe('numeral-spacing regression — values render uncompressed (no kern tightening)', () => {
  let kerning;
  beforeAll(async () => {
    registerBlueprintFonts();
    const buffer = await renderToBuffer(h(NumeralDoc));
    kerning = summarizeTextKerning(buffer);
  });

  it('emits a text run with positioning data (probe sees the numerals)', () => {
    expect(kerning.adjustments.length, JSON.stringify(kerning)).toBeGreaterThan(0);
  });

  it('applies NO compressing (positive) per-glyph adjustment to the numerals', () => {
    // A correct render leaves digits at their nominal advance: any non-trivial
    // positive TJ adjustment is the kern bug pulling glyphs together. Allow a
    // sub-unit rounding epsilon (positions are emitted in 1/1000 em ×size scale).
    expect(
      kerning.maxPositive,
      `numerals are kern-compressed — max tightening adjustment ${kerning.maxPositive}. ${JSON.stringify(kerning.adjustments)}`,
    ).toBeLessThanOrEqual(1);
  });
});
