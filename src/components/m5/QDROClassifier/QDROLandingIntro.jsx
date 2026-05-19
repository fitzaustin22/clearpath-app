'use client';

/**
 * QDROLandingIntro — static entry-point header for the QDRO Decision Guide
 * (PR5-5 / §8.0 landing intro). Renders the guide title and two orientation
 * paragraphs that establish scope before the user begins the classifier flow.
 *
 * No props — static content only. No state, no hooks.
 *
 * @returns {JSX.Element}
 */

import { T } from '@/src/lib/brand/tokens';

export default function QDROLandingIntro() {
  return (
    <div data-testid="qdro-landing-intro">
      <h1
        style={{
          fontFamily: T.FONT_DISPLAY,
          fontSize: '28px',
          fontWeight: 700,
          color: T.NAVY,
          margin: '0 0 16px',
          lineHeight: 1.2,
        }}
      >
        QDRO Decision Guide
      </h1>

      <p
        style={{
          fontFamily: T.FONT_BODY,
          fontSize: '13px',
          lineHeight: 1.5,
          color: T.INK_2,
          margin: '0 0 12px',
        }}
      >
        Dividing retirement accounts in divorce isn&#39;t like splitting a checking account. Each plan type — 401(k), pension, IRA — has its own legal mechanism, tax treatment, and paperwork. Getting it wrong can cost years of growth or trigger an unexpected tax bill.
      </p>

      <p
        style={{
          fontFamily: T.FONT_BODY,
          fontSize: '13px',
          lineHeight: 1.5,
          color: T.INK_2,
          margin: 0,
        }}
      >
        This guide walks you through the decisions a QDRO specialist needs to draft your order correctly. You&#39;ll classify each retirement asset by plan type and perspective, capture the key facts that drive the division structure, and walk away with a handoff packet your attorney or QDRO specialist can work from directly.
      </p>
    </div>
  );
}
