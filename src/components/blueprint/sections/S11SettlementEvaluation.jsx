'use client';

import { useState } from 'react';

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

export default function S11SettlementEvaluation({ data, status }) {
  const [showStrengths, setShowStrengths] = useState(false);
  const [showConcerns, setShowConcerns] = useState(false);
  if (!data) return null;

  const score = typeof data.fairnessScore === 'number' ? data.fairnessScore : null;
  const scoreColor = score === null ? NAVY : score >= 70 ? GOLD : score < 50 ? RED : NAVY;
  const strengths = Array.isArray(data.strengths) ? data.strengths : [];
  const concerns = Array.isArray(data.concerns) ? data.concerns : [];

  return (
    <div>
      <div style={labelStyle}>SETTLEMENT VALUE</div>
      <div style={{ ...keyFigureStyle(), marginTop: 4 }}>
        {currency(data.totalValue)}
      </div>
      {data.offerSummary && (
        <div style={{ ...bodyStyle, marginTop: 8 }}>{data.offerSummary}</div>
      )}

      {score !== null && (
        <div style={{ ...bodyStyle, marginTop: 20, color: scoreColor, fontWeight: 600 }}>
          Fairness Assessment: {score}/100
        </div>
      )}

      {strengths.length > 0 && (
        <section style={{ marginTop: 24 }}>
          <div
            style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}
          >
            <div style={subHeaderStyle}>Strengths</div>
            <button
              type="button"
              onClick={() => setShowStrengths((v) => !v)}
              style={toggleStyle}
              className="clearpath-blueprint-interactive"
            >
              {showStrengths ? 'Hide ▴' : 'Show ▾'}
            </button>
          </div>
          {showStrengths && (
            <ul style={{ margin: '8px 0 0 0', paddingLeft: 20 }}>
              {strengths.map((s, i) => (
                <li key={i} style={{ ...bodyStyle, padding: '3px 0' }}>
                  {s}
                </li>
              ))}
            </ul>
          )}
        </section>
      )}

      {concerns.length > 0 && (
        <section style={{ marginTop: 16 }}>
          <div
            style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}
          >
            <div style={subHeaderStyle}>Concerns</div>
            <button
              type="button"
              onClick={() => setShowConcerns((v) => !v)}
              style={toggleStyle}
              className="clearpath-blueprint-interactive"
            >
              {showConcerns ? 'Hide ▴' : 'Show ▾'}
            </button>
          </div>
          {showConcerns && (
            <ul style={{ margin: '8px 0 0 0', paddingLeft: 20 }}>
              {concerns.map((c, i) => (
                <li key={i} style={{ ...bodyStyle, color: RED, padding: '3px 0' }}>
                  {c}
                </li>
              ))}
            </ul>
          )}
        </section>
      )}
    </div>
  );
}
