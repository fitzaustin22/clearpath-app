// src/lib/military-pension/snapshot-pdf/styles.js
//
// @react-pdf style set for the "Your Military Pension Snapshot" report. COLORS
// map to the consumer brand tokens (T) — never hardcoded hex. The mock is sized
// at 96dpi CSS px (816×1056 Letter); react-pdf lays out in 72dpi points, so
// every mock px is scaled ×0.75 (pt = px × 72/96). Letter = 612×792 pt.
//
// FONTS: react-pdf needs the registered family NAMES ('Playfair' / 'Newsreader'
// / 'Inter' from registerSnapshotFonts), not T.FONT_* — those are CSS-var
// strings react-pdf can't resolve. Playfair = display/big-number; Newsreader =
// editorial sub-headings/CTA; Inter = body.
//
// TOKEN GAPS (flagged per the brief — mock values with no brand token):
//   • The cover's white-on-navy text + translucent panel fills/borders
//     (rgba(255,255,255,·)) — cover-specific white-on-navy treatment, no token.
//   • The "good" flag's green tint fill rgba(45,138,74,0.07) — derived from
//     T.GREEN; there is no GREEN_BG/GREEN_TINT token.
import { T } from '@/src/lib/brand/tokens';

const px = (n) => n * 0.75; // 96dpi CSS px → 72dpi PDF points

// White-on-navy cover scale (no brand token — see header).
export const WHITE = '#FFFFFF';
const W = (a) => `rgba(255, 255, 255, ${a})`;
const GREEN_TINT = 'rgba(45, 138, 78, 0.07)'; // good-flag fill = T.GREEN #2D8A4E at 7% (no GREEN_BG token)

const DISPLAY = 'Playfair';
const EDITORIAL = 'Newsreader';
const BODY = 'Inter';

export function makeSnapshotStyles() {
  return {
    // ── Page masters ──────────────────────────────────────────────────────
    cover: {
      backgroundColor: T.NAVY,
      color: WHITE,
      paddingTop: px(72), paddingBottom: px(56), paddingLeft: px(72), paddingRight: px(72),
      fontFamily: BODY,
      flexDirection: 'column',
    },
    page: {
      backgroundColor: T.CARD,
      paddingTop: px(64), paddingBottom: px(64), paddingLeft: px(72), paddingRight: px(72),
      fontFamily: BODY,
      color: T.INK,
      flexDirection: 'column',
    },

    // ── Cover ─────────────────────────────────────────────────────────────
    coverBrandRow: { flexDirection: 'row', alignItems: 'baseline' },
    coverWordmark: { fontFamily: DISPLAY, fontWeight: 700, fontSize: px(26), color: T.GOLD, letterSpacing: -0.2 },
    coverForWomen: { fontFamily: BODY, fontSize: px(11), fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.9, color: W(0.55), marginLeft: px(14) },
    coverTitleBlock: { marginTop: px(120) },
    coverEyebrow: { fontFamily: BODY, fontSize: px(12), fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1.3, color: T.GOLD },
    coverTitle: { fontFamily: DISPLAY, fontWeight: 700, fontSize: px(54), lineHeight: 1.06, color: WHITE, letterSpacing: -0.8, marginTop: px(18) },
    coverSubhead: { fontFamily: EDITORIAL, fontSize: px(19), lineHeight: 1.55, color: W(0.78), maxWidth: px(520), marginTop: px(22) },
    coverStatPanel: { marginTop: px(56), backgroundColor: W(0.06), borderWidth: 1, borderColor: W(0.14), borderRadius: px(14), paddingTop: px(30), paddingBottom: px(30), paddingLeft: px(34), paddingRight: px(34), maxWidth: px(560) },
    coverStatLabel: { fontFamily: BODY, fontSize: px(11), fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.9, color: W(0.55) },
    coverStatValue: { fontFamily: DISPLAY, fontWeight: 700, fontSize: px(48), color: T.GOLD, lineHeight: 1.05, marginTop: px(8) },
    coverStatNote: { fontFamily: BODY, fontSize: px(13.5), color: W(0.7), marginTop: px(8) },
    coverSpacer: { flexGrow: 1 },
    coverFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', borderTopWidth: 1, borderTopColor: W(0.14), paddingTop: px(22) },
    coverFooterDisc: { fontFamily: BODY, fontSize: px(12), lineHeight: 1.5, color: W(0.6), maxWidth: px(440) },
    coverFooterDiscStrong: { color: W(0.82), fontWeight: 600 },
    coverFooterDate: { fontFamily: BODY, fontSize: px(12), color: W(0.6), textAlign: 'right' },
    coverFooterDateStrong: { color: WHITE, fontWeight: 600 },

    // ── Running header / page footer ────────────────────────────────────────
    runningHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: px(24) },
    headerBrand: { fontFamily: DISPLAY, fontWeight: 700, fontSize: px(17), color: T.NAVY },
    headerLabel: { fontFamily: BODY, fontSize: px(11), fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.9, color: T.MUTED },
    pageSpacer: { flexGrow: 1 },
    pageFooter: { borderTopWidth: 1, borderTopColor: T.LINE, paddingTop: px(16), marginTop: px(20) },
    pageFooterText: { fontFamily: BODY, fontSize: px(11), lineHeight: 1.5, color: T.MUTED },

    // ── Section heading ──────────────────────────────────────────────────────
    sectionEyebrow: { fontFamily: BODY, fontSize: px(11), fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.9, color: T.PILL_TEXT },
    sectionTitle: { fontFamily: DISPLAY, fontWeight: 700, fontSize: px(30), color: T.NAVY, letterSpacing: -0.3, marginTop: px(8) },
    sectionIntro: { fontFamily: BODY, fontSize: px(14.5), lineHeight: 1.6, color: T.INK_2, marginTop: px(10), maxWidth: px(610) },
    block: { marginTop: px(30) },
    resultDivider: { borderTopWidth: 1, borderTopColor: T.LINE, paddingTop: px(30), marginTop: px(30) },

    // ── Recap tiles (2×2) ─────────────────────────────────────────────────────
    recapGrid: { flexDirection: 'row', flexWrap: 'wrap', marginTop: px(28) },
    recapTile: { width: '50%', padding: px(4) },
    recapTileInner: { backgroundColor: T.PARCHMENT, borderRadius: px(10), paddingTop: px(16), paddingBottom: px(16), paddingLeft: px(18), paddingRight: px(18) },
    recapLabel: { fontFamily: BODY, fontSize: px(11), fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.6, color: T.MUTED },
    recapValue: { fontFamily: BODY, fontSize: px(16), fontWeight: 600, color: T.NAVY, marginTop: px(5) },

    // ── Result tiles ──────────────────────────────────────────────────────────
    resultGrid: { flexDirection: 'row', marginTop: px(16) },
    resultTile: { flex: 1, backgroundColor: T.PARCHMENT, borderRadius: px(12), paddingTop: px(22), paddingBottom: px(22), paddingLeft: px(24), paddingRight: px(24) },
    resultTileShare: { backgroundColor: T.PARCHMENT_DEEP },
    resultGap: { width: px(16) },
    resultLabel: { fontFamily: BODY, fontSize: px(11), fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.6, color: T.MUTED },
    resultLabelGold: { color: T.PILL_TEXT },
    resultValue: { fontFamily: DISPLAY, fontWeight: 700, fontSize: px(32), color: T.NAVY, marginTop: px(6) },
    resultValueGold: { color: T.PILL_TEXT },
    resultSub: { fontFamily: BODY, fontSize: px(12.5), color: T.MUTED, marginTop: px(4) },
    explainer: { fontFamily: BODY, fontSize: px(13), lineHeight: 1.6, color: T.INK_2, backgroundColor: T.GOLD_TINT, borderRadius: px(10), paddingTop: px(16), paddingBottom: px(16), paddingLeft: px(18), paddingRight: px(18), marginTop: px(20) },
    explainerStrong: { color: T.NAVY, fontWeight: 600 },

    // ── PV range card ──────────────────────────────────────────────────────────
    pvCard: { borderWidth: 1, borderColor: T.GOLD_BORDER, borderRadius: px(14), paddingTop: px(30), paddingBottom: px(30), paddingLeft: px(34), paddingRight: px(34), marginTop: px(28) },
    pvRow: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between' },
    pvCol: { flex: 1, alignItems: 'center' },
    pvSideLabel: { fontFamily: BODY, fontSize: px(12), color: T.MUTED, marginBottom: px(4) },
    pvMidLabel: { fontFamily: BODY, fontSize: px(12), fontWeight: 600, color: T.PILL_TEXT, marginBottom: px(4) },
    pvSideValue: { fontFamily: EDITORIAL, fontWeight: 600, fontSize: px(24), color: T.INK_2 },
    pvMidValue: { fontFamily: DISPLAY, fontWeight: 700, fontSize: px(40), color: T.GOLD, lineHeight: 1.04 },

    // ── Why-methods-differ + chips ────────────────────────────────────────────
    whyBlock: { borderTopWidth: 1, borderTopColor: T.LINE, paddingTop: px(26), marginTop: px(30) },
    whyTitle: { fontFamily: EDITORIAL, fontWeight: 600, fontSize: px(19), color: T.NAVY, marginBottom: px(6) },
    whyBody: { fontFamily: BODY, fontSize: px(14), lineHeight: 1.6, color: T.INK_2, marginBottom: px(18), maxWidth: px(620) },
    chipRow: { flexDirection: 'row', marginHorizontal: -px(6) },
    chip: { flex: 1, marginHorizontal: px(6), backgroundColor: T.PARCHMENT, borderWidth: 1, borderColor: T.LINE, borderRadius: px(10), padding: px(16) },
    chipName: { fontFamily: BODY, fontSize: px(13.5), fontWeight: 600, color: T.NAVY },
    chipDriver: { fontFamily: BODY, fontSize: px(12), lineHeight: 1.45, color: T.MUTED, marginTop: px(6) },
    cdfaPrompt: { fontFamily: BODY, fontSize: px(13), lineHeight: 1.6, color: T.INK_2, backgroundColor: T.PARCHMENT, borderRadius: px(10), paddingTop: px(16), paddingBottom: px(16), paddingLeft: px(18), paddingRight: px(18), marginTop: px(24) },
    cdfaPromptStrong: { color: T.NAVY, fontWeight: 600 },

    // ── Flags ────────────────────────────────────────────────────────────────
    flagList: { marginTop: px(24) },
    flagBox: { flexDirection: 'row', borderWidth: 1, borderRadius: px(12), paddingTop: px(18), paddingBottom: px(18), paddingLeft: px(20), paddingRight: px(20), marginBottom: px(14) },
    flagDot: { width: px(8), height: px(8), borderRadius: px(4), marginTop: px(7), marginRight: px(12) },
    flagBody: { flex: 1 },
    flagTitle: { fontFamily: BODY, fontWeight: 700, fontSize: px(14.5), color: T.INK },
    flagText: { fontFamily: BODY, fontSize: px(13), lineHeight: 1.55, color: T.INK_2, marginTop: px(5) },
    flagCite: { fontFamily: BODY, fontSize: px(12), color: T.MUTED, marginTop: px(6) },

    // ── Checklist ──────────────────────────────────────────────────────────────
    checkRow: { flexDirection: 'row', alignItems: 'flex-start', paddingTop: px(10), paddingBottom: px(10), borderBottomWidth: 1, borderBottomColor: T.LINE },
    checkRowLast: { borderBottomWidth: 0 },
    checkBox: { width: px(20), height: px(20), borderWidth: 1.5, borderColor: T.LINE_STRONG, borderRadius: px(5), marginTop: px(1), marginRight: px(14) },
    checkText: { flex: 1, fontFamily: BODY, fontSize: px(14), lineHeight: 1.5, color: T.INK },

    // ── CTA + closing disclaimer ──────────────────────────────────────────────
    ctaBlock: { backgroundColor: T.NAVY, borderRadius: px(14), paddingTop: px(22), paddingBottom: px(22), paddingLeft: px(34), paddingRight: px(34), marginTop: px(18) },
    ctaTitle: { fontFamily: EDITORIAL, fontWeight: 600, fontSize: px(21), color: WHITE, marginBottom: px(8) },
    ctaBody: { fontFamily: BODY, fontSize: px(14), lineHeight: 1.6, color: W(0.74), maxWidth: px(520), marginBottom: px(18) },
    ctaPill: { alignSelf: 'flex-start', backgroundColor: T.GOLD, color: T.NAVY, borderRadius: px(8), paddingTop: px(11), paddingBottom: px(11), paddingLeft: px(22), paddingRight: px(22), fontFamily: BODY, fontSize: px(15), fontWeight: 600 },
    closingDisclaimer: { fontFamily: BODY, fontSize: px(11), lineHeight: 1.55, color: T.MUTED, marginTop: px(12) },
    closingDisclaimerStrong: { color: T.INK_2, fontWeight: 600 },
  };
}

// Tone → callout colors. good=green, caution=amber, info=gold.
export function flagTone(tone) {
  if (tone === 'good') return { border: T.GREEN, bg: GREEN_TINT, dot: T.GREEN };
  if (tone === 'info') return { border: T.GOLD_BORDER, bg: T.GOLD_TINT, dot: T.GOLD };
  return { border: T.AMBER_BORDER, bg: T.AMBER_BG, dot: T.AMBER }; // caution
}
