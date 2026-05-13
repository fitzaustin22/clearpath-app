import { Callout, Cite } from './_shared';

export default function FactorTestApproximation({ state = 'VA' }) {
  const map = {
    VA: {
      title: 'Virginia post-divorce spousal support is a factor test',
      cite: 'Va. Code §20-107.1',
    },
    CA: {
      title: 'California post-divorce spousal support is a factor analysis',
      cite: 'Cal. Fam. Code §4320',
    },
    OTHER: {
      title: 'No national spousal-support formula exists',
      cite: 'per-state factor analysis',
    },
  }[state] || { title: 'Factor test applies', cite: 'state factor statute' };

  return (
    <Callout
      variant="caution"
      label="Factor test — approximation only"
      title={map.title}
    >
      The spousal figure shown is a <strong>national approximation</strong>{' '}
      because no statutory formula exists (<Cite>{map.cite}</Cite>). Your judge
      weighs statutory factors including the duration of the marriage,
      contributions of each spouse, and earning capacity. The figure here may
      differ materially from a court determination. Consult an attorney for
      case-specific analysis.
    </Callout>
  );
}
