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

import { FieldSection } from './_fields.jsx';
import WizardSelector from '@/src/components/wizard/WizardSelector';
import NumericFieldBridge from '@/src/components/m5/wizard-bridge/NumericFieldBridge.jsx';

const FIELD_WRAP = { marginBottom: 14 };

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

// planNRA accepts free numeric input. The previous NumberField min=50/max=80
// were non-enforcing HTML5 hints; an earlier per-keystroke clamp here made
// the field untypeable from blank (first digit `6` clamped up to 50, second
// `5` appended via the controlled re-render). Range validation belongs to
// the engine, not the input.

export default function Tier1And2Fields({ tier, inputs, onChange }) {
  const title = tier === 'tier_2' ? 'Tier 2 inputs — Estimated accrued benefit' : 'Tier 1 inputs — Accrued benefit known';
  const accruedHelper =
    tier === 'tier_2'
      ? 'Estimated monthly benefit at NRA (from plan estimator or manual calc).'
      : 'Accrued monthly benefit at NRA from official plan statement.';

  return (
    <FieldSection title={title}>
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
          field="planNRA"
          label="Plan Normal Retirement Age (NRA)"
          tooltip="Typically age 65. Defines when the deferred annuity starts."
          value={inputs.planNRA ?? ''}
          onChange={onChange}
          parser="number"
          data-testid="pva-input-planNRA"
        />
      </div>

      <div style={FIELD_WRAP}>
        <NumericFieldBridge
          field="accruedMonthlyBenefitAtNRA"
          label="Accrued monthly benefit at NRA ($/mo)"
          tooltip={accruedHelper}
          value={inputs.accruedMonthlyBenefitAtNRA ?? ''}
          onChange={onChange}
          parser="currency"
          prefix="$"
          data-testid="pva-input-accruedMonthlyBenefitAtNRA"
        />
      </div>

      <div style={FIELD_WRAP}>
        <WizardSelector
          field="formOfBenefitOnStatement"
          label="Form of benefit on statement"
          tooltip="Defaults to single-life. Other forms surface an informational callout; v1 PV math uses single-life."
          value={inputs.formOfBenefitOnStatement ?? 'single_life'}
          onChange={onChange}
          options={FORM_OF_BENEFIT_OPTIONS}
          data-testid="pva-input-formOfBenefitOnStatement"
        />
      </div>

      <div style={FIELD_WRAP}>
        <WizardSelector
          field="vestingStatus"
          label="Vesting status"
          tooltip="Defaults to fully vested. Partial / not vested surfaces a callout; v1 PV math is not vesting-discounted."
          value={inputs.vestingStatus ?? 'fully_vested'}
          onChange={onChange}
          options={VESTING_OPTIONS}
          data-testid="pva-input-vestingStatus"
        />
      </div>
    </FieldSection>
  );
}
