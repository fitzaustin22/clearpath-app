'use client';

import Link from 'next/link';
import { T } from '@/src/lib/brand/tokens';

/**
 * LockedTeaser — what Free / Essentials users see for the Action Plan tool.
 * A short description + an upgrade CTA. No interactive surface, no store reads.
 */
export default function LockedTeaser() {
  return (
    <div
      data-testid="action-plan-locked"
      style={{
        backgroundColor: T.PARCHMENT,
        minHeight: '100vh',
        fontFamily: T.FONT_BODY,
        color: T.INK,
        padding: '40px 20px',
      }}
    >
      <div style={{ maxWidth: 720, margin: '0 auto' }}>
        <Link
          href="/modules/m7"
          style={{
            fontFamily: T.FONT_BODY,
            fontSize: 14,
            color: T.NAVY_55,
            textDecoration: 'none',
            display: 'inline-block',
            marginBottom: 24,
          }}
        >
          ← Back to Module 7
        </Link>

        <div
          style={{
            backgroundColor: T.CARD,
            border: `1px solid ${T.LINE}`,
            borderRadius: 12,
            boxShadow: T.SHADOW_CARD,
            padding: 40,
            textAlign: 'center',
          }}
        >
          <h1
            style={{
              fontFamily: T.FONT_DISPLAY,
              fontWeight: 700,
              fontSize: 28,
              color: T.NAVY,
              margin: '0 0 12px',
            }}
          >
            Action Plan &amp; Timeline
          </h1>
          <p
            style={{
              fontFamily: T.FONT_BODY,
              fontSize: 16,
              color: T.INK_2,
              lineHeight: 1.6,
              margin: '0 auto 28px',
              maxWidth: 520,
            }}
          >
            Bring everything you have decided into one place: the next steps to
            take, the professionals who can help, and the dates that matter. This
            tool is part of ClearPath Full Access.
          </p>
          <Link
            href="/upgrade"
            style={{
              display: 'inline-block',
              backgroundColor: T.GOLD,
              color: T.NAVY,
              fontFamily: T.FONT_BODY,
              fontWeight: 700,
              fontSize: 15,
              padding: '12px 28px',
              borderRadius: 8,
              textDecoration: 'none',
              letterSpacing: 0.3,
            }}
          >
            Unlock with Full Access
          </Link>
        </div>
      </div>
    </div>
  );
}
