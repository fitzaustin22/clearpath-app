import { Callout } from './_shared';

export default function BidirectionalFlowDisclosure({ state = 'New York' }) {
  return (
    <Callout
      variant="caution"
      label="Child support direction"
      title="Bidirectional support — v1 limitation"
    >
      In this configuration, the higher-earning spouse (who pays spousal support)
      is also the primary custodial parent. Under {state}'s child support law, the
      non-custodial parent (the lower earner here) typically pays child support to
      the custodial parent. So child support actually flows in the opposite
      direction from spousal support. The tool does not compute reverse-direction
      child support at v1 — the combined monthly figure shown reflects spousal
      support only. For a full cash-flow analysis in this configuration, consult
      an attorney or CDFA. <em>(v1.1 roadmap item.)</em>
    </Callout>
  );
}
