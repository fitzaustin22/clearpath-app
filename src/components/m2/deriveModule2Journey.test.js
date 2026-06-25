import { describe, it, expect } from 'vitest';
import {
  deriveModule2Journey,
  shouldShowUpgrade,
  countBlueprintComplete,
  WORKSHEETS,
} from './deriveModule2Journey';

// Convenience: build the progress map the derive expects.
const P = (doc, mei, ppi) => ({
  documentChecklist: doc,
  maritalEstateInventory: mei,
  personalPropertyInventory: ppi,
});

describe('WORKSHEETS content contract (matches the Primary design)', () => {
  it('is the three worksheets, in journey order, with the right routes/copy', () => {
    expect(WORKSHEETS.map((w) => w.key)).toEqual([
      'documentChecklist',
      'maritalEstateInventory',
      'personalPropertyInventory',
    ]);
    expect(WORKSHEETS.map((w) => w.title)).toEqual([
      'Documentation Checklist',
      'Marital Estate Inventory',
      'Personal Property Inventory',
    ]);
    expect(WORKSHEETS.map((w) => w.href)).toEqual([
      '/modules/m2/checklist',
      '/modules/m2/inventory',
      '/modules/m2/personal-property',
    ]);
    expect(WORKSHEETS.map((w) => w.eyebrow)).toEqual([
      'Step 1 · Gather documents',
      'Step 2 · Build inventory',
      'Step 3 · Personal property',
    ]);
  });
});

describe('deriveModule2Journey — status derivation (reuses existing complete thresholds)', () => {
  it('marks a worksheet not_started when progress is 0', () => {
    const { steps } = deriveModule2Journey({ progress: P(0, 0, 0) });
    expect(steps.map((s) => s.status)).toEqual([
      'not_started',
      'not_started',
      'not_started',
    ]);
  });

  it('marks a worksheet in_progress when progress is above 0 but below its complete threshold', () => {
    // checklist completes at ===100, MEI at >90, PPI at >80
    const { steps } = deriveModule2Journey({ progress: P(50, 90, 80) });
    expect(steps.map((s) => s.status)).toEqual([
      'in_progress',
      'in_progress',
      'in_progress',
    ]);
  });

  it('marks a worksheet complete at its own threshold (100 / >90 / >80)', () => {
    const { steps } = deriveModule2Journey({ progress: P(100, 91, 81) });
    expect(steps.map((s) => s.status)).toEqual([
      'complete',
      'complete',
      'complete',
    ]);
  });

  it('checklist is NOT complete at 99 (strict ===100 / >= 100 semantics)', () => {
    const { steps } = deriveModule2Journey({ progress: P(99, 0, 0) });
    expect(steps[0].status).toBe('in_progress');
  });

  it('clamps out-of-range progress into [0,100]', () => {
    const { steps } = deriveModule2Journey({ progress: P(150, -20, 60) });
    expect(steps[0].status).toBe('complete'); // 150 -> 100 -> complete
    expect(steps[0].progress).toBe(100);
    expect(steps[1].status).toBe('not_started'); // -20 -> 0 -> not_started
    expect(steps[1].progress).toBe(0);
    expect(steps[2].status).toBe('in_progress'); // 60 -> below PPI's >80 threshold
    expect(steps[2].progress).toBe(60);
  });
});

describe('deriveModule2Journey — node/pill/CTA states reproduce the reference shot', () => {
  // shot_primary.png default: checklist not started, MEI in progress 86%, PPI not started.
  const journey = deriveModule2Journey({ progress: P(0, 86, 0) });

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

describe('deriveModule2Journey — fresh user (all not started)', () => {
  const journey = deriveModule2Journey({ progress: P(0, 0, 0) });

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

describe('deriveModule2Journey — complete state (design gap I am defining)', () => {
  it('a complete worksheet gets a check node, a Review CTA, and a secondary (outline) variant', () => {
    const { steps } = deriveModule2Journey({ progress: P(100, 0, 0) });
    expect(steps[0].status).toBe('complete');
    expect(steps[0].node).toBe('complete');
    expect(steps[0].ctaLabel).toBe('Review');
    expect(steps[0].ctaVariant).toBe('secondary');
    expect(steps[0].pulse).toBe(false);
  });

  it('the recommended-next gold moves to the first non-complete step', () => {
    // checklist complete, MEI in progress, PPI not started
    const { steps } = deriveModule2Journey({ progress: P(100, 50, 0) });
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
    const { steps } = deriveModule2Journey({ progress: P(100, 95, 0) });
    expect(steps.map((s) => s.status)).toEqual([
      'complete',
      'complete',
      'not_started',
    ]);
    expect(steps[2].ctaVariant).toBe('primary');
    expect(steps[2].node).toBe('next');
  });

  it('when all complete, every CTA is Review/secondary and nothing is gold-emphasized', () => {
    const { steps } = deriveModule2Journey({ progress: P(100, 100, 100) });
    expect(steps.every((s) => s.status === 'complete')).toBe(true);
    expect(steps.every((s) => s.ctaVariant === 'secondary')).toBe(true);
    expect(steps.every((s) => s.ctaLabel === 'Review')).toBe(true);
  });
});

describe('deriveModule2Journey — spine gold fraction reflects real progress', () => {
  it('is the fraction of journey completed (complete=full third, in_progress=fractional)', () => {
    expect(deriveModule2Journey({ progress: P(0, 86, 0) }).spineGoldPct).toBe(29); // round(0.86/3*100)
    expect(deriveModule2Journey({ progress: P(100, 0, 0) }).spineGoldPct).toBe(33); // one of three complete
    expect(deriveModule2Journey({ progress: P(100, 100, 100) }).spineGoldPct).toBe(100);
  });
});

describe('deriveModule2Journey — hydration guard (SSR safety)', () => {
  it('treats everything as not_started before hydration regardless of store values', () => {
    const journey = deriveModule2Journey({ progress: P(100, 86, 81), hydrated: false });
    expect(journey.steps.every((s) => s.status === 'not_started')).toBe(true);
    expect(journey.steps.some((s) => s.pulse)).toBe(false);
    expect(journey.spineGoldPct).toBe(0);
  });
});

describe('shouldShowUpgrade — tier -> Full Access mapping (reuses plans.hasAccess)', () => {
  it('shows the promo for free and essentials (NOT Full Access)', () => {
    expect(shouldShowUpgrade('free')).toBe(true);
    expect(shouldShowUpgrade('essentials')).toBe(true);
  });

  it('hides the promo for navigator and legacy signature (Full Access)', () => {
    expect(shouldShowUpgrade('navigator')).toBe(false);
    expect(shouldShowUpgrade('signature')).toBe(false);
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
