// src/lib/blueprint/pdf/registerFonts.js
//
// Registers the brand typefaces for the Attorney Blueprint PDF. The README
// prefers static Google-Fonts instances; static instances are not bundled, so
// we register the design system's variable TTFs (committed under ./fonts).
// react-pdf renders the brand shapes from these; weight differentiation is
// approximate on a variable axis (a documented react-pdf limitation — a Cat-6
// cosmetic, not a content/compliance issue). Production (Vercel) export wiring
// is the D-V2-1 Phase 4 item; this registration targets the headless render
// path used by the harness and A5-M.
//
// FONT-FILE MODIFICATION — Inter.ttf / Inter-Italic.ttf have their GPOS `kern`
// feature neutered (lookup lists emptied via fontTools). The bundled variable
// Inter shipped a `kern` table whose digit↔punctuation pairs over-tighten under
// fontkit (a "7" before "." pulled in ~0.25em), which rendered numeric VALUES
// compressed ("17.10%", "$227,048.00"). react-pdf 4.x calls
// `font.layout(string, undefined, …)` and exposes no per-style OpenType toggle,
// so the font file is the only lever. Neutering `kern` restores nominal digit
// advances everywhere; the imperceptible loss of letter kerning at body sizes is
// the accepted trade. Guarded by renderer.numerals.test.js. (Playfair's ligature
// GSUB is intentionally LEFT INTACT — its fi/ff headings paint every letter
// through the Node build; see renderer.paint.test.js.)
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { Font } from '@react-pdf/renderer';

const FONT_DIR = path.join(path.dirname(fileURLToPath(import.meta.url)), 'fonts');
const f = (file) => path.join(FONT_DIR, file);

let registered = false;

/** Register the brand fonts once (idempotent across multiple renders). */
export function registerBlueprintFonts() {
  if (registered) return;
  registered = true;

  Font.register({
    family: 'Inter',
    fonts: [
      { src: f('Inter.ttf'), fontWeight: 400 },
      { src: f('Inter.ttf'), fontWeight: 500 },
      { src: f('Inter.ttf'), fontWeight: 600 },
      { src: f('Inter.ttf'), fontWeight: 700 },
      { src: f('Inter-Italic.ttf'), fontWeight: 400, fontStyle: 'italic' },
    ],
  });
  Font.register({ family: 'Playfair', fonts: [{ src: f('PlayfairDisplay.ttf'), fontWeight: 700 }] });
  Font.register({ family: 'Newsreader', fonts: [{ src: f('Newsreader.ttf'), fontWeight: 700 }] });

  // Hyphenation off — the document is set ragged-right with controlled line
  // breaks; react-pdf's default hyphenation would split case names and figures.
  Font.registerHyphenationCallback((word) => [word]);
}
