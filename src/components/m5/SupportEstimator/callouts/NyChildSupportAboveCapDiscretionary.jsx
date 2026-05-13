import { Callout, Cite } from './_shared';

export default function NyChildSupportAboveCapDiscretionary() {
  return (
    <Callout
      variant="caution"
      label="Discretionary above cap"
      title="Combined income exceeds NY's $193,000/yr cap"
    >
      New York applies the child-support percentage formula to combined parental
      income up to <strong>$193,000/year</strong> (the cap is adjusted every two
      years per <Cite>DRL §240(1-b)(c)(2)</Cite>). Above that cap, the court has
      discretion whether to apply the percentage to additional income, the{' '}
      <Cite>F.W. v. P.B. / Cassano v. Cassano</Cite> factors, or both. The figure
      shown applies the formula up to the cap and stops there — a court order may
      impute additional support on the discretionary portion.
    </Callout>
  );
}
