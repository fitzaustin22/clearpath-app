'use client';

import { useState } from 'react';
import Link from 'next/link';
import { T } from '@/src/lib/brand/tokens';
import { useM6Store } from '@/src/stores/m6Store';
import useToastStore from '@/src/stores/toastStore';
import { DCA_COPY } from './copy';
import { StepHeading, PrimaryButton, SecondaryButton } from './ui';

// Step 4 — the deliberate commit. Patches the resolved stub via
// saveAnalysisToBlueprint (which reuses updateDeferredCompStub; no new writer).
export default function StepSave({ onBack }) {
  const stubId = useM6Store((s) => s.deferredCompAnalyzer.stubId);
  const resetAnalysis = useM6Store((s) => s.resetAnalysis);
  const saveAnalysisToBlueprint = useM6Store((s) => s.saveAnalysisToBlueprint);
  const c = DCA_COPY.save;
  const [saved, setSaved] = useState(false);

  const handleSave = () => {
    saveAnalysisToBlueprint(stubId);
    useToastStore.getState().show({ message: c.success, variant: 'success' });
    setSaved(true);
  };

  return (
    <div data-testid="dca-step-save">
      <StepHeading title={c.title} subhead={c.subhead} />

      {!saved ? (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, marginTop: 8 }}>
          {onBack ? <SecondaryButton onClick={onBack} data-testid="dca-back">{DCA_COPY.common.back}</SecondaryButton> : <span />}
          <PrimaryButton onClick={handleSave} data-testid="dca-save-confirm">
            {c.confirm}
          </PrimaryButton>
        </div>
      ) : (
        <div
          data-testid="dca-save-success"
          role="status"
          style={{
            marginTop: 8,
            border: `1px solid ${T.GREEN}`,
            backgroundColor: '#EAF5EE',
            borderRadius: 8,
            padding: 16,
          }}
        >
          <div style={{ fontFamily: T.FONT_BODY, fontWeight: 700, fontSize: 15, color: T.NAVY, marginBottom: 10 }}>
            {c.success}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
            <Link
              href="/blueprint"
              style={{ fontFamily: T.FONT_BODY, fontSize: 14, fontWeight: 700, color: T.NAVY, textDecoration: 'none' }}
            >
              {c.viewBlueprint} →
            </Link>
            <Link
              href="/modules/m6/deferred-comp"
              onClick={resetAnalysis}
              style={{ fontFamily: T.FONT_BODY, fontSize: 14, fontWeight: 600, color: T.NAVY_55, textDecoration: 'none' }}
            >
              {c.another}
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
