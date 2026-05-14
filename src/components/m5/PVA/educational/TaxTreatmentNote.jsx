'use client';

import { T } from '@/src/lib/brand/tokens';

/**
 * §7.9.4 — Universal disclaimer (tax_treatment_note). Always rendered on
 * compute paths; not collapsible. Spec-pinned copy verbatim per LL-25.
 */
export default function TaxTreatmentNote() {
  return (
    <div
      data-testid="tax-treatment-note"
      style={{
        marginTop: '1rem',
        padding: '12px 16px',
        background: T.PARCHMENT,
        color: T.NAVY,
        border: `1px solid ${T.NAVY_12}`,
        borderRadius: 6,
        fontFamily: T.FONT_BODY,
        fontSize: 14,
        lineHeight: 1.55,
      }}
    >
      <p style={{ margin: 0 }}>
        <strong>Tax treatment.</strong> The PV figure shown is the pre-tax actuarial PV of the future benefit stream. Actual after-tax value depends on receipt form: monthly stream → ordinary income at receipt; lump-sum rollover to IRA → no current tax, ordinary income at later withdrawal; lump-sum cash with QDRO §72(t) exemption → ordinary income at receipt with no early-withdrawal penalty (alternate payee under 59½). M4 PIT integrates with PVA via the <code style={{ fontFamily: T.FONT_BODY }}>receiptForm</code> selection to compute tax-adjusted value. See M4 Tool 2 (PIT) for the tax discount calculation.
      </p>
    </div>
  );
}
