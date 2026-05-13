import { Callout } from './_shared';

export default function ShortMarriageCaveat() {
  return (
    <Callout variant="info" label="Short marriage" title="AAML formula calibrated to longer marriages">
      The AAML proposed formula is calibrated against marriages of five years or
      more. For shorter marriages, MD and DC courts often order{' '}
      <strong>rehabilitative alimony</strong> (a fixed-term award tied to a
      re-entry plan) rather than indefinite support. The figure above should be
      read as a planning ceiling, not a likely court order.
    </Callout>
  );
}
