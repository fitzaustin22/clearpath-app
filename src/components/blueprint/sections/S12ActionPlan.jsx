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

const noteStyle = {
  fontFamily: SANS,
  fontWeight: 400,
  fontSize: 14,
  color: 'rgba(27,42,74,0.5)',
  fontStyle: 'italic',
};

export default function S12ActionPlan({ data, status }) {
  if (!data) return null;

  const nextSteps = Array.isArray(data.nextSteps) ? data.nextSteps : [];
  const professionals = Array.isArray(data.professionals) ? data.professionals : [];
  const keyDates = Array.isArray(data.keyDates) ? data.keyDates : [];

  return (
    <div>
      {nextSteps.length > 0 && (
        <section>
          <div style={subHeaderStyle}>Next Steps</div>
          <ol style={{ margin: '12px 0 0 0', paddingLeft: 24 }}>
            {nextSteps.map((s, i) => (
              <li key={i} style={{ ...bodyStyle, padding: '4px 0' }}>
                {s.step}
                {s.timeline && (
                  <span style={{ color: GOLD }}> — {s.timeline}</span>
                )}
                {s.responsible && (
                  <span style={{ color: 'rgba(27,42,74,0.5)' }}> ({s.responsible})</span>
                )}
              </li>
            ))}
          </ol>
        </section>
      )}

      {professionals.length > 0 && (
        <section style={{ marginTop: 28 }}>
          <div style={subHeaderStyle}>Professional Team</div>
          <div style={{ marginTop: 12 }}>
            {professionals.map((p, i) => (
              <div key={i} style={{ ...bodyStyle, padding: '4px 0' }}>
                <strong style={{ color: NAVY }}>{p.role}:</strong> {p.name}
                {p.contact && (
                  <span style={{ color: 'rgba(27,42,74,0.5)' }}> · {p.contact}</span>
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      {keyDates.length > 0 && (
        <section style={{ marginTop: 28 }}>
          <div style={subHeaderStyle}>Key Dates</div>
          <div style={{ marginTop: 12 }}>
            {keyDates.map((d, i) => (
              <div key={i} style={{ ...bodyStyle, padding: '4px 0' }}>
                <strong style={{ color: GOLD }}>{d.date}</strong> — {d.event}
              </div>
            ))}
          </div>
        </section>
      )}

      <div style={{ ...noteStyle, marginTop: 28 }}>
        This action plan is generated from your completed Blueprint sections.
      </div>
    </div>
  );
}
