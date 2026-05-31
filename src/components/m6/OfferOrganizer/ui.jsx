'use client';

/**
 * Settlement Offer Organizer — shared presentational primitives.
 *
 * Stateless, token-driven (inline T per the brand-token idiom). No store reads,
 * no copy literals — callers pass children/labels so every user-facing string
 * stays in copy.js. Mirrors the per-tool ui.jsx pattern (each M6 tool owns its
 * presentational primitives).
 *
 * StatusPill is deliberately INFORMATIONAL, not evaluative: addressed = soft
 * gold, silent = neutral gray. Never green/red — the tool never codes an offer
 * as good or bad.
 */

import { T } from '@/src/lib/brand/tokens';

export function PrimaryButton({ onClick, disabled = false, children, type = 'button' }) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      style={{
        backgroundColor: T.NAVY,
        color: T.CARD,
        fontFamily: T.FONT_BODY,
        fontWeight: 600,
        fontSize: 15,
        padding: '12px 24px',
        borderRadius: 8,
        border: 'none',
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.45 : 1,
      }}
    >
      {children}
    </button>
  );
}

export function SecondaryButton({ onClick, children, type = 'button' }) {
  return (
    <button
      type={type}
      onClick={onClick}
      style={{
        backgroundColor: 'transparent',
        color: T.NAVY_55,
        fontFamily: T.FONT_BODY,
        fontWeight: 600,
        fontSize: 14,
        padding: '12px 8px',
        border: 'none',
        cursor: 'pointer',
      }}
    >
      {children}
    </button>
  );
}

export function Disclaimer({ children }) {
  return (
    <p
      style={{
        fontFamily: T.FONT_BODY,
        fontSize: 13,
        lineHeight: 1.5,
        color: T.INK_2,
        backgroundColor: T.PARCHMENT_DEEP,
        borderRadius: 8,
        padding: '12px 16px',
        margin: 0,
      }}
    >
      {children}
    </p>
  );
}

// Section heading inside the Enter step / Review blocks.
export function FieldLabel({ children }) {
  return (
    <p style={{ fontFamily: T.FONT_BODY, fontWeight: 700, fontSize: 14, color: T.NAVY, margin: '0 0 6px 0' }}>
      {children}
    </p>
  );
}

export const inputStyle = {
  width: '100%',
  fontFamily: T.FONT_BODY,
  fontSize: 15,
  color: T.INK,
  padding: '10px 12px',
  borderRadius: 8,
  border: `1px solid ${T.LINE_STRONG}`,
  backgroundColor: T.CARD,
  boxSizing: 'border-box',
};

export function StatusPill({ status }) {
  const addressed = status === 'addressed';
  return (
    <span
      style={{
        fontFamily: T.FONT_BODY,
        fontWeight: 600,
        fontSize: 12,
        letterSpacing: '0.02em',
        padding: '2px 10px',
        borderRadius: 999,
        whiteSpace: 'nowrap',
        color: addressed ? T.PILL_TEXT : T.NAVY_55,
        backgroundColor: addressed ? T.GOLD_TINT : T.NAVY_06,
      }}
    >
      {addressed ? 'Addressed' : 'Silent'}
    </span>
  );
}
