/**
 * seedVariants tests — §7.11 fixture-wrapping sanity.
 *
 * Verifies:
 *   - All 10 documented seed keys exist
 *   - Each variant declares a coherent shape (assetId + (path | error))
 *   - The error variant has no `path`; all compute paths have a real path
 *   - All non-error inputs carry a `planType` to drive UI subpanel selection
 */

import { describe, it, expect } from 'vitest';
import { SEED_VARIANTS, SEED_KEYS } from '../__fixtures__/seedVariants.js';

const EXPECTED_KEYS = [
  'tier1_canonical',
  'tier3_canonical',
  'tier3_zero_coverture',
  'inpay_canonical',
  'cashbalance_canonical',
  'cashbalance_with_coverture',
  'frozen_routing_banner',
  'legacy_currentvalue_banner',
  'flag_only_multiemployer',
  'r3_validation_error',
];

const EXPECTED_PATH_BY_KEY = {
  tier1_canonical: 'tier_1',
  tier3_canonical: 'tier_3',
  tier3_zero_coverture: 'tier_3',
  inpay_canonical: 'in_pay_status',
  cashbalance_canonical: 'cash_balance',
  cashbalance_with_coverture: 'cash_balance',
  frozen_routing_banner: 'tier_1',
  legacy_currentvalue_banner: 'tier_3',
  flag_only_multiemployer: 'flag_only',
  r3_validation_error: null,
};

describe('SEED_VARIANTS (§7.11 fixture wrapping)', () => {
  it('TC-PVA-Seeds-1: exactly the 10 documented seed keys are exported', () => {
    expect([...SEED_KEYS].sort()).toEqual([...EXPECTED_KEYS].sort());
  });

  it('TC-PVA-Seeds-2: each variant has assetId; each compute-path variant has matching path; r3_validation_error has path:null + error', () => {
    for (const key of EXPECTED_KEYS) {
      const v = SEED_VARIANTS[key];
      expect(v, `seed: ${key}`).toBeDefined();
      expect(v.assetId, `seed ${key}: assetId`).toBeTruthy();
      expect(v.path, `seed ${key}: path`).toBe(EXPECTED_PATH_BY_KEY[key]);
      if (key === 'r3_validation_error') {
        expect(v.error).toBe('in_pay_data_incomplete');
        expect(Array.isArray(v.missingFields)).toBe(true);
        expect(v.missingFields.length).toBeGreaterThan(0);
      } else {
        expect(v.inputs, `seed ${key}: inputs`).toBeDefined();
        expect(v.inputs.planType, `seed ${key}: inputs.planType`).toBeTruthy();
      }
    }
  });

  it('TC-PVA-Seeds-3: frozen_routing_banner carries _frozenRoutingApplied=true', () => {
    expect(SEED_VARIANTS.frozen_routing_banner._frozenRoutingApplied).toBe(true);
  });

  it('TC-PVA-Seeds-4: legacy_currentvalue_banner carries _legacyCurrentValueDetected=true + _legacyValue', () => {
    expect(SEED_VARIANTS.legacy_currentvalue_banner._legacyCurrentValueDetected).toBe(true);
    expect(SEED_VARIANTS.legacy_currentvalue_banner._legacyValue).toBe(300000);
  });

  it('TC-PVA-Seeds-5: cashbalance_with_coverture carries applyCoverture=true to drive UI', () => {
    expect(SEED_VARIANTS.cashbalance_with_coverture.inputs.applyCoverture).toBe(true);
  });

  it('TC-PVA-Seeds-6: flag_only_multiemployer carries planType=multi_employer so §7.2 R1 fires', () => {
    expect(SEED_VARIANTS.flag_only_multiemployer.inputs.planType).toBe('multi_employer');
  });
});
