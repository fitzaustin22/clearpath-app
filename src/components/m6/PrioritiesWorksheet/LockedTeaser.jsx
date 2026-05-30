'use client';

/**
 * LockedTeaser — Free / Essentials state for the Priorities Worksheet route.
 *
 * No store reads (gating is decided by the parent from userTier). Mirrors the
 * M6 landing's Unlock affordance and routes to /upgrade.
 */

import Link from 'next/link';
import { Lock } from 'lucide-react';
import { T } from '@/src/lib/brand/tokens';
import { PRIORITIES_COPY } from './copy';

export default function LockedTeaser() {
  const lock = PRIORITIES_COPY.lock;
  return (
    <div style={{ maxWidth: 720, margin: '0 auto', padding: '40px 20px' }}>
      <Link
        href="/modules/m6"
        style={{
          fontFamily: T.FONT_BODY,
          fontSize: 14,
          color: T.NAVY_55,
          textDecoration: 'none',
          display: 'inline-block',
          marginBottom: 24,
        }}
      >
        ← Back to Module 6
      </Link>

      <div
        data-testid="priorities-locked-teaser"
        style={{
          backgroundColor: T.CARD,
          border: `1px solid ${T.LINE}`,
          borderRadius: 12,
          padding: 32,
          boxShadow: T.SHADOW_CARD,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
          <span aria-hidden="true" style={{ color: T.NAVY_55, display: 'inline-flex' }}>
            <Lock size={22} />
          </span>
          <h1
            style={{
              fontFamily: T.FONT_DISPLAY,
              fontWeight: 700,
              fontSize: 28,
              color: T.NAVY,
              margin: 0,
              lineHeight: 1.2,
            }}
          >
            {lock.title}
          </h1>
        </div>

        <p
          style={{
            fontFamily: T.FONT_BODY,
            fontSize: 16,
            lineHeight: 1.6,
            color: T.INK_2,
            margin: '0 0 24px 0',
          }}
        >
          {lock.body}
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
            padding: '12px 24px',
            borderRadius: 8,
            textDecoration: 'none',
            letterSpacing: 0.3,
          }}
        >
          {lock.cta}
        </Link>
      </div>
    </div>
  );
}
