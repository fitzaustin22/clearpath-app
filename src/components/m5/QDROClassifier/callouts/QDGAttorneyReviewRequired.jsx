'use client';

/**
 * QDGAttorneyReviewRequired — the `qdg_attorney_review_required` callout
 * (§8.9.1). Surfaced per-asset once any decision is captured (Q-B7).
 *
 * §8.9.1 designates this callout's body as build-phase authored (PR1
 * leaves QDG_CALLOUTS.qdg_attorney_review_required.body === null — there
 * is no spec-locked literal). The copy below is authored at build, kept
 * faithful to the §8.9.2 disclaimer stance (decisions are preferences;
 * the order itself must be attorney-drafted) without duplicating the
 * `qdg_not_legal_order` bullets.
 *
 * Pure presentation with NO conditional logic — the parent decides when
 * to mount it (Q-B7: per-asset, only when a decision is captured).
 *
 * @returns {JSX.Element}
 */

import { T } from '@/src/lib/brand/tokens';

const BODY =
  'The decisions you capture here record your preferences — they are not a ' +
  'finished order. A licensed attorney (and, for complex plans, a QDRO ' +
  'drafting specialist) must draft and review the actual order before it is ' +
  'submitted to the plan administrator or the court.';

export default function QDGAttorneyReviewRequired() {
  return (
    <div
      data-testid="qdg-attorney-review-required"
      role="note"
      aria-label="Attorney review required"
      style={{
        background: T.AMBER_BG,
        color: T.NAVY,
        border: `1px solid ${T.AMBER_BORDER}`,
        borderRadius: 6,
        padding: '12px 16px',
        fontFamily: T.FONT_BODY,
        fontSize: 13,
        lineHeight: 1.5,
      }}
    >
      <p
        style={{
          margin: '0 0 4px',
          fontSize: '11px',
          fontWeight: 700,
          textTransform: 'uppercase',
          letterSpacing: '0.6px',
          color: T.PILL_TEXT,
        }}
      >
        Attorney review required
      </p>
      <p style={{ margin: 0, color: T.INK_2 }}>{BODY}</p>
    </div>
  );
}
