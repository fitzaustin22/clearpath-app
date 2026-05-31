'use client';

import { T } from '@/src/lib/brand/tokens';
import { useM6Store } from '@/src/stores/m6Store';
import useBlueprintStore from '@/src/stores/blueprintStore';
import { DCA_COPY } from './copy';
import { StepHeading, Panel } from './ui';

// Step 0 — pick a deferred-comp grant to analyze. The list is the live
// deferredCompStubs[] captured by M2. The stub's free-text `vestingSchedule` is
// NOT shown here as anything parseable — tranches are entered later, by hand.
export default function StepSelect({ onNext }) {
  const stubs = useBlueprintStore((s) => s.deferredCompStubs);
  const selectStub = useM6Store((s) => s.selectStub);
  const c = DCA_COPY.select;
  const intro = DCA_COPY.intro;

  const onAnalyze = (id) => {
    selectStub(id);
    onNext();
  };

  return (
    <div data-testid="dca-step-select">
      <StepHeading title={c.title} subhead={c.subhead} />

      <p style={{ fontFamily: T.FONT_BODY, fontSize: 14, color: T.INK_2, lineHeight: 1.55, margin: '0 0 20px 0' }}>
        {intro.body}
      </p>

      {stubs.length === 0 ? (
        <Panel data-testid="dca-select-empty">
          <p style={{ fontFamily: T.FONT_BODY, fontSize: 15, color: T.INK_2, margin: 0, lineHeight: 1.55 }}>
            {c.empty}
          </p>
        </Panel>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {stubs.map((stub) => {
            const isOption = stub.category === 'stockOptions';
            const kindLabel = isOption ? 'Stock options' : 'RSUs / corporate incentives';
            const resolved = Boolean(stub.resolved);
            return (
              <Panel key={stub.id} data-testid={`dca-stub-${stub.id}`}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16 }}>
                  <div>
                    <div style={{ fontFamily: T.FONT_DISPLAY, fontWeight: 700, fontSize: 17, color: T.NAVY }}>
                      {stub.company || 'Deferred-comp grant'}
                    </div>
                    <div style={{ fontFamily: T.FONT_BODY, fontSize: 13.5, color: T.INK_2, marginTop: 4 }}>
                      {kindLabel}
                      {stub.grantDate ? ` · granted ${stub.grantDate}` : ''}
                      {stub.sharesGranted ? ` · ${stub.sharesGranted} shares` : ''}
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    {resolved && (
                      <span
                        style={{
                          fontFamily: T.FONT_BODY,
                          fontSize: 12,
                          fontWeight: 700,
                          color: T.GREEN,
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {c.resolvedBadge}
                      </span>
                    )}
                    <button
                      type="button"
                      data-testid={`dca-analyze-${stub.id}`}
                      onClick={() => onAnalyze(stub.id)}
                      style={{
                        backgroundColor: T.NAVY,
                        color: T.CARD,
                        fontFamily: T.FONT_BODY,
                        fontWeight: 600,
                        fontSize: 14,
                        padding: '8px 18px',
                        borderRadius: 6,
                        border: 'none',
                        cursor: 'pointer',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {resolved ? c.reopen : c.open}
                    </button>
                  </div>
                </div>
              </Panel>
            );
          })}
        </div>
      )}
    </div>
  );
}
