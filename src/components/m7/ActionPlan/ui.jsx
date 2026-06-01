'use client';

/**
 * Action Plan & Timeline — shared presentational primitives.
 *
 * Stateless, token-driven (inline T per the brand-token idiom). No store reads,
 * no copy literals — callers pass children/labels so every user-facing string
 * stays in copy.js. Mirrors the M6 Priorities ui.jsx primitives.
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

// Small inline gold-tinted button used for chips and quick-adds.
export function ChipButton({ onClick, children, ariaLabel }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={ariaLabel}
      style={{
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

// Subtle text button for inline "Remove" / "Dismiss" affordances.
export function GhostButton({ onClick, children, ariaLabel }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={ariaLabel}
      style={{
        backgroundColor: 'transparent',
        color: T.NAVY_55,
        fontFamily: T.FONT_BODY,
        fontWeight: 600,
        fontSize: 13,
        padding: '6px 10px',
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

// A bordered container for one editable list row.
export function RowCard({ children }) {
  return (
    <div
      style={{
        border: `1px solid ${T.LINE}`,
        borderRadius: 8,
        padding: 16,
        backgroundColor: T.CARD,
        marginBottom: 12,
      }}
    >
      {children}
    </div>
  );
}
