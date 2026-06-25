'use client';

// Module 4 progress adapter — the store-binding half of the ModuleLanding
// contract. M4's "complete" semantics are the simplest of any module: BINARY. Each
// tool slice carries a single `completedAt` timestamp, set atomically with its
// `results` by setFilingStatusResults / setPITResults — there is no partial /
// "started" flag, and the prior M4 page rendered only Complete / Not started. So
// the adapter maps completedAt -> complete/100 | not_started/0, with NO in_progress
// branch. The shared ModuleLanding / deriveModuleJourney never see a store; the
// tier-aware LOCKING of these (wholesale-gated) worksheets is resolved upstream from
// the config `gated` flag + the user's tier — this adapter stays tier-unaware and
// reports real progress exactly like M2/M3. Two layers, mirroring m3Landing.adapter:
//   - m4NormalizeProgress(raw): PURE, unit-tested. Owns the binary mapping.
//   - useM4Progress(): the thin hook reading the two real useM4Store completedAt
//     selectors (the same the prior M4ModulePage read) and feeding it.

import { useM4Store } from '@/src/stores/m4Store';

function entry(id, status, pct) {
  return { id, status, pct };
}

// Binary: a completedAt timestamp means the tool was run to a result. Anything else
// (null, undefined, a missing slice) is not_started. No in_progress for M4.
function binaryEntry(id, slice) {
  return slice?.completedAt
    ? entry(id, 'complete', 100)
    : entry(id, 'not_started', 0);
}

/**
 * @param {{filingStatusOptimizer:object, pitTaxDiscount:object}} raw
 *        the two real useM4Store slices (only `.completedAt` is read).
 * @returns {Array<{id:string, status:'not_started'|'complete', pct:number}>}
 *        one entry per worksheet, in journey order (matches M4_LANDING.worksheets).
 */
export function m4NormalizeProgress(raw) {
  return [
    binaryEntry('filingStatusOptimizer', raw?.filingStatusOptimizer),
    binaryEntry('pitTaxDiscount', raw?.pitTaxDiscount),
  ];
}

/**
 * Thin store binding: reads the two real useM4Store completedAt values (the same
 * selectors the prior M4ModulePage used) and returns the normalized array
 * ModuleLanding consumes.
 * @returns {Array<{id:string, status:string, pct:number}>}
 */
export function useM4Progress() {
  const filingStatusCompletedAt = useM4Store(
    (s) => s.filingStatusOptimizer.completedAt,
  );
  const pitCompletedAt = useM4Store((s) => s.pitTaxDiscount.completedAt);

  return m4NormalizeProgress({
    filingStatusOptimizer: { completedAt: filingStatusCompletedAt },
    pitTaxDiscount: { completedAt: pitCompletedAt },
  });
}
