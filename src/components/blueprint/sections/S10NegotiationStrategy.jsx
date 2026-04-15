'use client';

const NAVY = '#1B2A4A';
const GOLD = '#C8A96E';
const SANS = "var(--font-source-sans), 'Source Sans 3', sans-serif";

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

export default function S10NegotiationStrategy({ data, status }) {
  if (!data) return null;

  const priorities = Array.isArray(data.priorities)
    ? [...data.priorities].sort((a, b) => (a.rank || 0) - (b.rank || 0))
    : [];
  const tradeOffs = Array.isArray(data.tradeOffs) ? data.tradeOffs : [];

  return (
    <div>
      {priorities.length > 0 && (
        <section>
          <div style={subHeaderStyle}>Your Priorities</div>
          <ol style={{ margin: '12px 0 0 0', paddingLeft: 24 }}>
            {priorities.map((p, i) => (
              <li key={i} style={{ ...bodyStyle, padding: '4px 0' }}>
                {p.item}
                {p.importance && (
                  <span style={{ color: 'rgba(27,42,74,0.5)' }}> — {p.importance}</span>
                )}
              </li>
            ))}
          </ol>
        </section>
      )}

      {tradeOffs.length > 0 && (
        <section style={{ marginTop: 28 }}>
          <div style={subHeaderStyle}>Potential Trade-Offs</div>
          <div style={{ marginTop: 12 }}>
            {tradeOffs.map((t, i) => (
              <div key={i} style={{ ...bodyStyle, padding: '6px 0' }}>
                <span style={{ color: 'rgba(27,42,74,0.6)' }}>Give:</span> {t.give}{' '}
                <span style={{ color: GOLD }}>→</span>{' '}
                <span style={{ color: 'rgba(27,42,74,0.6)' }}>Get:</span> {t.get}
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
