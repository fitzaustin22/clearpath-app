import { Callout } from './_shared';

export default function SsrFloorActivated() {
  return (
    <Callout variant="info" label="Self-support reserve" title="NY low-income adjustment applied">
      New York's Self-Support Reserve floor was checked against the payor's
      post-support net income. The reserve is set at <strong>135% of the federal
      poverty guideline</strong>; below that threshold the obligation can be
      reduced or set at the statutory minimum.
    </Callout>
  );
}
