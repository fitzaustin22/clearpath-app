'use client';

/**
 * Military Pension Value Tool — public marketing lead-magnet calculator.
 *
 * Recreated from design_handoff_pension_value_tool/Military Pension Tool.dc.html
 * ("Side by side" layout, fixed — the prototype's layout switcher is dropped).
 * Token-driven inline styles (the ClearPath brand-token idiom; mirrors PVA/M6),
 * mapped to @/src/lib/brand/tokens. No hardcoded hex.
 *
 * MATH IS NOT DUPLICATED: all derived values come from the audited
 * getCalc() in @/src/lib/military-pension/getCalc — the same module the
 * server-side Snapshot PDF report uses, so the on-screen numbers and the
 * emailed report can never drift.
 *
 * Stores NO personal information. The only outbound write is the optional
 * "email me the PDF" capture (Part A) → POST /api/military-pension-report.
 */

import { useMemo, useState } from 'react';
import { T } from '@/src/lib/brand/tokens';
import {
  getCalc,
  num,
  usd,
  usdRange,
  pct,
  SOURCES,
  NEEDS_VERIFICATION,
  METHODS,
} from '@/src/lib/military-pension/getCalc';

/* ── Presentation data (not math; lives with the UI) ───────────────────── */

// CY2026 DFAS basic pay (effective Jan. 1, 2026), rounded. See NEEDS_VERIFICATION.
const RANK_ESTIMATES = [
  { label: 'E-5 · over 10 yrs · 2026', pay: 4395 },
  { label: 'E-6 · over 16 yrs · 2026', pay: 5194 },
  { label: 'E-7 · over 20 yrs · 2026', pay: 6245 },
  { label: 'E-8 · over 22 yrs · 2026', pay: 7308 },
  { label: 'E-9 · over 24 yrs · 2026', pay: 8756 },
  { label: 'W-3 · over 12 yrs · 2026', pay: 7136 },
  { label: 'O-3 · over 10 yrs · 2026', pay: 8376 },
  { label: 'O-4 · over 16 yrs · 2026', pay: 10402 },
  { label: 'O-5 · over 20 yrs · 2026', pay: 12033 },
  { label: 'O-6 · over 24 yrs · 2026', pay: 14479 },
];

const UPGRADE_FEATURES = [
  { title: 'All 12 Blueprint sections', desc: 'Assets, income, expenses, taxes, property division, retirement & QDRO, support, and your action plan.' },
  { title: 'Your printable Blueprint', desc: 'The full report in plain language — the document you take to your attorney or mediator.' },
  { title: 'Valuations for every account', desc: 'CDFA®-grade present-value math like this pension estimate, applied across all your retirement accounts.' },
  { title: 'Tax-impact modeling', desc: 'See the after-tax picture, including the § 121 home-sale exclusion.' },
  { title: 'Support scenarios', desc: 'Model spousal and child support side by side before you negotiate.' },
  { title: 'Theo on every step', desc: 'Your guided assistant explains each term and number as you go.' },
];

// Part C — flag citations brought up to the audited authorities, derived from
// the SOURCES source-of-truth so they can never drift from the report.
const cite = (id) => (SOURCES.find((x) => x.id === id) || {}).citation || '';
export const FLAG_CITES = {
  tenten: cite('ten_ten_rule'), // 10 U.S.C. § 1408(d)(2)
  frozen: cite('frozen_benefit_rule'), // Pub. L. 114-328, § 641(a) (Dec. 23, 2016); 10 U.S.C. § 1408(a)(4)(B)(i)–(ii)
  sbp: `10 U.S.C. §§ 1447–1455; ${cite('sbp_deemed_election')}`, // adds § 1450(f)(3)(C)
  va: `${cite('mansell')}; ${cite('howell')}; Yourko v. Yourko, 302 Va. 149 (2023)`,
};

/* ── Style tokens (design theme() → inline T; "airy" look, fixed) ──────── */

const FB = T.FONT_BODY;
const FD = T.FONT_DISPLAY; // production has no Playfair; display/editorial → Newsreader
const FE = T.FONT_DISPLAY;
const FN = T.FONT_NUMERIC;

const CHEVRON_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="12" height="8" viewBox="0 0 12 8"><path d="M1 1l5 5 5-5" fill="none" stroke="${T.INK_2}" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
const SELECT_CHEVRON = `url("data:image/svg+xml;utf8,${encodeURIComponent(CHEVRON_SVG)}")`;

const inputBase = {
  width: '100%', height: 36, boxSizing: 'border-box', borderRadius: 7,
  border: `1px solid ${T.LINE_STRONG}`, fontSize: 14, fontFamily: FB, color: T.INK,
  background: T.CARD, padding: '0 12px', outline: 'none',
  transition: 'border-color 120ms ease, box-shadow 120ms ease',
};
const statValue = { fontFamily: FB, fontSize: 24, fontWeight: 700, color: T.NAVY, marginTop: 4, fontVariantNumeric: 'lining-nums tabular-nums', lineHeight: 1.1 };
const breakdownRow = { display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', fontFamily: FB, fontSize: 13.5, color: T.INK_2 };
const card = { background: T.CARD, border: `1px solid ${T.LINE}`, borderRadius: 12, boxShadow: T.SHADOW_CARD, padding: '28px 30px' };

const s = {
  strong: { fontWeight: 600, color: T.NAVY },
  page: { minHeight: '100vh', background: T.PARCHMENT, fontFamily: FB, color: T.INK },
  contentWrap: { maxWidth: 1180, margin: '0 auto', padding: '32px 24px 64px' },
  header: { marginBottom: 18 },
  eyebrow: { display: 'inline-block', fontFamily: FB, fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.9px', color: T.PILL_TEXT, background: T.PARCHMENT_DEEP, padding: '4px 12px', borderRadius: 999, marginBottom: 12 },
  h1: { fontFamily: FD, fontWeight: 700, fontSize: 40, lineHeight: 1.08, color: T.NAVY, letterSpacing: '-0.01em', margin: '0 0 10px' },
  lead: { fontFamily: FB, fontSize: 16, lineHeight: 1.6, color: T.INK_2, maxWidth: 660, margin: 0 },

  disclaimer: { display: 'flex', gap: 12, alignItems: 'flex-start', background: T.PARCHMENT_DEEP, borderLeft: `3px solid ${T.GOLD}`, borderRadius: 8, padding: '12px 16px', marginTop: 16 },
  disclaimerLabel: { fontFamily: FB, fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.8px', color: T.PILL_TEXT, whiteSpace: 'nowrap', marginTop: 2 },
  disclaimerText: { fontFamily: FB, fontSize: 13, lineHeight: 1.5, color: T.INK_2, margin: 0 },

  notice: { marginTop: 14, marginBottom: 24, background: T.CARD, border: `1px solid ${T.LINE}`, borderRadius: 12, padding: '12px 16px', fontFamily: FB, fontSize: 13.5, lineHeight: 1.5, color: T.INK_2 },

  grid: { display: 'grid', gridTemplateColumns: 'minmax(0,1.55fr) minmax(0,1fr)', gap: 24, alignItems: 'start' },
  inputsCol: { display: 'flex', flexDirection: 'column', gap: 24 },
  resultsColWrap: { minWidth: 0 },
  resultsSticky: { position: 'sticky', top: 24, display: 'flex', flexDirection: 'column', gap: 16 },

  card,
  collapseCard: { ...card },
  collapseCardWide: { ...card, marginTop: 28 },

  secHead: { display: 'flex', alignItems: 'center', gap: 12, marginBottom: 6 },
  secTitle: { fontFamily: FB, fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.9px', color: T.NAVY, whiteSpace: 'nowrap' },
  secSub: { fontFamily: FB, fontSize: 13, color: T.MUTED, margin: '0 0 16px', lineHeight: 1.45 },
  rule: { flexGrow: 1, height: 1, background: T.LINE },

  fieldCol: { display: 'flex', flexDirection: 'column', gap: 18 },
  grid2: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 },
  label: { display: 'block', fontFamily: FB, fontSize: 12.5, fontWeight: 600, color: T.INK, marginBottom: 6 },
  hint: { fontWeight: 400, color: T.MUTED, marginLeft: 4, fontSize: 11.5 },
  fieldNote: { fontFamily: FB, fontSize: 12, lineHeight: 1.45, color: T.MUTED, margin: '6px 0 0' },
  input: inputBase,
  select: { ...inputBase, appearance: 'none', WebkitAppearance: 'none', cursor: 'pointer', paddingRight: 32, backgroundImage: SELECT_CHEVRON, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 10px center', backgroundSize: '12px 8px' },
  linkBtn: { marginTop: 8, background: 'transparent', border: 'none', padding: 0, color: T.PILL_TEXT, fontWeight: 600, fontSize: 13.5, fontFamily: FB, cursor: 'pointer' },

  segWrap: { display: 'flex', borderRadius: 999, background: T.PARCHMENT, border: `1px solid ${T.LINE_STRONG}`, overflow: 'hidden' },
  sliderRow: { display: 'flex', alignItems: 'center', gap: 12, marginTop: 4 },
  slider: { flex: 1, height: 6, accentColor: T.GOLD, cursor: 'pointer' },
  sliderVal: { width: 48, textAlign: 'right', fontFamily: FB, fontWeight: 700, fontSize: 14, color: T.NAVY, fontVariantNumeric: 'tabular-nums' },

  checkRow: { display: 'flex', alignItems: 'center', gap: 10, background: T.PARCHMENT, borderRadius: 8, padding: '10px 12px', cursor: 'pointer', fontFamily: FB, fontSize: 14, color: T.INK },
  checkbox: { width: 16, height: 16, accentColor: T.GOLD, cursor: 'pointer', flexShrink: 0 },

  rankWrap: { marginTop: 8, borderRadius: 10, border: `1px solid ${T.LINE}`, background: T.PARCHMENT, padding: 12 },
  rankIntro: { fontFamily: FB, fontSize: 12, lineHeight: 1.45, color: T.MUTED, margin: '0 0 8px' },
  rankGrid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 },
  rankBtn: { display: 'flex', flexDirection: 'column', gap: 2, textAlign: 'left', border: `1px solid ${T.LINE}`, background: T.CARD, borderRadius: 8, padding: '8px 10px', cursor: 'pointer', fontFamily: FB },
  rankLabel: { fontFamily: FB, fontSize: 12, fontWeight: 600, color: T.INK },
  rankPay: { fontFamily: FB, fontSize: 11.5, color: T.MUTED },

  collapseBtn: { display: 'flex', width: '100%', alignItems: 'center', justifyContent: 'space-between', gap: 16, background: 'transparent', border: 'none', padding: 0, cursor: 'pointer', textAlign: 'left' },
  collapseTitle: { display: 'block', fontFamily: FE, fontWeight: 600, fontSize: 16, color: T.NAVY },
  collapseSub: { display: 'block', fontFamily: FB, fontSize: 13, color: T.MUTED, marginTop: 2 },
  chevron: { color: T.MUTED, fontSize: 12, flexShrink: 0 },
  collapseBody: { borderTop: `1px solid ${T.LINE}`, marginTop: 16, paddingTop: 16 },

  assumpHead: { display: 'flex', alignItems: 'center', justifyContent: 'space-between' },
  assumpVal: { fontFamily: FB, fontWeight: 700, fontSize: 14, color: T.NAVY, fontVariantNumeric: 'tabular-nums' },
  assumpNote: { fontFamily: FB, fontSize: 12, lineHeight: 1.5, color: T.MUTED, margin: '8px 0 0' },

  resultEyebrow: { fontFamily: FB, fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.9px', color: T.MUTED, margin: '0 0 14px' },
  mutedP: { fontFamily: FB, fontSize: 14, lineHeight: 1.55, color: T.MUTED, margin: 0 },

  statGrid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 },
  stat: { background: T.PARCHMENT, borderRadius: 10, padding: '14px 16px' },
  statAccent: { background: T.PARCHMENT_DEEP, borderRadius: 10, padding: '14px 16px' },
  statLabel: { fontFamily: FB, fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.6px', color: T.MUTED },
  statLabelGold: { fontFamily: FB, fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.6px', color: T.PILL_TEXT },
  statValue,
  statValueGold: { ...statValue, color: T.PILL_TEXT },
  statSub: { fontFamily: FB, fontSize: 12, color: T.MUTED, marginTop: 3, lineHeight: 1.35 },

  fineNote: { fontFamily: FB, fontSize: 11.5, lineHeight: 1.5, color: T.MUTED, margin: '12px 0 0' },
  breakdownBox: { marginTop: 14, background: T.PARCHMENT, border: 'none', borderRadius: 10, padding: '14px 16px' },
  breakdownTop: { borderBottom: `1px solid ${T.LINE_STRONG}`, paddingBottom: 10, marginBottom: 10 },
  breakdownRow,
  breakdownRowB: { ...breakdownRow, marginTop: 6 },
  breakdownDed: { fontFamily: FB, fontSize: 11.5, color: T.MUTED, marginTop: 4 },
  breakdownVal: { fontWeight: 700, color: T.NAVY },

  pvCard: { marginTop: 16, background: T.CARD, border: `1px solid ${T.GOLD_BORDER}`, borderRadius: 12, padding: '18px 20px' },
  pvEyebrow: { fontFamily: FB, fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.9px', color: T.PILL_TEXT },
  pvRow: { display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 6, marginTop: 12 },
  pvCol: { textAlign: 'center', minWidth: 0 },
  pvColLabel: { fontFamily: FB, fontSize: 11, color: T.MUTED, marginBottom: 2 },
  pvMidLabel: { fontFamily: FB, fontSize: 11, fontWeight: 600, color: T.PILL_TEXT, marginBottom: 2 },
  pvSideVal: { fontFamily: FN, fontWeight: 600, fontSize: 16, color: T.INK_2, fontVariantNumeric: 'lining-nums tabular-nums', whiteSpace: 'nowrap' },
  pvMidVal: { fontFamily: FD, fontWeight: 700, fontSize: 32, color: T.GOLD, lineHeight: 1.04, fontVariantNumeric: 'lining-nums tabular-nums', whiteSpace: 'nowrap' },
  pvNote: { fontFamily: FB, fontSize: 12, lineHeight: 1.5, color: T.MUTED, margin: '12px 0 0' },
  capNote: { fontFamily: FB, fontSize: 12, lineHeight: 1.5, color: T.AMBER, margin: '12px 0 0' },

  narrative: { fontFamily: FB, fontSize: 14, lineHeight: 1.6, color: T.INK_2, margin: 0 },

  ctaCard: { background: T.NAVY, borderRadius: 12, padding: '22px 24px', color: T.CARD },
  ctaTitle: { fontFamily: FE, fontWeight: 600, fontSize: 18, color: T.CARD, margin: '0 0 6px' },
  ctaText: { fontFamily: FB, fontSize: 13.5, lineHeight: 1.55, color: 'rgba(255,255,255,0.72)', margin: '0 0 14px' },

  flagsBlock: { marginTop: 36 },
  blockTitle: { fontFamily: FE, fontWeight: 600, fontSize: 22, color: T.NAVY, margin: '0 0 4px' },
  blockSub: { fontFamily: FB, fontSize: 13.5, color: T.MUTED, margin: '0 0 16px' },
  flagGrid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 },
  flagTitle: { fontFamily: FB, fontWeight: 700, fontSize: 14, color: T.INK },
  flagBody: { fontFamily: FB, fontSize: 13.5, lineHeight: 1.6, color: T.INK_2, margin: '4px 0 0' },
  flagAside: { fontFamily: FB, fontStyle: 'italic', fontSize: 12.5, lineHeight: 1.55, color: T.MUTED, margin: '8px 0 0' },
  flagCite: { fontFamily: FB, fontSize: 11.5, color: T.MUTED, margin: '8px 0 0' },

  sourceList: { display: 'flex', flexDirection: 'column', gap: 10 },
  sourceItem: { borderRadius: 10, background: T.PARCHMENT, border: `1px solid ${T.LINE}`, padding: '12px 14px' },
  sourceHead: { display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10 },
  sourceLabel: { fontFamily: FB, fontSize: 13.5, fontWeight: 600, color: T.INK },
  sourceCite: { fontFamily: FB, fontSize: 12, fontWeight: 600, color: T.INK_2, marginTop: 4 },
  sourceNote: { fontFamily: FB, fontSize: 12, lineHeight: 1.5, color: T.MUTED, margin: '4px 0 0' },
  sourceLink: { display: 'inline-block', marginTop: 6, fontFamily: FB, fontSize: 12, fontWeight: 600, color: T.PILL_TEXT, textDecoration: 'none' },
  nvWrap: { marginTop: 20 },
  subHead: { fontFamily: FB, fontSize: 13.5, fontWeight: 700, color: T.INK, margin: '0 0 8px' },
  nvList: { margin: 0, paddingLeft: 18, display: 'flex', flexDirection: 'column', gap: 6 },
  nvItem: { fontFamily: FB, fontSize: 12, lineHeight: 1.5, color: T.MUTED },
  methodNote: { marginTop: 20, background: T.PARCHMENT, borderRadius: 8, padding: '12px 14px', fontFamily: FB, fontSize: 12, lineHeight: 1.55, color: T.MUTED },

  methodWarn: { background: T.AMBER_BG, border: `1px solid ${T.AMBER_BORDER}`, borderRadius: 8, padding: '12px 14px', fontFamily: FB, fontSize: 12, lineHeight: 1.55, color: T.INK },
  methodGrid: { display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginTop: 16 },
  methodCard: { borderRadius: 10, background: T.PARCHMENT, border: `1px solid ${T.LINE}`, padding: '14px 16px' },
  methodHead: { display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 },
  methodName: { fontFamily: FB, fontSize: 13.5, fontWeight: 600, color: T.INK },
  methodDriver: { fontFamily: FB, fontSize: 12, lineHeight: 1.45, color: T.MUTED, margin: '6px 0 10px' },
  methodRateLabel: { display: 'block', fontFamily: FB, fontSize: 12, fontWeight: 600, color: T.INK_2, marginBottom: 4 },
  methodBlank: { fontFamily: FB, fontSize: 11, color: T.MUTED, margin: '4px 0 0' },
  methodPV: { fontFamily: FN, fontSize: 18, fontWeight: 700, color: T.GOLD, marginTop: 8, fontVariantNumeric: 'lining-nums tabular-nums' },
  methodFoot: { fontFamily: FB, fontSize: 12, lineHeight: 1.55, color: T.MUTED, margin: '16px 0 0' },

  upgradeBand: { background: T.NAVY, borderRadius: 12, padding: '24px 26px', color: T.CARD },
  upgradeTop: { display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 24, flexWrap: 'wrap' },
  upgradeIntro: { flex: '1 1 360px', minWidth: 240, maxWidth: 640 },
  upgradeEyebrow: { fontFamily: FB, fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.9px', color: T.GOLD, marginBottom: 8 },
  upgradeTitle: { fontFamily: FE, fontWeight: 600, fontSize: 24, lineHeight: 1.2, color: T.CARD, margin: '0 0 8px' },
  upgradeText: { fontFamily: FB, fontSize: 14, lineHeight: 1.6, color: 'rgba(255,255,255,0.72)', margin: 0 },
  upgradeCtaWrap: { display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 10, flexShrink: 0 },
  upgradeToggle: { background: 'transparent', border: 'none', padding: 0, cursor: 'pointer', fontFamily: FB, fontSize: 13, fontWeight: 600, color: T.GOLD, display: 'inline-flex', alignItems: 'center', gap: 6 },
  upgradeFeatures: { borderTop: '1px solid rgba(255,255,255,0.14)', marginTop: 20, paddingTop: 20 },
  upgradeGrid: { display: 'grid', gridTemplateColumns: '1fr', gap: 14 },
  featureRow: { display: 'flex', alignItems: 'flex-start', gap: 10 },
  featureIcon: { flexShrink: 0, marginTop: 1, width: 22, height: 22, borderRadius: 999, background: T.GOLD, display: 'inline-flex', alignItems: 'center', justifyContent: 'center' },
  featureTitle: { display: 'block', fontFamily: FB, fontSize: 13.5, fontWeight: 600, color: T.CARD },
  featureDesc: { display: 'block', fontFamily: FB, fontSize: 12.5, lineHeight: 1.45, color: 'rgba(255,255,255,0.62)', marginTop: 2 },

  // Part A — capture card (parchment/white, single gold accent; NOT navy).
  captureCard: { background: T.CARD, border: `1px solid ${T.GOLD_BORDER}`, borderRadius: 12, padding: '22px 24px' },
  captureTitle: { fontFamily: FE, fontWeight: 600, fontSize: 18, color: T.NAVY, margin: '0 0 4px' },
  captureValue: { fontFamily: FB, fontSize: 13.5, lineHeight: 1.5, color: T.INK_2, margin: '0 0 14px' },
  captureRow: { display: 'flex', gap: 8, alignItems: 'stretch', flexWrap: 'wrap' },
  captureInput: { ...inputBase, flex: '1 1 200px', height: 42 },
  captureMicro: { fontFamily: FB, fontSize: 11.5, lineHeight: 1.5, color: T.MUTED, margin: '10px 0 0' },
  captureError: { fontFamily: FB, fontSize: 12, color: T.RED, margin: '8px 0 0' },
  captureSuccess: { display: 'flex', gap: 12, alignItems: 'flex-start' },
  captureSuccessTitle: { fontFamily: FE, fontWeight: 600, fontSize: 16, color: T.NAVY, margin: '0 0 2px' },
  captureSuccessText: { fontFamily: FB, fontSize: 13, lineHeight: 1.5, color: T.INK_2, margin: 0 },

  footer: { borderTop: `1px solid ${T.LINE}`, paddingTop: 24, marginTop: 36, fontFamily: FB, fontSize: 12, lineHeight: 1.6, color: T.MUTED },
  footStrong: { fontWeight: 700, color: T.INK_2 },
};

const FLAG_TONE = {
  good: { line: T.GREEN, fill: 'rgba(45,138,78,0.07)', dot: T.GREEN },
  caution: { line: T.AMBER_BORDER, fill: T.AMBER_BG, dot: T.AMBER },
  info: { line: T.GOLD_BORDER, fill: T.GOLD_TINT, dot: T.GOLD },
};
function flagBox(tone) {
  const m = FLAG_TONE[tone];
  return {
    box: { border: `1px solid ${m.line}`, background: m.fill, borderRadius: 12, padding: '16px 18px', display: 'flex', gap: 12, alignItems: 'flex-start' },
    dot: { width: 8, height: 8, borderRadius: '50%', background: m.dot, marginTop: 6, flexShrink: 0 },
  };
}

const segBtn = (active) => ({ flex: 1, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', minHeight: 42, padding: '0 10px', borderRadius: 999, fontSize: 13.5, fontWeight: 600, fontFamily: FB, cursor: 'pointer', whiteSpace: 'nowrap', color: active ? T.CARD : T.INK, background: active ? T.NAVY : 'transparent', transition: 'background-color 120ms ease', border: 'none' });

const okBadge = { flexShrink: 0, borderRadius: 999, padding: '2px 8px', fontSize: 11, fontWeight: 600, fontFamily: FB, background: 'rgba(45,138,78,0.12)', color: T.GREEN };
const warnBadge = { ...okBadge, background: T.AMBER_BG, color: T.AMBER };
const loBadge = { ...okBadge, background: T.NAVY_12, color: T.INK_2 };

const goldBtnStyle = { display: 'inline-flex', alignItems: 'center', justifyContent: 'center', height: 44, padding: '0 20px', borderRadius: 8, background: T.GOLD, color: T.NAVY, fontFamily: FB, fontWeight: 700, fontSize: 15, border: 'none', cursor: 'pointer', textDecoration: 'none', whiteSpace: 'nowrap' };

function GoldLink({ href, children }) {
  return <a href={href} style={goldBtnStyle}>{children}</a>;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/* ── Part A: capture card (own state; defined outside main for focus safety) ── */

function CaptureCard({ toolInputs }) {
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState('idle'); // idle | loading | done | error
  const [error, setError] = useState('');

  const submit = async (e) => {
    e.preventDefault();
    if (!EMAIL_RE.test(email.trim())) {
      setError('Please enter a valid email address.');
      return;
    }
    setError('');
    setStatus('loading');
    try {
      const res = await fetch('/api/military-pension-report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), toolInputs }),
      });
      if (!res.ok) throw new Error('request failed');
      setStatus('done');
    } catch {
      setStatus('error');
      setError('Something went wrong — please try again in a moment.');
    }
  };

  if (status === 'done') {
    return (
      <div style={s.captureCard}>
        <div style={s.captureSuccess}>
          <span style={{ ...s.featureIcon, marginTop: 0 }}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke={T.NAVY} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ display: 'block' }}><path d="M20 6 9 17l-5-5" /></svg>
          </span>
          <div>
            <p style={s.captureSuccessTitle}>Your report is on its way</p>
            <p style={s.captureSuccessText}>Check your inbox — it should arrive in a minute or two.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={s.captureCard}>
      <h3 style={s.captureTitle}>Get your full breakdown as a PDF</h3>
      <p style={s.captureValue}>plus the questions to bring to your attorney</p>
      <form onSubmit={submit} style={s.captureRow} noValidate>
        <input
          type="email"
          className="mpv-field"
          aria-label="Email address"
          placeholder="you@example.com"
          style={s.captureInput}
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          disabled={status === 'loading'}
        />
        <button type="submit" style={{ ...goldBtnStyle, background: T.NAVY, color: T.CARD, opacity: status === 'loading' ? 0.6 : 1 }} disabled={status === 'loading'}>
          {status === 'loading' ? 'Sending…' : 'Email it to me'}
        </button>
      </form>
      {error ? <p style={s.captureError}>{error}</p> : null}
      <p style={s.captureMicro}>We&apos;ll email your report and occasional CDFA® resources. Unsubscribe anytime.</p>
    </div>
  );
}

/* ── Main component ────────────────────────────────────────────────────── */

const INITIAL = {
  system: 'unsure', serviceType: 'active', serviceStartDate: '2006-06',
  alreadyReceivingPay: false, yearsNow: '18', yearsAtRetirement: '20',
  pointsNow: '3200', pointsAtRetirement: '3800', high3Pay: '5500',
  vaWaiverMonthly: '', memberAge: '44', marriageDate: '2008-06',
  separationDate: '2024-06', awardPct: '50', sbpElected: 'unsure',
  discountRate: '4.5', colaRate: '2.5', lifeExpectancyAge: '85',
  rateLifeExp: '', ratePbgc: '', rateGatt: '',
};

export default function MilitaryPensionTool() {
  const [inp, setInp] = useState(INITIAL);
  const [showAssumptions, setShowAssumptions] = useState(false);
  const [showRankHelper, setShowRankHelper] = useState(false);
  const [showSources, setShowSources] = useState(false);
  const [showMethods, setShowMethods] = useState(false);
  const [showUpgrade, setShowUpgrade] = useState(false);

  const set = (key) => (e) => {
    const v = e && e.target ? (e.target.type === 'checkbox' ? e.target.checked : e.target.value) : e;
    setInp((prev) => ({ ...prev, [key]: v }));
  };
  const pick = (key, v) => setInp((prev) => ({ ...prev, [key]: v }));

  const c = useMemo(() => getCalc(inp), [inp]);
  const isReserve = c.isReserve;
  const methodPV = { lifeExp: c.pvLifeExp, pbgc: c.pvPbgc, gatt: c.pvGatt };

  const flag1010 = flagBox(c.meets1010 ? 'good' : 'caution');
  const flagFrozen = flagBox('info');
  const flagSbp = flagBox(inp.sbpElected === 'yes' ? 'good' : 'caution');
  const flagVa = flagBox('caution');

  const disposableClause = c.disposableMonthly < c.grossMonthly
    ? ` of about ${usd(c.disposableMonthly)}/month (gross minus the SBP premium and any VA-disability waiver)`
    : ' (gross minus any SBP premium and VA-disability waiver)';
  const yearsClause = c.yearsUntilStart > 0 ? ` (in roughly ${Math.round(c.yearsUntilStart)} years)` : '';
  const deductions = [c.sbpPremium > 0 ? '− SBP premium' : null, c.vaWaiver > 0 ? '− VA waiver' : null].filter(Boolean).join('     ');
  // Part B — honest, frozen-conditional gross sublabel (mirrors the report relabel).
  const grossSub = c.isFrozen ? 'frozen to rank & service at divorce' : 'full member benefit (estimate)';

  const input = (key, type = 'number') => (
    <input type={type} className="mpv-field" style={s.input} value={inp[key]} onChange={set(key)} />
  );

  return (
    <div style={s.page}>
      <style>{`
        .mpv-field:focus { border-color: ${T.GOLD}; box-shadow: 0 0 0 3px ${T.GOLD_FOCUS_RING}; }
        input[type=range] { accent-color: ${T.GOLD}; }
        input[type=number]::-webkit-inner-spin-button { opacity: 0.35; }
      `}</style>

      <div style={s.contentWrap}>
        <header style={s.header}>
          <div style={s.eyebrow}>Educational estimate</div>
          <h1 style={s.h1}>What is the military pension worth?</h1>
          <p style={s.lead}>A military pension is often the largest asset in a divorce — frequently worth more than the house. This tool gives you a calm, plain-language starting estimate: the monthly benefit, your likely marital share, and a present-value range. You don&apos;t need to know every detail — sensible defaults and &ldquo;not sure&rdquo; options are built in.</p>
        </header>

        <div style={s.disclaimer}>
          <span style={s.disclaimerLabel}>Not legal advice</span>
          <p style={s.disclaimerText}>This is an educational estimate, not legal or financial advice. It cannot account for your state&apos;s rules or the specific facts of your case, and it stores no personal information. Use it to walk into planning informed — then talk to a CDFA® and a family-law attorney.</p>
        </div>

        <div style={s.notice}>The fields below are pre-filled with example values so you can see how it works. Replace them with your situation — the estimate updates as you type.</div>

        <div style={s.grid}>
          {/* ── Inputs column ── */}
          <div style={s.inputsCol}>
            <div style={s.card}>
              <div style={s.secHead}><span style={s.secTitle}>About the service</span><span style={s.rule} /></div>
              <div style={s.secSub}>Even rough answers are fine — pick &ldquo;not sure&rdquo; if you don&apos;t know.</div>
              <div style={s.fieldCol}>
                <div>
                  <label style={s.label}>Retirement system</label>
                  <select className="mpv-field" style={s.select} value={inp.system} onChange={set('system')}>
                    <option value="unsure">Not sure (we&apos;ll use the Legacy/High-3 formula)</option>
                    <option value="high3">Legacy / High-3 — 2.5% per year</option>
                    <option value="brs">Blended Retirement System (BRS) — 2.0% per year</option>
                  </select>
                  {inp.system === 'unsure' ? <p style={s.fieldNote}>Defaulting to Legacy/High-3 (2.5%/yr). If the member first joined on or after Jan. 1, 2018, switch to BRS.</p> : null}
                </div>

                <div>
                  <label style={s.label}>Active duty or Reserve/Guard?</label>
                  <div style={s.segWrap}>
                    {[['active', 'Active duty'], ['reserve', 'Reserve / Guard']].map(([v, l]) => (
                      <button key={v} type="button" onClick={() => pick('serviceType', v)} style={segBtn(inp.serviceType === v)}>{l}</button>
                    ))}
                  </div>
                  {isReserve ? <p style={s.fieldNote}>Reserve/Guard pensions are points-based and usually start at age 60. We convert points to years using points ÷ 360.</p> : null}
                </div>

                <div>
                  <label style={s.label}>When did service begin? <span style={s.hint}>(month &amp; year they entered service)</span></label>
                  {input('serviceStartDate', 'month')}
                </div>

                {isReserve ? (
                  <div style={s.grid2}>
                    <div>
                      <label style={s.label}>Retirement points <span style={s.hint}>(now)</span></label>
                      {input('pointsNow')}
                      <p style={s.fieldNote}>≈ {(num(inp.pointsNow) / 360).toFixed(1)} equivalent years</p>
                    </div>
                    <div>
                      <label style={s.label}>Points at retirement <span style={s.hint}>(projected)</span></label>
                      <input type="number" className="mpv-field" style={s.input} value={inp.pointsAtRetirement} onChange={set('pointsAtRetirement')} disabled={inp.alreadyReceivingPay} />
                      <p style={s.fieldNote}>≈ {(num(inp.pointsAtRetirement) / 360).toFixed(1)} equivalent years</p>
                    </div>
                  </div>
                ) : (
                  <div style={s.grid2}>
                    <div>
                      <label style={s.label}>Years of service <span style={s.hint}>(now / at divorce)</span></label>
                      {input('yearsNow')}
                    </div>
                    <div>
                      <label style={s.label}>Years at retirement <span style={s.hint}>(projected)</span></label>
                      <input type="number" className="mpv-field" style={s.input} value={inp.yearsAtRetirement} onChange={set('yearsAtRetirement')} disabled={inp.alreadyReceivingPay} />
                    </div>
                  </div>
                )}

                <label style={s.checkRow}>
                  <input type="checkbox" style={s.checkbox} checked={inp.alreadyReceivingPay} onChange={set('alreadyReceivingPay')} />
                  <span>The member is already retired and receiving pay</span>
                </label>

                <div>
                  <label style={s.label}>Member&apos;s current age <span style={s.hint}>(today)</span></label>
                  {input('memberAge')}
                </div>
              </div>
            </div>

            <div style={s.card}>
              <div style={s.secHead}><span style={s.secTitle}>The pension benefit</span><span style={s.rule} /></div>
              <div style={s.secSub}>An estimate is fine — use the helper if you only know rank.</div>
              <div style={s.fieldCol}>
                <div>
                  <label style={s.label}>Estimated High-3 monthly base pay <span style={s.hint}>(avg. of the highest 36 months of basic pay)</span></label>
                  {input('high3Pay')}
                  <button type="button" onClick={() => setShowRankHelper((x) => !x)} style={s.linkBtn}>{showRankHelper ? 'Hide rank estimates' : 'Not sure? Estimate from rank →'}</button>
                  {showRankHelper ? (
                    <div style={s.rankWrap}>
                      <p style={s.rankIntro}><strong>CY2026 DFAS basic pay</strong> (effective Jan. 1, 2026), rounded — replace with the exact cell or the member&apos;s actual High-3 if you have it.</p>
                      <div style={s.rankGrid}>
                        {RANK_ESTIMATES.map((r) => (
                          <button key={r.label} type="button" onClick={() => pick('high3Pay', String(r.pay))} style={s.rankBtn}>
                            <span style={s.rankLabel}>{r.label}</span>
                            <span style={s.rankPay}>≈ {usd(r.pay)}/mo</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  ) : null}
                </div>
                <div>
                  <label style={s.label}>Estimated VA disability waiver <span style={s.hint}>(monthly $ — optional)</span></label>
                  {input('vaWaiverMonthly')}
                  <p style={s.fieldNote}>If the member waives retired pay for VA disability, that amount is removed from the divisible (disposable) pay. Leave blank if unknown — it&apos;s often uncertain until retirement.</p>
                </div>
              </div>
            </div>

            <div style={s.card}>
              <div style={s.secHead}><span style={s.secTitle}>Marriage timeline &amp; your award</span><span style={s.rule} /></div>
              <div style={s.secSub}>Used to figure your marital share — the overlap of the marriage with the service.</div>
              <div style={s.fieldCol}>
                <div style={s.grid2}>
                  <div>
                    <label style={s.label}>Date of marriage</label>
                    {input('marriageDate', 'month')}
                  </div>
                  <div>
                    <label style={s.label}>Date of separation <span style={s.hint}>(or divorce)</span></label>
                    {input('separationDate', 'month')}
                  </div>
                </div>
                <div>
                  <label style={s.label}>Court-awarded share of the marital portion <span style={s.hint}>(commonly near 50%)</span></label>
                  <div style={s.sliderRow}>
                    <input type="range" min="0" max="100" step="1" style={s.slider} value={inp.awardPct} onChange={set('awardPct')} />
                    <span style={s.sliderVal}>{inp.awardPct}%</span>
                  </div>
                </div>
                <div>
                  <label style={s.label}>Is a Survivor Benefit Plan (SBP) elected?</label>
                  <div style={s.segWrap}>
                    {[['yes', 'Yes'], ['no', 'No'], ['unsure', 'Not sure']].map(([v, l]) => (
                      <button key={v} type="button" onClick={() => pick('sbpElected', v)} style={segBtn(inp.sbpElected === v)}>{l}</button>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            <div style={s.collapseCard}>
              <button type="button" onClick={() => setShowAssumptions((x) => !x)} style={s.collapseBtn}>
                <span><span style={s.collapseTitle}>Assumptions — adjust these</span><span style={s.collapseSub}>Illustrative defaults you control. These are not official or guaranteed rates.</span></span>
                <span style={s.chevron}>{showAssumptions ? '▲' : '▼'}</span>
              </button>
              {showAssumptions ? (
                <div style={s.collapseBody}>
                  <div style={s.fieldCol}>
                    <div>
                      <div style={s.assumpHead}><label style={s.label}>Discount rate</label><span style={s.assumpVal}>{inp.discountRate}%</span></div>
                      <input type="range" min="1" max="8" step="0.1" style={s.slider} value={inp.discountRate} onChange={set('discountRate')} />
                      <p style={s.assumpNote}><strong>Illustrative assumption.</strong> There is no single official divorce discount rate. This anchors near long-term Treasury / typical actuarial practice; the present-value range is built by varying it ±1.5%.</p>
                    </div>
                    <div>
                      <div style={s.assumpHead}><label style={s.label}>Annual COLA (cost-of-living)</label><span style={s.assumpVal}>{inp.colaRate}%</span></div>
                      <input type="range" min="0" max="6" step="0.1" style={s.slider} value={inp.colaRate} onChange={set('colaRate')} />
                      <p style={s.assumpNote}><strong>Illustrative assumption.</strong> Military retiree COLA is CPI-W based and varies yearly. A ~2–3% central assumption reflects historical norms, not a forecast.</p>
                    </div>
                    <div>
                      <div style={s.assumpHead}><label style={s.label}>Life expectancy (age)</label><span style={s.assumpVal}>{inp.lifeExpectancyAge} yrs</span></div>
                      <input type="range" min="65" max="100" step="1" style={s.slider} value={inp.lifeExpectancyAge} onChange={set('lifeExpectancyAge')} />
                      <p style={s.assumpNote}><strong>Illustrative assumption.</strong> Anchor to SSA period life tables by age and sex. This only sets how long payments are assumed to last.</p>
                    </div>
                  </div>
                </div>
              ) : null}
            </div>
          </div>

          {/* ── Results column ── */}
          <div style={s.resultsColWrap}>
            <div style={s.resultsSticky}>
              {/* Upgrade band */}
              <div style={s.upgradeBand}>
                <div style={s.upgradeTop}>
                  <div style={s.upgradeIntro}>
                    <div style={s.upgradeEyebrow}>Full Access</div>
                    <h2 style={s.upgradeTitle}>Unlock your complete Blueprint</h2>
                    <p style={s.upgradeText}>This is one slice. Full Access values every account, models the taxes and support, and assembles your printable Blueprint.</p>
                  </div>
                  <div style={s.upgradeCtaWrap}>
                    <GoldLink href="/upgrade">Upgrade to Full Access →</GoldLink>
                    <button type="button" onClick={() => setShowUpgrade((x) => !x)} style={s.upgradeToggle}>
                      {showUpgrade ? "Hide what's included" : 'See everything you unlock'} <span>{showUpgrade ? '▲' : '▼'}</span>
                    </button>
                  </div>
                </div>
                {showUpgrade ? (
                  <div style={s.upgradeFeatures}>
                    <div style={s.upgradeGrid}>
                      {UPGRADE_FEATURES.map((f) => (
                        <div key={f.title} style={s.featureRow}>
                          <span style={s.featureIcon}>
                            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke={T.NAVY} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ display: 'block' }}><path d="M20 6 9 17l-5-5" /></svg>
                          </span>
                          <span><span style={s.featureTitle}>{f.title}</span><span style={s.featureDesc}>{f.desc}</span></span>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : null}
              </div>

              {/* Your estimate */}
              <div style={s.card}>
                <h2 style={s.resultEyebrow}>Your estimate</h2>
                {!c.hasResult ? (
                  <p style={s.mutedP}>Fill in service dates, years/points, base pay, and the marriage timeline to see an estimate.</p>
                ) : (
                  <>
                    <div style={s.statGrid}>
                      <div style={s.stat}>
                        <div style={s.statLabel}>Gross monthly pension</div>
                        <div style={s.statValue}>{usd(c.grossMonthly)}</div>
                        <div style={s.statSub}>{grossSub}</div>
                      </div>
                      <div style={s.statAccent}>
                        <div style={s.statLabelGold}>Your estimated share</div>
                        <div style={s.statValueGold}>{usd(c.spouseMonthly)}</div>
                        <div style={s.statSub}>{pct(c.shareFraction, 1)} of the pension / month</div>
                      </div>
                    </div>
                    <p style={s.fineNote}>USFSPA divides disposable retired pay — gross minus certain deductions (SBP premium, any VA-disability waiver), not full gross (§ 1408(a)(4)(A)).</p>
                    <div style={s.breakdownBox}>
                      {c.disposableMonthly < c.grossMonthly ? (
                        <div style={s.breakdownTop}>
                          <div style={s.breakdownRow}><span>Divisible (disposable) base</span><span style={s.breakdownVal}>{usd(c.disposableMonthly)}</span></div>
                          <div style={s.breakdownDed}>{deductions}</div>
                        </div>
                      ) : null}
                      <div style={s.breakdownRow}><span>Marital (coverture) fraction</span><span style={s.breakdownVal}>{pct(c.coverture, 0)}</span></div>
                      <div style={s.breakdownRowB}><span>× court-awarded share</span><span style={s.breakdownVal}>{inp.awardPct}%</span></div>
                    </div>
                    <div style={s.pvCard}>
                      <div style={s.pvEyebrow}>Present value of your share — a range</div>
                      <div style={s.pvRow}>
                        <div style={s.pvCol}><div style={s.pvColLabel}>Lower</div><div style={s.pvSideVal}>≈ {usdRange(c.pvLow)}</div></div>
                        <div style={s.pvCol}><div style={s.pvMidLabel}>Middle</div><div style={s.pvMidVal}>≈ {usdRange(c.pvBase)}</div></div>
                        <div style={s.pvCol}><div style={s.pvColLabel}>Higher</div><div style={s.pvSideVal}>≈ {usdRange(c.pvHigh)}</div></div>
                      </div>
                      <p style={s.pvNote}>A lump-sum value of your future monthly share, in today&apos;s dollars. We show a range — not one &ldquo;magic number&rdquo; — because it swings with the discount rate, COLA, and how long payments last. Adjust those in Assumptions.</p>
                    </div>
                    {c.directPayCapHit ? <p style={s.capNote}>Note: your computed slice exceeds 50% of the pension. DFAS will not directly pay a former spouse more than 50% of disposable retired pay for a property division (§ 1408(e)(1)).</p> : null}
                  </>
                )}
              </div>

              {/* What this means */}
              {c.hasResult ? (
                <div style={s.card}>
                  <h3 style={s.resultEyebrow}>What this means for you</h3>
                  <p style={s.narrative}>Based on what you entered, the member&apos;s pension is worth roughly <strong style={s.strong}>{usd(c.grossMonthly)}/month</strong> in gross retired pay. Your marital share is figured on the <strong style={s.strong}>divisible (disposable) base</strong>{disposableClause}, and works out to about <strong style={s.strong}>{usd(c.spouseMonthly)}/month</strong> once payments begin{yearsClause} — a lump-sum value in today&apos;s dollars somewhere around <strong style={s.strong}>{usdRange(c.pvLow)}–{usdRange(c.pvHigh)}</strong>. Treat this as a starting point for a real conversation, not a final figure — the four factors below can move it meaningfully.</p>
                </div>
              ) : null}

              {/* Part A — capture card (after estimate + narrative) */}
              {c.hasResult ? <CaptureCard toolInputs={inp} /> : null}

              {/* CTA card */}
              <div style={s.ctaCard}>
                <h3 style={s.ctaTitle}>Get a real number for your situation</h3>
                <p style={s.ctaText}>Your state and your specific facts change this estimate. A CDFA® can value the pension precisely; a family-law attorney protects it in the order.</p>
                <GoldLink href="/upgrade">Talk to a CDFA® &amp; a family-law attorney</GoldLink>
              </div>
            </div>
          </div>
        </div>

        {/* Flags */}
        <div style={s.flagsBlock}>
          <h2 style={s.blockTitle}>Four things that move this number</h2>
          <p style={s.blockSub}>These are the issues most people get wrong. Here&apos;s how each one applies to what you entered.</p>
          <div style={s.flagGrid}>
            <div style={flag1010.box}>
              <span style={flag1010.dot} />
              <div>
                <div style={s.flagTitle}>The 10/10 rule — who cuts the check</div>
                {c.meets1010 ? (
                  <p style={s.flagBody}>Your marriage appears to overlap the service by about <strong style={s.strong}>{c.overlapYears.toFixed(1)} years</strong>, so you likely meet 10/10 — meaning DFAS can pay your court-awarded share to you <strong style={s.strong}>directly</strong>.</p>
                ) : (
                  <p style={s.flagBody}>Your marriage-to-service overlap looks like about <strong style={s.strong}>{Math.max(0, c.overlapYears).toFixed(1)} years</strong>. Even if that&apos;s under 10, this does <strong style={s.strong}>not</strong> mean you get nothing — a court can still award you a share. The 10/10 rule only decides whether <strong style={s.strong}>DFAS</strong> pays you directly. It is not an entitlement test.</p>
                )}
                <div style={s.flagCite}>{FLAG_CITES.tenten}</div>
              </div>
            </div>

            <div style={flagFrozen.box}>
              <span style={flagFrozen.dot} />
              <div>
                <div style={s.flagTitle}>The frozen benefit rule (divorces after Dec. 23, 2016)</div>
                {c.isFrozen ? (
                  <p style={s.flagBody}>Because the divorce is after Dec. 23, 2016 and the member isn&apos;t retired yet, the divisible pension is generally <strong style={s.strong}>frozen</strong> to the member&apos;s rank and years of service <strong style={s.strong}>as of the divorce</strong> (plus cost-of-living bumps). Promotions and extra years earned later don&apos;t grow your share.</p>
                ) : inp.alreadyReceivingPay ? (
                  <p style={s.flagBody}>The member is already drawing retired pay, so the freeze doesn&apos;t apply — the actual retired pay is the base for division.</p>
                ) : (
                  <p style={s.flagBody}>Your divorce date appears to be on or before Dec. 23, 2016, so the freeze likely doesn&apos;t apply and the member&apos;s pay at actual retirement may govern.{c.onCutoffBoundary ? ' Your date is right at the cutoff — the exact decree date matters here, so confirm it.' : ''}</p>
                )}
                {/* Part B — qualitative line near the frozen flag */}
                <p style={s.flagAside}>A precise valuation freezes the divisible base to today&apos;s rank and pay — your share won&apos;t grow with future promotions.</p>
                <div style={s.flagCite}>{FLAG_CITES.frozen}</div>
              </div>
            </div>

            <div style={flagSbp.box}>
              <span style={flagSbp.dot} />
              <div>
                <div style={s.flagTitle}>Survivor Benefit Plan (SBP)</div>
                {inp.sbpElected === 'yes' ? (
                  <p style={s.flagBody}>Good — with former-spouse SBP coverage in place, income can continue to you after the retiree dies. If a court order requires it and it isn&apos;t actually elected, you can request a &ldquo;deemed election,&rdquo; but DFAS must receive it within <strong style={s.strong}>one year</strong> of the order.</p>
                ) : (
                  <p style={s.flagBody}>Watch this one: your share of the pension <strong style={s.strong}>stops when the retiree dies</strong> unless former-spouse SBP coverage is in place. SBP is a separate survivor annuity, not part of the pension split. If a court orders it, the &ldquo;deemed election&rdquo; request must reach DFAS within <strong style={s.strong}>one year</strong> — missing it can permanently forfeit the right.</p>
                )}
                <div style={s.flagCite}>{FLAG_CITES.sbp}</div>
              </div>
            </div>

            <div style={flagVa.box}>
              <span style={flagVa.dot} />
              <div>
                <div style={s.flagTitle}>VA disability waiver</div>
                <p style={s.flagBody}>If the member waives part of their retired pay to receive VA disability compensation, that portion is removed from the divisible pension — so a &ldquo;percentage&rdquo; award can shrink in real dollars. A court <strong style={s.strong}>cannot</strong> order the veteran to pay you back for that loss (Mansell; Howell). In Virginia, though, the two of you can <strong style={s.strong}>agree</strong> to a guaranteed-payment or indemnification provision, and a court can enforce that agreement — the bar is only on court-imposed indemnification. Worth raising with your attorney as a drafting option.</p>
                <div style={s.flagCite}>{FLAG_CITES.va}</div>
              </div>
            </div>
          </div>
        </div>

        {/* Sources & methodology */}
        <div style={s.collapseCardWide}>
          <button type="button" onClick={() => setShowSources((x) => !x)} style={s.collapseBtn}>
            <span><span style={s.collapseTitle}>Sources &amp; methodology</span><span style={s.collapseSub}>Every rule above traces to a verifiable authority.</span></span>
            <span style={s.chevron}>{showSources ? '▲' : '▼'}</span>
          </button>
          {showSources ? (
            <div style={s.collapseBody}>
              <div style={s.sourceList}>
                {SOURCES.map((x) => (
                  <div key={x.id} style={s.sourceItem}>
                    <div style={s.sourceHead}>
                      <div style={s.sourceLabel}>{x.label}</div>
                      <span style={x.verified ? okBadge : warnBadge}>{x.verified ? 'verified' : 'needs verify'}</span>
                    </div>
                    <div style={s.sourceCite}>{x.citation}</div>
                    <p style={s.sourceNote}>{x.note}</p>
                    <a href={x.url} target="_blank" rel="noreferrer" style={s.sourceLink}>source ↗</a>
                  </div>
                ))}
              </div>
              <div style={s.nvWrap}>
                <h4 style={s.subHead}>Still needs human verification</h4>
                <ul style={s.nvList}>
                  {NEEDS_VERIFICATION.map((nv, i) => <li key={i} style={s.nvItem}>{nv}</li>)}
                </ul>
              </div>
              <div style={s.methodNote}><strong style={s.strong}>How the present value is computed:</strong> the spouse&apos;s monthly share is grown by the COLA assumption and discounted to today as a life annuity that begins at retirement eligibility and runs to the life-expectancy age — a transparent, deterministic version of the recognized life-expectancy method. The range comes from varying the discount rate ±1.5%. This is an educational model, consistent with the spirit of ASOP No. 34&apos;s emphasis on disclosing valuation ranges, not a court-grade actuarial valuation.</div>
            </div>
          ) : null}
        </div>

        {/* Compare the three valuation methods */}
        {c.hasResult ? (
          <div style={s.collapseCardWide}>
            <button type="button" onClick={() => setShowMethods((x) => !x)} style={s.collapseBtn}>
              <span><span style={s.collapseTitle}>Compare the three valuation methods</span><span style={s.collapseSub}>The same pension values several defensible ways — here&apos;s the spread.</span></span>
              <span style={s.chevron}>{showMethods ? '▲' : '▼'}</span>
            </button>
            {showMethods ? (
              <div style={s.collapseBody}>
                <div style={s.methodWarn}><strong style={s.strong}>Illustrative — not an actuarial valuation.</strong> Each card discounts the same projected cashflow at the rate you enter (blank uses your assumed rate above, so they start equal). A real PBGC or GATT/§ 417(e) valuation also applies that method&apos;s own mortality table and the rate published for the valuation date — which this tool does not compute. A credentialed actuary runs the method that fits the case.</div>
                <div style={s.methodGrid}>
                  {METHODS.map((m) => {
                    const isHigh = c.methodsDiffer && c.highestKey === m.key;
                    const isLow = c.methodsDiffer && c.lowestKey === m.key;
                    return (
                      <div key={m.key} style={s.methodCard}>
                        <div style={s.methodHead}>
                          <div style={s.methodName}>{m.name}</div>
                          {isHigh ? <span style={okBadge}>Highest value</span> : isLow ? <span style={loBadge}>Lowest value</span> : null}
                        </div>
                        <p style={s.methodDriver}>{m.driver}</p>
                        <label style={s.methodRateLabel}>Discount rate (%)</label>
                        <input type="number" className="mpv-field" style={s.input} value={inp[m.rateKey]} onChange={set(m.rateKey)} placeholder={String(num(inp.discountRate))} />
                        <p style={s.methodBlank}>blank = your assumed rate</p>
                        <div style={s.methodPV}>≈ {usdRange(methodPV[m.key])}</div>
                      </div>
                    );
                  })}
                </div>
                <p style={s.methodFoot}>Present value rises as the discount rate falls, so whichever method carries the lowest rate for your valuation date produces the highest value — and that ordering shifts as published rates change. Enter each method&apos;s current published rate (your CDFA® or actuary can supply it) to compare.</p>
              </div>
            ) : null}
          </div>
        ) : null}

        <footer style={s.footer}>
          <p style={{ margin: 0 }}><strong style={s.footStrong}>Educational estimate only — not legal, tax, or financial advice, and not an actuarial valuation.</strong> Results are approximate and depend on assumptions you control. Military pension division is governed by the USFSPA (10 U.S.C. § 1408) and the law of your state; outcomes vary with your specific facts. This tool collects and stores no personal information. Always consult a CDFA® and a licensed family-law attorney before making decisions.</p>
        </footer>
      </div>
    </div>
  );
}
