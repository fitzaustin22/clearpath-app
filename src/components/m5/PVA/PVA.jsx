'use client';

/**
 * PVA orchestrator — top-level Pension Valuation Analyzer component.
 *
 * Owns the §7.10.3 discriminated-union consumption per LL-17. Three variants
 * of `prePopulatePVAInputs(...)` get explicit render branches — no fall-through:
 *   1. null                                  → "claim not found" surface
 *   2. {error, missingFields}                → <ValidationErrorPanel/>
 *   3. {inputs, _prePopSources}              → <InputsPanel/> + <ResultsPanel/>
 *
 * Path resolution per spec §7.2 v2 is a single reactive computation owned
 * here. The pre-pop seam no longer emits a `path` — the orchestrator derives
 * `resolvedPath` from `inputs.accrualStatus`, `inputs.planType`, and
 * `inputs.tierOverride` on every render, so user edits to the Pension-status
 * control, plan-type selector, and tier override all re-route the asset
 * without any store roundtrip:
 *   R1: planType ∈ flag-only set                   → 'flag_only'
 *   R2: planType === 'private_db_cash_balance'     → 'cash_balance'
 *   R3: accrualStatus === 'in_pay_status'          → 'in_pay_status'
 *   R4/R5: tier base = accrualStatus === 'frozen' ? 'tier_1' : 'tier_3'
 *   R6: tierOverride ∈ validSet wins; validSet drops tier_3 when frozen
 *
 * Pre-pop is one-shot per asset (§7.3.7 — "on a fresh m5Store slot"): the
 * persistence useEffect gates on `existing?.inputs == null` to prevent
 * later renders from overwriting user edits.
 *
 * `frozenRoutingApplied` is derived from `inputs.accrualStatus === 'frozen'`
 * — a single source of truth threaded to the engine's STEP CP.4 callout, the
 * ResultsPanel structural banner, and the InputsPanel's TierOverride tier_3
 * visibility guard.
 *
 * @param {object} props
 * @param {object | null} [props.seedOverride]  Dev-only fixture override. Shape:
 *   { assetId, inputs, error?, missingFields? } — frozen/in-pay variants
 *   express the desired routing via `inputs.accrualStatus`; tier overrides
 *   via `inputs.tierOverride`. The synthesizer maps the seed into a pre-pop
 *   result that bypasses m1/m2/m3 reads. See `__fixtures__/seedVariants.js`.
 */

import { useEffect, useMemo, useState } from 'react';
import { useM2Store } from '@/src/stores/m2Store';
import { useM5Store } from '@/src/stores/m5Store';
import useBlueprintStore from '@/src/stores/blueprintStore';
import { prePopulatePVAInputs } from '@/src/stores/prePopulate';
import { calculatePensionValue } from '@/src/lib/pensionValuation';
import { getHeadlinePV, getMaritalPV } from '@/src/lib/pensionValuation';
import { T } from '@/src/lib/brand/tokens';
import AssetPicker from './AssetPicker.jsx';
import InputsPanel from './InputsPanel/index.jsx';
import ResultsPanel from './ResultsPanel.jsx';
import ValidationErrorPanel from './ValidationErrorPanel.jsx';

const FLAG_ONLY_PLAN_TYPES = new Set([
  'multi_employer',
  'gov_civilian',
  'military',
  'state_municipal',
]);

const TIER_VALUES_FROZEN = new Set(['tier_1', 'tier_2']);
const TIER_VALUES_ALL = new Set(['tier_1', 'tier_2', 'tier_3']);

export default function PVA({ seedOverride = null }) {
  // ─── Asset selection ──────────────────────────────────────────────────
  const [selectedAssetId, setSelectedAssetId] = useState(seedOverride?.assetId ?? null);

  // ─── Store reads (primitive selectors per LL-9) ───────────────────────
  const m2Items = useM2Store((s) => s.maritalEstateInventory?.items);
  const assetState = useM5Store(
    (s) => s.pensionValuation?.assets?.[selectedAssetId ?? '__none__'],
  );
  const setPVAAssetInputs = useM5Store((s) => s.setPVAAssetInputs);
  const setPVAAssetPrePopSources = useM5Store((s) => s.setPVAAssetPrePopSources);
  const setPVAAssetResults = useM5Store((s) => s.setPVAAssetResults);
  const updatePensionValuation = useBlueprintStore((s) => s.updatePensionValuation);

  // Synthesize m2Store-shaped object for prePopulate. prePopulatePVAInputs
  // only reads `m2Store.maritalEstateInventory.items` (m1/m3 unused at v1).
  const m2StoreSnapshot = useMemo(
    () => ({ maritalEstateInventory: { items: m2Items ?? [] } }),
    [m2Items],
  );

  // ─── Pre-pop result (§7.10.3 discriminated union; §7.2 v2 shape) ──────
  const prePopResult = useMemo(() => {
    if (seedOverride) {
      // Synthesize the union variant from the seed config. The orchestrator
      // computes path from inputs reactively, so the seed only needs to
      // supply `inputs` (which expresses accrualStatus/tierOverride for
      // frozen/in-pay/tier-1 visual targets) — no top-level path key.
      if (seedOverride.error) {
        return {
          error: seedOverride.error,
          missingFields: seedOverride.missingFields ?? [],
        };
      }
      return {
        inputs: seedOverride.inputs ?? {},
        _prePopSources: seedOverride._prePopSources ?? {},
      };
    }
    if (!selectedAssetId) return null;
    return prePopulatePVAInputs({
      m1Store: null,
      m2Store: m2StoreSnapshot,
      m3Store: null,
      assetId: selectedAssetId,
    });
  }, [seedOverride, selectedAssetId, m2StoreSnapshot]);

  // ─── One-shot pre-pop persistence (§7.3.7 freshness gate) ─────────────
  useEffect(() => {
    if (!selectedAssetId || !prePopResult) return;
    if (prePopResult.error) return;
    // Freshness gate: only seed the asset slot the first time. After the
    // user edits, the slot's `inputs` is no longer the pre-pop literal;
    // overwriting here would discard their work.
    const existing = useM5Store.getState().pensionValuation?.assets?.[selectedAssetId];
    if (existing?.inputs) return;
    setPVAAssetInputs(selectedAssetId, prePopResult.inputs);
    setPVAAssetPrePopSources(selectedAssetId, prePopResult._prePopSources);
  }, [
    selectedAssetId,
    prePopResult,
    setPVAAssetInputs,
    setPVAAssetPrePopSources,
  ]);

  // ─── Path resolution (§7.2 v2 R1–R6, all reactive) ────────────────────
  // Fall back to the pre-pop seed before the store catches up so the very
  // first render after asset selection has a resolved path (no null-path
  // flicker). On the error variant `prePopResult.inputs` is undefined, so
  // this correctly falls through to null.
  const inputs = assetState?.inputs ?? prePopResult?.inputs ?? null;
  const resolvedPath = useMemo(() => {
    if (!prePopResult || prePopResult.error || !inputs) return null;
    const planType = inputs.planType;
    if (planType && FLAG_ONLY_PLAN_TYPES.has(planType)) return 'flag_only'; // R1
    if (planType === 'private_db_cash_balance') return 'cash_balance';      // R2
    if (inputs.accrualStatus === 'in_pay_status') return 'in_pay_status';   // R3
    const tierBase = inputs.accrualStatus === 'frozen' ? 'tier_1' : 'tier_3'; // R4/R5
    const validSet = inputs.accrualStatus === 'frozen' ? TIER_VALUES_FROZEN : TIER_VALUES_ALL;
    if (inputs.tierOverride && validSet.has(inputs.tierOverride)) {         // R6
      return inputs.tierOverride;
    }
    return tierBase;
  }, [prePopResult, inputs]);

  // Single source of truth for the frozen-routing UX (STEP CP.4 callout,
  // ResultsPanel structural banner, TierOverride tier_3 visibility guard).
  const frozenRoutingApplied = inputs?.accrualStatus === 'frozen';

  // ─── Engine call ──────────────────────────────────────────────────────
  // Merge sibling flags into the inputs argument per §7.3.1.
  const results = useMemo(() => {
    if (!selectedAssetId || !inputs || !resolvedPath) return null;
    if (prePopResult?.error) return null;
    try {
      return calculatePensionValue({
        ...inputs,
        path: resolvedPath,
        planType: inputs.planType ?? null,
        _frozenRoutingApplied: frozenRoutingApplied,
      });
    } catch {
      // Engine throws on missing required inputs. Surface as "incomplete"
      // via results = null → ResultsPanel renders soft placeholder.
      return null;
    }
  }, [
    selectedAssetId,
    inputs,
    resolvedPath,
    prePopResult,
    frozenRoutingApplied,
  ]);

  // ─── Persist results ──────────────────────────────────────────────────
  useEffect(() => {
    if (!selectedAssetId || !results) return;
    setPVAAssetResults(selectedAssetId, results);
  }, [selectedAssetId, results, setPVAAssetResults]);

  // ─── Sync results to Blueprint §6 (Retirement Plan Division → data.pva) ─
  // flag_only writes a minimal slot (no PV) so PIT pre-pop correctly skips.
  // Coverture paths (tier_3, cash_balance with coverture) populate maritalPV
  // from the type-narrowing helper; non-coverture paths return null per [R5b-16].
  useEffect(() => {
    if (!results) return;
    if (results.path === 'flag_only') {
      updatePensionValuation({
        path: 'flag_only',
        headlinePV: null,
        maritalPV: null,
      });
      return;
    }
    updatePensionValuation({
      path: results.path,
      headlinePV: getHeadlinePV(results),
      maritalPV: getMaritalPV(results),
      expectedRetirementAge: inputs?.expectedRetirementAge ?? null,
      coverturePercent: results.coverture?.fraction ?? null,
      citations: results.metadata?.citations ?? null,
    });
  }, [results, inputs?.expectedRetirementAge, updatePensionValuation]);

  // ─── Render (LL-17 explicit branches) ─────────────────────────────────
  return (
    <div
      data-testid="pva-root"
      style={{
        fontFamily: T.FONT_BODY,
        color: T.NAVY,
        background: T.PARCHMENT,
        padding: '1.5rem',
        borderRadius: 8,
      }}
    >
      {!seedOverride && (
        <AssetPicker selectedAssetId={selectedAssetId} onSelect={setSelectedAssetId} />
      )}

      {/* Variant 1: prePopResult === null  →  No claim message (only when
          a selection was made; pre-asset-picker idle state shows nothing). */}
      {prePopResult === null && selectedAssetId && (
        <div
          data-testid="pva-no-claim"
          style={{
            marginTop: '1rem',
            padding: '0.75rem 1rem',
            background: T.AMBER_BG,
            border: `1px solid ${T.AMBER_BORDER}`,
            borderRadius: 6,
            color: T.NAVY,
            fontFamily: T.FONT_BODY,
          }}
        >
          No pension claim found for the selected asset. Verify the M2 entry's
          category is "pensions".
        </div>
      )}

      {/* Variant 2: validation error  →  ValidationErrorPanel */}
      {prePopResult?.error && <ValidationErrorPanel error={prePopResult} />}

      {/* Variant 3: normal pre-pop  →  InputsPanel + ResultsPanel.
          Gated on the store having absorbed the one-shot pre-pop seed
          (`assetState?.inputs`) so that child commit-effects in subpanels
          like ReceiptFormDropdown can't fire on render-1 with an empty
          store snapshot and clobber the seed via a stale-closure merge. */}
      {prePopResult && !prePopResult.error && selectedAssetId && assetState?.inputs && (
        <div style={{ marginTop: '1rem' }}>
          <InputsPanel
            assetId={selectedAssetId}
            path={resolvedPath}
            frozenRoutingApplied={frozenRoutingApplied}
          />
          <ResultsPanel
            results={results}
            flags={{ _frozenRoutingApplied: frozenRoutingApplied }}
          />
        </div>
      )}
    </div>
  );
}
