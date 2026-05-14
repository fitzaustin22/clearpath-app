'use client';

/**
 * ValidationErrorPanel — surfaces R3 routing data-completeness guard per spec
 * §7.2 R3 / §7.10.3 / [R5b-8].
 *
 * Currently the only error variant is `in_pay_data_incomplete`, fired by
 * `prePopulatePVAInputs` when an M2 claim is marked `accrualStatus === 'in_pay_status'`
 * but is missing `monthlyBenefit` and/or `benefitStartDate`. PVA refuses to
 * enter the in-pay path until the user completes the M2 claim.
 *
 * @param {object} props
 * @param {{error: string, missingFields: string[]}} props.error
 */

import { T } from '@/src/lib/brand/tokens';

const MESSAGE_BY_ERROR = {
  in_pay_data_incomplete:
    'This pension claim is marked as currently being paid (in-pay status), but the M2 inventory is missing the data PVA needs to value it. Please complete the following in M2 (Know What You Own), then return to PVA:',
};

const FIELD_LABELS = {
  monthlyBenefit: 'Current monthly benefit amount',
  benefitStartDate: 'Benefit start date',
};

export default function ValidationErrorPanel({ error }) {
  if (!error?.error) return null;

  const message = MESSAGE_BY_ERROR[error.error] ?? `Validation error: ${error.error}`;
  const missing = Array.isArray(error.missingFields) ? error.missingFields : [];

  return (
    <div
      data-testid="pva-validation-error"
      style={{
        marginTop: 16,
        padding: 16,
        background: T.RED_BG,
        border: `2px solid ${T.RED}`,
        borderRadius: 8,
        fontFamily: T.FONT_BODY,
        color: T.NAVY,
      }}
    >
      <div
        style={{
          fontFamily: T.FONT_DISPLAY,
          fontSize: '1rem',
          fontWeight: 600,
          color: T.RED,
          marginBottom: 8,
        }}
      >
        Cannot value this pension yet
      </div>
      <p style={{ margin: '0 0 8px 0', lineHeight: 1.5 }}>{message}</p>
      {missing.length > 0 && (
        <ul
          data-testid="pva-validation-error-missing"
          style={{ margin: '0 0 0 1.25rem', padding: 0, color: T.NAVY }}
        >
          {missing.map((f) => (
            <li key={f} style={{ marginBottom: 4 }}>
              {FIELD_LABELS[f] ?? f}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
