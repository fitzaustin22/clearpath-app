'use client';

/**
 * InputsPanel — path-conditional form for PVA inputs per spec §7.2 / §7.3.
 *
 * Reads inputs from `m5Store.pensionValuation.assets[assetId].inputs`; writes
 * back via the `setPVAAssetInputs` whole-object replace setter (with a
 * component-level partial-merge in `updateField`). Path resolution is done
 * upstream in PVA.jsx (consumer of the §7.10.3 discriminated union); this
 * component takes a resolved `path` prop and renders the matching subpanel.
 *
 * Pre-pop integration is orchestrator-owned (PVA.jsx); InputsPanel does NOT
 * call `prePopulatePVAInputs`. The orchestrator persists the pre-pop result
 * into m5Store before this component mounts.
 *
 * Brand-token discipline (LL-7): inline styles via `T.*` only; no Tailwind
 * utility chains. Selector discipline (LL-9): primitive selectors; partial
 * merge happens in `updateField` outside any selector.
 */

import { useM5Store } from '@/src/stores/m5Store';
import { T } from '@/src/lib/brand/tokens';
import CommonFields from './CommonFields.jsx';
import PlanTypeSelector from './PlanTypeSelector.jsx';
import PensionStatusSelector from './PensionStatusSelector.jsx';
import TierOverride from './TierOverride.jsx';
import Tier1And2Fields from './Tier1And2Fields.jsx';
import Tier3Fields from './Tier3Fields.jsx';
import InPayFields from './InPayFields.jsx';
import CashBalanceFields from './CashBalanceFields.jsx';
import FlagOnlyFields from './FlagOnlyFields.jsx';
import ReceiptFormDropdown from './ReceiptFormDropdown.jsx';

/**
 * @param {object} props
 * @param {string} props.assetId
 * @param {'tier_1' | 'tier_2' | 'tier_3' | 'in_pay_status' | 'cash_balance' | 'flag_only' | null} props.path
 * @param {boolean} [props.frozenRoutingApplied]  Derived in the orchestrator
 *   from `inputs.accrualStatus === 'frozen'` (§7.2 v2) and threaded here so
 *   TierOverride can hide the tier_3 option on the same render the user
 *   toggles the Pension-status control.
 */
export default function InputsPanel({ assetId, path, frozenRoutingApplied = false }) {
  // LL-9: primitive selectors only.
  const inputs = useM5Store((s) => s.pensionValuation?.assets?.[assetId]?.inputs);
  const setPVAAssetInputs = useM5Store((s) => s.setPVAAssetInputs);

  const safeInputs = inputs ?? {};

  // Partial-merge via the freshest store snapshot. Reading from
  // `useM5Store.getState()` at call time (rather than closing over
  // `safeInputs`) is the defensive fix for an effect-ordering hazard:
  // sibling effects (e.g. ReceiptFormDropdown's path-default commit) and
  // the PVA orchestrator's one-shot pre-pop both run after the first
  // render commits, depth-first — so a closure over render-1 `safeInputs`
  // would clobber data the parent effect has just written.
  const updateField = (field, value) => {
    const current = useM5Store.getState().pensionValuation?.assets?.[assetId]?.inputs ?? {};
    setPVAAssetInputs(assetId, { ...current, [field]: value });
  };

  return (
    <div
      data-testid="pva-inputs-panel"
      style={{
        fontFamily: T.FONT_BODY,
        color: T.NAVY,
      }}
    >
      <PlanTypeSelector inputs={safeInputs} onChange={updateField} />
      <PensionStatusSelector inputs={safeInputs} onChange={updateField} />
      <CommonFields inputs={safeInputs} onChange={updateField} />

      <TierOverride
        inputs={safeInputs}
        path={path}
        frozenRoutingApplied={frozenRoutingApplied}
        onChange={updateField}
      />

      {path === 'tier_1' && (
        <Tier1And2Fields tier="tier_1" inputs={safeInputs} onChange={updateField} />
      )}
      {path === 'tier_2' && (
        <Tier1And2Fields tier="tier_2" inputs={safeInputs} onChange={updateField} />
      )}
      {path === 'tier_3' && <Tier3Fields inputs={safeInputs} onChange={updateField} />}
      {path === 'in_pay_status' && <InPayFields inputs={safeInputs} onChange={updateField} />}
      {path === 'cash_balance' && <CashBalanceFields inputs={safeInputs} onChange={updateField} />}
      {path === 'flag_only' && <FlagOnlyFields planType={safeInputs.planType} />}

      <ReceiptFormDropdown inputs={safeInputs} path={path} onChange={updateField} />
    </div>
  );
}
