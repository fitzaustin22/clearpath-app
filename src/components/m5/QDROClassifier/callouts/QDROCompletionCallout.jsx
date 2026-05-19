'use client';

/**
 * QDROCompletionCallout — §8.11 completion summary surface (PR5-5).
 *
 * Renders only when BOTH conditions are satisfied:
 *   1. selectQDROPacketReady === true (all asset decisions populated)
 *   2. qdroBlueprint.savedAt !== null (at least one Blueprint save has occurred)
 *
 * Does NOT gate on staleness — completion copy is stable across re-saves and
 * subsequent decision mutations. No projection computation here.
 *
 * Rules of Hooks: all hooks are called unconditionally before the guard.
 *
 * @returns {JSX.Element | null}
 */

import { useM5Store } from '@/src/stores/m5Store';
import useBlueprintStore from '@/src/stores/blueprintStore';
import { selectQDROPacketReady } from '@/src/lib/qdro/packet';
import { T } from '@/src/lib/brand/tokens';

export default function QDROCompletionCallout() {
  const ready = useM5Store(selectQDROPacketReady);
  const savedAt = useBlueprintStore((s) => s.qdroBlueprint.savedAt);
  if (!ready || savedAt === null) return null;
  return (
    <div
      data-testid="qdro-completion"
      role="status"
      aria-label="QDRO next steps"
      style={{
        background: T.PARCHMENT,
        color: T.INK,
        border: `1px solid ${T.GOLD_BORDER}`,
        borderRadius: 6,
        padding: '14px 16px',
        fontFamily: T.FONT_BODY,
        fontSize: 13,
        lineHeight: 1.5,
        marginBottom: 20,
      }}
    >
      <h2
        style={{
          fontFamily: T.FONT_DISPLAY,
          fontSize: '18px',
          fontWeight: 700,
          color: T.NAVY,
          margin: '0 0 8px',
          lineHeight: 1.2,
        }}
      >
        Next Steps
      </h2>
      <p
        style={{
          fontFamily: T.FONT_BODY,
          fontSize: '13px',
          lineHeight: 1.5,
          color: T.INK_2,
          margin: 0,
        }}
      >
        With your handoff packet and Blueprint entry both saved, you have what you need to move this forward. Share the packet with your divorce attorney or a QDRO specialist — they&#39;ll use it to draft the order that gets filed with the court. Your QDRO decisions will appear in the final ClearPath Blueprint at the end of the program.
      </p>
    </div>
  );
}
