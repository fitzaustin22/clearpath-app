'use client';

/**
 * InPayFields — path-specific inputs for in-pay-status path per spec §7.3.5.
 *
 * Pre-pops `monthlyBenefit` and `benefitStartDate` from M2 claim per
 * `prePopulatePVAInputs`. R3 routing data-completeness guard per [R5b-8]
 * fires in pre-pop when either is missing — the orchestrator surfaces the
 * ValidationErrorPanel BEFORE this component renders, so by the time the
 * user reaches InPayFields the values are guaranteed present.
 *
 * Field list (locked literal per §7.3.5):
 *   - planName              (pre-pop M2)
 *   - whoseplan             (pre-pop M2)
 *   - monthlyBenefit        (pre-pop M2)
 *   - benefitStartDate      (pre-pop M2)
 *   - formOfBenefitInPay    (enum; distinct from formOfBenefitOnStatement)
 *
 * NOTE: accruedMonthlyBenefitAtNRA, planNRA, vestingStatus are intentionally
 * absent here — irrelevant in pay status (§7.3.5 spec literal).
 */

import { NumberField, DateField, SelectField, FieldSection } from './_fields.jsx';

const FORM_OF_BENEFIT_IN_PAY_OPTIONS = [
  { value: 'single_life', label: 'Single life' },
  { value: 'joint_50', label: 'Joint & 50% survivor' },
  { value: 'joint_100', label: 'Joint & 100% survivor' },
  { value: 'period_certain', label: 'Period certain' },
];

const WHOSEPLAN_OPTIONS = [
  { value: 'Client', label: 'Client' },
  { value: 'Spouse', label: 'Spouse' },
];

export default function InPayFields({ inputs, onChange }) {
  return (
    <FieldSection title="In-pay-status inputs">
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
        id="pva-input-monthlyBenefit"
        label="Current monthly benefit ($/mo)"
        helper="Pre-pops from the M2 pension claim. The active monthly benefit being paid."
        value={inputs.monthlyBenefit}
        onChange={(v) => onChange('monthlyBenefit', v)}
        min={0}
      />
      <DateField
        id="pva-input-benefitStartDate"
        label="Benefit start date"
        helper="Pre-pops from the M2 pension claim. When monthly payments began."
        value={inputs.benefitStartDate}
        onChange={(v) => onChange('benefitStartDate', v)}
      />
      <SelectField
        id="pva-input-formOfBenefitInPay"
        label="Form of benefit currently in pay"
        helper="v1 PV math values the single-life stream on the participant only; survivor continuation deferred to v1.1 [R5b-19]."
        value={inputs.formOfBenefitInPay ?? 'single_life'}
        onChange={(v) => onChange('formOfBenefitInPay', v ?? 'single_life')}
        options={FORM_OF_BENEFIT_IN_PAY_OPTIONS}
        allowEmpty={false}
      />
    </FieldSection>
  );
}
