'use client';

/**
 * HomeDecisionAnalyzer — top-level HDA orchestrator (§9.4.1 / §9.8 / §10.6).
 *
 * Mirrors the PVA.jsx orchestration shape: cross-store wiring lives in the
 * component body via useMemo/useEffect, NOT in m5Store (the HDA slice keeps
 * its pure-setter contract). Store reads use primitive selectors (LL-9);
 * the freshness gate uses an imperative getState() read.
 *
 * Pipeline:
 *   upstream snapshots ─▶ prePopulateHomeDecisionInputs
 *                       ─▶ setHomeDecisionInputs (partial-merge) + setHomeDecisionPrePopSources   [one-shot]
 *   m5Store.inputs      ─▶ calculateHomeDecision (reactive useMemo, try/catch → null soft-state)
 *                       ─▶ setHomeDecisionResults + setHomeDecisionMetadata
 *   Save button         ─▶ useBlueprintStore.updateHomeDecision  (NOT auto-on-calc)
 *
 * Fitz resolutions applied:
 *   #1 Blueprint write fires only on the Save action (partial/complete per §10.6).
 *   #2 Scenarios stay object-shaped through calc/store; transformed to the
 *      ordered [keepAndRefi, sellNow, deferredSale] array ONLY at the
 *      updateHomeDecision boundary (§10.6 ScenarioOutput[] typed contract).
 *   #3 metadata._prePopSources keeps prePopulate's {source,timestamp} shape.
 *   #4 interimCostSharePct converted ×0.01 (store 0–100 → lib fraction) ONLY
 *      at the calc boundary; m5Store/prePopulate untouched.
 *   #5 One-shot pre-pop sentinel: homeDecision._prePopSources == null.
 */

import { useEffect, useMemo, useState } from 'react';
import { useM1Store } from '@/src/stores/m1Store';
import { useM2Store } from '@/src/stores/m2Store';
import { useM3Store } from '@/src/stores/m3Store';
import { useM5Store } from '@/src/stores/m5Store';
import useBlueprintStore from '@/src/stores/blueprintStore';
import { prePopulateHomeDecisionInputs } from '@/src/stores/prePopulate';
import { calculateHomeDecision } from '@/src/lib/homeDecision';
import HomeDecisionComparator from './HomeDecisionComparator.jsx';

const SCENARIO_ORDER = ['keepAndRefi', 'sellNow', 'deferredSale'];

export default function HomeDecisionAnalyzer() {
  // ─── m5Store HDA slice (primitive selectors per LL-9) ───────────────────
  const inputs = useM5Store((s) => s.homeDecision.inputs);
  const userSelection = useM5Store((s) => s.homeDecision.userSelection);
  const setHomeDecisionInputs = useM5Store((s) => s.setHomeDecisionInputs);
  const setHomeDecisionResults = useM5Store((s) => s.setHomeDecisionResults);
  const setHomeDecisionMetadata = useM5Store((s) => s.setHomeDecisionMetadata);
  const setHomeDecisionUserSelection = useM5Store((s) => s.setHomeDecisionUserSelection);
  const setHomeDecisionPrePopSources = useM5Store((s) => s.setHomeDecisionPrePopSources);

  // ─── Upstream snapshots for prePopulateHomeDecisionInputs (LL-9: select
  //     the specific nested values, assemble the DI-shaped snapshot) ───────
  const m1AdjustedIncome = useM1Store(
    (s) => s.budgetGap?.results?.adjustedMonthlyIncome ?? null,
  );
  const m2Items = useM2Store((s) => s.maritalEstateInventory?.items);
  const m3BudgetModeler = useM3Store((s) => s.budgetModeler);
  const blueprintFilingStatus = useBlueprintStore((s) => s.costBasisFilingStatus);
  const costBasisEntries = useBlueprintStore((s) => s.costBasisEntries);

  const upstream = useMemo(
    () => ({
      m1Store: { budgetGap: { results: { adjustedMonthlyIncome: m1AdjustedIncome } } },
      m2Store: { maritalEstateInventory: { items: m2Items ?? [] } },
      m3Store: { budgetModeler: m3BudgetModeler ?? null },
      blueprintStore: { costBasisFilingStatus: blueprintFilingStatus ?? null },
    }),
    [m1AdjustedIncome, m2Items, m3BudgetModeler, blueprintFilingStatus],
  );

  const prePop = useMemo(
    () => prePopulateHomeDecisionInputs(upstream),
    [upstream],
  );

  // ─── One-shot pre-pop (sentinel: _prePopSources == null, resolution #5) ──
  useEffect(() => {
    // Once _prePopSources is set the user may have edited inputs; never
    // re-seed (PVA §7.3.7 freshness gate, adapted to the single-slice shape).
    if (useM5Store.getState().homeDecision._prePopSources != null) return;
    // prePopulateHomeDecisionInputs returns a PARTIAL inputs subset (only the
    // sourced fields), so partial-merge preserves makeInitialHomeDecision
    // defaults — NOT replaceHomeDecisionInputs (which would wipe them).
    setHomeDecisionInputs(prePop.inputs);
    setHomeDecisionPrePopSources(prePop._prePopSources);
  }, [prePop, setHomeDecisionInputs, setHomeDecisionPrePopSources]);

  // ─── Reactive calc (PVA pattern: try/catch → null soft-state) ───────────
  const calc = useMemo(() => {
    if (!inputs) return null;
    const interim =
      inputs.interimCostSharePct == null ? 0.5 : inputs.interimCostSharePct * 0.01;
    const primaryResidence = (costBasisEntries ?? []).find(
      (e) => e?.isPrimaryResidence,
    );
    const calcInputs = {
      ...inputs,
      interimCostSharePct: interim,
      costBasis: primaryResidence?.costBasis ?? 0,
      costBasisFilingStatus: blueprintFilingStatus ?? null,
      currentYear: new Date().getFullYear(),
    };
    try {
      return calculateHomeDecision(calcInputs, {
        stressTest: !!inputs.stressTestUserPays100Pct,
      });
    } catch {
      return null;
    }
  }, [inputs, costBasisEntries, blueprintFilingStatus]);

  // ─── Persist calc to m5Store (scenarios stay object-shaped, resolution #2) ─
  useEffect(() => {
    if (!calc) return;
    setHomeDecisionResults(calc.scenarios);
    // calculateHomeDecision hardcodes metadata._prePopSources: {} — PR 3
    // overlays the real provenance (resolution #3: keep prePopulate's
    // {source,timestamp} shape verbatim, no §14.1 reshaping here).
    const prePopSources =
      useM5Store.getState().homeDecision._prePopSources ?? {};
    setHomeDecisionMetadata({ ...calc.metadata, _prePopSources: prePopSources });
  }, [calc, setHomeDecisionResults, setHomeDecisionMetadata]);

  // ─── Save → Blueprint §9 (Save-button only, resolution #1) ──────────────
  const [saveState, setSaveState] = useState(null);

  const handleSave = () => {
    if (!calc) return;
    // Resolution #2: object → ordered array at the §10.6 boundary only.
    const scenariosArray = SCENARIO_ORDER.map((id) => calc.scenarios[id]);
    const sel = useM5Store.getState().homeDecision.userSelection ?? null;
    const prePopSources =
      useM5Store.getState().homeDecision._prePopSources ?? {};
    const result = useBlueprintStore.getState().updateHomeDecision({
      scenarios: scenariosArray,
      userSelection: sel,
      selectionTimestamp: sel != null ? new Date().toISOString() : null,
      metadata: { ...calc.metadata, _prePopSources: prePopSources },
    });
    setSaveState(result);
  };

  const handleSelect = (idOrNull) => setHomeDecisionUserSelection(idOrNull);
  const handleInputChange = (field, value) =>
    setHomeDecisionInputs({ [field]: value });

  return (
    <HomeDecisionComparator
      inputs={inputs}
      onInputChange={handleInputChange}
      scenarios={calc?.scenarios ?? null}
      userSelection={userSelection}
      onSelectScenario={handleSelect}
      onSave={handleSave}
      saveState={saveState}
    />
  );
}
