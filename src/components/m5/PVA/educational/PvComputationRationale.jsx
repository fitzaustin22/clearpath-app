'use client';

import { useState } from 'react';
import { T } from '@/src/lib/brand/tokens';

/**
 * §7.9.3 — "PV computation rationale" expandable (general, all paths).
 *
 * Spec-pinned copy verbatim per LL-25. Toggle phrase "Want to learn more?"
 * is the spec-required anchor; the sub-label is a design degree of freedom.
 */
export default function PvComputationRationale() {
  const [expanded, setExpanded] = useState(false);

  return (
    <div
      data-testid="pv-computation-rationale"
      style={{
        marginTop: '1rem',
        border: `1px solid ${T.NAVY_12}`,
        borderRadius: 6,
        background: T.CARD,
      }}
    >
      <button
        type="button"
        onClick={() => setExpanded((e) => !e)}
        aria-expanded={expanded}
        data-testid="pv-computation-rationale-toggle"
        style={{
          width: '100%',
          textAlign: 'left',
          padding: '0.5rem 1rem',
          background: T.PARCHMENT,
          color: T.NAVY,
          border: 'none',
          borderBottom: expanded ? `1px solid ${T.NAVY_12}` : 'none',
          fontFamily: T.FONT_BODY,
          cursor: 'pointer',
          borderRadius: 6,
        }}
      >
        {expanded ? '▼' : '▶'} Want to learn more? How present value works
      </button>
      {expanded && (
        <div
          data-testid="pv-computation-rationale-body"
          style={{
            padding: '1rem',
            fontFamily: T.FONT_BODY,
            color: T.NAVY,
            fontSize: 14,
            lineHeight: 1.55,
          }}
        >
          <p style={{ marginTop: 0 }}>
            Present value of a future pension benefit is computed by: (1) projecting the monthly benefit, (2) computing an annuity factor — the actuarial equivalent of the future benefit stream, accounting for survival probability and time value of money — and (3) discounting back to the valuation date using a discount rate that reflects the time value of the deferral period.
          </p>
          <p>
            PVA uses §417(e) assumptions by default — the same actuarial regime that ERISA-governed plans use to compute lump-sum equivalents under IRC §417(e)(3). This means PVA's PV figure approximates what the plan itself would compute if the participant elected a lump sum today (after applying the deferral discount, since the participant typically isn't receiving the lump sum today).
          </p>
          <p>PVA at v1 makes several CDFA-defensible simplifications:</p>
          <ul style={{ paddingLeft: '1.25rem' }}>
            <li style={{ marginBottom: '0.5rem' }}>
              <strong>Termination basis</strong>: PV assumes the participant survives to retirement; pre-retirement mortality is not applied to the deferral discount. The going-concern variant (which multiplies by the probability of surviving from current age to retirement) typically reduces PV by 5–10% over a 20-year deferral. Termination basis is favored in QDRO-readiness contexts because it aligns with what the alternate payee is entitled to receive if the participant survives.
            </li>
            <li style={{ marginBottom: '0.5rem' }}>
              <strong>Annual annuity-due approximation</strong>: PVA computes the annuity factor as ä_x (annual factor) and multiplies by annual benefit. The Woolhouse monthly correction (≈ −11/24) — which would reduce PV by 2–4% to reflect monthly rather than annual payment timing — is not applied at v1.
            </li>
            <li style={{ marginBottom: '0.5rem' }}>
              <strong>Unisex static mortality tables</strong>: §417(e) is unisex by Treasury regulation; Pub-2010 and RP-2014 are blended to unisex at v1. Static tables are used for the year matching <code style={{ fontFamily: T.FONT_BODY }}>caseEffectiveDate</code>; generational mortality projection (MP-scales) is deferred to v1.1.
            </li>
            <li style={{ marginBottom: '0.5rem' }}>
              <strong>§417(e) segment-2 single-rate approximation</strong>: §417(e) publishes a 3-segment yield curve (segments 1/2/3 covering years 1–5, 6–20, 21+). PVA at v1 uses segment 2 because it covers the bulk of typical pension cash flows; full 3-segment term-structure (per CFR §1.430(h)(2)-1) is on the v1.1 roadmap.
            </li>
          </ul>
          <p style={{ marginBottom: 0 }}>
            The ±100bp sensitivity range reflects how PV varies with the discount rate assumption. Lower discount rates produce higher PVs (each future dollar is worth more); higher discount rates produce lower PVs. CDFA practice typically reports a range; your case may settle on a single number or a range depending on negotiation dynamics.
          </p>
        </div>
      )}
    </div>
  );
}
