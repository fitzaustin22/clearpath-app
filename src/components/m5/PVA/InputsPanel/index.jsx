'use client';

/**
 * InputsPanel — v3 reskin. Visual wrapper only; all engine and store logic
 * unchanged. Adds intro callout, form-card wrapper, an always-visible
 * required-inputs block (CommonFields section="required" — participantDOB
 * drives the annuity-factor lookup and is not pre-populated, so it must stay
 * surfaced or the engine throws → null PV), an Optional-assumptions collapsible
 * (CommonFields section="assumptions" via display:none — NOT conditional
 * rendering, so TC-PVA-InputsPanel-1 testids remain in DOM regardless of toggle
 * state), and a "Calculate present value" CTA that calls onCalculate?.().
 */

import { useState } from 'react';
import { useM5Store } from '@/src/stores/m5Store';
import { T } from '@/src/lib/brand/tokens';
import CommonFields from './CommonFields.jsx';
import PlanTypeSelector from './PlanTypeSelector.jsx';
import PensionStatusSelector from './PensionStatusSelector.jsx';
import TierOverride from './TierOverride.jsx';
import Tier1And2Fields from './Tier1And2Fields.jsx';
import Tier3Fields from './Tier3Fields.jsx';
import InPayFields from './InPayFields.jsx';
import CashBalanceFields from './CashBalanceFields.jsx';
import FlagOnlyFields from './FlagOnlyFields.jsx';
import ReceiptFormDropdown from './ReceiptFormDropdown.jsx';

/**
 * @param {object} props
 * @param {string} props.assetId
 * @param {'tier_1' | 'tier_2' | 'tier_3' | 'in_pay_status' | 'cash_balance' | 'flag_only' | null} props.path
 * @param {boolean} [props.frozenRoutingApplied]
 * @param {() => void} [props.onCalculate]  Switches orchestrator view to 'results'
 */
export default function InputsPanel({ assetId, path, frozenRoutingApplied = false, onCalculate }) {
  const [assumptionsOpen, setAssumptionsOpen] = useState(false);

  // LL-9: primitive selectors only.
  const inputs = useM5Store((s) => s.pensionValuation?.assets?.[assetId]?.inputs);
  const setPVAAssetInputs = useM5Store((s) => s.setPVAAssetInputs);

  const safeInputs = inputs ?? {};

  const updateField = (field, value) => {
    const current = useM5Store.getState().pensionValuation?.assets?.[assetId]?.inputs ?? {};
    setPVAAssetInputs(assetId, { ...current, [field]: value });
  };

  return (
    <div
      data-testid="pva-inputs-panel"
      style={{ fontFamily: T.FONT_BODY, color: T.NAVY }}
    >
      {/* Intro callout */}
      <div
        style={{
          background: T.GOLD_TINT,
          border: `1px solid ${T.GOLD_BORDER}`,
          borderRadius: 8,
          padding: '14px 18px',
          marginBottom: 20,
          fontFamily: T.FONT_BODY,
          fontSize: 15,
          lineHeight: 1.6,
          color: T.INK_2,
        }}
      >
        Enter a few details about the pension. We&apos;ll estimate its present-day value — and, if
        part of it was earned during the marriage, the marital share. Takes about 5 minutes.
      </div>

      {/* Form card */}
      <div
        style={{
          background: T.CARD,
          border: `1px solid ${T.LINE}`,
          borderRadius: 12,
          boxShadow: T.SHADOW_CARD,
          padding: '28px 26px 24px',
        }}
      >
        <PlanTypeSelector inputs={safeInputs} onChange={updateField} />
        <PensionStatusSelector inputs={safeInputs} onChange={updateField} />

        {/* Required compute inputs — always visible. participantDOB drives the
            annuity-factor lookup and is not pre-populated; hiding it (as the
            first reskin pass did) starved the engine and produced a null PV. */}
        <CommonFields inputs={safeInputs} onChange={updateField} section="required" />

        {/* Optional-assumptions collapsible — display:none preserves testids in
            DOM. Only seeded/inert/optional fields live here now. */}
        <div style={{ marginTop: 16 }}>
          <button
            type="button"
            onClick={() => setAssumptionsOpen((o) => !o)}
            aria-expanded={assumptionsOpen}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              fontFamily: T.FONT_BODY,
              fontSize: 14,
              fontWeight: 600,
              color: T.NAVY_70,
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              padding: '8px 0',
            }}
          >
            <span style={{ color: T.GOLD, fontSize: 12 }}>{assumptionsOpen ? '▾' : '▸'}</span>
            <span>Optional assumptions (mortality table)</span>
          </button>
          <div style={{ display: assumptionsOpen ? 'block' : 'none' }}>
            <CommonFields inputs={safeInputs} onChange={updateField} section="assumptions" />
          </div>
        </div>

        <TierOverride
          inputs={safeInputs}
          path={path}
          frozenRoutingApplied={frozenRoutingApplied}
          onChange={updateField}
        />

        {path === 'tier_1' && (
          <Tier1And2Fields tier="tier_1" inputs={safeInputs} onChange={updateField} />
        )}
        {path === 'tier_2' && (
          <Tier1And2Fields tier="tier_2" inputs={safeInputs} onChange={updateField} />
        )}
        {path === 'tier_3' && <Tier3Fields inputs={safeInputs} onChange={updateField} />}
        {path === 'in_pay_status' && <InPayFields inputs={safeInputs} onChange={updateField} />}
        {path === 'cash_balance' && <CashBalanceFields inputs={safeInputs} onChange={updateField} />}
        {path === 'flag_only' && <FlagOnlyFields planType={safeInputs.planType} />}

        <ReceiptFormDropdown inputs={safeInputs} path={path} onChange={updateField} />

        {/* CTA */}
        {path !== 'flag_only' && (
          <div style={{ marginTop: 24 }}>
            <button
              type="button"
              onClick={() => onCalculate?.()}
              style={{
                width: '100%',
                padding: '14px 24px',
                fontFamily: T.FONT_BODY,
                fontSize: 16,
                fontWeight: 700,
                color: '#FFFFFF',
                background: T.NAVY,
                border: 'none',
                borderRadius: 8,
                cursor: 'pointer',
                letterSpacing: '.01em',
              }}
            >
              Calculate present value
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
