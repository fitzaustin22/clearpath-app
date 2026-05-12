'use client';

import { useState, useEffect } from 'react';
import {
  NAVY, GOLD, PARCHMENT, WHITE, AMBER, RED, MUTED, BORDER, BORDER_DIM, SURFACE_DIM,
  SOURCE, BANNER_VARIANTS,
} from '../_styles.js';

// ─── Shared local field components — m4 inline-style idiom ──────────────

function parseNumberOrNull(s) {
  if (s === '' || s === null || s === undefined) return null;
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}

export function CurrencyInput({ id, label, helper, value, onChange, errorText, disabled, min = 0 }) {
  const [display, setDisplay] = useState(value != null && value > 0 ? String(value) : '');

  useEffect(() => {
    setDisplay(value != null && value > 0 ? String(value) : '');
  }, [value]);

  const hasError = !!errorText;
  return (
    <div style={{ marginBottom: 14 }}>
      <label
        htmlFor={id}
        style={{
          display: 'block',
          fontFamily: SOURCE,
          fontSize: 14,
          fontWeight: 600,
          color: NAVY,
          marginBottom: 6,
        }}
      >
        {label}
      </label>
      <div style={{ position: 'relative' }}>
        <span
          style={{
            position: 'absolute', left: 12, top: '50%',
            transform: 'translateY(-50%)',
            fontFamily: SOURCE, color: disabled ? MUTED : NAVY,
            fontSize: 16, pointerEvents: 'none',
          }}
        >$</span>
        <input
          id={id}
          type="text"
          inputMode="decimal"
          value={display}
          disabled={disabled}
          onChange={(e) => {
            const cleaned = e.target.value.replace(/[^0-9.]/g, '');
            setDisplay(cleaned);
            const parsed = parseNumberOrNull(cleaned);
            onChange(parsed == null ? null : Math.max(min, parsed));
          }}
          style={{
            width: '100%',
            padding: '10px 12px 10px 24px',
            fontFamily: SOURCE, fontSize: 16, color: NAVY,
            border: `1px solid ${hasError ? RED : (disabled ? BORDER_DIM : BORDER)}`,
            borderRadius: 6,
            backgroundColor: disabled ? SURFACE_DIM : WHITE,
            outline: 'none', boxSizing: 'border-box',
          }}
        />
      </div>
      {helper && !hasError && (
        <p style={{ fontFamily: SOURCE, fontSize: 13, color: MUTED, margin: '6px 0 0' }}>{helper}</p>
      )}
      {hasError && (
        <p style={{ fontFamily: SOURCE, fontSize: 13, color: RED, margin: '6px 0 0' }}>{errorText}</p>
      )}
    </div>
  );
}

export function NumberInput({ id, label, helper, value, onChange, errorText, min = 0, max, step = 1 }) {
  const hasError = !!errorText;
  return (
    <div style={{ marginBottom: 14 }}>
      <label
        htmlFor={id}
        style={{
          display: 'block', fontFamily: SOURCE,
          fontSize: 14, fontWeight: 600, color: NAVY,
          marginBottom: 6,
        }}
      >
        {label}
      </label>
      <input
        id={id}
        type="number"
        inputMode="decimal"
        min={min}
        max={max}
        step={step}
        value={value == null ? '' : value}
        onChange={(e) => {
          const v = e.target.value;
          if (v === '') return onChange(null);
          const parsed = Number(v);
          onChange(Number.isFinite(parsed) ? parsed : null);
        }}
        style={{
          width: '100%',
          padding: '10px 12px',
          fontFamily: SOURCE, fontSize: 16, color: NAVY,
          border: `1px solid ${hasError ? RED : BORDER}`,
          borderRadius: 6, backgroundColor: WHITE, outline: 'none',
          boxSizing: 'border-box',
        }}
      />
      {helper && !hasError && (
        <p style={{ fontFamily: SOURCE, fontSize: 13, color: MUTED, margin: '6px 0 0' }}>{helper}</p>
      )}
      {hasError && (
        <p style={{ fontFamily: SOURCE, fontSize: 13, color: RED, margin: '6px 0 0' }}>{errorText}</p>
      )}
    </div>
  );
}

export function SelectField({ id, label, helper, value, onChange, options, errorText }) {
  const hasError = !!errorText;
  return (
    <div style={{ marginBottom: 14 }}>
      <label
        htmlFor={id}
        style={{
          display: 'block', fontFamily: SOURCE,
          fontSize: 14, fontWeight: 600, color: NAVY,
          marginBottom: 6,
        }}
      >
        {label}
      </label>
      <select
        id={id}
        value={value ?? ''}
        onChange={(e) => onChange(e.target.value)}
        style={{
          width: '100%',
          padding: '10px 12px',
          fontFamily: SOURCE, fontSize: 16, color: NAVY,
          border: `1px solid ${hasError ? RED : BORDER}`,
          borderRadius: 6, backgroundColor: WHITE, outline: 'none',
          boxSizing: 'border-box',
        }}
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>{opt.label}</option>
        ))}
      </select>
      {helper && !hasError && (
        <p style={{ fontFamily: SOURCE, fontSize: 13, color: MUTED, margin: '6px 0 0' }}>{helper}</p>
      )}
      {hasError && (
        <p style={{ fontFamily: SOURCE, fontSize: 13, color: RED, margin: '6px 0 0' }}>{errorText}</p>
      )}
    </div>
  );
}

export function RadioGroup({ id, label, helper, value, onChange, options }) {
  return (
    <div style={{ marginBottom: 18 }}>
      <div style={{ fontFamily: SOURCE, fontSize: 14, fontWeight: 600, color: NAVY, marginBottom: 8 }}>
        {label}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {options.map((opt) => {
          const selected = value === opt.value;
          return (
            <label
              key={opt.value}
              htmlFor={`${id}-${opt.value}`}
              style={{
                display: 'flex', alignItems: 'center', gap: 10,
                padding: '8px 12px',
                fontFamily: SOURCE, fontSize: 14,
                color: NAVY,
                border: `1px solid ${selected ? NAVY : BORDER}`,
                backgroundColor: selected ? PARCHMENT : WHITE,
                borderRadius: 6, cursor: 'pointer',
              }}
            >
              <input
                id={`${id}-${opt.value}`}
                type="radio"
                name={id}
                value={opt.value}
                checked={selected}
                onChange={() => onChange(opt.value)}
                style={{ accentColor: NAVY }}
              />
              <span>{opt.label}</span>
            </label>
          );
        })}
      </div>
      {helper && (
        <p style={{ fontFamily: SOURCE, fontSize: 13, color: MUTED, margin: '6px 0 0' }}>{helper}</p>
      )}
    </div>
  );
}

export function Toggle({ id, label, value, onChange, helper }) {
  return (
    <div style={{ marginBottom: 14 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <button
          id={id}
          type="button"
          role="switch"
          aria-checked={value}
          onClick={() => onChange(!value)}
          style={{
            position: 'relative',
            width: 44, height: 24,
            borderRadius: 999,
            border: 'none',
            backgroundColor: value ? NAVY : BORDER,
            cursor: 'pointer',
            transition: 'background-color 120ms ease',
            padding: 0,
          }}
        >
          <span
            aria-hidden
            style={{
              position: 'absolute',
              top: 2, left: value ? 22 : 2,
              width: 20, height: 20, borderRadius: '50%',
              backgroundColor: WHITE,
              transition: 'left 120ms ease',
            }}
          />
        </button>
        <label
          htmlFor={id}
          style={{
            fontFamily: SOURCE, fontSize: 14, fontWeight: 600,
            color: NAVY, cursor: 'pointer',
          }}
        >
          {label}
        </label>
      </div>
      {helper && (
        <p style={{ fontFamily: SOURCE, fontSize: 13, color: MUTED, margin: '6px 0 0 56px' }}>
          {helper}
        </p>
      )}
    </div>
  );
}

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
