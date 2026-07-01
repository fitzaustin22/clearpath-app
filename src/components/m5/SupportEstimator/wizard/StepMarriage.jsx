'use client';
import WizardSection from '@/src/components/wizard/WizardSection';
import WizardField from '@/src/components/wizard/WizardField';
import { Disclaimer } from './ui';
import { HELP, STEP3_CALLOUT } from './copy';

export default function StepMarriage({ inputs, set }) {
  return (
    <div data-testid="se-step-marriage">
      <WizardSection title="LENGTH OF MARRIAGE" first>
        <div style={{ maxWidth: 320 }}>
          <WizardField label="How long have you been married?" field="marriageYears"
            value={inputs.marriageYears} onChange={set} numeric suffix="years" tooltip={HELP.marriage} />
        </div>
      </WizardSection>
      <WizardSection title="EXISTING OBLIGATIONS">
        <div style={{ maxWidth: 320 }}>
          <WizardField label="Support you already pay each month" field="existingSupport"
            value={inputs.existingSupport} onChange={set} numeric prefix="$" tooltip={HELP.existing} />
        </div>
      </WizardSection>
      <div style={{ marginTop: 16 }}>
        <Disclaimer>{STEP3_CALLOUT}</Disclaimer>
      </div>
    </div>
  );
}
