'use client';

export default function S5PropertyDivision({ data, status }) {
  if (!data) return null;

  return (
    <div style={{ fontSize: 14, color: 'rgba(27,42,74,0.6)' }}>
      <p style={{ margin: 0 }}>§5 Property Division data available. Full renderer coming in Step 3b.</p>
    </div>
  );
}
