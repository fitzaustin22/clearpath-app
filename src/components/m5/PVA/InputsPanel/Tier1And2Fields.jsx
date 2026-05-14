'use client';

/**
 * Tier1And2Fields — path-specific inputs for Tier 1 (§7.3.2) and Tier 2 (§7.3.3).
 *
 * Tier 1 and Tier 2 share the entire input schema; the only difference is
 * the locked `benefitSource` metadata value, which the calc engine derives
 * automatically per path (Tier 1 → 'official_statement', Tier 2 → 'plan_estimator_or_manual_calculation').
 *
 * Field list (locked literal per §7.3.2):
 *   - planName                       (pre-pop M2 claim.planName)
 *   - whoseplan                      ('Client' | 'Spouse'; pre-pop M2)
 *   - planNRA                        (integer, default 65)
 *   - accruedMonthlyBenefitAtNRA     (number, from official statement or estimator)
 *   - formOfBenefitOnStatement       (enum, default 'single_life')
 *   - vestingStatus                  (enum, default 'fully_vested')
 *
 * @param {object} props
 * @param {'tier_1' | 'tier_2'} props.tier  Which Tier label to show.
 * @param {object} props.inputs
 * @param {(field: string, value: any) => void} props.onChange
 */

import { NumberField, SelectField, FieldSection } from './_fields.jsx';

const FORM_OF_BENEFIT_OPTIONS = [
  { value: 'single_life', label: 'Single life' },
  { value: 'joint_50', label: 'Joint & 50% survivor' },
  { value: 'joint_100', label: 'Joint & 100% survivor' },
  { value: 'period_certain', label: 'Period certain' },
];

const VESTING_OPTIONS = [
  { value: 'fully_vested', label: 'Fully vested' },
  { value: 'partially_vested', label: 'Partially vested' },
  { value: 'not_vested', label: 'Not vested' },
];

const WHOSEPLAN_OPTIONS = [
  { value: 'Client', label: 'Client' },
  { value: 'Spouse', label: 'Spouse' },
];

export default function Tier1And2Fields({ tier, inputs, onChange }) {
  const title = tier === 'tier_2' ? 'Tier 2 inputs — Estimated accrued benefit' : 'Tier 1 inputs — Accrued benefit known';
  return (
    <FieldSection title={title}>
      <SelectField
        id="pva-input-whoseplan"
        label="Whose plan"
        helper="Pre-pops from the M2 pension claim."
        value={inputs.whoseplan}
        onChange={(v) => onChange('whoseplan', v)}
        options={WHOSEPLAN_OPTIONS}
        allowEmpty={false}
      />
      <NumberField
        id="pva-input-planNRA"
        label="Plan Normal Retirement Age (NRA)"
        helper="Typically age 65. Defines when the deferred annuity starts."
        value={inputs.planNRA}
        onChange={(v) => onChange('planNRA', v)}
        min={50}
        max={80}
        step={1}
      />
      <NumberField
        id="pva-input-accruedMonthlyBenefitAtNRA"
        label="Accrued monthly benefit at NRA ($/mo)"
        helper={
          tier === 'tier_2'
            ? 'Estimated monthly benefit at NRA (from plan estimator or manual calc).'
            : 'Accrued monthly benefit at NRA from official plan statement.'
        }
        value={inputs.accruedMonthlyBenefitAtNRA}
        onChange={(v) => onChange('accruedMonthlyBenefitAtNRA', v)}
        min={0}
      />
      <SelectField
        id="pva-input-formOfBenefitOnStatement"
        label="Form of benefit on statement"
        helper="Defaults to single-life. Other forms surface an informational callout; v1 PV math uses single-life."
        value={inputs.formOfBenefitOnStatement ?? 'single_life'}
        onChange={(v) => onChange('formOfBenefitOnStatement', v ?? 'single_life')}
        options={FORM_OF_BENEFIT_OPTIONS}
        allowEmpty={false}
      />
      <SelectField
        id="pva-input-vestingStatus"
        label="Vesting status"
        helper="Defaults to fully vested. Partial / not vested surfaces a callout; v1 PV math is not vesting-discounted."
        value={inputs.vestingStatus ?? 'fully_vested'}
        onChange={(v) => onChange('vestingStatus', v ?? 'fully_vested')}
        options={VESTING_OPTIONS}
        allowEmpty={false}
      />
    </FieldSection>
  );
}
