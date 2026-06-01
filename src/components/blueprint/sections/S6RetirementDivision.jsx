'use client';

import { useState } from 'react';

const NAVY = '#1B2A4A';
const GOLD = '#C8A96E';
const RED = '#C0392B';
const SANS = "var(--font-source-sans), 'Source Sans 3', sans-serif";

const PLAN_TYPE_LABELS = {
  '401k': '401(k)',
  '403b': '403(b)',
  ira: 'IRA',
  pension: 'Pension',
};

function planTypeLabel(key) {
  if (!key) return '—';
  if (PLAN_TYPE_LABELS[key]) return PLAN_TYPE_LABELS[key];
  return key.charAt(0).toUpperCase() + key.slice(1);
}

// QDRO plan-type vocabulary — distinct from the PIT PLAN_TYPE_LABELS above.
// These are the m5Store/qdro `planType` keys (selectQDRODivisionData). A raw
// planType key or asset id must never reach the consumer, so unknown/null
// falls back to a neutral label.
const QDRO_PLAN_TYPE_LABELS = {
  dc: 'Defined contribution',
  ira: 'IRA',
  private_db: 'Private defined benefit',
  gov_civilian: 'Government (civilian)',
  military: 'Military',
  state_municipal: 'State / municipal',
};

function qdroPlanTypeLabel(key) {
  return QDRO_PLAN_TYPE_LABELS[key] || 'Retirement plan';
}

const QDRO_ROLE_LABELS = {
  participant: 'Participant',
  alternatePayee: 'Alternate payee',
  other: 'Other',
};

function qdroRoleLabel(key) {
  if (!key) return '—';
  return QDRO_ROLE_LABELS[key] || key;
}

const COMPLETION_STATE_LABELS = {
  empty: 'Not started',
  partial: 'In progress',
  complete: 'Complete',
};

function completionStateLabel(key) {
  return COMPLETION_STATE_LABELS[key] || 'In progress';
}

const currency = (n) =>
  (n || 0).toLocaleString('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });

const formatPercent = (n) => {
  if (typeof n !== 'number' || Number.isNaN(n)) return '—';
  const value = n > 1 ? n : n * 100;
  return `${value.toFixed(1)}%`;
};

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

const subHeaderStyle = {
  fontFamily: SANS,
  fontWeight: 600,
  fontSize: 16,
  color: NAVY,
};

const keyFigureStyle = (color = NAVY) => ({
  fontFamily: SANS,
  fontWeight: 600,
  fontSize: 28,
  color,
  lineHeight: 1.1,
});

const toggleStyle = {
  fontFamily: SANS,
  fontWeight: 400,
  fontSize: 13,
  color: GOLD,
  background: 'transparent',
  border: 'none',
  padding: 0,
  cursor: 'pointer',
};

const citationStyle = {
  fontFamily: SANS,
  fontWeight: 400,
  fontSize: 12,
  color: 'rgba(27,42,74,0.5)',
  lineHeight: 1.5,
};

function Row({ label, value }) {
  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'baseline',
        padding: '6px 0',
      }}
    >
      <div style={bodyStyle}>{label}</div>
      <div style={bodyStyle}>{value}</div>
    </div>
  );
}

// Shared citation renderer for the PVA citation array and each QDRO asset's
// metadata.citations array — both are string[] (CITATIONS_BY_PATH /
// asset.metadata.citations). Renders nothing when there is nothing to cite.
function Citations({ items }) {
  const list = Array.isArray(items) ? items.filter(Boolean) : [];
  if (list.length === 0) return null;
  return (
    <div style={{ ...citationStyle, marginTop: 12 }}>Citations: {list.join('; ')}</div>
  );
}

export default function S6RetirementDivision({ data, status }) {
  const [showComparison, setShowComparison] = useState(false);
  if (!data) return null;

  // §6 is multi-source: data === { pit, pva, qdro }. Render whichever subset is
  // present — presence-based, NOT gated on `status` (a non-empty `status` with
  // an absent `pit` is exactly the blank-but-complete bug this replaces).
  const pit = data.pit;
  const pva = data.pva;
  const qdro = data.qdro;

  const qdroAssetEntries = qdro && qdro.assets ? Object.entries(qdro.assets) : [];
  const hasPit = !!pit;
  const hasPva = !!pva;
  const hasQdro = qdroAssetEntries.length > 0;

  // All-empty fallback. BlueprintSection owns the graceful 'empty' placeholder,
  // so only surface a neutral in-progress line when the section is non-empty
  // yet carries no renderable slot; otherwise render nothing (don't duplicate
  // the placeholder).
  if (!hasPit && !hasPva && !hasQdro) {
    if (status && status !== 'empty') {
      return (
        <div>
          <p style={bodyStyle}>Retirement division is in progress.</p>
        </div>
      );
    }
    return null;
  }

  // PIT-derived values are read only inside the PIT block; guard so an absent
  // pit slot never dereferences null.
  const pitPercent = pit ? formatPercent(pit.taxDiscountPercent) : null;
  const traditionalPercent = pit ? formatPercent(pit.effectiveTaxRate) : null;
  const overage = pit?.overage || 0;

  // PVA key figure: a coverture path's marital portion when present, else the
  // headline (total) PV.
  const pvaHasMarital = hasPva && pva.maritalPV != null;
  const pvaKeyValue = hasPva ? (pvaHasMarital ? pva.maritalPV : pva.headlinePV) : null;

  return (
    <div>
      {hasPit && (
        <>
          <section>
            <div style={bodyStyle}>Plan: {planTypeLabel(pit.planType)}</div>
            <div style={{ ...labelStyle, marginTop: 16 }}>PLAN BALANCE AT DIVISION</div>
            <div style={{ ...keyFigureStyle(), marginTop: 4 }}>
              {currency(pit.planBalance)}
            </div>
          </section>

          <section style={{ marginTop: 24 }}>
            <Row label="Tax Discount Method" value="Point in Time (Sutherland)" />
            <Row
              label="Tax Discount"
              value={`${pitPercent} (${currency(pit.taxDiscountDollars)})`}
            />
          </section>

          <section style={{ marginTop: 24 }}>
            <div style={labelStyle}>TAX-ADJUSTED PLAN VALUE</div>
            <div style={{ ...keyFigureStyle(GOLD), marginTop: 4 }}>
              {currency(pit.taxAdjustedValue)}
            </div>
          </section>

          <section style={{ marginTop: 32 }}>
            <div
              style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}
            >
              <div style={subHeaderStyle}>Traditional Method Comparison</div>
              <button
                type="button"
                onClick={() => setShowComparison((v) => !v)}
                style={toggleStyle}
                className="clearpath-blueprint-interactive"
                aria-expanded={showComparison}
                aria-controls="s6-traditional-method-comparison"
              >
                {showComparison ? 'Hide comparison ▴' : 'Show comparison ▾'}
              </button>
            </div>
            {showComparison && (
              <div id="s6-traditional-method-comparison" style={{ marginTop: 12 }}>
                <Row
                  label="Traditional Tax Discount"
                  value={`${traditionalPercent} (${currency(pit.traditionalDiscountDollars)})`}
                />
                <Row
                  label="Point in Time Tax Discount"
                  value={`${pitPercent} (${currency(pit.taxDiscountDollars)})`}
                />
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'baseline',
                    marginTop: 12,
                    paddingTop: 12,
                    borderTop: '1px solid rgba(27,42,74,0.15)',
                  }}
                >
                  <div style={bodyStyle}>Difference</div>
                  <div style={keyFigureStyle(RED)}>{currency(overage)}</div>
                </div>
              </div>
            )}
          </section>

          <p style={{ ...bodyStyle, marginTop: 32, lineHeight: 1.55 }}>
            Using the traditional method would overstate the tax discount by{' '}
            <strong style={{ color: RED, fontWeight: 600 }}>{currency(overage)}</strong> —
            reducing your share of the property division by that amount.
          </p>

          <div style={{ ...labelStyle, marginTop: 24 }}>
            Assumptions: n = {pit.n} years to withdrawal midpoint,{' '}
            {formatPercent(pit.effectiveTaxRate)} effective rate,{' '}
            {formatPercent(pit.discountRate)} discount rate
          </div>
        </>
      )}

      {hasPva && (
        <section style={{ marginTop: hasPit ? 40 : 0 }}>
          <div style={subHeaderStyle}>Pension Present Value</div>
          {pva.path === 'flag_only' ? (
            <p style={{ ...bodyStyle, marginTop: 8 }}>
              Pension flagged for valuation; present value not yet calculated.
            </p>
          ) : (
            <>
              {pvaKeyValue != null && (
                <>
                  <div style={{ ...labelStyle, marginTop: 12 }}>
                    {pvaHasMarital ? 'MARITAL PORTION PRESENT VALUE' : 'PRESENT VALUE'}
                  </div>
                  <div style={{ ...keyFigureStyle(GOLD), marginTop: 4 }}>
                    {currency(pvaKeyValue)}
                  </div>
                </>
              )}
              <div style={{ marginTop: 12 }}>
                {pvaHasMarital && pva.headlinePV != null && (
                  <Row label="Total Present Value" value={currency(pva.headlinePV)} />
                )}
                {pva.coverturePercent != null && (
                  <Row
                    label="Marital (Coverture) Share"
                    value={formatPercent(pva.coverturePercent)}
                  />
                )}
                {pva.expectedRetirementAge != null && (
                  <Row label="Expected Retirement Age" value={String(pva.expectedRetirementAge)} />
                )}
              </div>
              <Citations items={pva.citations} />
            </>
          )}
        </section>
      )}

      {hasQdro && (
        <section style={{ marginTop: hasPit || hasPva ? 40 : 0 }}>
          <div style={subHeaderStyle}>QDRO Decisions</div>
          <p style={{ ...bodyStyle, marginTop: 8 }}>
            {`${qdroAssetEntries.length} ${
              qdroAssetEntries.length === 1 ? 'plan' : 'plans'
            } modeled in the QDRO tool.`}
          </p>
          {qdroAssetEntries.map(([id, asset]) => (
            <div
              key={id}
              style={{
                marginTop: 16,
                paddingTop: 12,
                borderTop: '1px solid rgba(27,42,74,0.1)',
              }}
            >
              <div style={{ ...subHeaderStyle, fontSize: 15 }}>
                {qdroPlanTypeLabel(asset.planType)}
              </div>
              <div style={{ marginTop: 6 }}>
                {asset.userRole && <Row label="Role" value={qdroRoleLabel(asset.userRole)} />}
                <Row label="Status" value={completionStateLabel(asset.completionState)} />
                {asset.pvSource != null && typeof asset.pvSource !== 'object' && (
                  <Row label="PV Source" value={String(asset.pvSource)} />
                )}
                {asset.metadata?.formulaId && (
                  <Row label="Formula" value={String(asset.metadata.formulaId)} />
                )}
              </div>
              <Citations items={asset.metadata?.citations} />
            </div>
          ))}
        </section>
      )}
    </div>
  );
}
