'use client';

import { T } from '@/src/lib/brand/tokens';

const FORM_PHRASE = {
  joint_50: 'Joint and 50% Survivor',
  joint_100: 'Joint and 100% Survivor',
  period_certain: 'Period Certain',
};

function formPhrase(form) {
  return FORM_PHRASE[form] ?? form ?? '—';
}

/**
 * §7.9.2 — form_of_benefit_callout. Runtime: { context: 'on_statement' | 'in_pay', form }.
 */
export default function FormOfBenefitCallout({ runtimeData = {} }) {
  const { context, form } = runtimeData;
  if (context !== 'on_statement' && context !== 'in_pay') {
    if (process.env.NODE_ENV !== 'production') {
      // eslint-disable-next-line no-console
      console.warn(`[FormOfBenefitCallout] Unknown context: ${context}`);
    }
    return null;
  }
  const phrase = formPhrase(form);

  return (
    <div
      data-testid="callout-form_of_benefit_callout"
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
      {context === 'on_statement' ? (
        <p style={{ margin: 0 }}>
          Your plan statement quotes a {phrase} form of benefit. PVA at v1 computes PV on a single-life basis as a planning approximation — actual PV with the quoted form would typically be 5–15% lower depending on spouse age difference. Form-of-benefit reduction modeling is on the v1.1 roadmap. The figure shown approximates what PV would be if you elected single-life at retirement (which is a participant election, not predetermined by the statement form).
        </p>
      ) : (
        <p style={{ margin: 0 }}>
          You're already drawing a {phrase} annuity. Your stated monthly benefit IS the actual reduced amount under that form, so cash flow while you're alive is captured correctly. However, PVA at v1 does NOT model the survivor-continuation value (typical 50% of your amount continuing to your spouse after your death). True PV with survivor continuation would typically be 5–15% higher than the figure shown. Survivor-continuation modeling is on the v1.1 roadmap. For litigation-grade valuation of in-pay J&S annuities, consult a pension valuation specialist.
        </p>
      )}
    </div>
  );
}
