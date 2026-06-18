// src/lib/blueprint/pdf/__tests__/pdfTextProbe.js
//
// Dependency-free extractor that answers "on which rendered page does each
// section/appendix TITLE actually appear?" — the independent ground truth the
// TOC page-number assertion (renderer.toc.test.js) cross-checks against.
//
// It does NOT trust the renderer's own page-capture hook (the very thing under
// test). Instead it reads the generated PDF directly: section/supplement/appendix
// titles are the only text drawn in the `sectionTitle` style (a unique 20.25pt
// face), so this walks each page's content stream, isolates the 20.25pt text
// runs, and decodes their CID glyph strings to characters via that font's
// /ToUnicode CMap. The result is the real, as-laid-out page each heading prints
// on — captured independently of the two-pass capture mechanism.

import zlib from 'node:zlib';

const TITLE_FONT_SIZE = '20.25'; // tokens.sectionTitle.fontSize — titles only

function objectIndex(latin) {
  const objs = {};
  const re = /(\d+)\s+(\d+)\s+obj\b/g;
  let m;
  while ((m = re.exec(latin))) {
    const num = +m[1];
    const start = re.lastIndex;
    const end = latin.indexOf('endobj', start);
    objs[num] = { start, end, body: latin.slice(start, end) };
  }
  return objs;
}

function streamData(latin, objs, num) {
  const o = objs[num];
  if (!o) return null;
  const s = latin.indexOf('stream', o.start);
  if (s < 0 || s > o.end) return null;
  let ds = s + 'stream'.length;
  if (latin[ds] === '\r') ds++;
  if (latin[ds] === '\n') ds++;
  const dict = latin.slice(o.start, s);
  let len = null;
  let mm = dict.match(/\/Length\s+(\d+)\s+0\s+R/);
  if (mm && objs[+mm[1]]) {
    const v = objs[+mm[1]].body.match(/(\d+)/);
    len = v ? parseInt(v[1], 10) : null;
  } else {
    mm = dict.match(/\/Length\s+(\d+)/);
    len = mm ? parseInt(mm[1], 10) : null;
  }
  const raw =
    len != null
      ? Buffer.from(latin.slice(ds, ds + len), 'latin1')
      : Buffer.from(latin.slice(ds, latin.indexOf('endstream', ds)), 'latin1');
  let prog = raw;
  if (/\/FlateDecode/.test(dict)) {
    try {
      prog = zlib.inflateSync(raw);
    } catch {
      return null;
    }
  }
  return { dict, prog };
}

// Parse a /ToUnicode CMap stream into a CID(int)→string map.
// A LIGATURE glyph maps to MULTIPLE code points, which @react-pdf/pdfkit writes
// SPACE-SEPARATED inside the destination angle brackets, e.g. `<0016><0066 0069>`
// (fi → "fi"). The dst pattern must therefore admit whitespace, and the UTF-16
// decode must strip it before chunking — otherwise ligature entries are silently
// dropped and their text extracts as empty ("Profle"/"Ofer").
function parseToUnicode(text) {
  const map = {};
  const hexU16 = (h) => {
    const clean = h.replace(/\s+/g, '');
    let out = '';
    for (let i = 0; i + 4 <= clean.length; i += 4) out += String.fromCharCode(parseInt(clean.slice(i, i + 4), 16));
    return out;
  };
  for (const block of text.matchAll(/beginbfchar([\s\S]*?)endbfchar/g)) {
    for (const m of block[1].matchAll(/<([0-9A-Fa-f]+)>\s*<([0-9A-Fa-f\s]*)>/g)) {
      map[parseInt(m[1], 16)] = hexU16(m[2]);
    }
  }
  for (const block of text.matchAll(/beginbfrange([\s\S]*?)endbfrange/g)) {
    for (const m of block[1].matchAll(/<([0-9A-Fa-f]+)>\s*<([0-9A-Fa-f]+)>\s*<([0-9A-Fa-f\s]+)>/g)) {
      const lo = parseInt(m[1], 16);
      const hi = parseInt(m[2], 16);
      const dst = parseInt(m[3].replace(/\s+/g, '').slice(0, 4), 16); // base code point of the range
      for (let c = lo; c <= hi; c++) map[c] = String.fromCharCode(dst + (c - lo));
    }
  }
  return map;
}

// Page object numbers in document order (walk /Pages → /Kids).
function pageOrder(latin, objs) {
  const pagesObj = Object.keys(objs).find((n) => /\/Type\s*\/Pages\b/.test(objs[n].body));
  if (!pagesObj) return [];
  const kids = objs[pagesObj].body.match(/\/Kids\s*\[([^\]]*)\]/);
  if (!kids) return [];
  return [...kids[1].matchAll(/(\d+)\s+0\s+R/g)].map((m) => +m[1]);
}

// For a page object, map its /Fxx resource names → that font's CID→unicode map.
function pageFontMaps(latin, objs, pageNum) {
  const body = objs[pageNum].body;
  let resBody = body;
  const resRef = body.match(/\/Resources\s+(\d+)\s+0\s+R/);
  if (resRef && objs[+resRef[1]]) resBody = objs[+resRef[1]].body;
  const fontDict = resBody.match(/\/Font\s*<<([\s\S]*?)>>/);
  const maps = {};
  if (!fontDict) return maps;
  for (const m of fontDict[1].matchAll(/\/(F\d+)\s+(\d+)\s+0\s+R/g)) {
    const fontObj = objs[+m[2]];
    if (!fontObj) continue;
    // Type0 font → /ToUnicode directly, or via its descendant. react-pdf puts
    // /ToUnicode on the Type0 font object.
    let tu = fontObj.body.match(/\/ToUnicode\s+(\d+)\s+0\s+R/);
    if (!tu) continue;
    const tuStream = streamData(latin, objs, +tu[1]);
    if (!tuStream) continue;
    maps[m[1]] = parseToUnicode(tuStream.prog.toString('latin1'));
  }
  return maps;
}

function decodeHex(hex, cmap) {
  let out = '';
  for (let i = 0; i + 4 <= hex.length; i += 4) {
    const cid = parseInt(hex.slice(i, i + 4), 16);
    out += cmap[cid] != null ? cmap[cid] : '';
  }
  return out;
}

// Text drawn on one page's content stream. `sizeFilter` (a Tf size string)
// restricts decoding to runs at that font size; null decodes every run.
function decodeTextOnPage(prog, fontMaps, sizeFilter) {
  const text = prog.toString('latin1');
  let current = null; // current font's cmap when the run is in scope
  let out = '';
  // Tokenise on the operators we care about: `/Fx SIZE Tf`, `<hex> Tj`, `[..] TJ`.
  const op = /\/(F\d+)\s+([\d.]+)\s+Tf|<([0-9A-Fa-f]+)>\s*Tj|\[([^\]]*)\]\s*TJ/g;
  let m;
  while ((m = op.exec(text))) {
    if (m[1] !== undefined) {
      const inScope = sizeFilter == null || m[2] === sizeFilter;
      current = inScope ? fontMaps[m[1]] || null : null;
    } else if (current) {
      if (m[3] !== undefined) out += decodeHex(m[3], current);
      else if (m[4] !== undefined) {
        for (const h of m[4].matchAll(/<([0-9A-Fa-f]+)>/g)) out += decodeHex(h[1], current);
        out += ' ';
      }
    }
  }
  return out;
}

// Decode a buffer's per-page text, optionally restricted to one Tf size.
function decodePages(buffer, sizeFilter) {
  const latin = buffer.toString('latin1');
  const objs = objectIndex(latin);
  const order = pageOrder(latin, objs);
  const pages = [];
  order.forEach((pageNum, idx) => {
    const o = objs[pageNum];
    if (!o) return;
    const contentRefs = [];
    const single = o.body.match(/\/Contents\s+(\d+)\s+0\s+R/);
    const arr = o.body.match(/\/Contents\s*\[([^\]]*)\]/);
    if (single) contentRefs.push(+single[1]);
    else if (arr) for (const c of arr[1].matchAll(/(\d+)\s+0\s+R/g)) contentRefs.push(+c[1]);
    const fontMaps = pageFontMaps(latin, objs, pageNum);
    let txt = '';
    for (const cref of contentRefs) {
      const sd = streamData(latin, objs, cref);
      if (sd) txt += decodeTextOnPage(sd.prog, fontMaps, sizeFilter);
    }
    txt = txt.replace(/\s+/g, ' ').trim();
    if (txt) pages.push({ page: idx + 1, text: txt });
  });
  return pages;
}

/**
 * @param {Buffer} buffer  a generated PDF
 * @returns {{page:number, title:string}[]}  every title-styled run, with the
 *   1-based page it renders on (cover = page 1).
 */
export function extractTitleRuns(buffer) {
  return decodePages(buffer, TITLE_FONT_SIZE).map(({ page, text }) => ({ page, title: text }));
}

/**
 * Full decoded text of the PDF (every glyph run, all sizes), via /ToUnicode —
 * i.e. what copy/paste and search return. Used to assert the text layer is
 * correct (ligatures round-trip to their component letters), not just that the
 * glyphs paint.
 * @param {Buffer} buffer  a generated PDF
 * @returns {string}  the document's extractable text (pages space-joined)
 */
export function extractAllText(buffer) {
  return decodePages(buffer, null).map((p) => p.text).join(' ');
}

/**
 * Find the 1-based page each expected title renders on (by the title-styled run).
 * Substring match so "Tax Analysis" matches its title run and ignores Inter body
 * text (different font size, never collected here).
 * @param {Buffer} buffer
 * @param {string[]} titles  expected heading titles
 * @returns {Object<string, number|null>}
 */
export function headingPages(buffer, titles) {
  const runs = extractTitleRuns(buffer);
  const out = {};
  for (const t of titles) {
    const hit = runs.find((r) => r.title.includes(t));
    out[t] = hit ? hit.page : null;
  }
  return out;
}
