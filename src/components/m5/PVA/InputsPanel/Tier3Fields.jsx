'use client';

/**
 * Tier3Fields — path-specific inputs for the coverture path per spec §7.3.4.
 *
 * Spec is explicit that Tier 3 uses `currentAccruedMonthlyBenefit` (frozen at
 * valuation date) NOT `accruedMonthlyBenefitAtNRA`. Tier 3 does not require
 * salary projection — the marital portion is the coverture fraction applied
 * to PV of the today-frozen accrued benefit projected to expectedRetirementAge.
 *
 * Field list (locked literal per §7.3.4):
 *   - planName                          (pre-pop M2)
 *   - whoseplan                         (pre-pop M2)
 *   - planNRA                           (integer, default 65)
 *   - dateOfHire                        (ISO date, required for coverture)
 *   - dateOfMarriage                    (ISO date; manual at v1)
 *   - maritalCutoffDate                 (ISO date; manual at v1)
 *   - expectedRetirementAge             (integer; default = planNRA)
 *   - currentAccruedMonthlyBenefit      ("your benefit if you retired today")
 *   - formOfBenefitOnStatement          (enum, default 'single_life')
 *   - vestingStatus                     (enum, default 'fully_vested')
 *   - benefitSource                     ('official_statement' | 'plan_estimator_or_manual_calculation')
 */

import { NumberField, DateField, SelectField, FieldSection } from './_fields.jsx';

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

const BENEFIT_SOURCE_OPTIONS = [
  { value: 'official_statement', label: 'Official plan statement' },
  { value: 'plan_estimator_or_manual_calculation', label: 'Plan estimator or manual calc' },
];

export default function Tier3Fields({ inputs, onChange }) {
  return (
    <FieldSection title="Tier 3 inputs — Coverture">
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
        helper="Typically age 65."
        value={inputs.planNRA}
        onChange={(v) => onChange('planNRA', v)}
        min={50}
        max={80}
        step={1}
      />
      <DateField
        id="pva-input-dateOfHire"
        label="Date of hire"
        helper="Required for coverture. Drives the denominator (total service)."
        value={inputs.dateOfHire}
        onChange={(v) => onChange('dateOfHire', v)}
      />
      <DateField
        id="pva-input-dateOfMarriage"
        label="Date of marriage"
        helper="Drives the numerator start (max of hire, marriage)."
        value={inputs.dateOfMarriage}
        onChange={(v) => onChange('dateOfMarriage', v)}
      />
      <DateField
        id="pva-input-maritalCutoffDate"
        label="Marital cutoff date"
        helper="Drives the numerator end (min of cutoff, retirement). Must be on or after marriage."
        value={inputs.maritalCutoffDate}
        onChange={(v) => onChange('maritalCutoffDate', v)}
      />
      <NumberField
        id="pva-input-expectedRetirementAge"
        label="Expected retirement age"
        helper="Drives the denominator end (total projected service to retirement). Defaults to plan NRA."
        value={inputs.expectedRetirementAge}
        onChange={(v) => onChange('expectedRetirementAge', v)}
        min={50}
        max={80}
        step={1}
      />
      <NumberField
        id="pva-input-currentAccruedMonthlyBenefit"
        label="Current accrued monthly benefit ($/mo)"
        helper="The monthly benefit if the participant retired today (frozen at valuation date). Tier 3 does NOT project salary growth."
        value={inputs.currentAccruedMonthlyBenefit}
        onChange={(v) => onChange('currentAccruedMonthlyBenefit', v)}
        min={0}
      />
      <SelectField
        id="pva-input-formOfBenefitOnStatement"
        label="Form of benefit on statement"
        helper="Defaults to single-life."
        value={inputs.formOfBenefitOnStatement ?? 'single_life'}
        onChange={(v) => onChange('formOfBenefitOnStatement', v ?? 'single_life')}
        options={FORM_OF_BENEFIT_OPTIONS}
        allowEmpty={false}
      />
      <SelectField
        id="pva-input-vestingStatus"
        label="Vesting status"
        helper="Defaults to fully vested."
        value={inputs.vestingStatus ?? 'fully_vested'}
        onChange={(v) => onChange('vestingStatus', v ?? 'fully_vested')}
        options={VESTING_OPTIONS}
        allowEmpty={false}
      />
      <SelectField
        id="pva-input-benefitSource"
        label="Benefit source"
        helper="Origin of the current accrued monthly benefit figure."
        value={inputs.benefitSource}
        onChange={(v) => onChange('benefitSource', v)}
        options={BENEFIT_SOURCE_OPTIONS}
      />
    </FieldSection>
  );
}
