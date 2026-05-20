'use client';

import Link from 'next/link';
import { T } from '@/src/lib/brand/tokens';
import { hasAccess } from '@/src/lib/plans';

const EDU_PARAGRAPH =
  "Some of the most consequential assets in a divorce can't be valued at face — a pension, the marital home, a support obligation, the mechanics of dividing a retirement account without triggering tax or penalty. Each takes real analysis to understand what it's actually worth and how a given choice plays out over time. The four tools in this module give you CDFA-grade valuations and decision frameworks for exactly these assets, so you negotiate from clarity rather than guesswork.";

export default function M5ModulePage({ userTier = 'essentials' }) {
  const isFullAccess = hasAccess(userTier, 'navigator');

  return (
    <div
      style={{
        backgroundColor: T.PARCHMENT,
        minHeight: '100vh',
        fontFamily: T.FONT_BODY,
        color: T.INK,
        padding: '40px 20px',
      }}
    >
      <div style={{ maxWidth: 960, margin: '0 auto' }}>
        <section>
          <h1
            style={{
              fontFamily: T.FONT_DISPLAY,
              fontWeight: 700,
              fontSize: 32,
              color: T.NAVY,
              margin: 0,
              lineHeight: 1.2,
            }}
          >
            M5 — Value What Matters
          </h1>
        </section>

        <section style={{ marginTop: 24 }}>
          <p
            style={{
              fontFamily: T.FONT_BODY,
              fontSize: 16,
              color: T.INK_2,
              margin: 0,
              lineHeight: 1.6,
              maxWidth: 720,
            }}
          >
            {EDU_PARAGRAPH}
          </p>
        </section>

        {!isFullAccess && (
          <section style={{ marginTop: 32 }}>
            <Link
              href="/upgrade"
              style={{
                display: 'inline-block',
                backgroundColor: T.GOLD,
                color: T.NAVY,
                fontFamily: T.FONT_BODY,
                fontWeight: 700,
                fontSize: 15,
                padding: '12px 24px',
                borderRadius: 8,
                textDecoration: 'none',
                letterSpacing: 0.3,
              }}
            >
              Unlock with Full Access
            </Link>
          </section>
        )}

        <footer
          role="contentinfo"
          style={{
            marginTop: 56,
            paddingTop: 24,
            borderTop: `1px solid ${T.LINE}`,
            display: 'flex',
            flexWrap: 'wrap',
            gap: 24,
            fontFamily: T.FONT_BODY,
            fontSize: 14,
          }}
        >
          <Link
            href="/modules/m2"
            style={{ color: T.NAVY_70, textDecoration: 'none' }}
          >
            ← Module 2: Know What You Own
          </Link>
          <Link
            href="/modules/m4"
            style={{ color: T.NAVY_70, textDecoration: 'none' }}
          >
            ← Module 4: Tax Landscape
          </Link>
        </footer>
      </div>
    </div>
  );
}
