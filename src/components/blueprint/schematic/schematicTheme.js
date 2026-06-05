/**
 * Schematic-only design values — LOCAL constants for the Blueprint schematic
 * inset. Per Phase 2 spec: these MUST NOT be added to '@/src/lib/brand/tokens'.
 * They are presentational values for one surface (the dark recessed schematic
 * panel + its liquid-glass cards) and do not belong in the cross-surface
 * brand palette.
 *
 * Sources (verbatim from design_handoff_blueprint_schematic/README.md):
 *   • INSET_NAVY:    #0C183B    panel background
 *   • SCHEMATIC_GOLD #E3C488    zone labels + filled/progress pill text
 *   • The .lg-* glass values are produced by the inline CSS in schematicStyles.js.
 */

export const SCHEMATIC = Object.freeze({
  INSET_NAVY:      '#0C183B',
  SCHEMATIC_GOLD:  '#E3C488',
  ACTIVE_GOLD_INK: '#5B4715',          // pill text color on the active gold-glass pill
  PARCHMENT_DEEP:  '#F1E9D3',          // up-next card bg (matches T.PARCHMENT_DEEP but inlined here for sidebar self-containment)
});
