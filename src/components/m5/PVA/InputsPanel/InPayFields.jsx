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

import { FieldSection } from './_fields.jsx';
import { T } from '@/src/lib/brand/tokens';
import WizardSelector from '@/src/components/wizard/WizardSelector';
import WizardDate from '@/src/components/wizard/WizardDate';
import NumericFieldBridge from '@/src/components/m5/wizard-bridge/NumericFieldBridge.jsx';

const FIELD_WRAP = { marginBottom: 14 };

// WizardDate has no `tooltip` prop — helper renders as muted <p> below
// (Visual-D fallback per PR-B SE migration).
const HELPER_BELOW = {
  fontFamily: T.FONT_BODY,
  fontSize: 13,
  color: T.NAVY_55,
  margin: '6px 0 0',
};

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
      <div style={FIELD_WRAP}>
        <WizardSelector
          field="whoseplan"
          label="Whose plan"
          tooltip="Pre-pops from the M2 pension claim."
          value={inputs.whoseplan ?? ''}
          onChange={onChange}
          options={WHOSEPLAN_OPTIONS}
          data-testid="pva-input-whoseplan"
        />
      </div>

      <div style={FIELD_WRAP}>
        <NumericFieldBridge
          field="monthlyBenefit"
          label="Current monthly benefit ($/mo)"
          tooltip="Pre-pops from the M2 pension claim. The active monthly benefit being paid."
          value={inputs.monthlyBenefit ?? ''}
          onChange={onChange}
          parser="currency"
          prefix="$"
          data-testid="pva-input-monthlyBenefit"
        />
      </div>

      <div style={FIELD_WRAP}>
        <WizardDate
          field="benefitStartDate"
          label="Benefit start date"
          value={inputs.benefitStartDate ?? ''}
          onChange={onChange}
          data-testid="pva-input-benefitStartDate"
        />
        <p style={HELPER_BELOW}>
          Pre-pops from the M2 pension claim. When monthly payments began.
        </p>
      </div>

      <div style={FIELD_WRAP}>
        <WizardSelector
          field="formOfBenefitInPay"
          label="Form of benefit currently in pay"
          tooltip="v1 PV math values the single-life stream on the participant only; survivor continuation deferred to v1.1 [R5b-19]."
          value={inputs.formOfBenefitInPay ?? 'single_life'}
          onChange={onChange}
          options={FORM_OF_BENEFIT_IN_PAY_OPTIONS}
          data-testid="pva-input-formOfBenefitInPay"
        />
      </div>
    </FieldSection>
  );
}
