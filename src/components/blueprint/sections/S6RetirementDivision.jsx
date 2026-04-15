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

export default function S6RetirementDivision({ data, status }) {
  const [showComparison, setShowComparison] = useState(false);
  if (!data) return null;

  const pitPercent = formatPercent(data.taxDiscountPercent);
  const traditionalPercent = formatPercent(data.effectiveTaxRate);
  const overage = data.overage || 0;

  return (
    <div>
      <section>
        <div style={bodyStyle}>Plan: {planTypeLabel(data.planType)}</div>
        <div style={{ ...labelStyle, marginTop: 16 }}>PLAN BALANCE AT DIVISION</div>
        <div style={{ ...keyFigureStyle(), marginTop: 4 }}>
          {currency(data.planBalance)}
        </div>
      </section>

      <section style={{ marginTop: 24 }}>
        <Row label="Tax Discount Method" value="Point in Time (Sutherland)" />
        <Row
          label="Tax Discount"
          value={`${pitPercent} (${currency(data.taxDiscountDollars)})`}
        />
      </section>

      <section style={{ marginTop: 24 }}>
        <div style={labelStyle}>TAX-ADJUSTED PLAN VALUE</div>
        <div style={{ ...keyFigureStyle(GOLD), marginTop: 4 }}>
          {currency(data.taxAdjustedValue)}
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
          >
            {showComparison ? 'Hide comparison ▴' : 'Show comparison ▾'}
          </button>
        </div>
        {showComparison && (
          <div style={{ marginTop: 12 }}>
            <Row
              label="Traditional Tax Discount"
              value={`${traditionalPercent} (${currency(data.traditionalDiscountDollars)})`}
            />
            <Row
              label="Point in Time Tax Discount"
              value={`${pitPercent} (${currency(data.taxDiscountDollars)})`}
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
        Assumptions: n = {data.n} years to withdrawal midpoint,{' '}
        {formatPercent(data.effectiveTaxRate)} effective rate,{' '}
        {formatPercent(data.discountRate)} discount rate
      </div>
    </div>
  );
}
