'use client';

/**
 * Step 4 — Review & Save. Renders the EXACT Blueprint payload
 * (buildActionPlanPayload — incomplete rows already dropped, ids stripped) so
 * what the user sees is what §12 will store. Saving is explicit (no auto-write):
 * it fires saveActionPlanToBlueprint, a success toast, and an inline
 * confirmation with a link to the Blueprint. Save is disabled when the payload
 * is empty (nothing to write). The first-class disclaimer is shown here too.
 */

import { useState } from 'react';
import Link from 'next/link';
import { T } from '@/src/lib/brand/tokens';
import useM7Store, { buildActionPlanPayload } from '@/src/stores/m7Store';
import useToastStore from '@/src/stores/toastStore';
import WizardSection from '@/src/components/wizard/WizardSection';
import { ACTION_PLAN_COPY, ACTION_PLAN_DISCLAIMER } from './copy';
import { PrimaryButton, SecondaryButton, Disclaimer } from './ui';

const itemStyle = { fontFamily: T.FONT_BODY, fontSize: 15, color: T.INK, padding: '4px 0' };
const mutedStyle = { color: T.MUTED };

export default function StepReview({ onBack }) {
  const c = ACTION_PLAN_COPY.review;
  const common = ACTION_PLAN_COPY.common;

  const actionPlan = useM7Store((s) => s.actionPlan);
  const saveActionPlanToBlueprint = useM7Store((s) => s.saveActionPlanToBlueprint);
  const [saved, setSaved] = useState(false);

  const payload = buildActionPlanPayload(actionPlan);
  const canSave =
    payload.nextSteps.length > 0 || payload.professionals.length > 0 || payload.keyDates.length > 0;

  const handleSave = () => {
    if (!canSave) return;
    saveActionPlanToBlueprint();
    useToastStore.getState().show({ message: c.success, variant: 'success' });
    setSaved(true);
  };

  return (
    <div data-testid="action-plan-step-review">
      <h2 style={{ fontFamily: T.FONT_DISPLAY, fontWeight: 700, fontSize: 24, color: T.NAVY, margin: '0 0 12px 0' }}>
        {c.title}
      </h2>
      <p style={{ fontFamily: T.FONT_BODY, fontSize: 14, lineHeight: 1.5, color: T.INK_2, margin: '0 0 8px 0' }}>
        {c.body}
      </p>

      {!canSave ? (
        <p data-testid="action-plan-review-empty" style={{ fontFamily: T.FONT_BODY, fontSize: 14, lineHeight: 1.55, color: T.MUTED, margin: '12px 0' }}>
          {c.emptyState}
        </p>
      ) : (
        <div>
          {payload.nextSteps.length > 0 && (
            <WizardSection title={c.nextStepsHeading} first>
              <ol style={{ margin: 0, paddingLeft: 22 }}>
                {payload.nextSteps.map((s, i) => (
                  <li key={i} style={itemStyle}>
                    {s.step}
                    {s.timeline && <span style={{ color: T.GOLD }}> — {s.timeline}</span>}
                    {s.responsible && <span style={mutedStyle}> ({s.responsible})</span>}
                  </li>
                ))}
              </ol>
            </WizardSection>
          )}

          {payload.professionals.length > 0 && (
            <WizardSection title={c.professionalsHeading} first={payload.nextSteps.length === 0}>
              <div>
                {payload.professionals.map((p, i) => (
                  <div key={i} style={itemStyle}>
                    <strong style={{ color: T.NAVY }}>{p.role}:</strong> {p.name}
                    {p.contact && <span style={mutedStyle}> · {p.contact}</span>}
                  </div>
                ))}
              </div>
            </WizardSection>
          )}

          {payload.keyDates.length > 0 && (
            <WizardSection
              title={c.keyDatesHeading}
              first={payload.nextSteps.length === 0 && payload.professionals.length === 0}
            >
              <div>
                {payload.keyDates.map((d, i) => (
                  <div key={i} style={itemStyle}>
                    <strong style={{ color: T.GOLD }}>{d.date}</strong> — {d.event}
                  </div>
                ))}
              </div>
            </WizardSection>
          )}
        </div>
      )}

      <div style={{ margin: '20px 0' }}>
        <Disclaimer>{ACTION_PLAN_DISCLAIMER}</Disclaimer>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16 }}>
        <SecondaryButton onClick={onBack}>{common.back}</SecondaryButton>
        <PrimaryButton onClick={handleSave} disabled={!canSave}>
          {c.save}
        </PrimaryButton>
      </div>

      {saved && (
        <div
          data-testid="action-plan-save-success"
          role="status"
          style={{ marginTop: 16, border: `1px solid ${T.GREEN}`, backgroundColor: '#EAF5EE', borderRadius: 8, padding: 14 }}
        >
          <div style={{ fontFamily: T.FONT_BODY, fontSize: 14, color: T.INK, marginBottom: 6 }}>{c.success}</div>
          <Link href="/blueprint" style={{ fontFamily: T.FONT_BODY, fontSize: 14, fontWeight: 700, color: T.NAVY }}>
            {c.viewBlueprint} →
          </Link>
        </div>
      )}
    </div>
  );
}
