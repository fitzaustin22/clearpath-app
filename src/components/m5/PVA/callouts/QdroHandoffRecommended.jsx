'use client';

import Link from 'next/link';
import { T } from '@/src/lib/brand/tokens';

/**
 * §7.9.2 — qdro_handoff_recommended. Runtime: { path, planType }.
 *
 * v3 reskin: QDRO handoff card per design spec — parchment, gold border,
 * "NEXT STEP" eyebrow, calm forward affordance to the QDRO Decision Guide.
 */
export default function QdroHandoffRecommended() {
  return (
    <div
      data-testid="callout-qdro_handoff_recommended"
      style={{
        background: T.PARCHMENT,
        color: T.NAVY,
        border: `1px solid ${T.GOLD_BORDER}`,
        borderLeft: `4px solid ${T.GOLD}`,
        borderRadius: 10,
        padding: '20px 22px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        gap: 16,
        flexWrap: 'wrap',
        fontFamily: T.FONT_BODY,
      }}
    >
      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          style={{
            fontSize: 10,
            fontWeight: 700,
            letterSpacing: '.9px',
            textTransform: 'uppercase',
            color: T.PILL_TEXT,
            marginBottom: 6,
          }}
        >
          NEXT STEP
        </div>
        <p style={{ margin: '0 0 12px 0', fontSize: 14, lineHeight: 1.6, color: T.INK_2 }}>
          When you&apos;re ready to divide this pension, the next tool walks through the decisions your attorney will need.
        </p>
        <Link
          href="/modules/m5/qdro"
          style={{
            fontFamily: T.FONT_BODY,
            fontSize: 15,
            fontWeight: 700,
            color: T.NAVY,
            textDecoration: 'none',
          }}
        >
          Ready for the QDRO Decision Guide →
        </Link>
      </div>
    </div>
  );
}
