'use client';

/**
 * WizardCard — the white paper surface every M5 wizard step renders inside.
 *
 * Token-driven per memory #23 (inline T, no Tailwind, no local _styles).
 * Defaults: 1040px max width, 12px radius, 1px T.LINE border, soft
 * T.SHADOW_CARD, 28/32/24 padding. Spec: Wizard-Design-Spec.md §Card.
 *
 * @param {object} props
 * @param {React.ReactNode} props.children content rendered inside the card
 * @param {string} [props.className] extra class names appended to the card
 * @param {object} [props.style] inline style overrides, merged over the token defaults
 * @param {string} [props.data-testid] test id for the card root (default "wizard-card")
 * @returns {JSX.Element}
 */

import { T } from '@/src/lib/brand/tokens';

export default function WizardCard({
  children,
  className,
  style,
  'data-testid': testId = 'wizard-card',
}) {
  const cardStyle = {
    maxWidth: '1040px',
    borderRadius: '12px',
    border: `1px solid ${T.LINE}`,
    padding: '28px 32px 24px',
    backgroundColor: T.CARD,
    boxShadow: T.SHADOW_CARD,
    ...style,
  };

  return (
    <div className={className} style={cardStyle} data-testid={testId}>
      {children}
    </div>
  );
}
