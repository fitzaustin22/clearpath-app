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
 * PR-B2-α §8.6.4 extension: the optional prop `covertureApplies` (default
 * false → existing callers unchanged) appends the LOCKED coverture recap
 * and the prose cross-link to PVA's coverture callout. The parent
 * (QDROAssetCard) sets this true only on the `private_db`-with-coverture
 * path — dc / ira / flag-only never pass it true (no coverture concept
 * applies). The prose "See PVA report …" IS the cross-link (no link
 * primitive exists in the codebase; PVA Tool 2 is the user's mental
 * neighbor and the prose reference is the convention — mirrors the M4
 * PIT TaxTreatmentNote pattern).
 *
 * Otherwise pure presentation — the parent owns the mount decision (Q-B7).
 *
 * @param {object} props
 * @param {boolean} [props.covertureApplies=false] when true, appends the
 *   §8.6.4 recap + cross-link.
 * @returns {JSX.Element}
 */

import { T } from '@/src/lib/brand/tokens';

const BODY =
  'The decisions you capture here record your preferences — they are not a ' +
  'finished order. A licensed attorney (and, for complex plans, a QDRO ' +
  'drafting specialist) must draft and review the actual order before it is ' +
  'submitted to the plan administrator or the court.';

// §8.6.4 LOCKED recap copy — verbatim from M5-Tool-Specs.md.
const COVERTURE_RECAP =
  'Only the marital portion of this pension is divisible — the share earned during marriage. See PVA report for the full coverture calculation.';

export default function QDGAttorneyReviewRequired({ covertureApplies = false }) {
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
      {covertureApplies ? (
        <p
          data-testid="qdg-attorney-review-required-coverture-recap"
          style={{ margin: '8px 0 0', color: T.INK_2 }}
        >
          {COVERTURE_RECAP}
        </p>
      ) : null}
    </div>
  );
}
