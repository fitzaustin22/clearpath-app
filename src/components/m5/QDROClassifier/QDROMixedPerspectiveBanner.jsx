'use client';

/**
 * QDROMixedPerspectiveBanner — §8.2.4 (lines 2731–2738) + Q-C5.
 *
 * Top-of-page informational banner shown when the asset slice spans more
 * than one perspective. Surfacing is delegated verbatim to PR1's §8.10.3
 * selector `isMixedPerspective(assets)` (the spec-authoritative mixed-
 * perspective check, line 2737) — NOT re-derived here. The two-line
 * clarifier copy is LOCKED in §8.2.4 and rendered verbatim.
 *
 * Informational only: no callout escalation, not dismissible (§8.2.4).
 * Inline T tokens (zero new tokens).
 *
 * @returns {JSX.Element | null}
 */

import { useM5Store } from '@/src/stores/m5Store';
import { isMixedPerspective } from '@/src/lib/qdro';
import { T } from '@/src/lib/brand/tokens';

// §8.2.4 locked two-line clarifier (verbatim, lines 2733–2734).
const LINE_1 = "You'll work through these assets one at a time.";
const LINE_2 =
  "Some are your own plans (you're the participant). Some are your " +
  "spouse's plans you're receiving a share of (you're the alternate " +
  'payee). The questions and your decisions differ for each.';

export default function QDROMixedPerspectiveBanner() {
  const assets = useM5Store((s) => s.qdroDecision.assets);

  if (!isMixedPerspective(assets || {})) return null;

  return (
    <div
      data-testid="qdro-mixed-perspective-banner"
      role="note"
      style={{
        background: T.PARCHMENT_DEEP,
        border: `1px solid ${T.GOLD_BORDER}`,
        borderRadius: 8,
        padding: '12px 16px',
        fontFamily: T.FONT_BODY,
        color: T.INK,
      }}
    >
      <p style={{ margin: '0 0 4px 0', fontSize: '14px', fontWeight: 600 }}>
        {LINE_1}
      </p>
      <p
        style={{
          margin: 0,
          fontSize: '13px',
          lineHeight: 1.5,
          color: T.INK_2,
        }}
      >
        {LINE_2}
      </p>
    </div>
  );
}
