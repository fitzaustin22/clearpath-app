/**
 * Dev-page `?seed=<variant>` fixture map for visual QA per spec §7.11.
 *
 * Wraps 10 engine fixtures from `src/lib/pensionValuation/__tests__/fixtures/`
 * into the `seedOverride` shape consumed by `PVA.jsx`. Each variant surfaces
 * a distinct ResultsPanel rendering path:
 *
 *   variant key                       → ResultsPanel branch
 *   ───────────────────────────────────────────────────────────────────────
 *   tier1_canonical                   → Tier 1 normal (1 BigNumber + sensitivity)
 *   tier3_canonical                   → Tier 3 normal (2 BigNumbers; non-zero coverture)
 *   tier3_zero_coverture              → Tier 3 zero coverture (marital = $0)
 *   inpay_canonical                   → in-pay normal (1 BigNumber + sensitivity)
 *   cashbalance_canonical             → cash balance pass-through (1 BigNumber)
 *   cashbalance_with_coverture        → cash balance + coverture (2 BigNumbers)
 *   frozen_routing_banner             → AMBER frozen-routing banner over Tier 1
 *   legacy_currentvalue_banner        → AMBER legacy banner over Tier 3
 *   flag_only_multiemployer           → AMBER flag-only banner; no BigNumber
 *   r3_validation_error               → RED ValidationErrorPanel; no engine call
 *
 * Seed `inputs` overlay `planType` onto fixture inputs so the UI's
 * `PlanTypeSelector` reflects the seed's path origin (TierOverride
 * visibility, FlagOnly subpanel, etc.).
 *
 * The two "banner" seeds (frozen, legacy) reuse engine-ready fixtures for
 * a path with matching default, then attach the flag externally — the
 * pre-pop fixtures (`tc-pva-frozenrouting-1.json`, `tc-pva-prepop-3.json`)
 * carry M2-wrapper shape that the engine cannot consume directly.
 */

import tier1Canonical from '@/src/lib/pensionValuation/__tests__/fixtures/tc-pva-tier1-1.json';
import tier3Canonical from '@/src/lib/pensionValuation/__tests__/fixtures/tc-pva-coverture-1.json';
import tier3ZeroCoverture from '@/src/lib/pensionValuation/__tests__/fixtures/tc-pva-coverture-3.json';
import inPayCanonical from '@/src/lib/pensionValuation/__tests__/fixtures/tc-pva-inpaystatus-1.json';
import cashBalanceCanonical from '@/src/lib/pensionValuation/__tests__/fixtures/tc-pva-cashbalance-1.json';
import cashBalanceWithCoverture from '@/src/lib/pensionValuation/__tests__/fixtures/tc-pva-cashbalance-2.json';
import flagOnlyMultiEmployer from '@/src/lib/pensionValuation/__tests__/fixtures/tc-pva-flagonly-1.json';
import lumpSumDivergent from '@/src/lib/pensionValuation/__tests__/fixtures/tc-pva-lumpsumdivergence-1.json';

const TIER_TRADITIONAL = 'private_db_traditional';
const CASH_BALANCE_PLANTYPE = 'private_db_cash_balance';

export const SEED_VARIANTS = Object.freeze({
  tier1_canonical: {
    assetId: 'seed-tier1-canonical',
    path: 'tier_1',
    inputs: {
      ...tier1Canonical.inputs,
      planName: 'ABC Corp Pension (seeded)',
      whoseplan: 'Client',
      planType: TIER_TRADITIONAL,
    },
  },

  tier3_canonical: {
    assetId: 'seed-tier3-canonical',
    path: 'tier_3',
    inputs: {
      ...tier3Canonical.inputs,
      planName: 'Tier 3 Coverture Plan (seeded)',
      whoseplan: 'Client',
      planType: TIER_TRADITIONAL,
    },
  },

  tier3_zero_coverture: {
    assetId: 'seed-tier3-zero-coverture',
    path: 'tier_3',
    inputs: {
      ...tier3ZeroCoverture.inputs,
      planName: 'Tier 3 Zero Coverture (seeded)',
      whoseplan: 'Client',
      planType: TIER_TRADITIONAL,
    },
  },

  inpay_canonical: {
    assetId: 'seed-inpay-canonical',
    path: 'in_pay_status',
    inputs: {
      ...inPayCanonical.inputs,
      planName: 'In-Pay Plan (seeded)',
      whoseplan: 'Client',
      planType: TIER_TRADITIONAL,
    },
  },

  cashbalance_canonical: {
    assetId: 'seed-cashbalance-canonical',
    path: 'cash_balance',
    inputs: {
      ...cashBalanceCanonical.inputs,
      planName: 'Cash Balance Plan (seeded)',
      whoseplan: 'Client',
      planType: CASH_BALANCE_PLANTYPE,
    },
  },

  cashbalance_with_coverture: {
    assetId: 'seed-cashbalance-with-coverture',
    path: 'cash_balance',
    inputs: {
      ...cashBalanceWithCoverture.inputs,
      planName: 'Cash Balance + Coverture (seeded)',
      whoseplan: 'Client',
      planType: CASH_BALANCE_PLANTYPE,
      applyCoverture: true,
    },
  },

  frozen_routing_banner: {
    assetId: 'seed-frozen-routing',
    // Frozen routes to Tier 1 default per §7.2 R4. Reuse Tier 1 engine
    // inputs so the calc proceeds normally and the banner overlays.
    path: 'tier_1',
    inputs: {
      ...tier1Canonical.inputs,
      planName: 'Frozen DB Plan (seeded)',
      whoseplan: 'Client',
      planType: TIER_TRADITIONAL,
    },
    _frozenRoutingApplied: true,
  },

  legacy_currentvalue_banner: {
    assetId: 'seed-legacy-currentvalue',
    // Legacy entries fall through to Tier 3 default in pre-pop's `else`
    // branch. Reuse coverture-1 engine inputs for a non-trivial PV plus
    // surface the legacy flag.
    path: 'tier_3',
    inputs: {
      ...tier3Canonical.inputs,
      planName: 'Legacy Pension (seeded)',
      whoseplan: 'Client',
      planType: TIER_TRADITIONAL,
    },
    _legacyCurrentValueDetected: true,
    _legacyValue: 300000,
  },

  flag_only_multiemployer: {
    assetId: 'seed-flagonly-multiemployer',
    path: 'flag_only',
    inputs: {
      ...flagOnlyMultiEmployer.inputs,
      planName: 'Multi-Employer Pension (seeded)',
      whoseplan: 'Client',
      // Per §7.2 R1, planType drives flag_only routing — must be one of
      // the four flag-only plan types.
      planType: 'multi_employer',
    },
  },

  r3_validation_error: {
    assetId: 'seed-r3-error',
    path: null,
    inputs: {},
    error: 'in_pay_data_incomplete',
    missingFields: ['monthlyBenefit', 'benefitStartDate'],
  },

  // ─── Phase 2 (PR 3) callout-surfacing seeds via LL-22 hybrid pattern ───
  // Each new seed wraps a compute-path engine fixture and overrides only
  // the field(s) that trigger an additional callout. Engine surfaces:
  //   - vesting_status_callout when vestingStatus !== 'fully_vested'
  //   - form_of_benefit_callout when formOfBenefitOnStatement / InPay !== 'single_life'
  //   - lump_sum_offer_divergence when offer diverges from tool PV by >10%
  //   - coverture_zero_fraction when coverture numerator → 0

  vesting_partial: {
    assetId: 'seed-vesting-partial',
    path: 'tier_1',
    inputs: {
      ...tier1Canonical.inputs,
      planName: 'Tier 1 + partial vesting (seeded)',
      whoseplan: 'Client',
      planType: TIER_TRADITIONAL,
      vestingStatus: 'partially_vested',
    },
  },

  form_joint50_on_statement: {
    assetId: 'seed-form-joint50-onstmt',
    path: 'tier_1',
    inputs: {
      ...tier1Canonical.inputs,
      planName: 'Tier 1 + joint-50 on statement (seeded)',
      whoseplan: 'Client',
      planType: TIER_TRADITIONAL,
      formOfBenefitOnStatement: 'joint_50',
    },
  },

  form_joint100_in_pay: {
    assetId: 'seed-form-joint100-inpay',
    path: 'in_pay_status',
    inputs: {
      ...inPayCanonical.inputs,
      planName: 'In-pay + joint-100 elected (seeded)',
      whoseplan: 'Client',
      planType: TIER_TRADITIONAL,
      formOfBenefitInPay: 'joint_100',
    },
  },

  lump_sum_divergent: {
    assetId: 'seed-lumpsum-divergent',
    path: 'tier_1',
    inputs: {
      ...lumpSumDivergent.inputs,
      planName: 'Tier 1 + lump-sum offer below tool PV (seeded)',
      whoseplan: 'Client',
      planType: TIER_TRADITIONAL,
    },
  },

  coverture_zero_combo: {
    // Multi-callout precedence sort exercise. Combines:
    //   coverture_zero_fraction (5) + vesting_status_callout (6) +
    //   form_of_benefit_callout (7) + qpsa_election_callout (8) +
    //   qdro_handoff_recommended (11) + liability_disclaimer (12)
    assetId: 'seed-coverture-zero-combo',
    path: 'tier_3',
    inputs: {
      ...tier3ZeroCoverture.inputs,
      planName: 'Tier 3 zero coverture + vesting + form (seeded)',
      whoseplan: 'Client',
      planType: TIER_TRADITIONAL,
      vestingStatus: 'partially_vested',
      formOfBenefitOnStatement: 'joint_50',
    },
  },
});

/**
 * Stable list of seed keys for the seed-picker UI in the dev page.
 */
export const SEED_KEYS = Object.freeze(Object.keys(SEED_VARIANTS));
