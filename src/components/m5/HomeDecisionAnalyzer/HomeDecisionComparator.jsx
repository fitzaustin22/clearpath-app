'use client';

import { T } from '@/src/lib/brand/tokens';
import HomeDecisionInputs from './HomeDecisionInputs.jsx';
import HomeDecisionVerdictBadge from './HomeDecisionVerdictBadge.jsx';
import HomeDecisionBindingConstraintMini from './HomeDecisionBindingConstraintMini.jsx';

/**
 * §9.8.1 — desktop hierarchical comparator layout. Presentational composite:
 * the parent (HomeDecisionAnalyzer) owns the m5Store read, calc, and Save →
 * blueprint orchestration; this component renders and raises intent via
 * callbacks.
 *
 * Element coverage vs §9.8.1:
 *   1–2  Shared inputs + per-scenario accordion  → <HomeDecisionInputs/>
 *   3    Projection grid (3 scenarios × horizons) + verdict badge & shortfall banner on Keep&refi
 *   4    Per-scenario callouts & narrative (column order, stacked, no truncation)
 *   6    Binding-constraint mini-section          → <HomeDecisionBindingConstraintMini/>
 *   7    Cross-scenario summary (opp-cost, real-dollar, timing, strict-comparator)
 *   7a   Selection: column-header click (toggle off / transfer, last-click wins)
 *   8    Disclaimer block (§9.8.4 four notes, fixed order)
 *   9    Action surface: Save selection to Blueprint
 *
 * @param {object}   props
 * @param {object}   props.inputs            m5Store.homeDecision.inputs
 * @param {Function} props.onInputChange     (field, value) => void
 * @param {object|null} props.scenarios      { keepAndRefi, sellNow, deferredSale } | null (pre-calc)
 * @param {string|null} props.userSelection  'keepAndRefi'|'sellNow'|'deferredSale'|null
 * @param {Function} props.onSelectScenario  (idOrNull) => void
 * @param {Function} props.onSave            () => void
 * @param {{status:'partial'|'complete'}|null} [props.saveState]
 */

const SCENARIOS = [
  { id: 'keepAndRefi', label: 'Keep & refinance' },
  { id: 'sellNow', label: 'Sell now' },
  { id: 'deferredSale', label: 'Deferred sale' },
];

const OPENING_LINE = {
  keepAndRefi:
    'In the Keep & refi scenario, you retain the home and pay your spouse a buyout funded through cash-out refinancing.',
  sellNow:
    "In the Sell-now scenario, the home is sold during divorce and equity is split per the settlement. New-housing costs are not modeled in v1's projection.",
  deferredSale:
    "In the Deferred-sale scenario, you remain in the home with the kids until the trigger event (typically the youngest's high-school graduation), at which point the home sells and equity splits per pre-agreed terms.",
};

const SELLNOW_CASHFLOW_FOOTNOTE =
  'Sell-now liquid cash does not include post-sale cashflow accumulation in v1. Modeling cashflow after sale would require assumptions about new-housing costs that vary widely across user situations; adding post-sale income without subtracting new-housing expense would overstate liquidity. Compare 3/6/10-year liquid cash across scenarios as a relative position, not as a forecast of absolute account balances.';

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

const DISCLAIMERS = [
  'LTV calculation uses your FMV estimate. For high-stakes scenarios — close-to-threshold qualification, buyout near the LTV cap — an appraisal may produce a different value with material impact on the verdict.',
  'Refi qualification assumes a 30-year conventional fixed-rate product. FHA, VA, and portfolio-loan products have different qualification matrices, LTV caps, and PMI/MIP structures; not modeled in v1.',
  'PMI rates assume borrower-paid PMI (BPMI), which is cancellable per HPA. Lender-paid PMI (LPMI) — sometimes offered as a lower-rate alternative — rolls the PMI cost into the rate and is not cancellable; not modeled in v1.',
  'HDA outputs are indicative, computed from standard heuristics across DTI, LTV, credit, §121, and projection assumptions. Actual lender decisions, tax outcomes, and market conditions vary. Confirm with a CDFA, mortgage professional, and tax advisor before using these outputs for settlement negotiation.',
];

function fmtUSD(n) {
  if (n == null || !Number.isFinite(n)) return '—';
  const rounded = Math.round(n);
  const sign = rounded < 0 ? '-' : '';
  return `${sign}$${Math.abs(rounded).toLocaleString('en-US')}`;
}

function underwaterPrefixCopy(currentFMV, existingMortgageBalance) {
  return `Note: your home is currently underwater (FMV ${fmtUSD(currentFMV)} < mortgage ${fmtUSD(existingMortgageBalance)}). This scenario's calculations remain meaningful and may be your primary path.`;
}

function pmiNarrative(kr) {
  const y = kr?.metadata?.projectedPmiDropYear;
  if (y == null) return null;
  return `Based on your loan terms and real appreciation assumption (default 0%), PMI is projected to drop in year ${y} under HPA auto-cancellation at 78% scheduled LTV. If your home appreciates faster, you can request borrower-initiated cancellation at scheduled 80% LTV — typically 1–2 years earlier.`;
}

function mfjFootnote(ds) {
  const diff = ds?.metadata?.mfjSingleDifferentialAtSaleYear;
  if (diff == null || diff <= 0) return null;
  return `If you expect to be remarried and filing jointly at sale, §121 exclusion may be up to $500k subject to the new spouse's 2+ year use of this home. Deferred-sale value could be up to ${fmtUSD(diff)} higher than shown — discuss with your CDFA.`;
}

function ScenarioNarrative({ id, scenario, underwaterPrefix }) {
  if (!scenario) return null;
  const lines = [];
  lines.push(OPENING_LINE[id]);
  if (id === 'sellNow') lines.push(SELLNOW_CASHFLOW_FOOTNOTE);
  (scenario.callouts ?? []).forEach((c) => {
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

  if (underwaterPrefix && (id === 'sellNow' || id === 'deferredSale')) {
    lines.unshift(underwaterPrefix);
  }

  return (
    <section
      data-testid={`hda-narrative-${id}`}
      style={{
        marginBottom: 16,
        padding: '14px 18px',
        background: T.PARCHMENT,
        border: `1px solid ${T.NAVY_12}`,
        borderRadius: 6,
      }}
    >
      <h4
        style={{
          margin: '0 0 8px',
          fontFamily: T.FONT_DISPLAY,
          fontSize: '0.95rem',
          fontWeight: 500,
          color: T.NAVY,
        }}
      >
        {SCENARIOS.find((s) => s.id === id)?.label}
      </h4>
      {/* No collapsing, no priority truncation — all firing narrative stacked
          with reduced inter-line spacing per §9.8.1 el.4. */}
      {lines.map((ln, i) => (
        <p
          key={i}
          style={{
            margin: i === 0 ? 0 : '10px 0 0',
            fontSize: 14,
            lineHeight: 1.55,
            color: T.NAVY,
          }}
        >
          {ln}
        </p>
      ))}
    </section>
  );
}

export default function HomeDecisionComparator({
  inputs,
  onInputChange,
  scenarios,
  userSelection,
  onSelectScenario,
  onSave,
  saveState = null,
}) {
  const handleSelect = (id) =>
    onSelectScenario(userSelection === id ? null : id);

  const horizons = scenarios?.keepAndRefi?.horizons ?? null;

  const isUnderwater =
    scenarios?.keepAndRefi?.refiQualification?.bindingConstraint === 'underwater';
  const underwaterPrefix = isUnderwater
    ? underwaterPrefixCopy(inputs?.currentFMV, inputs?.existingMortgageBalance)
    : null;

  return (
    <div
      data-testid="hda-comparator"
      style={{
        fontFamily: T.FONT_BODY,
        color: T.NAVY,
        background: T.PARCHMENT,
        padding: '1.5rem',
        borderRadius: 8,
      }}
    >
      {/* §9.8.1 el.1–2 */}
      <HomeDecisionInputs inputs={inputs} onChange={onInputChange} />

      {/* §9.8.1 el.3 — projection grid */}
      {!scenarios || !horizons ? (
        <div
          data-testid="hda-grid-placeholder"
          style={{
            marginTop: 16,
            padding: '16px 18px',
            background: T.CARD,
            border: `1px dashed ${T.NAVY_12}`,
            borderRadius: 8,
            color: T.NAVY_55,
            fontSize: 14,
          }}
        >
          Enter the shared inputs above to see the three-scenario comparison.
        </div>
      ) : (
        <>
          {/* §9.2.1 / §9.8.1 el.3 — shortfall banner (Keep & refi only) */}
          {scenarios.keepAndRefi?.feasibility?.shortfall && (
            <div
              data-testid="hda-shortfall-banner"
              style={{
                marginTop: 8,
                marginBottom: 4,
                padding: '12px 16px',
                background: T.CARD,
                borderLeft: `4px solid ${T.GOLD}`,
                borderRadius: 6,
              }}
            >
              <p
                style={{
                  margin: '0 0 4px',
                  fontFamily: T.FONT_DISPLAY,
                  fontSize: '0.85rem',
                  fontWeight: 600,
                  color: T.NAVY,
                }}
              >
                Keep &amp; refinance
              </p>
              <p
                style={{
                  margin: 0,
                  fontSize: 14,
                  lineHeight: 1.55,
                  color: T.NAVY,
                }}
              >
                Cash-out refi cannot fund the full buyout — gap must come from other sources, discuss with your CDFA.
              </p>
            </div>
          )}
          <div style={{ overflowX: 'auto', marginTop: 8 }}>
            <table
              data-testid="hda-projection-grid"
              style={{
                width: '100%',
                borderCollapse: 'separate',
                borderSpacing: 0,
                tableLayout: 'fixed',
              }}
            >
              <thead>
                <tr>
                  <th style={{ width: 120, textAlign: 'left', padding: 8 }} />
                  {SCENARIOS.map(({ id, label }) => {
                    const selected = userSelection === id;
                    return (
                      <th key={id} style={{ padding: 0, verticalAlign: 'top' }}>
                        <button
                          type="button"
                          data-testid={`hda-col-${id}`}
                          data-selected={selected ? 'true' : 'false'}
                          aria-pressed={selected}
                          onClick={() => handleSelect(id)}
                          style={{
                            width: '100%',
                            padding: '12px 10px',
                            cursor: 'pointer',
                            background: selected ? T.PARCHMENT_DEEP : T.CARD,
                            border: selected
                              ? `3px solid ${T.GOLD}`
                              : `1px solid ${T.NAVY_12}`,
                            borderRadius: 8,
                            fontFamily: T.FONT_DISPLAY,
                            fontSize: '0.95rem',
                            fontWeight: 600,
                            color: T.NAVY,
                          }}
                        >
                          <div>{label}</div>
                          {selected && (
                            <div
                              data-testid={`hda-selected-badge-${id}`}
                              style={{
                                marginTop: 4,
                                fontFamily: T.FONT_BODY,
                                fontSize: 12,
                                fontWeight: 700,
                                color: T.GOLD,
                              }}
                            >
                              ✓ Selected
                            </div>
                          )}
                        </button>
                      </th>
                    );
                  })}
                </tr>
                <tr>
                  <td style={{ padding: '8px' }} />
                  <td style={{ padding: '8px', textAlign: 'center' }}>
                    <HomeDecisionVerdictBadge
                      verdictTier={scenarios.keepAndRefi?.refiQualification?.verdictTier}
                      bindingConstraint={
                        scenarios.keepAndRefi?.refiQualification?.bindingConstraint
                      }
                    />
                  </td>
                  <td style={{ padding: '8px', textAlign: 'center', color: T.NAVY_55 }}>
                    —
                  </td>
                  <td style={{ padding: '8px', textAlign: 'center', color: T.NAVY_55 }}>
                    —
                  </td>
                </tr>
              </thead>
              <tbody>
                {horizons.map((h, rowIdx) => (
                  <tr key={h.year} data-testid={`hda-horizon-row-${h.year}`}>
                    <th
                      scope="row"
                      style={{
                        textAlign: 'left',
                        padding: 12,
                        fontFamily: T.FONT_BODY,
                        fontSize: 14,
                        fontWeight: 700,
                        color: T.NAVY,
                      }}
                    >
                      {h.year}-year
                    </th>
                    {SCENARIOS.map(({ id }) => {
                      const cell = scenarios[id]?.horizons?.[rowIdx];
                      const selected = userSelection === id;
                      return (
                        <td
                          key={id}
                          data-testid={`hda-cell-${id}-${h.year}`}
                          style={{
                            padding: 12,
                            textAlign: 'center',
                            background: selected ? T.PARCHMENT_DEEP : 'transparent',
                            borderLeft: selected ? `3px solid ${T.GOLD}` : 'none',
                            borderRight: selected ? `3px solid ${T.GOLD}` : 'none',
                          }}
                        >
                          <div style={{ ...T.NUMERIC_STYLE, fontSize: 15, color: T.NAVY }}>
                            {fmtUSD(cell?.netWealth)}
                          </div>
                          <div style={{ fontSize: 12, color: T.NAVY_55, marginTop: 2 }}>
                            net wealth
                          </div>
                          <div
                            style={{
                              ...T.NUMERIC_STYLE,
                              fontSize: 15,
                              color: T.NAVY,
                              marginTop: 8,
                            }}
                          >
                            {fmtUSD(cell?.liquidCash)}
                          </div>
                          <div style={{ fontSize: 12, color: T.NAVY_55, marginTop: 2 }}>
                            liquid cash
                          </div>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* §9.8.1 el.4 — per-scenario callouts & narrative, column order */}
          <div style={{ marginTop: 20 }}>
            {SCENARIOS.map(({ id }) => (
              <ScenarioNarrative key={id} id={id} scenario={scenarios[id]} underwaterPrefix={underwaterPrefix} />
            ))}
          </div>

          {/* §9.8.1 el.6 — binding-constraint mini (Keep & refi) */}
          <HomeDecisionBindingConstraintMini
            verdictTier={scenarios.keepAndRefi?.refiQualification?.verdictTier}
            bindingConstraint={
              scenarios.keepAndRefi?.refiQualification?.bindingConstraint
            }
            narrative={scenarios.keepAndRefi?.refiQualification?.narrative}
          />

          {/* §9.8.1 el.7 — cross-scenario summary */}
          <section
            data-testid="hda-cross-scenario-summary"
            style={{
              marginTop: 20,
              padding: '16px 18px',
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
              data-testid="hda-strict-comparator-line"
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
        </>
      )}

      {/* §9.8.1 el.8 — disclaimer block (fixed order, always visible) */}
      <section
        data-testid="hda-disclaimer-block"
        style={{
          marginTop: 20,
          padding: '14px 18px',
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

      {/* §9.8.1 el.9 — action surface */}
      <div style={{ marginTop: 20, display: 'flex', alignItems: 'center', gap: 14 }}>
        <button
          type="button"
          data-testid="hda-save-button"
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
            data-testid="hda-save-confirmation"
            style={{ fontSize: 13, color: T.GREEN, fontWeight: 600 }}
          >
            Saved ({saveState.status === 'complete' ? 'selection recorded' : 'comparator only — no scenario selected'})
          </span>
        )}
      </div>
    </div>
  );
}
