'use client';

import { useState } from 'react';

const NAVY = '#1B2A4A';
const GOLD = '#C8A96E';
const SANS = "var(--font-source-sans), 'Source Sans 3', sans-serif";

const PAYCHECKS_PER_YEAR = {
  Biweekly: 26,
  'Semi-monthly': 24,
  Monthly: 12,
  Weekly: 52,
};

const currency = (n) =>
  (n || 0).toLocaleString('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });

const currency2 = (n) =>
  (n || 0).toLocaleString('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

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

const noteStyle = {
  fontFamily: SANS,
  fontWeight: 400,
  fontSize: 14,
  color: 'rgba(27,42,74,0.5)',
  fontStyle: 'italic',
};

const toggleStyle = {
  fontFamily: SANS,
  fontWeight: 400,
  fontSize: 13,
  color: GOLD,
  background: 'transparent',
  border: 'none',
  padding: 0,
  cursor: 'pointer',
  textDecoration: 'none',
};

function Row({ label, value, valueStyle }) {
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
      <div style={valueStyle || bodyStyle}>{value}</div>
    </div>
  );
}

export default function S2IncomeAnalysis({ data, status }) {
  const [showDeductions, setShowDeductions] = useState(false);
  if (!data) return null;

  const hasGross = typeof data.grossMonthlyIncome === 'number';
  const hasNet = typeof data.netMonthlyIncome === 'number';
  const paychecks = PAYCHECKS_PER_YEAR[data.payFrequency] || null;
  const deductionTotal = Array.isArray(data.deductions)
    ? data.deductions.reduce((sum, d) => sum + (d.amount || 0), 0)
    : 0;
  const totalMonthlyIncome = (data.netMonthlyIncome || 0) + (data.otherIncome || 0);

  return (
    <div>
      {hasGross && (
        <section>
          <div style={labelStyle}>GROSS MONTHLY INCOME</div>
          <div style={{ ...keyFigureStyle(), marginTop: 4 }}>
            {currency(data.grossMonthlyIncome)}
          </div>
          {data.payFrequency && (
            <div style={{ ...bodyStyle, marginTop: 8 }}>
              Pay Frequency: {data.payFrequency}
              {paychecks ? ` (${paychecks} paychecks/year)` : ''}
            </div>
          )}
          {typeof data.grossPerPaycheck === 'number' && (
            <div style={bodyStyle}>
              Gross Per Paycheck: {currency2(data.grossPerPaycheck)}
            </div>
          )}
        </section>
      )}

      {Array.isArray(data.deductions) && data.deductions.length > 0 && (
        <section style={{ marginTop: 32 }}>
          <div
            style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}
          >
            <div style={subHeaderStyle}>
              Deductions — {currency2(deductionTotal)}/month
            </div>
            <button
              type="button"
              onClick={() => setShowDeductions((v) => !v)}
              style={toggleStyle}
              className="clearpath-blueprint-interactive"
            >
              {showDeductions ? 'Hide breakdown ▴' : 'Show breakdown ▾'}
            </button>
          </div>
          {showDeductions && (
            <div style={{ marginTop: 12 }}>
              {data.deductions.map((d, i) => (
                <Row key={i} label={d.name} value={currency2(d.amount)} />
              ))}
            </div>
          )}
        </section>
      )}

      {hasNet && (
        <section style={{ marginTop: 32 }}>
          <div style={labelStyle}>NET MONTHLY INCOME</div>
          <div style={{ ...keyFigureStyle(), marginTop: 4 }}>
            {currency(data.netMonthlyIncome)}
          </div>
          <div style={{ marginTop: 12 }}>
            <Row label="Other Income" value={currency(data.otherIncome || 0)} />
            <Row label="Total Monthly Income" value={currency(totalMonthlyIncome)} />
          </div>
        </section>
      )}

      {typeof data.annualGrossIncome === 'number' && (
        <section style={{ marginTop: 32 }}>
          <div style={labelStyle}>ANNUAL GROSS INCOME</div>
          <div style={{ ...keyFigureStyle(), marginTop: 4 }}>
            {currency(data.annualGrossIncome)}
          </div>
        </section>
      )}

      {status === 'partial' && (
        <div style={{ ...noteStyle, marginTop: 24 }}>
          Complete the Pay Stub Decoder in Module 3 for full income analysis.
        </div>
      )}
    </div>
  );
}
