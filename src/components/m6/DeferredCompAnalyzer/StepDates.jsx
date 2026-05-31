'use client';

import { useM6Store } from '@/src/stores/m6Store';
import WizardDate from '@/src/components/wizard/WizardDate';
import WizardField from '@/src/components/wizard/WizardField';
import { DCA_COPY } from './copy';
import { StepHeading, NavRow } from './ui';

// Step 1 — the dates the coverture fraction is built from (+ state for framing,
// fmv for the intrinsic estimate). Hug measures from hire; Nelson from grant.
export default function StepDates({ onNext, onBack }) {
  const analysis = useM6Store((s) => s.deferredCompAnalyzer.analysis);
  const setAnalysisField = useM6Store((s) => s.setAnalysisField);
  const c = DCA_COPY.dates;
  if (!analysis) return null;

  const set = (field, value) => setAnalysisField(field, value);

  return (
    <div data-testid="dca-step-dates">
      <StepHeading title={c.title} subhead={c.subhead} />

      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <WizardDate
          label={c.hire}
          field="hireDate"
          value={analysis.hireDate ?? ''}
          onChange={set}
          data-testid="dca-date-hire"
        />
        <WizardDate
          label={c.grant}
          field="grantDate"
          value={analysis.grantDate ?? ''}
          onChange={set}
          data-testid="dca-date-grant"
        />
        <WizardDate
          label={c.separation}
          field="separationDate"
          value={analysis.separationDate ?? ''}
          onChange={set}
          data-testid="dca-date-separation"
        />
        <WizardField
          label={c.state}
          field="state"
          value={analysis.state ?? ''}
          onChange={set}
          placeholder={c.statePlaceholder}
          tooltip={c.stateHint}
          data-testid="dca-field-state"
        />
        <WizardField
          label={c.fmv}
          field="fmv"
          value={analysis.fmv ?? ''}
          onChange={set}
          numeric
          prefix="$"
          tooltip={c.fmvHint}
          data-testid="dca-field-fmv"
        />
      </div>

      <NavRow onBack={onBack} onNext={onNext} backLabel={c.back} nextLabel={c.continue} />
    </div>
  );
}
