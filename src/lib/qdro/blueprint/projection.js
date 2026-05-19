/**
 * QDRO Blueprint projection selector (PR5-1, PR5-6).
 *
 * Produces a raw decision-data subset of the `qdroDecision.assets` map for
 * downstream Blueprint rendering. No summarization; no derived fields. A
 * separate module renders summaries from the projection.
 *
 * `generatedAt` is always null from the selector — a write action stamps it
 * later (PR5-2). Field-name reconciliation (userRole→perspective, planName→
 * label, decisions→branchCapture, object→array) is intentional and confirmed
 * against the store shape (§8.10.1).
 */

import { flagOnlyAssets, isMixedPerspective } from '@/src/lib/qdro';

/**
 * §8 Blueprint projection selector.
 *
 * @param {object} m5State — full m5Store state slice (or subset)
 * @returns {{ perspective: string|null, assets: Array, generatedAt: null }}
 */
export function selectQDROBlueprintProjection(m5State) {
  const assetsMap = m5State?.qdroDecision?.assets ?? {};
  const flagOnlyIds = new Set(flagOnlyAssets(assetsMap).map((x) => x.assetId));
  const entries = Object.entries(assetsMap); // m5Store insertion order — DO NOT sort

  const assets = entries.map(([id, a]) => {
    const isFlagOnly = flagOnlyIds.has(id);
    return {
      id,
      label: a?.planName ?? null,
      planType: a?.planType ?? null,
      perspective: a?.userRole ?? null,
      branchCapture: isFlagOnly ? null : (a?.decisions ?? null),
      flagOnlyResponses: isFlagOnly ? (a?.decisions?.starterQuestionResponses ?? null) : null,
    };
  });

  const perspective =
    entries.length === 0 ? null
    : isMixedPerspective(assetsMap) ? 'mixed'
    : (entries[0][1]?.userRole ?? null);

  return { perspective, assets, generatedAt: null };
}

/**
 * Shallow projection equality via JSON serialization.
 * Safe because the selector produces deterministic key ordering.
 * Two null projections are equal (true); null vs object is false.
 *
 * @param {object|null} a
 * @param {object|null} b
 * @returns {boolean}
 */
export function isProjectionEqual(a, b) {
  return JSON.stringify(a) === JSON.stringify(b);
}
