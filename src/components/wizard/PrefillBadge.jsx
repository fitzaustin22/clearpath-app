'use client';

import { T } from '@/src/lib/brand/tokens';

/**
 * PrefillBadge — "FROM M3" / "FROM M5" provenance pill.
 *
 * Mirrors the wizard form-field badge styling (WizardField/WizardSelector) so
 * provenance reads identically everywhere. Renders nothing unless a source is
 * supplied — wire it to a real item-level provenance signal; never fabricate.
 *
 * Props: from (e.g. 'M3' | 'M5').
 */
export default function PrefillBadge({ from }) {
  if (!from) return null;
  return (
    <span
      data-testid="mei-prefill-badge"
      title={`From ${from}`}
      style={{
        flexShrink: 0,
        maxWidth: 160,
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        whiteSpace: 'nowrap',
        fontSize: 10,
        fontWeight: 700,
        textTransform: 'uppercase',
        letterSpacing: '0.5px',
        color: T.PILL_TEXT,
        backgroundColor: T.PARCHMENT_DEEP,
        padding: '2px 7px',
        borderRadius: 999,
        fontFamily: T.FONT_BODY,
      }}
    >
      From {from}
    </span>
  );
}
