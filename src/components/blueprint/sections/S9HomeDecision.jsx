'use client';

const NAVY = '#1B2A4A';
const GOLD = '#C8A96E';
const RED = '#C0392B';
const SANS = "var(--font-source-sans), 'Source Sans 3', sans-serif";

const currency = (n) =>
  (n || 0).toLocaleString('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
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

const keyFigureStyle = (color = NAVY) => ({
  fontFamily: SANS,
  fontWeight: 600,
  fontSize: 28,
  color,
  lineHeight: 1.1,
});

export default function S9HomeDecision({ data, status }) {
  if (!data) return null;

  const ratio = data.affordabilityRatio;
  const isUnaffordable = typeof ratio === 'number' && ratio > 35;

  return (
    <div>
      <div style={labelStyle}>RECOMMENDATION</div>
      <div style={{ ...keyFigureStyle(GOLD), marginTop: 4 }}>{data.recommendation}</div>

      <div style={{ marginTop: 20 }}>
        <div style={bodyStyle}>Home Value: {currency(data.homeValue)}</div>
        <div style={bodyStyle}>Equity: {currency(data.equity)}</div>
      </div>

      <div style={{ marginTop: 16 }}>
        <div style={bodyStyle}>Monthly Cost: {currency(data.monthlyCost)}</div>
        {typeof ratio === 'number' && (
          <div style={bodyStyle}>Affordability: {ratio}% of income</div>
        )}
      </div>

      {isUnaffordable && (
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
          Monthly housing costs exceed 35% of income — this may not be sustainable
          long-term.
        </div>
      )}
    </div>
  );
}
