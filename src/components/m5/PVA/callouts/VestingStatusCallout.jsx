'use client';

import { T } from '@/src/lib/brand/tokens';

const PHRASE_BY_STATUS = {
  partially_vested: 'partial vesting',
  not_vested: 'no vesting',
};

/**
 * §7.9.2 — vesting_status_callout. Runtime: { vestingStatus }.
 */
export default function VestingStatusCallout({ runtimeData = {} }) {
  const phrase = PHRASE_BY_STATUS[runtimeData.vestingStatus];
  if (!phrase) {
    if (process.env.NODE_ENV !== 'production') {
      // eslint-disable-next-line no-console
      console.warn(`[VestingStatusCallout] Unknown vestingStatus: ${runtimeData.vestingStatus}`);
    }
    return null;
  }
  return (
    <div
      data-testid="callout-vesting_status_callout"
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
        Your plan indicates {phrase}. Vesting status affects whether you'll ultimately receive the accrued benefit — it's contingent on continued employment through the plan's vesting cliff or graded schedule. PVA at v1 does NOT discount PV for vesting probability — the figure shown assumes you'll fully vest. If your CDFA or attorney determines a vesting probability discount is appropriate (e.g., 50% probability × $X = $0.5X), they can apply it manually. Vesting probability discount modeling is on the v1.1 roadmap.
      </p>
    </div>
  );
}
