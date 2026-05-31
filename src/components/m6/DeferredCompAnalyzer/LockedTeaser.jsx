'use client';

import Link from 'next/link';
import { Lock } from 'lucide-react';
import { T } from '@/src/lib/brand/tokens';
import { DCA_COPY } from './copy';

// Free / Essentials locked state — mirrors the sibling M6 tools. No store reads.
export default function LockedTeaser() {
  const lock = DCA_COPY.lock;
  return (
    <div style={{ maxWidth: 720, margin: '0 auto', padding: '40px 20px' }}>
      <div style={{ marginBottom: 16 }}>
        <Link
          href="/modules/m6"
          style={{ fontFamily: T.FONT_BODY, fontSize: 14, color: T.NAVY_55, textDecoration: 'none' }}
        >
          ← Back to Module 6
        </Link>
      </div>
      <div
        data-testid="deferred-comp-locked-teaser"
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
              fontSize: 26,
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
            fontSize: 15,
            color: T.INK_2,
            margin: '0 0 24px 0',
            lineHeight: 1.55,
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
