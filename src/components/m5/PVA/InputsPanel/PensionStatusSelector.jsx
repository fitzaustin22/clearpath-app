'use client';

/**
 * PensionStatusSelector — user control for the `accrualStatus` routing
 * input per spec §7.2 v2.
 *
 * accrualStatus is pre-pop-seeded from the M2 claim (frozen / in_pay_status
 * / accruing default) AND user-mutable here — toggling the radio re-derives
 * `resolvedPath` in the PVA orchestrator on the same render, no roundtrip.
 *
 * Visibility mirrors TierOverride's planType gate: routing for cash-balance
 * and flag-only plan types is determined by planType (R1/R2) and accrualStatus
 * is moot, so this control only renders for `private_db_traditional`.
 *
 * @param {object} props
 * @param {object} props.inputs
 * @param {(field: string, value: string) => void} props.onChange
 */

import { FieldSection } from './_fields.jsx';
import WizardRadio from '@/src/components/wizard/WizardRadio';

const ACCRUAL_STATUS_OPTIONS = [
  {
    value: 'accruing',
    label: 'Accruing',
    description: 'Still earning service credit',
  },
  {
    value: 'frozen',
    label: 'Frozen',
    description: 'Accruals stopped; not yet drawing benefits',
  },
  {
    value: 'in_pay_status',
    label: 'In pay status',
    description: 'Already receiving benefit payments',
  },
];

export default function PensionStatusSelector({ inputs, onChange }) {
  if (inputs.planType !== 'private_db_traditional') return null;

  return (
    <FieldSection title="Pension status">
      <WizardRadio
        field="accrualStatus"
        legend="Pension status"
        variant="stacked"
        value={inputs.accrualStatus}
        onChange={onChange}
        options={ACCRUAL_STATUS_OPTIONS}
        data-testid="pva-input-accrualStatus"
      />
    </FieldSection>
  );
}
