// src/lib/blueprint/pdf/__tests__/pdfGlyphProbe.js
//
// Dependency-free PDF glyph probe used by the render-paint regression suite
// (renderer.paint.test.js). It answers questions about a generated PDF buffer
// WITHOUT a font library (react-pdf's `fontkit` is only a transitive dep, too
// unstable to import in a committed test):
//
//   1. Glyph PAINTING — do the embedded TrueType subsets contain drawable glyph
//      outlines, or are the glyphs empty (.notdef) so text paints as boxes/dots?
//      (summarizeGlyphPainting / glyphContourStats)
//   2. Glyph SPACING — what per-glyph horizontal adjustments (kerning) does the
//      content stream apply? A run whose digits are pulled together by large
//      positive TJ adjustments renders visually compressed.
//      (summarizeTextKerning)
//
// WHY THE PAINTING PROBE EXISTS — the F1 attorney sample (2026-06-17) shipped
// with every glyph rendered as a .notdef box. Root cause: the PDF was generated
// through @react-pdf/renderer's *browser* build (Vitest resolves it under the
// jsdom test environment via the `browser` package.json field). That build emits
// embedded font subsets whose `glyf` entries are empty — the page content
// streams still position text, but no outlines are drawn. The Node build (used
// by plain Node and production server-side rendering) subsets correctly.
//
// WHY THE SPACING PROBE EXISTS — the F1 redesign render (2026-06-18) rendered
// numeric values compressed/cramped (e.g. "17.10%", "$227,048.00"). Root cause:
// the bundled VARIABLE Inter exposes a `kern` GPOS feature whose digit↔punctuation
// pairs over-tighten (a "7" before "." pulled in ~0.25em). react-pdf 4.x applies
// the font's default features unconditionally (`font.layout(string, undefined,…)`)
// and exposes no per-style feature toggle, so the only lever is the font file —
// the fix neuters the `kern` feature, after which the content stream carries no
// compressing adjustments. This probe reads those adjustments straight from the
// (inflated) content stream so the compression is caught at the render layer.
//
// Detection mechanism for painting:
//   1. Walk PDF objects, find every /FontFile2 (embedded TrueType) stream,
//      resolve its (possibly indirect) /Length, inflate if FlateDecode.
//   2. Read the sfnt table directory → loca + glyf + head + maxp.
//   3. For each glyph, read its `glyf` entry's numberOfContours. A glyph with
//      numberOfContours !== 0 has real (simple or composite) outlines. An
//      empty loca span (or numberOfContours === 0) is a non-painting glyph.
//   4. A broken browser-build embed also dumps the FULL font (numGlyphs in the
//      thousands) with a truncated loca — flagged as `malformedFullFontDump`.

import zlib from 'node:zlib';

function parseObjects(latin) {
  const objs = {};
  const re = /(\d+)\s+(\d+)\s+obj\b/g;
  let m;
  while ((m = re.exec(latin))) objs[+m[1]] = { hdrEnd: re.lastIndex };
  for (const k in objs) objs[k].endobj = latin.indexOf('endobj', objs[k].hdrEnd);
  return objs;
}

function dictOf(latin, o) {
  const s = latin.indexOf('stream', o.hdrEnd);
  const end = s > -1 && s < o.endobj ? s : o.endobj;
  return latin.slice(o.hdrEnd, end);
}

function resolveLength(latin, objs, dict) {
  let m = dict.match(/\/Length\s+(\d+)\s+0\s+R/);
  if (m && objs[+m[1]]) {
    const t = objs[+m[1]];
    const mm = latin.slice(t.hdrEnd, t.endobj).match(/(\d+)/);
    return mm ? parseInt(mm[1], 10) : null;
  }
  m = dict.match(/\/Length\s+(\d+)/);
  return m ? parseInt(m[1], 10) : null;
}

function streamBytes(latin, objs, o) {
  const s = latin.indexOf('stream', o.hdrEnd);
  if (s < 0 || s > o.endobj) return null;
  let ds = s + 'stream'.length;
  if (latin[ds] === '\r') ds++;
  if (latin[ds] === '\n') ds++;
  const dict = dictOf(latin, o);
  const len = resolveLength(latin, objs, dict);
  const raw =
    len != null
      ? Buffer.from(latin.slice(ds, ds + len), 'latin1')
      : Buffer.from(latin.slice(ds, latin.indexOf('endstream', ds)), 'latin1');
  return { dict, raw };
}

function tableDirectory(prog) {
  if (prog.length < 12) return null;
  const numTables = prog.readUInt16BE(4);
  const dir = {};
  let off = 12;
  for (let i = 0; i < numTables; i++) {
    if (off + 16 > prog.length) break;
    dir[prog.slice(off, off + 4).toString('latin1')] = {
      off: prog.readUInt32BE(off + 8),
      len: prog.readUInt32BE(off + 12),
    };
    off += 16;
  }
  return dir;
}

/**
 * @param {Buffer} buffer  a generated PDF
 * @returns {{program: Buffer, obj: number}[]} embedded TrueType font programs
 */
export function extractEmbeddedTrueTypeFonts(buffer) {
  const latin = buffer.toString('latin1');
  const objs = parseObjects(latin);
  const nums = [...latin.matchAll(/\/FontFile2\s+(\d+)\s+0\s+R/g)].map((m) => +m[1]);
  const out = [];
  for (const n of nums) {
    const o = objs[n];
    if (!o) continue;
    const s = streamBytes(latin, objs, o);
    if (!s) continue;
    let program;
    try {
      program = /\/FlateDecode/.test(s.dict) ? zlib.inflateSync(s.raw) : s.raw;
    } catch {
      continue;
    }
    out.push({ obj: n, program });
  }
  return out;
}

/**
 * Inspect one embedded TrueType program's glyph outlines.
 * @returns {{numGlyphs:number, withContours:number, emptyGlyphs:number, malformedFullFontDump:boolean, reason:string}}
 */
export function glyphContourStats(program) {
  const dir = tableDirectory(program);
  if (!dir || !dir.loca || !dir.glyf || !dir.head || !dir.maxp) {
    return { numGlyphs: 0, withContours: 0, emptyGlyphs: 0, malformedFullFontDump: false, reason: 'missing-tables' };
  }
  if (dir.maxp.off + 6 > program.length || dir.head.off + 52 > program.length) {
    return { numGlyphs: 0, withContours: 0, emptyGlyphs: 0, malformedFullFontDump: false, reason: 'header-oob' };
  }
  const numGlyphs = program.readUInt16BE(dir.maxp.off + 4);
  const longLoca = program.readInt16BE(dir.head.off + 50) !== 0; // indexToLocFormat
  const entry = longLoca ? 4 : 2;
  // A correctly subset face is small; the broken browser build dumps the whole
  // font (thousands of glyphs) with a loca that runs past the (tiny) program.
  if (dir.loca.off + (numGlyphs + 1) * entry > program.length) {
    return { numGlyphs, withContours: 0, emptyGlyphs: numGlyphs, malformedFullFontDump: numGlyphs > 1000, reason: 'loca-truncated' };
  }
  const locaAt = (i) => {
    const at = dir.loca.off + i * entry;
    return longLoca ? program.readUInt32BE(at) : program.readUInt16BE(at) * 2;
  };
  let withContours = 0;
  for (let i = 0; i < numGlyphs; i++) {
    const start = locaAt(i);
    const end = locaAt(i + 1);
    if (end <= start) continue; // empty glyph (space / .notdef)
    const goff = dir.glyf.off + start;
    if (goff + 2 > program.length) continue;
    if (program.readInt16BE(goff) !== 0) withContours++; // numberOfContours != 0 → real outline
  }
  return { numGlyphs, withContours, emptyGlyphs: numGlyphs - withContours, malformedFullFontDump: numGlyphs > 1000, reason: 'ok' };
}

/**
 * High-level glyph-painting summary for assertions.
 * @param {Buffer} buffer  a generated PDF
 */
export function summarizeGlyphPainting(buffer) {
  const baseFonts = [
    ...new Set(
      [...buffer.toString('latin1').matchAll(/\/BaseFont\s*\/([A-Za-z0-9+,_\-]+)/g)].map((m) => m[1]),
    ),
  ];
  const fonts = extractEmbeddedTrueTypeFonts(buffer).map((f) => ({ obj: f.obj, ...glyphContourStats(f.program) }));
  return {
    baseFonts,
    embeddedFontCount: fonts.length,
    totalGlyphsWithContours: fonts.reduce((s, f) => s + f.withContours, 0),
    hasMalformedFullFontDump: fonts.some((f) => f.malformedFullFontDump || f.reason === 'loca-truncated'),
    fonts,
  };
}

// ── Glyph SPACING (kerning) probe ───────────────────────────────────────────
//
// Pull the per-glyph horizontal adjustments out of the page content streams.
// In a CID (Identity-H) text run the show operator is a TJ array interleaving
// hex glyph strings with numeric adjustments, e.g. `[<00AB> 50.78 <00CD>] TJ`.
// PDF convention: a POSITIVE TJ number subtracts from the horizontal position →
// pulls the NEXT glyph LEFT (tightens). A negative number adds space (the form
// react-pdf uses for `letterSpacing`). So a compressing kern shows up as a large
// positive adjustment; tracked/letter-spaced labels show up as negatives.

function inflatedContentStreams(buffer) {
  const latin = buffer.toString('latin1');
  const objs = parseObjects(latin);
  const streams = [];
  for (const k of Object.keys(objs)) {
    const s = streamBytes(latin, objs, objs[k]);
    if (!s) continue;
    let prog;
    try {
      prog = /\/FlateDecode/.test(s.dict) ? zlib.inflateSync(s.raw) : s.raw;
    } catch {
      continue;
    }
    const text = prog.toString('latin1');
    // A page content stream draws text: it contains BT…ET with a font select.
    if (text.includes('BT') && /\bTf\b/.test(text) && text.includes('Tj')) streams.push(text);
    else if (text.includes('BT') && /\bTf\b/.test(text) && /\]\s*TJ/.test(text)) streams.push(text);
  }
  return streams;
}

/**
 * Extract every numeric TJ adjustment across a PDF's content streams.
 * @param {Buffer} buffer  a generated PDF
 * @returns {{adjustments:number[], maxPositive:number, maxNegative:number}}
 *   maxPositive is the largest tightening (compression) adjustment seen;
 *   0 when no TJ arrays carry adjustments.
 */
export function summarizeTextKerning(buffer) {
  const adjustments = [];
  for (const text of inflatedContentStreams(buffer)) {
    for (const m of text.matchAll(/\[((?:[^\[\]])*)\]\s*TJ/g)) {
      const body = m[1];
      // Strip hex glyph strings (<....>) and parenthesised strings, leaving the
      // numeric kern/space adjustments.
      const nums = body.replace(/<[0-9A-Fa-f\s]*>/g, ' ').replace(/\([^)]*\)/g, ' ');
      for (const t of nums.split(/\s+/)) {
        if (t && /^-?\d+\.?\d*$/.test(t)) adjustments.push(parseFloat(t));
      }
    }
  }
  const positives = adjustments.filter((a) => a > 0);
  const negatives = adjustments.filter((a) => a < 0);
  return {
    adjustments,
    maxPositive: positives.length ? Math.max(...positives) : 0,
    maxNegative: negatives.length ? Math.min(...negatives) : 0,
  };
}
