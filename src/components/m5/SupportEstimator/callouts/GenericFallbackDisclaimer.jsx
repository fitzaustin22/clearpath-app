import { Callout } from './_shared';

export default function GenericFallbackDisclaimer({ stateName = 'this state' }) {
  return (
    <Callout
      variant="caution"
      label="National approximation"
      title={`Estimate uses HHS/OCSE model — not ${stateName} law`}
    >
      This child support estimate uses the Federal HHS/OCSE income-shares
      model — a national approximation, <strong>not {stateName}'s specific law</strong>.
      Additional state integrations are in development. Spousal support is not
      estimated for non-launch states (no national formula exists; spousal is
      per-state factor analysis). Please use this figure for ballpark planning
      only and consult an attorney in your state.
    </Callout>
  );
}
