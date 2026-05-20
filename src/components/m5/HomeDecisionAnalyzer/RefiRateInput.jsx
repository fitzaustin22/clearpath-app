'use client';

/**
 * RefiRateInput — §9.6.3 Q-11 Refi rate force-input component.
 *
 * Design contract (TC-HDA-6):
 *  - `refiRate` is force-input: field renders EMPTY with placeholder;
 *    no banded default pre-fills on load.
 *  - Discoverable opt-in link lets the user auto-fill the banded constant
 *    for their credit band (only shown when creditBand is a valid band key).
 *  - 90-day staleness warning shown when a banded default is active and the
 *    build date is >= 90 days before now.
 *
 * Value/unit convention (verified — do not deviate):
 *  inputs.refiRate is a DECIMAL FRACTION (0.0625 = 6.25% APR).
 *  REFI_RATE_BY_CREDIT_BAND values are already decimals.
 *  No ×100/÷100 conversion anywhere in this file.
 *
 * Props contract designed for trivial swap into HomeDecisionInputs:
 *  value       — inputs.refiRate (number|null, decimal fraction)
 *  creditBand  — inputs.userCreditScoreBand ('excellent'|'good'|'fair'|'poor'|null)
 *  provenance  — inputs.refiRateProvenance (provenance enum|null|undefined)
 *  onChange    — (field: string, value: unknown) => void  [same as HomeDecisionInputs]
 *  now         — optional Date; defaults to new Date(); injected by tests for staleness
 */

import { useEffect } from 'react';
import { T } from '@/src/lib/brand/tokens';
import {
  REFI_RATE_BY_CREDIT_BAND,
  BANDED_REFI_RATE_BUILD_DATE,
} from '@/src/lib/homeDecision';
import WizardField from '@/src/components/wizard/WizardField.jsx';

const BANDED_PREFIX = 'banded-default-';

// ── Style objects (mirrors HomeDecisionInputs idiom: T.* tokens, no hardcoded hex) ──

const FIELD_WRAP = { marginBottom: 14 };

const OPTIN_LINK_STYLE = {
  fontFamily: T.FONT_BODY,
  fontSize: 13,
  color: T.NAVY,
  textDecoration: 'underline',
  cursor: 'pointer',
  background: 'none',
  border: 'none',
  padding: 0,
  margin: '6px 0 0',
  display: 'block',
};

const STALENESS_STYLE = {
  fontFamily: T.FONT_BODY,
  fontSize: 13,
  color: T.NAVY_70,
  background: T.NAVY_06,
  border: `1px solid ${T.NAVY_12}`,
  borderRadius: 4,
  padding: '6px 10px',
  margin: '8px 0 0',
};

// ── Pure staleness util (injectable now for testability) ──

/**
 * Returns true iff (now - buildDateISO) >= 90 days.
 * TC-HDA-6: "≥ 90 days old" triggers the warning.
 * @param {{ buildDateISO: string, now: Date }} params
 * @returns {boolean}
 */
export function isBandedRateStale({ buildDateISO, now }) {
  const buildMs = new Date(buildDateISO).getTime();
  const nowMs = now.getTime();
  const ninetyDaysMs = 90 * 24 * 60 * 60 * 1000;
  return (nowMs - buildMs) >= ninetyDaysMs;
}

// ── Valid credit band keys — opt-in link guard ──
// Only render the opt-in when creditBand is one of these 4 valid keys.
// If creditBand is null/unknown there is no band to look up.
const VALID_CREDIT_BANDS = new Set(['excellent', 'good', 'fair', 'poor']);

// ── Component ──

export default function RefiRateInput({ value, creditBand, provenance, onChange, now }) {
  const effectiveNow = now ?? new Date();

  // Staleness: only when a banded default is active (not user-quoted) AND build date is old.
  const isBanded = provenance && provenance !== 'user-quoted';
  const stale = isBanded && isBandedRateStale({
    buildDateISO: BANDED_REFI_RATE_BUILD_DATE,
    now: effectiveNow,
  });

  // Banded defaults are credit-band-specific. If the user opted into a banded
  // default and then changes their credit band, the carried-over rate is for
  // the wrong band — silently stale (the §9.6.3 90-day check does NOT cover
  // band mismatch). Revert to force-input so the user re-quotes or re-opts-in.
  useEffect(() => {
    if (typeof provenance !== 'string' || !provenance.startsWith(BANDED_PREFIX)) return;
    if (provenance.slice(BANDED_PREFIX.length) === creditBand) return;
    onChange('refiRate', null);
    onChange('refiRateProvenance', null);
    // onChange is invoked, not observed (recreated each parent render) — its
    // omission from deps is intentional.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [creditBand, provenance]);

  function handleRateChange(field, raw) {
    if (raw === '') {
      // Null discipline: empty string → null, never coerce to 0.
      onChange('refiRate', null);
    } else {
      const n = Number(raw);
      onChange('refiRate', Number.isFinite(n) ? n : null);
    }
    // Dual-write provenance on every user keystroke.
    onChange('refiRateProvenance', 'user-quoted');
  }

  function handleOptInClick() {
    const bandedDecimal = REFI_RATE_BY_CREDIT_BAND[creditBand];
    // Write value as-is (decimal fraction), no conversion.
    onChange('refiRate', bandedDecimal);
    onChange('refiRateProvenance', 'banded-default-' + creditBand);
  }

  return (
    <div style={FIELD_WRAP}>
      <WizardField
        field="refiRate"
        label="Refi rate (APR)"
        tooltip="Decimal form: 0.0625 = 6.25% APR. Enter your lender-quoted rate."
        numeric
        value={value ?? ''}
        onChange={handleRateChange}
        data-testid="hda-input-refiRate"
      />

      {/* Opt-in link: only render when creditBand is one of the 4 valid bands */}
      {VALID_CREDIT_BANDS.has(creditBand) && (
        <button
          type="button"
          data-testid="hda-refiRate-optin"
          onClick={handleOptInClick}
          style={OPTIN_LINK_STYLE}
        >
          Don&apos;t have a quote yet? Use our credit-band-banded estimate
        </button>
      )}

      {/* Staleness warning: banded default active + build date >= 90 days old */}
      {stale && (
        <p
          data-testid="hda-refiRate-staleness"
          style={STALENESS_STYLE}
        >
          These banded estimates were last updated {BANDED_REFI_RATE_BUILD_DATE}; for
          current market rates, request a quote from a lender.
        </p>
      )}
    </div>
  );
}
