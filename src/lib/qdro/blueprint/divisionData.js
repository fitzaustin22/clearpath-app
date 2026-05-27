/**
 * QDRO §10.8 §6 division-data adapter (PR-A m5/qdro-s108-blueprint-wiring).
 *
 * Produces the payload consumed by `useBlueprintStore.updateQDRODivision`:
 *
 *   { assets: { [assetId]: { userRole, planType, decisions, pvSource,
 *                            completionState, metadata } },
 *     status: 'empty' | 'partial' | 'complete' }
 *
 * Per asset, `completionState` is DERIVED from `decisions` + `pvSource` +
 * `planType` per §10.8 (NOT a stored field — see vault §14 recon + §10.8
 * amendment, 2026-05-27):
 *
 *   empty    — no decisions captured (no populated branch field per §8.10.2)
 *   complete — every branch field populated per §8.10.2 (reuses
 *              `isAssetComplete` from qdroSelectors)
 *   partial  — otherwise
 *
 * §10.8 carve-out: a `private_db` asset with `pvSource: null` caps at
 * `'partial'`, never `'complete'`, regardless of how many of its 5 branch
 * fields are populated — its PV pairing is not wired until the §13-step-6
 * (post-PVA) build per §8.6.1.
 *
 * Section status is the §10.8 rollup over per-asset `completionState`:
 *
 *   empty    — no assets, OR every asset's completionState === 'empty'
 *   complete — every asset's completionState === 'complete'
 *   partial  — otherwise (any mix)
 *
 * This adapter is the single source of truth for the per-asset
 * `completionState` derivation AND the section-status rollup; the
 * blueprintStore action consumes both pre-computed.
 */

import { isAssetComplete, isValuePopulated } from '@/src/lib/qdro';

/**
 * §10.8 — "empty" means no decisions captured at all. Computed per planType,
 * mirroring the branch shapes in §8.10.2:
 *
 *   dc           — none of allocationType, allocationValue, valuationDate.type,
 *                  receiptMethod populated
 *   ira          — none of decreeLanguageConfirmed, custodian, custodianNotes
 *                  populated
 *   private_db   — none of interestStructure, qpsa, qjsa, cola,
 *                  earlyRetirementSubsidy populated
 *   flag-only    — no `starterQuestionResponses` array on `decisions` (i.e.,
 *                  asset added via `addQDROAsset` but never touched). An empty
 *                  array IS a captured decision per §8.10.2 ("flag-only
 *                  branches frequently defer all answers to attorney") and
 *                  counts as 'complete' via `isAssetComplete`.
 *   unset        — no/unknown planType → treated as empty.
 *
 * Exported for unit testing alongside `deriveCompletionState`.
 */
export function isAssetEmpty(asset) {
  const d = asset?.decisions ?? {};
  switch (asset?.planType) {
    case 'dc':
      return (
        !isValuePopulated(d.allocationType) &&
        !isValuePopulated(d.allocationValue) &&
        !isValuePopulated(d.valuationDate?.type) &&
        !isValuePopulated(d.receiptMethod)
      );
    case 'ira':
      return (
        !isValuePopulated(d.decreeLanguageConfirmed) &&
        !isValuePopulated(d.custodian) &&
        !isValuePopulated(d.custodianNotes)
      );
    case 'private_db':
      return (
        !isValuePopulated(d.interestStructure) &&
        !isValuePopulated(d.qpsa) &&
        !isValuePopulated(d.qjsa) &&
        !isValuePopulated(d.cola) &&
        !isValuePopulated(d.earlyRetirementSubsidy)
      );
    case 'gov_civilian':
    case 'military':
    case 'state_municipal':
      return !Array.isArray(d.starterQuestionResponses);
    default:
      return true;
  }
}

/**
 * §10.8 — derive per-asset completionState. Empty wins first; the
 * private_db pvSource:null carve-out caps at 'partial' before the
 * complete check; otherwise defers to `isAssetComplete`.
 */
export function deriveCompletionState(asset) {
  if (isAssetEmpty(asset)) return 'empty';
  // §10.8 carve-out: private_db requires a PVA pairing for 'complete';
  // missing pvSource caps at 'partial' even when all 5 branch fields
  // are populated (the PV link lands at §13 step 6).
  if (asset?.planType === 'private_db' && asset?.pvSource == null) {
    return 'partial';
  }
  return isAssetComplete(asset) ? 'complete' : 'partial';
}

/**
 * §10.8 — section-status rollup over per-asset completionState.
 * Exported for unit testing.
 */
export function rollupStatus(completionStates) {
  if (completionStates.length === 0) return 'empty';
  if (completionStates.every((s) => s === 'empty')) return 'empty';
  if (completionStates.every((s) => s === 'complete')) return 'complete';
  return 'partial';
}

/**
 * §10.8 — assemble the `updateQDRODivision` payload from m5Store.
 *
 * @param {object} m5State — full m5Store state slice (or subset)
 * @returns {{ assets: object, status: 'empty'|'partial'|'complete' }}
 */
export function selectQDRODivisionData(m5State) {
  const assetsMap = m5State?.qdroDecision?.assets ?? {};
  const entries = Object.entries(assetsMap);

  const assets = {};
  for (const [id, a] of entries) {
    assets[id] = {
      userRole: a?.userRole ?? null,
      planType: a?.planType ?? null,
      decisions: a?.decisions ?? {},
      pvSource: a?.pvSource ?? null,
      completionState: deriveCompletionState(a),
      metadata: a?.metadata ?? {
        formulaId: null,
        citations: [],
        qdroPacketGeneratedAt: null,
      },
    };
  }

  const status = rollupStatus(
    Object.values(assets).map((a) => a.completionState),
  );

  return { assets, status };
}
