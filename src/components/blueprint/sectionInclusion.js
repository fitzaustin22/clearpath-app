/**
 * v1 section-inclusion predicate, factored for reuse (V2 Phase 1, pinned
 * resolution: "reuse v1's existing section-emptiness logic").
 *
 * The consumer Blueprint's entire emptiness decision is the status check that
 * lived inline at BlueprintSection.jsx:35 (`status === 'empty'`): it drives
 * the `blueprint-section-empty` class, the dimmed header treatment, and the
 * CTA-instead-of-children swap. Nothing in v1 inspects section data for this
 * decision, and the documented data-while-empty states (s5 face-value, s6
 * QDRO status regression, s10/s11/s12 coerced payloads) mean a data-aware
 * predicate WOULD diverge from consumer behavior — so this stays status-only.
 *
 * Note for V2 consumers: in v1 an "excluded" section still renders (dimmed
 * header + CTA, compacted in export). The V2 attorney document instead OMITS
 * excluded sections with explicit scope disclosure (D-V2-3) — same predicate,
 * different treatment, both downstream of these two functions.
 */

export function isEmptyStatus(status) {
  return status === 'empty';
}

export function isSectionIncluded(sectionKey, sections) {
  const section = sections ? sections[sectionKey] : null;
  if (!section) return false;
  return !isEmptyStatus(section.status);
}
