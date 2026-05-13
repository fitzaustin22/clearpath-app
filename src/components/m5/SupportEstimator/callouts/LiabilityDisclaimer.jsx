import { T } from '@/src/lib/brand/tokens';
import { Callout } from './_shared';

export default function LiabilityDisclaimer() {
  return (
    <Callout variant="disclaimer" label="Disclaimer">
      <strong style={{ color: T.NAVY }}>Planning-grade estimate — not a legal opinion.</strong>{' '}
      Final support orders depend on judicial discretion, factors not captured by
      this tool, and your state's specific procedural rules. Not a substitute for
      legal advice. Consult a licensed attorney for any actual filing.
    </Callout>
  );
}
