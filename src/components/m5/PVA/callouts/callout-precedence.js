/**
 * UI-side surface of the engine's §7.9.1 callout precedence + the
 * React component dispatch map consumed by `CalloutStack`.
 *
 * Authoritative source for precedence: src/lib/pensionValuation/calculatePensionValue.js
 * (re-exported from the lib barrel). Single source of truth — engine and UI agree by import,
 * not by parallel definition.
 */

export { CALLOUT_PRECEDENCE } from '@/src/lib/pensionValuation';

import MultiEmployerFlagOnly from './MultiEmployerFlagOnly';
import GovFlagOnly from './GovFlagOnly';
import FrozenPlanTier1Routing from './FrozenPlanTier1Routing';
import CovertureZeroFraction from './CovertureZeroFraction';
import VestingStatusCallout from './VestingStatusCallout';
import FormOfBenefitCallout from './FormOfBenefitCallout';
import QpsaElectionCallout from './QpsaElectionCallout';
import CashBalancePassthroughExplanation from './CashBalancePassthroughExplanation';
import LumpSumOfferDivergence from './LumpSumOfferDivergence';
import QdroHandoffRecommended from './QdroHandoffRecommended';
import LiabilityDisclaimer from './LiabilityDisclaimer';

export const CALLOUT_TYPE_TO_COMPONENT = Object.freeze({
  multi_employer_flag_only: MultiEmployerFlagOnly,
  gov_flag_only: GovFlagOnly,
  frozen_plan_tier1_routing: FrozenPlanTier1Routing,
  coverture_zero_fraction: CovertureZeroFraction,
  vesting_status_callout: VestingStatusCallout,
  form_of_benefit_callout: FormOfBenefitCallout,
  qpsa_election_callout: QpsaElectionCallout,
  cash_balance_passthrough_explanation: CashBalancePassthroughExplanation,
  lump_sum_offer_divergence: LumpSumOfferDivergence,
  qdro_handoff_recommended: QdroHandoffRecommended,
  liability_disclaimer: LiabilityDisclaimer,
});
