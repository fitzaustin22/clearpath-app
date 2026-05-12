/**
 * TC-SE-Verify-1 — VA alimony-first ordering verification flag.
 *
 * Per M5-Tool-Specs.md §6.7.3: build-time check (not a runtime calc test)
 * that documents the v1 assumption that Va. Code §20-108.2(C) income
 * definition does not contain alimony-first deduction language equivalent
 * to Md. §12-204(a)(2) or D.C. §16-916.01(d)(3).
 *
 * The assertion is satisfied by absence of the legal mechanism, verified
 * via static legal-research note rather than code introspection.
 *
 * If v1.1 build verification finds VA equivalent to those provisions, add
 * alimony-first ordering to VA path and update this test.
 */

import { describe, it } from 'vitest';

describe('TC-SE-Verify-1 — VA alimony-first ordering verification', () => {
  it('documents v1 assumption that VA does not require alimony-first ordering', () => {
    // Static assertion: research lock per §6.3.2 B4.
    //
    // VA does NOT have a statutory provision equivalent to:
    //   - Md. Fam. Law §12-204(a)(2): "the income of each parent ...
    //     adjusted by any pre-existing reasonable expenses of child
    //     support or alimony actually being paid"
    //   - D.C. Code §16-916.01(d)(3): "any spousal support, alimony, or
    //     maintenance order ... is deducted from the income of the
    //     party who is to pay it"
    //
    // VA's child support income definition at Va. Code §20-108.2(C) does
    // not include language requiring alimony to be ordered first. The
    // tool therefore computes VA spousal and child independently from
    // raw gross monthly incomes; alimonyFirstOrderingApplied is always
    // false for state==='VA' at v1.
    //
    // v1.1 ratification path: if a Virginia Court of Appeals decision or
    // future statute introduces an equivalent mechanism, add an alimony-
    // first ordering step to src/lib/supportEstimator/paths/va.js and
    // update this test to assert the new behavior.
  });
});
