// @vitest-environment node
//
// End-to-end render guard for the Snapshot PDF generator. MUST run in the NODE
// environment: under jsdom, react-pdf resolves its *browser* build, which embeds
// empty (.notdef) glyph subsets — the PDF would paint as boxes. The production
// server path is Node, so we render and probe in Node (the same lesson the
// Attorney Blueprint learned; see pdfGlyphProbe.js header).
//
// Proves: a 5-page Letter PDF; the SUBMITTING USER'S real getCalc figures (no
// mock placeholders survive); the post-decision citation set (Mansell,
// § 1450(f)(3)(C), § 1408(a)(4)(B)); the UPL question-framing; and that the
// brand fonts embed with drawable outlines.
import { describe, it, expect, beforeAll } from 'vitest';
import { getCalc } from '../../getCalc';
import { generatePensionSnapshotPdf } from '../generatePensionSnapshotPdf';
import { extractAllText } from '../../../blueprint/pdf/__tests__/pdfTextProbe.js';
import { summarizeGlyphPainting } from '../../../blueprint/pdf/__tests__/pdfGlyphProbe.js';

const SEED = Object.freeze({
  system: 'unsure', serviceType: 'active', serviceStartDate: '2006-06',
  alreadyReceivingPay: false, yearsNow: '18', yearsAtRetirement: '20',
  pointsNow: '3200', pointsAtRetirement: '3800', high3Pay: '5500',
  vaWaiverMonthly: '', memberAge: '44', marriageDate: '2008-06',
  separationDate: '2024-06', awardPct: '50', sbpElected: 'unsure',
  discountRate: '4.5', colaRate: '2.5', lifeExpectancyAge: '85',
  rateLifeExp: '', ratePbgc: '', rateGatt: '',
});

describe('generatePensionSnapshotPdf — seeded example', () => {
  let buffer;
  let text;
  beforeAll(async () => {
    const calc = getCalc(SEED);
    buffer = await generatePensionSnapshotPdf({ inp: SEED, calc, preparedDate: 'June 23, 2026' });
    text = extractAllText(buffer).replace(/\s+/g, ' ');
  }, 60000);

  it('returns a valid PDF Buffer', () => {
    expect(Buffer.isBuffer(buffer)).toBe(true);
    expect(buffer.toString('latin1', 0, 5)).toBe('%PDF-');
  });

  it('is exactly 5 pages (Letter)', () => {
    const pages = buffer.toString('latin1').match(/\/Type\s*\/Page(?![s])/g) || [];
    expect(pages).toHaveLength(5);
  });

  it("renders the submitting user's real getCalc figures", () => {
    expect(text).toContain('$2,475'); // gross (frozen → 18 yrs, not the mock's $2,750)
    expect(text).toContain('$1,100'); // monthly share
    expect(text).toContain('$273,000'); // pvLow
    expect(text).toContain('$351,000'); // pvBase (real middle)
    expect(text).toContain('$465,000'); // pvHigh
  });

  it('contains NO mock placeholder numbers', () => {
    expect(text).not.toContain('$2,750'); // mock gross placeholder
    expect(text).not.toContain('$360,000'); // mock middle placeholder
  });

  it('carries the decided citation set (Mansell + § 1450(f)(3)(C) + § 1408(a)(4)(B))', () => {
    expect(text).toContain('Mansell');
    expect(text).toContain('1450(f)(3)(C)');
    expect(text).toContain('1408(a)(4)(B)');
    expect(text).toContain('1408(d)(2)');
  });

  it('keeps the UPL guardrail — actionable items are questions', () => {
    expect(text).toContain('Ask your attorney');
    expect(text).toMatch(/not a law firm/i);
  });

  it('embeds the brand fonts with drawable glyph outlines (Node build, not notdef)', () => {
    const g = summarizeGlyphPainting(buffer);
    expect(g.embeddedFontCount).toBeGreaterThan(0);
    expect(g.totalGlyphsWithContours).toBeGreaterThan(0);
    expect(g.hasMalformedFullFontDump).toBe(false);
    const fams = g.baseFonts.join('|');
    expect(fams).toMatch(/Inter/);
    expect(fams).toMatch(/Playfair/);
    expect(fams).toMatch(/Newsreader/);
  });

  it('flag copy reflects this user (frozen applies; 10/10 met; SBP at risk)', () => {
    expect(text).toContain('frozen to');
    expect(text).toContain('likely meet 10/10');
    expect(text).toContain('stops when the retiree dies');
  });
});
