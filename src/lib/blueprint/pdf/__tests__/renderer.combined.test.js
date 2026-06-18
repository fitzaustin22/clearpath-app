// @vitest-environment node
//
// COMBINED INTEGRATION GUARD (#75 redesign × #76 content/disclosure fixes).
//
// #75 (renderer redesign: numerals, two-pass TOC, heading searchability) and #76
// (content/disclosure fixes: §4 status suppression, §7 support-aware line, §5/§3
// disclosure notes, plain-language labels, professionals detail) were each
// verified ALONE. This renders the actual shipping F1 PDF on the COMBINED result
// and confirms, in one pass, that #75's render guarantees AND #76's content fixes
// both survive together — the artifact neither PR exercised jointly.
//
// Renders in node (variable fonts paint real glyphs; the @react-pdf browser build
// under jsdom emits notdef — see the model-build vs render two-stage convention).
// Model-build needs jsdom (store seeding); render needs node. So, like the #75
// toc/textlayer guards, this renders the PRE-BUILT F1 document-model snapshot
// (`F1.documentModel.json`, regenerated from the combined documentModel.js so it
// carries the #76 content fixes) — the same artifact those guards exercise.

import { describe, it, expect, beforeAll } from 'vitest';
import payload from '../../../../test/fixtures/v2-golden/F1.documentModel.json';
import { renderAttorneyBlueprint, auditTocPageNumbers } from '../renderAttorneyBlueprint.js';
import { extractAllText, headingPages } from './pdfTextProbe.js';

const TOC_ENTRIES = [
  ['Section 1', 'Personal Profile'],
  ['Section 4', 'Tax Analysis'],
  ['Section 7', 'Expense Analysis'],
  ['Section 11', 'Settlement Offer Overview'],
  ['Appendix A', 'Methodologies and Authorities'],
  ['Appendix B', 'Inputs and Assumptions'],
];

describe('combined F1 render — #75 render guarantees × #76 content fixes (node)', () => {
  let text; // whitespace-normalized extracted PDF text
  let audit;
  let pages;

  beforeAll(async () => {
    const buffer = await renderAttorneyBlueprint(payload.model, payload.opts);
    expect(buffer.slice(0, 5).toString('latin1')).toBe('%PDF-');
    text = extractAllText(buffer).replace(/\s+/g, ' ');
    audit = await auditTocPageNumbers(payload.model, payload.opts);
    pages = headingPages(buffer, TOC_ENTRIES.map(([, sub]) => sub));
  }, 60000);

  // ── #75 render guarantees survive ──────────────────────────────────────────
  it('headings extract/search correctly (text-layer guard from #75; always correct, #75 added the lock)', () => {
    expect(text).toContain('Personal Profile'); // fi ligature round-trips, not "Profle"
    expect(text).toContain('Settlement Offer Overview'); // ff round-trips, not "Ofer"
  });

  it('every TOC page number matches its heading’s actual rendered page (two-pass, from #75)', () => {
    for (const [key, sub] of TOC_ENTRIES) {
      expect(audit.tocPages[key], `${key} captured`).toBeGreaterThan(0);
      expect(pages[sub], `${sub} actual page`).toBe(audit.tocPages[key]);
    }
  });

  // ── #76 content fixes are present in the shipping artifact ──────────────────
  it('#2 §4 suppresses the unavailable married-filing comparison (the $74,844 MFJ-on-combined figure is gone)', () => {
    expect(text).not.toContain('74,844'); // MFJ net tax on combined marital income — suppressed
    expect(text).toContain('Head of household'); // an eligible status still shown
  });

  it('#7 §1 relabeled preliminary self-estimate, and the §7 support-aware net position is rendered', () => {
    expect(text.toLowerCase()).toContain('preliminary self-estimate');
    expect(text).toContain('Support-aware net monthly position');
  });

  it('#4 offer posture reads "Not addressed in the offer", never "Offer is silent"', () => {
    expect(text).toContain('Not addressed in the offer');
    expect(text).not.toContain('Offer is silent');
  });

  it('#12 jargon swept: plain-language labels, no Module-N / PVA / HDA / DCA / "PIT assumption" on the page', () => {
    expect(text).toContain('Marital Estate Inventory');
    expect(text).not.toMatch(/Module\s*\d/);
    // Appendix B group headers render uppercased (#75); match case-insensitively.
    const lower = text.toLowerCase();
    expect(lower).toContain('point-in-time tax-discount assumptions');
    expect(lower).toContain('pension present-value assumptions');
    expect(text).not.toMatch(/\b(PVA|DCA)\b/);
    expect(text).not.toMatch(/\bHDA assumption\b/i);
    expect(text).not.toMatch(/\bPIT assumption\b/i);
  });

  it('#15 the single professional is rendered (was a count with nothing listed)', () => {
    expect(text).toContain('Fitzpatrick');
  });

  it('#19/#21 carrier disclosure notes render (Hug/Nelson method note; cost-basis-only tax-adjusted note)', () => {
    expect(text).toContain('Hug and Nelson are alternative time-rule methods');
    expect(text.toLowerCase()).toContain('not tax-adjusted here');
  });

  it('#8/#9 §5 and §3 disclosure notes render and cross-reference Section 6 (no contradiction, no dangle)', () => {
    expect(text).toContain('are valued separately in Section 6'); // §5 #8 retirement/pension cross-ref
    expect(text).toContain('determined separately in Section 6'); // §3 #9 pension memo
  });
});
