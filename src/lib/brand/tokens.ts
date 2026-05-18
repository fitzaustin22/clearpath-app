/**
 * ClearPath brand tokens — locked color identifiers used across the codebase.
 *
 * Palette reverted to m1–m4 CLAUDE.md values (Session 16; option C′):
 * NAVY/GOLD/PARCHMENT/GREEN. AMBER carried from design-partner bundle
 * (Session 16 D3 override — its BG/BORDER tints were tuned against it).
 * Opacity variants of NAVY and GOLD recomputed against new RGB bases.
 * Hex-tint tokens (GOLD_SOFT, PARCHMENT_DEEP, AMBER_BG/BORDER, RED_BG)
 * carried from bundle. m1–m4 components unchanged in this PR.
 *
 * Wizard-foundation additive extension (2026-05-17): appended 10 net-new
 * tokens (NAVY_DEEP/INK/INK_2/MUTED, LINE/LINE_STRONG/PILL_TEXT,
 * GOLD_FOCUS_RING, SHADOW_CARD/SHADOW_TOOLTIP) per Phase 0 Q-0 hybrid (c).
 * Zero edits to existing keys — SE/PVA/HDA palette consumption unaffected.
 * Spec deltas (gold-soft/cream/pill-bg) snap to the nearest existing T
 * (GOLD_SOFT/PARCHMENT/PARCHMENT_DEEP) — no new tokens for those.
 * Spec: Roadmap/Architecture/Wizard-Design-Spec.md (midgrade-active).
 *
 * FONT_* tokens reference the --font-newsreader and --font-inter CSS
 * variables exposed by next/font/google in src/app/layout.tsx, with
 * literal-name and system fallbacks for safety during font load.
 *
 * Usage: import { T } from '@/src/lib/brand/tokens';
 */
export const T = {
  NAVY:    '#1B2A4A',
  NAVY_70: 'rgba(27, 42, 74, 0.70)',
  NAVY_55: 'rgba(27, 42, 74, 0.55)',
  NAVY_38: 'rgba(27, 42, 74, 0.38)',
  NAVY_12: 'rgba(27, 42, 74, 0.12)',
  NAVY_06: 'rgba(27, 42, 74, 0.06)',

  // Wizard-foundation (2026-05-17): spec ink/text scale
  NAVY_DEEP: '#142038',
  INK:       '#1B2A4A',
  INK_2:     '#4A5876',
  MUTED:     '#8A93A8',

  GOLD:        '#C8A96E',
  GOLD_SOFT:   '#D4B16A',
  GOLD_TINT:   'rgba(200, 169, 110, 0.10)',
  GOLD_BORDER: 'rgba(200, 169, 110, 0.32)',

  // Wizard-foundation (2026-05-17): 3px focus ring (Q-7 / §4.7)
  GOLD_FOCUS_RING: 'rgba(200, 169, 110, 0.20)',

  PARCHMENT:      '#FAF8F2',
  PARCHMENT_DEEP: '#F1E9D3',
  CARD:           '#FFFFFF',

  // Wizard-foundation (2026-05-17): hairlines + provenance pill text
  LINE:        '#E6E2D8',
  LINE_STRONG: '#D4CFC2',
  PILL_TEXT:   '#8A7028',

  AMBER:        '#C68A12',
  AMBER_BG:     '#FBF1D0',
  AMBER_BORDER: '#E5C167',

  RED:    '#A8351E',
  RED_BG: '#FBEFEC',

  GREEN: '#2D8A4E',

  // Wizard-foundation (2026-05-17): SHADOW group (§4.7 build-time resolutions)
  SHADOW_CARD:    '0 1px 3px rgba(27, 42, 74, 0.06), 0 1px 2px rgba(27, 42, 74, 0.04)',
  SHADOW_TOOLTIP: '0 4px 12px rgba(27, 42, 74, 0.15)',

  FONT_DISPLAY: 'var(--font-newsreader), "Newsreader", "Cormorant Garamond", Georgia, serif',
  FONT_BODY:    'var(--font-inter), "Inter", "Source Sans 3", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
  FONT_NUMERIC: 'var(--font-newsreader), "Newsreader", Georgia, serif',

  NUMERIC_STYLE: {
    fontFamily: 'var(--font-newsreader)',
    fontVariantNumeric: 'lining-nums tabular-nums',
    fontOpticalSizing: 'auto',
  },
} as const;
