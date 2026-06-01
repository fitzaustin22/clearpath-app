'use client';

/**
 * Step 2 — Professional team. An add/remove row editor. SUGGESTED_ROLES quick-add
 * chips start a card with the role pre-filled (name/contact left for the user).
 * Each row: role + name + optional contact. Free-text role so any title works.
 */

import { T } from '@/src/lib/brand/tokens';
import useM7Store from '@/src/stores/m7Store';
import { ACTION_PLAN_COPY, SUGGESTED_ROLES } from './copy';
import { PrimaryButton, SecondaryButton, ChipButton, GhostButton, RowCard } from './ui';
import WizardField from '@/src/components/wizard/WizardField';

const sectionHeaderStyle = {
  fontFamily: T.FONT_BODY,
  fontWeight: 600,
  fontSize: 12,
  textTransform: 'uppercase',
  letterSpacing: '0.6px',
  color: T.MUTED,
  marginBottom: 10,
};

export default function StepProfessionals({ onNext, onBack }) {
  const c = ACTION_PLAN_COPY.professionals;
  const common = ACTION_PLAN_COPY.common;

  const professionals = useM7Store((s) => s.actionPlan.professionals);
  const addProfessional = useM7Store((s) => s.addProfessional);
  const updateProfessional = useM7Store((s) => s.updateProfessional);
  const removeProfessional = useM7Store((s) => s.removeProfessional);

  return (
    <div data-testid="action-plan-step-professionals">
      <h2 style={{ fontFamily: T.FONT_DISPLAY, fontWeight: 700, fontSize: 24, color: T.NAVY, margin: '0 0 8px 0' }}>
        {c.title}
      </h2>
      <p style={{ fontFamily: T.FONT_BODY, fontSize: 15, lineHeight: 1.55, color: T.INK_2, margin: '0 0 20px 0' }}>
        {c.subhead}
      </p>

      <div style={{ marginBottom: 24 }}>
        <div style={sectionHeaderStyle}>{c.quickAddHeader}</div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          {SUGGESTED_ROLES.map((role) => (
            <ChipButton
              key={role}
              onClick={() => addProfessional({ role })}
              ariaLabel={`${c.addLabel}: ${role}`}
            >
              + {role}
            </ChipButton>
          ))}
        </div>
      </div>

      {professionals.length === 0 ? (
        <p data-testid="action-plan-professionals-empty" style={{ fontFamily: T.FONT_BODY, fontSize: 14, lineHeight: 1.55, color: T.MUTED, margin: '0 0 16px 0' }}>
          {c.emptyState}
        </p>
      ) : (
        <div style={{ marginBottom: 16 }}>
          {professionals.map((p) => (
            <RowCard key={p.id}>
              <WizardField
                label={c.roleLabel}
                field="role"
                value={p.role}
                onChange={(f, v) => updateProfessional(p.id, { [f]: v })}
              />
              <div style={{ marginTop: 12 }}>
                <WizardField
                  label={c.nameLabel}
                  field="name"
                  value={p.name}
                  onChange={(f, v) => updateProfessional(p.id, { [f]: v })}
                />
              </div>
              <div style={{ marginTop: 12 }}>
                <WizardField
                  label={c.contactLabel}
                  field="contact"
                  value={p.contact}
                  onChange={(f, v) => updateProfessional(p.id, { [f]: v })}
                />
              </div>
              <div style={{ textAlign: 'right', marginTop: 8 }}>
                <GhostButton onClick={() => removeProfessional(p.id)} ariaLabel={`${common.remove}: ${p.role || p.name || 'professional'}`}>
                  {common.remove}
                </GhostButton>
              </div>
            </RowCard>
          ))}
        </div>
      )}

      <ChipButton onClick={() => addProfessional()} ariaLabel={c.addLabel}>
        {c.addLabel}
      </ChipButton>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 28 }}>
        <SecondaryButton onClick={onBack}>{common.back}</SecondaryButton>
        <PrimaryButton onClick={onNext}>{c.continue}</PrimaryButton>
      </div>
    </div>
  );
}
