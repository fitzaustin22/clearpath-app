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
 * Percent mode (PR-FIX-2). When `percent` is true the bridge is a display
 * translation layer over a fraction-valued store: the prop is a decimal
 * fraction (0.0625), the input renders the prop ×100 ("6.25"), and a
 * keystroke is parsed and ÷100 before reaching onChange. The store still
 * sees the fraction — engines and their fixtures are untouched. Display
 * formatting uses toPrecision(12) to avoid IEEE artifacts (0.07 × 100 →
 * "7", not "7.000000000000001"). The draft-preservation discipline is
 * unchanged: the user's raw in-progress string ("6.", ".5") survives
 * verbatim until the draft's parsed-then-scaled value diverges from the
 * controlled prop.
 *
 * @param {object} props
 * @param {string} props.field
 * @param {number|null} props.value
 * @param {(field: string, value: number|null) => void} props.onChange
 * @param {'number'|'currency'} [props.parser='number']
 * @param {boolean} [props.percent=false]
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

// Percent-mode display formatter: round to 12 significant figures so IEEE
// float drift from `fraction * 100` (e.g. 0.07 * 100 = 7.000000000000001)
// does not leak into the input. 12 digits is comfortably below double's
// ~15.9-digit precision and well above any rate a user would care about.
function formatScaledPercent(fraction) {
  const scaled = fraction * 100;
  if (!Number.isFinite(scaled)) return '';
  return String(Number(scaled.toPrecision(12)));
}

// Convert a parsed numeric to the store-shaped value. In percent mode the
// store holds a fraction (÷100); in default mode the parsed value passes
// through unchanged. `null` short-circuits so empty input stays null.
function toStoreValue(parsed, percent) {
  if (parsed === null) return null;
  return percent ? parsed / 100 : parsed;
}

export default function NumericFieldBridge({
  field,
  value,
  onChange,
  parser = 'number',
  numeric = true,
  percent = false,
  ...rest
}) {
  // null draft = "no in-progress text, use prop"; string = "user is typing"
  const [draft, setDraft] = useState(null);

  const handleChange = (_field, raw) => {
    setDraft(raw);
    onChange?.(field, toStoreValue(parseNumeric(raw, parser), percent));
  };

  // Show the draft only while its parsed-then-scaled value still matches
  // the controlled prop. When the prop changes for any reason other than
  // the user's own keystroke (pre-pop, parent clamp, reset), the mismatch
  // makes the prop win — the stale draft state is harmless and will be
  // overwritten on the next keystroke.
  const draftAsStore = draft === null ? null : toStoreValue(parseNumeric(draft, parser), percent);
  const showDraft = draft !== null && draftAsStore === value;
  let display;
  if (showDraft) {
    display = draft;
  } else if (value === null || value === undefined || value === '') {
    // Callers commonly pass `value ?? ''`; treat that the same as null so
    // percent-mode formatting does not coerce '' → 0 and render "0".
    display = '';
  } else if (percent) {
    display = formatScaledPercent(value);
  } else {
    display = value;
  }

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
