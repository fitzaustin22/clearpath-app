'use client';

import { useState } from 'react';

const NAVY = '#1B2A4A';
const GOLD = '#C8A96E';
const GREEN = '#2D8A4E';
const RED = '#C0392B';
const SANS = "var(--font-source-sans), 'Source Sans 3', sans-serif";

const currency = (n) =>
  (n || 0).toLocaleString('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });

const signedChange = (n) => {
  const val = Math.round(n || 0);
  if (val === 0) return { text: '$0', color: NAVY };
  if (val < 0) return { text: `−${currency(Math.abs(val))}`, color: GREEN };
  return { text: `+${currency(val)}`, color: RED };
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
};

const thStyle = {
  fontFamily: SANS,
  fontWeight: 400,
  fontSize: 13,
  color: 'rgba(27,42,74,0.5)',
  textTransform: 'uppercase',
  letterSpacing: '0.05em',
  padding: '8px 12px',
  textAlign: 'right',
};

const tdStyle = {
  fontFamily: SANS,
  fontWeight: 400,
  fontSize: 15,
  color: 'rgba(27,42,74,0.8)',
  padding: '8px 12px',
  textAlign: 'right',
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

export default function S7ExpenseAnalysis({ data, status }) {
  const [showCategories, setShowCategories] = useState(false);
  if (!data) return null;

  const isPartial = status === 'partial';
  const currentTotal = data.currentTotal || 0;
  const projectedTotal = data.projectedTotal || 0;
  const diff = data.monthlyDifference || 0;
  const absDiff = Math.abs(diff);
  const diffColor = diff >= 0 ? GREEN : RED;
  const diffSuffix = diff >= 0 ? 'lower' : 'higher';

  const gap = data.monthlyGap || 0;
  const gapColor = gap >= 0 ? GREEN : RED;

  return (
    <div>
      {isPartial ? (
        <section>
          <div style={labelStyle}>CURRENT HOUSEHOLD</div>
          <div style={{ ...keyFigureStyle(), marginTop: 4 }}>
            {currency(currentTotal)}/month
          </div>
          <div style={{ ...noteStyle, marginTop: 16 }}>
            Current expenses entered. Complete the &quot;On My Own&quot; column in Module 3
            for projected comparison.
          </div>
        </section>
      ) : (
        <>
          <section
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              gap: 24,
              alignItems: 'flex-start',
            }}
          >
            <div style={{ flex: '1 1 180px', minWidth: 160 }}>
              <div style={labelStyle}>CURRENT HOUSEHOLD</div>
              <div style={{ ...keyFigureStyle(), marginTop: 4 }}>
                {currency(currentTotal)}
              </div>
              <div style={{ ...bodyStyle, fontSize: 14 }}>/month</div>
            </div>
            <div style={{ flex: '1 1 180px', minWidth: 160 }}>
              <div style={labelStyle}>PROJECTED (ON MY OWN)</div>
              <div style={{ ...keyFigureStyle(), marginTop: 4 }}>
                {currency(projectedTotal)}
              </div>
              <div style={{ ...bodyStyle, fontSize: 14 }}>/month</div>
            </div>
            <div style={{ flex: '1 1 180px', minWidth: 160 }}>
              <div style={labelStyle}>MONTHLY DIFFERENCE</div>
              <div style={{ ...keyFigureStyle(diffColor), marginTop: 4 }}>
                {currency(absDiff)}
              </div>
              <div style={{ ...bodyStyle, fontSize: 14 }}>{diffSuffix}</div>
            </div>
          </section>

          {Array.isArray(data.categories) && data.categories.length > 0 && (
            <section style={{ marginTop: 32 }}>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'baseline',
                  justifyContent: 'space-between',
                }}
              >
                <div style={subHeaderStyle}>Category Breakdown</div>
                <button
                  type="button"
                  onClick={() => setShowCategories((v) => !v)}
                  style={toggleStyle}
                  className="clearpath-blueprint-interactive"
                >
                  {showCategories ? 'Hide breakdown ▴' : 'Show breakdown ▾'}
                </button>
              </div>
              {showCategories && (
                <div style={{ overflowX: 'auto', marginTop: 12 }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                      <tr>
                        <th style={{ ...thStyle, textAlign: 'left' }}>Category</th>
                        <th style={thStyle}>Current</th>
                        <th style={thStyle}>Projected</th>
                        <th style={thStyle}>Change</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.categories.map((c, i) => {
                        const ch = signedChange(c.change);
                        return (
                          <tr key={i}>
                            <td
                              style={{
                                ...tdStyle,
                                textAlign: 'left',
                                color: 'rgba(27,42,74,0.8)',
                              }}
                            >
                              {c.name}
                            </td>
                            <td style={tdStyle}>{currency(c.current)}</td>
                            <td style={tdStyle}>{currency(c.projected)}</td>
                            <td style={{ ...tdStyle, color: ch.color, fontWeight: 600 }}>
                              {ch.text}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </section>
          )}

          <section style={{ marginTop: 32 }}>
            <Row label="Monthly Income" value={currency(data.monthlyIncome)} />
            <Row label="Monthly Expenses (Projected)" value={currency(projectedTotal)} />
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
              <div style={bodyStyle}>Monthly {gap >= 0 ? 'Surplus' : 'Gap'}</div>
              <div style={keyFigureStyle(gapColor)}>{currency(Math.abs(gap))}</div>
            </div>
          </section>
        </>
      )}
    </div>
  );
}
