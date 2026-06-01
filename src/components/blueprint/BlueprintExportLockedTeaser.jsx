'use client';

/**
 * BlueprintExportLockedTeaser — what Free / Essentials users see in place of the
 * Export action. The /blueprint VIEW stays ungated, so this is an INLINE card
 * (not a full-page takeover like the ActionPlan teaser): the user can still read
 * their whole Blueprint on screen.
 *
 * Copy sells the ARTIFACT — a clean, shareable PDF with a cover page and
 * disclaimer — NOT data access (the data is already visible above). Carries the
 * existing interactive-affordance class so it never prints.
 */

import Link from 'next/link';
import { T } from '@/src/lib/brand/tokens';

export default function BlueprintExportLockedTeaser() {
  return (
    <div
      data-testid="blueprint-export-locked"
      className="clearpath-blueprint-interactive"
      style={{
        backgroundColor: T.PARCHMENT,
        border: `1px solid ${T.LINE}`,
        borderRadius: 10,
        padding: '20px 24px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 20,
        flexWrap: 'wrap',
      }}
    >
      <div style={{ flex: 1, minWidth: 240 }}>
        <div
          style={{
            fontFamily: T.FONT_DISPLAY,
            fontWeight: 700,
            fontSize: 18,
            color: T.NAVY,
            marginBottom: 4,
          }}
        >
          Export a polished PDF
        </div>
        <p
          style={{
            fontFamily: T.FONT_BODY,
            fontSize: 14,
            lineHeight: 1.5,
            color: T.INK_2,
            margin: 0,
            maxWidth: 460,
          }}
        >
          Upgrade for a clean, shareable PDF of your Blueprint — with a cover page
          and disclaimer, ready for your attorney or CDFA®.
        </p>
      </div>
      <Link
        href="/upgrade"
        style={{
          display: 'inline-block',
          backgroundColor: T.GOLD,
          color: T.NAVY,
          fontFamily: T.FONT_BODY,
          fontWeight: 700,
          fontSize: 14,
          padding: '11px 24px',
          borderRadius: 8,
          textDecoration: 'none',
          letterSpacing: 0.3,
          whiteSpace: 'nowrap',
        }}
      >
        Unlock with Full Access
      </Link>
    </div>
  );
}
