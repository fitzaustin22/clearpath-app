'use client';

// Phase 2 placeholder — full implementation lands in Phase 3 commit.
// Renders a minimal "complete inputs to see estimate" placeholder so the
// SupportEstimator container compiles before ResultsPanel ships.

import { NAVY, MUTED, PARCHMENT, BORDER, SOURCE } from './_styles.js';

export function ResultsPanel({ results }) {
  if (!results) {
    return (
      <div
        style={{
          backgroundColor: PARCHMENT,
          border: `1px dashed ${BORDER}`,
          borderRadius: 8,
          padding: 32,
          textAlign: 'center',
          fontFamily: SOURCE,
          color: MUTED,
        }}
      >
        Complete inputs to see estimate
      </div>
    );
  }

  return (
    <div
      style={{
        padding: 16, border: `1px solid ${BORDER}`, borderRadius: 8,
        fontFamily: SOURCE, color: NAVY,
      }}
    >
      <strong>Results computed.</strong>
      <pre style={{ fontSize: 12, whiteSpace: 'pre-wrap', margin: '12px 0 0' }}>
        {JSON.stringify(results, null, 2)}
      </pre>
    </div>
  );
}

export default ResultsPanel;
