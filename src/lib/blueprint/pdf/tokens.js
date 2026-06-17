// src/lib/blueprint/pdf/tokens.js
//
// ClearPath Attorney Blueprint — @react-pdf design tokens (print-flat).
// Every measurement is the README's pt value (HTML masters authored at 96dpi;
// pt = px × 0.75). Colors are the ClearPath token map verbatim — do NOT invent
// new values. Gold appears ONLY as the two 1.5pt accent rules and small text
// markers (goldText), never as a fill/wash (explicit design constraint).
//
// Three configurable variants (README "Tweaks"):
//   tableDensity : 'standard' (5.25pt row pad) | 'tight' (3pt)
//   goldDosage   : 'rulesAndMarkers' | 'rulesOnly' (goldText → ink2; rules stay)
//   headingFace  : 'playfair' | 'newsreader'

export const COLORS = Object.freeze({
  navy: '#1B2A4A',
  ink2: '#4A5876',
  muted: '#8A93A8',
  goldText: '#8A7028',
  gold: '#C8A96E',
  lineStrong: '#D4CFC2',
  line: '#E6E2D8',
  page: '#FFFFFF',
});

export const DEFAULT_VARIANTS = Object.freeze({
  tableDensity: 'standard',
  goldDosage: 'rulesAndMarkers',
  headingFace: 'playfair',
});

const BODY = 'Inter';
const BODY_ITALIC = 'Inter';

/**
 * Build the @react-pdf style token set for a given variant config. Returns a
 * plain object of named styles (react-pdf accepts plain style objects).
 */
export function makeStyles(variantsArg = {}) {
  const v = { ...DEFAULT_VARIANTS, ...variantsArg };
  const display = v.headingFace === 'newsreader' ? 'Newsreader' : 'Playfair';
  // goldDosage: 'rulesOnly' demotes every goldText use to ink2; the two gold
  // RULES are untouched (they read COLORS.gold directly, not this token).
  const goldText = v.goldDosage === 'rulesOnly' ? COLORS.ink2 : COLORS.goldText;
  const rowVPad = v.tableDensity === 'tight' ? 3 : 5.25;

  return {
    // ── Page ─────────────────────────────────────────────────────────────
    page: {
      backgroundColor: COLORS.page,
      paddingTop: 36 + 7.5 + 33, // header top offset + header pad-bottom + body top pad
      paddingBottom: 33 + 7.5 + 12,
      paddingLeft: 66,
      paddingRight: 66,
      fontFamily: BODY,
      color: COLORS.navy,
    },
    coverPage: {
      backgroundColor: COLORS.page,
      paddingTop: 66,
      paddingBottom: 60,
      paddingLeft: 66,
      paddingRight: 66,
      fontFamily: BODY,
      color: COLORS.navy,
      flexDirection: 'column',
    },

    // ── Running header / footer (fixed) ──────────────────────────────────
    runningHeader: {
      position: 'absolute',
      top: 36,
      left: 66,
      right: 66,
      flexDirection: 'row',
      justifyContent: 'space-between',
      paddingBottom: 7.5,
      borderBottomWidth: 0.75,
      borderBottomColor: COLORS.lineStrong,
    },
    runningHeaderText: {
      fontFamily: BODY,
      fontSize: 7.5,
      fontWeight: 600,
      textTransform: 'uppercase',
      letterSpacing: 1,
      color: COLORS.ink2,
    },
    footer: {
      position: 'absolute',
      bottom: 33,
      left: 66,
      right: 66,
      flexDirection: 'row',
      justifyContent: 'space-between',
      paddingTop: 7.5,
      borderTopWidth: 0.75,
      borderTopColor: COLORS.line,
    },
    footerText: {
      fontFamily: BODY,
      fontSize: 7.5,
      fontWeight: 600,
      color: COLORS.muted,
      maxWidth: 380,
    },
    footerId: { fontFamily: BODY, fontSize: 7.5, fontWeight: 600, color: COLORS.ink2 },

    // ── Cover ─────────────────────────────────────────────────────────────
    wordmark: { fontFamily: display, fontSize: 15.75, fontWeight: 700, color: COLORS.navy },
    coverTitleBlock: { marginTop: 156 },
    coverTitle: { fontFamily: display, fontSize: 30.75, fontWeight: 700, lineHeight: 1.18, maxWidth: 390, color: COLORS.navy },
    goldRule: { width: 36, height: 1.5, backgroundColor: COLORS.gold, marginTop: 19.5, marginBottom: 13.5 },
    coverEdition: { fontFamily: BODY, fontSize: 9.75, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 2.4, color: COLORS.ink2 },
    matterBlock: { marginTop: 66, maxWidth: 300, borderTopWidth: 0.75, borderTopColor: COLORS.navy },
    matterRow: { flexDirection: 'row', paddingTop: 6.75, paddingBottom: 6.75, borderBottomWidth: 0.75, borderBottomColor: COLORS.line },
    matterLabel: { width: 99, fontFamily: BODY, fontSize: 7.5, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 1, color: COLORS.muted },
    matterValue: { flex: 1, fontFamily: BODY, fontSize: 10.5, fontWeight: 500, color: COLORS.navy },
    coverSpacer: { flexGrow: 1 },
    disclaimerBlock: { borderTopWidth: 0.75, borderTopColor: COLORS.line, paddingTop: 10.5 },
    disclaimerLabel: { fontFamily: BODY, fontSize: 7.1, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1.2, color: goldText, marginBottom: 5 },
    disclaimerBody: { fontFamily: BODY, fontSize: 8.25, fontWeight: 400, lineHeight: 1.65, color: COLORS.ink2, maxWidth: 390 },

    // ── Section heading hierarchy ─────────────────────────────────────────
    sectionEyebrow: { fontFamily: BODY, fontSize: 7.9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1.2, color: goldText, marginBottom: 7.5, marginTop: 6 },
    sectionTitle: { fontFamily: display, fontSize: 20.25, fontWeight: 700, lineHeight: 1.2, paddingBottom: 10.5, borderBottomWidth: 0.75, borderBottomColor: COLORS.line, color: COLORS.navy },
    subsection: { flexDirection: 'row', marginTop: 12, marginBottom: 3 },
    subsectionNo: { fontFamily: BODY, fontSize: 11.25, fontWeight: 500, color: COLORS.ink2, marginRight: 7.5 },
    subsectionTitle: { fontFamily: BODY, fontSize: 11.25, fontWeight: 600, color: COLORS.navy },
    para: { fontFamily: BODY, fontSize: 10.1, fontWeight: 400, lineHeight: 1.7, maxWidth: 420, color: COLORS.navy, marginTop: 6 },

    // ── Financial table (label/value rows) ───────────────────────────────
    tableCaption: { flexDirection: 'row', marginTop: 21, paddingBottom: 5.25, borderBottomWidth: 0.75, borderBottomColor: COLORS.navy, alignItems: 'baseline' },
    tableNo: { fontFamily: BODY, fontSize: 7.9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, color: goldText, marginRight: 9 },
    tableTitle: { fontFamily: BODY, fontSize: 9, fontWeight: 600, color: COLORS.navy },
    row: { flexDirection: 'row', justifyContent: 'space-between', paddingTop: rowVPad, paddingBottom: rowVPad, borderBottomWidth: 0.75, borderBottomColor: COLORS.line },
    rowClose: { borderBottomWidth: 0.75, borderBottomColor: COLORS.navy }, // final row closes navy
    rowLabel: { fontFamily: BODY, fontSize: 9.4, fontWeight: 400, color: COLORS.ink2, flex: 1, lineHeight: 1.4, paddingRight: 12 },
    rowValue: { fontFamily: BODY, fontSize: 9.75, fontWeight: 500, color: COLORS.navy, textAlign: 'right' },
    rowValueKey: { fontWeight: 700 }, // key row value
    rowLabelKey: { fontWeight: 600, color: COLORS.navy },
    rowIndent: { paddingLeft: 15 },
    rowValueSub: { fontWeight: 400, color: COLORS.ink2 },
    rowLabelSub: { color: COLORS.ink2 },
    numNote: { fontFamily: BODY, fontSize: 8.25, fontWeight: 400, color: COLORS.muted },
    tableNote: { fontFamily: BODY, fontSize: 7.9, fontWeight: 400, color: COLORS.muted, marginTop: 7.5 },

    // ── Citations ─────────────────────────────────────────────────────────
    citeMarker: { fontFamily: BODY, fontSize: 6.75, fontWeight: 700, color: goldText, verticalAlign: 'super' },
    sourcesBlock: { marginTop: 15 },
    sourcesRule: { width: 72, height: 0.75, backgroundColor: COLORS.line, marginBottom: 6 },
    sourceLine: { fontFamily: BODY, fontSize: 8.6, fontWeight: 400, color: COLORS.ink2, lineHeight: 1.5, marginBottom: 2 },
    sourceMarker: { fontFamily: BODY, fontSize: 8.6, fontWeight: 700, color: goldText },
    sourceItalic: { fontFamily: BODY_ITALIC, fontStyle: 'italic' },
    underReview: { fontFamily: BODY, fontSize: 7.9, fontWeight: 600, fontStyle: 'italic', color: COLORS.muted },

    // ── Methodology page (Appendix A) ─────────────────────────────────────
    methodRow: { flexDirection: 'row', paddingTop: 12, paddingBottom: 12, borderBottomWidth: 0.75, borderBottomColor: COLORS.line },
    methodRowTop: { borderTopWidth: 0.75, borderTopColor: COLORS.line },
    methodName: { width: 147, fontFamily: BODY, fontSize: 9.75, fontWeight: 600, color: COLORS.navy, paddingRight: 18 },
    methodRight: { flex: 1 },
    methodDesc: { fontFamily: BODY, fontSize: 9.4, fontWeight: 400, lineHeight: 1.6, color: COLORS.ink2 },
    methodCite: { fontFamily: BODY, fontSize: 8.6, fontWeight: 400, color: COLORS.ink2, marginTop: 3 },
    blockLabel: { fontFamily: BODY, fontSize: 7.5, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, color: COLORS.ink2, marginTop: 21, marginBottom: 4 },
    provenanceBlock: { marginTop: 24 },
    provenanceRule: { width: 36, height: 1.5, backgroundColor: COLORS.gold, marginBottom: 10.5 },
    provenanceText: { fontFamily: BODY, fontSize: 9, fontWeight: 400, color: COLORS.ink2 },

    // ── Scope notice ──────────────────────────────────────────────────────
    scopeItem: { marginBottom: 19.5 },
    scopeName: { fontFamily: BODY, fontSize: 10.5, fontWeight: 600, color: COLORS.navy },
    scopeReason: { fontFamily: BODY, fontSize: 9.4, fontWeight: 400, color: COLORS.ink2, marginTop: 2 },
    scopeClose: { fontFamily: BODY, fontSize: 10.1, fontWeight: 400, lineHeight: 1.7, color: COLORS.ink2, marginTop: 6 },

    // section wrapper — keep an eyebrow+title pair from orphaning at page foot
    sectionWrap: { marginBottom: 6 },
    headingGroup: {}, // wrap() controlled in JSX via wrap={false}
  };
}
