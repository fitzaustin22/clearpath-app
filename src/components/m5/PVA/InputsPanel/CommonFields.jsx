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
 *
 * `section` prop partitions the field list so the orchestrator can keep the
 * compute-critical inputs always-visible while collapsing the optional ones
 * (fix for the #97 reskin regression that buried the required participantDOB
 * behind a collapsed "Assumptions" disclosure → engine threw → null PV):
 *   - 'required'    — participantDOB, caseEffectiveDate, cola (drive the math;
 *                     not pre-populated, so they must be surfaced)
 *   - 'assumptions' — mortalityTable (seeded default), discountRateBps (legacy/
 *                     inert), planAdministratorOfferedLumpSum (optional compare)
 *   - 'all'         — every field (default; back-compat for any direct consumer)
 */

import { useEffect } from 'react';
import { FieldSection } from './_fields.jsx';
import { T } from '@/src/lib/brand/tokens';
import WizardSelector from '@/src/components/wizard/WizardSelector';
import WizardDate from '@/src/components/wizard/WizardDate';
import NumericFieldBridge from '@/src/components/m5/wizard-bridge/NumericFieldBridge.jsx';

const FIELD_WRAP = { marginBottom: 14 };

// Hint paragraph below WizardDate. WizardDate has no `tooltip` prop, so
// date-helper copy renders verbatim as a muted <p> directly under the
// input (Visual-D fallback established by PR-B SE migration #31).
const HELPER_BELOW = {
  fontFamily: T.FONT_BODY,
  fontSize: 13,
  color: T.NAVY_55,
  margin: '6px 0 0',
};

const MORTALITY_OPTIONS = [
  { value: 'irs_417e', label: 'IRS §417(e) unisex (default)' },
  { value: 'pub_2010', label: 'Pub. 2010 (alternative)' },
  { value: 'rp_2014', label: 'RP-2014 (alternative)' },
];

// min/max preservation. The previous NumberField primitive accepted
// `min` and `max` props that mapped to the native <input type="number">
// validation attributes — those are HTML hints, not coercers, so the
// store could (and did) receive out-of-range values. The wizard-migration
// playbook moves clamping into the parent `onChange`; we wrap the values
// here so the store sees the same in-range numbers as a user would
// reasonably enter via the previous spinner controls.
const clampBps = (n) => (n == null ? null : Math.max(0, Math.min(15000, n)));
const clampCola = (n) => (n == null ? null : Math.max(0, Math.min(10, n)));

const SECTION_TITLE = {
  required: 'Participant & valuation details',
  assumptions: null, // labeled by the collapsible disclosure in InputsPanel
  all: 'Common inputs',
};

export default function CommonFields({ inputs, onChange, section = 'all' }) {
  const showRequired = section === 'all' || section === 'required';
  const showAssumptions = section === 'all' || section === 'assumptions';

  // COLA default commit (mirrors ReceiptFormDropdown's Defect-#2): the
  // documented 0% default must reach the store, or a skipped COLA leaves
  // inputs.cola undefined and the frozen engine computes cola/100 = NaN. Only
  // the instance that renders COLA (required/all) owns the commit. Gate on
  // `=== undefined` (never set) — NOT `== null` — so an explicit user-clear to
  // null (TC-PVA-InputsPanel-12/19b) is respected, not clobbered back to 0.
  useEffect(() => {
    if (showRequired && inputs.cola === undefined) onChange('cola', 0);
  }, [showRequired, inputs.cola, onChange]);

  return (
    <FieldSection title={SECTION_TITLE[section] ?? null}>
      {showRequired && (
        <div style={FIELD_WRAP}>
          <WizardDate
            field="participantDOB"
            label="Participant date of birth"
            value={inputs.participantDOB ?? ''}
            onChange={onChange}
            data-testid="pva-input-participantDOB"
          />
          <p style={HELPER_BELOW}>Required. Drives age-based annuity-factor lookup.</p>
        </div>
      )}

      {showRequired && (
        <div style={FIELD_WRAP}>
          <WizardDate
            field="caseEffectiveDate"
            label="Case effective date"
            value={inputs.caseEffectiveDate ?? ''}
            onChange={onChange}
            data-testid="pva-input-caseEffectiveDate"
          />
          <p style={HELPER_BELOW}>
            Snapshot used for §417(e) rate lookup. Defaults from m5Store.caseEffectiveDate.
          </p>
        </div>
      )}

      {showRequired && (
        <div style={FIELD_WRAP}>
          <NumericFieldBridge
            field="cola"
            label="COLA (%)"
            tooltip="Cost-of-living adjustment on the benefit stream. Default 0%."
            value={inputs.cola ?? ''}
            onChange={(field, n) => onChange(field, clampCola(n))}
            parser="number"
            data-testid="pva-input-cola"
          />
        </div>
      )}

      {showAssumptions && (
        <div style={FIELD_WRAP}>
          <WizardSelector
            field="mortalityTable"
            label="Mortality table"
            tooltip="Defaults to IRS §417(e) 2026 unisex applicable mortality table."
            value={inputs.mortalityTable ?? 'irs_417e'}
            onChange={onChange}
            options={MORTALITY_OPTIONS}
            data-testid="pva-input-mortalityTable"
          />
        </div>
      )}

      {showAssumptions && (
        <div style={FIELD_WRAP}>
          <NumericFieldBridge
            field="discountRateBps"
            label="Discount rate (basis points)"
            tooltip="Non-canonical bps: 5234 = 5.234%. Defaults to §417(e) seg 2 at caseEffectiveDate."
            value={inputs.discountRateBps ?? ''}
            onChange={(field, n) => onChange(field, clampBps(n))}
            parser="number"
            data-testid="pva-input-discountRateBps"
          />
        </div>
      )}

      {showAssumptions && (
        <div style={FIELD_WRAP}>
          <NumericFieldBridge
            field="planAdministratorOfferedLumpSum"
            label="Plan-offered lump sum (optional)"
            tooltip="If the plan has offered a lump-sum buyout, enter it here for comparison against the tool's PV."
            value={inputs.planAdministratorOfferedLumpSum ?? ''}
            onChange={onChange}
            parser="currency"
            prefix="$"
            data-testid="pva-input-planAdministratorOfferedLumpSum"
          />
        </div>
      )}
    </FieldSection>
  );
}
