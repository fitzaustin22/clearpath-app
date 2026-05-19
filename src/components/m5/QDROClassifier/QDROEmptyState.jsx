'use client';

/**
 * QDROEmptyState — §8.1.4 pre-flow filter, 0-asset case (lines 2696–2702).
 *
 * Renders when M2 carries no `category ∈ {pensions, retirement}` items. Per
 * §8.1.4 this is a SOFT surface (no hard gate — M5 is Full Access; the user
 * can reach §8 with M2 skipped, same fallback principle as the §10.7
 * M3-skipped pre-pop rule). Two action paths: "Go to M2" links to the M2
 * module landing; "Add asset here" proceeds via the synthetic-UUID wizard
 * add path (TC-QDG-9). PVA/HDA empty-state visual idiom (inline T tokens).
 *
 * @param {object} props
 * @param {() => void} [props.onAddAsset] invoked when "Add asset here" is
 *   clicked; the container wires this to addQDROAsset(syntheticId).
 * @returns {JSX.Element}
 */

import Link from 'next/link';
import { T } from '@/src/lib/brand/tokens';

// §8.1.4 locked educational copy (verbatim, lines 2699).
const EMPTY_STATE_COPY =
  'No retirement assets recorded yet. Either go to M2 (Know What You Own) ' +
  'to inventory your retirement and pension assets first, or add an asset ' +
  'directly here to begin the QDRO decision flow.';

export default function QDROEmptyState({ onAddAsset }) {
  return (
    <div
      data-testid="qdro-empty-state"
      style={{
        fontFamily: T.FONT_BODY,
        color: T.NAVY,
        background: T.CARD,
        border: `1px solid ${T.NAVY_12}`,
        padding: '1.5rem',
        borderRadius: 8,
      }}
    >
      <h2
        style={{
          fontFamily: T.FONT_DISPLAY,
          color: T.NAVY,
          fontSize: '1.25rem',
          fontWeight: 500,
          margin: '0 0 0.5rem 0',
        }}
      >
        QDRO Decision Guide
      </h2>
      <p
        style={{
          margin: '0 0 1.25rem 0',
          fontSize: '0.9375rem',
          lineHeight: 1.5,
          color: T.INK_2,
        }}
      >
        {EMPTY_STATE_COPY}
      </p>
      <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
        <Link
          href="/modules/m2"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            minHeight: '44px',
            padding: '0 1.25rem',
            background: T.CARD,
            border: `1px solid ${T.NAVY}`,
            color: T.NAVY,
            fontFamily: T.FONT_BODY,
            fontSize: '0.9375rem',
            fontWeight: 600,
            textDecoration: 'none',
            borderRadius: 6,
          }}
        >
          Go to M2
        </Link>
        <button
          type="button"
          onClick={() => onAddAsset?.()}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            minHeight: '44px',
            padding: '0 1.25rem',
            background: T.NAVY,
            border: `1px solid ${T.NAVY}`,
            color: T.PARCHMENT,
            fontFamily: T.FONT_BODY,
            fontSize: '0.9375rem',
            fontWeight: 600,
            cursor: 'pointer',
            borderRadius: 6,
          }}
        >
          Add asset here
        </button>
      </div>
    </div>
  );
}
