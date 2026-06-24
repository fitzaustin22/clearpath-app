'use client';

import { T } from '@/src/lib/brand/tokens';

/**
 * GuidedFooterNav — the sticky navy footer bar for the guided wizard template.
 * Left: a "Step N of M" style title over a quiet subtitle. Right: Back (gold
 * outline, hidden on the first step) and a gold primary that advances — or
 * commits on the final step. Nothing blocks Continue (kind, low-pressure).
 *
 * Props: title, subtitle, showBack, onBack, onContinue, continueLabel.
 */
export default function GuidedFooterNav({
  title,
  subtitle,
  showBack = true,
  onBack,
  onContinue,
  continueLabel = 'Continue →',
}) {
  return (
    <div
      style={{
        background: T.NAVY,
        borderRadius: 12,
        padding: '14px 20px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 16,
        boxShadow: T.SHADOW_FLOAT,
      }}
    >
      <div style={{ color: '#FFFFFF', minWidth: 0 }}>
        <div style={{ fontFamily: T.FONT_NUMERIC, fontWeight: 500, fontSize: 16 }}>{title}</div>
        {subtitle && (
          <div style={{ fontSize: 12.5, color: 'rgba(255,255,255,.6)', marginTop: 1 }}>{subtitle}</div>
        )}
      </div>
      <div style={{ display: 'flex', gap: 10, flexShrink: 0 }}>
        {showBack && (
          <button
            type="button"
            onClick={onBack}
            style={{
              background: 'transparent',
              border: `1px solid ${T.GOLD}`,
              color: T.GOLD,
              padding: '10px 18px',
              borderRadius: 8,
              fontWeight: 600,
              fontSize: 13.5,
              cursor: 'pointer',
              fontFamily: T.FONT_BODY,
            }}
          >
            Back
          </button>
        )}
        <button
          type="button"
          onClick={onContinue}
          style={{
            background: T.GOLD,
            border: 'none',
            color: T.NAVY,
            padding: '11px 22px',
            borderRadius: 8,
            fontWeight: 700,
            fontSize: 13.5,
            cursor: 'pointer',
            fontFamily: T.FONT_BODY,
          }}
        >
          {continueLabel}
        </button>
      </div>
    </div>
  );
}
