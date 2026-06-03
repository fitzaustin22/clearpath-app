import { describe, it, expect } from 'vitest';
import { deriveJourney, JOURNEY, TOTAL_BLUEPRINT_SECTIONS } from './deriveJourney.js';

// Build a sections map (s1..s12) where the listed keys are 'complete'.
function sectionsWith(completeKeys = []) {
  const set = new Set(completeKeys);
  const out = {};
  for (let i = 1; i <= 12; i++) {
    const k = `s${i}`;
    out[k] = { status: set.has(k) ? 'complete' : 'empty' };
  }
  return out;
}

const statuses = (j) => j.modules.map((m) => m.status);

describe('deriveJourney — mid-journey (design demo state)', () => {
  // M1 (s1), M2 (s3), M3 (s2+s7) done; M4 (s4) not yet -> current. Navigator.
  const journey = deriveJourney({
    sections: sectionsWith(['s1', 's3', 's2', 's7']),
    userTier: 'navigator',
  });

  it('marks M1-M3 done, M4 current, M5-M7 todo', () => {
    expect(statuses(journey)).toEqual(['done', 'done', 'done', 'current', 'todo', 'todo', 'todo']);
  });

  it('sets currentIndex to M4 and the gold trail to run 0..3', () => {
    expect(journey.currentIndex).toBe(3);
    expect(journey.doneTrailEndIndex).toBe(3);
    expect(journey.terminal).toBe(false);
  });

  it('builds a Continue next-step card from the real current module', () => {
    expect(journey.nextStep).toMatchObject({
      kind: 'continue',
      title: 'Module 4 · Tax Landscape',
      ctaLabel: 'Continue',
      href: '/modules/m4',
    });
  });

  it('reports Blueprint progress as 4 of 12 (33%)', () => {
    expect(journey.blueprint).toEqual({ done: 4, total: 12, percent: 33 });
  });
});

describe('deriveJourney — completed module past the gap stays done (non-contiguous)', () => {
  // M1, M2 done; M3 NOT done (only s2, not s7); M5 done (s8+s9). Navigator.
  const journey = deriveJourney({
    sections: sectionsWith(['s1', 's3', 's2', 's8', 's9']),
    userTier: 'navigator',
  });

  it('keeps M5 a done (gold) node even though it sits past the current M3 gap', () => {
    expect(statuses(journey)).toEqual(['done', 'done', 'current', 'todo', 'done', 'todo', 'todo']);
  });

  it('still anchors the gold trail at the first gap (currentIndex = M3)', () => {
    expect(journey.currentIndex).toBe(2);
    expect(journey.doneTrailEndIndex).toBe(2);
  });
});

describe('deriveJourney — multi-source sections (s5/s6) never gate a station', () => {
  it('does not mark M2 done just because shared s5 is complete (s3 still empty)', () => {
    const journey = deriveJourney({ sections: sectionsWith(['s1', 's5', 's6']), userTier: 'navigator' });
    expect(journey.modules[1].status).not.toBe('done'); // M2 gated by s3, not s5
  });

  it('still counts shared s5/s6 toward Blueprint progress (all 12 sections, not the gating subset)', () => {
    const journey = deriveJourney({ sections: sectionsWith(['s5', 's6']), userTier: 'navigator' });
    expect(journey.blueprint.done).toBe(2);
    expect(journey.blueprint.percent).toBe(17); // round(2/12*100)
    expect(statuses(journey).some((s) => s === 'done')).toBe(false); // yet no station is "done"
  });
});

describe('deriveJourney — Free terminal (M1 done, everything else tier-locked)', () => {
  const journey = deriveJourney({ sections: sectionsWith(['s1']), userTier: 'free' });

  it('is terminal with no current pin', () => {
    expect(journey.terminal).toBe(true);
    expect(journey.currentIndex).toBeNull();
    expect(journey.modules.filter((m) => m.status === 'current')).toHaveLength(0);
  });

  it('marks M1 done and the locked rest todo', () => {
    expect(statuses(journey)).toEqual(['done', 'todo', 'todo', 'todo', 'todo', 'todo', 'todo']);
    expect(journey.modules[1].locked).toBe(true);
  });

  it('reuses the upgrade affordance pointed at the first locked module', () => {
    expect(journey.nextStep).toMatchObject({
      kind: 'upgrade',
      title: 'Module 2 · Know What You Own',
      ctaLabel: 'Upgrade to unlock',
      href: '/upgrade',
    });
  });

  it('runs the gold trail only through the accessible-done node (0..0)', () => {
    expect(journey.doneTrailEndIndex).toBe(0);
  });
});

describe('deriveJourney — Essentials terminal (M1-M3 done, M4+ locked)', () => {
  const journey = deriveJourney({ sections: sectionsWith(['s1', 's3', 's2', 's7']), userTier: 'essentials' });

  it('is terminal and upgrades toward the first locked module (M4)', () => {
    expect(journey.terminal).toBe(true);
    expect(journey.nextStep).toMatchObject({ kind: 'upgrade', title: 'Module 4 · Tax Landscape', href: '/upgrade' });
    expect(journey.doneTrailEndIndex).toBe(2); // trail through M1-M3
  });
});

describe('deriveJourney — Navigator 100% complete', () => {
  // All single-source gating sections complete (s5/s6 left empty on purpose).
  const allGating = JOURNEY.flatMap((m) => m.gating);
  const journey = deriveJourney({ sections: sectionsWith(allGating), userTier: 'navigator' });

  it('is terminal with every station done and a full gold trail', () => {
    expect(journey.terminal).toBe(true);
    expect(statuses(journey).every((s) => s === 'done')).toBe(true);
    expect(journey.doneTrailEndIndex).toBe(6);
  });

  it('shows a quiet Blueprint pointer with no upsell', () => {
    expect(journey.nextStep).toMatchObject({ kind: 'blueprintComplete', href: '/blueprint', ctaLabel: 'View your Blueprint' });
  });
});

describe('deriveJourney — pre-hydration (empty) state', () => {
  const journey = deriveJourney({ sections: sectionsWith(['s1', 's2', 's3']), userTier: 'navigator', hydrated: false });

  it('ignores persisted sections and renders M1 as the starting current step', () => {
    expect(journey.currentIndex).toBe(0);
    expect(statuses(journey)).toEqual(['current', 'todo', 'todo', 'todo', 'todo', 'todo', 'todo']);
    expect(journey.blueprint).toEqual({ done: 0, total: TOTAL_BLUEPRINT_SECTIONS, percent: 0 });
  });
});

describe('deriveJourney — terminalKind discriminator', () => {
  it('is null for a normal in-progress journey', () => {
    const journey = deriveJourney({ sections: sectionsWith(['s1']), userTier: 'navigator' });
    expect(journey.terminal).toBe(false);
    expect(journey.terminalKind).toBeNull();
  });

  it("is 'locked' when all accessible modules are done but locked ones remain (Free@M1)", () => {
    const journey = deriveJourney({ sections: sectionsWith(['s1']), userTier: 'free' });
    expect(journey.terminalKind).toBe('locked');
  });

  it("is 'complete' when every module is done (Navigator 100%)", () => {
    const journey = deriveJourney({ sections: sectionsWith(JOURNEY.flatMap((m) => m.gating)), userTier: 'navigator' });
    expect(journey.terminalKind).toBe('complete');
  });
});

describe('deriveJourney — station href routing (no dead links)', () => {
  it('routes accessible stations to their module and tier-locked stations to /upgrade', () => {
    const journey = deriveJourney({ sections: sectionsWith(['s1']), userTier: 'free' });
    expect(journey.modules[0]).toMatchObject({ accessible: true, locked: false, href: '/modules/m1' });
    // M2 is essentials-gated for a free user -> locked -> upgrade, never /modules/m2.
    expect(journey.modules[1]).toMatchObject({ accessible: false, locked: true, href: '/upgrade' });
    expect(journey.modules.every((m) => m.href === '/upgrade' || m.href.startsWith('/modules/'))).toBe(true);
  });
});
