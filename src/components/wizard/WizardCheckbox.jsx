'use client';

/**
 * WizardCheckbox — single-boolean primitive for the M5 wizard (a
 * foundation extension primitive, v1.2). Two visually distinct variants:
 *
 *  - 'checkbox' (default): native <input type="checkbox"> + a square 18px
 *    custom marker (line-strong unchecked, navy + gold checkmark checked)
 *    — mirrors the WizardRadio pattern of a hidden native input under a
 *    styled visual.
 *  - 'toggle': native <input type="checkbox"> styled as a switch (rounded
 *    track + white thumb). Checked-state track uses T.GOLD; unchecked
 *    track uses T.LINE_STRONG. No net-new tokens required.
 *
 * Controlled (foundation Q-4): owns no value state; emits
 * onChange(field, nextBoolean). Single boolean only — there is no
 * checkbox-group support; `value` is always a boolean (undefined is
 * treated as false). Inline T tokens only (foundation Q-0b — no CSS
 * variables). Spec: Roadmap/Architecture/Wizard-Design-Spec.md.
 *
 * Anatomy — documented deviation from WizardField: WizardField stacks
 * the label above the control, but WizardCheckbox renders the marker and
 * the label on a single inline row (marker on the left, label on the
 * right), with the optional info icon and provenance badge after the
 * label text. Inline error text drops below the row. This is the
 * label-beside pattern intentionally chosen here — future readers should
 * not "normalize" it back to label-above.
 *
 * @param {object} props
 * @param {string} props.label visible field label (rendered to the right of the control)
 * @param {string} props.field controlled-field key passed back to onChange
 * @param {boolean} [props.value] checked state (controlled)
 * @param {(field: string, value: boolean) => void} [props.onChange] change handler
 * @param {'checkbox'|'toggle'} [props.variant] visual variant (default 'checkbox')
 * @param {string} [props.prefilledFrom] provenance source; renders a "From X" badge
 * @param {boolean} [props.disabled] muted, not-allowed, no opacity (Q-2)
 * @param {string|null} [props.error] error message; red border + inline text
 * @param {string|null} [props.tooltip] info-icon tooltip content
 * @param {string} [props.data-testid] root test id (default 'wizard-checkbox')
 * @returns {JSX.Element}
 */

import { useId, useRef, useState, useEffect } from 'react';
import { T } from '@/src/lib/brand/tokens';
import { useBreakpoints } from '@/src/hooks/useBreakpoints';

const TOOLTIP_WIDTH = 220;

const HIDDEN_INPUT = {
  appearance: 'none',
  WebkitAppearance: 'none',
  position: 'absolute',
  opacity: 0,
  width: '1px',
  height: '1px',
  margin: 0,
};

export default function WizardCheckbox({
  label,
  field,
  value,
  onChange,
  variant = 'checkbox',
  prefilledFrom,
  disabled,
  error,
  tooltip,
  'data-testid': testId = 'wizard-checkbox',
}) {
  const autoId = useId();
  const inputId = `wc-${autoId}`;
  const errId = `${inputId}-err`;
  const tipId = `${inputId}-tip`;

  const { isMobile } = useBreakpoints();
  const rootRef = useRef(null);
  const iconRef = useRef(null);
  const [focused, setFocused] = useState(false);
  const [tipOpen, setTipOpen] = useState(false);
  const [anchor, setAnchor] = useState('left');

  const checked = value === true;

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

  const rowStyle = {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    cursor: disabled ? 'not-allowed' : 'pointer',
    color: disabled ? T.MUTED : T.INK,
    fontFamily: T.FONT_BODY,
    fontSize: '14px',
  };

  function renderSquareMarker() {
    let borderColor = T.LINE_STRONG;
    if (error) borderColor = T.RED;
    else if (checked) borderColor = T.NAVY;

    const markerStyle = {
      width: '18px',
      height: '18px',
      boxSizing: 'border-box',
      borderRadius: '4px',
      border: `2px solid ${borderColor}`,
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: disabled ? T.NAVY_06 : T.CARD,
      outlineWidth: focused ? '3px' : '0',
      outlineStyle: focused ? 'solid' : 'none',
      outlineColor: focused ? T.GOLD_FOCUS_RING : 'transparent',
      transition: 'border-color 120ms ease, outline-color 120ms ease',
    };
    return (
      <span
        aria-hidden="true"
        data-testid="wizard-checkbox-marker"
        style={markerStyle}
      >
        {checked ? (
          <svg
            data-testid="wizard-checkbox-check"
            width="10"
            height="8"
            viewBox="0 0 10 8"
            aria-hidden="true"
          >
            <path
              d="M1 4l3 3 5-6"
              fill="none"
              stroke={T.GOLD}
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        ) : null}
      </span>
    );
  }

  function renderTrack() {
    const trackBg = checked ? T.GOLD : T.LINE_STRONG;
    const trackBorder = error ? T.RED : 'transparent';
    const trackStyle = {
      position: 'relative',
      width: '32px',
      height: '18px',
      boxSizing: 'border-box',
      borderRadius: '9999px',
      border: `1px solid ${trackBorder}`,
      backgroundColor: disabled ? T.NAVY_06 : trackBg,
      outlineWidth: focused ? '3px' : '0',
      outlineStyle: focused ? 'solid' : 'none',
      outlineColor: focused ? T.GOLD_FOCUS_RING : 'transparent',
      transition:
        'background-color 120ms ease, border-color 120ms ease, outline-color 120ms ease',
    };
    const thumbStyle = {
      position: 'absolute',
      top: '1px',
      left: checked ? '15px' : '1px',
      width: '14px',
      height: '14px',
      borderRadius: '50%',
      backgroundColor: T.CARD,
      boxShadow: '0 1px 2px rgba(27, 42, 74, 0.20)',
      transition: 'left 120ms ease',
    };
    return (
      <span
        aria-hidden="true"
        data-testid="wizard-checkbox-track"
        style={trackStyle}
      >
        <span
          aria-hidden="true"
          data-testid="wizard-checkbox-thumb"
          style={thumbStyle}
        />
      </span>
    );
  }

  const badgeText = prefilledFrom ? `From ${prefilledFrom}` : '';

  return (
    <div ref={rootRef} data-testid={testId} style={{ position: 'relative' }}>
      <div data-testid="wizard-checkbox-row" style={rowStyle}>
        <label
          htmlFor={inputId}
          style={{
            position: 'relative',
            display: 'inline-flex',
            alignItems: 'center',
            cursor: disabled ? 'not-allowed' : 'pointer',
          }}
        >
          <input
            id={inputId}
            data-testid="wizard-checkbox-input"
            type="checkbox"
            checked={checked}
            disabled={disabled || undefined}
            aria-disabled={disabled ? 'true' : undefined}
            aria-invalid={error ? 'true' : undefined}
            aria-describedby={describedBy}
            onChange={(e) => onChange?.(field, e.target.checked)}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            style={HIDDEN_INPUT}
          />
          {variant === 'toggle' ? renderTrack() : renderSquareMarker()}
        </label>

        <span
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            flexWrap: 'wrap',
          }}
        >
          <label
            htmlFor={inputId}
            style={{
              fontSize: '14px',
              color: disabled ? T.MUTED : T.INK,
              cursor: disabled ? 'not-allowed' : 'pointer',
            }}
          >
            {label}
          </label>
          {tooltip ? (
            <span style={{ position: 'relative', display: 'inline-flex' }}>
              <button
                ref={iconRef}
                type="button"
                data-testid="wizard-checkbox-info"
                aria-label="More information"
                aria-expanded={tipOpen}
                onClick={(e) => {
                  e.preventDefault();
                  toggleTip();
                }}
                onMouseEnter={() => {
                  if (!isMobile) openTip();
                }}
                onMouseLeave={() => {
                  if (!isMobile) setTipOpen(false);
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    e.stopPropagation();
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
                  data-testid="wizard-checkbox-tooltip"
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
          {prefilledFrom ? (
            <span
              data-testid="wizard-checkbox-badge"
              title={badgeText}
              style={{
                flexShrink: 0,
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
        </span>
      </div>

      {error ? (
        <div
          id={errId}
          data-testid="wizard-checkbox-error"
          style={{ fontSize: '11px', color: T.RED, marginTop: '4px' }}
        >
          {error}
        </div>
      ) : null}
    </div>
  );
}
