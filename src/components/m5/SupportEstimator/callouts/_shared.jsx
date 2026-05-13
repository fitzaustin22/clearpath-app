'use client';

import { useState } from 'react';
import { T } from '@/src/lib/brand/tokens';

export const VARIANT = {
  caution: {
    stripe: T.AMBER,
    bg: T.AMBER_BG,
    border: T.AMBER_BORDER,
    labelColor: T.AMBER,
  },
  info: {
    stripe: T.GOLD,
    bg: '#FFFDF7',
    border: T.GOLD_BORDER,
    labelColor: T.GOLD,
  },
  cite: {
    stripe: T.NAVY,
    bg: '#FBF7EC',
    border: 'rgba(27, 42, 74, 0.16)',
    labelColor: T.NAVY,
  },
  disclaimer: {
    stripe: T.NAVY,
    bg: T.PARCHMENT_DEEP,
    border: 'rgba(27, 42, 74, 0.18)',
    labelColor: T.NAVY,
  },
  critical: {
    stripe: T.RED,
    bg: T.RED_BG,
    border: 'rgba(168, 53, 30, 0.30)',
    labelColor: T.RED,
  },
};

export function Callout({ variant = 'info', label, title, children, footer, dense }) {
  const v = VARIANT[variant];
  return (
    <div
      style={{
        position: 'relative',
        background: v.bg,
        border: `1px solid ${v.border}`,
        borderRadius: 6,
        padding: dense ? '12px 16px 12px 20px' : '16px 20px 16px 24px',
        fontFamily: T.FONT_BODY,
        color: T.NAVY,
        lineHeight: 1.55,
        fontSize: 14,
      }}
    >
      <div style={{
        position: 'absolute', top: 0, bottom: 0, left: 0, width: 4,
        background: v.stripe, borderRadius: '6px 0 0 6px',
      }} />
      {label && (
        <div style={{
          fontSize: 10.5, letterSpacing: '0.14em', fontWeight: 700,
          textTransform: 'uppercase', color: v.labelColor, marginBottom: 6,
        }}>
          {label}
        </div>
      )}
      {title && (
        <div style={{
          fontFamily: T.FONT_DISPLAY, fontSize: 18, fontWeight: 600,
          color: T.NAVY, marginBottom: 6, lineHeight: 1.25,
        }}>
          {title}
        </div>
      )}
      <div style={{ color: T.NAVY_70 }}>
        {children}
      </div>
      {footer && (
        <div style={{
          marginTop: 12, paddingTop: 10,
          borderTop: `1px dashed ${v.border}`,
        }}>
          {footer}
        </div>
      )}
    </div>
  );
}

export function Cite({ children }) {
  return (
    <span style={{
      fontFamily: T.FONT_DISPLAY, fontStyle: 'italic',
      color: T.NAVY, fontSize: '0.96em',
    }}>{children}</span>
  );
}

export function LearnMore({ children, label = 'Want to learn more about how we arrived at this rule of thumb?' }) {
  const [open, setOpen] = useState(false);
  return (
    <div>
      <button
        onClick={() => setOpen(!open)}
        style={{
          display: 'inline-flex', alignItems: 'center', gap: 6,
          background: 'transparent', border: 0, padding: 0, cursor: 'pointer',
          fontFamily: T.FONT_BODY, fontSize: 13, fontWeight: 600, color: T.GOLD,
          textDecoration: 'underline', textUnderlineOffset: 3,
        }}
      >
        <span style={{
          display: 'inline-block', width: 9,
          transform: open ? 'rotate(90deg)' : 'rotate(0deg)',
          transition: 'transform 160ms ease',
        }}>▸</span>
        {label}
      </button>
      {open && (
        <div style={{
          marginTop: 12, paddingTop: 12,
          borderTop: '1px solid rgba(27, 42, 74, 0.10)',
          fontSize: 13.5, color: T.NAVY_70, lineHeight: 1.65,
        }}>
          {children}
        </div>
      )}
    </div>
  );
}
