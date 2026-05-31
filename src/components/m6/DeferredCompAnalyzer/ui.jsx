'use client';

// Shared presentational primitives for the Deferred Compensation Analyzer.
// Brand via the central T tokens (inline-style idiom); no hardcoded hex.

import { T } from '@/src/lib/brand/tokens';

export function PrimaryButton({ onClick, disabled, children, 'data-testid': testId }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      data-testid={testId}
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

export function SecondaryButton({ onClick, children, 'data-testid': testId }) {
  return (
    <button
      type="button"
      onClick={onClick}
      data-testid={testId}
      style={{
        backgroundColor: 'transparent',
        color: T.NAVY,
        fontFamily: T.FONT_BODY,
        fontWeight: 600,
        fontSize: 15,
        padding: '12px 20px',
        borderRadius: 8,
        border: `1px solid ${T.LINE_STRONG}`,
        cursor: 'pointer',
      }}
    >
      {children}
    </button>
  );
}

export function NavRow({ onBack, onNext, backLabel = 'Back', nextLabel = 'Continue', nextDisabled, nextTestId = 'dca-next', backTestId = 'dca-back' }) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: onBack ? 'space-between' : 'flex-end',
        gap: 16,
        marginTop: 24,
      }}
    >
      {onBack && (
        <SecondaryButton onClick={onBack} data-testid={backTestId}>
          {backLabel}
        </SecondaryButton>
      )}
      {onNext && (
        <PrimaryButton onClick={onNext} disabled={nextDisabled} data-testid={nextTestId}>
          {nextLabel}
        </PrimaryButton>
      )}
    </div>
  );
}

export function StepHeading({ title, subhead }) {
  return (
    <div style={{ marginBottom: 20 }}>
      <h2
        style={{
          fontFamily: T.FONT_DISPLAY,
          fontWeight: 700,
          fontSize: 24,
          color: T.NAVY,
          margin: 0,
          lineHeight: 1.25,
        }}
      >
        {title}
      </h2>
      {subhead && (
        <p
          style={{
            fontFamily: T.FONT_BODY,
            fontSize: 15,
            color: T.INK_2,
            margin: '8px 0 0 0',
            lineHeight: 1.5,
          }}
        >
          {subhead}
        </p>
      )}
    </div>
  );
}

// The compliance backbone, rendered with a gold rail so it reads as important.
export function Disclaimer({ heading, children, 'data-testid': testId = 'dca-disclaimer' }) {
  return (
    <div
      data-testid={testId}
      style={{
        marginTop: 20,
        padding: '14px 16px',
        border: `1px solid ${T.GOLD_BORDER}`,
        borderLeft: `3px solid ${T.GOLD}`,
        borderRadius: 8,
        backgroundColor: T.GOLD_TINT,
        fontFamily: T.FONT_BODY,
        fontSize: 13.5,
        lineHeight: 1.55,
        color: T.INK,
      }}
    >
      {heading && (
        <div
          style={{
            fontWeight: 700,
            fontSize: 12,
            letterSpacing: '0.05em',
            textTransform: 'uppercase',
            color: T.PILL_TEXT,
            marginBottom: 6,
          }}
        >
          {heading}
        </div>
      )}
      {children}
    </div>
  );
}

// A bordered panel (used for the Hug / Nelson side-by-side cards and lists).
export function Panel({ children, style, 'data-testid': testId }) {
  return (
    <div
      data-testid={testId}
      style={{
        border: `1px solid ${T.LINE}`,
        borderRadius: 10,
        padding: 16,
        backgroundColor: T.CARD,
        ...style,
      }}
    >
      {children}
    </div>
  );
}
