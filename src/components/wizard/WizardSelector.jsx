'use client';

/**
 * WizardSelector — styled native <select> for the M5 wizard (a
 * foundation extension primitive, v1.2). Chrome-matched to WizardField;
 * mirrors its label-row anatomy (label, info-icon tooltip, provenance
 * badge), the controlled onChange(field, value) API, and focus / disabled
 * / error visual states.
 *
 * Controlled (foundation Q-4): owns no value state; emits
 * onChange(field, value). The native <select> is the control — no custom
 * JS dropdown, no listbox role — so native semantics, the mobile native
 * picker, and form submission all "just work". The `placeholder` prop
 * adds a disabled empty-value first <option>; when omitted, no empty
 * option is rendered. Inline T tokens only (foundation Q-0b — no CSS
 * variables). Spec: Roadmap/Architecture/Wizard-Design-Spec.md.
 *
 * @param {object} props
 * @param {string} props.label visible field label
 * @param {string} props.field controlled-field key passed back to onChange
 * @param {string} [props.value] selected option value (controlled)
 * @param {(field: string, value: string) => void} [props.onChange] change handler
 * @param {Array<{value:string,label:string}>} props.options option list
 * @param {string} [props.placeholder] adds a disabled empty-value first option
 * @param {string} [props.prefilledFrom] provenance source; renders a "From X" badge
 * @param {boolean} [props.disabled] muted, not-allowed, no opacity (Q-2)
 * @param {string|null} [props.error] error message; red border/ring + inline text
 * @param {string|null} [props.tooltip] info-icon tooltip content
 * @param {string} [props.data-testid] root test id (default 'wizard-selector')
 * @returns {JSX.Element}
 */

import { useId, useRef, useState, useEffect } from 'react';
import { T } from '@/src/lib/brand/tokens';
import { useBreakpoints } from '@/src/hooks/useBreakpoints';

const TOOLTIP_WIDTH = 220;

const CHEVRON_SVG = encodeURIComponent(
  '<svg xmlns="http://www.w3.org/2000/svg" width="12" height="8" viewBox="0 0 12 8">' +
    '<path d="M1 1l5 5 5-5" fill="none" stroke="#4A5876" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>' +
    '</svg>',
);

export default function WizardSelector({
  label,
  field,
  value,
  onChange,
  options = [],
  placeholder,
  prefilledFrom,
  disabled,
  error,
  tooltip,
  'data-testid': testId = 'wizard-selector',
}) {
  const autoId = useId();
  const controlId = `ws-${autoId}`;
  const errId = `${controlId}-err`;
  const tipId = `${controlId}-tip`;

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

  const controlStyle = {
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
    backgroundColor: disabled ? T.NAVY_06 : T.CARD,
    cursor: disabled ? 'not-allowed' : 'pointer',
    transition: 'border-color 120ms ease, outline-color 120ms ease',
    appearance: 'none',
    WebkitAppearance: 'none',
    MozAppearance: 'none',
    padding: '0 32px 0 12px',
    backgroundImage: `url("data:image/svg+xml;utf8,${CHEVRON_SVG}")`,
    backgroundRepeat: 'no-repeat',
    backgroundPosition: 'right 10px center',
    backgroundSize: '12px 8px',
  };

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
            htmlFor={controlId}
            style={{ fontSize: '12.5px', fontWeight: 600, color: T.INK }}
          >
            {label}
          </label>
          {tooltip ? (
            <span style={{ position: 'relative', display: 'inline-flex' }}>
              <button
                ref={iconRef}
                type="button"
                data-testid="wizard-selector-info"
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
                  data-testid="wizard-selector-tooltip"
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
        {prefilledFrom ? (
          <span
            data-testid="wizard-selector-badge"
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
      </div>

      <select
        id={controlId}
        data-testid="wizard-selector-control"
        value={value ?? ''}
        disabled={disabled || undefined}
        aria-disabled={disabled ? 'true' : undefined}
        aria-invalid={error ? 'true' : undefined}
        aria-describedby={describedBy}
        onChange={(e) => onChange?.(field, e.target.value)}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        style={controlStyle}
      >
        {placeholder ? (
          <option value="" disabled>
            {placeholder}
          </option>
        ) : null}
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>

      {error ? (
        <div
          id={errId}
          data-testid="wizard-selector-error"
          style={{ fontSize: '11px', color: T.RED, marginTop: '4px' }}
        >
          {error}
        </div>
      ) : null}
    </div>
  );
}
