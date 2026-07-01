'use client';
import WizardSection from '@/src/components/wizard/WizardSection';
import WizardField from '@/src/components/wizard/WizardField';
import WizardSelector from '@/src/components/wizard/WizardSelector';
import ParentingTimeSlider from './ParentingTimeSlider';
import { CHILDREN_OPTIONS, HELP } from './copy';

export default function StepChildren({ inputs, set }) {
  const hasKids = (parseInt(inputs.numChildren, 10) || 0) >= 1;
  return (
    <div data-testid="se-step-children">
      <WizardSection title="YOUR CHILDREN" first>
        <div style={{ maxWidth: 320 }}>
          <WizardSelector label="How many children do you share?" field="numChildren"
            value={inputs.numChildren} onChange={set} options={CHILDREN_OPTIONS} />
        </div>
      </WizardSection>
      {hasKids && (
        <>
          <WizardSection title="PARENTING TIME">
            <ParentingTimeSlider value={inputs.parentingPct} onChange={(v) => set('parentingPct', v)} />
          </WizardSection>
          <WizardSection title="MONTHLY COSTS FOR THE CHILDREN">
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 20 }}>
              <WizardField label="Childcare or daycare" field="childcare" value={inputs.childcare}
                onChange={set} numeric prefix="$" tooltip={HELP.childcare} />
              <WizardField label="Children’s health insurance" field="health" value={inputs.health}
                onChange={set} numeric prefix="$" tooltip={HELP.health} />
            </div>
          </WizardSection>
        </>
      )}
    </div>
  );
}
