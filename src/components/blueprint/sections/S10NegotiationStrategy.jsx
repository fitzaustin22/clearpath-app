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

  const rawPriorities = Array.isArray(data.priorities) ? data.priorities : [];
  const tradeOffs = Array.isArray(data.tradeOffs) ? data.tradeOffs : [];

  // Privacy guard: willing-to-trade is private leverage and must never render in
  // the Blueprint. It must never reach here; if one does, drop it and warn.
  const visiblePriorities = rawPriorities.filter((p) => {
    if (p && p.importance === 'willing-to-trade') {
      console.warn(
        'S10NegotiationStrategy: dropped a willing-to-trade priority — private leverage must never render in the Blueprint.',
      );
      return false;
    }
    return true;
  });

  // Partition the secure tiers and sort each by rank; each group is numbered
  // independently (its <ol> restarts at 1).
  const mustHaves = visiblePriorities
    .filter((p) => p && p.importance === 'must-have')
    .sort((a, b) => (a.rank || 0) - (b.rank || 0));
  const wouldLikes = visiblePriorities
    .filter((p) => p && p.importance === 'would-like')
    .sort((a, b) => (a.rank || 0) - (b.rank || 0));

  const prioritiesProvided = rawPriorities.length > 0;

  if (!prioritiesProvided && tradeOffs.length === 0) return null;

  return (
    <div>
      {prioritiesProvided && (
        <section>
          {mustHaves.length > 0 && (
            <div>
              <div style={subHeaderStyle}>Must-Haves</div>
              <ol style={{ margin: '12px 0 0 0', paddingLeft: 24 }}>
                {mustHaves.map((p, i) => (
                  <li key={i} style={{ ...bodyStyle, padding: '4px 0' }}>
                    {p.item}
                  </li>
                ))}
              </ol>
            </div>
          )}

          {wouldLikes.length > 0 && (
            <div style={{ marginTop: mustHaves.length > 0 ? 20 : 0 }}>
              <div style={subHeaderStyle}>Would-Likes</div>
              <ol style={{ margin: '12px 0 0 0', paddingLeft: 24 }}>
                {wouldLikes.map((p, i) => (
                  <li key={i} style={{ ...bodyStyle, padding: '4px 0' }}>
                    {p.item}
                  </li>
                ))}
              </ol>
            </div>
          )}

          {mustHaves.length === 0 && wouldLikes.length === 0 && (
            <div style={{ ...bodyStyle, padding: '4px 0' }}>No priorities recorded yet</div>
          )}
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
