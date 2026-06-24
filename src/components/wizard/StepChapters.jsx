'use client';

import { Home, CreditCard, Sparkles } from 'lucide-react';
import { T } from '@/src/lib/brand/tokens';

/**
 * StepChapters — the "Chapters" progress visualization that anchors the guided
 * wizard header. Three stacked chapters (What you own · What you owe · Review &
 * divide) each show a count and a fill bar for steps passed within them, plus a
 * "Step N of M" header and an estimated-time-left readout. The chapter holding
 * the current step gets the parchment-deep highlight.
 *
 * This is the canonical progress viz for the ~7-tool guided template. It is
 * derived-only (no state) — pass the current 0-based step and the asset /
 * liability chapter lengths; a single trailing review step is assumed.
 *
 * Props: current (0-based), assetCount, liabilityCount.
 */
export default function StepChapters({ current, assetCount, liabilityCount }) {
  const total = assetCount + liabilityCount + 1;
  const chapters = [
    { key: 'assets', label: 'What you own', Icon: Home, start: 0, len: assetCount },
    { key: 'debts', label: 'What you owe', Icon: CreditCard, start: assetCount, len: liabilityCount },
    { key: 'review', label: 'Review & divide', Icon: Sparkles, start: assetCount + liabilityCount, len: 1 },
  ];
  const remaining = total - (current + 1);
  const est = remaining <= 0 ? 'Last step' : `about ${Math.max(1, Math.round(remaining * 0.6))} min left`;

  return (
    <div
      style={{
        background: T.CARD,
        border: `1px solid ${T.LINE}`,
        borderRadius: 12,
        boxShadow: T.SHADOW_CARD,
        padding: '16px 18px',
        width: '100%',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 12, gap: 8 }}>
        <span style={{ fontFamily: T.FONT_NUMERIC, fontWeight: 700, fontSize: 16, color: T.NAVY }}>
          Step {current + 1}{' '}
          <span style={{ color: T.MUTED, fontWeight: 400, fontSize: 13 }}>of {total}</span>
        </span>
        <span style={{ fontSize: 11.5, fontWeight: 600, color: T.PILL_TEXT, fontFamily: T.FONT_BODY }}>{est}</span>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
        {chapters.map((ch) => {
          const passed =
            current >= ch.start + ch.len ? ch.len : current < ch.start ? 0 : current - ch.start + 1;
          const fillPct = ch.len > 0 ? (passed / ch.len) * 100 : 0;
          const here = current >= ch.start && current < ch.start + ch.len;
          const complete = passed === ch.len;
          const Icon = ch.Icon;
          return (
            <div
              key={ch.key}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 11,
                padding: '6px 8px',
                borderRadius: 8,
                background: here ? T.PARCHMENT_DEEP : 'transparent',
                transition: 'background 200ms ease',
              }}
            >
              <Icon size={15} strokeWidth={2} color={here ? T.NAVY : T.INK_2} style={{ flexShrink: 0 }} aria-hidden="true" />
              <div style={{ flexGrow: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4, gap: 8 }}>
                  <span
                    style={{
                      fontSize: 12,
                      fontWeight: here ? 700 : 600,
                      color: here ? T.NAVY : T.INK_2,
                      fontFamily: T.FONT_BODY,
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      minWidth: 0,
                      flexGrow: 1,
                    }}
                  >
                    {ch.label}
                  </span>
                  <span
                    style={{
                      fontSize: 11,
                      fontWeight: 600,
                      color: T.MUTED,
                      fontFamily: T.FONT_NUMERIC,
                      fontVariantNumeric: 'tabular-nums',
                      flexShrink: 0,
                    }}
                  >
                    {passed}/{ch.len}
                  </span>
                </div>
                <div style={{ height: 4, borderRadius: 999, background: T.LINE, overflow: 'hidden' }}>
                  <div
                    style={{
                      height: '100%',
                      width: `${fillPct}%`,
                      borderRadius: 999,
                      background: complete ? T.GOLD : `linear-gradient(90deg, ${T.GOLD}, ${T.GOLD_SOFT})`,
                      transition: 'width 400ms ease',
                    }}
                  />
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
