'use client';

import { T } from '@/src/lib/brand/tokens';

const KNOWN_STEP_IDS = new Set([
  'step_cp_resolve_constants',
  'step_cp_dispatch_path',
  'step_t_compute_deferral_period',
  'step_t_compute_coverture_fraction',
  'step_t_compute_annuity_factor',
  'step_t_compute_pv',
  'step_t_apply_coverture',
  'step_t_compute_sensitivity_bracket',
  'step_cp_lump_sum_comparison',
]);

function formatNumericResult(n) {
  if (typeof n !== 'number' || !Number.isFinite(n)) return null;
  if (Math.abs(n) >= 1000) {
    return n.toLocaleString('en-US', {
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: 2,
    });
  }
  return n.toLocaleString('en-US', { maximumFractionDigits: 6 });
}

function StructuredResult({ obj }) {
  const entries = Object.entries(obj).filter(([, v]) => v !== null && v !== undefined);
  if (entries.length === 0) {
    return <span style={{ fontStyle: 'italic' }}>See breakdown below</span>;
  }
  return (
    <ul style={{ margin: '0.25rem 0 0 1rem', padding: 0 }}>
      {entries.map(([k, v]) => (
        <li
          key={k}
          style={{
            listStyle: 'disc',
            marginBottom: '0.125rem',
            fontFamily: T.FONT_BODY,
            fontSize: '0.875rem',
          }}
        >
          <span>{k}:</span>{' '}
          <span style={{ fontFamily: T.FONT_NUMERIC }}>
            {typeof v === 'number'
              ? v.toLocaleString('en-US', { maximumFractionDigits: 6 })
              : String(v)}
          </span>
        </li>
      ))}
    </ul>
  );
}

/**
 * Renders one engine perStepNarrative row. `result` may be number,
 * structured object, or null. Never JSON.stringify in user-facing UI.
 *
 * @param {object} props
 * @param {{ step: number, stepId: string, label: string, computation: string, result: number | object | null }} props.step
 */
export default function StepRow({ step }) {
  const isKnown = KNOWN_STEP_IDS.has(step?.stepId);
  if (!isKnown && process.env.NODE_ENV !== 'production') {
    // eslint-disable-next-line no-console
    console.warn(`[StepRow] Unknown step ID: ${step?.stepId}`);
  }

  let resultNode;
  if (step.result == null) {
    resultNode = <span>—</span>;
  } else if (typeof step.result === 'number') {
    resultNode = <span style={{ fontFamily: T.FONT_NUMERIC }}>{formatNumericResult(step.result)}</span>;
  } else if (typeof step.result === 'object') {
    resultNode = <StructuredResult obj={step.result} />;
  } else {
    resultNode = <span>{String(step.result)}</span>;
  }

  return (
    <div
      data-testid={`step-${step.stepId}`}
      style={{
        padding: '0.5rem 0',
        borderBottom: `1px dotted ${T.NAVY_12}`,
        fontFamily: T.FONT_BODY,
        color: T.NAVY,
      }}
    >
      <div style={{ fontWeight: 600 }}>
        Step {step.step}: {step.label}
      </div>
      {step.computation && (
        <div
          style={{
            fontFamily: T.FONT_NUMERIC,
            fontSize: '0.875rem',
            marginTop: '0.25rem',
            color: T.NAVY_70,
          }}
        >
          {step.computation}
        </div>
      )}
      <div style={{ marginTop: '0.25rem', fontSize: '0.9rem' }}>
        Result: {resultNode}
      </div>
    </div>
  );
}
