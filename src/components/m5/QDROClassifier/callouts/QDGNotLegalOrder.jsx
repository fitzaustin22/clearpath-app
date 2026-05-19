'use client';

/**
 * QDGNotLegalOrder — the `qdg_not_legal_order` callout (§8.9.1).
 *
 * Renders the four §8.9.2 LOCKED disclaimer bullets verbatim. Copy is
 * consumed from the PR1 lib (QDG_DISCLAIMER_BULLETS) — never re-authored
 * here, so the spec-locked literal has exactly one source of truth.
 * Top-of-tool-entry placement is the parent's job (Q-B7); this component
 * is pure presentation with no conditional logic.
 *
 * @returns {JSX.Element}
 */

import { QDG_DISCLAIMER_BULLETS } from '@/src/lib/qdro';
import { T } from '@/src/lib/brand/tokens';

export default function QDGNotLegalOrder() {
  return (
    <div
      data-testid="qdg-not-legal-order"
      role="note"
      aria-label="Important: this tool does not produce a legal order"
      style={{
        background: T.PARCHMENT_DEEP,
        color: T.NAVY,
        border: `1px solid ${T.LINE_STRONG}`,
        borderRadius: 8,
        padding: '14px 18px',
        fontFamily: T.FONT_BODY,
      }}
    >
      <p
        style={{
          margin: '0 0 8px',
          fontSize: '12px',
          fontWeight: 700,
          textTransform: 'uppercase',
          letterSpacing: '0.7px',
          color: T.NAVY,
        }}
      >
        This is not a legal order
      </p>
      <ul
        style={{
          margin: 0,
          paddingLeft: '20px',
          display: 'flex',
          flexDirection: 'column',
          gap: '6px',
          fontSize: '13px',
          lineHeight: 1.5,
          color: T.INK_2,
        }}
      >
        {QDG_DISCLAIMER_BULLETS.map((bullet) => (
          <li key={bullet}>{bullet}</li>
        ))}
      </ul>
    </div>
  );
}
