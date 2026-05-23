'use client';

/**
 * Shared structural chrome for the PVA InputsPanel sub-components.
 *
 * The four input primitives that previously lived here (NumberField,
 * DateField, SelectField, RadioGroup) were retired in PR-D as part of the
 * wizard-foundation migration. Their consumers now compose the shared
 * wizard primitives directly (WizardField via NumericFieldBridge,
 * WizardSelector, WizardCheckbox, WizardDate, WizardRadio).
 *
 * Only `FieldSection` remains here — it's the per-subpanel card wrapper
 * (h3 title + parchment-card chrome) shared across PlanTypeSelector,
 * CommonFields, TierOverride, the four path subpanels, FlagOnlyFields,
 * and ReceiptFormDropdown.
 */

import { T } from '@/src/lib/brand/tokens';

export function FieldSection({ title, children }) {
  return (
    <section
      style={{
        marginBottom: 24,
        padding: 16,
        background: T.CARD,
        border: `1px solid ${T.NAVY_12}`,
        borderRadius: 8,
      }}
    >
      {title && (
        <h3
          style={{
            fontFamily: T.FONT_DISPLAY,
            fontSize: '1rem',
            fontWeight: 500,
            color: T.NAVY,
            margin: '0 0 12px 0',
          }}
        >
          {title}
        </h3>
      )}
      {children}
    </section>
  );
}
