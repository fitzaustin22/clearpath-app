'use client';

/**
 * Step 3 — Key dates. An add/remove row editor. Each row: a native date input
 * (ISO storage) + a free-text event. Both are required for the row to reach the
 * Blueprint (buildActionPlanPayload drops a key-date missing either).
 */

import { T } from '@/src/lib/brand/tokens';
import useM7Store from '@/src/stores/m7Store';
import { ACTION_PLAN_COPY } from './copy';
import { PrimaryButton, SecondaryButton, ChipButton, GhostButton, RowCard } from './ui';
import WizardField from '@/src/components/wizard/WizardField';
import WizardDate from '@/src/components/wizard/WizardDate';

export default function StepKeyDates({ onNext, onBack }) {
  const c = ACTION_PLAN_COPY.keyDates;
  const common = ACTION_PLAN_COPY.common;

  const keyDates = useM7Store((s) => s.actionPlan.keyDates);
  const addKeyDate = useM7Store((s) => s.addKeyDate);
  const updateKeyDate = useM7Store((s) => s.updateKeyDate);
  const removeKeyDate = useM7Store((s) => s.removeKeyDate);

  return (
    <div data-testid="action-plan-step-key-dates">
      <h2 style={{ fontFamily: T.FONT_DISPLAY, fontWeight: 700, fontSize: 24, color: T.NAVY, margin: '0 0 8px 0' }}>
        {c.title}
      </h2>
      <p style={{ fontFamily: T.FONT_BODY, fontSize: 15, lineHeight: 1.55, color: T.INK_2, margin: '0 0 20px 0' }}>
        {c.subhead}
      </p>

      {keyDates.length === 0 ? (
        <p data-testid="action-plan-key-dates-empty" style={{ fontFamily: T.FONT_BODY, fontSize: 14, lineHeight: 1.55, color: T.MUTED, margin: '0 0 16px 0' }}>
          {c.emptyState}
        </p>
      ) : (
        <div style={{ marginBottom: 16 }}>
          {keyDates.map((d) => (
            <RowCard key={d.id}>
              <WizardDate
                label={c.dateLabel}
                field="date"
                value={d.date}
                onChange={(f, v) => updateKeyDate(d.id, { [f]: v })}
              />
              <div style={{ marginTop: 12 }}>
                <WizardField
                  label={c.eventLabel}
                  field="event"
                  value={d.event}
                  onChange={(f, v) => updateKeyDate(d.id, { [f]: v })}
                />
              </div>
              <div style={{ textAlign: 'right', marginTop: 8 }}>
                <GhostButton onClick={() => removeKeyDate(d.id)} ariaLabel={`${common.remove}: ${d.event || d.date || 'date'}`}>
                  {common.remove}
                </GhostButton>
              </div>
            </RowCard>
          ))}
        </div>
      )}

      <ChipButton onClick={() => addKeyDate()} ariaLabel={c.addLabel}>
        {c.addLabel}
      </ChipButton>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 28 }}>
        <SecondaryButton onClick={onBack}>{common.back}</SecondaryButton>
        <PrimaryButton onClick={onNext}>{c.continue}</PrimaryButton>
      </div>
    </div>
  );
}
