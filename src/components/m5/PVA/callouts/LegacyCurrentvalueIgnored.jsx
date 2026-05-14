'use client';

import { T } from '@/src/lib/brand/tokens';

function formatUSD(value) {
  if (value == null || !Number.isFinite(value)) return '$—';
  return value.toLocaleString('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  });
}

/**
 * §7.9.2 — legacy_currentvalue_ignored. Runtime: { legacyValue }.
 */
export default function LegacyCurrentvalueIgnored({ runtimeData = {} }) {
  return (
    <div
      data-testid="callout-legacy_currentvalue_ignored"
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
        M2 captured a <code style={{ fontFamily: T.FONT_BODY }}>currentValue</code> of {formatUSD(runtimeData.legacyValue)} for this pension entered before the M2 schema change (M2-TICKET-3, April 2026). PVA ignores legacy values and computes its own PV using current actuarial assumptions. The M2 banner already prompts re-entry to the new claim-only flow.
      </p>
    </div>
  );
}
