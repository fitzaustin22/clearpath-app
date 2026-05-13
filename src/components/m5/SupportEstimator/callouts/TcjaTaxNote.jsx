import { Callout } from './_shared';

export default function TcjaTaxNote() {
  return (
    <Callout variant="info" label="Tax treatment" title="Post-2018 orders are after-tax transfers">
      <strong>Tax treatment.</strong> For divorce or separation instruments
      executed after December 31, 2018, maintenance/spousal support is{' '}
      <strong>not deductible</strong> to the payor and{' '}
      <strong>not includable</strong> to the payee for federal or state income-tax
      purposes. Most current orders fall in this category. The figure shown is
      an after-tax transfer for these orders.
    </Callout>
  );
}
