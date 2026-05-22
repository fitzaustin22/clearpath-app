'use client';

/**
 * TierOverride — user-controlled tier-routing override per spec §7.2 R4–R5.
 *
 * Visibility rules:
 *   - Hidden when `planType !== 'private_db_traditional'` (routing is forced
 *     by R1/R2/R3 for cash-balance and flag-only plan types).
 *   - Hidden when `path === 'in_pay_status'` (no tier override applies).
 *   - When `path === 'tier_1'` from frozen-routing default (§7.2 R4), the
 *     `tier_3` option is intentionally absent from the override choices.
 *   - When `path === 'tier_3'` from accruing default (§7.2 R5), all three
 *     tier options are available so the user may override to `tier_1` or
 *     `tier_2`.
 *
 * Field: `tierOverride` (nullable; null = follow routing default).
 * The orchestrator honors `inputs.tierOverride` to resolve the effective
 * path before dispatch to the engine.
 */

import { FieldSection } from './_fields.jsx';
import { T } from '@/src/lib/brand/tokens';
import WizardRadio from '@/src/components/wizard/WizardRadio';

// Tier labels are split at the em-dash into `label` + `description` per
// the WizardRadio stacked-variant API (the docstring asserts description
// is mandatory — "the choice differentiator"). The user-visible words are
// unchanged; the visual chrome now lays them out as a bold label with a
// muted description-below per option, instead of a single em-dash-joined
// line. Ratified by owner during PR-D Phase 1.
const ALL_TIERS = [
  { value: 'tier_1', label: 'Tier 1', description: 'Accrued benefit known' },
  { value: 'tier_2', label: 'Tier 2', description: 'Estimated accrued benefit' },
  { value: 'tier_3', label: 'Tier 3', description: 'Coverture' },
];

const TIER_OPTIONS_FROZEN = ALL_TIERS.filter((o) => o.value !== 'tier_3');

// WizardRadio has no group-level helper prop; the group-level helper copy
// renders as a muted <p> directly under the control (Visual-D fallback
// per PR-B SE migration).
const HELPER_BELOW = {
  fontFamily: T.FONT_BODY,
  fontSize: 13,
  color: T.NAVY_55,
  margin: '6px 0 0',
};

export default function TierOverride({ inputs, path, frozenRoutingApplied = false, onChange }) {
  // Routing-locked paths: no override surface.
  if (inputs.planType !== 'private_db_traditional') return null;
  if (path === 'in_pay_status' || path === 'cash_balance' || path === 'flag_only') return null;
  if (!path) return null;

  // Frozen-routing visibility comes from the prop threaded through the
  // orchestrator (prePopResult._frozenRoutingApplied), NOT from inputs —
  // this eliminates the 1-cycle staleness window where the m5Store flag
  // hasn't propagated yet (PR 2 Phase 2 Deviation #6).
  const isFrozen = frozenRoutingApplied === true;
  const options = isFrozen ? TIER_OPTIONS_FROZEN : ALL_TIERS;

  // The effective value: an explicit override wins; otherwise reflect the
  // resolved path so the radio shows the active selection.
  const effective = inputs.tierOverride ?? path;

  const helper = isFrozen
    ? 'Plan is frozen — Tier 3 (coverture) is unavailable. Default Tier 1; you may override to Tier 2.'
    : 'Default Tier 3 (coverture). You may override to Tier 1 or Tier 2 if you have an accrued-benefit anchor.';

  return (
    <FieldSection title="Tier selection">
      <WizardRadio
        field="tierOverride"
        legend="Compute path"
        variant="stacked"
        value={effective}
        onChange={onChange}
        options={options}
        data-testid="pva-input-tierOverride"
      />
      <p style={HELPER_BELOW}>{helper}</p>
    </FieldSection>
  );
}
