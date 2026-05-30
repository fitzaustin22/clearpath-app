'use client';

/**
 * Step 2 — Review & Save. Renders the exact Blueprint payload
 * (buildTradeOffsPayload), repeats the disclaimer, and saves explicitly (no
 * auto-write) via saveTradeOffsToBlueprint → toast + inline confirmation.
 * Incomplete trades (missing a get or all gives) are dropped by the payload
 * builder; a note flags that they won't carry forward.
 */

import { useState } from 'react';
import Link from 'next/link';
import { T } from '@/src/lib/brand/tokens';
import { useM6Store, buildTradeOffsPayload } from '@/src/stores/m6Store';
import useToastStore from '@/src/stores/toastStore';
import { TRADEOFF_COPY } from './copy';
import { PrimaryButton, SecondaryButton, Disclaimer } from './ui';

const dimStyle = { color: T.NAVY_55 };

export default function StepReview({ onBack }) {
  const c = TRADEOFF_COPY.review;
  const rows = useM6Store((s) => s.tradeOffs.rows);
  const saveTradeOffsToBlueprint = useM6Store((s) => s.saveTradeOffsToBlueprint);
  const [saved, setSaved] = useState(false);

  const payload = buildTradeOffsPayload(rows);
  const canSave = payload.length > 0;
  const incompleteCount = rows.length - payload.length;

  const handleSave = () => {
    if (!canSave) return;
    saveTradeOffsToBlueprint();
    useToastStore.getState().show({ message: c.success, variant: 'success' });
    setSaved(true);
  };

  return (
    <div data-testid="trade-off-step-review">
      <h2 style={{ fontFamily: T.FONT_DISPLAY, fontWeight: 700, fontSize: 24, color: T.NAVY, margin: '0 0 16px 0' }}>
        {c.title}
      </h2>
      <p style={{ fontFamily: T.FONT_BODY, fontSize: 14, lineHeight: 1.5, color: T.INK_2, margin: '0 0 16px 0' }}>
        {c.body}
      </p>

      {canSave ? (
        <div style={{ marginBottom: 16 }}>
          {payload.map((p, i) => (
            <div
              key={i}
              style={{ fontFamily: T.FONT_BODY, fontSize: 15, color: T.INK, padding: '8px 0', borderTop: i === 0 ? 'none' : `1px solid ${T.LINE}` }}
            >
              <span style={dimStyle}>{c.giveLabel}:</span> {p.give}{' '}
              <span style={{ color: T.GOLD }}>→</span>{' '}
              <span style={dimStyle}>{c.getLabel}:</span> {p.get}
            </div>
          ))}
        </div>
      ) : (
        <p
          data-testid="trade-off-review-empty"
          style={{ fontFamily: T.FONT_BODY, fontSize: 14, lineHeight: 1.55, color: T.MUTED, margin: '0 0 16px 0' }}
        >
          {c.empty}
        </p>
      )}

      {incompleteCount > 0 && (
        <p style={{ fontFamily: T.FONT_BODY, fontSize: 13, color: T.MUTED, margin: '0 0 16px 0' }}>{c.incomplete}</p>
      )}

      <div style={{ margin: '16px 0' }}>
        <Disclaimer>{c.disclaimer}</Disclaimer>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16 }}>
        <SecondaryButton onClick={onBack}>{TRADEOFF_COPY.common.back}</SecondaryButton>
        <PrimaryButton onClick={handleSave} disabled={!canSave}>{c.save}</PrimaryButton>
      </div>

      {saved && (
        <div
          data-testid="trade-off-save-success"
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
