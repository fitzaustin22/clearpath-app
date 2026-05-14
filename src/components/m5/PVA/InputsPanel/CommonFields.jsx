'use client';

/**
 * CommonFields — inputs shared across all PVA compute paths per spec §7.3.1.
 *
 * Field list (locked literal):
 *   - participantDOB                  (ISO date, required)
 *   - mortalityTable                  (enum, default 'irs_417e')
 *   - discountRateBps                 (integer basis points; default = §417(e) seg 2)
 *   - cola                            (number, percent; default 0)
 *   - caseEffectiveDate               (ISO date | null; SNAPSHOT from m5Store.caseEffectiveDate
 *                                      per [R5b-21] — surface here as editable for v1)
 *   - planAdministratorOfferedLumpSum (number | null, optional comparison input)
 */

import { NumberField, DateField, SelectField, FieldSection } from './_fields.jsx';

const MORTALITY_OPTIONS = [
  { value: 'irs_417e', label: 'IRS §417(e) unisex (default)' },
  { value: 'pub_2010', label: 'Pub. 2010 (alternative)' },
  { value: 'rp_2014', label: 'RP-2014 (alternative)' },
];

export default function CommonFields({ inputs, onChange }) {
  return (
    <FieldSection title="Common inputs">
      <DateField
        id="pva-input-participantDOB"
        label="Participant date of birth"
        helper="Required. Drives age-based annuity-factor lookup."
        value={inputs.participantDOB}
        onChange={(v) => onChange('participantDOB', v)}
      />
      <DateField
        id="pva-input-caseEffectiveDate"
        label="Case effective date"
        helper="Snapshot used for §417(e) rate lookup. Defaults from m5Store.caseEffectiveDate."
        value={inputs.caseEffectiveDate}
        onChange={(v) => onChange('caseEffectiveDate', v)}
      />
      <SelectField
        id="pva-input-mortalityTable"
        label="Mortality table"
        helper="Defaults to IRS §417(e) 2026 unisex applicable mortality table."
        value={inputs.mortalityTable ?? 'irs_417e'}
        onChange={(v) => onChange('mortalityTable', v ?? 'irs_417e')}
        options={MORTALITY_OPTIONS}
        allowEmpty={false}
      />
      <NumberField
        id="pva-input-discountRateBps"
        label="Discount rate (basis points)"
        helper="Non-canonical bps: 5234 = 5.234%. Defaults to §417(e) seg 2 at caseEffectiveDate."
        value={inputs.discountRateBps}
        onChange={(v) => onChange('discountRateBps', v)}
        min={0}
        max={15000}
        step={1}
      />
      <NumberField
        id="pva-input-cola"
        label="COLA (%)"
        helper="Cost-of-living adjustment on the benefit stream. Default 0%."
        value={inputs.cola}
        onChange={(v) => onChange('cola', v)}
        min={0}
        max={10}
        step={0.1}
      />
      <NumberField
        id="pva-input-planAdministratorOfferedLumpSum"
        label="Plan-offered lump sum (optional)"
        helper="If the plan has offered a lump-sum buyout, enter it here for comparison against the tool's PV."
        value={inputs.planAdministratorOfferedLumpSum}
        onChange={(v) => onChange('planAdministratorOfferedLumpSum', v)}
        min={0}
      />
    </FieldSection>
  );
}
