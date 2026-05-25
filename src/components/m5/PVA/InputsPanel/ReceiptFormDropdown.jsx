'use client';

/**
 * ReceiptFormDropdown — receiptForm contract surface per spec §7.7.
 *
 * `receiptForm` is the canonical handoff field from PVA to M4 PIT for
 * tax-discount calculation. PVA PR 2 ships ONLY the dropdown + persistence
 * (per Sub-Q #2 — avoids M4 blast radius); the actual PVA → PIT call-site
 * wiring at M4 PIT entry is a separate downstream PR.
 *
 * Default value comes from `DEFAULT_RECEIPT_FORM_BY_PATH[path]` from the
 * PR 1 lib barrel. User can override via the dropdown.
 *
 * Locked enum (4 values + null) per §7.7:
 *   - 'monthly_db_stream'           (default for DB paths)
 *   - 'lump_sum_rollover_to_ira'    (default for cash balance)
 *   - 'lump_sum_cash_72t'           (alternate payee under 59½ via QDRO §72(t))
 *   - 'lump_sum_cash_taxable'       (taxable cash, no rollover)
 *
 * Hidden when `path === 'flag_only'` (no PV → no receipt form).
 */

import { useEffect } from 'react';
import { FieldSection } from './_fields.jsx';
import WizardSelector from '@/src/components/wizard/WizardSelector';
import { DEFAULT_RECEIPT_FORM_BY_PATH } from '@/src/lib/pensionValuation';

const RECEIPT_FORM_OPTIONS = [
  { value: 'monthly_db_stream', label: 'Monthly DB stream (default for DB paths)' },
  { value: 'lump_sum_rollover_to_ira', label: 'Lump-sum rollover to IRA' },
  { value: 'lump_sum_cash_72t', label: 'Lump-sum cash via §72(t) exemption (rare)' },
  { value: 'lump_sum_cash_taxable', label: 'Lump-sum cash taxable (rare)' },
];

export default function ReceiptFormDropdown({ inputs, path, onChange }) {
  // Defect-#2 fix (§7.2 v2): when receiptForm is null and the path has a
  // non-null default, commit the default into the store. The effect re-fires
  // on `path` change while receiptForm is still null (the default tracks the
  // resolved path); once the user picks a value the effect short-circuits.
  const defaultForPath = path != null ? (DEFAULT_RECEIPT_FORM_BY_PATH[path] ?? null) : null;
  useEffect(() => {
    if (inputs.receiptForm == null && defaultForPath != null) {
      onChange('receiptForm', defaultForPath);
    }
  }, [inputs.receiptForm, defaultForPath, onChange]);

  if (path === 'flag_only') return null;
  if (!path) return null;

  // Field shows user override if set, else default (display fallback for the
  // render frame before the commit effect fires).
  const effective = inputs.receiptForm ?? defaultForPath;

  return (
    <FieldSection title="Receipt form (M4 PIT handoff)">
      <WizardSelector
        field="receiptForm"
        label="How will this benefit be received"
        tooltip="Drives the tax-discount calculation in M4 Point-in-Time. Defaults per compute path; override only for non-default receipt scenarios."
        value={effective ?? ''}
        onChange={onChange}
        options={RECEIPT_FORM_OPTIONS}
        data-testid="pva-input-receiptForm"
      />
    </FieldSection>
  );
}
