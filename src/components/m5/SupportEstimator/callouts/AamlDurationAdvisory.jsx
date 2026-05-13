import { Callout } from './_shared';

export default function AamlDurationAdvisory({ marriageYears = 12 }) {
  const lo = (marriageYears * 0.3).toFixed(0);
  const hi = (marriageYears * 0.5).toFixed(0);
  return (
    <Callout variant="info" label="Duration advisory" title="AAML schedule suggests 30%–50% of marriage length">
      For a marriage of <strong>{marriageYears} years</strong>, the AAML proposed
      schedule advises a support duration of roughly <strong>{lo}–{hi} years</strong>.
      Maryland and DC courts treat AAML duration as an informational aid only —
      actual term is set by statutory factors. The schedule does not address
      modification on changed circumstances.
    </Callout>
  );
}
