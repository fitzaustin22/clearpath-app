'use client';

const NAVY = '#1B2A4A';
const GOLD = '#C8A96E';
const GREEN = '#2D8A4E';
const RED = '#C0392B';
const BAR_TRACK = 'rgba(27,42,74,0.10)';

const SANS = "var(--font-source-sans), 'Source Sans 3', sans-serif";

const DOMAIN_LABELS = {
  incomeAwareness: 'Income Awareness',
  debtAwareness: 'Debt Awareness',
  assetAwareness: 'Asset Awareness',
  documentAccess: 'Document Access',
  professionalReadiness: 'Professional Readiness',
};

const DOMAIN_MAX = 6;

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

const noteStyle = {
  fontFamily: SANS,
  fontWeight: 400,
  fontSize: 14,
  color: 'rgba(27,42,74,0.5)',
  fontStyle: 'italic',
};

function DomainBar({ name, score }) {
  const pct = Math.min(100, Math.max(0, (score / DOMAIN_MAX) * 100));
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
      <div style={{ ...bodyStyle, flex: '1 1 auto', minWidth: 0 }}>{name}</div>
      <div
        style={{
          width: 120,
          height: 6,
          borderRadius: 3,
          backgroundColor: BAR_TRACK,
          overflow: 'hidden',
          flexShrink: 0,
        }}
      >
        <div style={{ width: `${pct}%`, height: '100%', backgroundColor: GOLD }} />
      </div>
      <div style={{ ...bodyStyle, width: 44, textAlign: 'right', flexShrink: 0 }}>
        {score}/{DOMAIN_MAX}
      </div>
    </div>
  );
}

export default function S1PersonalProfile({ data, status }) {
  if (!data) return null;

  const hasAssessment = data.totalScore !== null && data.totalScore !== undefined;
  const hasBudgetGap =
    data.adjustedMonthlyIncome !== null && data.adjustedMonthlyIncome !== undefined;

  const keyGaps = hasAssessment && data.domainScores
    ? Object.entries(data.domainScores)
        .sort((a, b) => a[1] - b[1])
        .slice(0, 2)
        .map(([k]) => DOMAIN_LABELS[k] || k)
        .join(', ')
    : '';

  const gap = data.monthlyGap;
  const isSurplus = typeof gap === 'number' && gap >= 0;
  const gapColor = typeof gap === 'number' ? (isSurplus ? GREEN : RED) : NAVY;

  return (
    <div>
      {hasAssessment && (
        <section>
          <div style={labelStyle}>READINESS TIER</div>
          <div style={{ ...keyFigureStyle(GOLD), marginTop: 4 }}>{data.tier}</div>
          <div style={{ ...bodyStyle, marginTop: 8 }}>
            Total Score: {data.totalScore} / 30
          </div>

          <div style={{ marginTop: 24 }}>
            {Object.entries(data.domainScores || {}).map(([key, score]) => (
              <DomainBar key={key} name={DOMAIN_LABELS[key] || key} score={score} />
            ))}
          </div>

          {keyGaps && (
            <div style={{ marginTop: 16 }}>
              <div style={bodyStyle}>Key gaps: {keyGaps}</div>
              <div style={{ ...noteStyle, marginTop: 4 }}>
                Addressed by: Module 2 (Asset Inventory, Documentation Checklist)
              </div>
            </div>
          )}
        </section>
      )}

      {hasAssessment && hasBudgetGap && <div style={{ height: 32 }} />}

      {hasBudgetGap && (
        <section>
          <div style={labelStyle}>BUDGET GAP ESTIMATE (INITIAL)</div>
          <div style={{ marginTop: 12 }}>
            <Row label="Estimated Monthly Income" value={currency(data.adjustedMonthlyIncome)} />
            <Row
              label="Estimated Monthly Expenses"
              value={currency(data.totalMonthlyExpenses)}
            />
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginTop: 12,
                paddingTop: 12,
                borderTop: '1px solid rgba(27,42,74,0.15)',
              }}
            >
              <div style={bodyStyle}>Monthly {isSurplus ? 'Surplus' : 'Gap'}</div>
              <div style={keyFigureStyle(gapColor)}>{currency(Math.abs(gap || 0))}</div>
            </div>
          </div>
          <div style={{ ...noteStyle, marginTop: 16 }}>
            This is your initial estimate from Module 1. Module 3 refines these numbers with
            detailed pay stub and expense analysis.
          </div>
        </section>
      )}

      {status === 'partial' && hasAssessment && !hasBudgetGap && (
        <div style={{ ...noteStyle, marginTop: 24 }}>
          Complete the Budget Gap Calculator in Module 1 for your initial income estimate.
        </div>
      )}
      {status === 'partial' && !hasAssessment && hasBudgetGap && (
        <div style={{ ...noteStyle, marginTop: 24 }}>
          Complete the Readiness Assessment in Module 1 for your full profile.
        </div>
      )}
    </div>
  );
}

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
