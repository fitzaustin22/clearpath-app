'use client';

import { T, ALLOC } from '@/src/lib/brand/tokens';

/**
 * AllocControl — the "Who keeps it?" segmented chooser:
 * You / Split / Spouse / Unassigned. Reusable across the guided wizard tools.
 *
 * Selected pill fills per the allocation semantics (gold You, gold-tint Split,
 * navy Spouse, putty Unassigned); unselected pills show a small colour swatch +
 * word so meaning is never colour-alone. `value` is the design axis
 * ('you'|'split'|'spouse'|'unalloc'); the caller maps it to/from the store's
 * frozen `titleholder` field.
 */
const OPTIONS = [
  { value: 'you', label: 'You', swatch: ALLOC.YOU },
  { value: 'split', label: 'Split', swatch: ALLOC.YOU },
  { value: 'spouse', label: 'Spouse', swatch: ALLOC.SPOUSE },
  { value: 'unalloc', label: 'Unassigned', swatch: ALLOC.HATCH },
];

function selectedStyle(value) {
  switch (value) {
    case 'you':
      return { background: ALLOC.YOU, color: T.NAVY_DEEP };
    case 'split':
      return { background: T.GOLD_TINT, color: T.NAVY };
    case 'spouse':
      return { background: ALLOC.SPOUSE, color: '#FFFFFF' };
    default: // unalloc
      return { background: ALLOC.UNALLOC, color: T.NAVY_DEEP };
  }
}

export default function AllocControl({ value, onChange, size = 'md' }) {
  const pad = size === 'sm' ? '7px 10px' : '9px 13px';
  const fs = size === 'sm' ? 11.5 : 12.5;
  // Primary control — keep the effective tap target near 44px (pill height +
  // the 3px group padding) without abandoning the compact pill look.
  const minH = size === 'sm' ? 34 : 38;
  return (
    <div
      role="group"
      aria-label="Who keeps it?"
      style={{
        display: 'inline-flex',
        flexWrap: 'wrap',
        background: T.PARCHMENT,
        border: `1px solid ${T.LINE_STRONG}`,
        borderRadius: 999,
        padding: 3,
        gap: 2,
      }}
    >
      {OPTIONS.map((o) => {
        const on = value === o.value;
        const sel = selectedStyle(o.value);
        return (
          <button
            key={o.value}
            type="button"
            aria-pressed={on}
            onClick={() => onChange(o.value)}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              padding: pad,
              minHeight: minH,
              fontSize: fs,
              fontWeight: 600,
              fontFamily: T.FONT_BODY,
              border: 'none',
              borderRadius: 999,
              cursor: 'pointer',
              whiteSpace: 'nowrap',
              background: on ? sel.background : 'transparent',
              color: on ? sel.color : T.INK_2,
              transition: 'background 140ms ease, color 140ms ease',
            }}
          >
            {!on && (
              <span
                aria-hidden="true"
                style={{ width: 8, height: 8, borderRadius: 2, background: o.swatch, display: 'inline-block', flexShrink: 0 }}
              />
            )}
            {o.label}
          </button>
        );
      })}
    </div>
  );
}
