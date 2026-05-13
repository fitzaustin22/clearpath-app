import StatutoryAboveCapCallout from './StatutoryAboveCapCallout';
import SsrFloorActivated from './SsrFloorActivated';
import NyChildSupportAboveCapDiscretionary from './NyChildSupportAboveCapDiscretionary';
import AamlCapBinds from './AamlCapBinds';
import BidirectionalFlowDisclosure from './BidirectionalFlowDisclosure';
import FactorTestApproximation from './FactorTestApproximation';
import GenericFallbackDisclaimer from './GenericFallbackDisclaimer';
import AamlDurationAdvisory from './AamlDurationAdvisory';
import ShortMarriageCaveat from './ShortMarriageCaveat';
import HighAssetCaveat from './HighAssetCaveat';
import StateSpecificEducational from './StateSpecificEducational';
import TcjaTaxNote from './TcjaTaxNote';
import LiabilityDisclaimer from './LiabilityDisclaimer';
import AlimonyFirstOrdering from './AlimonyFirstOrdering';

const REGISTRY = {
  statutory_above_cap_callout: StatutoryAboveCapCallout,
  ssr_floor_activated: SsrFloorActivated,
  ny_child_support_above_cap_discretionary: NyChildSupportAboveCapDiscretionary,
  aaml_cap_binds: AamlCapBinds,
  bidirectional_flow_disclosure: BidirectionalFlowDisclosure,
  factor_test_approximation: FactorTestApproximation,
  generic_fallback_disclaimer: GenericFallbackDisclaimer,
  aaml_duration_advisory: AamlDurationAdvisory,
  short_marriage_caveat: ShortMarriageCaveat,
  high_asset_caveat: HighAssetCaveat,
  state_specific_educational: StateSpecificEducational,
  tcja_tax_note: TcjaTaxNote,
  liability_disclaimer: LiabilityDisclaimer,
  alimony_first_ordering: AlimonyFirstOrdering,
};

export default function CalloutStack({ callouts, gap = 12 }) {
  if (!callouts || !callouts.length) return null;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap }}>
      {callouts.map((c, i) => {
        const C = REGISTRY[c.type];
        if (!C) return null;
        return <C key={`${c.type}-${i}`} {...c} />;
      })}
    </div>
  );
}
