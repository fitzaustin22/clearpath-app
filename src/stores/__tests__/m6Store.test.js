/**
 * m6Store — Phase 0a foundation scaffold tests.
 *
 * Phase 0a ships an empty store. Tool slices accrue per build phase. The
 * empty-state contract and the persist-options contract pin the foundation
 * so later phases can't silently mutate the persist key or version.
 *
 * Note: we assert persist options DIRECTLY (`useM6Store.persist.getOptions()`)
 * rather than via a localStorage round-trip. An empty store performs no write
 * until a mutation, so a key-presence assertion would be flaky/false here.
 */

import { describe, it, expect } from 'vitest';
import { useM6Store } from '../m6Store.js';

describe('m6Store — Phase 0a empty initial state', () => {
  it('exposes an empty state object (no tool slices yet)', () => {
    const state = useM6Store.getState();
    // Whatever zustand attaches internally aside, no app slices should exist.
    expect(state.priorities).toBeUndefined();
    expect(state.tradeOff).toBeUndefined();
    expect(state.offerOrganizer).toBeUndefined();
    expect(state.deferredComp).toBeUndefined();
  });
});

describe('m6Store — persist options contract', () => {
  it('persists under the canonical name "clearpath-m6"', () => {
    expect(useM6Store.persist.getOptions().name).toBe('clearpath-m6');
  });

  it('declares persist version 0 (forward hook for a future migrate)', () => {
    expect(useM6Store.persist.getOptions().version).toBe(0);
  });
});
