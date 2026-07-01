/**
 * Shared "is §8 Support Analysis still in sync with the current wizard
 * inputs?" predicate.
 *
 * §8's completion state used to be derived purely from
 * blueprintStore.sections.s8.status === 'complete', with no invalidation on
 * input edit: once saved, the wizard showed a permanent "Saved" pill and the
 * Blueprint kept whatever figure was persisted at save time, even after the
 * user changed an input and the on-screen estimate moved. Same shape as
 * PVA's #97 gating defect — state keyed off presence/status instead of
 * validity-relative-to-current-inputs.
 *
 * buildInputSnapshot() is the canonical "what did the user have entered"
 * shape, used both when persisting (SupportEstimator.jsx's onSave embeds it
 * in s8.data) and when comparing (isSupportSaved below) — a single shape so
 * the two can never drift out of sync with each other.
 */

export function buildInputSnapshot(inputs) {
  return {
    region: inputs?.region ?? null,
    incomeYou: inputs?.incomeYou ?? '',
    incomeSpouse: inputs?.incomeSpouse ?? '',
    numChildren: inputs?.numChildren ?? '',
    parentingPct: inputs?.parentingPct ?? null,
    childcare: inputs?.childcare ?? '',
    health: inputs?.health ?? '',
    marriageYears: inputs?.marriageYears ?? '',
    existingSupport: inputs?.existingSupport ?? '',
  };
}

function deepEqual(a, b) {
  if (a === b) return true;
  if (typeof a !== 'object' || a === null || typeof b !== 'object' || b === null) return false;
  const aKeys = Object.keys(a);
  const bKeys = Object.keys(b);
  if (aKeys.length !== bKeys.length) return false;
  return aKeys.every((key) => deepEqual(a[key], b[key]));
}

/**
 * @param {object} currentInputs  live supportRange.inputs
 * @param {object} s8Section      blueprintStore.sections.s8
 * @returns {boolean} true iff §8 is complete AND its persisted snapshot
 *   matches the inputs as they stand right now — the single display source
 *   of truth for the Save-button-vs-Saved-pill decision. Derived, not stored.
 */
export function isSupportSaved(currentInputs, s8Section) {
  if (s8Section?.status !== 'complete') return false;
  const savedSnapshot = s8Section?.data?._inputSnapshot;
  if (!savedSnapshot) return false;
  return deepEqual(buildInputSnapshot(currentInputs), savedSnapshot);
}
