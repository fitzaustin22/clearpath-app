'use client';

import { T } from '@/src/lib/brand/tokens';

/**
 * §7.9.2 — qdro_handoff_recommended. Runtime: { path, planType }.
 */
export default function QdroHandoffRecommended() {
  return (
    <div
      data-testid="callout-qdro_handoff_recommended"
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
        PVA has computed your pension's PV. To divide this pension in your divorce, you'll need a Qualified Domestic Relations Order (QDRO) — a court order directing the plan administrator to pay the alternate payee. Use the QDRO Decision Guide (Module 5 Tool 3) to capture the key decisions (perspective, plan type, survivor elections, COLA share, early-retirement subsidy share) for your QDRO drafting attorney.
      </p>
    </div>
  );
}
