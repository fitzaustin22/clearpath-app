'use client';

import { useState, useRef } from 'react';
import { T } from '@/src/lib/brand/tokens';
import HomeDecisionVerdictBadge from './HomeDecisionVerdictBadge.jsx';

/**
 * §9.8.2 items 2–5 — mobile scenario carousel (output-only, one page per scenario).
 * Horizontally swipeable with accessible prev/next controls and dot indicators.
 * TC-HDA-9: hda-carousel-track is the ONLY element in this file allowed to set
 * overflowX:'auto'/'scroll'. All tables use tableLayout:'fixed' + width:'100%'.
 */

function fmtUSD(n) {
  if (n == null || !Number.isFinite(n)) return '—';
  return (n < 0 ? '-' : '') + '$' + Math.abs(Math.round(n)).toLocaleString('en-US');
}

const SCENARIOS = [
  { id: 'keepAndRefi', label: 'Keep & refi' },
  { id: 'sellNow', label: 'Sell now' },
  { id: 'deferredSale', label: 'Deferred sale' },
];

// Mirrors §9.8.4 canonical spec text. Intentionally duplicated per mobile-isolation
// decision (avoids coupling to / refactoring HomeDecisionComparator.jsx whose
// constants are module-private).
const OPENING_LINE = {
  keepAndRefi:
    'In the Keep & refi scenario, you retain the home and pay your spouse a buyout funded through cash-out refinancing.',
  sellNow:
    "In the Sell-now scenario, the home is sold during divorce and equity is split per the settlement. New-housing costs are not modeled in v1's projection.",
  deferredSale:
    "In the Deferred-sale scenario, you remain in the home with the kids until the trigger event (typically the youngest's high-school graduation), at which point the home sells and equity splits per pre-agreed terms.",
};

// Mirrors §9.8.4 canonical spec text. Intentionally duplicated per mobile-isolation decision.
const SELLNOW_CASHFLOW_FOOTNOTE =
  'Sell-now liquid cash does not include post-sale cashflow accumulation in v1. Modeling cashflow after sale would require assumptions about new-housing costs that vary widely across user situations; adding post-sale income without subtracting new-housing expense would overstate liquidity. Compare 3/6/10-year liquid cash across scenarios as a relative position, not as a forecast of absolute account balances.';

// Mirrors §9.8.5 shortfall copy. Intentionally duplicated per mobile-isolation decision.
const SHORTFALL_COPY =
  'Cash-out refi cannot fund the full buyout — gap must come from other sources, discuss with your CDFA.';

// Mirrors §9.8.5 underwater prefix builder. Intentionally duplicated per mobile-isolation decision.
function underwaterPrefix(fmv, mtg) {
  return `Note: your home is currently underwater (FMV ${fmtUSD(fmv)} < mortgage ${fmtUSD(mtg)}). This scenario's calculations remain meaningful and may be your primary path.`;
}

// Mirrors §9.8.5 PMI narrative builder. Intentionally duplicated per mobile-isolation decision.
function pmiNarrative(kr) {
  const y = kr?.metadata?.projectedPmiDropYear;
  if (y == null) return null;
  return `Based on your loan terms and real appreciation assumption (default 0%), PMI is projected to drop in year ${y} under HPA auto-cancellation at 78% scheduled LTV. If your home appreciates faster, you can request borrower-initiated cancellation at scheduled 80% LTV — typically 1–2 years earlier.`;
}

// Mirrors §9.8.5 MFJ footnote builder. Intentionally duplicated per mobile-isolation decision.
function mfjFootnote(ds) {
  const diff = ds?.metadata?.mfjSingleDifferentialAtSaleYear;
  if (diff == null || diff <= 0) return null;
  return `If you expect to be remarried and filing jointly at sale, §121 exclusion may be up to $500k subject to the new spouse’s 2+ year use of this home. Deferred-sale value could be up to ${fmtUSD(diff)} higher than shown — discuss with your CDFA.`;
}

// Mirrors §9.8.6 cross-scenario summary paragraphs. Intentionally duplicated per mobile-isolation decision.
const CROSS_SCENARIO = {
  oppCost:
    "If you're weighing whether to invest the equity instead of holding the home, compare the 3/6/10-year liquid-cash positions across scenarios — that's what's available to redirect. Higher liquid cash at horizon means more capital available for non-housing investment; lower means more wealth is tied to home equity (which carries different risk and access characteristics).",
  realDollar:
    'All figures are in real dollars (today’s dollar terms; inflation neutralized). Cross-scenario comparisons are apples-to-apples.',
  saleTiming:
    "Sell-now liquid cash at the 3-year horizon includes the equity from the year-0 sale event. Deferred-sale liquid cash at a horizon before the trigger year does not include sale proceeds — the home hasn't been sold yet at that point.",
  brokerage:
    'Liquid cash projections include any non-retirement brokerage at face value. Selling brokerage to access the cash would trigger capital-gains tax that reduces the realizable amount; this drag is not modeled in v1. If you expect to liquidate brokerage to fund post-divorce expenses, your effective liquid cash is somewhat lower than shown — discuss with your CDFA.',
  retirement:
    'Retirement accounts (401(k), 403(b), IRA, Roth) are excluded from liquid cash regardless of your age. If you’re age 59½ or older, retirement is accessible without the 10% early-withdrawal penalty (though ordinary income tax may still apply for traditional accounts) — discuss with your CDFA and tax advisor about how your retirement balance might factor into your overall liquidity picture.',
  strictComparator:
    'HDA presents three scenarios with factual outputs and binding-constraint-scoped narrative. It does not recommend a scenario or rank them. Scenario selection is a CDFA-and-user decision; this tool exists to make that decision well-grounded — not to make it for you.',
};

// Mirrors §9.8.4 disclaimer notes (fixed order). Intentionally duplicated per mobile-isolation decision.
const DISCLAIMERS = [
  'LTV calculation uses your FMV estimate. For high-stakes scenarios — close-to-threshold qualification, buyout near the LTV cap — an appraisal may produce a different value with material impact on the verdict.',
  'Refi qualification assumes a 30-year conventional fixed-rate product. FHA, VA, and portfolio-loan products have different qualification matrices, LTV caps, and PMI/MIP structures; not modeled in v1.',
  'PMI rates assume borrower-paid PMI (BPMI), which is cancellable per HPA. Lender-paid PMI (LPMI) — sometimes offered as a lower-rate alternative — rolls the PMI cost into the rate and is not cancellable; not modeled in v1.',
  'HDA outputs are indicative, computed from standard heuristics across DTI, LTV, credit, §121, and projection assumptions. Actual lender decisions, tax outcomes, and market conditions vary. Confirm with a CDFA, mortgage professional, and tax advisor before using these outputs for settlement negotiation.',
];

const HORIZON_LABELS = ['3-year', '6-year', '10-year'];

function buildNarrativeLines({ id, scenario, scenarios, inputs }) {
  if (!scenario) return [];
  const lines = [];
  lines.push(OPENING_LINE[id]);
  if (id === 'sellNow') lines.push(SELLNOW_CASHFLOW_FOOTNOTE);
  (scenario?.callouts ?? []).forEach((c) => {
    if (typeof c === 'string') lines.push(c);
    else if (c && typeof c === 'object' && c.message) lines.push(c.message);
  });
  if (id === 'keepAndRefi') {
    const pmi = pmiNarrative(scenario);
    if (pmi) lines.push(pmi);
  }
  if (id === 'deferredSale') {
    const mfj = mfjFootnote(scenario);
    if (mfj) lines.push(mfj);
  }
  // Underwater prefix on sell-now + deferred-sale; NOT on keep-and-refi
  if (
    scenarios?.keepAndRefi?.refiQualification?.bindingConstraint === 'underwater' &&
    (id === 'sellNow' || id === 'deferredSale')
  ) {
    lines.unshift(underwaterPrefix(inputs?.currentFMV, inputs?.existingMortgageBalance));
  }
  return lines;
}

export default function HomeDecisionScenarioCarousel({
  inputs,
  scenarios,
  userSelection,
  onSelectScenario,
  onSave,
  saveState,
  onInputChange,
}) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const pageRefs = [useRef(null), useRef(null), useRef(null)];
  const trackRef = useRef(null);

  if (!scenarios) return null;

  const goTo = (idx) => {
    const clamped = Math.max(0, Math.min(2, idx));
    setCurrentIndex(clamped);
    const ref = pageRefs[clamped];
    if (ref?.current?.scrollIntoView) {
      ref.current.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'start' });
    }
  };

  const tableCellStyle = {
    padding: '8px 6px',
    fontSize: 13,
    color: T.NAVY,
    overflow: 'hidden',
    wordBreak: 'break-word',
  };

  const tableHeaderStyle = {
    ...tableCellStyle,
    fontFamily: T.FONT_BODY,
    fontWeight: 700,
    fontSize: 11,
    color: T.NAVY_55,
    textTransform: 'uppercase',
    letterSpacing: '0.04em',
    borderBottom: `2px solid ${T.NAVY_12}`,
  };

  return (
    <div
      data-testid="hda-mobile-carousel"
      style={{
        fontFamily: T.FONT_BODY,
        color: T.NAVY,
      }}
    >
      {/* Accessible paging controls */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: 8,
          padding: '0 4px',
        }}
      >
        <button
          type="button"
          data-testid="hda-carousel-prev"
          disabled={currentIndex === 0}
          onClick={() => goTo(currentIndex - 1)}
          style={{
            padding: '6px 14px',
            background: currentIndex === 0 ? T.NAVY_06 : T.NAVY,
            color: currentIndex === 0 ? T.NAVY_38 : T.PARCHMENT,
            border: 'none',
            borderRadius: 6,
            fontSize: 13,
            fontFamily: T.FONT_BODY,
            cursor: currentIndex === 0 ? 'default' : 'pointer',
          }}
          aria-label="Previous scenario"
        >
          ‹ Prev
        </button>

        {/* Dot indicators */}
        <div style={{ display: 'flex', gap: 8 }}>
          {SCENARIOS.map(({ id, label }, i) => (
            <button
              key={id}
              type="button"
              data-testid={`hda-carousel-dot-${id}`}
              aria-current={currentIndex === i}
              aria-label={`Go to ${label}`}
              onClick={() => goTo(i)}
              style={{
                background: 'none',
                border: 'none',
                padding: 0,
                cursor: 'pointer',
                display: 'inline-block',
                width: 10,
                height: 10,
                borderRadius: '50%',
                backgroundColor: currentIndex === i ? T.GOLD : T.NAVY_12,
                outline: `1px solid ${currentIndex === i ? T.GOLD : T.NAVY_38}`,
              }}
            />
          ))}
        </div>

        <button
          type="button"
          data-testid="hda-carousel-next"
          disabled={currentIndex === 2}
          onClick={() => goTo(currentIndex + 1)}
          style={{
            padding: '6px 14px',
            background: currentIndex === 2 ? T.NAVY_06 : T.NAVY,
            color: currentIndex === 2 ? T.NAVY_38 : T.PARCHMENT,
            border: 'none',
            borderRadius: 6,
            fontSize: 13,
            fontFamily: T.FONT_BODY,
            cursor: currentIndex === 2 ? 'default' : 'pointer',
          }}
          aria-label="Next scenario"
        >
          Next ›
        </button>
      </div>

      {/* Swipeable track — the ONLY element in this file with overflowX:'auto' (TC-HDA-9) */}
      <div
        ref={trackRef}
        data-testid="hda-carousel-track"
        style={{
          display: 'flex',
          overflowX: 'auto',
          scrollSnapType: 'x mandatory',
          WebkitOverflowScrolling: 'touch',
        }}
      >
        {SCENARIOS.map(({ id, label }, pageIdx) => {
          const scenario = scenarios[id];
          const narrativeLines = buildNarrativeLines({ id, scenario, scenarios, inputs });
          const isSelected = userSelection === id;

          return (
            <section
              key={id}
              ref={pageRefs[pageIdx]}
              data-testid={`hda-carousel-page-${id}`}
              style={{
                flex: '0 0 100%',
                scrollSnapAlign: 'start',
                boxSizing: 'border-box',
                padding: '16px 12px',
                background: T.PARCHMENT,
                borderRadius: 8,
                border: `1px solid ${T.NAVY_12}`,
              }}
            >
              {/* 1. Scenario name + verdict badge (Keep&refi only) */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  flexWrap: 'wrap',
                  gap: 8,
                  marginBottom: 12,
                }}
              >
                <h3
                  style={{
                    margin: 0,
                    fontFamily: T.FONT_DISPLAY,
                    fontSize: '1.05rem',
                    fontWeight: 600,
                    color: T.NAVY,
                  }}
                >
                  {label}
                </h3>
                {id === 'keepAndRefi' && (
                  <HomeDecisionVerdictBadge
                    verdictTier={scenarios.keepAndRefi?.refiQualification?.verdictTier}
                    bindingConstraint={scenarios.keepAndRefi?.refiQualification?.bindingConstraint}
                  />
                )}
              </div>

              {/* 2. Shortfall banner (Keep&refi only) */}
              {id === 'keepAndRefi' && scenarios.keepAndRefi?.feasibility?.shortfall && (
                <div
                  data-testid="hda-mobile-shortfall-banner"
                  style={{
                    marginBottom: 12,
                    padding: '10px 14px',
                    background: T.CARD,
                    borderLeft: `4px solid ${T.GOLD}`,
                    borderRadius: 6,
                    fontSize: 13,
                    lineHeight: 1.55,
                    color: T.NAVY,
                  }}
                >
                  {SHORTFALL_COPY}
                </div>
              )}

              {/* 3. Per-horizon table (3/6/10-yr × netWealth/liquidCash) */}
              <table
                data-testid={`hda-carousel-table-${id}`}
                style={{
                  width: '100%',
                  tableLayout: 'fixed',
                  borderCollapse: 'collapse',
                  marginBottom: 14,
                }}
              >
                <thead>
                  <tr>
                    <th style={{ ...tableHeaderStyle, textAlign: 'left', width: '34%' }}>Horizon</th>
                    <th style={{ ...tableHeaderStyle, textAlign: 'right', width: '33%' }}>Net wealth</th>
                    <th style={{ ...tableHeaderStyle, textAlign: 'right', width: '33%' }}>Liquid cash</th>
                  </tr>
                </thead>
                <tbody>
                  {(scenario?.horizons ?? []).map((h, rowIdx) => (
                    <tr key={h.year} style={{ borderTop: `1px solid ${T.NAVY_12}` }}>
                      <td
                        style={{
                          ...tableCellStyle,
                          fontWeight: 600,
                          textAlign: 'left',
                        }}
                      >
                        {HORIZON_LABELS[rowIdx] ?? `${h.year}-year`}
                      </td>
                      <td
                        style={{
                          ...tableCellStyle,
                          ...T.NUMERIC_STYLE,
                          textAlign: 'right',
                        }}
                      >
                        {fmtUSD(h.netWealth)}
                      </td>
                      <td
                        style={{
                          ...tableCellStyle,
                          ...T.NUMERIC_STYLE,
                          textAlign: 'right',
                        }}
                      >
                        {fmtUSD(h.liquidCash)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* 4. Per-scenario narrative */}
              <div
                data-testid={`hda-carousel-narrative-${id}`}
                style={{ marginBottom: 14 }}
              >
                {narrativeLines.map((ln, i) => (
                  <p
                    key={i}
                    style={{
                      margin: i === 0 ? 0 : '10px 0 0',
                      fontSize: 13,
                      lineHeight: 1.55,
                      color: T.NAVY,
                    }}
                  >
                    {ln}
                  </p>
                ))}
              </div>

              {/* 5. Deferred-sale only: stress-test toggle (§9.4.5 / §9.8.2) */}
              {id === 'deferredSale' && (
                <label
                  style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: 8,
                    fontSize: 13,
                    color: T.NAVY,
                    marginBottom: 14,
                    cursor: 'pointer',
                  }}
                >
                  <input
                    type="checkbox"
                    data-testid="hda-mobile-stress-toggle"
                    checked={!!inputs?.stressTestUserPays100Pct}
                    onChange={(e) => onInputChange('stressTestUserPays100Pct', e.target.checked)}
                    style={{ marginTop: 2 }}
                  />
                  Stress-test: assume I pay 100% of interim costs
                </label>
              )}

              {/* 6. Per-page Select CTA */}
              <button
                type="button"
                data-testid={`hda-carousel-select-${id}`}
                onClick={() => onSelectScenario(isSelected ? null : id)}
                style={{
                  width: '100%',
                  padding: '10px 16px',
                  background: isSelected ? T.PARCHMENT_DEEP : T.NAVY,
                  color: isSelected ? T.NAVY : T.PARCHMENT,
                  border: isSelected ? `2px solid ${T.GOLD}` : 'none',
                  borderRadius: 6,
                  fontFamily: T.FONT_BODY,
                  fontSize: 14,
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                {isSelected ? 'Selected ✓' : 'Select this scenario'}
              </button>
            </section>
          );
        })}
      </div>

      {/* Cross-scenario summary (below track) */}
      <section
        data-testid="hda-mobile-cross-scenario-summary"
        style={{
          marginTop: 20,
          padding: '16px',
          background: T.CARD,
          border: `1px solid ${T.NAVY_12}`,
          borderRadius: 8,
        }}
      >
        {[
          CROSS_SCENARIO.oppCost,
          CROSS_SCENARIO.realDollar,
          CROSS_SCENARIO.saleTiming,
          CROSS_SCENARIO.brokerage,
          CROSS_SCENARIO.retirement,
        ].map((c, i) => (
          <p
            key={i}
            style={{
              margin: i === 0 ? 0 : '10px 0 0',
              fontSize: 13,
              lineHeight: 1.55,
              color: T.NAVY_70,
            }}
          >
            {c}
          </p>
        ))}
        <p
          data-testid="hda-mobile-strict-comparator-line"
          style={{
            margin: '14px 0 0',
            fontSize: 13,
            lineHeight: 1.55,
            fontWeight: 600,
            color: T.NAVY,
          }}
        >
          {CROSS_SCENARIO.strictComparator}
        </p>
      </section>

      {/* Disclaimer block */}
      <section
        data-testid="hda-mobile-disclaimer-block"
        style={{
          marginTop: 16,
          padding: '14px 16px',
          background: T.PARCHMENT_DEEP,
          borderRadius: 8,
        }}
      >
        {DISCLAIMERS.map((d, i) => (
          <p
            key={i}
            style={{
              margin: i === 0 ? 0 : '8px 0 0',
              fontSize: 12,
              lineHeight: 1.5,
              color: T.NAVY_70,
            }}
          >
            {d}
          </p>
        ))}
      </section>

      {/* Action surface */}
      <div style={{ marginTop: 16, display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
        <button
          type="button"
          data-testid="hda-mobile-save-button"
          onClick={onSave}
          style={{
            padding: '12px 22px',
            background: T.NAVY,
            color: T.PARCHMENT,
            border: 'none',
            borderRadius: 6,
            fontFamily: T.FONT_BODY,
            fontSize: 15,
            fontWeight: 600,
            cursor: 'pointer',
          }}
        >
          Save selection to Blueprint
        </button>
        {saveState?.status && (
          <span
            data-testid="hda-mobile-save-confirmation"
            style={{ fontSize: 13, color: T.GREEN, fontWeight: 600 }}
          >
            Saved (
            {saveState.status === 'complete'
              ? 'selection recorded'
              : 'comparator only — no scenario selected'}
            )
          </span>
        )}
      </div>
    </div>
  );
}
