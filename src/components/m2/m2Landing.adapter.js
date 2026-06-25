'use client';

// Module 2 progress adapter — the store-binding half of the ModuleLanding
// contract. This is where M2's store heterogeneity and per-worksheet "complete"
// thresholds live; the shared ModuleLanding / deriveModuleJourney never see a
// store. Two layers:
//   - m2NormalizeProgress(raw): PURE, unit-tested. Applies M2's thresholds
//     (===100 / >90 / >80, preserved verbatim from the old M2ModulePage) to map
//     raw per-worksheet percentages into the normalized [{id,status,pct}] array.
//   - useM2Progress(): the thin hook that reads the real useM2Store selectors and
//     feeds m2NormalizeProgress.

import { useM2Store } from '@/src/stores/m2Store';

const clampPct = (n) => Math.max(0, Math.min(100, Number(n) || 0));

// "Complete" thresholds preserved verbatim from the prior M2ModulePage so the
// reskin doesn't change what counts as a finished worksheet.
function isComplete(id, pct) {
  if (id === 'documentChecklist') return pct >= 100;
  if (id === 'maritalEstateInventory') return pct > 90;
  if (id === 'personalPropertyInventory') return pct > 80;
  return false;
}

function statusOf(id, pct) {
  if (isComplete(id, pct)) return 'complete';
  if (pct > 0) return 'in_progress';
  return 'not_started';
}

// Order matches M2_LANDING.worksheets (the journey order).
const M2_WORKSHEET_IDS = [
  'documentChecklist',
  'maritalEstateInventory',
  'personalPropertyInventory',
];

/**
 * @param {{documentChecklist?:number, maritalEstateInventory?:number, personalPropertyInventory?:number}} raw
 *        per-worksheet completion percentages (0-100) sourced from useM2Store.
 * @returns {Array<{id:string, status:'not_started'|'in_progress'|'complete', pct:number}>}
 */
export function m2NormalizeProgress(raw) {
  return M2_WORKSHEET_IDS.map((id) => {
    const pct = clampPct(raw?.[id]);
    return { id, status: statusOf(id, pct), pct };
  });
}

/**
 * Thin store binding: reads the three real useM2Store progress selectors and
 * returns the normalized array the ModuleLanding consumes.
 * @returns {Array<{id:string, status:string, pct:number}>}
 */
export function useM2Progress() {
  const docProgress = useM2Store((s) => s.documentChecklist.overallProgress);
  const meiProgress = useM2Store((s) => s.maritalEstateInventory.completenessScore);
  const ppiProgress = useM2Store((s) => s.personalPropertyInventory.inventoryCompleteness);

  return m2NormalizeProgress({
    documentChecklist: docProgress,
    maritalEstateInventory: meiProgress,
    personalPropertyInventory: ppiProgress,
  });
}
