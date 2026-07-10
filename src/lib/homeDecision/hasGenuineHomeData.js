// src/lib/homeDecision/hasGenuineHomeData.js
//
// Single source of "is this a genuine HDA scenario, not a blank/coerced-zero
// one?" — per the pre-reskin correctness discovery (Q1:
// ClearPath LLC/Roadmap/Active/HDA-Reskin-Correctness-Discovery.md).
//
// currentFMV has no engine-level default and no legitimate zero: a real home
// always has FMV > 0, and calculateSellNow's grossSaleProceeds
// (= currentFMV * (1 - commission - closingCosts)) is a fixed positive
// multiple of currentFMV, so gating on currentFMV is equivalent to gating on
// that never-legitimately-zero output — this is HDA's analog of PVA's
// hasGenuinePV keying off total PV, not marital PV (which legitimately can be
// $0). netWealth/liquidCash/homeEquity are NOT safe gates: all three can
// legitimately be zero or negative for a real scenario (underwater mortgage,
// high debt, low starting cash).
//
// Unlike PVA's hasGenuinePV(results) — checked against the engine's OUTPUT
// because PVA's engine can throw on certain input shapes and so must always
// run first — HDA's engine never throws regardless of input shape (confirmed
// during discovery), so this predicate is checked against the raw INPUTS,
// upstream of the engine call. HomeDecisionAnalyzer.jsx's `calc` useMemo
// returns null when this is false, which is the single choke point every
// consumer (results-grid display, the Save-to-Blueprint gate, the red
// qualification badge, and the module-landing progress pill) already reads
// through — so none of those need their own copy of this check.
//
// ── Addendum (mortgage-balance coercion fix) ───────────────────────────────
// The characterization pass proved the currentFMV-only gate was necessary but
// NOT sufficient: `existingMortgageBalance` and `refiRate` are also `null`-
// seeded with NO calc-boundary fallback, so a blank one reaches the engine as
// raw `null` and coerces to 0 in arithmetic — a blank balance makes a home
// look paid off ($558k equity vs $158k at a real $400k balance, all persisted
// to Blueprint §9), and a blank refiRate makes P&I compute at 0% interest.
// Both inputs cross scenarios (balance → all three; refiRate → keepAndRefi
// P&I + deferredSale amortization), and the headline equity overstatement is a
// SHARED output (calculateSellNow), so the gate must be GLOBAL, not refi-local.
// Requiring them here returns `calc: null` before any coerced input reaches the
// engine — one upstream gate, no engine-internal null-guards.
//
// Deliberate asymmetry (do NOT "simplify" this to uniform `> 0` — it is not a
// typo):
//   • currentFMV must be `> 0`      — a $0 home is nonsense.
//   • existingMortgageBalance must be finite & present; an explicit `0` PASSES
//     (paid-off / free-and-clear home is valid), blank/`null` FAILS. Blank ≠
//     paid-off: the user must actively type `0` to assert free-and-clear. Cost
//     of a false gate is one keystroke; cost of a false pass is the $558k lie.
//   • refiRate must be finite & present; an explicit `0` PASSES genuineness.
//     A 0% rate is degenerate, but that is INPUT VALIDATION, a separate
//     concern — genuineness only asks "did the user supply this input."

/**
 * @param {{currentFMV?: number|null, existingMortgageBalance?: number|null, refiRate?: number|null}|null|undefined} inputs
 * @returns {boolean}
 */
export function hasGenuineHomeData(inputs) {
  return (
    Number.isFinite(inputs?.currentFMV) && inputs.currentFMV > 0 &&
    Number.isFinite(inputs?.existingMortgageBalance) &&   // explicit 0 passes; blank/null fails
    Number.isFinite(inputs?.refiRate)                     // explicit 0 passes genuineness (0% is a separate validation concern)
  );
}
