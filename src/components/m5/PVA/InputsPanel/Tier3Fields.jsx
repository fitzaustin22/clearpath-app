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

import { FieldSection } from './_fields.jsx';
import { T } from '@/src/lib/brand/tokens';
import WizardSelector from '@/src/components/wizard/WizardSelector';
import WizardDate from '@/src/components/wizard/WizardDate';
import NumericFieldBridge from '@/src/components/m5/wizard-bridge/NumericFieldBridge.jsx';

const FIELD_WRAP = { marginBottom: 14 };

// WizardDate has no `tooltip` prop, so date-helper copy renders verbatim
// as a muted <p> directly under the input (Visual-D fallback established
// by PR-B SE migration #31).
const HELPER_BELOW = {
  fontFamily: T.FONT_BODY,
  fontSize: 13,
  color: T.NAVY_55,
  margin: '6px 0 0',
};

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

// planNRA / expectedRetirementAge accept free numeric input. The previous
// NumberField min=50/max=80 were non-enforcing HTML5 hints; an earlier
// per-keystroke clamp here made these fields untypeable from blank (first
// digit clamped up to 50, second appended via the controlled re-render).
// Range validation belongs to the engine, not the input.

export default function Tier3Fields({ inputs, onChange }) {
  return (
    <FieldSection title="Tier 3 inputs — Coverture">
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
          tooltip="Typically age 65."
          value={inputs.planNRA ?? ''}
          onChange={onChange}
          parser="number"
          data-testid="pva-input-planNRA"
        />
      </div>

      <div style={FIELD_WRAP}>
        <WizardDate
          field="dateOfHire"
          label="Date of hire"
          value={inputs.dateOfHire ?? ''}
          onChange={onChange}
          data-testid="pva-input-dateOfHire"
        />
        <p style={HELPER_BELOW}>Required for coverture. Drives the denominator (total service).</p>
      </div>

      <div style={FIELD_WRAP}>
        <WizardDate
          field="dateOfMarriage"
          label="Date of marriage"
          value={inputs.dateOfMarriage ?? ''}
          onChange={onChange}
          data-testid="pva-input-dateOfMarriage"
        />
        <p style={HELPER_BELOW}>Drives the numerator start (max of hire, marriage).</p>
      </div>

      <div style={FIELD_WRAP}>
        <WizardDate
          field="maritalCutoffDate"
          label="Marital cutoff date"
          value={inputs.maritalCutoffDate ?? ''}
          onChange={onChange}
          data-testid="pva-input-maritalCutoffDate"
        />
        <p style={HELPER_BELOW}>
          Drives the numerator end (min of cutoff, retirement). Must be on or after marriage.
        </p>
      </div>

      <div style={FIELD_WRAP}>
        <NumericFieldBridge
          field="expectedRetirementAge"
          label="Expected retirement age"
          tooltip="Drives the denominator end (total projected service to retirement). Defaults to plan NRA."
          value={inputs.expectedRetirementAge ?? ''}
          onChange={onChange}
          parser="number"
          data-testid="pva-input-expectedRetirementAge"
        />
      </div>

      <div style={FIELD_WRAP}>
        <NumericFieldBridge
          field="currentAccruedMonthlyBenefit"
          label="Current accrued monthly benefit ($/mo)"
          tooltip="The monthly benefit if the participant retired today (frozen at valuation date). Tier 3 does NOT project salary growth."
          value={inputs.currentAccruedMonthlyBenefit ?? ''}
          onChange={onChange}
          parser="currency"
          prefix="$"
          data-testid="pva-input-currentAccruedMonthlyBenefit"
        />
      </div>

      <div style={FIELD_WRAP}>
        <WizardSelector
          field="formOfBenefitOnStatement"
          label="Form of benefit on statement"
          tooltip="Defaults to single-life."
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
          tooltip="Defaults to fully vested."
          value={inputs.vestingStatus ?? 'fully_vested'}
          onChange={onChange}
          options={VESTING_OPTIONS}
          data-testid="pva-input-vestingStatus"
        />
      </div>

      <div style={FIELD_WRAP}>
        <WizardSelector
          field="benefitSource"
          label="Benefit source"
          tooltip="Origin of the current accrued monthly benefit figure."
          value={inputs.benefitSource ?? ''}
          onChange={onChange}
          options={BENEFIT_SOURCE_OPTIONS}
          placeholder="— select —"
          data-testid="pva-input-benefitSource"
        />
      </div>
    </FieldSection>
  );
}
