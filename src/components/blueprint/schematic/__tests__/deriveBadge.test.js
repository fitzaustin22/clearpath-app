import { describe, it, expect } from 'vitest';
import { deriveBadge, BADGE } from '../deriveBadge';

describe('deriveBadge', () => {
  it('maps complete → FILLED', () => {
    expect(deriveBadge('complete', false)).toBe(BADGE.FILLED);
  });

  it('maps partial → IN PROGRESS', () => {
    expect(deriveBadge('partial', false)).toBe(BADGE.PROGRESS);
  });

  it('maps empty → PENDING', () => {
    expect(deriveBadge('empty', false)).toBe(BADGE.PENDING);
  });

  it('ACTIVE overlay wins over every stored status', () => {
    expect(deriveBadge('complete', true)).toBe(BADGE.ACTIVE);
    expect(deriveBadge('partial', true)).toBe(BADGE.ACTIVE);
    expect(deriveBadge('empty', true)).toBe(BADGE.ACTIVE);
  });

  it('unknown / missing status falls through to PENDING (defensive default)', () => {
    expect(deriveBadge('mystery', false)).toBe(BADGE.PENDING);
    expect(deriveBadge(undefined, false)).toBe(BADGE.PENDING);
    expect(deriveBadge(null, false)).toBe(BADGE.PENDING);
  });

  it('BADGE export is frozen', () => {
    expect(Object.isFrozen(BADGE)).toBe(true);
  });

  it('every badge entry carries label + pillClass', () => {
    for (const b of Object.values(BADGE)) {
      expect(typeof b.label).toBe('string');
      expect(typeof b.pillClass).toBe('string');
    }
  });

  it('pill class names match the design CSS contract (filled/progress/pending/active)', () => {
    expect(BADGE.FILLED.pillClass).toBe('filled');
    expect(BADGE.PROGRESS.pillClass).toBe('progress');
    expect(BADGE.PENDING.pillClass).toBe('pending');
    expect(BADGE.ACTIVE.pillClass).toBe('active');
  });
});
