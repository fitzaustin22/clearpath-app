'use client';

import { useState } from 'react';

const NAVY = '#1B2A4A';
const GOLD = '#C8A96E';
const PARCHMENT = '#FAF8F2';
const SANS = "var(--font-source-sans), 'Source Sans 3', sans-serif";

const STATUS_LABELS = {
  mfj: 'Married Filing Jointly',
  mfs: 'Married Filing Separately',
  single: 'Single',
  hoh: 'Head of Household',
};

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

export default function S4TaxAnalysis({ data, status }) {
  const [showComparison, setShowComparison] = useState(false);
  if (!data) return null;

  const scenarios = data.scenarios || {};
  const ranked = Object.entries(scenarios)
    .filter(([, s]) => s && typeof s.netTax === 'number')
    .sort((a, b) => a[1].netTax - b[1].netTax);
  const bestTax = ranked.length > 0 ? ranked[0][1].netTax : 0;
  const worstKey = ranked.length > 0 ? ranked[ranked.length - 1][0] : null;
  const worstLabel = worstKey ? STATUS_LABELS[worstKey] || worstKey : '';

  const bestLabel = STATUS_LABELS[data.bestOption] || data.bestOption;

  const timelineCopy = (() => {
    if (!data.divorceTimeline) return null;
    if (data.divorceTimeline === 'beforeDec31') {
      return `Divorce finalized before December 31 enables Single or Head of Household filing — saving up to ${currency(
        data.maxSavings
      )} compared to Married Filing Separately.`;
    }
    if (data.divorceTimeline === 'afterJan1') {
      return `Divorce finalized after January 1 means filing as Married Filing Jointly or Married Filing Separately for ${data.taxYear}.`;
    }
    if (data.divorceTimeline === 'notSure') {
      return 'The timing of your divorce can significantly affect your taxes. This comparison shows exactly how much.';
    }
    return null;
  })();

  return (
    <div>
      <section>
        <div style={labelStyle}>RECOMMENDED FILING STATUS</div>
        <div style={{ ...keyFigureStyle(GOLD), marginTop: 4 }}>{bestLabel}</div>
      </section>

      <section style={{ marginTop: 24 }}>
        <Row label="Estimated Federal Tax" value={currency(data.bestOptionTax)} />
        <Row label="Effective Tax Rate" value={formatPercent(data.effectiveRate)} />
        <Row label="Marginal Tax Rate" value={formatPercent(data.marginalRate)} />
      </section>

      {ranked.length > 0 && (
        <section style={{ marginTop: 32 }}>
          <div
            style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}
          >
            <div style={subHeaderStyle}>Filing Status Comparison</div>
            <button
              type="button"
              onClick={() => setShowComparison((v) => !v)}
              style={toggleStyle}
              className="clearpath-blueprint-interactive"
              aria-expanded={showComparison}
              aria-controls="s4-filing-status-comparison"
            >
              {showComparison ? 'Hide comparison ▴' : 'Show comparison ▾'}
            </button>
          </div>
          {showComparison && (
            <div id="s4-filing-status-comparison" style={{ marginTop: 12 }}>
              {ranked.map(([key, scenario], idx) => {
                const isBest = idx === 0;
                const delta = scenario.netTax - bestTax;
                return (
                  <div
                    key={key}
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'baseline',
                      padding: '6px 0',
                    }}
                  >
                    <div style={{ ...bodyStyle, color: isBest ? GOLD : 'rgba(27,42,74,0.8)' }}>
                      {STATUS_LABELS[key] || key}
                    </div>
                    <div style={{ display: 'flex', gap: 12, alignItems: 'baseline' }}>
                      <div style={{ ...bodyStyle, color: isBest ? GOLD : 'rgba(27,42,74,0.8)' }}>
                        {currency(scenario.netTax)}
                      </div>
                      <div
                        style={{
                          ...bodyStyle,
                          color: isBest ? GOLD : 'rgba(27,42,74,0.5)',
                          minWidth: 96,
                          textAlign: 'right',
                        }}
                      >
                        {isBest ? '(Lowest)' : `(+${currency(delta)})`}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      )}

      {typeof data.maxSavings === 'number' && data.maxSavings > 0 && (
        <section style={{ marginTop: 32 }}>
          <div style={labelStyle}>POTENTIAL TAX SAVINGS</div>
          <div style={{ ...keyFigureStyle(GOLD), marginTop: 4 }}>
            {currency(data.maxSavings)}
          </div>
          {worstLabel && (
            <div style={{ ...bodyStyle, marginTop: 6 }}>vs. {worstLabel}</div>
          )}
        </section>
      )}

      {timelineCopy && (
        <section
          style={{
            marginTop: 32,
            borderLeft: `3px solid ${NAVY}`,
            backgroundColor: PARCHMENT,
            padding: 16,
          }}
        >
          <div style={bodyStyle}>{timelineCopy}</div>
        </section>
      )}

      <div style={{ ...labelStyle, marginTop: 32 }}>
        Tax Year: {data.taxYear} (federal only)
      </div>
    </div>
  );
}
