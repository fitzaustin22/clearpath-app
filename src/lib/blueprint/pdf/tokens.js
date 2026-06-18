// src/lib/blueprint/pdf/tokens.js
//
// ClearPath Attorney Blueprint — @react-pdf design tokens (print-flat).
// Redesign palette (user-approved 2026-06-17): the mockup token set. Gold is
// used as eyebrows / citation markers / the hero left-rule / proportion-bar
// fill and thin accent rules — never as a full background wash. The hero band
// is a PARCHMENT tint fill with a gold LEFT rule (honors the no-gold-wash
// constraint while delivering the redesign's one-hero-per-section band).
//
// Three configurable variants (README "Tweaks"):
//   tableDensity : 'standard' (5.25pt row pad) | 'tight' (3pt)
//   goldDosage   : 'rulesAndMarkers' | 'rulesOnly' (gold text → navySoft; rules stay)
//   headingFace  : 'playfair' | 'newsreader'

export const COLORS = Object.freeze({
  navy: '#1B2A4A', // hero numbers, titles, primary ink
  navySoft: '#2C3E63', // secondary ink / body
  gold: '#9A7B2E', // eyebrows, markers, hero left-rule, bar fill
  goldLight: '#B6933D', // thin decorative accent rules
  label: '#5F6B80', // row + card labels
  labelLight: '#8A93A4', // captions, footer, de-emphasized inputs
  rule: '#E6E8EC', // light dividers
  ruleStrong: '#C9CDD6', // derived — header underline / strong non-navy rules
  negative: '#9E3A2F', // negative values (accounting)
  tint: '#F6F4EE', // hero band + card fill (parchment)
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
  // goldDosage: 'rulesOnly' demotes gold TEXT to navySoft; the gold RULES/bars
  // (which read COLORS.gold/goldLight directly) are untouched.
  const goldText = v.goldDosage === 'rulesOnly' ? COLORS.navySoft : COLORS.gold;
  const rowVPad = v.tableDensity === 'tight' ? 3 : 5.25;

  return {
    // ── Page ─────────────────────────────────────────────────────────────
    page: {
      backgroundColor: COLORS.page,
      paddingTop: 36 + 7.5 + 33,
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
      borderBottomColor: COLORS.ruleStrong,
    },
    runningHeaderText: {
      fontFamily: BODY,
      fontSize: 7.5,
      fontWeight: 600,
      textTransform: 'uppercase',
      letterSpacing: 1,
      color: COLORS.navySoft,
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
      borderTopColor: COLORS.rule,
    },
    footerText: { fontFamily: BODY, fontSize: 7.5, fontWeight: 600, color: COLORS.labelLight, maxWidth: 380 },
    footerId: { fontFamily: BODY, fontSize: 7.5, fontWeight: 600, color: COLORS.navySoft },

    // ── Cover ─────────────────────────────────────────────────────────────
    wordmark: { fontFamily: display, fontSize: 15.75, fontWeight: 700, color: COLORS.navy },
    coverTitleBlock: { marginTop: 156 },
    coverTitle: { fontFamily: display, fontSize: 30.75, fontWeight: 700, lineHeight: 1.18, maxWidth: 390, color: COLORS.navy },
    goldRule: { width: 36, height: 1.5, backgroundColor: COLORS.goldLight, marginTop: 19.5, marginBottom: 13.5 },
    coverEdition: { fontFamily: BODY, fontSize: 9.75, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 2.4, color: COLORS.navySoft },
    matterBlock: { marginTop: 66, maxWidth: 300, borderTopWidth: 0.75, borderTopColor: COLORS.navy },
    matterRow: { flexDirection: 'row', paddingTop: 6.75, paddingBottom: 6.75, borderBottomWidth: 0.75, borderBottomColor: COLORS.rule },
    matterLabel: { width: 99, fontFamily: BODY, fontSize: 7.5, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 1, color: COLORS.labelLight },
    matterValue: { flex: 1, fontFamily: BODY, fontSize: 10.5, fontWeight: 500, color: COLORS.navy },
    coverSpacer: { flexGrow: 1 },
    disclaimerBlock: { borderTopWidth: 0.75, borderTopColor: COLORS.rule, paddingTop: 10.5 },
    disclaimerLabel: { fontFamily: BODY, fontSize: 7.1, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1.2, color: goldText, marginBottom: 5 },
    disclaimerBody: { fontFamily: BODY, fontSize: 8.25, fontWeight: 400, lineHeight: 1.65, color: COLORS.navySoft, maxWidth: 390 },

    // ── Section heading hierarchy ─────────────────────────────────────────
    sectionEyebrow: { fontFamily: BODY, fontSize: 7.9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1.2, color: goldText, marginBottom: 7.5, marginTop: 6 },
    sectionTitle: { fontFamily: display, fontSize: 20.25, fontWeight: 700, lineHeight: 1.2, paddingBottom: 10.5, borderBottomWidth: 0.75, borderBottomColor: COLORS.rule, color: COLORS.navy },
    subsection: { flexDirection: 'row', marginTop: 12, marginBottom: 3 },
    subsectionNo: { fontFamily: BODY, fontSize: 11.25, fontWeight: 500, color: COLORS.navySoft, marginRight: 7.5 },
    subsectionTitle: { fontFamily: BODY, fontSize: 11.25, fontWeight: 600, color: COLORS.navy },
    para: { fontFamily: BODY, fontSize: 10.1, fontWeight: 400, lineHeight: 1.7, maxWidth: 420, color: COLORS.navy, marginTop: 6 },

    // ── Hero band (one per section) ───────────────────────────────────────
    heroBand: {
      backgroundColor: COLORS.tint,
      borderLeftWidth: 3,
      borderLeftColor: COLORS.gold,
      paddingTop: 12,
      paddingBottom: 12,
      paddingLeft: 13.5,
      paddingRight: 13.5,
      marginTop: 12,
      marginBottom: 3,
    },
    heroLabel: { fontFamily: BODY, fontSize: 8.25, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, color: COLORS.label, marginBottom: 4.5 },
    heroValue: { fontFamily: display, fontSize: 29.25, fontWeight: 700, color: COLORS.navy, lineHeight: 1.1 },
    heroValueNegative: { color: COLORS.negative },
    heroSubtitle: { fontFamily: BODY, fontSize: 9, fontWeight: 400, color: COLORS.navySoft, marginTop: 4.5 },
    heroMarker: { fontFamily: BODY, fontSize: 9, fontWeight: 700, color: goldText, verticalAlign: 'super' },

    // ── Metric cards ──────────────────────────────────────────────────────
    cardRow: { flexDirection: 'row', marginTop: 7.5, marginBottom: 3 },
    card: { flex: 1, backgroundColor: COLORS.tint, paddingTop: 7.5, paddingBottom: 7.5, paddingLeft: 9, paddingRight: 9 },
    cardGap: { width: 7.5 },
    cardLabel: { fontFamily: BODY, fontSize: 7.1, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.8, color: COLORS.label, marginBottom: 3 },
    cardValue: { fontFamily: BODY, fontSize: 12.75, fontWeight: 600, color: COLORS.navy },
    cardValueNegative: { color: COLORS.negative },

    // ── Proportion bars ───────────────────────────────────────────────────
    barRow: { marginTop: 6 },
    barTop: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 2.25 },
    barLabel: { fontFamily: BODY, fontSize: 8.6, fontWeight: 500, color: COLORS.label },
    barRight: { flexDirection: 'row', alignItems: 'baseline' },
    barValue: { fontFamily: BODY, fontSize: 8.6, fontWeight: 600, color: COLORS.navy },
    barPct: { fontFamily: BODY, fontSize: 7.1, fontWeight: 400, color: COLORS.labelLight, marginLeft: 4.5 },
    barTrack: { height: 3.75, backgroundColor: COLORS.rule },
    barFill: { height: 3.75, backgroundColor: COLORS.goldLight },

    // ── Grouped entity boxes ──────────────────────────────────────────────
    groupHeader: { fontFamily: BODY, fontSize: 7.9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, color: goldText, marginTop: 13.5, marginBottom: 1.5 },
    entityBox: { borderWidth: 0.75, borderColor: COLORS.rule, borderRadius: 2, paddingTop: 7.5, paddingBottom: 4.5, paddingLeft: 10.5, paddingRight: 10.5, marginTop: 9 },
    entityHeader: { fontFamily: BODY, fontSize: 9.4, fontWeight: 700, color: COLORS.navy, marginBottom: 3, paddingBottom: 4.5, borderBottomWidth: 0.75, borderBottomColor: COLORS.rule },

    // ── Financial table (label/value rows) ───────────────────────────────
    tableCaption: { flexDirection: 'row', marginTop: 21, paddingBottom: 5.25, borderBottomWidth: 0.75, borderBottomColor: COLORS.navy, alignItems: 'baseline' },
    tableNo: { fontFamily: BODY, fontSize: 7.9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, color: goldText, marginRight: 9 },
    tableTitle: { fontFamily: BODY, fontSize: 9, fontWeight: 600, color: COLORS.navy },
    row: { flexDirection: 'row', justifyContent: 'space-between', paddingTop: rowVPad, paddingBottom: rowVPad, borderBottomWidth: 0.75, borderBottomColor: COLORS.rule },
    rowClose: { borderBottomWidth: 0.75, borderBottomColor: COLORS.navy },
    rowLabel: { fontFamily: BODY, fontSize: 9.4, fontWeight: 400, color: COLORS.label, flex: 1, lineHeight: 1.4, paddingRight: 12 },
    rowLabelMuted: { color: COLORS.labelLight },
    rowValue: { fontFamily: BODY, fontSize: 9.75, fontWeight: 500, color: COLORS.navy, textAlign: 'right' },
    rowValueMuted: { fontWeight: 400, color: COLORS.labelLight },
    rowValueNegative: { color: COLORS.negative },
    rowValueKey: { fontWeight: 700 },
    rowLabelKey: { fontWeight: 600, color: COLORS.navy },
    rowIndent: { paddingLeft: 15 },
    rowValueSub: { fontWeight: 400, color: COLORS.navySoft },
    rowLabelSub: { color: COLORS.navySoft },
    numNote: { fontFamily: BODY, fontSize: 8.25, fontWeight: 400, color: COLORS.labelLight },
    tableNote: { fontFamily: BODY, fontSize: 7.9, fontWeight: 400, color: COLORS.labelLight, marginTop: 7.5 },

    // ── Method table (Hug / Nelson · Current / Projected) ─────────────────
    mtHead: { flexDirection: 'row', borderBottomWidth: 0.75, borderBottomColor: COLORS.navy, paddingBottom: 3, marginTop: 6, alignItems: 'flex-end' },
    mtHeadLabel: { flex: 1 },
    mtHeadCol: { width: 90, textAlign: 'right', fontFamily: BODY, fontSize: 7.5, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.8, color: COLORS.label },
    mtRow: { flexDirection: 'row', paddingTop: rowVPad, paddingBottom: rowVPad, borderBottomWidth: 0.75, borderBottomColor: COLORS.rule },
    mtRowLabel: { flex: 1, fontFamily: BODY, fontSize: 9.4, fontWeight: 400, color: COLORS.label, paddingRight: 9 },
    mtCell: { width: 90, textAlign: 'right', fontFamily: BODY, fontSize: 9.4, fontWeight: 500, color: COLORS.navy },

    // ── Trade-off (give ↔ get) ────────────────────────────────────────────
    tradeRow: { flexDirection: 'row', alignItems: 'center', paddingTop: rowVPad, paddingBottom: rowVPad, borderBottomWidth: 0.75, borderBottomColor: COLORS.rule },
    tradeItem: { flex: 1, fontFamily: BODY, fontSize: 9.4, fontWeight: 500, color: COLORS.navy },
    tradeArrow: { fontFamily: BODY, fontSize: 10.5, fontWeight: 700, color: goldText, marginLeft: 9, marginRight: 9 },

    // ── Citations ─────────────────────────────────────────────────────────
    citeMarker: { fontFamily: BODY, fontSize: 6.75, fontWeight: 700, color: goldText, verticalAlign: 'super' },
    sourcesBlock: { marginTop: 15 },
    sourcesRule: { width: 72, height: 0.75, backgroundColor: COLORS.rule, marginBottom: 6 },
    sourceLine: { fontFamily: BODY, fontSize: 8.6, fontWeight: 400, color: COLORS.navySoft, lineHeight: 1.5, marginBottom: 2 },
    sourceMarker: { fontFamily: BODY, fontSize: 8.6, fontWeight: 700, color: goldText },
    sourceItalic: { fontFamily: BODY_ITALIC, fontStyle: 'italic' },
    underReview: { fontFamily: BODY, fontSize: 7.9, fontWeight: 600, fontStyle: 'italic', color: COLORS.labelLight },

    // ── Table of contents ─────────────────────────────────────────────────
    tocRow: { flexDirection: 'row', alignItems: 'flex-end', marginBottom: 7.5 },
    tocNum: { fontFamily: BODY, fontSize: 8.25, fontWeight: 700, color: goldText, width: 36 },
    tocTitle: { fontFamily: BODY, fontSize: 10.5, fontWeight: 500, color: COLORS.navy },
    tocLeader: { flex: 1, borderBottomWidth: 0.75, borderBottomColor: COLORS.rule, marginLeft: 6, marginRight: 6, marginBottom: 2.25 },
    tocPage: { fontFamily: BODY, fontSize: 9.75, fontWeight: 600, color: COLORS.navySoft },
    tocSupplement: { color: COLORS.navySoft, fontWeight: 400 },

    // ── Methodology page (Appendix A) ─────────────────────────────────────
    methodRow: { flexDirection: 'row', paddingTop: 12, paddingBottom: 12, borderBottomWidth: 0.75, borderBottomColor: COLORS.rule },
    methodRowTop: { borderTopWidth: 0.75, borderTopColor: COLORS.rule },
    methodName: { width: 147, fontFamily: BODY, fontSize: 9.75, fontWeight: 600, color: COLORS.navy, paddingRight: 18 },
    methodRight: { flex: 1 },
    methodDesc: { fontFamily: BODY, fontSize: 9.4, fontWeight: 400, lineHeight: 1.6, color: COLORS.navySoft },
    methodCite: { fontFamily: BODY, fontSize: 8.6, fontWeight: 400, color: COLORS.navySoft, marginTop: 3 },
    blockLabel: { fontFamily: BODY, fontSize: 7.5, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, color: COLORS.navySoft, marginTop: 21, marginBottom: 4 },
    provenanceBlock: { marginTop: 24 },
    provenanceRule: { width: 36, height: 1.5, backgroundColor: COLORS.goldLight, marginBottom: 10.5 },
    provenanceText: { fontFamily: BODY, fontSize: 9, fontWeight: 400, color: COLORS.navySoft },

    // ── Scope notice ──────────────────────────────────────────────────────
    scopeItem: { marginBottom: 19.5 },
    scopeName: { fontFamily: BODY, fontSize: 10.5, fontWeight: 600, color: COLORS.navy },
    scopeReason: { fontFamily: BODY, fontSize: 9.4, fontWeight: 400, color: COLORS.navySoft, marginTop: 2 },
    scopeClose: { fontFamily: BODY, fontSize: 10.1, fontWeight: 400, lineHeight: 1.7, color: COLORS.navySoft, marginTop: 6 },

    // section wrapper — keep an eyebrow+title pair from orphaning at page foot
    sectionWrap: { marginBottom: 6 },
    headingGroup: {},
  };
}
