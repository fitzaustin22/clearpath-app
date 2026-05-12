/**
 * Push a structured callout onto a calc-engine accumulator.
 *
 * Precedence ordering (§6.6.1) is a render-time concern handled by the UI
 * (PR 3b). Calc engine pushes in execution order; UI sorts on render.
 */
export function surfaceCallout(callouts, type, runtimeData = {}) {
  callouts.push({ type, ...runtimeData });
}
