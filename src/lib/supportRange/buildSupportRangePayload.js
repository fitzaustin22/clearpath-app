// src/lib/supportRange/buildSupportRangePayload.js
//
// Maps a deriveSupportEstimate() result into the EXISTING §8 "Support Analysis"
// data contract consumed by src/components/blueprint/sections/S8SupportAnalysis.jsx
// and src/lib/blueprint/documentModel.js (both point-only). The LIKELY figure is
// the point; the full low/likely/high band + the display-only region are carried
// in metadata (the store persists arbitrary `data`). metadata.payor/payeeMonthly
// are REQUIRED by the §7 support-aware net-position line (documentModel.js:330).
//
// This is a NEW mapper for the reskinned wizard; the old engine's mapper
// (src/lib/blueprintSupportPayload.js) is retained untouched.
//
// Intentionally omits the attorney-disclosure child fields the old engine emits
// (childBasicObligationMonthly, payorAdjustedMonthly, payeeAdjustedMonthly): the
// uniform rule-of-thumb computes child support on RAW incomes (no alimony-first
// ordering), so payor/payee "adjusted" incomes are N/A here, and the attorney §8
// lane is dormant (golden-fixture-fed via the old mapper). Whether the paid
// Attorney Blueprint populates these is the OPEN Phase-4 §8-sourcing fork — see
// V2-Attorney-Blueprint-Acceptance-Spec.md §13. The consumer §8 renderer does not
// read these fields.

import { RANGE_SPREAD, STATE_NAMES } from './computeSupportRange';

const SPOUSAL_BASIS = 'AAML benchmark (30% payor − 20% payee, 40% combined-income cap)';
const CHILD_BASIS = 'Income-shares guideline rule of thumb (uniform estimate)';

export function buildSupportRangePayload(estimate, inputs) {
  if (!estimate) return null;

  const region = inputs?.region ?? null;
  const spousalLikely = estimate.spousal?.likely ?? 0;
  const childLikely = estimate.child?.likely ?? 0;
  // Raw-string check (not the coerced-to-0 combined income): computeSupportRange's
  // num() coerces a blank field to a FINITE 0, so a never-touched income step
  // would otherwise read as a legitimate $0 result. At least one party's income
  // must actually be entered for this to count as a real analysis.
  const incomeEntered =
    (inputs?.incomeYou != null && inputs.incomeYou !== '') ||
    (inputs?.incomeSpouse != null && inputs.incomeSpouse !== '');

  return {
    totalMonthlySupport: estimate.combined?.headline ?? 0,
    spousalSupport:
      spousalLikely > 0
        ? { monthly: spousalLikely, duration: estimate.duration === '—' ? null : estimate.duration, basis: SPOUSAL_BASIS }
        : null,
    childSupport:
      childLikely > 0
        ? { monthly: childLikely, children: estimate._numChildren ?? null, basis: CHILD_BASIS }
        : null,
    metadata: {
      formulaId: 'aaml_uniform_estimate',
      // Gates blueprintStore.updateSupportAnalysis' completion status — see
      // that writer for why this can't be inferred from totalMonthlySupport.
      incomeEntered,
      // Region is DISPLAY-ONLY: persisted for the saved record + the
      // "not [State]'s binding worksheet" framing; it does NOT affect any figure.
      region,
      regionLabel: STATE_NAMES[region] ?? region ?? null,
      // §7 net-position depends on these (documentModel.js:330).
      payorMonthly: estimate._payorMonthly ?? null,
      payeeMonthly: estimate._payeeMonthly ?? null,
      numChildren: estimate._numChildren ?? null,
      // Full band persisted for a future band-aware §8 renderer (named follow-up).
      range: {
        spousal: estimate.spousal ? { low: estimate.spousal.low, likely: estimate.spousal.likely, high: estimate.spousal.high } : null,
        child: estimate.child ? { low: estimate.child.low, likely: estimate.child.likely, high: estimate.child.high } : null,
        combined: { likely: estimate.combined?.headline ?? 0, direction: estimate.combined?.direction ?? null },
      },
      rangeSpread: RANGE_SPREAD,
      methodologyNote: 'Uniform AAML/income-shares rule of thumb applied across states; region shown for framing only.',
    },
  };
}
