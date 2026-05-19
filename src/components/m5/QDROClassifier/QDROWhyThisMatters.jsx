'use client';

/**
 * QDROWhyThisMatters — reusable inline-expand education wrapper (Q-B6 /
 * §8.5.2 / A14). Mirrors the QDROStillNotSureDiagnostic disclosure idiom:
 * an a11y-correct <button> (aria-expanded / aria-controls — not an
 * anchor), collapsed by default, content mounted only while expanded.
 *
 * Content-agnostic: the first consumer is the DC receipt-method question
 * (§8.5.4.2, alternate-payee flow only per §8.5.2), but any future
 * education-wrapper need can compose it. The explanatory copy is supplied
 * by the consumer via children — this component owns only the disclosure
 * mechanics and chrome.
 *
 * @param {object} props
 * @param {string} [props.triggerText] disclosure label (default "Why this matters")
 * @param {React.ReactNode} [props.children] explanatory content shown when expanded
 * @param {string} [props.data-testid] root test id (default "qdro-why-this-matters")
 * @returns {JSX.Element}
 */

import { useId, useState } from 'react';
import { T } from '@/src/lib/brand/tokens';

export default function QDROWhyThisMatters({
  triggerText = 'Why this matters',
  children,
  'data-testid': testId = 'qdro-why-this-matters',
}) {
  const panelId = useId();
  const [expanded, setExpanded] = useState(false);

  return (
    <div data-testid={testId} style={{ marginTop: '8px' }}>
      <button
        type="button"
        aria-expanded={expanded}
        aria-controls={panelId}
        onClick={() => setExpanded((v) => !v)}
        style={{
          padding: 0,
          background: 'none',
          border: 'none',
          color: T.NAVY,
          fontFamily: T.FONT_BODY,
          fontSize: '13px',
          fontWeight: 600,
          textDecoration: 'underline',
          cursor: 'pointer',
        }}
      >
        {triggerText}
      </button>

      {expanded ? (
        <div
          id={panelId}
          data-testid="qdro-why-this-matters-panel"
          style={{
            marginTop: '8px',
            padding: '10px 12px',
            background: T.PARCHMENT,
            border: `1px solid ${T.LINE}`,
            borderRadius: 6,
            fontFamily: T.FONT_BODY,
            fontSize: '13px',
            lineHeight: 1.5,
            color: T.INK_2,
          }}
        >
          {children}
        </div>
      ) : null}
    </div>
  );
}
