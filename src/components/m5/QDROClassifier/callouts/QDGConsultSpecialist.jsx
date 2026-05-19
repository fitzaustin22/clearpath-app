'use client';

/**
 * QDGConsultSpecialist — the branch-level `consult specialist` callout for
 * flag-only planTypes (gov_civilian / military / state_municipal), per
 * §8.5.6 + Q-B5/D4. Shown NOW even though full starter-Q capture is PR4.
 *
 * The locked copy lives in §8.5.6.1–§8.5.6.3 and is exposed by PR1 as
 * getFlagOnlyBranch(planType).consultSpecialistCallout. (The build prompt
 * cites "§8.9.2" for this copy — that section actually holds only the
 * 4-bullet `qdg_not_legal_order` disclaimer; the real locked source is
 * §8.5.6, surfaced via the PR1 constant. Consumed verbatim here so the
 * locked literal has exactly one source of truth.)
 *
 * Renders nothing for any non-flag planType (defensive — the routing
 * wrapper only mounts this for the flag-only set, but a stray planType
 * must fail closed rather than render an empty amber box).
 *
 * @param {object} props
 * @param {string} [props.planType] one of gov_civilian | military | state_municipal
 * @returns {JSX.Element | null}
 */

import { getFlagOnlyBranch } from '@/src/lib/qdro';
import { T } from '@/src/lib/brand/tokens';

export default function QDGConsultSpecialist({ planType }) {
  const branch = getFlagOnlyBranch(planType);
  if (!branch) return null;

  return (
    <div
      data-testid="qdg-consult-specialist"
      role="note"
      aria-label="Consult a specialist attorney"
      style={{
        background: T.AMBER_BG,
        color: T.NAVY,
        border: `1px solid ${T.AMBER_BORDER}`,
        borderRadius: 6,
        padding: '12px 16px',
        fontFamily: T.FONT_BODY,
        fontSize: 13,
        lineHeight: 1.5,
      }}
    >
      <p
        style={{
          margin: '0 0 4px',
          fontSize: '11px',
          fontWeight: 700,
          textTransform: 'uppercase',
          letterSpacing: '0.6px',
          color: T.PILL_TEXT,
        }}
      >
        Consult a specialist
      </p>
      <p style={{ margin: 0, color: T.INK_2 }}>
        {branch.consultSpecialistCallout}
      </p>
    </div>
  );
}
