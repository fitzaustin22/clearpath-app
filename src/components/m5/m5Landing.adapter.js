'use client';

// Module 5 progress adapter — the store-binding half of the ModuleLanding
// contract, and the MOST heterogeneous of the rollout. M5's four tools have three
// different completion shapes, and ALL of that mess lives here behind the clean
// `{id, status, pct}` ProgressEntry contract — the shared ModuleLanding /
// deriveModuleJourney never see a store. The tier-aware LOCKING of these
// (wholesale-gated) worksheets is resolved upstream from the config `gated` flag +
// the user's tier; this adapter stays tier-unaware and reports real progress
// exactly like M2/M3/M4. Two layers, mirroring m3/m4Landing.adapter:
//   - m5NormalizeProgress(raw): PURE, unit-tested. Owns the three completion rules.
//   - useM5Progress(): the thin hook reading the four real useM5Store slices.
//
// The three completion semantics (confirmed at the M5 migration checkpoint):
//   - Support Estimator & Home Decision (SINGLETON `results`): BINARY —
//     results != null -> complete; else not_started. No in_progress: `results` is
//     the only pre-pop-immune signal (inputs get pre-populated on tool mount, so an
//     "inputs touched" in_progress would false-positive on a barely-visited tool).
//   - Pension Valuation (MULTI-INSTANCE `assets{}`): complete iff ANY asset has
//     results != null (a flag-only result — `results.pv === null` — still counts as
//     a finished analysis); a bare asset (no results) is in_progress; empty map is
//     not_started.
//   - QDRO Decision Guide (`assets{}`, NO completion flag): leans on the contract
//     field `metadata.qdroPacketGeneratedAt`. complete iff ANY asset has it stamped;
//     a bare asset is in_progress; empty map is not_started. NOTE: no production code
//     writes qdroPacketGeneratedAt yet (dormant field) — until a packet-generation
//     flow stamps it, QDRO tops out at in_progress. This is the most-approximated
//     mapping of the rollout, by design.
// pct is the sanctioned synthetic bucket (0 / 50 / 100), as M3/M4.

import { useM5Store } from '@/src/stores/m5Store';

function entry(id, status, pct) {
  return { id, status, pct };
}

// Singleton tools — binary on a single `results` object.
function singletonEntry(id, slice) {
  return slice?.results != null
    ? entry(id, 'complete', 100)
    : entry(id, 'not_started', 0);
}

// Multi-instance tools — 3-state from an object-keyed `assets{}` map, given a
// per-asset "is this asset complete?" predicate:
//   any asset complete -> complete/100; >=1 asset, none complete -> in_progress/50;
//   no assets -> not_started/0.
function multiInstanceEntry(id, assets, isAssetComplete) {
  const slots = Object.values(assets || {});
  if (slots.length === 0) return entry(id, 'not_started', 0);
  if (slots.some(isAssetComplete)) return entry(id, 'complete', 100);
  return entry(id, 'in_progress', 50);
}

const pvaAssetComplete = (asset) => asset?.results != null;
const qdroAssetComplete = (asset) =>
  asset?.metadata?.qdroPacketGeneratedAt != null;

/**
 * @param {{supportEstimator:object, pensionValuation:object, qdroDecision:object,
 *          homeDecision:object}} raw  the four real useM5Store slices.
 * @returns {Array<{id:string, status:'not_started'|'in_progress'|'complete', pct:number}>}
 *        one entry per worksheet, in journey order (matches M5_LANDING.worksheets:
 *        SE, PVA, QDRO, HDA).
 */
export function m5NormalizeProgress(raw) {
  return [
    singletonEntry('supportEstimator', raw?.supportEstimator),
    multiInstanceEntry(
      'pensionValuation',
      raw?.pensionValuation?.assets,
      pvaAssetComplete,
    ),
    multiInstanceEntry('qdroDecision', raw?.qdroDecision?.assets, qdroAssetComplete),
    singletonEntry('homeDecision', raw?.homeDecision),
  ];
}

/**
 * Thin store binding: selects the four real useM5Store slices as WHOLE objects
 * (stable references — never array methods inside a selector, per the m5Store
 * convention warning) and feeds the pure normalizer.
 * @returns {Array<{id:string, status:string, pct:number}>}
 */
export function useM5Progress() {
  const supportEstimator = useM5Store((s) => s.supportEstimator);
  const pensionValuation = useM5Store((s) => s.pensionValuation);
  const qdroDecision = useM5Store((s) => s.qdroDecision);
  const homeDecision = useM5Store((s) => s.homeDecision);

  return m5NormalizeProgress({
    supportEstimator,
    pensionValuation,
    qdroDecision,
    homeDecision,
  });
}
