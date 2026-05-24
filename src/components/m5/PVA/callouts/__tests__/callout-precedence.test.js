/**
 * Tests for `CALLOUT_PRECEDENCE` (re-exported from engine) + the React
 * `CALLOUT_TYPE_TO_COMPONENT` dispatch map.
 *
 * The engine-side CALLOUT_PRECEDENCE is an Object.freeze({type: number})
 * (engine sort uses subtraction-based precedence comparison). The UI
 * layer re-exports it and exposes a parallel React-component map.
 *
 * Per Phase 0.7a, this shape diverges from the build prompt's array
 * strawman — the test still validates the same invariants: 11 types in
 * §7.9.1 order, complete component coverage, no extras. (Was 12 prior to
 * removing the legacy_currentvalue_ignored callout, which is obsolete
 * since M2 doesn't write the pre-Addendum-2 currentValue shape.)
 */

import { describe, it, expect } from 'vitest';
import { CALLOUT_PRECEDENCE, CALLOUT_TYPE_TO_COMPONENT } from '../callout-precedence';

const SPEC_ORDER = [
  'multi_employer_flag_only',
  'gov_flag_only',
  'frozen_plan_tier1_routing',
  'coverture_zero_fraction',
  'vesting_status_callout',
  'form_of_benefit_callout',
  'qpsa_election_callout',
  'cash_balance_passthrough_explanation',
  'lump_sum_offer_divergence',
  'qdro_handoff_recommended',
  'liability_disclaimer',
];

describe('CALLOUT_PRECEDENCE', () => {
  it('has exactly 11 entries', () => {
    expect(Object.keys(CALLOUT_PRECEDENCE)).toHaveLength(11);
  });

  it('keys sorted by precedence value match §7.9.1 render order', () => {
    const sorted = Object.keys(CALLOUT_PRECEDENCE).sort(
      (a, b) => CALLOUT_PRECEDENCE[a] - CALLOUT_PRECEDENCE[b],
    );
    expect(sorted).toEqual(SPEC_ORDER);
  });

  it('every entry maps to a registered React component', () => {
    Object.keys(CALLOUT_PRECEDENCE).forEach((type) => {
      expect(CALLOUT_TYPE_TO_COMPONENT[type]).toBeDefined();
    });
  });

  it('CALLOUT_TYPE_TO_COMPONENT has no entries outside CALLOUT_PRECEDENCE', () => {
    expect(Object.keys(CALLOUT_TYPE_TO_COMPONENT).sort()).toEqual(
      [...Object.keys(CALLOUT_PRECEDENCE)].sort(),
    );
  });
});
