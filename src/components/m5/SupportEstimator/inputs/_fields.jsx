'use client';

import {
  NAVY, GOLD, PARCHMENT, BORDER, SOURCE, BANNER_VARIANTS,
} from '../_styles.js';

export function Banner({ children, variant = 'gold' }) {
  const v = BANNER_VARIANTS[variant] ?? BANNER_VARIANTS.gold;
  return (
    <div
      role={variant === 'red' ? 'alert' : undefined}
      style={{
        borderLeft: `4px solid ${v.border}`,
        backgroundColor: v.bg,
        color: v.text,
        padding: '12px 16px',
        marginBottom: 16,
        fontFamily: SOURCE, fontSize: 14,
        borderRadius: 4,
      }}
    >
      {children}
    </div>
  );
}

export function PrePopBadge({ text }) {
  return (
    <span
      style={{
        display: 'inline-block',
        marginLeft: 8,
        padding: '2px 8px',
        fontFamily: SOURCE, fontSize: 12,
        color: NAVY,
        backgroundColor: '#FBF4E3',
        border: `1px solid ${GOLD}`,
        borderRadius: 999,
      }}
    >
      {text}
    </span>
  );
}

export function SectionCard({ title, children }) {
  return (
    <section
      style={{
        backgroundColor: PARCHMENT,
        border: `1px solid ${BORDER}`,
        borderRadius: 8,
        padding: 20,
        marginBottom: 16,
      }}
    >
      <h3
        style={{
          fontFamily: SOURCE,
          fontSize: 16, fontWeight: 700,
          color: NAVY,
          margin: '0 0 14px',
          textTransform: 'uppercase',
          letterSpacing: 0.5,
        }}
      >
        {title}
      </h3>
      {children}
    </section>
  );
}
