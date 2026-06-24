'use client';

import { Check } from 'lucide-react';
import { T } from '@/src/lib/brand/tokens';
import SplitBar from './SplitBar';

/**
 * GuidedStepperRail — the sticky left column of the guided wizard template: a
 * jump-anywhere step list (circle + name + running category total) topped by an
 * overall-completion meter, with the navy "Estate so far" box beneath it.
 *
 * Free navigation: every row is a button that jumps to that step; the rail
 * never locks the user in. Reusable across the guided tools.
 *
 * Props:
 *   steps       — [{ id, name, total, review }]
 *   current     — 0-based active index
 *   onPick      — (index) => void
 *   completion  — 0–100 overall completeness
 *   estate      — { you, spouse, unalloc } net "Estate so far" magnitudes
 *   formatMoney — (n) => string
 */
export default function GuidedStepperRail({ steps, current, onPick, completion = 0, estate, formatMoney }) {
  const pctClamped = Math.max(0, Math.min(100, Math.round(completion)));
  return (
    <div className="mei-rail" style={{ position: 'sticky', top: 18 }}>
      <div style={{ background: T.CARD, border: `1px solid ${T.LINE}`, borderRadius: 12, boxShadow: T.SHADOW_CARD, padding: '16px 14px 12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 6px 12px' }}>
          <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: '.1em', textTransform: 'uppercase', color: T.MUTED, fontFamily: T.FONT_BODY }}>
            Your inventory
          </span>
          <span style={{ fontSize: 12, fontWeight: 600, color: T.NAVY, fontFamily: T.FONT_BODY, fontVariantNumeric: 'tabular-nums' }}>
            {pctClamped}%
          </span>
        </div>
        <div style={{ height: 5, borderRadius: 999, background: T.LINE, overflow: 'hidden', margin: '0 6px 10px' }}>
          <div style={{ height: '100%', width: `${pctClamped}%`, borderRadius: 999, background: `linear-gradient(90deg, ${T.GOLD}, ${T.GOLD_SOFT})`, transition: 'width 400ms ease' }} />
        </div>

        <div style={{ maxHeight: 360, overflowY: 'auto', paddingRight: 2 }}>
          {steps.map((s, i) => {
            const on = i === current;
            const done = !s.review && s.total > 0 && !on;
            const past = i < current;
            return (
              <button
                key={s.id}
                type="button"
                onClick={() => onPick(i)}
                aria-current={on ? 'step' : undefined}
                style={{
                  width: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 11,
                  padding: '8px 8px',
                  minHeight: 44,
                  background: on ? T.PARCHMENT_DEEP : 'transparent',
                  border: 'none',
                  borderRadius: 8,
                  cursor: 'pointer',
                  textAlign: 'left',
                }}
                onMouseEnter={(e) => { if (!on) e.currentTarget.style.background = T.GOLD_TINT_SUBTLE; }}
                onMouseLeave={(e) => { if (!on) e.currentTarget.style.background = 'transparent'; }}
              >
                <span
                  style={{
                    width: 22,
                    height: 22,
                    borderRadius: '50%',
                    flexShrink: 0,
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    background: done ? T.GOLD : on ? 'transparent' : T.PARCHMENT,
                    border: on ? `2px solid ${T.GOLD}` : done ? 'none' : `1.5px solid ${T.LINE_STRONG}`,
                  }}
                >
                  {done ? (
                    <Check size={13} strokeWidth={2.4} color="#FFFFFF" aria-hidden="true" />
                  ) : (
                    <span style={{ fontSize: 11, fontWeight: 700, color: on ? T.NAVY : T.MUTED, fontFamily: T.FONT_BODY }}>
                      {s.review ? '★' : i + 1}
                    </span>
                  )}
                </span>
                <span
                  style={{
                    flexGrow: 1,
                    fontSize: 13,
                    fontWeight: on ? 600 : 500,
                    color: on ? T.NAVY : past || done ? T.INK_2 : T.MUTED,
                    fontFamily: T.FONT_BODY,
                    lineHeight: 1.2,
                  }}
                >
                  {s.name}
                </span>
                {!s.review && s.total > 0 && (
                  <span style={{ fontSize: 11, fontWeight: 600, color: T.MUTED, fontFamily: T.FONT_NUMERIC, fontVariantNumeric: 'tabular-nums' }}>
                    {formatMoney(s.total)}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      <div style={{ background: T.NAVY, borderRadius: 12, padding: '16px 18px', marginTop: 14 }}>
        <div style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: '.08em', textTransform: 'uppercase', color: T.GOLD, fontFamily: T.FONT_BODY }}>
          Estate so far
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 10, gap: 8 }}>
          <div>
            <div style={{ fontSize: 11, color: 'rgba(255,255,255,.6)', fontFamily: T.FONT_BODY }}>You</div>
            <div style={{ fontFamily: T.FONT_NUMERIC, fontSize: 17, fontWeight: 700, color: T.GOLD, fontVariantNumeric: 'tabular-nums' }}>
              {formatMoney(estate.you)}
            </div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: 11, color: 'rgba(255,255,255,.6)', fontFamily: T.FONT_BODY }}>Spouse</div>
            <div style={{ fontFamily: T.FONT_NUMERIC, fontSize: 17, fontWeight: 700, color: '#FFFFFF', fontVariantNumeric: 'tabular-nums' }}>
              {formatMoney(estate.spouse)}
            </div>
          </div>
        </div>
        <div style={{ marginTop: 10 }}>
          <SplitBar you={estate.you} spouse={estate.spouse} unalloc={estate.unalloc} height={8} track="rgba(255,255,255,.16)" />
        </div>
      </div>
    </div>
  );
}
