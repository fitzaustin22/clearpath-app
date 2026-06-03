import { describe, it, expect } from 'vitest';
import { deriveCopy } from './deriveCopy.js';
import { deriveJourney, JOURNEY } from './deriveJourney.js';

// Minimal normal-journey stub with `doneCount` done stations, then one current,
// then todo — mirroring deriveJourney's normal-state shape (always one current).
function normalJourney(doneCount) {
  const modules = Array.from({ length: 7 }, (_, i) => ({
    status: i < doneCount ? 'done' : i === doneCount ? 'current' : 'todo',
  }));
  return { terminal: false, terminalKind: null, modules };
}

function sectionsWith(completeKeys = []) {
  const set = new Set(completeKeys);
  const out = {};
  for (let i = 1; i <= 12; i++) out[`s${i}`] = { status: set.has(`s${i}`) ? 'complete' : 'empty' };
  return out;
}

describe('deriveCopy — normal bands by done-station count', () => {
  it('0 done -> "starts here"', () => {
    expect(deriveCopy(normalJourney(0)).headline).toBe('Your path to clarity starts here.');
  });
  it('1 done -> "on your way"', () => {
    expect(deriveCopy(normalJourney(1)).headline).toBe("You're on your way.");
  });
  it('2 done (band edge) -> "on your way"', () => {
    expect(deriveCopy(normalJourney(2)).headline).toBe("You're on your way.");
  });
  it('3 done (band edge) -> "well into the journey"', () => {
    expect(deriveCopy(normalJourney(3)).headline).toBe("You're well into the journey.");
  });
  it('4 done (band edge) -> "well into the journey"', () => {
    expect(deriveCopy(normalJourney(4)).headline).toBe("You're well into the journey.");
  });
  it('5 done (band edge) -> "home stretch"', () => {
    expect(deriveCopy(normalJourney(5)).headline).toBe("You're in the home stretch.");
  });
  it('6 done (max normal) -> "home stretch"', () => {
    expect(deriveCopy(normalJourney(6)).headline).toBe("You're in the home stretch.");
  });
  it('every normal band shares the one-step-at-a-time subhead', () => {
    for (let n = 0; n <= 6; n++) {
      expect(deriveCopy(normalJourney(n)).subhead).toBe("You're building real financial clarity, one step at a time.");
    }
  });
});

describe('deriveCopy — terminal modes (checked before banding)', () => {
  it('terminal complete -> reached clarity', () => {
    const j = { terminal: true, terminalKind: 'complete', modules: Array.from({ length: 7 }, () => ({ status: 'done' })) };
    expect(deriveCopy(j)).toEqual({
      headline: "You've reached clarity.",
      subhead: 'Every module complete — your Blueprint is ready to assemble.',
    });
  });

  it('terminal locked -> completed everything in plan', () => {
    const j = { terminal: true, terminalKind: 'locked', modules: [{ status: 'done' }, { status: 'todo' }] };
    expect(deriveCopy(j)).toEqual({
      headline: "You've completed everything in your plan.",
      subhead: "You've finished every step available in your current plan.",
    });
  });

  it('terminal takes precedence over done-count banding', () => {
    // Even with 7 done stations, a complete-terminal journey uses terminal copy,
    // never a normal band.
    const j = { terminal: true, terminalKind: 'complete', modules: Array.from({ length: 7 }, () => ({ status: 'done' })) };
    expect(deriveCopy(j).headline).toBe("You've reached clarity.");
  });
});

describe('deriveCopy — wired to real deriveJourney output', () => {
  it('mid-journey (M1-M3 done, M4 current, Navigator) -> well into the journey', () => {
    const journey = deriveJourney({ sections: sectionsWith(['s1', 's3', 's2', 's7']), userTier: 'navigator' });
    expect(deriveCopy(journey).headline).toBe("You're well into the journey.");
  });

  it('Free terminal (M1 done) -> completed everything in your plan', () => {
    const journey = deriveJourney({ sections: sectionsWith(['s1']), userTier: 'free' });
    expect(journey.terminalKind).toBe('locked');
    expect(deriveCopy(journey).headline).toBe("You've completed everything in your plan.");
  });

  it('Navigator 100% -> reached clarity', () => {
    const journey = deriveJourney({ sections: sectionsWith(JOURNEY.flatMap((m) => m.gating)), userTier: 'navigator' });
    expect(journey.terminalKind).toBe('complete');
    expect(deriveCopy(journey).headline).toBe("You've reached clarity.");
  });

  it('brand-new user (nothing done) -> starts here', () => {
    const journey = deriveJourney({ sections: sectionsWith([]), userTier: 'navigator' });
    expect(deriveCopy(journey).headline).toBe('Your path to clarity starts here.');
  });
});
