// src/lib/blueprint/pdf/registerFonts.js
//
// Registers the brand typefaces for the Attorney Blueprint PDF from the design
// system's variable TTFs committed under ./fonts.
//
// ⚠ PDF generation MUST run through react-pdf's *Node* build (plain Node, and
// production server-side rendering). These variable fonts subset and paint
// correctly there — verified by rendering F1 in Node and rasterizing.
//
// They render as empty .notdef boxes ONLY through react-pdf's *browser* build,
// which Vitest resolves under the jsdom test environment via the `browser`
// package.json field on @react-pdf/{renderer,font,pdfkit,image} and fontkit.
// That — NOT the variable-vs-static font choice — is what made the 2026-06-17
// F1 sample ship as rows of dots. (Static instances of the SAME typefaces also
// render notdef under jsdom, so swapping fonts does not fix it.) Renderer tests
// that need painted glyphs must be pinned to `// @vitest-environment node`; see
// renderer.paint.test.js for the guard.
//
// The README's preference for static Google-Fonts instances is a separate
// weight-axis FIDELITY note (cosmetic), not the notdef cause; tracked as a
// follow-up. Production (Vercel) export wiring is the D-V2-1 Phase 4 item and,
// being server-side (Node), uses the correct build.
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
