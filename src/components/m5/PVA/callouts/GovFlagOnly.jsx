'use client';

import { T } from '@/src/lib/brand/tokens';

const COPY_BY_VARIANT = {
  csrs_fers:
    "Federal civilian pension plans (CSRS, FERS) are valued under Office of Personnel Management mortality and discount rate assumptions, distinct from §417(e). Division uses Court Order Acceptable for Processing (COAP), not QDRO. PVA does not compute PV for federal civilian plans at v1. For planning, refer to OPM Form RI 84-1 (CSRS) or RI 90-1 (FERS) projections; for litigation-grade valuation, engage a pension valuation specialist familiar with COAP. (This is a v1.1 roadmap item.)",
  military:
    "Military retired pay is valued under the Uniformed Services Former Spouses' Protection Act (USFSPA), with DFAS handling division. The 10/10 rule (10 years marriage during 10 years of service) governs direct-pay eligibility from DFAS. PVA does not compute PV for military retirement at v1. For planning, the disposable retired pay defined in USFSPA applies; for litigation-grade valuation, engage a military divorce specialist. (This is a v1.1 roadmap item.)",
  state_municipal:
    "State and municipal pension plans (e.g., Virginia VRS, Maryland State Retirement, DC Retirement Board) operate under state-specific actuarial assumptions and division mechanics. Division uses a state-specific Domestic Relations Order (DRO), not QDRO. PVA does not compute PV for state/municipal plans at v1. For planning, refer to the plan's most recent member statement; for litigation-grade valuation, engage a specialist familiar with the specific plan. (This is a v1.1 roadmap item.)",
};

/**
 * §7.9.2 — gov_flag_only. Runtime: { variant: 'csrs_fers' | 'military' | 'state_municipal', planName }.
 */
export default function GovFlagOnly({ runtimeData = {} }) {
  const copy = COPY_BY_VARIANT[runtimeData.variant];
  if (!copy) {
    if (process.env.NODE_ENV !== 'production') {
      // eslint-disable-next-line no-console
      console.warn(`[GovFlagOnly] Unknown variant: ${runtimeData.variant}`);
    }
    return null;
  }
  return (
    <div
      data-testid="callout-gov_flag_only"
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
      <p style={{ margin: 0 }}>{copy}</p>
    </div>
  );
}
