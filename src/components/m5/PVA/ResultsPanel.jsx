'use client';

/**
 * ResultsPanel — MVP numerics + 3 structural banners per spec §7.6.1 / §7.6.3.
 *
 * In scope for PR 2:
 *   - Headline PV BigNumber per path
 *   - Marital portion + coverture fraction (Tier 3, Cash-balance-with-coverture)
 *   - Sensitivity bracket (±100bp) for Tier 1/2/3 + in-pay
 *   - 3 structural banners: frozen-routing, legacy-currentvalue, flag-only result
 *   - Soft placeholder when results === null (required inputs missing)
 *
 * Out of scope (deferred to PR 3):
 *   - Full §7.9.1 educational callout stack (12 callouts, precedence-sorted)
 *   - Show-the-math expanded breakdown panel (§7.6.2)
 *   - Design-partner cycle for polished visual rhythm
 *
 * Uses §7.10 barrel helpers `getHeadlinePV` / `getMaritalPV` for type-narrow
 * consumption of the discriminated `pv` union per [R5b-16].
 */

import Link from 'next/link';
import { T } from '@/src/lib/brand/tokens';
import { formatUSD } from '@/src/lib/format/currency';
import { getHeadlinePV, getMaritalPV } from '@/src/lib/pensionValuation';
import CalloutStack from './callouts/CalloutStack';
import PerStepNarrative from './show-the-math/PerStepNarrative';
import PvComputationRationale from './educational/PvComputationRationale';
import CovertureRationale from './educational/CovertureRationale';
import TaxTreatmentNote from './educational/TaxTreatmentNote';

function BigNumber({ value, label, testId }) {
  return (
    <div data-testid={testId} style={{ marginBottom: 16 }}>
      <div
        style={{
          ...T.NUMERIC_STYLE,
          fontSize: 36,
          fontWeight: 500,
          color: T.NAVY,
          lineHeight: 1.1,
        }}
      >
        {formatUSD(value)}
      </div>
      <div
        style={{
          fontFamily: T.FONT_BODY,
          fontSize: 13,
          color: T.NAVY_70,
          marginTop: 4,
        }}
      >
        {label}
      </div>
    </div>
  );
}

function Banner({ testId, children }) {
  return (
    <div
      data-testid={testId}
      style={{
        background: T.AMBER_BG,
        color: T.NAVY,
        padding: '12px 16px',
        marginBottom: 12,
        fontFamily: T.FONT_BODY,
        fontSize: 14,
        border: `1px solid ${T.AMBER_BORDER}`,
        borderRadius: 6,
        lineHeight: 1.5,
      }}
    >
      {children}
    </div>
  );
}

/**
 * @param {object} props
 * @param {object | null} props.results
 * @param {{_frozenRoutingApplied?: boolean}} props.flags
 */
export default function ResultsPanel({ results, flags }) {
  // Soft placeholder (§7.6.3 "Required inputs missing → 'complete inputs to see PV'")
  if (!results) {
    return (
      <div
        data-testid="pva-results-placeholder"
        style={{
          marginTop: 16,
          padding: '16px',
          fontFamily: T.FONT_BODY,
          fontSize: 14,
          color: T.NAVY_55,
          background: T.CARD,
          border: `1px dashed ${T.NAVY_12}`,
          borderRadius: 8,
        }}
      >
        Complete the required inputs above to see present value.
      </div>
    );
  }

  const isFlagOnly = results.path === 'flag_only';
  const isCoverturePath = results.coverture !== null && results.coverture !== undefined;

  const showFrozenBanner = flags?._frozenRoutingApplied === true;
  const showFlagOnlyBanner = isFlagOnly;

  const headlinePV = isFlagOnly ? null : getHeadlinePV(results);
  const maritalPV = isCoverturePath ? getMaritalPV(results) : null;
  const callouts = results.breakdown?.callouts ?? [];
  const perStepNarrative = results.breakdown?.perStepNarrative ?? [];
  const isTier3 = results.path === 'tier_3';

  const sensitivityVisible =
    !isFlagOnly &&
    !isCoverturePath &&
    results.pv &&
    typeof results.pv.low === 'number' &&
    typeof results.pv.high === 'number' &&
    results.pv.low !== results.pv.high;

  return (
    <section
      data-testid="pva-results-panel"
      style={{
        marginTop: 16,
        padding: 16,
        background: T.CARD,
        border: `1px solid ${T.NAVY_12}`,
        borderRadius: 8,
      }}
    >
      <h3
        style={{
          fontFamily: T.FONT_DISPLAY,
          fontSize: '1.125rem',
          fontWeight: 500,
          color: T.NAVY,
          margin: '0 0 12px 0',
        }}
      >
        Present value
      </h3>

      {showFrozenBanner && (
        <Banner testId="pva-banner-frozen">
          <strong>Frozen plan</strong> — Tier 3 (coverture) unavailable; valued on an accrued-benefit basis. Per [R5b-18].
        </Banner>
      )}
      {showFlagOnlyBanner && (
        <Banner testId="pva-banner-flagonly">
          <strong>Specialist valuation required.</strong> Plan type{' '}
          <code style={{ fontFamily: T.FONT_BODY }}>{results.metadata?.planType ?? 'unknown'}</code>{' '}
          cannot be valued via the standard PVA engine at v1. Plan metadata is recorded; PV is not
          computed.
        </Banner>
      )}

      {!isFlagOnly && (
        <>
          {isCoverturePath ? (
            <>
              <BigNumber
                value={maritalPV}
                label={`Marital portion (coverture fraction ${
                  results.coverture?.fraction != null
                    ? `${(results.coverture.fraction * 100).toFixed(2)}%`
                    : '—'
                })`}
                testId="pva-bignumber-marital"
              />
              <BigNumber
                value={headlinePV}
                label="Full present value"
                testId="pva-bignumber-total"
              />
            </>
          ) : (
            <BigNumber value={headlinePV} label="Present value" testId="pva-bignumber-headline" />
          )}

          {sensitivityVisible && (
            <div
              data-testid="pva-sensitivity-bracket"
              style={{
                ...T.NUMERIC_STYLE,
                fontSize: 14,
                color: T.NAVY_70,
                fontFamily: T.FONT_BODY,
                marginTop: 4,
              }}
            >
              Sensitivity (±100bp on discount rate): {formatUSD(results.pv.low)} – {formatUSD(results.pv.high)}
            </div>
          )}

          <div
            style={{
              fontFamily: T.FONT_BODY,
              fontSize: 13,
              color: T.NAVY_55,
              marginTop: 12,
            }}
          >
            Path: <code style={{ fontFamily: T.FONT_BODY }}>{results.path}</code>
            {results.formulaId && (
              <>
                {' '}
                · Formula:{' '}
                <code style={{ fontFamily: T.FONT_BODY }}>{results.formulaId}</code>
              </>
            )}
          </div>
          <p
            data-testid="pva-inventory-note"
            style={{
              fontFamily: T.FONT_BODY,
              fontSize: 13,
              color: T.NAVY_55,
              margin: '8px 0 0',
            }}
          >
            This pension is valued here from present-value inputs; the figure in your inventory isn&apos;t used directly.
          </p>
        </>
      )}

      {!isFlagOnly && (
        <div
          data-testid="pva-cta-pit"
          style={{
            marginTop: 16,
            padding: '14px 18px',
            backgroundColor: T.PARCHMENT,
            borderRadius: 8,
            borderLeft: `4px solid ${T.GOLD}`,
          }}
        >
          <Link
            href="/modules/m4/tax-discount"
            style={{
              fontFamily: T.FONT_BODY,
              fontWeight: 700,
              fontSize: 15,
              color: T.NAVY,
              textDecoration: 'none',
            }}
          >
            Continue to Tax Discount →
          </Link>
          <p
            style={{
              fontFamily: T.FONT_BODY,
              fontSize: 13,
              color: T.NAVY_55,
              margin: '6px 0 0',
            }}
          >
            Apply IRC §417(e) tax adjustment to this pension's marital share.
          </p>
        </div>
      )}

      <CalloutStack callouts={callouts} />

      {!isFlagOnly && (
        <>
          <PerStepNarrative steps={perStepNarrative} />
          <PvComputationRationale />
          {isTier3 && <CovertureRationale />}
          <TaxTreatmentNote />
        </>
      )}
    </section>
  );
}
