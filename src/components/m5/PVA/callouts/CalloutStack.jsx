'use client';

import { CALLOUT_PRECEDENCE, CALLOUT_TYPE_TO_COMPONENT } from './callout-precedence';

/**
 * Renders the engine's breakdown.callouts[] in §7.9.1 precedence order.
 *
 * Spec §7.6.2: surfacing order is NOT semantically meaningful; rendering
 * order is — sorted by CALLOUT_PRECEDENCE before display. Unknown types
 * are skipped and a dev-mode warning is logged.
 *
 * @param {object} props
 * @param {Array<{ type: string, [field: string]: any }>} props.callouts
 */
export default function CalloutStack({ callouts = [] }) {
  if (!Array.isArray(callouts) || callouts.length === 0) return null;

  const precedenceOf = (type) => {
    const p = CALLOUT_PRECEDENCE[type];
    return typeof p === 'number' ? p : Number.MAX_SAFE_INTEGER;
  };
  const sorted = [...callouts].sort(
    (a, b) => precedenceOf(a.type) - precedenceOf(b.type),
  );

  return (
    <div data-testid="callout-stack">
      {sorted.map((c, idx) => {
        const Component = CALLOUT_TYPE_TO_COMPONENT[c.type];
        if (!Component) {
          if (process.env.NODE_ENV !== 'production') {
            // eslint-disable-next-line no-console
            console.warn(`[CalloutStack] Unknown callout type: ${c.type}`);
          }
          return null;
        }
        return <Component key={`${c.type}-${idx}`} runtimeData={c} />;
      })}
    </div>
  );
}
