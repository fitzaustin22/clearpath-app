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

import { T } from '@/src/lib/brand/tokens';
import { getHeadlinePV, getMaritalPV } from '@/src/lib/pensionValuation';
import CalloutStack from './callouts/CalloutStack';

function formatUSD(value) {
  if (value == null || !Number.isFinite(value)) return '—';
  return value.toLocaleString('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  });
}

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
 * @param {{_legacyCurrentValueDetected?: boolean, _legacyValue?: number | null, _frozenRoutingApplied?: boolean}} props.flags
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
  const showLegacyBanner = flags?._legacyCurrentValueDetected === true;
  const showFlagOnlyBanner = isFlagOnly;

  const headlinePV = isFlagOnly ? null : getHeadlinePV(results);
  const maritalPV = isCoverturePath ? getMaritalPV(results) : null;
  const callouts = results.breakdown?.callouts ?? [];

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
          <strong>Frozen plan</strong> — defaulted to Tier 1 (no future-service projection). Per [R5b-18].
        </Banner>
      )}
      {showLegacyBanner && (
        <Banner testId="pva-banner-legacy">
          <strong>Legacy currentValue ignored.</strong> M2 carried a pre-Addendum-2{' '}
          <code style={{ fontFamily: T.FONT_BODY }}>currentValue</code> field
          ({formatUSD(flags?._legacyValue)}). For DB pensions, present value differs from rollover /
          cash-out values — PVA computes its own PV.
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
                label="Total present value"
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
        </>
      )}

      <CalloutStack callouts={callouts} />
    </section>
  );
}
