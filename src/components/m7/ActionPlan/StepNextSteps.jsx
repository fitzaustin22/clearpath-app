'use client';

/**
 * Step 1 — Next Steps. An add/remove row editor (mirrors the M6 Priorities list
 * management). Each row has a required step plus optional timeline / responsible.
 * Above the list: the optional, dismissible seeded suggestions —
 * selectSuggestedSteps(blueprint.sections) filtered against the store's
 * dismissedSuggestions. "Add" applies a suggestion (it becomes an editable row
 * and auto-dismisses); "Dismiss" hides it for the session.
 */

import { T } from '@/src/lib/brand/tokens';
import useM7Store, { selectSuggestedSteps } from '@/src/stores/m7Store';
import useBlueprintStore from '@/src/stores/blueprintStore';
import { ACTION_PLAN_COPY } from './copy';
import { PrimaryButton, SecondaryButton, ChipButton, GhostButton, RowCard } from './ui';
import WizardField from '@/src/components/wizard/WizardField';

const sectionHeaderStyle = {
  fontFamily: T.FONT_BODY,
  fontWeight: 600,
  fontSize: 12,
  textTransform: 'uppercase',
  letterSpacing: '0.6px',
  color: T.MUTED,
  marginBottom: 6,
};

export default function StepNextSteps({ onNext, onBack }) {
  const c = ACTION_PLAN_COPY.nextSteps;
  const common = ACTION_PLAN_COPY.common;

  const nextSteps = useM7Store((s) => s.actionPlan.nextSteps);
  const addNextStep = useM7Store((s) => s.addNextStep);
  const updateNextStep = useM7Store((s) => s.updateNextStep);
  const removeNextStep = useM7Store((s) => s.removeNextStep);
  const applySuggestedStep = useM7Store((s) => s.applySuggestedStep);
  const dismissSuggestion = useM7Store((s) => s.dismissSuggestion);
  const dismissed = useM7Store((s) => s.dismissedSuggestions);

  const sections = useBlueprintStore((s) => s.sections);
  const suggestions = selectSuggestedSteps(sections).filter((sg) => !dismissed.includes(sg));

  return (
    <div data-testid="action-plan-step-next-steps">
      <h2 style={{ fontFamily: T.FONT_DISPLAY, fontWeight: 700, fontSize: 24, color: T.NAVY, margin: '0 0 8px 0' }}>
        {c.title}
      </h2>
      <p style={{ fontFamily: T.FONT_BODY, fontSize: 15, lineHeight: 1.55, color: T.INK_2, margin: '0 0 20px 0' }}>
        {c.subhead}
      </p>

      {suggestions.length > 0 && (
        <div data-testid="action-plan-suggestions" style={{ marginBottom: 24 }}>
          <div style={sectionHeaderStyle}>{c.suggestHeader}</div>
          <p style={{ fontFamily: T.FONT_BODY, fontSize: 13, lineHeight: 1.5, color: T.MUTED, margin: '0 0 10px 0' }}>
            {c.suggestExplainer}
          </p>
          {suggestions.map((sg) => (
            <div
              key={sg}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                padding: '8px 0',
                borderTop: `1px solid ${T.LINE}`,
              }}
            >
              <span style={{ flex: 1, fontFamily: T.FONT_BODY, fontSize: 14, color: T.INK }}>{sg}</span>
              <ChipButton onClick={() => applySuggestedStep(sg)} ariaLabel={`${c.suggestAdd}: ${sg}`}>
                {c.suggestAdd}
              </ChipButton>
              <GhostButton onClick={() => dismissSuggestion(sg)} ariaLabel={`${c.suggestDismiss}: ${sg}`}>
                {c.suggestDismiss}
              </GhostButton>
            </div>
          ))}
        </div>
      )}

      {nextSteps.length === 0 ? (
        <p data-testid="action-plan-next-steps-empty" style={{ fontFamily: T.FONT_BODY, fontSize: 14, lineHeight: 1.55, color: T.MUTED, margin: '0 0 16px 0' }}>
          {c.emptyState}
        </p>
      ) : (
        <div style={{ marginBottom: 16 }}>
          {nextSteps.map((s) => (
            <RowCard key={s.id}>
              <WizardField
                label={c.stepLabel}
                field="step"
                value={s.step}
                onChange={(f, v) => updateNextStep(s.id, { [f]: v })}
              />
              <div style={{ marginTop: 12 }}>
                <WizardField
                  label={c.timelineLabel}
                  field="timeline"
                  value={s.timeline}
                  onChange={(f, v) => updateNextStep(s.id, { [f]: v })}
                />
              </div>
              <div style={{ marginTop: 12 }}>
                <WizardField
                  label={c.responsibleLabel}
                  field="responsible"
                  value={s.responsible}
                  onChange={(f, v) => updateNextStep(s.id, { [f]: v })}
                />
              </div>
              <div style={{ textAlign: 'right', marginTop: 8 }}>
                <GhostButton onClick={() => removeNextStep(s.id)} ariaLabel={`${common.remove}: ${s.step || 'step'}`}>
                  {common.remove}
                </GhostButton>
              </div>
            </RowCard>
          ))}
        </div>
      )}

      <ChipButton onClick={() => addNextStep()} ariaLabel={c.addLabel}>
        {c.addLabel}
      </ChipButton>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 28 }}>
        <SecondaryButton onClick={onBack}>{common.back}</SecondaryButton>
        <PrimaryButton onClick={onNext}>{c.continue}</PrimaryButton>
      </div>
    </div>
  );
}
