'use client';

import { useState } from 'react';
import { T } from '@/src/lib/brand/tokens';
import StepRow from './StepRow';

/**
 * §7.6.2 — Collapsible per-step breakdown consuming engine
 * `breakdown.perStepNarrative[]` (9 locked step IDs).
 *
 * @param {object} props
 * @param {Array<{ step: number, stepId: string, label: string, computation: string, result: any }>} props.steps
 */
export default function PerStepNarrative({ steps = [] }) {
  const [expanded, setExpanded] = useState(false);
  if (!Array.isArray(steps) || steps.length === 0) return null;

  return (
    <div
      data-testid="per-step-narrative"
      style={{
        marginTop: '1rem',
        border: `1px solid ${T.NAVY_12}`,
        borderRadius: 6,
        background: T.CARD,
      }}
    >
      <button
        type="button"
        onClick={() => setExpanded((e) => !e)}
        aria-expanded={expanded}
        data-testid="per-step-narrative-toggle"
        style={{
          width: '100%',
          textAlign: 'left',
          padding: '0.75rem 1rem',
          background: T.NAVY,
          color: T.PARCHMENT,
          border: 'none',
          fontFamily: T.FONT_BODY,
          fontWeight: 600,
          cursor: 'pointer',
          borderRadius: 6,
        }}
      >
        {expanded ? '▼ Hide' : '▶ Show'} the math ({steps.length} step{steps.length === 1 ? '' : 's'})
      </button>
      {expanded && (
        <div style={{ padding: '0.5rem 1rem 0.75rem' }} data-testid="per-step-narrative-body">
          {steps.map((step) => (
            <StepRow key={step.stepId} step={step} />
          ))}
        </div>
      )}
    </div>
  );
}
