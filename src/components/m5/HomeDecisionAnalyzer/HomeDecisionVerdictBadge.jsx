'use client';

import { T } from '@/src/lib/brand/tokens';

/**
 * §9.6.2 Q-10 — Keep & refi verdict cell-badge.
 *
 * Multi-channel per WCAG 2.1 AA (1.4.1 Use of Color): the text label is the
 * load-bearing channel (always rendered, screen-reader accessible as plain
 * text); color and icon are decorative reinforcement (icon is aria-hidden).
 *
 * Underwater (bindingConstraint === 'underwater') overrides the tier display
 * with the §9.6.2 "not viable" dark treatment even though refiQualifier
 * returns verdictTier 'red' for that case.
 *
 * @param {object} props
 * @param {'green'|'yellow'|'red'} props.verdictTier
 * @param {'dti'|'credit'|'margin-of-safety'|'multiple'|'underwater'|'none'} [props.bindingConstraint]
 */

// Green has no bg/border token in tokens.ts (only the GREEN base). Tints are
// derived from the T.GREEN rgb at the same 0.10 / 0.32 alphas tokens.ts uses
// for its GOLD_TINT / GOLD_BORDER pair, so the palette stays internally
// consistent without inventing off-system hex values.
const VARIANTS = {
  green: {
    label: 'Likely qualifies',
    icon: '✓',
    fg: T.GREEN,
    bg: 'rgba(45, 138, 78, 0.10)',
    border: 'rgba(45, 138, 78, 0.32)',
  },
  yellow: {
    label: 'Borderline',
    icon: '▲',
    fg: T.AMBER,
    bg: T.AMBER_BG,
    border: T.AMBER_BORDER,
  },
  red: {
    label: "Likely doesn't qualify",
    icon: '✕',
    fg: T.RED,
    bg: T.RED_BG,
    border: 'rgba(168, 53, 30, 0.32)',
  },
  underwater: {
    label: 'Not viable — see narrative',
    icon: '!',
    fg: T.NAVY,
    bg: T.NAVY_06,
    border: T.NAVY_12,
  },
};

export default function HomeDecisionVerdictBadge({ verdictTier, bindingConstraint }) {
  const key = bindingConstraint === 'underwater' ? 'underwater' : verdictTier;
  const v = VARIANTS[key];
  if (!v) return null;

  return (
    <span
      data-testid="hda-verdict-badge"
      data-verdict={key}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 6,
        padding: '4px 10px',
        borderRadius: 999,
        background: v.bg,
        color: v.fg,
        border: `1px solid ${v.border}`,
        fontFamily: T.FONT_BODY,
        fontSize: 13,
        fontWeight: 600,
        lineHeight: 1.4,
        whiteSpace: 'nowrap',
      }}
    >
      <span
        aria-hidden="true"
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: 16,
          height: 16,
          borderRadius: 999,
          fontSize: 11,
          fontWeight: 700,
          background: v.fg,
          color: v.bg,
        }}
      >
        {v.icon}
      </span>
      <span>{v.label}</span>
    </span>
  );
}
