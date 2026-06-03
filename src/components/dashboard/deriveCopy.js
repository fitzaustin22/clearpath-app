// Derives the dashboard hero copy (headline + subhead) from the ALREADY-derived
// journey view-model produced by deriveJourney. This is a pure presentation
// mapping: it CONSUMES journey state (terminal flag/kind + per-station status) as
// its single source of truth and never recomputes progress or terminal state.
//
// Branch order is terminal-FIRST, then — for a normal in-progress journey — by
// the count of modules whose status is 'done' (the same set that fills the gold
// trail). Bands: 0 / 1-2 / 3-4 / 5-6 (a normal journey always has exactly one
// 'current' station, so done-count tops out at 6).

const NORMAL_SUBHEAD = "You're building real financial clarity, one step at a time.";

/**
 * @param {{terminal: boolean, terminalKind: ('complete'|'locked'|null),
 *          modules: {status: string}[]}} journey  output of deriveJourney
 * @returns {{headline: string, subhead: string}}
 */
export function deriveCopy(journey) {
  if (journey.terminal) {
    if (journey.terminalKind === 'complete') {
      return {
        headline: "You've reached clarity.",
        subhead: 'Every module complete — your Blueprint is ready to assemble.',
      };
    }
    // 'locked' — finished everything available in the current plan.
    return {
      headline: "You've completed everything in your plan.",
      subhead: "You've finished every step available in your current plan.",
    };
  }

  const doneCount = journey.modules.filter((m) => m.status === 'done').length;

  let headline;
  if (doneCount === 0) headline = 'Your path to clarity starts here.';
  else if (doneCount <= 2) headline = "You're on your way.";
  else if (doneCount <= 4) headline = "You're well into the journey.";
  else headline = "You're in the home stretch."; // 5-6

  return { headline, subhead: NORMAL_SUBHEAD };
}
