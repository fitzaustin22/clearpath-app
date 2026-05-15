'use client';

import { T } from '@/src/lib/brand/tokens';

/**
 * §9.8.1 element 6 / §9.6.2 Q-10 — below-grid binding-constraint mini-section
 * for the Keep & refi verdict. Per §9.8.3 this is "always rendered for Keep &
 * refi", so the green/`none` case gets affirmative factual copy rather than
 * being hidden.
 *
 * The prose itself is produced by refiQualifier.evaluateRefiVerdict's
 * `narrative` field, which already enforces the §9.6.2 strict-comparator
 * stance (factual statement + CDFA pointer, no imperative/directive language).
 * This component only frames it — it adds no recommendation language.
 *
 * @param {object} props
 * @param {'green'|'yellow'|'red'} props.verdictTier
 * @param {'dti'|'credit'|'margin-of-safety'|'multiple'|'underwater'|'none'} props.bindingConstraint
 * @param {string|null} props.narrative  Lib-built prose; null for the `none` case.
 */

// Green tints derived from T.GREEN rgb at tokens.ts's 0.10 / 0.32 alpha
// convention (no GREEN_BG/BORDER token exists).
const ACCENT = {
  green: { fg: T.GREEN, bg: 'rgba(45, 138, 78, 0.10)', border: 'rgba(45, 138, 78, 0.32)' },
  yellow: { fg: T.AMBER, bg: T.AMBER_BG, border: T.AMBER_BORDER },
  red: { fg: T.RED, bg: T.RED_BG, border: 'rgba(168, 53, 30, 0.32)' },
  underwater: { fg: T.NAVY, bg: T.NAVY_06, border: T.NAVY_12 },
};

const NONE_COPY =
  'Your DTI ratios, credit band, and LTV all fall within the qualifying ' +
  'ranges for a conventional 30-year fixed refinance. No single constraint ' +
  'is binding the verdict.';

export default function HomeDecisionBindingConstraintMini({
  verdictTier,
  bindingConstraint,
  narrative,
}) {
  if (!verdictTier || !bindingConstraint) return null;

  const key = bindingConstraint === 'underwater' ? 'underwater' : verdictTier;
  const accent = ACCENT[key];
  if (!accent) return null;

  const body = bindingConstraint === 'none' ? NONE_COPY : narrative;
  if (!body) return null;

  const heading =
    bindingConstraint === 'none'
      ? 'Refi qualification — no binding constraint'
      : 'Refi qualification — binding constraint';

  return (
    <section
      data-testid="hda-binding-constraint-mini"
      data-binding={bindingConstraint}
      aria-label="Keep and refinance binding-constraint explanation"
      style={{
        background: accent.bg,
        border: `1px solid ${accent.border}`,
        borderLeft: `4px solid ${accent.fg}`,
        borderRadius: 6,
        padding: '14px 18px',
        marginTop: 16,
        fontFamily: T.FONT_BODY,
      }}
    >
      <h4
        style={{
          margin: '0 0 6px',
          fontFamily: T.FONT_BODY,
          fontSize: 13,
          fontWeight: 700,
          letterSpacing: '0.02em',
          textTransform: 'uppercase',
          color: accent.fg,
        }}
      >
        {heading}
      </h4>
      <p
        style={{
          margin: 0,
          fontSize: 14,
          lineHeight: 1.55,
          color: T.NAVY,
        }}
      >
        {body}
      </p>
    </section>
  );
}
