'use client';

/**
 * PVA orchestrator — top-level Pension Valuation Analyzer component.
 *
 * Owns the §7.10.3 discriminated-union consumption per LL-17. The three
 * variants of `prePopulatePVAInputs(...)`'s return get explicit branches —
 * no fall-through:
 *   1. null                                      → "claim not found" surface
 *   2. {error, missingFields, path: null}        → <ValidationErrorPanel/>
 *   3. {path, inputs, _prePopSources, ...flags}  → <InputsPanel/> + <ResultsPanel/>
 *
 * Path resolution per spec §7.2 layers the user's `planType` / `tierOverride`
 * over pre-pop's accrualStatus-based default:
 *   R1: planType ∈ flag-only set      → 'flag_only'
 *   R2: planType === 'private_db_cash_balance' → 'cash_balance'
 *   R3–R5: prePopResult.path (with user tierOverride for tier paths)
 *
 * Pre-pop is one-shot per asset (§7.3.7 — "on a fresh m5Store slot"): the
 * persistence useEffect gates on `existing?.inputs == null` to prevent
 * later renders from overwriting user edits.
 *
 * @param {object} props
 * @param {object | null} [props.seedOverride]  Dev-only fixture override. Shape:
 *   { assetId, path, inputs, _legacyCurrentValueDetected?, _legacyValue?,
 *     _frozenRoutingApplied?, error?, missingFields? }
 *   When set, bypasses m1/m2/m3 reads — the union variant is synthesized
 *   directly from this object. See `__fixtures__/seedVariants.js`.
 */

import { useEffect, useMemo, useState } from 'react';
import { useM2Store } from '@/src/stores/m2Store';
import { useM5Store } from '@/src/stores/m5Store';
import { prePopulatePVAInputs } from '@/src/stores/prePopulate';
import { calculatePensionValue } from '@/src/lib/pensionValuation';
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
  const setPVAAssetFlags = useM5Store((s) => s.setPVAAssetFlags);

  // Synthesize m2Store-shaped object for prePopulate. prePopulatePVAInputs
  // only reads `m2Store.maritalEstateInventory.items` (m1/m3 unused at v1).
  const m2StoreSnapshot = useMemo(
    () => ({ maritalEstateInventory: { items: m2Items ?? [] } }),
    [m2Items],
  );

  // ─── Pre-pop result (§7.10.3 discriminated union) ─────────────────────
  const prePopResult = useMemo(() => {
    if (seedOverride) {
      // Synthesize the union variant from the seed config.
      if (seedOverride.error) {
        return {
          error: seedOverride.error,
          missingFields: seedOverride.missingFields ?? [],
          path: null,
        };
      }
      return {
        path: seedOverride.path,
        inputs: seedOverride.inputs ?? {},
        _prePopSources: seedOverride._prePopSources ?? {},
        _legacyCurrentValueDetected: seedOverride._legacyCurrentValueDetected ?? false,
        _legacyValue: seedOverride._legacyValue ?? null,
        _frozenRoutingApplied: seedOverride._frozenRoutingApplied ?? false,
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
    setPVAAssetFlags(selectedAssetId, {
      _legacyCurrentValueDetected: prePopResult._legacyCurrentValueDetected,
      _legacyValue: prePopResult._legacyValue,
      _frozenRoutingApplied: prePopResult._frozenRoutingApplied,
    });
  }, [
    selectedAssetId,
    prePopResult,
    setPVAAssetInputs,
    setPVAAssetPrePopSources,
    setPVAAssetFlags,
  ]);

  // ─── Path resolution (§7.2 R1/R2 layered over pre-pop default) ────────
  const inputs = assetState?.inputs ?? null;
  const resolvedPath = useMemo(() => {
    if (!prePopResult || prePopResult.error) return null;
    const planType = inputs?.planType;
    if (planType && FLAG_ONLY_PLAN_TYPES.has(planType)) return 'flag_only';
    if (planType === 'private_db_cash_balance') return 'cash_balance';
    // Tier override applies only when pre-pop returned a tier path (R4/R5).
    if (
      inputs?.tierOverride &&
      (prePopResult.path === 'tier_1' || prePopResult.path === 'tier_3' || prePopResult.path === 'tier_2')
    ) {
      return inputs.tierOverride;
    }
    return prePopResult.path;
  }, [prePopResult, inputs?.planType, inputs?.tierOverride]);

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
        _legacyCurrentValueDetected: assetState?._legacyCurrentValueDetected ?? false,
        _legacyValue: assetState?._legacyValue ?? null,
        _frozenRoutingApplied: assetState?._frozenRoutingApplied ?? false,
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
    assetState?._legacyCurrentValueDetected,
    assetState?._legacyValue,
    assetState?._frozenRoutingApplied,
  ]);

  // ─── Persist results ──────────────────────────────────────────────────
  useEffect(() => {
    if (!selectedAssetId || !results) return;
    setPVAAssetResults(selectedAssetId, results);
  }, [selectedAssetId, results, setPVAAssetResults]);

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

      {/* Variant 3: normal pre-pop  →  InputsPanel + ResultsPanel */}
      {prePopResult && !prePopResult.error && selectedAssetId && (
        <div style={{ marginTop: '1rem' }}>
          <InputsPanel
            assetId={selectedAssetId}
            path={resolvedPath}
            frozenRoutingApplied={prePopResult._frozenRoutingApplied ?? false}
          />
          <ResultsPanel
            results={results}
            flags={{
              _legacyCurrentValueDetected: assetState?._legacyCurrentValueDetected ?? false,
              _legacyValue: assetState?._legacyValue ?? null,
              _frozenRoutingApplied: assetState?._frozenRoutingApplied ?? false,
            }}
          />
        </div>
      )}
    </div>
  );
}
