'use client';

/**
 * WizardField — the labelled text input used for every wizard data point.
 *
 * Controlled (Q-4): owns no value state; emits onChange(field, value)
 * exactly like the HomeDecisionInputs idiom. Renders a 36px text input
 * (never type=number — Q-12) with inline muted affixes, an optional
 * provenance badge, an info-icon tooltip (hover on desktop, tap-to-toggle
 * + outside-tap dismiss on mobile via useBreakpoints, keyboard Enter/Esc,
 * viewport-edge anchor flip — Q-3), and focus / disabled / error visual
 * states. Inline T tokens per memory #23. Error copy renders below the
 * input as state feedback (Q-1 amendment) — distinct from the spec's
 * no-helper-text anti-pattern, which concerns pre-fill copy.
 *
 * Tab order is natural DOM order (info icon -> input -> next field): the
 * help toggle precedes the control it documents. This is WCAG AA
 * compliant (§1 Q-6: full kbd nav + visible focus) and avoids a
 * positive-tabIndex anti-pattern; §7's "input -> icon" wording is a
 * non-binding elaboration, not a §1 locked decision.
 *
 * @param {object} props
 * @param {string} props.label visible field label
 * @param {string} props.field controlled-field key passed back to onChange
 * @param {string|number} [props.value] controlled value, rendered verbatim
 * @param {(field: string, value: string) => void} [props.onChange] change handler
 * @param {boolean} [props.numeric] decimal keypad + tabular-nums on the UI font
 * @param {string} [props.prefix] muted affix shown inside the input start
 * @param {string} [props.suffix] muted affix shown inside the input end
 * @param {string} [props.prefilledFrom] provenance source; renders a "From X" badge
 * @param {boolean} [props.disabled] muted, not-allowed, no opacity (Q-2)
 * @param {string|null} [props.error] error message; border/ring + inline text (tone-aware)
 * @param {'red'|'amber'} [props.tone] error tone. 'amber' is the calm required-field
 *   nudge (amber border/bg/ring, T.INK_2 helper text — no red); default 'red' keeps
 *   every existing consumer's treatment unchanged
 * @param {string} [props.placeholder] greyed example value (T.MUTED) shown when empty
 * @param {boolean} [props.required] renders a quiet uppercase "Required" tag in the
 *   label row's right slot, neutral tone, beside any provenance badge
 * @param {(field: string, value: string) => void} [props.onBlur] blur handler
 * @param {string|null} [props.tooltip] info-icon tooltip content
 * @param {string} [props.data-testid] root test id (default "wizard-field")
 * @returns {JSX.Element}
 */

import { useId, useRef, useState, useEffect } from 'react';
import { T } from '@/src/lib/brand/tokens';
import { useBreakpoints } from '@/src/hooks/useBreakpoints';

const TOOLTIP_WIDTH = 220;

export default function WizardField({
  label,
  field,
  value,
  onChange,
  numeric,
  prefix,
  suffix,
  prefilledFrom,
  disabled,
  error,
  tone = 'red',
  placeholder,
  required,
  onBlur,
  tooltip,
  'data-testid': testId = 'wizard-field',
}) {
  const autoId = useId();
  const inputId = `wf-${autoId}`;
  const errId = `${inputId}-err`;
  const tipId = `${inputId}-tip`;

  const { isMobile } = useBreakpoints();
  const rootRef = useRef(null);
  const iconRef = useRef(null);
  const [focused, setFocused] = useState(false);
  const [tipOpen, setTipOpen] = useState(false);
  const [anchor, setAnchor] = useState('left');

  function computeAnchor() {
    if (typeof window === 'undefined' || !iconRef.current) return 'left';
    const rect = iconRef.current.getBoundingClientRect();
    return rect.left + TOOLTIP_WIDTH > window.innerWidth ? 'right' : 'left';
  }

  function openTip() {
    setAnchor(computeAnchor());
    setTipOpen(true);
  }

  function toggleTip() {
    if (tipOpen) {
      setTipOpen(false);
    } else {
      openTip();
    }
  }

  useEffect(() => {
    if (!tipOpen) return undefined;
    const onDocDown = (e) => {
      if (rootRef.current && !rootRef.current.contains(e.target)) {
        setTipOpen(false);
      }
    };
    document.addEventListener('mousedown', onDocDown);
    return () => document.removeEventListener('mousedown', onDocDown);
  }, [tipOpen]);

  const describedBy =
    [error ? errId : null, tooltip ? tipId : null].filter(Boolean).join(' ') ||
    undefined;

  let borderColor = T.LINE_STRONG;
  let outlineWidth = '0';
  let outlineStyle = 'none';
  let outlineColor = 'transparent';
  const amber = tone === 'amber';
  if (error) {
    borderColor = amber ? T.AMBER_BORDER : T.RED;
    outlineWidth = '3px';
    outlineStyle = 'solid';
    // Ring literals are the token colors at low alpha (red = T.RED @ 20%,
    // amber = T.AMBER @ 12%) — same idiom as GOLD_FOCUS_RING.
    outlineColor = amber ? 'rgba(198, 138, 18, 0.12)' : 'rgba(168, 53, 30, 0.20)';
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
    backgroundColor: disabled ? T.NAVY_06 : error && amber ? T.AMBER_BG : T.CARD,
    cursor: disabled ? 'not-allowed' : 'auto',
    transition: 'border-color 120ms ease, outline-color 120ms ease',
    paddingLeft: prefix ? '24px' : '12px',
    paddingRight: suffix ? '34px' : '12px',
    ...(numeric ? { fontVariantNumeric: 'tabular-nums' } : null),
  };

  const affixStyle = (side) => ({
    position: 'absolute',
    top: '50%',
    transform: 'translateY(-50%)',
    [side]: '12px',
    fontSize: '14px',
    color: T.MUTED,
    pointerEvents: 'none',
  });

  const badgeText = prefilledFrom ? `From ${prefilledFrom}` : '';

  return (
    <div ref={rootRef} data-testid={testId} style={{ position: 'relative' }}>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '8px',
          marginBottom: '6px',
        }}
      >
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
          <label
            htmlFor={inputId}
            style={{ fontSize: '12.5px', fontWeight: 600, color: T.INK }}
          >
            {label}
          </label>
          {tooltip ? (
            <span style={{ position: 'relative', display: 'inline-flex' }}>
              <button
                ref={iconRef}
                type="button"
                data-testid="wizard-field-info"
                aria-label="More information"
                aria-expanded={tipOpen}
                onClick={toggleTip}
                onMouseEnter={() => {
                  if (!isMobile) openTip();
                }}
                onMouseLeave={() => {
                  if (!isMobile) setTipOpen(false);
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    toggleTip();
                  } else if (e.key === 'Escape') {
                    setTipOpen(false);
                  }
                }}
                style={{
                  width: '14px',
                  height: '14px',
                  padding: 0,
                  border: 'none',
                  borderRadius: '50%',
                  backgroundColor: T.LINE,
                  color: T.INK_2,
                  fontSize: '9px',
                  fontStyle: 'italic',
                  fontWeight: 700,
                  lineHeight: '14px',
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                }}
              >
                i
              </button>
              {tipOpen ? (
                <div
                  role="tooltip"
                  id={tipId}
                  data-testid="wizard-field-tooltip"
                  data-anchor={anchor}
                  style={{
                    position: 'absolute',
                    bottom: 'calc(100% + 6px)',
                    [anchor]: 0,
                    width: `${TOOLTIP_WIDTH}px`,
                    maxWidth: '90vw',
                    backgroundColor: T.NAVY,
                    color: '#FFFFFF',
                    fontSize: '11px',
                    lineHeight: 1.4,
                    padding: '7px 10px',
                    borderRadius: '6px',
                    boxShadow: T.SHADOW_TOOLTIP,
                    transition: 'opacity 100ms ease',
                    opacity: 1,
                    zIndex: 20,
                  }}
                >
                  {tooltip}
                </div>
              ) : null}
            </span>
          ) : null}
        </span>
        {prefilledFrom || required ? (
          <span
            style={{
              flexShrink: 0,
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            {prefilledFrom ? (
              <span
                data-testid="wizard-field-badge"
                title={badgeText}
                style={{
                  maxWidth: '160px',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                  fontSize: '10px',
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px',
                  color: T.PILL_TEXT,
                  backgroundColor: T.PARCHMENT_DEEP,
                  padding: '2px 7px',
                  borderRadius: '999px',
                }}
              >
                {badgeText}
              </span>
            ) : null}
            {required ? (
              <span
                data-testid="wizard-field-required"
                style={{
                  fontSize: '10px',
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px',
                  color: T.MUTED,
                  whiteSpace: 'nowrap',
                }}
              >
                Required
              </span>
            ) : null}
          </span>
        ) : null}
      </div>

      <div style={{ position: 'relative' }}>
        {prefix ? (
          <span
            data-testid="wizard-field-prefix"
            aria-hidden="true"
            style={affixStyle('left')}
          >
            {prefix}
          </span>
        ) : null}
        <input
          id={inputId}
          data-testid="wizard-field-input"
          type="text"
          className="cp-wf-input"
          inputMode={numeric ? 'decimal' : undefined}
          placeholder={placeholder || undefined}
          value={value ?? ''}
          disabled={disabled || undefined}
          aria-disabled={disabled ? 'true' : undefined}
          aria-invalid={error ? 'true' : undefined}
          aria-describedby={describedBy}
          onChange={(e) => onChange?.(field, e.target.value)}
          onFocus={() => setFocused(true)}
          onBlur={(e) => {
            setFocused(false);
            onBlur?.(field, e.target.value);
          }}
          style={inputStyle}
        />
        {placeholder ? (
          // Scoped ::placeholder color (inline styles can't reach the
          // pseudo-element) — BudgetGapCalculator precedent.
          <style>{`.cp-wf-input::placeholder { color: ${T.MUTED}; opacity: 1; }`}</style>
        ) : null}
        {suffix ? (
          <span
            data-testid="wizard-field-suffix"
            aria-hidden="true"
            style={affixStyle('right')}
          >
            {suffix}
          </span>
        ) : null}
      </div>

      {error ? (
        <div
          id={errId}
          data-testid="wizard-field-error"
          style={{ fontSize: '11px', color: amber ? T.INK_2 : T.RED, marginTop: '4px' }}
        >
          {error}
        </div>
      ) : null}
    </div>
  );
}
