'use client';

/**
 * PVA orchestrator — top-level Pension Valuation Analyzer component.
 *
 * v3 reskin: adds page header, segmented "Inputs / Results" toggle, and
 * 640px content column. Both InputsPanel and ResultsPanel are always in the
 * DOM in Variant 3 — toggled via display:none so TC-PVA-Orchestrator-5
 * (expects pva-inputs-panel + pva-bignumber-headline simultaneously) passes.
 *
 * All engine logic, path resolution (R1–R6), pre-pop seam, Blueprint writes,
 * and discriminated-union branches are FROZEN — pixels only.
 *
 * Owns the §7.10.3 discriminated-union consumption per LL-17. Three variants:
 *   1. null                                  → "claim not found" surface
 *   2. {error, missingFields}                → <ValidationErrorPanel/>
 *   3. {inputs, _prePopSources}              → <InputsPanel/> + <ResultsPanel/>
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
  // ─── View toggle (v3) ─────────────────────────────────────────────────────
  const [view, setView] = useState('inputs');

  // ─── Asset selection ──────────────────────────────────────────────────────
  const [selectedAssetId, setSelectedAssetId] = useState(seedOverride?.assetId ?? null);

  // ─── Store reads (primitive selectors per LL-9) ───────────────────────────
  const m2Items = useM2Store((s) => s.maritalEstateInventory?.items);
  const assetState = useM5Store(
    (s) => s.pensionValuation?.assets?.[selectedAssetId ?? '__none__'],
  );
  const setPVAAssetInputs = useM5Store((s) => s.setPVAAssetInputs);
  const setPVAAssetPrePopSources = useM5Store((s) => s.setPVAAssetPrePopSources);
  const setPVAAssetResults = useM5Store((s) => s.setPVAAssetResults);
  const updatePensionValuation = useBlueprintStore((s) => s.updatePensionValuation);

  const m2StoreSnapshot = useMemo(
    () => ({ maritalEstateInventory: { items: m2Items ?? [] } }),
    [m2Items],
  );

  // ─── Pre-pop result (§7.10.3 discriminated union; §7.2 v2 shape) ──────────
  const prePopResult = useMemo(() => {
    if (seedOverride) {
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

  // ─── One-shot pre-pop persistence (§7.3.7 freshness gate) ─────────────────
  useEffect(() => {
    if (!selectedAssetId || !prePopResult) return;
    if (prePopResult.error) return;
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

  // ─── Path resolution (§7.2 v2 R1–R6, all reactive) ──────────────────────
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

  const frozenRoutingApplied = inputs?.accrualStatus === 'frozen';

  // ─── Engine call ──────────────────────────────────────────────────────────
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
      return null;
    }
  }, [
    selectedAssetId,
    inputs,
    resolvedPath,
    prePopResult,
    frozenRoutingApplied,
  ]);

  // ─── Persist results ──────────────────────────────────────────────────────
  useEffect(() => {
    if (!selectedAssetId || !results) return;
    setPVAAssetResults(selectedAssetId, results);
  }, [selectedAssetId, results, setPVAAssetResults]);

  // ─── Sync results to Blueprint §6 ────────────────────────────────────────
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

  // ─── Selected asset label (Variant 3 only) ────────────────────────────────
  const selectedItem = selectedAssetId && !seedOverride
    ? (m2Items ?? []).find((it) => it.id === selectedAssetId)
    : null;

  // ─── Render (LL-17 explicit branches) ────────────────────────────────────
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

      {/* Variant 1: no claim */}
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
          No pension claim found for the selected asset. Verify the M2 entry&apos;s
          category is &ldquo;pensions&rdquo;.
        </div>
      )}

      {/* Variant 2: validation error */}
      {prePopResult?.error && <ValidationErrorPanel error={prePopResult} />}

      {/* Variant 3: normal pre-pop */}
      {prePopResult && !prePopResult.error && selectedAssetId && assetState?.inputs && (
        <div style={{ marginTop: '1rem', maxWidth: 640 }}>
          {/* Page header */}
          <div style={{ marginBottom: 20 }}>
            <div
              style={{
                fontSize: 11,
                fontWeight: 700,
                textTransform: 'uppercase',
                letterSpacing: '.9px',
                color: T.PILL_TEXT,
                marginBottom: 6,
              }}
            >
              Pension Valuation Analyzer
            </div>
            <h2
              style={{
                fontFamily: T.FONT_NUMERIC,
                fontSize: 31,
                fontWeight: 500,
                color: T.NAVY,
                margin: '0 0 6px 0',
                lineHeight: 1.15,
              }}
            >
              Estimate the present value of this pension
            </h2>
            {selectedItem?.planName && (
              <p
                style={{
                  fontFamily: T.FONT_BODY,
                  fontSize: 16,
                  color: T.INK_2,
                  margin: 0,
                  lineHeight: 1.5,
                }}
              >
                {selectedItem.planName}
              </p>
            )}
          </div>

          {/* Segmented toggle */}
          <div
            style={{
              display: 'inline-flex',
              background: T.PARCHMENT_DEEP,
              border: `1px solid ${T.LINE_STRONG}`,
              borderRadius: 999,
              padding: 3,
              marginBottom: 20,
            }}
          >
            {['inputs', 'results'].map((tab) => (
              <button
                key={tab}
                type="button"
                onClick={() => setView(tab)}
                style={{
                  fontFamily: T.FONT_BODY,
                  fontSize: 14,
                  fontWeight: 600,
                  color: view === tab ? T.NAVY : T.NAVY_55,
                  background: view === tab ? T.CARD : 'transparent',
                  border: 'none',
                  borderRadius: 999,
                  padding: '8px 20px',
                  cursor: 'pointer',
                  boxShadow: view === tab ? '0 1px 3px rgba(27,42,74,.10)' : 'none',
                  transition: 'all .15s ease',
                  textTransform: 'capitalize',
                }}
              >
                {tab}
              </button>
            ))}
          </div>

          {/* Both panels always in DOM — view toggle via display:none
              so TC-PVA-Orchestrator-5 finds pva-inputs-panel +
              pva-bignumber-headline simultaneously. */}
          <div style={{ display: view === 'inputs' ? 'block' : 'none' }}>
            <InputsPanel
              assetId={selectedAssetId}
              path={resolvedPath}
              frozenRoutingApplied={frozenRoutingApplied}
              onCalculate={() => setView('results')}
            />
          </div>
          <div style={{ display: view === 'results' ? 'block' : 'none' }}>
            <ResultsPanel
              results={results}
              flags={{ _frozenRoutingApplied: frozenRoutingApplied }}
              onChangeInputs={() => setView('inputs')}
            />
          </div>
        </div>
      )}
    </div>
  );
}
