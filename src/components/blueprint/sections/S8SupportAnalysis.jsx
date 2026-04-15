'use client';

const NAVY = '#1B2A4A';
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

const keyFigureStyle = {
  fontFamily: SANS,
  fontWeight: 600,
  fontSize: 28,
  color: NAVY,
  lineHeight: 1.1,
};

const noteStyle = {
  fontFamily: SANS,
  fontWeight: 400,
  fontSize: 14,
  color: 'rgba(27,42,74,0.5)',
  fontStyle: 'italic',
};

export default function S8SupportAnalysis({ data, status }) {
  if (!data) return null;

  return (
    <div>
      <div style={labelStyle}>TOTAL MONTHLY SUPPORT</div>
      <div style={{ ...keyFigureStyle, marginTop: 4 }}>
        {currency(data.totalMonthlySupport)}
      </div>

      {data.spousalSupport && (
        <div style={{ marginTop: 20 }}>
          <div style={bodyStyle}>
            Spousal Support: {currency(data.spousalSupport.monthly)}/month
          </div>
          {data.spousalSupport.duration && (
            <div style={{ ...bodyStyle, color: 'rgba(27,42,74,0.6)' }}>
              Duration: {data.spousalSupport.duration}
            </div>
          )}
          {data.spousalSupport.basis && (
            <div style={{ ...bodyStyle, color: 'rgba(27,42,74,0.6)' }}>
              Basis: {data.spousalSupport.basis}
            </div>
          )}
        </div>
      )}

      {data.childSupport && (
        <div style={{ marginTop: 20 }}>
          <div style={bodyStyle}>
            Child Support: {currency(data.childSupport.monthly)}/month for{' '}
            {data.childSupport.children}{' '}
            {data.childSupport.children === 1 ? 'child' : 'children'}
          </div>
          {data.childSupport.basis && (
            <div style={{ ...bodyStyle, color: 'rgba(27,42,74,0.6)' }}>
              Basis: {data.childSupport.basis}
            </div>
          )}
        </div>
      )}

      <div style={{ ...noteStyle, marginTop: 24 }}>
        Estimates based on Module 5 analysis. Actual support depends on court jurisdiction
        and judicial discretion.
      </div>
    </div>
  );
}
