// Generalized pure view-model for any module-landing "journey spine" (Primary —
// sidebar + journey spine). Rewritten from the M2-specific deriveModule2Journey:
// it takes the module's STATIC worksheet copy plus a NORMALIZED progress array
// ({id, status, pct}) produced by that module's adapter, and turns it into the
// per-step render states (node style, status pill, CTA variant, pulse, spine
// fraction) for ANY number of worksheets. No React, no store access, no
// per-module thresholds here — those live in each module's adapter. Pure and
// unit-tested so the wiring contract is locked.

import { hasAccess } from '@/src/lib/plans';

const clampPct = (n) => Math.max(0, Math.min(100, Number(n) || 0));

// Shapes live in ./types (single source of truth); imported here for the JSDoc
// @param references below.
/**
 * @typedef {import('./types').ModuleLandingWorksheet} ModuleLandingWorksheet
 * @typedef {import('./types').ProgressEntry} ProgressEntry
 */

/**
 * @param {object} args
 * @param {ModuleLandingWorksheet[]} args.worksheets  static copy, in journey order.
 * @param {ProgressEntry[]} args.progress  normalized per-worksheet progress (one
 *        entry per worksheet, matched to worksheets by id). Heterogeneous store
 *        shape + per-worksheet "complete" thresholds are resolved upstream by the
 *        module's adapter; this function never sees a store.
 * @param {boolean} [args.hydrated=true] when false (SSR / pre-rehydration) every
 *        worksheet is treated as not_started so server and first client render match.
 * @returns {{steps: Array, spineGoldPct: number}}
 */
export function deriveModuleJourney({ worksheets, progress, hydrated = true }) {
  const byId = new Map((progress || []).map((p) => [p.id, p]));

  const raw = worksheets.map((w) => {
    const entry = byId.get(w.id) || {};
    const status = hydrated ? entry.status || 'not_started' : 'not_started';
    const pct = hydrated ? clampPct(entry.pct) : 0;
    return { w, status, pct };
  });

  // The "recommended next step" is the first worksheet that isn't finished. It,
  // plus any in-progress worksheet, gets the gold (primary) emphasis; everything
  // else is muted/outline. Reproduces the M2 reference shot (step 1 + step 2 gold,
  // step 3 outline) and generalises to any N.
  const firstNonComplete = raw.findIndex((s) => s.status !== 'complete');

  const steps = raw.map((s, i) => {
    const isPrimary = s.status === 'in_progress' || i === firstNonComplete;

    let node;
    if (s.status === 'complete') node = 'complete';
    else if (s.status === 'in_progress') node = 'active';
    else node = isPrimary ? 'next' : 'muted';

    let ctaLabel;
    if (s.status === 'complete') ctaLabel = 'Review';
    else if (s.status === 'in_progress') ctaLabel = 'Continue';
    else ctaLabel = s.w.ctaCopy;

    return {
      key: s.w.id,
      step: i + 1,
      eyebrow: s.w.stepLabel,
      title: s.w.title,
      description: s.w.description,
      href: s.w.route,
      status: s.status,
      progress: s.pct,
      node,
      pulse: s.status === 'in_progress',
      ctaVariant: isPrimary ? 'primary' : 'secondary',
      ctaLabel,
    };
  });

  // Spine gold fill = fraction of the whole journey done: each complete step is a
  // full 1/N, an in-progress step contributes its own percentage. Divides by the
  // real worksheet count (N), not a hardcoded 3.
  const completeCount = raw.filter((s) => s.status === 'complete').length;
  const inProgressSum = raw
    .filter((s) => s.status === 'in_progress')
    .reduce((acc, s) => acc + s.pct / 100, 0);
  const spineGoldPct = raw.length
    ? Math.round(((completeCount + inProgressSum) / raw.length) * 100)
    : 0;

  return { steps, spineGoldPct };
}

// Show the upgrade promo to everyone below the module's tier gate. Reuses
// plans.hasAccess — does not re-implement tier logic. A null/empty gate (e.g. the
// free M1 module) never shows a promo.
export function shouldShowUpgrade(userTier, tierGate) {
  if (!tierGate) return false;
  return !hasAccess(userTier, tierGate);
}

// Count of complete Blueprint sections (0-12) from the blueprintStore `sections`
// object. Null-safe for the pre-hydration render.
export function countBlueprintComplete(sections) {
  if (!sections) return 0;
  return Object.values(sections).filter((s) => s && s.status === 'complete')
    .length;
}
