import { describe, it, expect } from 'vitest';
import {
  deriveModuleJourney,
  shouldShowUpgrade,
  countBlueprintComplete,
} from './deriveModuleJourney';
import { M2_LANDING } from '@/src/components/m2/m2Landing.config';
import { m2NormalizeProgress } from '@/src/components/m2/m2Landing.adapter';

// --- M2 path: the 24 deriveModule2Journey assertions, ported verbatim (same
// expected outputs) but driven through the real M2 adapter + the generalized
// derive. If these pass, M2's journey behavior is provably unchanged. -----------

// Reproduces the old deriveModule2Journey({ progress: P(doc, mei, ppi) }) call by
// running M2's normalize adapter (which owns the ===100 / >90 / >80 thresholds)
// and feeding the normalized [{id,status,pct}] into the generalized derive.
const m2 = (doc, mei, ppi, hydrated = true) =>
  deriveModuleJourney({
    worksheets: M2_LANDING.worksheets,
    progress: m2NormalizeProgress({
      documentChecklist: doc,
      maritalEstateInventory: mei,
      personalPropertyInventory: ppi,
    }),
    hydrated,
  });

describe('M2 config content contract (matches the Primary design)', () => {
  it('is the three worksheets, in journey order, with the right routes/copy', () => {
    expect(M2_LANDING.worksheets.map((w) => w.id)).toEqual([
      'documentChecklist',
      'maritalEstateInventory',
      'personalPropertyInventory',
    ]);
    expect(M2_LANDING.worksheets.map((w) => w.title)).toEqual([
      'Documentation Checklist',
      'Marital Estate Inventory',
      'Personal Property Inventory',
    ]);
    expect(M2_LANDING.worksheets.map((w) => w.route)).toEqual([
      '/modules/m2/checklist',
      '/modules/m2/inventory',
      '/modules/m2/personal-property',
    ]);
    expect(M2_LANDING.worksheets.map((w) => w.stepLabel)).toEqual([
      'Step 1 · Gather documents',
      'Step 2 · Build inventory',
      'Step 3 · Personal property',
    ]);
  });
});

describe('M2 — status derivation (reuses existing complete thresholds)', () => {
  it('marks a worksheet not_started when progress is 0', () => {
    const { steps } = m2(0, 0, 0);
    expect(steps.map((s) => s.status)).toEqual([
      'not_started',
      'not_started',
      'not_started',
    ]);
  });

  it('marks a worksheet in_progress when progress is above 0 but below its complete threshold', () => {
    // checklist completes at ===100, MEI at >90, PPI at >80
    const { steps } = m2(50, 90, 80);
    expect(steps.map((s) => s.status)).toEqual([
      'in_progress',
      'in_progress',
      'in_progress',
    ]);
  });

  it('marks a worksheet complete at its own threshold (100 / >90 / >80)', () => {
    const { steps } = m2(100, 91, 81);
    expect(steps.map((s) => s.status)).toEqual([
      'complete',
      'complete',
      'complete',
    ]);
  });

  it('checklist is NOT complete at 99 (strict ===100 / >= 100 semantics)', () => {
    const { steps } = m2(99, 0, 0);
    expect(steps[0].status).toBe('in_progress');
  });

  it('clamps out-of-range progress into [0,100]', () => {
    const { steps } = m2(150, -20, 60);
    expect(steps[0].status).toBe('complete'); // 150 -> 100 -> complete
    expect(steps[0].progress).toBe(100);
    expect(steps[1].status).toBe('not_started'); // -20 -> 0 -> not_started
    expect(steps[1].progress).toBe(0);
    expect(steps[2].status).toBe('in_progress'); // 60 -> below PPI's >80 threshold
    expect(steps[2].progress).toBe(60);
  });
});

describe('M2 — node/pill/CTA states reproduce the reference shot', () => {
  // shot_primary.png default: checklist not started, MEI in progress 86%, PPI not started.
  const journey = m2(0, 86, 0);

  it('derives statuses [not_started, in_progress, not_started]', () => {
    expect(journey.steps.map((s) => s.status)).toEqual([
      'not_started',
      'in_progress',
      'not_started',
    ]);
  });

  it('node styles are [next (outlined gold), active (filled+pulse), muted]', () => {
    expect(journey.steps.map((s) => s.node)).toEqual(['next', 'active', 'muted']);
  });

  it('only the in_progress step pulses', () => {
    expect(journey.steps.map((s) => s.pulse)).toEqual([false, true, false]);
  });

  it('CTA variants are [primary, primary, secondary] — step 1 (recommended next) and step 2 (active) gold, step 3 outline', () => {
    expect(journey.steps.map((s) => s.ctaVariant)).toEqual([
      'primary',
      'primary',
      'secondary',
    ]);
  });

  it('CTA labels are worksheet-specific verbs / Continue', () => {
    expect(journey.steps.map((s) => s.ctaLabel)).toEqual([
      'Start checklist',
      'Continue',
      'Start inventory',
    ]);
  });

  it('exposes the in_progress percent for the worksheet progress bar', () => {
    expect(journey.steps[1].progress).toBe(86);
  });
});

describe('M2 — fresh user (all not started)', () => {
  const journey = m2(0, 0, 0);

  it('only the first step is the recommended next (gold); the rest are muted/outline', () => {
    expect(journey.steps.map((s) => s.node)).toEqual(['next', 'muted', 'muted']);
    expect(journey.steps.map((s) => s.ctaVariant)).toEqual([
      'primary',
      'secondary',
      'secondary',
    ]);
  });

  it('nothing pulses and the spine has no gold fill', () => {
    expect(journey.steps.some((s) => s.pulse)).toBe(false);
    expect(journey.spineGoldPct).toBe(0);
  });
});

describe('M2 — complete state (design gap the derive defines)', () => {
  it('a complete worksheet gets a check node, a Review CTA, and a secondary (outline) variant', () => {
    const { steps } = m2(100, 0, 0);
    expect(steps[0].status).toBe('complete');
    expect(steps[0].node).toBe('complete');
    expect(steps[0].ctaLabel).toBe('Review');
    expect(steps[0].ctaVariant).toBe('secondary');
    expect(steps[0].pulse).toBe(false);
  });

  it('the recommended-next gold moves to the first non-complete step', () => {
    // checklist complete, MEI in progress, PPI not started
    const { steps } = m2(100, 50, 0);
    expect(steps.map((s) => s.status)).toEqual([
      'complete',
      'in_progress',
      'not_started',
    ]);
    expect(steps.map((s) => s.node)).toEqual(['complete', 'active', 'muted']);
    expect(steps.map((s) => s.ctaVariant)).toEqual([
      'secondary',
      'primary',
      'secondary',
    ]);
  });

  it('when two are complete, the third not_started becomes the gold next step', () => {
    const { steps } = m2(100, 95, 0);
    expect(steps.map((s) => s.status)).toEqual([
      'complete',
      'complete',
      'not_started',
    ]);
    expect(steps[2].ctaVariant).toBe('primary');
    expect(steps[2].node).toBe('next');
  });

  it('when all complete, every CTA is Review/secondary and nothing is gold-emphasized', () => {
    const { steps } = m2(100, 100, 100);
    expect(steps.every((s) => s.status === 'complete')).toBe(true);
    expect(steps.every((s) => s.ctaVariant === 'secondary')).toBe(true);
    expect(steps.every((s) => s.ctaLabel === 'Review')).toBe(true);
  });
});

describe('M2 — spine gold fraction reflects real progress', () => {
  it('is the fraction of journey completed (complete=full third, in_progress=fractional)', () => {
    expect(m2(0, 86, 0).spineGoldPct).toBe(29); // round(0.86/3*100)
    expect(m2(100, 0, 0).spineGoldPct).toBe(33); // one of three complete
    expect(m2(100, 100, 100).spineGoldPct).toBe(100);
  });
});

describe('M2 — hydration guard (SSR safety)', () => {
  it('treats everything as not_started before hydration regardless of store values', () => {
    const journey = m2(100, 86, 81, false);
    expect(journey.steps.every((s) => s.status === 'not_started')).toBe(true);
    expect(journey.steps.some((s) => s.pulse)).toBe(false);
    expect(journey.spineGoldPct).toBe(0);
  });
});

describe('shouldShowUpgrade — tier -> gate mapping (reuses plans.hasAccess)', () => {
  it('shows the promo for free and essentials (NOT Full Access) for the navigator gate', () => {
    expect(shouldShowUpgrade('free', 'navigator')).toBe(true);
    expect(shouldShowUpgrade('essentials', 'navigator')).toBe(true);
  });

  it('hides the promo for navigator and legacy signature (Full Access)', () => {
    expect(shouldShowUpgrade('navigator', 'navigator')).toBe(false);
    expect(shouldShowUpgrade('signature', 'navigator')).toBe(false);
  });
});

describe('countBlueprintComplete — count of complete sections (0-12)', () => {
  it('counts only sections whose status is complete', () => {
    const sections = {
      s1: { status: 'complete' },
      s2: { status: 'partial' },
      s3: { status: 'complete' },
      s4: { status: 'empty' },
      s5: { status: 'complete' },
    };
    expect(countBlueprintComplete(sections)).toBe(3);
  });

  it('returns 0 for null/undefined sections (pre-hydration safety)', () => {
    expect(countBlueprintComplete(null)).toBe(0);
    expect(countBlueprintComplete(undefined)).toBe(0);
  });
});

// --- Generalization: N != 3 proves the derive is not hardcoded to three steps. --
// Synthetic configs/progress (no real module needed), so Phase 2 can trust the
// abstraction for M1 (2 worksheets) and M5 (4 worksheets) before those pages exist.

const sheet = (id) => ({
  id,
  stepLabel: `Step · ${id}`,
  title: `Title ${id}`,
  description: `Desc ${id}`,
  route: `/x/${id}`,
  ctaCopy: `Start ${id}`,
});

describe('deriveModuleJourney — N=2 (two-worksheet module, e.g. M1)', () => {
  const worksheets = [sheet('a'), sheet('b')];

  it('fresh: first is the gold next, second muted; spine empty', () => {
    const { steps, spineGoldPct } = deriveModuleJourney({
      worksheets,
      progress: [
        { id: 'a', status: 'not_started', pct: 0 },
        { id: 'b', status: 'not_started', pct: 0 },
      ],
    });
    expect(steps.map((s) => s.step)).toEqual([1, 2]);
    expect(steps.map((s) => s.node)).toEqual(['next', 'muted']);
    expect(steps.map((s) => s.ctaVariant)).toEqual(['primary', 'secondary']);
    expect(steps.map((s) => s.ctaLabel)).toEqual(['Start a', 'Start b']);
    expect(spineGoldPct).toBe(0);
  });

  it('one complete + one in_progress: nodes/CTAs and spine divide by 2', () => {
    const { steps, spineGoldPct } = deriveModuleJourney({
      worksheets,
      progress: [
        { id: 'a', status: 'complete', pct: 100 },
        { id: 'b', status: 'in_progress', pct: 40 },
      ],
    });
    expect(steps.map((s) => s.node)).toEqual(['complete', 'active']);
    expect(steps.map((s) => s.ctaVariant)).toEqual(['secondary', 'primary']);
    expect(steps.map((s) => s.ctaLabel)).toEqual(['Review', 'Continue']);
    expect(steps.map((s) => s.pulse)).toEqual([false, true]);
    // (1 complete + 0.40 in_progress) / 2 = 0.70
    expect(spineGoldPct).toBe(70);
  });
});

describe('deriveModuleJourney — N=4 (four-worksheet module, e.g. M5)', () => {
  const worksheets = [sheet('a'), sheet('b'), sheet('c'), sheet('d')];

  it('mixed states: gold lands on the active step, spine divides by 4', () => {
    const { steps, spineGoldPct } = deriveModuleJourney({
      worksheets,
      progress: [
        { id: 'a', status: 'complete', pct: 100 },
        { id: 'b', status: 'complete', pct: 100 },
        { id: 'c', status: 'in_progress', pct: 50 },
        { id: 'd', status: 'not_started', pct: 0 },
      ],
    });
    expect(steps.map((s) => s.step)).toEqual([1, 2, 3, 4]);
    expect(steps.map((s) => s.node)).toEqual([
      'complete',
      'complete',
      'active',
      'muted',
    ]);
    expect(steps.map((s) => s.ctaVariant)).toEqual([
      'secondary',
      'secondary',
      'primary',
      'secondary',
    ]);
    expect(steps.map((s) => s.pulse)).toEqual([false, false, true, false]);
    // (2 complete + 0.50 in_progress) / 4 = 0.625 -> 63
    expect(spineGoldPct).toBe(63);
  });

  it('fresh four-step: only step 1 is the gold next; spine empty', () => {
    const { steps, spineGoldPct } = deriveModuleJourney({
      worksheets,
      progress: worksheets.map((w) => ({
        id: w.id,
        status: 'not_started',
        pct: 0,
      })),
    });
    expect(steps.map((s) => s.node)).toEqual(['next', 'muted', 'muted', 'muted']);
    expect(spineGoldPct).toBe(0);
  });

  it('all complete: every CTA Review/secondary, nothing gold, spine full', () => {
    const { steps, spineGoldPct } = deriveModuleJourney({
      worksheets,
      progress: worksheets.map((w) => ({
        id: w.id,
        status: 'complete',
        pct: 100,
      })),
    });
    expect(steps.every((s) => s.node === 'complete')).toBe(true);
    expect(steps.every((s) => s.ctaVariant === 'secondary')).toBe(true);
    expect(spineGoldPct).toBe(100);
  });
});

// --- Phase 2: locked resolution (gated worksheets + tier). The derived `locked`
// state is purely additive — it only fires for a worksheet a config marks
// `gated: true` when the user lacks access to the module's tierGate. Everything
// above (M2/M3 + the N=2/N=4 synthetics) has NO gated worksheets and passes no
// userTier, so it is unaffected; these assert the new arm in isolation. ----------

const gatedSheet = (id) => ({ ...sheet(id), gated: true });

describe('deriveModuleJourney — locked resolution (gated + no access)', () => {
  const worksheets = [sheet('open'), gatedSheet('gatedA'), gatedSheet('gatedB')];
  const progress = [
    { id: 'open', status: 'not_started', pct: 0 },
    { id: 'gatedA', status: 'in_progress', pct: 60 }, // real progress…
    { id: 'gatedB', status: 'not_started', pct: 0 },
  ];

  it('locks a gated worksheet for a user below the tier gate', () => {
    const { steps } = deriveModuleJourney({
      worksheets,
      progress,
      userTier: 'free',
      tierGate: 'navigator',
      upgradeHref: '/upgrade',
    });
    expect(steps.map((s) => s.status)).toEqual([
      'not_started',
      'locked',
      'locked',
    ]);
    expect(steps.map((s) => s.node)).toEqual(['next', 'locked', 'locked']);
  });

  it('a locked step has no pulse, no progress, and its CTA points at the upgrade route', () => {
    const { steps } = deriveModuleJourney({
      worksheets,
      progress,
      userTier: 'essentials',
      tierGate: 'navigator',
      upgradeHref: '/upgrade',
    });
    const locked = steps[1]; // gatedA — its real 60% must be suppressed
    expect(locked.status).toBe('locked');
    expect(locked.pulse).toBe(false);
    expect(locked.progress).toBe(0);
    expect(locked.href).toBe('/upgrade');
    expect(locked.ctaLabel).toBe('Unlock');
    expect(locked.subLine).toBe('Included in Full Access');
  });

  it('a locked worksheet is never the recommended-next gold step (skips it)', () => {
    // open complete, both gated locked -> no actionable step -> nothing gold.
    const { steps, spineGoldPct } = deriveModuleJourney({
      worksheets,
      progress: [
        { id: 'open', status: 'complete', pct: 100 },
        { id: 'gatedA', status: 'not_started', pct: 0 },
        { id: 'gatedB', status: 'not_started', pct: 0 },
      ],
      userTier: 'free',
      tierGate: 'navigator',
      upgradeHref: '/upgrade',
    });
    expect(steps.map((s) => s.status)).toEqual(['complete', 'locked', 'locked']);
    expect(steps.filter((s) => s.ctaVariant === 'primary')).toHaveLength(0);
    expect(steps[1].node).toBe('locked');
    // spine ignores locked: only the one complete step (1/3) fills it.
    expect(spineGoldPct).toBe(33);
  });
});

describe('deriveModuleJourney — gated worksheet resolves to REAL status with access', () => {
  const worksheets = [sheet('open'), gatedSheet('gatedA'), gatedSheet('gatedB')];
  const progress = [
    { id: 'open', status: 'not_started', pct: 0 },
    { id: 'gatedA', status: 'in_progress', pct: 60 },
    { id: 'gatedB', status: 'not_started', pct: 0 },
  ];

  it('navigator (Full Access) sees the gated worksheet at its real in_progress status', () => {
    const { steps } = deriveModuleJourney({
      worksheets,
      progress,
      userTier: 'navigator',
      tierGate: 'navigator',
      upgradeHref: '/upgrade',
    });
    expect(steps.some((s) => s.status === 'locked')).toBe(false);
    expect(steps[1].status).toBe('in_progress');
    expect(steps[1].progress).toBe(60);
    expect(steps[1].node).toBe('active');
    expect(steps[1].href).toBe('/x/gatedA'); // real worksheet route, not /upgrade
  });

  it('legacy signature tier (Full Access equivalent) also unlocks gated worksheets', () => {
    const { steps } = deriveModuleJourney({
      worksheets,
      progress,
      userTier: 'signature',
      tierGate: 'navigator',
      upgradeHref: '/upgrade',
    });
    expect(steps.some((s) => s.status === 'locked')).toBe(false);
    expect(steps[1].status).toBe('in_progress');
  });
});

describe('deriveModuleJourney — locked is purely additive', () => {
  const worksheets = [sheet('a'), sheet('b'), sheet('c')];
  const progress = [
    { id: 'a', status: 'complete', pct: 100 },
    { id: 'b', status: 'in_progress', pct: 50 },
    { id: 'c', status: 'not_started', pct: 0 },
  ];

  it('with no gated worksheets, output is identical with and without userTier/tierGate', () => {
    const base = deriveModuleJourney({ worksheets, progress });
    const withTier = deriveModuleJourney({
      worksheets,
      progress,
      userTier: 'free',
      tierGate: 'navigator',
      upgradeHref: '/upgrade',
    });
    expect(withTier).toEqual(base);
  });

  it('a gated worksheet for a Full Access user equals the same config with no gated flag', () => {
    const gatedWorksheets = [sheet('a'), gatedSheet('b'), sheet('c')];
    const ungated = deriveModuleJourney({
      worksheets,
      progress,
      userTier: 'navigator',
      tierGate: 'navigator',
      upgradeHref: '/upgrade',
    });
    const gated = deriveModuleJourney({
      worksheets: gatedWorksheets,
      progress,
      userTier: 'navigator',
      tierGate: 'navigator',
      upgradeHref: '/upgrade',
    });
    expect(gated).toEqual(ungated);
  });

  it('a gated worksheet with userTier absent is NOT locked (insufficient info → derive from progress)', () => {
    const gatedWorksheets = [sheet('a'), gatedSheet('b'), sheet('c')];
    const { steps } = deriveModuleJourney({
      worksheets: gatedWorksheets,
      progress,
    });
    expect(steps.some((s) => s.status === 'locked')).toBe(false);
    expect(steps[1].status).toBe('in_progress');
  });
});
