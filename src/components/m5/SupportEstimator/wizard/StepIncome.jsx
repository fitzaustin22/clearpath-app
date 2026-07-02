'use client';
import { useState } from 'react';
import WizardSection from '@/src/components/wizard/WizardSection';
import WizardField from '@/src/components/wizard/WizardField';
import WizardSelector from '@/src/components/wizard/WizardSelector';
import { STATE_OPTIONS, HELP, INCOME_PLACEHOLDERS, INCOME_REQUIRED_HELP } from './copy';

export default function StepIncome({ inputs, set, sources }) {
  // Touched-then-left-empty tracking for the calm amber nudge (design decision:
  // the nudge fires on blur-while-empty, NOT on a Continue press — Continue is
  // genuinely disabled and must not double as a validate trigger). The flag is
  // sticky; the nudge only DISPLAYS while the field is still empty, so it
  // clears itself the instant a value lands and returns if cleared again.
  const [touchedEmpty, setTouchedEmpty] = useState({});
  const isBlank = (v) => !String(v ?? '').trim();
  const noteEmptyBlur = (field, value) => {
    if (isBlank(value)) setTouchedEmpty((t) => (t[field] ? t : { ...t, [field]: true }));
  };
  const nudge = (field) =>
    touchedEmpty[field] && isBlank(inputs[field]) ? INCOME_REQUIRED_HELP[field] : null;

  return (
    <div data-testid="se-step-income">
      <WizardSection title="MONTHLY INCOME" first>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 20 }}>
          <WizardField label="What you earn" field="incomeYou" value={inputs.incomeYou}
            onChange={set} numeric prefix="$" prefilledFrom={sources?.incomeYou ? 'M3' : undefined}
            tooltip={HELP.incomeYou} required placeholder={INCOME_PLACEHOLDERS.incomeYou}
            onBlur={noteEmptyBlur} error={nudge('incomeYou')} tone="amber" />
          <WizardField label="What your spouse earns" field="incomeSpouse" value={inputs.incomeSpouse}
            onChange={set} numeric prefix="$" prefilledFrom={sources?.incomeSpouse ? 'M4' : undefined}
            tooltip={HELP.incomeSpouse} required placeholder={INCOME_PLACEHOLDERS.incomeSpouse}
            onBlur={noteEmptyBlur} error={nudge('incomeSpouse')} tone="amber" />
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
