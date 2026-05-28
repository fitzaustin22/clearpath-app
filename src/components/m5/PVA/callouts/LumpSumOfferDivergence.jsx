'use client';

import { T } from '@/src/lib/brand/tokens';

// Intentional: returns the '$—' sentinel (not '—'), so this stays inline rather than consuming @/src/lib/format/currency.
function formatUSD(n) {
  if (n == null || !Number.isFinite(n)) return '$—';
  return n.toLocaleString('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  });
}

function formatPctAbs(pct) {
  if (pct == null || !Number.isFinite(pct)) return '—';
  return `${Math.abs(pct * 100).toFixed(1)}%`;
}

function divergenceDirection(pctDiff) {
  if (pctDiff == null || !Number.isFinite(pctDiff)) return 'differs from';
  return pctDiff < 0 ? 'below' : 'above';
}

/**
 * §7.9.2 — lump_sum_offer_divergence. Runtime: { offer, toolPv, diff, pctDiff }.
 */
export default function LumpSumOfferDivergence({ runtimeData = {} }) {
  const { offer, toolPv, diff, pctDiff } = runtimeData;
  const direction = divergenceDirection(pctDiff);
  const absDiff = diff != null && Number.isFinite(diff) ? Math.abs(diff) : null;

  return (
    <div
      data-testid="callout-lump_sum_offer_divergence"
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
        Your plan administrator offers a lump-sum option of {formatUSD(offer)}. PVA's independent valuation is {formatUSD(toolPv)} — a difference of {formatUSD(absDiff)} (offer is {formatPctAbs(pctDiff)} {direction} PVA's PV). Plan lump-sum offers can diverge from fair PV; if the plan offer is materially below PVA's PV, this is worth discussing with your CDFA or attorney before electing the lump sum. Your <code style={{ fontFamily: T.FONT_BODY }}>receiptForm</code> selection in PVA controls how M4 PIT applies tax discounting downstream.
      </p>
    </div>
  );
}
