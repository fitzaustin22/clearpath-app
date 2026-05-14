'use client';

import { T } from '@/src/lib/brand/tokens';

/**
 * §7.9.2 — coverture_zero_fraction. Runtime: { hire, marriage, cutoff, retirement }.
 */
export default function CovertureZeroFraction() {
  return (
    <div
      data-testid="callout-coverture_zero_fraction"
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
        Coverture fraction computed to 0 — there's no overlap between your marriage period and your employment period at the plan, OR the marital cutoff date is before the date of hire. Verify the dates entered: date of hire, date of marriage, marital cutoff date. If the dates are correct, the marital portion is genuinely 0 (the pension was earned entirely outside the marriage); if not, correct the input dates.
      </p>
    </div>
  );
}
