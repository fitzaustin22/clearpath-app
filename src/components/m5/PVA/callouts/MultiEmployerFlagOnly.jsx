'use client';

import { T } from '@/src/lib/brand/tokens';

/**
 * §7.9.2 — multi_employer_flag_only. Runtime: { planName }.
 */
export default function MultiEmployerFlagOnly() {
  return (
    <div
      data-testid="callout-multi_employer_flag_only"
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
        Multi-employer pension plans (typically union or collectively-bargained funds covering multiple employers) have fund-specific complexities — employer-specific subsidies, withdrawal liability adjustments, fund-condition discounts — that require fund actuary input. PVA does not compute PV for multi-employer plans at v1. For planning purposes, you can use the most recent benefit-statement value from the fund as a starting estimate; for litigation-grade valuation, engage a pension actuary specializing in multi-employer plans. (This is a v1.1 roadmap item.)
      </p>
    </div>
  );
}
