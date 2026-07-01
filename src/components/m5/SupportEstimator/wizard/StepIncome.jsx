'use client';
import WizardSection from '@/src/components/wizard/WizardSection';
import WizardField from '@/src/components/wizard/WizardField';
import WizardSelector from '@/src/components/wizard/WizardSelector';
import { STATE_OPTIONS, HELP } from './copy';

export default function StepIncome({ inputs, set, sources }) {
  return (
    <div data-testid="se-step-income">
      <WizardSection title="MONTHLY INCOME" first>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 20 }}>
          <WizardField label="What you earn" field="incomeYou" value={inputs.incomeYou}
            onChange={set} numeric prefix="$" prefilledFrom={sources?.incomeYou ? 'M3' : undefined}
            tooltip={HELP.incomeYou} />
          <WizardField label="What your spouse earns" field="incomeSpouse" value={inputs.incomeSpouse}
            onChange={set} numeric prefix="$" prefilledFrom={sources?.incomeSpouse ? 'M4' : undefined}
            tooltip={HELP.incomeSpouse} />
        </div>
      </WizardSection>
      <WizardSection title="WHERE YOU LIVE">
        <div style={{ maxWidth: 320 }}>
          <WizardSelector label="Your state" field="region" value={inputs.region}
            onChange={set} options={STATE_OPTIONS} tooltip={HELP.state} />
        </div>
      </WizardSection>
    </div>
  );
}
