'use client';

/**
 * Step 4 — Review & Save. Section 1 ("What you'll fight for") renders the exact
 * Blueprint payload (buildPrioritiesPayload), grouped and numbered per tier.
 * Section 2 ("Your private leverage") is lock-badged and lists the
 * willing-to-trade items, which are never written to the Blueprint. Saving is
 * explicit (no auto-write) and fires a toast + inline confirmation. When there
 * is nothing secure to save, the only-willing empty case is shown and Save is
 * disabled.
 */

import { useState } from 'react';
import Link from 'next/link';
import { T } from '@/src/lib/brand/tokens';
import { useM6Store, buildPrioritiesPayload, selectWillingToTrade } from '@/src/stores/m6Store';
import useToastStore from '@/src/stores/toastStore';
import WizardSection from '@/src/components/wizard/WizardSection';
import { PRIORITIES_COPY } from './copy';
import { PrimaryButton, SecondaryButton, LockBadge, Disclaimer } from './ui';

const tierLabelStyle = {
  fontFamily: T.FONT_BODY,
  fontWeight: 700,
  fontSize: 13,
  color: T.NAVY,
  margin: '0 0 4px 0',
};

const listStyle = { margin: '0 0 12px 0', paddingLeft: 22 };
const itemStyle = { fontFamily: T.FONT_BODY, fontSize: 15, color: T.INK, padding: '3px 0' };

function TierGroup({ label, items }) {
  if (items.length === 0) return null;
  return (
    <div>
      <p style={tierLabelStyle}>{label}</p>
      <ol style={listStyle}>
        {items.map((p, i) => (
          <li key={i} style={itemStyle}>{p.item}</li>
        ))}
      </ol>
    </div>
  );
}

export default function StepReview({ onBack }) {
  const c = PRIORITIES_COPY.review;
  const items = useM6Store((s) => s.priorities.items);
  const savePrioritiesToBlueprint = useM6Store((s) => s.savePrioritiesToBlueprint);
  const [saved, setSaved] = useState(false);

  const payload = buildPrioritiesPayload(items);
  const mustHaves = payload.filter((p) => p.importance === 'must-have');
  const wouldLikes = payload.filter((p) => p.importance === 'would-like');
  const willing = selectWillingToTrade(items);
  const privateLabel = PRIORITIES_COPY.sort.options['willing-to-trade'].privateLabel;
  const canSave = payload.length > 0;

  const handleSave = () => {
    if (!canSave) return;
    savePrioritiesToBlueprint();
    useToastStore.getState().show({ message: c.success, variant: 'success' });
    setSaved(true);
  };

  return (
    <div data-testid="priorities-step-review">
      <h2 style={{ fontFamily: T.FONT_DISPLAY, fontWeight: 700, fontSize: 24, color: T.NAVY, margin: '0 0 16px 0' }}>
        {c.title}
      </h2>

      <WizardSection title={c.sec1Heading} first>
        <p style={{ fontFamily: T.FONT_BODY, fontSize: 14, lineHeight: 1.5, color: T.INK_2, margin: '0 0 14px 0' }}>
          {c.sec1Body}
        </p>
        {canSave ? (
          <div>
            <TierGroup label={c.groupLabels['must-have']} items={mustHaves} />
            <TierGroup label={c.groupLabels['would-like']} items={wouldLikes} />
          </div>
        ) : (
          <p data-testid="priorities-only-willing" style={{ fontFamily: T.FONT_BODY, fontSize: 14, lineHeight: 1.55, color: T.MUTED, margin: 0 }}>
            {c.onlyWillingEmpty}
          </p>
        )}
      </WizardSection>

      {willing.length > 0 && (
        <WizardSection title={c.sec2Heading}>
          <div style={{ marginBottom: 8 }}>
            <LockBadge label={privateLabel} />
          </div>
          <p style={{ fontFamily: T.FONT_BODY, fontSize: 14, lineHeight: 1.5, color: T.INK_2, margin: '0 0 10px 0' }}>
            {c.sec2Body}
          </p>
          <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
            {willing.map((it) => (
              <li key={it.id} style={itemStyle}>{it.item}</li>
            ))}
          </ul>
        </WizardSection>
      )}

      <div style={{ margin: '20px 0' }}>
        <Disclaimer>{c.disclaimer}</Disclaimer>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16 }}>
        <SecondaryButton onClick={onBack}>{PRIORITIES_COPY.common.back}</SecondaryButton>
        <PrimaryButton onClick={handleSave} disabled={!canSave}>{c.save}</PrimaryButton>
      </div>

      {saved && (
        <div
          data-testid="priorities-save-success"
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
