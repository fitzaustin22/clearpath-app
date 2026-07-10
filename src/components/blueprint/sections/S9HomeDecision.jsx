'use client';

/**
 * §9 — Marital Home Decision. Consumes the REAL shape `updateHomeDecision`
 * persists (blueprintStore.js): { scenarios: ScenarioOutput[3] (ordered
 * [keepAndRefi, sellNow, deferredSale] per §10.6), userSelection, metadata }.
 *
 * HDA correctness fix PR1: this replaces a stale renderer that read keys
 * (recommendation, homeValue, equity, monthlyCost, affordabilityRatio) which
 * never existed in the real payload and rendered blank regardless of data.
 * Only reachable via HomeDecisionAnalyzer's Save action, which is itself
 * gated on hasGenuineHomeData (src/lib/homeDecision/hasGenuineHomeData.js) —
 * this renderer cannot see an empty/coerced-$0 scenario set today.
 *
 * "SELECTED SCENARIO" / neutral comparator framing (not "RECOMMENDATION"):
 * HDA's own disclaimer block is explicit that it "does not recommend a
 * scenario or rank them" (HomeDecisionComparator.jsx CROSS_SCENARIO.
 * strictComparator) — the old renderer's "RECOMMENDATION" label
 * contradicted that stance, so this one doesn't reintroduce it.
 */

const NAVY = '#1B2A4A';
const GOLD = '#C8A96E';
const RED = '#C0392B';
const SANS = "var(--font-source-sans), 'Source Sans 3', sans-serif";

const SCENARIO_ORDER = ['keepAndRefi', 'sellNow', 'deferredSale'];
const SCENARIO_LABELS = {
  keepAndRefi: 'Keep & Refinance',
  sellNow: 'Sell Now',
  deferredSale: 'Deferred Sale',
};
// Mid-horizon per §9.7 (3y ≈ alimony period, 6y ≈ post-alimony settling-in,
// 10y ≈ long horizon) — 6y is the representative single-line summary figure;
// the full 3/6/10 breakdown lives in the interactive tool, not the Blueprint.
const SUMMARY_HORIZON_YEAR = 6;

const currency = (n) =>
  Number.isFinite(n)
    ? n.toLocaleString('en-US', {
        style: 'currency',
        currency: 'USD',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
      })
    : '—';

const labelStyle = {
  fontFamily: SANS,
  fontWeight: 400,
  fontSize: 13,
  color: 'rgba(27,42,74,0.5)',
  textTransform: 'uppercase',
  letterSpacing: '0.05em',
};

const bodyStyle = {
  fontFamily: SANS,
  fontWeight: 400,
  fontSize: 16,
  color: 'rgba(27,42,74,0.8)',
};

const subStyle = {
  fontFamily: SANS,
  fontWeight: 400,
  fontSize: 14,
  color: 'rgba(27,42,74,0.6)',
};

const noteStyle = {
  fontFamily: SANS,
  fontWeight: 400,
  fontSize: 14,
  color: 'rgba(27,42,74,0.5)',
  fontStyle: 'italic',
};

const keyFigureStyle = (color = NAVY) => ({
  fontFamily: SANS,
  fontWeight: 600,
  fontSize: 28,
  color,
  lineHeight: 1.1,
});

function scenariosById(scenarios) {
  if (!Array.isArray(scenarios)) return {};
  return Object.fromEntries(SCENARIO_ORDER.map((id, i) => [id, scenarios[i]]));
}

function horizonAt(scenario, year = SUMMARY_HORIZON_YEAR) {
  return scenario?.horizons?.find((h) => h.year === year) ?? null;
}

export default function S9HomeDecision({ data }) {
  if (!data || !Array.isArray(data.scenarios)) return null;

  const byId = scenariosById(data.scenarios);
  const selectedId = data.userSelection;
  const selected = selectedId ? byId[selectedId] : null;
  const selectedHorizon = selected ? horizonAt(selected) : null;
  const selectedShortfall =
    selectedId === 'keepAndRefi' && selected?.feasibility?.shortfall === true;

  return (
    <div data-testid="s9-home-decision">
      {selected ? (
        <>
          <div style={labelStyle}>SELECTED SCENARIO</div>
          <div style={{ ...keyFigureStyle(GOLD), marginTop: 4 }}>
            {SCENARIO_LABELS[selectedId]}
          </div>
          {selectedHorizon && (
            <div style={{ marginTop: 8 }}>
              <div style={bodyStyle}>
                {SUMMARY_HORIZON_YEAR}-year net wealth: {currency(selectedHorizon.netWealth)}
              </div>
              <div style={subStyle}>
                {SUMMARY_HORIZON_YEAR}-year liquid cash: {currency(selectedHorizon.liquidCash)}
              </div>
            </div>
          )}
        </>
      ) : (
        <div style={labelStyle}>HOME DECISION — COMPARATOR (NO SCENARIO SELECTED YET)</div>
      )}

      <div style={{ marginTop: 20 }}>
        {SCENARIO_ORDER.map((id) => {
          const scenario = byId[id];
          const horizon = horizonAt(scenario);
          if (!scenario || !horizon) return null;
          const isSelected = selectedId === id;
          return (
            <div key={id} style={{ marginTop: id === SCENARIO_ORDER[0] ? 0 : 14 }}>
              <div style={{ ...bodyStyle, fontWeight: isSelected ? 700 : 400 }}>
                {SCENARIO_LABELS[id]}
                {isSelected ? ' (selected)' : ''}
              </div>
              <div style={subStyle}>
                {SUMMARY_HORIZON_YEAR}-year net wealth {currency(horizon.netWealth)} · liquid
                cash {currency(horizon.liquidCash)}
              </div>
            </div>
          );
        })}
      </div>

      {selectedShortfall && (
        <div
          style={{
            marginTop: 20,
            padding: 14,
            borderLeft: `3px solid ${RED}`,
            backgroundColor: 'rgba(192,57,43,0.05)',
            color: RED,
            fontFamily: SANS,
            fontWeight: 400,
            fontSize: 14,
          }}
        >
          Cash-out refi cannot fund the full buyout for Keep &amp; Refinance — the gap must
          come from other sources. Discuss with your CDFA.
        </div>
      )}

      <div style={{ ...noteStyle, marginTop: 24 }}>
        Figures are in real (inflation-neutralized) dollars at the {SUMMARY_HORIZON_YEAR}-year
        horizon. This tool presents factual scenario outputs, unranked and unweighted — scenario
        selection is a CDFA-and-you decision. Confirm with your CDFA before using these figures
        for settlement negotiation.
      </div>
    </div>
  );
}
