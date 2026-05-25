/**
 * InputsPanel tests (§7.2 / §7.3 / §7.7).
 *
 * Covers:
 *   - Path-conditional subpanel rendering for all six paths
 *   - CommonFields + PlanTypeSelector always render
 *   - TierOverride visibility per §7.2 R4–R5
 *   - ReceiptFormDropdown default and hidden behaviors
 *   - Field-write round-trip via the m5Store setter
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import InputsPanel from '../InputsPanel/index.jsx';
import { useM5Store } from '@/src/stores/m5Store';

const ASSET_ID = 'pension-test-1';

function seedInputs(inputs) {
  useM5Store.setState((state) => ({
    pensionValuation: {
      ...state.pensionValuation,
      assets: {
        ...state.pensionValuation.assets,
        [ASSET_ID]: { ...(state.pensionValuation.assets[ASSET_ID] ?? {}), inputs },
      },
    },
  }));
}

beforeEach(() => {
  localStorage.clear();
  useM5Store.persist?.rehydrate?.();
  useM5Store.setState((state) => ({
    pensionValuation: { ...state.pensionValuation, assets: {} },
  }));
});

describe('InputsPanel — path-conditional rendering (§7.2 / §7.3)', () => {
  it('TC-PVA-InputsPanel-1: CommonFields renders for any path', () => {
    seedInputs({});
    render(<InputsPanel assetId={ASSET_ID} path="tier_1" />);
    expect(screen.getByTestId('pva-input-participantDOB')).toBeInTheDocument();
    expect(screen.getByTestId('pva-input-caseEffectiveDate')).toBeInTheDocument();
    expect(screen.getByTestId('pva-input-mortalityTable')).toBeInTheDocument();
    expect(screen.getByTestId('pva-input-discountRateBps')).toBeInTheDocument();
    expect(screen.getByTestId('pva-input-cola')).toBeInTheDocument();
    expect(screen.getByTestId('pva-input-planAdministratorOfferedLumpSum')).toBeInTheDocument();
  });

  it('TC-PVA-InputsPanel-2: path=tier_1 renders Tier1And2Fields with Tier 1 label and accruedMonthlyBenefitAtNRA', () => {
    seedInputs({});
    render(<InputsPanel assetId={ASSET_ID} path="tier_1" />);
    expect(screen.getByText(/Tier 1 inputs — Accrued benefit known/i)).toBeInTheDocument();
    expect(screen.getByTestId('pva-input-accruedMonthlyBenefitAtNRA')).toBeInTheDocument();
    expect(screen.getByTestId('pva-input-planNRA')).toBeInTheDocument();
  });

  it('TC-PVA-InputsPanel-3: path=tier_2 renders Tier1And2Fields with Tier 2 label', () => {
    seedInputs({});
    render(<InputsPanel assetId={ASSET_ID} path="tier_2" />);
    expect(screen.getByText(/Tier 2 inputs — Estimated accrued benefit/i)).toBeInTheDocument();
    expect(screen.getByTestId('pva-input-accruedMonthlyBenefitAtNRA')).toBeInTheDocument();
  });

  it('TC-PVA-InputsPanel-4: path=tier_3 renders Tier3Fields with currentAccruedMonthlyBenefit and coverture dates', () => {
    seedInputs({});
    render(<InputsPanel assetId={ASSET_ID} path="tier_3" />);
    expect(screen.getByText(/Tier 3 inputs — Coverture/i)).toBeInTheDocument();
    expect(screen.getByTestId('pva-input-currentAccruedMonthlyBenefit')).toBeInTheDocument();
    expect(screen.getByTestId('pva-input-dateOfHire')).toBeInTheDocument();
    expect(screen.getByTestId('pva-input-dateOfMarriage')).toBeInTheDocument();
    expect(screen.getByTestId('pva-input-maritalCutoffDate')).toBeInTheDocument();
    expect(screen.getByTestId('pva-input-expectedRetirementAge')).toBeInTheDocument();
    // Spec §7.3.4: accruedMonthlyBenefitAtNRA NOT in Tier 3 inputs.
    expect(screen.queryByTestId('pva-input-accruedMonthlyBenefitAtNRA')).not.toBeInTheDocument();
  });

  it('TC-PVA-InputsPanel-5: path=in_pay_status renders InPayFields with monthlyBenefit + benefitStartDate', () => {
    seedInputs({});
    render(<InputsPanel assetId={ASSET_ID} path="in_pay_status" />);
    expect(screen.getByText(/In-pay-status inputs/i)).toBeInTheDocument();
    expect(screen.getByTestId('pva-input-monthlyBenefit')).toBeInTheDocument();
    expect(screen.getByTestId('pva-input-benefitStartDate')).toBeInTheDocument();
    expect(screen.getByTestId('pva-input-formOfBenefitInPay')).toBeInTheDocument();
    // Spec §7.3.5: planNRA, vestingStatus, accruedMonthlyBenefitAtNRA NOT in in-pay.
    expect(screen.queryByTestId('pva-input-planNRA')).not.toBeInTheDocument();
    expect(screen.queryByTestId('pva-input-vestingStatus')).not.toBeInTheDocument();
  });

  it('TC-PVA-InputsPanel-6: path=cash_balance renders CashBalanceFields with currentAccountBalance and applyCoverture toggle', () => {
    seedInputs({});
    render(<InputsPanel assetId={ASSET_ID} path="cash_balance" />);
    expect(screen.getByText(/Cash-balance inputs/i)).toBeInTheDocument();
    expect(screen.getByTestId('pva-input-currentAccountBalance')).toBeInTheDocument();
    expect(screen.getByTestId('pva-input-applyCoverture')).toBeInTheDocument();
    // Coverture dates hidden until applyCoverture=true.
    expect(screen.queryByTestId('pva-input-dateOfHire')).not.toBeInTheDocument();
  });

  it('TC-PVA-InputsPanel-6b: applyCoverture=true on cash_balance reveals coverture date fields', () => {
    seedInputs({ applyCoverture: true });
    render(<InputsPanel assetId={ASSET_ID} path="cash_balance" />);
    expect(screen.getByTestId('pva-input-dateOfHire')).toBeInTheDocument();
    expect(screen.getByTestId('pva-input-dateOfMarriage')).toBeInTheDocument();
    expect(screen.getByTestId('pva-input-maritalCutoffDate')).toBeInTheDocument();
    expect(screen.getByTestId('pva-input-expectedRetirementAge')).toBeInTheDocument();
  });

  it('TC-PVA-InputsPanel-7: path=flag_only renders FlagOnlyFields and hides ReceiptFormDropdown', () => {
    seedInputs({ planType: 'multi_employer' });
    render(<InputsPanel assetId={ASSET_ID} path="flag_only" />);
    expect(screen.getByTestId('pva-flagonly-copy')).toBeInTheDocument();
    expect(screen.queryByTestId('pva-input-receiptForm')).not.toBeInTheDocument();
  });

  it('TC-PVA-InputsPanel-8: PlanTypeSelector renders for all paths and writes planType via setter', () => {
    seedInputs({});
    render(<InputsPanel assetId={ASSET_ID} path="tier_3" />);
    // Post wizard-migration (PR-D): the `pva-input-planType` testid sits on
    // the WizardSelector wrapper <div>; the native <select> is the inner
    // element. Navigate from wrapper to control for the change event.
    const sel = screen.getByTestId('pva-input-planType').querySelector('select');
    fireEvent.change(sel, { target: { value: 'private_db_cash_balance' } });
    expect(useM5Store.getState().pensionValuation.assets[ASSET_ID].inputs.planType).toBe('private_db_cash_balance');
  });

  it('TC-PVA-InputsPanel-9a: TierOverride visible only when planType=private_db_traditional + tier_1/2/3 path', () => {
    seedInputs({ planType: 'private_db_traditional' });
    render(<InputsPanel assetId={ASSET_ID} path="tier_3" />);
    // PR-D: TierOverride now uses WizardRadio (stacked) — per-option testids
    // come from the primitive as `wizard-radio-option-${value}`.
    expect(screen.getByTestId('wizard-radio-option-tier_1')).toBeInTheDocument();
    expect(screen.getByTestId('wizard-radio-option-tier_2')).toBeInTheDocument();
    expect(screen.getByTestId('wizard-radio-option-tier_3')).toBeInTheDocument();
  });

  it('TC-PVA-InputsPanel-9b: TierOverride hidden when planType is non-private-DB (e.g. cash_balance subtype)', () => {
    seedInputs({ planType: 'private_db_cash_balance' });
    render(<InputsPanel assetId={ASSET_ID} path="cash_balance" />);
    // The entire WizardRadio root is absent when TierOverride returns null;
    // per-option testids are absent transitively.
    expect(screen.queryByTestId('pva-input-tierOverride')).not.toBeInTheDocument();
    expect(screen.queryByTestId('wizard-radio-option-tier_1')).not.toBeInTheDocument();
  });

  it('TC-PVA-InputsPanel-9c: TierOverride hides tier_3 when frozenRoutingApplied prop is true (R4)', () => {
    // Prop-threaded per PR 3 Phase 2 TierOverride flag-timing fix — eliminates
    // the m5Store roundtrip and the 1-cycle staleness window that briefly
    // showed tier_3 before the store hydrated.
    seedInputs({ planType: 'private_db_traditional' });
    render(<InputsPanel assetId={ASSET_ID} path="tier_1" frozenRoutingApplied={true} />);
    expect(screen.getByTestId('wizard-radio-option-tier_1')).toBeInTheDocument();
    expect(screen.getByTestId('wizard-radio-option-tier_2')).toBeInTheDocument();
    expect(screen.queryByTestId('wizard-radio-option-tier_3')).not.toBeInTheDocument();
  });

  it('TC-PVA-InputsPanel-10a: ReceiptFormDropdown displays AND commits DEFAULT_RECEIPT_FORM_BY_PATH[path] when inputs.receiptForm is null (Defect-#2 fix)', () => {
    seedInputs({});
    render(<InputsPanel assetId={ASSET_ID} path="tier_3" />);
    // PR-D: navigate from the WizardSelector wrapper to the inner <select>.
    const sel = screen.getByTestId('pva-input-receiptForm').querySelector('select');
    expect(sel).toHaveValue('monthly_db_stream'); // default for tier_3
    // §7.2 v2 Defect-#2: the displayed default is also committed to the
    // store — a user who accepts the default still submits a real selection.
    expect(useM5Store.getState().pensionValuation.assets[ASSET_ID].inputs.receiptForm).toBe('monthly_db_stream');
  });

  it('TC-PVA-InputsPanel-10b: ReceiptFormDropdown override writes inputs.receiptForm', () => {
    seedInputs({});
    render(<InputsPanel assetId={ASSET_ID} path="cash_balance" />);
    const sel = screen.getByTestId('pva-input-receiptForm').querySelector('select');
    expect(sel).toHaveValue('lump_sum_rollover_to_ira'); // default for cash_balance
    fireEvent.change(sel, { target: { value: 'lump_sum_cash_taxable' } });
    expect(useM5Store.getState().pensionValuation.assets[ASSET_ID].inputs.receiptForm).toBe('lump_sum_cash_taxable');
  });

  it('TC-PVA-InputsPanel-11: discountRateBps numeric field writes value through to inputs', () => {
    seedInputs({});
    render(<InputsPanel assetId={ASSET_ID} path="tier_1" />);
    // PR-D: numeric fields route through NumericFieldBridge → WizardField;
    // the testid sits on the bridge wrapper, the native input is inside.
    const input = screen.getByTestId('pva-input-discountRateBps').querySelector('input');
    fireEvent.change(input, { target: { value: '5234' } });
    expect(useM5Store.getState().pensionValuation.assets[ASSET_ID].inputs.discountRateBps).toBe(5234);
  });

  it('TC-PVA-InputsPanel-12: clearing a numeric field writes null (not 0)', () => {
    seedInputs({ cola: 2.5 });
    render(<InputsPanel assetId={ASSET_ID} path="tier_1" />);
    const input = screen.getByTestId('pva-input-cola').querySelector('input');
    fireEvent.change(input, { target: { value: '' } });
    expect(useM5Store.getState().pensionValuation.assets[ASSET_ID].inputs.cola).toBeNull();
  });

  // PR-D post-smoke regression. Earlier per-keystroke `[50, 80]` clamps on
  // planNRA and expectedRetirementAge made these fields untypeable from blank:
  // each first digit clamped up to 50, then the controlled re-render appended
  // the next digit on top of the clamped display. Browser smoke confirmed.
  // The clamps were removed; engine validates range, not the input.
  it('TC-PVA-InputsPanel-13: planNRA accepts a sub-50 keystroke unclamped (regression)', () => {
    seedInputs({});
    render(<InputsPanel assetId={ASSET_ID} path="tier_1" />);
    const input = screen.getByTestId('pva-input-planNRA').querySelector('input');
    fireEvent.change(input, { target: { value: '12' } });
    expect(useM5Store.getState().pensionValuation.assets[ASSET_ID].inputs.planNRA).toBe(12);
  });

  it('TC-PVA-InputsPanel-14: expectedRetirementAge accepts a sub-50 keystroke unclamped (regression)', () => {
    seedInputs({});
    render(<InputsPanel assetId={ASSET_ID} path="tier_3" />);
    const input = screen.getByTestId('pva-input-expectedRetirementAge').querySelector('input');
    fireEvent.change(input, { target: { value: '12' } });
    expect(useM5Store.getState().pensionValuation.assets[ASSET_ID].inputs.expectedRetirementAge).toBe(12);
  });

  // ─── §7.2 v2 — PensionStatusSelector + ReceiptForm commit effect ───────
  it('TC-PVA-InputsPanel-15a: PensionStatusSelector renders 3 options for private_db_traditional', () => {
    seedInputs({ planType: 'private_db_traditional', accrualStatus: 'accruing' });
    render(<InputsPanel assetId={ASSET_ID} path="tier_3" />);
    expect(screen.getByTestId('pva-input-accrualStatus')).toBeInTheDocument();
    expect(screen.getByTestId('wizard-radio-option-accruing')).toBeInTheDocument();
    expect(screen.getByTestId('wizard-radio-option-frozen')).toBeInTheDocument();
    expect(screen.getByTestId('wizard-radio-option-in_pay_status')).toBeInTheDocument();
  });

  it('TC-PVA-InputsPanel-15b: PensionStatusSelector hidden for non-traditional plan types', () => {
    seedInputs({ planType: 'private_db_cash_balance' });
    render(<InputsPanel assetId={ASSET_ID} path="cash_balance" />);
    expect(screen.queryByTestId('pva-input-accrualStatus')).not.toBeInTheDocument();
  });

  it('TC-PVA-InputsPanel-15c: PensionStatusSelector writes inputs.accrualStatus on selection', () => {
    seedInputs({ planType: 'private_db_traditional', accrualStatus: 'accruing' });
    render(<InputsPanel assetId={ASSET_ID} path="tier_3" />);
    const frozenInput = screen
      .getByTestId('wizard-radio-option-frozen')
      .querySelector('input[type="radio"]');
    fireEvent.click(frozenInput);
    expect(useM5Store.getState().pensionValuation.assets[ASSET_ID].inputs.accrualStatus).toBe('frozen');
  });

  it('TC-PVA-InputsPanel-16: ReceiptFormDropdown commits the path default when inputs.receiptForm is null', () => {
    // Defect-#2 fix: the effect commits the path default into the store on
    // first render, so a user accepting the default still submits a real
    // selection (previously the value displayed but never reached the store).
    seedInputs({});
    render(<InputsPanel assetId={ASSET_ID} path="in_pay_status" />);
    expect(useM5Store.getState().pensionValuation.assets[ASSET_ID].inputs.receiptForm).toBe('monthly_db_stream');
  });
});
