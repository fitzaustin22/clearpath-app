'use client';

import { T } from '@/src/lib/brand/tokens';
import { useM6Store } from '@/src/stores/m6Store';
import useBlueprintStore from '@/src/stores/blueprintStore';
import WizardDate from '@/src/components/wizard/WizardDate';
import WizardField from '@/src/components/wizard/WizardField';
import { DCA_COPY } from './copy';
import { StepHeading, NavRow, Panel } from './ui';

// Step 2 — vesting tranches. Each is a vest date + a share count, entered BY HAND.
// The stub's free-text `vestingSchedule` is shown ONLY as a reference hint below —
// it is never parsed into tranches (a wrong parse would silently skew the
// coverture fractions; see the §9 build-audit checkpoint and §9.7 #11).
export default function StepTranches({ onNext, onBack }) {
  const dcaState = useM6Store((s) => s.deferredCompAnalyzer);
  const setAnalysisField = useM6Store((s) => s.setAnalysisField);
  const addTranche = useM6Store((s) => s.addTranche);
  const removeTranche = useM6Store((s) => s.removeTranche);
  const stubs = useBlueprintStore((s) => s.deferredCompStubs);
  const c = DCA_COPY.tranches;

  const analysis = dcaState.analysis;
  if (!analysis) return null;

  const stub = stubs.find((s) => s.id === dcaState.stubId);
  const scheduleHint = stub && typeof stub.vestingSchedule === 'string' ? stub.vestingSchedule.trim() : '';
  const set = (field, value) => setAnalysisField(field, value);

  return (
    <div data-testid="dca-step-tranches">
      <StepHeading title={c.title} subhead={c.subhead} />

      {scheduleHint && (
        <div
          data-testid="dca-schedule-hint"
          style={{
            marginBottom: 16,
            padding: '10px 14px',
            border: `1px dashed ${T.LINE_STRONG}`,
            borderRadius: 8,
            backgroundColor: T.PARCHMENT,
            fontFamily: T.FONT_BODY,
            fontSize: 13.5,
            color: T.INK_2,
            lineHeight: 1.5,
          }}
        >
          <span style={{ fontWeight: 700, color: T.NAVY }}>{c.scheduleHintLabel}</span>{' '}
          {scheduleHint}
          <div style={{ marginTop: 4, fontSize: 12.5, color: T.MUTED }}>{c.scheduleHintNote}</div>
        </div>
      )}

      {analysis.tranches.length === 0 ? (
        <Panel>
          <p style={{ fontFamily: T.FONT_BODY, fontSize: 15, color: T.INK_2, margin: 0 }}>{c.empty}</p>
        </Panel>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {analysis.tranches.map((tr, idx) => (
            <Panel key={tr.id} data-testid={`dca-tranche-${tr.id}`}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                <span style={{ fontFamily: T.FONT_BODY, fontWeight: 700, fontSize: 13, color: T.NAVY_55 }}>
                  Tranche {idx + 1}
                </span>
                <button
                  type="button"
                  data-testid={`dca-tranche-remove-${tr.id}`}
                  onClick={() => removeTranche(tr.id)}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: T.RED,
                    fontFamily: T.FONT_BODY,
                    fontSize: 13,
                    fontWeight: 600,
                    cursor: 'pointer',
                    padding: 0,
                  }}
                >
                  {c.remove}
                </button>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <WizardDate
                  label={c.vest}
                  field={`tranches.${tr.id}.vestDate`}
                  value={tr.vestDate ?? ''}
                  onChange={set}
                  data-testid={`dca-tranche-vest-${tr.id}`}
                />
                <WizardField
                  label={c.shares}
                  field={`tranches.${tr.id}.shares`}
                  value={tr.shares ?? ''}
                  onChange={set}
                  numeric
                  data-testid={`dca-tranche-shares-${tr.id}`}
                />
              </div>
            </Panel>
          ))}
        </div>
      )}

      <button
        type="button"
        data-testid="dca-add-tranche"
        onClick={addTranche}
        style={{
          marginTop: 14,
          backgroundColor: 'transparent',
          color: T.NAVY,
          fontFamily: T.FONT_BODY,
          fontWeight: 600,
          fontSize: 14,
          padding: '10px 18px',
          borderRadius: 8,
          border: `1px solid ${T.LINE_STRONG}`,
          cursor: 'pointer',
        }}
      >
        + {c.add}
      </button>

      <NavRow onBack={onBack} onNext={onNext} backLabel={c.back} nextLabel={c.continue} />
    </div>
  );
}
