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

import { NumberField, DateField, SelectField, FieldSection } from './_fields.jsx';
import { T } from '@/src/lib/brand/tokens';

const WHOSEPLAN_OPTIONS = [
  { value: 'Client', label: 'Client' },
  { value: 'Spouse', label: 'Spouse' },
];

export default function CashBalanceFields({ inputs, onChange }) {
  const applyCoverture = inputs.applyCoverture === true;
  return (
    <FieldSection title="Cash-balance inputs">
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
        id="pva-input-currentAccountBalance"
        label="Current account balance ($)"
        helper="From the most recent plan statement. PV ≈ current balance (no commutation required for cash balance plans)."
        value={inputs.currentAccountBalance}
        onChange={(v) => onChange('currentAccountBalance', v)}
        min={0}
      />

      <div style={{ marginBottom: 14 }}>
        <label
          htmlFor="pva-input-applyCoverture"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 8,
            fontFamily: T.FONT_BODY,
            fontSize: 14,
            color: T.NAVY,
          }}
        >
          <input
            id="pva-input-applyCoverture"
            data-testid="pva-input-applyCoverture"
            type="checkbox"
            checked={applyCoverture}
            onChange={(e) => onChange('applyCoverture', e.target.checked)}
          />
          Apply coverture (compute marital portion of balance)
        </label>
      </div>

      {applyCoverture && (
        <>
          <DateField
            id="pva-input-dateOfHire"
            label="Date of hire"
            helper="Required when applying coverture."
            value={inputs.dateOfHire}
            onChange={(v) => onChange('dateOfHire', v)}
          />
          <DateField
            id="pva-input-dateOfMarriage"
            label="Date of marriage"
            helper="Numerator start = max(hire, marriage)."
            value={inputs.dateOfMarriage}
            onChange={(v) => onChange('dateOfMarriage', v)}
          />
          <DateField
            id="pva-input-maritalCutoffDate"
            label="Marital cutoff date"
            helper="Numerator end = min(cutoff, retirement)."
            value={inputs.maritalCutoffDate}
            onChange={(v) => onChange('maritalCutoffDate', v)}
          />
          <NumberField
            id="pva-input-expectedRetirementAge"
            label="Expected retirement age"
            helper="Denominator end of total projected service. Required when applying coverture."
            value={inputs.expectedRetirementAge}
            onChange={(v) => onChange('expectedRetirementAge', v)}
            min={50}
            max={80}
            step={1}
          />
        </>
      )}
    </FieldSection>
  );
}
