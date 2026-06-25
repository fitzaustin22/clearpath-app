'use client';

// Module 3 progress adapter — the store-binding half of the ModuleLanding
// contract. M3's "complete" semantics are richer than M2's single scalar pct:
// per-worksheet booleans and nested store slices. The shared ModuleLanding /
// deriveModuleJourney never see a store; this is where M3's completion rules and
// pct buckets live. Two layers, mirroring m2Landing.adapter:
//   - m3NormalizeProgress(raw): PURE, unit-tested. Owns M3's BADGE definition of
//     "complete" (the user-visible state, which for budget/affidavit diverges from
//     the stepper's store .completed flag) and the coarse pct buckets.
//   - useM3Progress(): the thin hook that reads the exact useM3Store slices the
//     prior M3ModulePage read and feeds m3NormalizeProgress.

import { useM3Store } from '@/src/stores/m3Store';

// True if any expense column has a positive value. Lifted verbatim from the old
// M3ModulePage badge logic so the reskin doesn't change what counts as "started".
function hasBudgetColumnData(column) {
  return Object.values(column || {}).some((category) =>
    Object.values(category || {}).some((v) => v > 0),
  );
}

function entry(id, status, pct) {
  return { id, status, pct };
}

// ── Per-worksheet badge rules (the user-visible completion state) ──────────────
//
// Pay stub:  badge == stepper — the store `completed` flag.
// Budget:    badge = results !== null (NOT budgetModeler.completed).
// Affidavit: badge = all four progress.*Complete flags (NOT affidavitBuilder.completed).
//
// The two divergences (budget, affidavit) are why we read the badge, not the
// stepper. pct is a sanctioned coarse bucket — synthetic for M3.

function payStubEntry(slice) {
  const completed = !!slice?.completed;
  const inputs = slice?.inputs || {};
  const inputted = inputs.payFrequency !== null || inputs.grossPayPerCheck !== null;
  if (completed) return entry('payStubDecoder', 'complete', 100);
  if (inputted) return entry('payStubDecoder', 'in_progress', 50);
  return entry('payStubDecoder', 'not_started', 0);
}

function budgetEntry(slice) {
  const resultsPresent = slice?.results != null;
  const hasData =
    hasBudgetColumnData(slice?.current) || hasBudgetColumnData(slice?.projected);
  if (resultsPresent) return entry('budgetModeler', 'complete', 100);
  if (hasData) return entry('budgetModeler', 'in_progress', 50);
  return entry('budgetModeler', 'not_started', 0);
}

function affidavitEntry(slice) {
  const p = slice?.progress || {};
  const flags = [
    p.incomeComplete,
    p.expensesComplete,
    p.assetsComplete,
    p.liabilitiesComplete,
  ];
  const count = flags.filter(Boolean).length;
  const s = slice?.sections || {};
  const hasData =
    (s.income?.netMonthlyIncomeAllSources || 0) > 0 ||
    (s.expenses?.totalMonthlyExpenses || 0) > 0 ||
    !!s.assets?.loaded ||
    !!s.liabilities?.loaded;

  if (count === 4) return entry('affidavitBuilder', 'complete', 100);
  if (count > 0 || hasData)
    return entry('affidavitBuilder', 'in_progress', count * 25);
  return entry('affidavitBuilder', 'not_started', 0);
}

/**
 * @param {{payStubDecoder:object, budgetModeler:object, affidavitBuilder:object}} raw
 *        the three real useM3Store slices.
 * @returns {Array<{id:string, status:'not_started'|'in_progress'|'complete', pct:number}>}
 *        one entry per worksheet, in journey order (matches M3_LANDING.worksheets).
 */
export function m3NormalizeProgress(raw) {
  return [
    payStubEntry(raw?.payStubDecoder),
    budgetEntry(raw?.budgetModeler),
    affidavitEntry(raw?.affidavitBuilder),
  ];
}

/**
 * Thin store binding: reads the three real useM3Store slices (the same selectors
 * the prior M3ModulePage used) and returns the normalized array ModuleLanding
 * consumes.
 * @returns {Array<{id:string, status:string, pct:number}>}
 */
export function useM3Progress() {
  const payStubDecoder = useM3Store((s) => s.payStubDecoder);
  const budgetModeler = useM3Store((s) => s.budgetModeler);
  const affidavitBuilder = useM3Store((s) => s.affidavitBuilder);

  return m3NormalizeProgress({ payStubDecoder, budgetModeler, affidavitBuilder });
}
