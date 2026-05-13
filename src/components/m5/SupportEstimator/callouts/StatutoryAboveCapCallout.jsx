import { Callout, Cite } from './_shared';

export default function StatutoryAboveCapCallout({ state = 'DC', annualCap = '$240,000' }) {
  if (state === 'DC') {
    return (
      <Callout variant="caution" label="Above statutory schedule" title="Combined income exceeds DC's $240,000/yr cap">
        Your combined income exceeds <strong>$240,000/year</strong>, the top of the
        DC child support guideline. Under <Cite>DC Code §16-916.01(h)</Cite>, the
        obligation <strong>shall not be less than</strong> what the schedule would
        produce at $240,000 — the number above is that statutory floor. The court has
        discretion to order more based on the child's needs and actual family experience.
        As a planning reference, a slope-based <em>Holland-method</em> extrapolation
        would produce roughly <strong>$3,640/month</strong> above the cap; the DC
        Court of Appeals approved this methodology as one acceptable approach in{' '}
        <Cite>Builta v. Guzman, 324 A.3d 269 (D.C. 2024)</Cite>. Your judge is not
        required to use it.
      </Callout>
    );
  }
  return (
    <Callout variant="caution" label="Above statutory schedule" title={`Combined income exceeds ${state}'s ${annualCap}/yr cap`}>
      Income above the statutory schedule is handled at the court's discretion.
      The number above reflects the schedule's top-row value; an actual order may
      be higher based on the child's needs and the family's experienced standard
      of living.
    </Callout>
  );
}
