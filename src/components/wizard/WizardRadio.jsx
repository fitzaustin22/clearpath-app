'use client';

/**
 * WizardRadio — radio-group choice input for the M5 wizard (foundation
 * extension primitive v1.1). Two visually distinct variants:
 *
 *  - `stacked`   vertical list, 18px ring marker + gold dot, a mandatory
 *                per-option description and an optional info tooltip. For
 *                differentiation-by-description choices (e.g. the QDRO
 *                6-way plan-type classifier).
 *  - `segmented` horizontal pill container, filled selected cell, no
 *                marker / description / tooltip. For binary or short-list
 *                toggles (e.g. participant vs alternate-payee).
 *
 * Controlled (foundation Q-4): owns no value state; emits
 * onChange(field, value). Each option is a real <input type="radio">
 * (hidden via appearance/position/opacity) sharing one name inside a
 * <fieldset> — this preserves a11y semantics, form submission and native
 * arrow-key roving while a custom marker supplies the visuals. Inline T
 * tokens only (foundation Q-0b — no CSS variables). Error and disabled
 * are group-level (foundation Q-1 / Q-2; no opacity reduction).
 *
 * The stacked per-option `description` is option *content* — the thing
 * the user is choosing on — explicitly carved out of the spec's
 * helper-text-below-input anti-pattern, hence mandatory and inline. The
 * component warns (dev) when a stacked option omits it. Spec:
 * Roadmap/Architecture/Wizard-Design-Spec.md §WizardRadio.
 *
 * @param {object} props
 * @param {string} props.field controlled-field key passed back to onChange
 * @param {string} [props.value] selected option value (controlled)
 * @param {(field: string, value: string) => void} [props.onChange] change handler
 * @param {string} props.legend group label rendered in the <legend>
 * @param {boolean} [props.legendHidden] sr-only the legend (default false)
 * @param {'stacked'|'segmented'} [props.variant] visual variant (default 'stacked')
 * @param {Array<{value:string,label:string,description?:string,tooltipContent?:string}>} props.options option list; `description` mandatory for the stacked variant
 * @param {string|null} [props.error] group-level error message
 * @param {boolean} [props.disabled] disable the whole group (Q-2, no opacity)
 * @param {string} [props.data-testid] root test id (default 'wizard-radio')
 * @returns {JSX.Element}
 */

import { useId, useRef, useState, useEffect } from 'react';
import { T } from '@/src/lib/brand/tokens';
import { useBreakpoints } from '@/src/hooks/useBreakpoints';

const SR_ONLY = {
  position: 'absolute',
  width: '1px',
  height: '1px',
  padding: 0,
  margin: '-1px',
  overflow: 'hidden',
  clip: 'rect(0, 0, 0, 0)',
  whiteSpace: 'nowrap',
  border: 0,
};

const HIDDEN_INPUT = {
  appearance: 'none',
  WebkitAppearance: 'none',
  position: 'absolute',
  opacity: 0,
  width: '1px',
  height: '1px',
  margin: 0,
};

const TOOLTIP_WIDTH = 220;

export default function WizardRadio({
  field,
  value,
  onChange,
  legend,
  legendHidden = false,
  variant = 'stacked',
  options = [],
  error,
  disabled,
  'data-testid': testId = 'wizard-radio',
}) {
  const autoId = useId();
  const groupName = `wr-${autoId}`;
  const errId = `${groupName}-err`;
  const legendId = `${groupName}-legend`;

  const { isMobile } = useBreakpoints();
  const rootRef = useRef(null);
  const [hovered, setHovered] = useState(null);
  const [focused, setFocused] = useState(null);
  const [openTip, setOpenTip] = useState(null);

  const segmented = variant === 'segmented';

  useEffect(() => {
    if (openTip === null) return undefined;
    const onDocDown = (e) => {
      if (rootRef.current && !rootRef.current.contains(e.target)) {
        setOpenTip(null);
      }
    };
    document.addEventListener('mousedown', onDocDown);
    return () => document.removeEventListener('mousedown', onDocDown);
  }, [openTip]);

  const fieldsetStyle = {
    border: error ? `1px solid ${T.RED}` : '0',
    borderRadius: error ? '7px' : 0,
    padding: error ? '10px' : '0',
    margin: '0',
    minWidth: '0',
  };

  const legendStyle = legendHidden
    ? SR_ONLY
    : {
        padding: 0,
        marginBottom: '8px',
        fontSize: '13px',
        fontWeight: 700,
        color: T.INK,
        fontFamily: T.FONT_BODY,
      };

  function selectOption(optValue) {
    if (disabled) return;
    onChange?.(field, optValue);
  }

  function renderTooltip(opt) {
    if (segmented || !opt.tooltipContent) return null;
    const isOpen = openTip === opt.value;
    const tipId = `${groupName}-tip-${opt.value}`;
    const toggle = () => setOpenTip(isOpen ? null : opt.value);
    return (
      <span style={{ position: 'relative', display: 'inline-flex' }}>
        <button
          type="button"
          data-testid={`wizard-radio-info-${opt.value}`}
          aria-label="More information"
          aria-expanded={isOpen}
          onMouseDown={(e) => e.stopPropagation()}
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            toggle();
          }}
          onMouseEnter={() => {
            if (!isMobile) setOpenTip(opt.value);
          }}
          onMouseLeave={() => {
            if (!isMobile) setOpenTip(null);
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              e.stopPropagation();
              toggle();
            } else if (e.key === 'Escape') {
              setOpenTip(null);
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
        {isOpen ? (
          <div
            role="tooltip"
            id={tipId}
            data-testid={`wizard-radio-tooltip-${opt.value}`}
            style={{
              position: 'absolute',
              bottom: 'calc(100% + 6px)',
              left: 0,
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
            {opt.tooltipContent}
          </div>
        ) : null}
      </span>
    );
  }

  function renderStackedOption(opt) {
    if (!opt.description) {
      console.warn(
        `WizardRadio: stacked option "${opt.value}" is missing the required ` +
          'description (it is the choice differentiator, not auxiliary helper text).',
      );
    }
    const selected = value === opt.value;
    const isHover = hovered === opt.value && !selected && !disabled;
    const isFocus = focused === opt.value;

    const rowStyle = {
      position: 'relative',
      display: 'flex',
      alignItems: 'flex-start',
      gap: '12px',
      minHeight: '44px',
      padding: '8px 10px',
      borderRadius: '7px',
      cursor: disabled ? 'not-allowed' : 'pointer',
      color: disabled ? T.MUTED : T.INK,
      backgroundColor: disabled
        ? T.NAVY_06
        : isHover
          ? T.GOLD_TINT_SUBTLE
          : 'transparent',
      transition: 'background-color 120ms ease',
    };

    const markerStyle = {
      flexShrink: 0,
      boxSizing: 'border-box',
      width: '18px',
      height: '18px',
      marginTop: '1px',
      borderRadius: '50%',
      border: `2px solid ${selected ? T.NAVY : T.LINE_STRONG}`,
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      outlineWidth: isFocus ? '3px' : '0',
      outlineStyle: isFocus ? 'solid' : 'none',
      outlineColor: isFocus ? T.GOLD_FOCUS_RING : 'transparent',
      transition: 'outline-color 120ms ease, border-color 120ms ease',
    };

    return (
      <label
        key={opt.value}
        data-testid={`wizard-radio-option-${opt.value}`}
        onMouseEnter={() => setHovered(opt.value)}
        onMouseLeave={() => setHovered(null)}
        style={rowStyle}
      >
        <input
          type="radio"
          name={groupName}
          value={opt.value}
          data-testid={`wizard-radio-input-${opt.value}`}
          checked={selected}
          disabled={disabled || undefined}
          onChange={() => selectOption(opt.value)}
          onFocus={() => setFocused(opt.value)}
          onBlur={() => setFocused(null)}
          style={HIDDEN_INPUT}
        />
        <span
          aria-hidden="true"
          data-testid={`wizard-radio-marker-${opt.value}`}
          style={markerStyle}
        >
          {selected ? (
            <span
              data-testid={`wizard-radio-dot-${opt.value}`}
              style={{
                width: '8px',
                height: '8px',
                borderRadius: '50%',
                backgroundColor: T.GOLD,
              }}
            />
          ) : null}
        </span>
        <span style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              fontSize: '14px',
              fontWeight: 600,
              fontFamily: T.FONT_BODY,
            }}
          >
            {opt.label}
            {renderTooltip(opt)}
          </span>
          <span
            data-testid={`wizard-radio-desc-${opt.value}`}
            style={{
              fontSize: '13px',
              lineHeight: 1.4,
              color: T.MUTED,
              fontFamily: T.FONT_BODY,
            }}
          >
            {opt.description}
          </span>
        </span>
      </label>
    );
  }

  function renderSegmentedCell(opt) {
    const selected = value === opt.value;
    const isFocus = focused === opt.value;
    const cellStyle = {
      flex: 1,
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: '44px',
      padding: '0 16px',
      borderRadius: '9999px',
      fontSize: '14px',
      fontWeight: 600,
      fontFamily: T.FONT_BODY,
      cursor: disabled ? 'not-allowed' : 'pointer',
      color: disabled ? T.MUTED : selected ? T.PARCHMENT : T.INK,
      backgroundColor: disabled
        ? T.NAVY_06
        : selected
          ? T.NAVY
          : 'transparent',
      outlineWidth: isFocus ? '3px' : '0',
      outlineStyle: isFocus ? 'solid' : 'none',
      outlineColor: isFocus ? T.GOLD_FOCUS_RING : 'transparent',
      transition: 'background-color 120ms ease, outline-color 120ms ease',
    };
    return (
      <label
        key={opt.value}
        data-testid={`wizard-radio-option-${opt.value}`}
        style={cellStyle}
      >
        <input
          type="radio"
          name={groupName}
          value={opt.value}
          data-testid={`wizard-radio-input-${opt.value}`}
          checked={selected}
          disabled={disabled || undefined}
          onChange={() => selectOption(opt.value)}
          onFocus={() => setFocused(opt.value)}
          onBlur={() => setFocused(null)}
          style={HIDDEN_INPUT}
        />
        {opt.label}
      </label>
    );
  }

  return (
    <fieldset
      ref={rootRef}
      data-testid={testId}
      role="radiogroup"
      aria-labelledby={legendId}
      aria-invalid={error ? 'true' : undefined}
      aria-describedby={error ? errId : undefined}
      style={fieldsetStyle}
    >
      <legend id={legendId} data-testid="wizard-radio-legend" style={legendStyle}>
        {legend}
      </legend>

      {segmented ? (
        <div
          data-testid="wizard-radio-segmented"
          style={{
            display: 'flex',
            borderRadius: '9999px',
            backgroundColor: T.PARCHMENT,
            border: `1px solid ${T.LINE_STRONG}`,
            overflow: 'hidden',
          }}
        >
          {options.map(renderSegmentedCell)}
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          {options.map(renderStackedOption)}
        </div>
      )}

      {error ? (
        <div
          id={errId}
          data-testid="wizard-radio-error"
          style={{ fontSize: '11px', color: T.RED, marginTop: '4px' }}
        >
          {error}
        </div>
      ) : null}
    </fieldset>
  );
}
