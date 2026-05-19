/**
 * QDRO Decision Guide — §8.7 / §8.10.3 packet-readiness store adapters.
 *
 * Thin selectors over the m5Store `qdroDecision` slice that delegate the
 * actual readiness rule to the LOCKED pure §8.10.3 `isPacketReady`
 * (`src/lib/qdro/qdroSelectors.js`, DO-NOT-TOUCH / consumed via the qdro
 * barrel). Keeping the rule in one place means the DC participant
 * receipt-method-null carve-out (§8.5.4.2) and the flag-only empty-array
 * allowance (§8.10.2) stay authoritative in exactly one selector.
 *
 * Adjudication note: build-prompt §5 prose ("flag-only answers non-empty")
 * is superseded by LOCKED §8.10.2/§8.10.3 — an empty
 * `starterQuestionResponses` array IS packet-ready (flag-only branches
 * frequently defer all answers to the drafting attorney). This delegation
 * also honors PR4-3 (no edit to qdroSelectors.js).
 */

import { isPacketReady } from '@/src/lib/qdro';

function assetsOf(state) {
  return state?.qdroDecision?.assets ?? {};
}

/** §8.10.3 — true when the slice has ≥1 asset and every asset's decisions
 *  are populated per its branch shape. Delegates to the locked selector. */
export function selectQDROPacketReady(state) {
  return isPacketReady(assetsOf(state));
}

/** §8.7 — the asset ids that compose the packet, in slice order; `[]`
 *  whenever the packet is not yet ready. */
export function selectQDROPacketReadyAssetIds(state) {
  const assets = assetsOf(state);
  return isPacketReady(assets) ? Object.keys(assets) : [];
}
