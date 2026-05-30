'use client';

/**
 * Step 0 — Framing. Static intro + first-class disclaimer. No store reads.
 */

import { T } from '@/src/lib/brand/tokens';
import { TRADEOFF_COPY } from './copy';
import { PrimaryButton, Disclaimer } from './ui';

export default function StepFraming({ onNext }) {
  const c = TRADEOFF_COPY.framing;
  return (
    <div data-testid="trade-off-step-framing">
      <h2
        style={{
          fontFamily: T.FONT_DISPLAY,
          fontWeight: 700,
          fontSize: 26,
          color: T.NAVY,
          margin: '0 0 16px 0',
          lineHeight: 1.25,
        }}
      >
        {c.title}
      </h2>

      {c.body.map((para, i) => (
        <p
          key={i}
          style={{
            fontFamily: T.FONT_BODY,
            fontSize: 16,
            lineHeight: 1.6,
            color: T.INK_2,
            margin: '0 0 14px 0',
          }}
        >
          {para}
        </p>
      ))}

      <div style={{ margin: '20px 0 24px 0' }}>
        <Disclaimer>{c.disclaimer}</Disclaimer>
      </div>

      <PrimaryButton onClick={onNext}>{c.cta}</PrimaryButton>
    </div>
  );
}
