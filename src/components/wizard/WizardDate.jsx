'use client';

/**
 * WizardDate — native HTML5 date input, chrome-matched to the foundation
 * form aesthetic (extension primitive v1.1). Controlled (foundation Q-4):
 * owns no value state; emits onChange(field, value). Storage is ISO 8601
 * (`YYYY-MM-DD`, the native input default); locale display is delegated
 * to the browser's native picker. There is no explicit v1 min/max prop
 * API — any native attribute (`min`, `max`, `step`, `required`, …) is
 * forwarded verbatim via the `...rest` spread, which sits *before* the
 * controlled attributes so the type/value/onChange contract always wins.
 *
 * Chrome and states mirror WizardField (foundation Q-1/Q-2/Q-7): 36px,
 * 1px T.LINE_STRONG border, T.PARCHMENT bg, T.INK text, Inter 14px;
 * gold focus ring; red border + inline message on error; muted text +
 * grey fill + not-allowed on disabled (no opacity reduction). Inline T
 * tokens only (foundation Q-0b — no CSS variables). `accent-color` tints
 * the native picker popup gold. Spec:
 * Roadmap/Architecture/Wizard-Design-Spec.md §WizardDate.
 *
 * @param {object} props
 * @param {string} props.label visible field label
 * @param {string} props.field controlled-field key passed back to onChange
 * @param {string} [props.value] controlled ISO value ("YYYY-MM-DD" or "")
 * @param {(field: string, value: string) => void} [props.onChange] change handler
 * @param {string|null} [props.error] error message; red border + inline text
 * @param {boolean} [props.disabled] muted, not-allowed, no opacity (Q-2)
 * @param {string} [props.data-testid] input test id (default 'wizard-date-input')
 * @param {object} [props.rest] any native <input> attribute, forwarded verbatim
 * @returns {JSX.Element}
 */

import { useId, useState } from 'react';
import { T } from '@/src/lib/brand/tokens';

export default function WizardDate({
  label,
  field,
  value,
  onChange,
  error,
  disabled,
  'data-testid': testId = 'wizard-date-input',
  ...rest
}) {
  const autoId = useId();
  const inputId = `wd-${autoId}`;
  const errId = `${inputId}-err`;

  const [focused, setFocused] = useState(false);

  let borderColor = T.LINE_STRONG;
  let outlineWidth = '0';
  let outlineStyle = 'none';
  let outlineColor = 'transparent';
  if (error) {
    borderColor = T.RED;
    outlineWidth = '3px';
    outlineStyle = 'solid';
    outlineColor = 'rgba(168, 53, 30, 0.20)';
  } else if (focused) {
    borderColor = T.GOLD;
    outlineWidth = '3px';
    outlineStyle = 'solid';
    outlineColor = T.GOLD_FOCUS_RING;
  }

  const inputStyle = {
    width: '100%',
    height: '36px',
    boxSizing: 'border-box',
    borderRadius: '7px',
    border: `1px solid ${borderColor}`,
    outlineWidth,
    outlineStyle,
    outlineColor,
    fontSize: '14px',
    fontFamily: T.FONT_BODY,
    color: disabled ? T.MUTED : T.INK,
    backgroundColor: disabled ? T.NAVY_06 : T.PARCHMENT,
    cursor: disabled ? 'not-allowed' : 'auto',
    accentColor: T.GOLD,
    padding: '0 12px',
    transition: 'border-color 120ms ease, outline-color 120ms ease',
  };

  return (
    <div data-testid="wizard-date" style={{ position: 'relative' }}>
      <label
        htmlFor={inputId}
        style={{
          display: 'block',
          marginBottom: '6px',
          fontSize: '12.5px',
          fontWeight: 600,
          color: T.INK,
          fontFamily: T.FONT_BODY,
        }}
      >
        {label}
      </label>
      <input
        {...rest}
        id={inputId}
        data-testid={testId}
        type="date"
        value={value ?? ''}
        disabled={disabled || undefined}
        aria-disabled={disabled ? 'true' : undefined}
        aria-invalid={error ? 'true' : undefined}
        aria-describedby={error ? errId : undefined}
        onChange={(e) => onChange?.(field, e.target.value)}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        style={inputStyle}
      />
      {error ? (
        <div
          id={errId}
          data-testid="wizard-date-error"
          style={{ fontSize: '11px', color: T.RED, marginTop: '4px' }}
        >
          {error}
        </div>
      ) : null}
    </div>
  );
}
