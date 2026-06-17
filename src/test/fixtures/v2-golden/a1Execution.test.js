import { describe, it, expect } from 'vitest';

import F1 from './F1.json';
import F2 from './F2.json';
import F3 from './F3.json';
import F4 from './F4.json';
import F4b from './F4b.json';
import { runA1 } from './a1Runner';

// Spec §4-A1 PERMANENT GATE (the gap Phase 1 flagged: no scratch specs). For
// every pinned golden fixture the A1 runner must EXECUTE (all slots pinned),
// every numeric + categorical slot must dispatch to a registered recomputer
// (zero `recompute_not_implemented_phase2`), and every recompute must MATCH its
// pinned audit value (zero mismatches). F4 sits below the D-V2-6 export floor:
// no document, no pins, nothing to recompute.
const PINNED = [
  ['F1', F1],
  ['F2', F2],
  ['F3', F3],
  ['F4b', F4b],
];

describe('A1 traceability — executed ⇒ zero mismatches (permanent gate, spec §4-A1)', () => {
  it.each(PINNED)('%s: A1 runs and every pinned slot matches', (id, fixture) => {
    const result = runA1(fixture);

    expect(result.status, `${id} A1 must execute (all slots pinned)`).toBe('executed');

    const notImplemented = result.results
      .filter((r) => r.status === 'recompute_not_implemented_phase2')
      .map((r) => r.slot);
    expect(notImplemented, `${id} has Phase-2-pending recomputers`).toEqual([]);

    const mismatches = result.results
      .filter((r) => r.status === 'mismatch')
      .map((r) => ({ slot: r.slot, recomputed: r.recomputed, pinned: r.pinnedValue }));
    expect(mismatches, `${id} recompute mismatches`).toEqual([]);

    // Belt-and-suspenders: nothing left but matches.
    expect(result.results.every((r) => r.status === 'match'), `${id} non-match slots`).toBe(true);
    expect(result.results.length, `${id} must have at least one recomputed slot`).toBeGreaterThan(0);
  });

  it('F4 is below the export floor — executes with no pins and no recompute work', () => {
    const result = runA1(F4);
    expect(result.status).toBe('executed');
    expect(result.results).toEqual([]);
  });
});
