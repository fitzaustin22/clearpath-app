'use client';

/**
 * QDROBranchDBPVDisplay — §8.6.2 per-perspective PV display for the
 * `private_db` branch of the QDRO Decision Guide. Mounts at the seam in
 * `QDROBranchDB.jsx` per PR-B2-α.
 *
 * Architect-locked display matrix (D3 — the §8.6.2 table is canonical;
 * §10.1 prose to be amended separately in the vault):
 *
 *   No coverture (results.coverture === null):
 *     Both perspectives: headline = full PV with low/high range.
 *     No collapsible secondary.
 *
 *   Coverture (results.coverture !== null):
 *     Both perspectives:
 *       Headline = marital PV with low/high range, labeled "marital portion".
 *       Secondary = full PV in a collapsible labeled "for context: total PV".
 *     Alternate-payee variant additionally surfaces the LOCKED line:
 *       "Only the marital portion is on the negotiating table. The
 *        non-marital portion is your former spouse's separate property."
 *     Participant variant does NOT include that line.
 *
 *   `getHeadlinePV(results) == null` (no usable results — flag-only, missing
 *   results, or pre-reconciliation transient):
 *     Component renders nothing. The shipped §8.6.3 callout (gated on
 *     `pvSource == null`) owns the null path. State-coherence between the
 *     two gates is maintained by `reconcileQDROPvSources` per Phase-3 design.
 *
 * Discipline notes:
 *   - PV union is NEVER dereferenced here — `getHeadlinePV` / `getMaritalPV`
 *     and their range siblings absorb the discriminated-union shape.
 *   - Currency formatting is delegated to the shared `formatUSD` util.
 *   - Disclosure mirrors the QDROWhyThisMatters / QDROStillNotSureDiagnostic
 *     idiom — real `<button>` toggle, `aria-expanded` + `aria-controls`,
 *     keyboard-operable, content mounted only while expanded. Inlined here
 *     rather than via QDROWhyThisMatters so stable testids land on the
 *     toggle and region per PR-B2-α prompt.
 *   - Brand tokens via the central `T` object; no Tailwind chains, no
 *     hardcoded hex.
 */

import { useId, useState } from 'react';
import { useM5Store } from '@/src/stores/m5Store';
import {
  getHeadlinePV,
  getHeadlinePVRange,
  getMaritalPVRange,
} from '@/src/lib/pensionValuation';
import { formatUSD } from '@/src/lib/format/currency.js';
import { T } from '@/src/lib/brand/tokens';

const AP_NON_MARITAL_LINE =
  "Only the marital portion is on the negotiating table. The non-marital portion is your former spouse's separate property.";
const MARITAL_PORTION_LABEL = 'marital portion';
const COLLAPSIBLE_LABEL = 'for context: total PV';

function rangeText(range) {
  if (!range) return '';
  return `(range ${formatUSD(range.low)}–${formatUSD(range.high)})`;
}

const containerStyle = {
  background: T.PARCHMENT,
  border: `1px solid ${T.LINE}`,
  borderRadius: 6,
  padding: '12px 16px',
  margin: '12px 0',
  fontFamily: T.FONT_BODY,
  color: T.NAVY,
};

const headlineStyle = { fontSize: 13, lineHeight: 1.5 };

const rangeMutedStyle = { color: T.INK_2 };

const toggleStyle = {
  padding: 0,
  marginTop: 8,
  background: 'none',
  border: 'none',
  color: T.NAVY,
  fontFamily: T.FONT_BODY,
  fontSize: 13,
  fontWeight: 600,
  textDecoration: 'underline',
  cursor: 'pointer',
};

const regionStyle = {
  marginTop: 8,
  padding: '10px 12px',
  background: T.CARD,
  border: `1px solid ${T.LINE}`,
  borderRadius: 6,
  fontSize: 13,
  lineHeight: 1.5,
  color: T.INK_2,
};

/**
 * @param {object} props
 * @param {string} props.assetId — same-key id (M2 item id) used for
 *   pensionValuation.assets[assetId].results lookup.
 * @param {'participant' | 'alternatePayee'} props.perspective
 */
export default function QDROBranchDBPVDisplay({ assetId, perspective }) {
  // Live read of the same-key PVA results. The reconciler keeps `pvSource`
  // in lock-step with usability, but this component gates on usability
  // independently (defensive: if `pvSource` ever lands without usable
  // results, render nothing — never surface a half-built display).
  const results = useM5Store(
    (s) => s.pensionValuation?.assets?.[assetId]?.results,
  );

  const regionId = useId();
  const [expanded, setExpanded] = useState(false);

  if (getHeadlinePV(results) == null) return null;

  const isCoverture = results.coverture !== null;
  const headlineRange = getHeadlinePVRange(results);

  // ── No-coverture path: full PV headline only.
  if (!isCoverture) {
    return (
      <div data-testid="qdro-db-pv-display" style={containerStyle}>
        <div
          data-testid="qdro-db-pv-display-headline"
          style={headlineStyle}
        >
          <span style={{ fontWeight: 600 }}>
            Present value: {formatUSD(headlineRange.best)}
          </span>{' '}
          <span style={rangeMutedStyle}>{rangeText(headlineRange)}</span>
        </div>
      </div>
    );
  }

  // ── Coverture path: marital headline + "for context: total PV" collapsible.
  const maritalRange = getMaritalPVRange(results);

  return (
    <div data-testid="qdro-db-pv-display" style={containerStyle}>
      <div
        data-testid="qdro-db-pv-display-headline"
        style={headlineStyle}
      >
        <span style={{ fontWeight: 600 }}>
          Present value ({MARITAL_PORTION_LABEL}):{' '}
          {formatUSD(maritalRange.best)}
        </span>{' '}
        <span style={rangeMutedStyle}>{rangeText(maritalRange)}</span>
      </div>

      <button
        type="button"
        data-testid="qdro-db-pv-display-collapsible-toggle"
        aria-expanded={expanded}
        aria-controls={regionId}
        onClick={() => setExpanded((v) => !v)}
        style={toggleStyle}
      >
        {COLLAPSIBLE_LABEL}
      </button>

      {expanded ? (
        <div
          id={regionId}
          data-testid="qdro-db-pv-display-collapsible-region"
          style={regionStyle}
        >
          <div style={headlineStyle}>
            Total present value: {formatUSD(headlineRange.best)}{' '}
            <span style={rangeMutedStyle}>{rangeText(headlineRange)}</span>
          </div>
          {perspective === 'alternatePayee' ? (
            <div
              data-testid="qdro-db-pv-display-ap-line"
              style={{ marginTop: 8, ...headlineStyle, color: T.INK_2 }}
            >
              {AP_NON_MARITAL_LINE}
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
