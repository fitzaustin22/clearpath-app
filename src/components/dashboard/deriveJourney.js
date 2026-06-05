// Pure derivation of the dashboard "Path to Clarity" journey from the REAL
// blueprintStore sections + the user's tier. No stored "current module" flag
// exists, so the per-station done/current/todo state, the gold-trail length, the
// next-step CTA, and the Blueprint progress are all DERIVED here — keeping the
// screen truthful to real state rather than a mock array.
//
// MODULE -> GATING SECTIONS. Each station is gated only by the Blueprint sections
// it SOLELY owns. The two multi-source sections — s5 (Property Division, m2+m4)
// and s6 (Retirement Plan Division, m4/m5) — are jointly owned and deliberately
// do NOT gate any single station's done-state; otherwise M2's completion would
// couple to M4's tax work. They still count toward overall Blueprint progress
// (the "N of 12" figure is over all 12 sections, not the gating subset).
//
// STATUS RULE (product-confirmed):
//  - A module is "done" iff every gating section is 'complete'. This is
//    position-independent: a module that is complete but sits past the current
//    gap still renders as a done (gold) node — honest, non-contiguous progress.
//  - currentIndex = the first module that is NOT done AND the user's tier can
//    ACCESS. A tier-locked module is never selected as "current".
//  - The gold solid trail runs nodes 0..currentIndex (normal), or — in the
//    terminal state — through all accessible-done nodes.
//  - TERMINAL state: no accessible-incomplete module remains. This is reached
//    normally by every tier (Free after M1, Essentials after M3, Navigator at
//    100%), so it is a defined render, not an error: there is no "current" pin,
//    and the next-step card reuses the app's EXISTING upgrade affordance pointing
//    at the first locked module (-> /upgrade); a fully-complete Navigator (no
//    locked module left) gets a quiet pointer to the Blueprint instead.
//
// INVARIANT (documented, not enforced by a throw to avoid crashing the live
// dashboard): tier access is a contiguous prefix m1..mk, because module required
// tiers are monotonically non-decreasing (free, essentials x2, navigator x4).
// A locked module therefore never precedes an accessible one, so the linear path
// can always represent the topology. currentIndex derivation stays correct even
// if that ever changed (it simply picks the first accessible-incomplete module).

import { hasAccess } from '@/src/lib/plans';

export const TOTAL_BLUEPRINT_SECTIONS = 12;

// Static journey config. Titles match the real curriculum module list (the
// dashboard MODULES array); blurbs are the design handoff's station
// descriptions. `gating` = the single-source Blueprint section keys that gate
// this module's done-state.
export const JOURNEY = [
  { n: 1, key: 'm1', title: 'Permission to Explore',          tier: 'free',       blurb: 'Your story, your goals, your ground rules.',     gating: ['s1'] },
  { n: 2, key: 'm2', title: 'Know What You Own',              tier: 'essentials', blurb: 'Every asset and debt, gathered in one place.',   gating: ['s3'] },
  { n: 3, key: 'm3', title: 'Know What You Spend',            tier: 'essentials', blurb: 'Your monthly picture — married and single.',     gating: ['s2', 's7'] },
  { n: 4, key: 'm4', title: 'Tax Landscape',                 tier: 'navigator',  blurb: 'How filing status and basis change the math.',   gating: ['s4'] },
  { n: 5, key: 'm5', title: 'Value What Matters',            tier: 'navigator',  blurb: 'Weigh trade-offs against what you care about.',  gating: ['s8', 's9'] },
  { n: 6, key: 'm6', title: 'Negotiate from Strength',       tier: 'navigator',  blurb: 'Model settlements and walk in prepared.',        gating: ['s10', 's11'] },
  { n: 7, key: 'm7', title: 'ClearPath Financial Blueprint', tier: 'navigator',  blurb: 'Assemble and export your Blueprint.',  gating: ['s12'] },
];

function moduleIsDone(mod, sections) {
  return mod.gating.every((sk) => sections?.[sk]?.status === 'complete');
}

function countCompleteSections(sections) {
  if (!sections) return 0;
  return Object.values(sections).filter((s) => s?.status === 'complete').length;
}

/**
 * Derive the journey view-model the dashboard renders.
 *
 * @param {object}  params
 * @param {object}  params.sections        blueprintStore.sections (s1..s12)
 * @param {string}  [params.userTier]      'free' | 'essentials' | 'navigator' | 'signature'
 * @param {boolean} [params.hydrated=true] false -> render the empty (pre-hydration) state
 * @returns {{modules: object[], currentIndex: number|null, doneTrailEndIndex: number,
 *            terminal: boolean, terminalKind: ('complete'|'locked'|null), nextStep: object,
 *            blueprint: {done:number,total:number,percent:number}}}
 */
export function deriveJourney({ sections, userTier = 'free', hydrated = true }) {
  const safeSections = hydrated ? (sections || {}) : {};

  const base = JOURNEY.map((mod) => ({
    ...mod,
    done: hydrated ? moduleIsDone(mod, safeSections) : false,
    accessible: hasAccess(userTier, mod.tier),
  }));

  const currentIndex = base.findIndex((m) => !m.done && m.accessible);
  const terminal = currentIndex === -1;
  const lastAccessibleIndex = base.reduce((acc, m, i) => (m.accessible ? i : acc), -1);
  const firstLockedIndex = base.findIndex((m) => !m.accessible);

  // Clean terminal-state discriminator for downstream copy (deriveCopy consumes
  // this rather than re-deriving): 'complete' = every module done (Navigator,
  // nothing locked); 'locked' = all accessible done but locked modules remain
  // (Free@M1, Essentials@M3); null = a normal in-progress journey.
  const terminalKind = terminal ? (firstLockedIndex === -1 ? 'complete' : 'locked') : null;

  const modules = base.map((m, i) => ({
    ...m,
    locked: !m.accessible,
    status: i === currentIndex ? 'current' : m.done ? 'done' : 'todo',
    // Tier-locked stations route to the upgrade entry point, never to a gated
    // module route (no dead links); accessible stations go to the module.
    href: m.accessible ? `/modules/${m.key}` : '/upgrade',
  }));

  // Gold solid trail end: the current node, or (terminal) the last accessible node.
  const doneTrailEndIndex = terminal ? lastAccessibleIndex : currentIndex;

  let nextStep;
  if (!terminal) {
    const m = modules[currentIndex];
    nextStep = { kind: 'continue', title: `Module ${m.n} · ${m.title}`, blurb: m.blurb, ctaLabel: 'Continue', href: m.href };
  } else if (firstLockedIndex !== -1) {
    const m = modules[firstLockedIndex];
    // Reuse the existing upgrade entry point; calm, non-urgent copy (the CTA
    // verb mirrors today's "Upgrade to unlock" affordance).
    nextStep = { kind: 'upgrade', title: `Module ${m.n} · ${m.title}`, blurb: m.blurb, ctaLabel: 'Upgrade to unlock', href: '/upgrade' };
  } else {
    // Fully-complete Navigator: nothing to sell. Quiet pointer to the Blueprint.
    nextStep = { kind: 'blueprintComplete', title: 'Your Blueprint is ready', blurb: 'Every module is complete — review and export your Blueprint.', ctaLabel: 'View your Blueprint', href: '/blueprint' };
  }

  const done = countCompleteSections(safeSections);
  const percent = Math.round((done / TOTAL_BLUEPRINT_SECTIONS) * 100);

  return {
    modules,
    currentIndex: terminal ? null : currentIndex,
    doneTrailEndIndex,
    terminal,
    terminalKind,
    nextStep,
    blueprint: { done, total: TOTAL_BLUEPRINT_SECTIONS, percent },
  };
}
