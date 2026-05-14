'use client';

/**
 * Shared input primitives for the PVA InputsPanel sub-components.
 *
 * Mirrors `SupportEstimator/inputs/_fields.jsx` idiom: inline `style={{}}`
 * with brand tokens from `@/src/lib/brand/tokens` (LL-7 compliant); null
 * discipline — empty input → `null`, never `0` or `undefined` (§7.10.2).
 *
 * Naming convention (§7.10.2): camelCase field names; snake_case enum values
 * passed through verbatim from spec §7.3.
 */

import { T } from '@/src/lib/brand/tokens';

const LABEL_STYLE = {
  display: 'block',
  fontFamily: T.FONT_BODY,
  fontSize: 14,
  fontWeight: 600,
  color: T.NAVY,
  marginBottom: 6,
};

const INPUT_STYLE = {
  width: '100%',
  padding: '10px 12px',
  fontFamily: T.FONT_BODY,
  fontSize: 16,
  color: T.NAVY,
  border: `1px solid ${T.NAVY_12}`,
  borderRadius: 6,
  backgroundColor: T.CARD,
  outline: 'none',
  boxSizing: 'border-box',
};

const HELPER_STYLE = {
  fontFamily: T.FONT_BODY,
  fontSize: 13,
  color: T.NAVY_55,
  margin: '6px 0 0',
};

const FIELD_WRAP = { marginBottom: 14 };

export function NumberField({ id, label, helper, value, onChange, min, max, step }) {
  return (
    <div style={FIELD_WRAP}>
      <label htmlFor={id} style={LABEL_STYLE}>{label}</label>
      <input
        id={id}
        data-testid={id}
        type="number"
        inputMode="decimal"
        min={min}
        max={max}
        step={step ?? 'any'}
        value={value == null ? '' : value}
        onChange={(e) => {
          const v = e.target.value;
          if (v === '') return onChange(null);
          const n = Number(v);
          onChange(Number.isFinite(n) ? n : null);
        }}
        style={INPUT_STYLE}
      />
      {helper && <p style={HELPER_STYLE}>{helper}</p>}
    </div>
  );
}

export function DateField({ id, label, helper, value, onChange }) {
  return (
    <div style={FIELD_WRAP}>
      <label htmlFor={id} style={LABEL_STYLE}>{label}</label>
      <input
        id={id}
        data-testid={id}
        type="date"
        value={value ?? ''}
        onChange={(e) => onChange(e.target.value || null)}
        style={INPUT_STYLE}
      />
      {helper && <p style={HELPER_STYLE}>{helper}</p>}
    </div>
  );
}

export function SelectField({ id, label, helper, value, onChange, options, allowEmpty = true }) {
  return (
    <div style={FIELD_WRAP}>
      <label htmlFor={id} style={LABEL_STYLE}>{label}</label>
      <select
        id={id}
        data-testid={id}
        value={value ?? ''}
        onChange={(e) => onChange(e.target.value || null)}
        style={INPUT_STYLE}
      >
        {allowEmpty && <option value="">— select —</option>}
        {options.map((o) => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
      {helper && <p style={HELPER_STYLE}>{helper}</p>}
    </div>
  );
}

export function RadioGroup({ id, label, helper, value, onChange, options }) {
  return (
    <div style={FIELD_WRAP} role="radiogroup" aria-label={label}>
      <span style={LABEL_STYLE}>{label}</span>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12 }}>
        {options.map((o) => {
          const checked = value === o.value;
          return (
            <label
              key={o.value}
              htmlFor={`${id}-${o.value}`}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                fontFamily: T.FONT_BODY,
                fontSize: 14,
                color: T.NAVY,
              }}
            >
              <input
                id={`${id}-${o.value}`}
                data-testid={`${id}-${o.value}`}
                type="radio"
                name={id}
                value={o.value}
                checked={checked}
                onChange={() => onChange(o.value)}
              />
              {o.label}
            </label>
          );
        })}
      </div>
      {helper && <p style={HELPER_STYLE}>{helper}</p>}
    </div>
  );
}

export function FieldSection({ title, children }) {
  return (
    <section
      style={{
        marginBottom: 24,
        padding: 16,
        background: T.CARD,
        border: `1px solid ${T.NAVY_12}`,
        borderRadius: 8,
      }}
    >
      {title && (
        <h3
          style={{
            fontFamily: T.FONT_DISPLAY,
            fontSize: '1rem',
            fontWeight: 500,
            color: T.NAVY,
            margin: '0 0 12px 0',
          }}
        >
          {title}
        </h3>
      )}
      {children}
    </section>
  );
}
