// src/lib/blueprint/pdf/__tests__/pdfGlyphProbe.js
//
// Dependency-free PDF glyph-paint probe used by the render-paint regression
// suite (renderer.paint.test.js). It answers ONE question about a generated
// PDF buffer: do the embedded TrueType subsets actually contain drawable glyph
// outlines, or are the glyphs empty (.notdef) so text paints as boxes/dots?
//
// WHY THIS EXISTS — the F1 attorney sample (2026-06-17) shipped with every
// glyph rendered as a .notdef box. Root cause: the PDF was generated through
// @react-pdf/renderer's *browser* build (Vitest resolves it under the jsdom
// test environment via the `browser` package.json field). That build emits
// embedded font subsets whose `glyf` entries are empty — the page content
// streams still position text, but no outlines are drawn. The Node build (used
// by plain Node and production server-side rendering) subsets correctly.
//
// The A4 renderer test only asserted `%PDF-` magic + buffer length, which a
// notdef-only PDF satisfies — so the dots passed silently. This probe inspects
// the embedded `glyf`/`loca` tables directly so a glyphs-not-painting failure
// is caught.
//
// Detection mechanism (no font library — react-pdf's `fontkit` is only a
// transitive dep, too unstable to import in a committed test):
//   1. Walk PDF objects, find every /FontFile2 (embedded TrueType) stream,
//      resolve its (possibly indirect) /Length, inflate if FlateDecode.
//   2. Read the sfnt table directory → loca + glyf + head + maxp.
//   3. For each glyph, read its `glyf` entry's numberOfContours. A glyph with
//      numberOfContours !== 0 has real (simple or composite) outlines. An
//      empty loca span (or numberOfContours === 0) is a non-painting glyph.
//   4. A broken browser-build embed also dumps the FULL font (numGlyphs in the
//      thousands) with a truncated loca — flagged as `malformedFullFontDump`.
//
// Observed separation (F1): a correct Node render yields ~181 glyphs-with-
// contours across small (~30–110 glyph) subsets, each ~98% painted; the broken
// jsdom render yields ≤17 and carries a ~13.6k-glyph truncated dump.

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
 * @returns {{numGlyphs:number, withContours:number, malformedFullFontDump:boolean, reason:string}}
 */
export function glyphContourStats(program) {
  const dir = tableDirectory(program);
  if (!dir || !dir.loca || !dir.glyf || !dir.head || !dir.maxp) {
    return { numGlyphs: 0, withContours: 0, malformedFullFontDump: false, reason: 'missing-tables' };
  }
  if (dir.maxp.off + 6 > program.length || dir.head.off + 52 > program.length) {
    return { numGlyphs: 0, withContours: 0, malformedFullFontDump: false, reason: 'header-oob' };
  }
  const numGlyphs = program.readUInt16BE(dir.maxp.off + 4);
  const longLoca = program.readInt16BE(dir.head.off + 50) !== 0; // indexToLocFormat
  const entry = longLoca ? 4 : 2;
  // A correctly subset face is small; the broken browser build dumps the whole
  // font (thousands of glyphs) with a loca that runs past the (tiny) program.
  if (dir.loca.off + (numGlyphs + 1) * entry > program.length) {
    return { numGlyphs, withContours: 0, malformedFullFontDump: numGlyphs > 1000, reason: 'loca-truncated' };
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
  return { numGlyphs, withContours, malformedFullFontDump: numGlyphs > 1000, reason: 'ok' };
}

/**
 * High-level summary for assertions.
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
