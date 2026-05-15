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

import { T } from '@/src/lib/brand/tokens';
import {
  REFI_RATE_BY_CREDIT_BAND,
  BANDED_REFI_RATE_BUILD_DATE,
} from '@/src/lib/homeDecision';

// ── Style objects (mirrors HomeDecisionInputs idiom: T.* tokens, no hardcoded hex) ──

const LABEL_STYLE = {
  display: 'block',
  fontFamily: T.FONT_BODY,
  fontSize: 14,
  fontWeight: 600,
  color: T.NAVY,
  marginBottom: 6,
};

const INPUT_STYLE = {
  width: '100%',
  padding: '10px 12px',
  fontFamily: T.FONT_BODY,
  fontSize: 16,
  color: T.NAVY,
  border: `1px solid ${T.NAVY_12}`,
  borderRadius: 6,
  backgroundColor: T.CARD,
  outline: 'none',
  boxSizing: 'border-box',
};

const HELPER_STYLE = {
  fontFamily: T.FONT_BODY,
  fontSize: 13,
  color: T.NAVY_55,
  margin: '6px 0 0',
};

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

  function handleInputChange(e) {
    const v = e.target.value;
    if (v === '') {
      // Null discipline: empty string → null, never coerce to 0.
      onChange('refiRate', null);
    } else {
      const n = Number(v);
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
      <label htmlFor="hda-input-refiRate" style={LABEL_STYLE}>
        Refi rate (APR)
      </label>

      <input
        id="hda-input-refiRate"
        data-testid="hda-input-refiRate"
        type="number"
        inputMode="decimal"
        min={0}
        step="any"
        placeholder="Enter your quoted rate (% APR)"
        value={value == null ? '' : value}
        onChange={handleInputChange}
        style={INPUT_STYLE}
      />

      <p style={HELPER_STYLE}>
        Decimal form: 0.0625 = 6.25% APR. Enter your lender-quoted rate.
      </p>

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
