'use client';
import { T } from '@/src/lib/brand/tokens';

export function Eyebrow({ children }) {
  return (
    <div style={{ fontFamily: T.FONT_BODY, fontSize: 11, fontWeight: 700, letterSpacing: '0.9px',
      textTransform: 'uppercase', color: T.PILL_TEXT }}>{children}</div>
  );
}

export function StepHeading({ heading, sub }) {
  return (
    <div style={{ marginBottom: 18 }}>
      <h1 style={{ fontFamily: T.FONT_DISPLAY, fontWeight: 700, fontSize: 30, lineHeight: 1.18,
        color: T.INK, margin: '6px 0 8px' }}>{heading}</h1>
      <p style={{ fontFamily: T.FONT_BODY, fontSize: 16, lineHeight: 1.55, color: T.INK_2,
        maxWidth: 600, margin: 0 }}>{sub}</p>
    </div>
  );
}

export function PrimaryButton({ onClick, disabled, children, 'data-testid': testId }) {
  return (
    <button type="button" onClick={onClick} disabled={disabled} data-testid={testId}
      style={{ backgroundColor: T.GOLD, color: T.NAVY, fontFamily: T.FONT_BODY, fontWeight: 700,
        fontSize: 14, padding: '11px 24px', borderRadius: 8, border: 'none',
        cursor: disabled ? 'not-allowed' : 'pointer', opacity: disabled ? 0.5 : 1 }}>
      {children}
    </button>
  );
}

export function SecondaryButton({ onClick, children, 'data-testid': testId }) {
  return (
    <button type="button" onClick={onClick} data-testid={testId}
      style={{ backgroundColor: 'transparent', color: T.GOLD, fontFamily: T.FONT_BODY, fontWeight: 600,
        fontSize: 14, padding: '10px 20px', borderRadius: 8, border: `1px solid ${T.GOLD}`, cursor: 'pointer' }}>
      {children}
    </button>
  );
}

// Navy footer CTA bar (steps 1–3). title/sub on the left, Back + Continue on the right.
export function FooterCTA({ title, sub, showBack, onBack, onNext, nextLabel }) {
  return (
    <div style={{ backgroundColor: T.NAVY, padding: '16px 22px', borderRadius: 12, marginTop: 16,
      display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16 }}>
      <div>
        <div style={{ fontFamily: T.FONT_DISPLAY, fontWeight: 500, fontSize: 18, color: T.CARD }}>{title}</div>
        <div style={{ fontFamily: T.FONT_BODY, fontSize: 13, color: 'rgba(255,255,255,.6)' }}>{sub}</div>
      </div>
      <div style={{ display: 'flex', gap: 10 }}>
        {showBack && <SecondaryButton onClick={onBack} data-testid="se-back">Back</SecondaryButton>}
        <PrimaryButton onClick={onNext} data-testid="se-next">{nextLabel}</PrimaryButton>
      </div>
    </div>
  );
}

export function Disclaimer({ label, children }) {
  return (
    <div style={{ borderLeft: `3px solid ${T.GOLD}`, backgroundColor: T.GOLD_TINT, borderRadius: 8,
      padding: '14px 16px' }}>
      {label ? (
        <div style={{ fontFamily: T.FONT_BODY, fontSize: 12, fontWeight: 700, color: T.PILL_TEXT,
          textTransform: 'uppercase', letterSpacing: '0.4px', marginBottom: 6 }}>{label}</div>
      ) : null}
      <div style={{ fontFamily: T.FONT_BODY, fontSize: 14, lineHeight: 1.55, color: T.INK_2 }}>{children}</div>
    </div>
  );
}
