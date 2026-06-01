'use client';

/**
 * Step 0 — Framing. Sets the method (this turns your decisions into a plan),
 * shows the first-class disclaimer (organizing aid, not advice), and starts the
 * wizard. No store reads.
 */

import { T } from '@/src/lib/brand/tokens';
import { ACTION_PLAN_COPY, ACTION_PLAN_DISCLAIMER } from './copy';
import { PrimaryButton, Disclaimer } from './ui';

export default function StepFraming({ onNext }) {
  const c = ACTION_PLAN_COPY.framing;

  return (
    <div data-testid="action-plan-step-framing">
      <h2
        style={{
          fontFamily: T.FONT_DISPLAY,
          fontWeight: 700,
          fontSize: 24,
          color: T.NAVY,
          margin: '0 0 16px 0',
        }}
      >
        {c.title}
      </h2>

      {c.body.map((para, i) => (
        <p
          key={i}
          style={{
            fontFamily: T.FONT_BODY,
            fontSize: 15,
            lineHeight: 1.6,
            color: T.INK_2,
            margin: '0 0 14px 0',
          }}
        >
          {para}
        </p>
      ))}

      <div style={{ margin: '20px 0' }}>
        <Disclaimer>{ACTION_PLAN_DISCLAIMER}</Disclaimer>
      </div>

      <div style={{ textAlign: 'right', marginTop: 24 }}>
        <PrimaryButton onClick={onNext}>{c.begin}</PrimaryButton>
      </div>
    </div>
  );
}
