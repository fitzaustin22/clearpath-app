import { describe, it, expect } from 'vitest';
import { MINIMUM_ORDER } from './dcChildSupport.js';

// Memo D, row D2 — D.C. Code § 16-916.01(g) sets the minimum order at "$75 per
// month" in both relevant provisions (the below-self-support-reserve presumption
// and the no-income-information minimum order). The constant was pinned at $50,
// which appears nowhere in the fetched section text.
//
// NOTE: MINIMUM_ORDER is currently exported but not consumed by any computation
// in the engine (no minimum-order path is wired); this test pins the corrected
// published value so a future consumer inherits the right number.
describe('DC minimum order (§ 16-916.01(g))', () => {
  it('is the published $75 per month', () => {
    expect(MINIMUM_ORDER).toBe(75);
  });
});
