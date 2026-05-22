'use client';

/**
 * CashBalanceFields — path-specific inputs for cash-balance pass-through per spec §7.3.6.
 *
 * Primary input: `currentAccountBalance` (pass-through PV).
 *
 * Optional coverture extension: when the user wants the marital portion
 * computed via `computeCovertureFraction` (shared with Tier 3), all four
 * coverture dates must be populated. Surface coverture inputs conditionally
 * via the `applyCoverture` toggle to keep the simple-case UX clean.
 *
 * Field list (locked literal per §7.3.6):
 *   - planName                (pre-pop M2)
 *   - whoseplan               (pre-pop M2)
 *   - currentAccountBalance   (number)
 *   - applyCoverture          (boolean; gates the coverture extension)
 *   - dateOfHire              (ISO date | null)
 *   - dateOfMarriage          (ISO date | null)
 *   - maritalCutoffDate       (ISO date | null)
 *   - expectedRetirementAge   (integer | null)
 */

import { FieldSection } from './_fields.jsx';
import { T } from '@/src/lib/brand/tokens';
import WizardSelector from '@/src/components/wizard/WizardSelector';
import WizardCheckbox from '@/src/components/wizard/WizardCheckbox';
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

const WHOSEPLAN_OPTIONS = [
  { value: 'Client', label: 'Client' },
  { value: 'Spouse', label: 'Spouse' },
];

// expectedRetirementAge accepts free numeric input. The previous NumberField
// min=50/max=80 were non-enforcing HTML5 hints; an earlier per-keystroke
// clamp here made the field untypeable from blank. Range validation belongs
// to the engine.

export default function CashBalanceFields({ inputs, onChange }) {
  const applyCoverture = inputs.applyCoverture === true;
  return (
    <FieldSection title="Cash-balance inputs">
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
          field="currentAccountBalance"
          label="Current account balance ($)"
          tooltip="From the most recent plan statement. PV ≈ current balance (no commutation required for cash balance plans)."
          value={inputs.currentAccountBalance ?? ''}
          onChange={onChange}
          parser="currency"
          prefix="$"
          data-testid="pva-input-currentAccountBalance"
        />
      </div>

      {/* Anomaly A migration (PR-D): the previous render was a raw
          <input type="checkbox"> wrapped in a hand-styled <label> — the only
          PVA field that didn't flow through _fields.jsx. Now routes through
          WizardCheckbox variant="checkbox" per the SE/HDA precedent. */}
      <div style={FIELD_WRAP}>
        <WizardCheckbox
          field="applyCoverture"
          variant="checkbox"
          label="Apply coverture (compute marital portion of balance)"
          value={applyCoverture}
          onChange={onChange}
          data-testid="pva-input-applyCoverture"
        />
      </div>

      {applyCoverture && (
        <>
          <div style={FIELD_WRAP}>
            <WizardDate
              field="dateOfHire"
              label="Date of hire"
              value={inputs.dateOfHire ?? ''}
              onChange={onChange}
              data-testid="pva-input-dateOfHire"
            />
            <p style={HELPER_BELOW}>Required when applying coverture.</p>
          </div>

          <div style={FIELD_WRAP}>
            <WizardDate
              field="dateOfMarriage"
              label="Date of marriage"
              value={inputs.dateOfMarriage ?? ''}
              onChange={onChange}
              data-testid="pva-input-dateOfMarriage"
            />
            <p style={HELPER_BELOW}>Numerator start = max(hire, marriage).</p>
          </div>

          <div style={FIELD_WRAP}>
            <WizardDate
              field="maritalCutoffDate"
              label="Marital cutoff date"
              value={inputs.maritalCutoffDate ?? ''}
              onChange={onChange}
              data-testid="pva-input-maritalCutoffDate"
            />
            <p style={HELPER_BELOW}>Numerator end = min(cutoff, retirement).</p>
          </div>

          <div style={FIELD_WRAP}>
            <NumericFieldBridge
              field="expectedRetirementAge"
              label="Expected retirement age"
              tooltip="Denominator end of total projected service. Required when applying coverture."
              value={inputs.expectedRetirementAge ?? ''}
              onChange={onChange}
              parser="number"
              data-testid="pva-input-expectedRetirementAge"
            />
          </div>
        </>
      )}
    </FieldSection>
  );
}
