'use client';

import React from 'react';

const NAVY = '#1B2A4A';
const GOLD = '#C8A96E';

const SOURCE_MODULE_LABELS = {
  m1: 'Module 1',
  m2: 'Module 2',
  m3: 'Module 3',
  m4: 'Module 4',
  m5: 'Module 5',
  m6: 'Module 6',
  m7: 'Module 7',
  'm2+m4': 'Modules 2 and 4',
};

function emptyStateText(sectionKey, sourceModule) {
  if (sectionKey === 's12') {
    return 'Assembles in Module 7 from your completed Blueprint sections';
  }
  const label = SOURCE_MODULE_LABELS[sourceModule] || 'a future module';
  return `Builds with ${label}.`;
}

export default function BlueprintSection({ id, number, label, status, sourceModule, children }) {
  const sectionKey = `s${number}`;
  const isEmpty = status === 'empty';
  const isComplete = status === 'complete';
  const isPartial = status === 'partial';

  const headerOpacity = isEmpty ? 0.25 : 1;

  const borderStyle = isComplete
    ? `3px solid ${GOLD}`
    : isPartial
    ? `3px dotted rgba(200,169,110,0.3)`
    : 'none';

  const paddingLeft = isEmpty ? 0 : 20;

  return (
    <section
      id={id}
      className="blueprint-section"
      style={{
        marginBottom: 64,
        borderLeft: borderStyle,
        paddingLeft,
        scrollMarginTop: 80,
        breakInside: 'avoid',
      }}
    >
      <header style={{ marginBottom: 24 }}>
        <div
          style={{
            fontFamily: "var(--font-playfair), 'Playfair Display', serif",
            fontWeight: 700,
            fontSize: 22,
            lineHeight: 1.2,
            opacity: headerOpacity,
          }}
        >
          <span style={{ color: GOLD }}>§{number}</span>
          <span style={{ color: NAVY }}>{'\u2009'}{label}</span>
        </div>
        <div
          style={{
            marginTop: 10,
            borderBottom: '1px solid rgba(200,169,110,0.4)',
            width: '100%',
          }}
        />
      </header>

      {isEmpty ? (
        <p
          style={{
            margin: 0,
            fontFamily: "var(--font-source-sans), 'Source Sans Pro', sans-serif",
            fontWeight: 400,
            fontSize: 15,
            color: 'rgba(27,42,74,0.3)',
          }}
        >
          {emptyStateText(sectionKey, sourceModule)}
        </p>
      ) : (
        children
      )}
    </section>
  );
}
