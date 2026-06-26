'use client';

import { T } from '@/src/lib/brand/tokens';

/**
 * §7.9.2 — liability_disclaimer (always last). Runtime: {}.
 *
 * v3 reskin: shorter calm footer per copy decision #1. Full v1-simplifications
 * list relocated to the "How present value works" expander.
 */
export default function LiabilityDisclaimer() {
  return (
    <div
      data-testid="callout-liability_disclaimer"
      style={{
        background: T.PARCHMENT,
        color: T.NAVY,
        border: `1px solid ${T.GOLD_BORDER}`,
        borderLeft: `3px solid ${T.GOLD}`,
        borderRadius: 6,
        padding: '16px 18px',
        fontFamily: T.FONT_BODY,
        lineHeight: 1.6,
      }}
    >
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
        NOT LEGAL ADVICE
      </div>
      <p style={{ margin: 0, fontSize: 13, color: T.NAVY_55 }}>
        This is an estimate for planning and negotiation, not legal or financial advice. Valuations used in court are typically prepared by a qualified actuary. Consult a qualified professional before relying on this figure for a settlement or trial.
      </p>
    </div>
  );
}
