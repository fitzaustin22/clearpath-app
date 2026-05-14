'use client';

/**
 * PlanTypeSelector — user-captured plan-type classification per spec §7.2 R0.
 *
 * `planType` is intentionally NOT pre-popped from M2 [R5b-7]; M2-TICKET-3
 * captures generic pension claims without the planType subtype required for
 * routing. User selects at PVA entry. Routing per §7.5:
 *
 *   - private_db_traditional       → tier_1 / tier_2 / tier_3 / in_pay_status
 *   - private_db_cash_balance      → cash_balance
 *   - multi_employer               → flag_only
 *   - gov_civilian                 → flag_only
 *   - military                     → flag_only
 *   - state_municipal              → flag_only
 *
 * Path resolution itself lives in the PVA orchestrator (PVA.jsx) where it
 * consumes the §7.10.3 discriminated union; this component only writes
 * `planType` to inputs.
 */

import { SelectField, FieldSection } from './_fields.jsx';

const PLAN_TYPE_OPTIONS = [
  { value: 'private_db_traditional', label: 'Private DB (traditional)' },
  { value: 'private_db_cash_balance', label: 'Private DB (cash balance)' },
  { value: 'multi_employer', label: 'Multi-employer / collectively bargained' },
  { value: 'gov_civilian', label: 'Government civilian (CSRS / FERS)' },
  { value: 'military', label: 'Military retired pay' },
  { value: 'state_municipal', label: 'State / municipal pension' },
];

export default function PlanTypeSelector({ inputs, onChange }) {
  return (
    <FieldSection title="Plan type">
      <SelectField
        id="pva-input-planType"
        label="Plan type"
        helper="Select the plan classification. Multi-employer, gov, military, and state/municipal plans cannot be valued via the standard PVA engine at v1."
        value={inputs.planType}
        onChange={(v) => onChange('planType', v)}
        options={PLAN_TYPE_OPTIONS}
      />
    </FieldSection>
  );
}
