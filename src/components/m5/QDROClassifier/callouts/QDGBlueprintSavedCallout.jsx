'use client';

/**
 * QDGBlueprintSavedCallout — §8.10 Blueprint save surface (PR5-3, PR5-4, PR5-6).
 *
 * Renders only once selectQDROPacketReady === true (every asset&#39;s decisions
 * populated per its branch shape). Surfaces three states:
 *   State 1 — not yet saved: prompts user to save to Blueprint.
 *   State 2 — saved + fresh: confirms save timestamp; no action needed.
 *   State 3 — saved + stale: warns that decisions have changed; re-save CTA.
 *
 * Stale check is memoized via useMemo([m5State]) to avoid re-running the
 * projection selector on every render when m5Store is unchanged (PR5-6).
 *
 * Staleness is determined by normalizing ONLY the saved side: the selector
 * (selectQDROBlueprintProjection) always returns generatedAt: null by
 * contract, so currentProjection is passed unmodified. writeQDROToBlueprint
 * stamps savedProjection.generatedAt with an ISO string on write; that
 * timestamp is normalized back to null before comparison so it never
 * produces a false "stale" signal.
 *
 * Rules of Hooks: ALL hooks are called unconditionally before the readiness
 * guard so no hook order violation occurs.
 *
 * @returns {JSX.Element | null}
 */

import { useMemo } from 'react';
import { useM5Store } from '@/src/stores/m5Store';
import useBlueprintStore from '@/src/stores/blueprintStore';
import { selectQDROPacketReady } from '@/src/lib/qdro/packet';
import { selectQDROBlueprintProjection, isProjectionEqual } from '@/src/lib/qdro/blueprint/projection';
import { selectQDRODivisionData } from '@/src/lib/qdro/blueprint/divisionData';
import { T } from '@/src/lib/brand/tokens';

/**
 * Formats an ISO timestamp using Intl.DateTimeFormat with the user&#39;s locale
 * and timezone (PR5-4). Produces e.g. "May 19, 2:47 PM".
 *
 * @param {string} iso — ISO 8601 string
 * @returns {string}
 */
function formatSavedAt(iso) {
  return new Intl.DateTimeFormat(undefined, {
    month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit',
  }).format(new Date(iso));
}


const buttonStyle = {
  appearance: 'none',
  cursor: 'pointer',
  fontFamily: T.FONT_BODY,
  fontSize: '13px',
  fontWeight: 600,
  padding: '8px 14px',
  borderRadius: '7px',
  border: `1px solid ${T.GOLD_BORDER}`,
  backgroundColor: T.GOLD_TINT,
  color: T.INK,
};

export default function QDGBlueprintSavedCallout() {
  // --- ALL hooks unconditionally before any early return (Rules of Hooks) ---
  const ready = useM5Store(selectQDROPacketReady);
  const m5State = useM5Store();
  const { savedProjection, savedAt } = useBlueprintStore((s) => s.qdroBlueprint);
  const writeQDROToBlueprint = useBlueprintStore((s) => s.writeQDROToBlueprint);
  // §10.8 Blueprint write (PR-A m5/qdro-s108-blueprint-wiring) — fans out
  // from the Save-to-Blueprint CTA alongside the existing §8.12 projection
  // write. Architect ruling #1: single `handleSave` wrapper, both buttons
  // share it.
  const updateQDRODivision = useBlueprintStore((s) => s.updateQDRODivision);

  const currentProjection = useMemo(
    () => selectQDROBlueprintProjection(m5State),
    [m5State],
  );
  const isStale = useMemo(() => {
    if (savedAt === null) return false;
    // selectQDROBlueprintProjection always yields generatedAt: null (its
    // contract); writeQDROToBlueprint stamps savedProjection.generatedAt.
    // Normalize ONLY the saved side back to the selector's null sentinel so
    // the timestamp never produces a false "stale" signal. currentProjection
    // is passed unmodified (it is already the canonical null-generatedAt form).
    const normalizedSaved =
      savedProjection == null
        ? savedProjection
        : { ...savedProjection, generatedAt: null };
    return !isProjectionEqual(currentProjection, normalizedSaved);
  }, [currentProjection, savedProjection, savedAt]);

  // Guard AFTER all hooks — do not hoist above any hook call
  if (!ready) return null;

  // --- Determine render state ---
  // State 1: savedAt === null  (never saved)
  // State 3: savedAt non-null AND isStale (decisions changed since last save)
  // State 2: savedAt non-null AND !isStale (saved + fresh)
  const isSaved = savedAt !== null;
  const formatted = isSaved ? formatSavedAt(savedAt) : null;

  // §10.8 fan-out — Save-to-Blueprint fires BOTH writes:
  //   1. §8.12 projection writer (existing): writeQDROToBlueprint(currentProjection)
  //      → blueprintStore.qdroBlueprint.{savedProjection, savedAt}
  //   2. §10.8 §6 sub-slot writer (PR-A): updateQDRODivision(divisionData)
  //      → blueprintStore.sections.s6.data.qdro = { assets, status, lastUpdated }
  // Shared by State 1 and State 3 buttons.
  const handleSave = () => {
    writeQDROToBlueprint(currentProjection);
    updateQDRODivision(selectQDRODivisionData(m5State));
  };

  return (
    <div
      data-testid="qdg-blueprint-saved"
      role="status"
      aria-label="QDRO Blueprint save status"
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
      <p
        style={{
          margin: '0 0 4px',
          fontSize: '11px',
          fontWeight: 700,
          textTransform: 'uppercase',
          letterSpacing: '0.6px',
          color: T.GOLD,
        }}
      >
        Blueprint
      </p>

      {/* State 1 — not yet saved */}
      {!isSaved && (
        <>
          <p style={{ margin: '0 0 12px', color: T.INK_2 }}>
            Save your QDRO decisions to your ClearPath Blueprint.
          </p>
          <button
            type="button"
            data-testid="qdg-blueprint-save-btn"
            onClick={handleSave}
            style={buttonStyle}
          >
            Save to Blueprint
          </button>
        </>
      )}

      {/* State 2 — saved + fresh */}
      {isSaved && !isStale && (
        <p style={{ margin: 0, color: T.INK_2 }}>
          Saved to your Blueprint on {formatted}.
        </p>
      )}

      {/* State 3 — saved + stale */}
      {isSaved && isStale && (
        <>
          <p style={{ margin: '0 0 12px', color: T.INK_2 }}>
            Your decisions have changed since you last saved on {formatted}.
          </p>
          <button
            type="button"
            data-testid="qdg-blueprint-save-btn"
            onClick={handleSave}
            style={buttonStyle}
          >
            Save updated decisions
          </button>
        </>
      )}
    </div>
  );
}
