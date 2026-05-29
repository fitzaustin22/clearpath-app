/**
 * QDRO Decision Guide — §8.6.5 PVA fixture embed: attorney-readable
 * `formulaId` gloss map.
 *
 * Architect-LOCKED labels (PR-B2-β). The five entries are the canonical PVA
 * `formulaId` values written by `src/lib/pensionValuation/` for the QDRO-
 * relevant `private_db` paths:
 *
 *   pva_db_tier1_v1                — Tier 1              (tier1And2.js)
 *   pva_db_tier2_v1                — Tier 2              (tier1And2.js)
 *   pva_db_tier3_coverture_v1      — Tier 3 (coverture)  (tier3Coverture.js)
 *   pva_db_inpaystatus_v1          — In-pay status       (inPayStatus.js)
 *   pva_cashbalance_passthrough_v1 — Cash balance        (cashBalancePassthrough.js)
 *
 * Used by both packet generators (markdown.js + pdf.jsx) — single source of
 * truth so the renderers never drift on attorney-facing copy.
 */

// §8.6.5 attorney-readable formulaId gloss — architect-locked.
export const PVA_FORMULA_GLOSS = {
  pva_db_tier1_v1: 'Tier 1',
  pva_db_tier2_v1: 'Tier 2',
  pva_db_tier3_coverture_v1: 'Tier 3 (coverture)',
  pva_db_inpaystatus_v1: 'In-pay status',
  pva_cashbalance_passthrough_v1: 'Cash balance',
};

/**
 * Graceful fallback so an unmapped (future) `formulaId` never renders the
 * literal string "undefined" in an attorney handoff packet.
 *
 * @param {string | null | undefined} formulaId
 * @returns {string} mapped attorney-readable gloss, or the raw id as fallback
 */
export function glossFor(formulaId) {
  return PVA_FORMULA_GLOSS[formulaId] ?? formulaId;
}
