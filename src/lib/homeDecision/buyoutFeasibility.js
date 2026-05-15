// src/lib/homeDecision/buyoutFeasibility.js
//
// Buyout-feasibility (shortfall) signal per M5-Tool-Specs.md §9.2.1 / §9.8.3.
// Single pure function, no side effects.

/**
 * Buyout-feasibility (shortfall) signal per M5-Tool-Specs.md §9.2.1 / §9.8.3.
 *
 * §9.2.1 (verbatim): "when the cash-out refi cannot fund the full buyout
 * amount given DTI/LTV/credit constraints (see §9.6 qualification logic),
 * the tool surfaces a shortfall banner".
 * §9.8.3 trigger (verbatim): "Buyout exceeds DTI/LTV/credit-feasible refi".
 *
 * The §9.6 qualification verdict already encodes this: the refi is sized to
 * fund the full buyout, so verdictTier === 'red' === "this buyout-funding
 * refi does not qualify" === shortfall. NO gap-magnitude number is computed
 * (per §9.8.5 the banner copy has no variable substitution; §9.8.6 clarifies
 * "visibility into the gap magnitude" = the Keep & refi column stays rendered).
 *
 * Underwater is EXCLUDED (Fitz Q1 decision): underwater = "can't refi at all"
 * and is handled by its own dedicated Keep & refi narrative + the §9.8.5
 * cross-scenario underwater-prefix callouts. Shortfall = "can refi but not
 * enough". No double-flagging.
 *
 * @param {Object} args
 * @param {'green'|'yellow'|'red'} args.verdictTier
 * @param {'dti'|'credit'|'margin-of-safety'|'multiple'|'underwater'|'none'} args.bindingConstraint
 * @returns {{ shortfall: boolean }}
 */
export function evaluateBuyoutFeasibility({ verdictTier, bindingConstraint }) {
  const shortfall = verdictTier === 'red' && bindingConstraint !== 'underwater';
  return { shortfall };
}
