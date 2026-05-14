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

import { RadioGroup, FieldSection } from './_fields.jsx';

const ALL_TIERS = [
  { value: 'tier_1', label: 'Tier 1 — Accrued benefit known' },
  { value: 'tier_2', label: 'Tier 2 — Estimated accrued benefit' },
  { value: 'tier_3', label: 'Tier 3 — Coverture' },
];

const TIER_OPTIONS_FROZEN = ALL_TIERS.filter((o) => o.value !== 'tier_3');

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

  return (
    <FieldSection title="Tier selection">
      <RadioGroup
        id="pva-input-tierOverride"
        label="Compute path"
        helper={
          isFrozen
            ? 'Plan is frozen — Tier 3 (coverture) is unavailable. Default Tier 1; you may override to Tier 2.'
            : 'Default Tier 3 (coverture). You may override to Tier 1 or Tier 2 if you have an accrued-benefit anchor.'
        }
        value={effective}
        onChange={(v) => onChange('tierOverride', v)}
        options={options}
      />
    </FieldSection>
  );
}
