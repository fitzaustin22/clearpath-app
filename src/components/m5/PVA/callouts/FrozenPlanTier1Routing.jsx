'use client';

import { T } from '@/src/lib/brand/tokens';

/**
 * §7.9.2 — frozen_plan_tier1_routing. Runtime: { planName }.
 */
export default function FrozenPlanTier1Routing() {
  return (
    <div
      data-testid="callout-frozen_plan_tier1_routing"
      style={{
        background: T.AMBER_BG,
        color: T.NAVY,
        border: `1px solid ${T.AMBER_BORDER}`,
        borderRadius: 6,
        padding: '12px 16px',
        marginBottom: 12,
        fontFamily: T.FONT_BODY,
        fontSize: 14,
        lineHeight: 1.5,
      }}
    >
      <p style={{ margin: 0 }}>
        Your plan is frozen — no further benefit accrual. The accrued monthly benefit at NRA is final, so PVA routes to Tier 1 (Accrued Benefit Known). Tier 3 (Coverture) is not applicable to frozen plans because there's no future service to project. You may switch to Tier 2 if your benefit estimate comes from a non-statement source.
      </p>
    </div>
  );
}
