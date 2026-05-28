/**
 * QDRO Decision Guide — §8.10.3 cross-asset selectors.
 *
 * Pure functions over the object-keyed `qdroDecision.assets` map (see
 * §8.10.1). Used by downstream rendering (asset list, packet header,
 * specialist-routing block) and the §8.6.3 PV-missing warning. No store
 * coupling — callers pass the raw `assets` object.
 *
 * Note: `privateDbMissingPvSource` is a pure read filter that *reports*
 * private_db assets lacking a PV link; it does NOT require pvSource non-null
 * for any code path (no PVA dependency — step-4 safe per §8.6.1).
 */

const FLAG_ONLY_PLAN_TYPES = new Set(['gov_civilian', 'military', 'state_municipal']);

function entries(assets) {
  return Object.entries(assets || {});
}

/** §8.10.3 — asset count keyed by planType. */
export function countByPlanType(assets) {
  const out = {};
  for (const [, a] of entries(assets)) {
    out[a.planType] = (out[a.planType] || 0) + 1;
  }
  return out;
}

/** §8.10.3 — asset count keyed by userRole. */
export function countByUserRole(assets) {
  const out = {};
  for (const [, a] of entries(assets)) {
    out[a.userRole] = (out[a.userRole] || 0) + 1;
  }
  return out;
}

/** §8.10.3 — flag-only assets ({assetId, asset}), drives §8.7.5 routing block. */
export function flagOnlyAssets(assets) {
  return entries(assets)
    .filter(([, a]) => FLAG_ONLY_PLAN_TYPES.has(a.planType))
    .map(([assetId, asset]) => ({ assetId, asset }));
}

/** §8.10.3 — private_db assets with null pvSource (drives §8.6.3 warning). */
export function privateDbMissingPvSource(assets) {
  return entries(assets)
    .filter(([, a]) => a.planType === 'private_db' && (a.pvSource == null))
    .map(([assetId, asset]) => ({ assetId, asset }));
}

/** §8.10.3 — true when assets carry more than one distinct userRole. */
export function isMixedPerspective(assets) {
  const roles = new Set(entries(assets).map(([, a]) => a.userRole));
  return roles.size > 1;
}

export function isValuePopulated(v) {
  return v != null && v !== '';
}

/**
 * §8.10.3 — per-branch "decisions populated to non-null per branch shape."
 * Returns true when the asset's `decisions` object is fully captured per its
 * `planType` schema (§8.10.2). Used by `isPacketReady` here and by
 * `selectQDRODivisionData` (src/lib/qdro/blueprint/divisionData.js) to derive
 * per-asset `completionState`.
 *
 * Note: enum value `'not_yet_decided'` is an explicit (non-null) selection
 * and counts as populated.
 */
export function isAssetComplete(asset) {
  const d = asset.decisions || {};
  switch (asset.planType) {
    case 'dc': {
      const allocationOk =
        isValuePopulated(d.allocationType) && isValuePopulated(d.allocationValue);
      const valuationOk = isValuePopulated(d.valuationDate?.type);
      // §8.5.4.2: receiptMethod is required only on the alternate-payee flow;
      // a participant's null receiptMethod still counts as ready.
      const receiptOk =
        asset.userRole === 'alternatePayee' ? isValuePopulated(d.receiptMethod) : true;
      return allocationOk && valuationOk && receiptOk;
    }
    case 'ira':
      return isValuePopulated(d.decreeLanguageConfirmed) && isValuePopulated(d.custodian);
    case 'gov_civilian':
    case 'military':
    case 'state_municipal':
      // Empty starterQuestionResponses array is allowed (§8.10.2 — flag-only
      // branches frequently defer all answers to the attorney).
      return Array.isArray(d.starterQuestionResponses);
    case 'private_db':
      return (
        isValuePopulated(d.interestStructure) &&
        isValuePopulated(d.qpsa) &&
        isValuePopulated(d.qjsa) &&
        isValuePopulated(d.cola) &&
        isValuePopulated(d.earlyRetirementSubsidy)
      );
    default:
      return false;
  }
}

/**
 * §8.10.3 — packet-ready when there is ≥1 asset and every asset's decisions
 * are populated per its branch shape (DC participant receiptMethod-null
 * carve-out per §8.5.4.2; flag-only empty-array allowed per §8.10.2).
 */
export function isPacketReady(assets) {
  const list = entries(assets);
  if (list.length === 0) return false;
  return list.every(([, a]) => isAssetComplete(a));
}
