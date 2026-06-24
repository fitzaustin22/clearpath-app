// Pure view-model for the Module 2 "Know What You Own" landing page (Primary —
// sidebar + journey spine). Mirrors the dashboard's deriveJourney pattern: the
// client island reads the real stores, this turns the raw numbers into the
// journey/blueprint/upgrade view model. No React, no store access here — pure
// and unit-tested so the wiring contract is locked.

import { hasAccess } from '@/src/lib/plans';

// The three worksheets, in journey order. Routes + copy match the design and the
// existing worksheet routes under /modules/m2.
export const WORKSHEETS = [
  {
    key: 'documentChecklist',
    step: 1,
    eyebrow: 'Step 1 · Gather documents',
    title: 'Documentation Checklist',
    description:
      'Track every document you need — tax returns, account statements, deeds, and more.',
    href: '/modules/m2/checklist',
    startLabel: 'Start checklist',
  },
  {
    key: 'maritalEstateInventory',
    step: 2,
    eyebrow: 'Step 2 · Build inventory',
    title: 'Marital Estate Inventory',
    description:
      'Map every asset and debt, classify them, and see the full picture of your marital estate.',
    href: '/modules/m2/inventory',
    startLabel: 'Start inventory',
  },
  {
    key: 'personalPropertyInventory',
    step: 3,
    eyebrow: 'Step 3 · Personal property',
    title: 'Personal Property Inventory',
    description: "Go room by room through your household and catalog what's there.",
    href: '/modules/m2/personal-property',
    startLabel: 'Start inventory',
  },
];

const clampPct = (n) => Math.max(0, Math.min(100, Number(n) || 0));

// "Complete" thresholds preserved verbatim from the prior M2ModulePage so the
// reskin doesn't change what counts as a finished worksheet.
function isComplete(key, progress) {
  if (key === 'documentChecklist') return progress >= 100;
  if (key === 'maritalEstateInventory') return progress > 90;
  if (key === 'personalPropertyInventory') return progress > 80;
  return false;
}

function statusOf(key, progress) {
  if (isComplete(key, progress)) return 'complete';
  if (progress > 0) return 'in_progress';
  return 'not_started';
}

/**
 * @param {object} args
 * @param {{documentChecklist:number, maritalEstateInventory:number, personalPropertyInventory:number}} args.progress
 *        per-worksheet completion percentages (0-100) from useM2Store.
 * @param {boolean} [args.hydrated=true] when false (SSR / pre-rehydration) every
 *        worksheet is treated as not_started so server and first client render match.
 * @returns {{steps: Array, spineGoldPct: number}}
 */
export function deriveModule2Journey({ progress, hydrated = true }) {
  const raw = WORKSHEETS.map((w) => {
    const p = hydrated ? clampPct(progress?.[w.key]) : 0;
    return { ...w, progress: p, status: statusOf(w.key, p) };
  });

  // The "recommended next step" is the first worksheet that isn't finished. It,
  // plus any in-progress worksheet, gets the gold (primary) emphasis; everything
  // else is muted/outline. This reproduces the reference shot (step 1 + step 2
  // gold, step 3 outline) and generalises sensibly.
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
    else ctaLabel = s.startLabel;

    return {
      key: s.key,
      step: s.step,
      eyebrow: s.eyebrow,
      title: s.title,
      description: s.description,
      href: s.href,
      status: s.status,
      progress: s.progress,
      node,
      pulse: s.status === 'in_progress',
      ctaVariant: isPrimary ? 'primary' : 'secondary',
      ctaLabel,
    };
  });

  // Spine gold fill = fraction of the whole journey done: each complete step is a
  // full third, an in-progress step contributes its own percentage.
  const completeCount = raw.filter((s) => s.status === 'complete').length;
  const inProgressSum = raw
    .filter((s) => s.status === 'in_progress')
    .reduce((acc, s) => acc + s.progress / 100, 0);
  const spineGoldPct = Math.round(
    ((completeCount + inProgressSum) / raw.length) * 100,
  );

  return { steps, spineGoldPct };
}

// Full Access = navigator (and legacy signature). Show the upgrade promo to
// everyone below that. Reuses plans.hasAccess — does not re-implement tier logic.
export function shouldShowUpgrade(userTier) {
  return !hasAccess(userTier, 'navigator');
}

// Count of complete Blueprint sections (0-12) from the blueprintStore `sections`
// object. Null-safe for the pre-hydration render.
export function countBlueprintComplete(sections) {
  if (!sections) return 0;
  return Object.values(sections).filter((s) => s && s.status === 'complete')
    .length;
}
