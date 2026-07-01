'use client';

/**
 * ResultsPanel — v3 reskin.
 *
 * Visual overhaul: hero card (Newsreader 60px headline, CSS sensitivity bar
 * with engine-exact marker position per Override 1), learn-more expanders,
 * secondary actions. All test-asserted data-testids, banner logic, sensitivity
 * hide-for-coverture behavior, and structural conditionality preserved exactly.
 *
 * pv union shapes (from pvHelpers.js):
 *   Non-coverture:  results.pv = { best, low, high }
 *   Coverture:      results.pv = { total: {best,low,high}, marital: {best,low,high} }
 *   Flag-only:      results.pv = null
 */

import Link from 'next/link';
import { T } from '@/src/lib/brand/tokens';
import { formatUSD } from '@/src/lib/format/currency';
import { getHeadlinePV, getMaritalPV } from '@/src/lib/pensionValuation';
import { hasGenuinePV } from './resultValidity.js';
import CalloutStack from './callouts/CalloutStack';
import PerStepNarrative from './show-the-math/PerStepNarrative';
import PvComputationRationale from './educational/PvComputationRationale';
import CovertureRationale from './educational/CovertureRationale';
import TaxTreatmentNote from './educational/TaxTreatmentNote';

// ─── Sensitivity band ───────────────────────────────────────────────────────
//
// TC-PVA-Results-3 is authoritative: sensitivity bracket is HIDDEN for coverture
// paths (the pv union shape differs). Override 1 applies to the marker position
// within the bar (it sits at the true best-estimate position, not at 50%).

function getSensitivityBand(results, isCoverturePath) {
  if (!results || !results.pv || results.path === 'flag_only') return null;
  if (isCoverturePath) return null; // TC-PVA-Results-3: no bracket on coverture paths
  const { low, best, high } = results.pv;
  if (typeof low !== 'number' || low === high) return null;
  return { low, best, high };
}

// ─── Sub-components ─────────────────────────────────────────────────────────

function HeroFigure({ value, testId }) {
  return (
    <div
      data-testid={testId}
      style={{
        fontFamily: T.FONT_NUMERIC,
        fontSize: 60,
        fontWeight: 500,
        lineHeight: 1,
        color: T.NAVY,
        letterSpacing: '-0.01em',
        fontVariantNumeric: 'lining-nums tabular-nums',
        margin: '8px 0 4px',
      }}
    >
      {formatUSD(value)}
    </div>
  );
}

function SensitivityBar({ band }) {
  // Override 1: marker at TRUE position — (best - low) / (high - low), never hardcoded.
  const markerPct = Math.max(0, Math.min(100, ((band.best - band.low) / (band.high - band.low)) * 100));
  return (
    <div style={{ marginTop: 20, marginBottom: 4 }}>
      {/* Best-estimate label above marker */}
      <div style={{ position: 'relative', height: 18, marginBottom: 2 }}>
        <div
          style={{
            position: 'absolute',
            left: `${markerPct}%`,
            transform: 'translateX(-50%)',
            fontFamily: T.FONT_NUMERIC,
            fontSize: 12,
            fontWeight: 600,
            color: T.NAVY,
            whiteSpace: 'nowrap',
            fontVariantNumeric: 'lining-nums tabular-nums',
          }}
        >
          {formatUSD(band.best)}
        </div>
      </div>
      {/* Track + fill + marker needle */}
      <div
        data-testid="pva-sensitivity-bracket"
        style={{
          position: 'relative',
          height: 12,
          borderRadius: 999,
          background: T.PARCHMENT_DEEP,
          border: `1px solid ${T.LINE}`,
        }}
      >
        <div
          style={{
            position: 'absolute',
            inset: 0,
            borderRadius: 999,
            background: `linear-gradient(90deg, ${T.GOLD}, ${T.GOLD_SOFT})`,
            opacity: 0.55,
          }}
        />
        <div
          style={{
            position: 'absolute',
            left: `${markerPct}%`,
            top: -3,
            bottom: -3,
            width: 3,
            borderRadius: 2,
            background: T.NAVY,
            transform: 'translateX(-50%)',
          }}
        />
      </div>
      {/* Low / High labels */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          marginTop: 4,
          fontFamily: T.FONT_BODY,
          fontSize: 11,
          color: T.NAVY_55,
          fontVariantNumeric: 'lining-nums tabular-nums',
        }}
      >
        <span>Low {formatUSD(band.low)}</span>
        <span>High {formatUSD(band.high)}</span>
      </div>
      <p
        style={{
          fontFamily: T.FONT_BODY,
          fontSize: 12,
          color: T.NAVY_55,
          margin: '6px 0 0',
          lineHeight: 1.5,
        }}
      >
        Present value depends on the assumptions used. This range reflects reasonable variation in the discount rate.
      </p>
    </div>
  );
}

function StructuralBanner({ testId, children }) {
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

function DownloadIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke={T.NAVY}
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      style={{ display: 'block', flexShrink: 0 }}
    >
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="7 10 12 15 17 10" />
      <line x1="12" y1="15" x2="12" y2="3" />
    </svg>
  );
}

function ResultsPlaceholder() {
  return (
    <div
      data-testid="pva-results-placeholder"
      style={{
        marginTop: 16,
        padding: '20px 24px',
        fontFamily: T.FONT_BODY,
        fontSize: 14,
        color: T.NAVY_55,
        background: T.CARD,
        border: `1px dashed ${T.NAVY_12}`,
        borderRadius: 12,
        lineHeight: 1.6,
      }}
    >
      Complete the required inputs above to see present value.
    </div>
  );
}

// ─── Main component ──────────────────────────────────────────────────────────

/**
 * @param {object} props
 * @param {object | null} props.results
 * @param {{_frozenRoutingApplied?: boolean}} props.flags
 * @param {() => void} [props.onChangeInputs]  Called when user clicks "← Change inputs"
 */
export default function ResultsPanel({ results, flags, onChangeInputs }) {
  // Missing-date inputs make the frozen engine throw → PVA.jsx yields null here.
  if (!results) return <ResultsPlaceholder />;

  const isFlagOnly = results.path === 'flag_only';
  const isCoverturePath = results.coverture !== null && results.coverture !== undefined;
  const isTier3 = results.path === 'tier_3';
  const showFrozenBanner = flags?._frozenRoutingApplied === true;

  const headlinePV = isFlagOnly ? null : getHeadlinePV(results);
  const maritalPV = isCoverturePath ? getMaritalPV(results) : null;

  // Residual-risk guard: a required NUMERIC input left blank reaches the
  // frozen engine as `null`, which arithmetic silently coerces to a FINITE 0
  // (`null * 12 * af * deferralFactor === 0`) rather than NaN — a confident
  // "$0" would render instead of a broken hero. `hasGenuinePV` is the shared
  // predicate (also used by PVA.jsx to gate what gets persisted, and thus what
  // AssetPicker's "valued" tag reflects) — keep both in sync via one function
  // rather than re-deriving this check in more than one place.
  if (!isFlagOnly && !hasGenuinePV(results)) {
    return <ResultsPlaceholder />;
  }
  const coverturePct =
    results.coverture?.fraction != null
      ? `${(results.coverture.fraction * 100).toFixed(2)}%`
      : null;

  const callouts = results.breakdown?.callouts ?? [];
  const perStepNarrative = results.breakdown?.perStepNarrative ?? [];
  const sensitivityBand = getSensitivityBand(results, isCoverturePath);

  return (
    <section data-testid="pva-results-panel" style={{ marginTop: 16 }}>

      {/* ── Hero card ─────────────────────────────────────────────────── */}
      <div
        style={{
          background: T.CARD,
          border: `1px solid ${T.GOLD_BORDER}`,
          borderRadius: 12,
          boxShadow: '0 20px 40px rgba(28,28,25,.06)',
          padding: '36px 34px 30px',
          marginBottom: 16,
        }}
      >
        {showFrozenBanner && (
          <StructuralBanner testId="pva-banner-frozen">
            <strong>Frozen plan</strong> — Tier 3 (coverture) unavailable; valued on an accrued-benefit
            basis. Per [R5b-18].
          </StructuralBanner>
        )}
        {isFlagOnly && (
          <StructuralBanner testId="pva-banner-flagonly">
            <strong>Specialist valuation required.</strong> Plan type{' '}
            <code style={{ fontFamily: T.FONT_BODY }}>{results.metadata?.planType ?? 'unknown'}</code>{' '}
            cannot be valued via the standard PVA engine at v1. Plan metadata is recorded; PV is not
            computed.
          </StructuralBanner>
        )}

        {!isFlagOnly && (
          <>
            {/* Eyebrow */}
            <div
              style={{
                fontSize: 11,
                fontWeight: 700,
                textTransform: 'uppercase',
                letterSpacing: '.9px',
                color: T.PILL_TEXT,
              }}
            >
              {isCoverturePath ? 'Estimated marital share (present value)' : 'Estimated present value'}
            </div>

            {/* Hero figure */}
            {isCoverturePath ? (
              <>
                <HeroFigure value={maritalPV} testId="pva-bignumber-marital" />
                <div
                  style={{
                    fontFamily: T.FONT_BODY,
                    fontSize: 14,
                    color: T.NAVY_70,
                    marginTop: 4,
                  }}
                >
                  {coverturePct} of the pension &nbsp;·&nbsp; Full present value{' '}
                  <span
                    data-testid="pva-bignumber-total"
                    style={{
                      fontFamily: T.FONT_NUMERIC,
                      fontVariantNumeric: 'lining-nums tabular-nums',
                    }}
                  >
                    {formatUSD(headlinePV)}
                  </span>
                </div>
              </>
            ) : (
              <HeroFigure value={headlinePV} testId="pva-bignumber-headline" />
            )}

            {/* Sensitivity range bar — hidden for coverture (TC-PVA-Results-3) */}
            {sensitivityBand && <SensitivityBar band={sensitivityBand} />}

            {/* Divider + caption */}
            <hr
              style={{
                border: 'none',
                borderTop: `1px solid ${T.NAVY_12}`,
                margin: '20px 0 12px',
              }}
            />
            <p
              style={{
                fontFamily: T.FONT_BODY,
                fontSize: 14.5,
                lineHeight: 1.6,
                color: T.INK_2,
                margin: 0,
              }}
            >
              This is one party&apos;s estimate in today&apos;s dollars — not a binding figure. The other
              side may value it differently.
            </p>

            {/* Inventory note (preserved testid TC-PVA-Results-10) */}
            <p
              data-testid="pva-inventory-note"
              style={{
                fontFamily: T.FONT_BODY,
                fontSize: 13,
                color: T.NAVY_55,
                margin: '8px 0 0',
              }}
            >
              This pension is valued here from present-value inputs; the figure in your inventory
              isn&apos;t used directly.
            </p>
          </>
        )}
      </div>

      {/* ── Engine callouts — unconditional; CalloutStack self-hides on empty ─ */}
      <CalloutStack callouts={callouts} />

      {/* ── Compute-path content ──────────────────────────────────────── */}
      {!isFlagOnly && (
        <>
          <PerStepNarrative steps={perStepNarrative} />

          <PvComputationRationale />
          {isTier3 && <CovertureRationale />}
          <TaxTreatmentNote />

          {/* PIT continue CTA (TC-PVA-Results-CTA-*) */}
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
              Apply IRC §417(e) tax adjustment to this pension&apos;s marital share.
            </p>
          </div>

          {/* Secondary actions */}
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: 12,
              marginTop: 20,
              paddingTop: 16,
              borderTop: `1px solid ${T.LINE}`,
            }}
          >
            <button
              type="button"
              onClick={() => onChangeInputs?.()}
              style={{
                fontFamily: T.FONT_BODY,
                fontSize: 14,
                fontWeight: 600,
                color: T.NAVY_70,
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                padding: 0,
              }}
            >
              ← Change inputs
            </button>
            <button
              type="button"
              onClick={() => typeof window !== 'undefined' && window.print()}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                fontFamily: T.FONT_BODY,
                fontSize: 15,
                fontWeight: 700,
                color: T.NAVY,
                background: T.CARD,
                border: `1px solid ${T.LINE_STRONG}`,
                borderRadius: 8,
                padding: '12px 22px',
                cursor: 'pointer',
              }}
            >
              <DownloadIcon />
              Download summary (PDF)
            </button>
          </div>
        </>
      )}
    </section>
  );
}
