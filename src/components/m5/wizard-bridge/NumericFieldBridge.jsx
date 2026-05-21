'use client';

/**
 * NumericFieldBridge — a controlled adapter that lets a locked WizardField
 * accept decimal input without losing in-progress characters.
 *
 * Why this exists. Before this component, SE and HDA each had their own
 * inline string-to-number bridge (parseCurrency / parseNumOrNull /
 * handleNumeric). All three round-tripped the user's keystroke through
 * Number() on every change, so an in-progress "0." parsed to 0 and the
 * trailing decimal vanished on re-render. Decimals were unenterable.
 *
 * What this does. The bridge owns a local draft string ("0.") and shows
 * it verbatim in WizardField while the user is typing. Conversion to a
 * store-shaped number happens once per keystroke for the parent's onChange
 * — never round-tripped back into the display. When the parent's external
 * value changes for any reason that does not match the draft's parsed
 * value (pre-population, clamp, reset), the draft is dropped and the
 * prop value wins. The store contract is unchanged: number | null in,
 * number | null out — only the display path is fixed.
 *
 * Two parser modes preserve legacy semantics:
 *   parser="currency"  — strips non-digits, clamps ≥ 0 (mirrors old parseCurrency)
 *   parser="number"    — Number(raw); finite or null (mirrors old parseNumOrNull)
 *
 * @param {object} props
 * @param {string} props.field
 * @param {number|null} props.value
 * @param {(field: string, value: number|null) => void} props.onChange
 * @param {'number'|'currency'} [props.parser='number']
 *   Any other prop accepted by WizardField (label, prefix, suffix, tooltip,
 *   numeric, error, prefilledFrom, disabled, data-testid) is forwarded.
 */

import { useState } from 'react';
import WizardField from '@/src/components/wizard/WizardField.jsx';

function parseCurrency(s) {
  if (s === '' || s == null) return null;
  const cleaned = String(s).replace(/[^0-9.]/g, '');
  if (cleaned === '') return null;
  const n = Number(cleaned);
  return Number.isFinite(n) ? Math.max(0, n) : null;
}

function parseNumOrNull(s) {
  if (s === '' || s == null) return null;
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}

export function parseNumeric(raw, parser) {
  return parser === 'currency' ? parseCurrency(raw) : parseNumOrNull(raw);
}

export default function NumericFieldBridge({
  field,
  value,
  onChange,
  parser = 'number',
  numeric = true,
  ...rest
}) {
  // null draft = "no in-progress text, use prop"; string = "user is typing"
  const [draft, setDraft] = useState(null);

  const handleChange = (_field, raw) => {
    setDraft(raw);
    onChange?.(field, parseNumeric(raw, parser));
  };

  // Show the draft only while its parsed value still matches the controlled
  // prop. When the prop changes for any reason other than the user's own
  // keystroke (pre-pop, parent clamp, reset), the parsed-vs-prop mismatch
  // makes the prop win — the stale draft state is harmless and will be
  // overwritten on the next keystroke.
  const showDraft = draft !== null && parseNumeric(draft, parser) === value;
  const display = showDraft ? draft : (value ?? '');

  return (
    <WizardField
      {...rest}
      field={field}
      value={display}
      onChange={handleChange}
      numeric={numeric}
    />
  );
}
