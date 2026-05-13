import { Callout } from './_shared';

export default function AamlCapBinds() {
  return (
    <Callout variant="info" label="Cap binding" title="40%-of-combined cap is the active constraint">
      The 40%-of-combined-income cap in the AAML formula is the binding constraint
      in your case (rather than the 30/20 calculation). This typically happens
      when the payor's income is much higher than the payee's. The figure above
      is the cap value rather than the formula calculation.
    </Callout>
  );
}
