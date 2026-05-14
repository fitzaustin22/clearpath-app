'use client';

import { T } from '@/src/lib/brand/tokens';

/**
 * §7.9.2 — liability_disclaimer (always last). Runtime: {}.
 */
export default function LiabilityDisclaimer() {
  return (
    <div
      data-testid="callout-liability_disclaimer"
      style={{
        background: T.PARCHMENT,
        color: T.NAVY,
        border: `1px solid ${T.NAVY_12}`,
        borderRadius: 6,
        padding: '12px 16px',
        marginBottom: 12,
        fontFamily: T.FONT_BODY,
        fontSize: 14,
        lineHeight: 1.5,
      }}
    >
      <p style={{ margin: 0 }}>
        <strong>Planning-grade estimate — not a legal opinion.</strong> PVA produces a present-value estimate using standard actuarial assumptions calibrated to typical CDFA practice. v1 simplifications include: termination-basis valuation (no pre-retirement mortality discount), annual annuity-due approximation (no Woolhouse monthly correction), unisex static mortality tables, single-rate §417(e) segment-2 discount (not full 3-segment yield curve), single-life calc for J&S in-pay annuities (no survivor-continuation modeling), and no vesting/QPSA/J&S actuarial reductions. Actual PV may differ materially based on plan-specific actuarial assumptions, plan administrator's response to QDRO, and your state's pension valuation case law. Not a substitute for a qualified pension actuary's report in litigation-grade contexts. Consult a CDFA or pension valuation specialist for any case where the PV figure will be relied upon for settlement or trial.
      </p>
    </div>
  );
}
