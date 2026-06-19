'use client';

import { T } from '@/src/lib/brand/tokens';

/**
 * §7.9.2 — cash_balance_passthrough_explanation. Runtime: {}.
 */
export default function CashBalancePassthroughExplanation() {
  return (
    <div
      data-testid="callout-cash_balance_passthrough_explanation"
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
        Cash balance plans technically convert to an annuity at retirement, but the participant has a hypothetical account balance shown on the statement. Under PPA-era plan terms (post-2008), the lump-sum value typically equals the account balance — the Pension Protection Act of 2006 added IRC §411(a)(13)(A), which effectively eliminated the pre-PPA 'whipsaw' where §417(e) discount rates and the plan's interest crediting rate could diverge. PVA's pass-through (PV = balance) is the CDFA standard for divorce planning and is appropriate for the vast majority of cash balance plans. For pre-PPA legacy plans or plans with non-standard interest crediting, small variances may exist; if material, consult a pension actuary.
      </p>
    </div>
  );
}
