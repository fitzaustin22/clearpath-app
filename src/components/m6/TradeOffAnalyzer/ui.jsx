'use client';

/**
 * Trade-Off Analyzer — shared presentational primitives.
 *
 * Stateless, token-driven (inline T per the brand-token idiom). No store reads,
 * no copy literals — callers pass children/labels so every user-facing string
 * stays in copy.js. Mirrors the per-tool ui.jsx pattern established by the
 * Priorities Worksheet (each M6 tool owns its presentational primitives). The
 * lock affordance always pairs the icon with a text label ("Private") so meaning
 * is never carried by colour alone.
 */

import { Lock } from 'lucide-react';
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

// Small inline gold-tinted button used for picker chips and "Add".
export function ChipButton({ onClick, children, ariaLabel }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={ariaLabel}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 6,
        backgroundColor: T.GOLD_TINT,
        color: T.PILL_TEXT,
        fontFamily: T.FONT_BODY,
        fontWeight: 600,
        fontSize: 13,
        padding: '6px 14px',
        borderRadius: 999,
        border: `1px solid ${T.GOLD_BORDER}`,
        cursor: 'pointer',
      }}
    >
      {children}
    </button>
  );
}

// Lock + text label. `label` is supplied by the caller (from copy.js); the icon
// is decorative and the word carries the meaning, so it never relies on colour.
export function LockBadge({ label }) {
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 4,
        fontFamily: T.FONT_BODY,
        fontWeight: 700,
        fontSize: 11,
        textTransform: 'uppercase',
        letterSpacing: '0.6px',
        color: T.PILL_TEXT,
      }}
    >
      <Lock size={12} aria-hidden="true" />
      {label}
    </span>
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
