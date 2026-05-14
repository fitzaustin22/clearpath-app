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
    const sel = screen.getByTestId('pva-input-planType');
    fireEvent.change(sel, { target: { value: 'private_db_cash_balance' } });
    expect(useM5Store.getState().pensionValuation.assets[ASSET_ID].inputs.planType).toBe('private_db_cash_balance');
  });

  it('TC-PVA-InputsPanel-9a: TierOverride visible only when planType=private_db_traditional + tier_1/2/3 path', () => {
    seedInputs({ planType: 'private_db_traditional' });
    render(<InputsPanel assetId={ASSET_ID} path="tier_3" />);
    expect(screen.getByTestId('pva-input-tierOverride-tier_1')).toBeInTheDocument();
    expect(screen.getByTestId('pva-input-tierOverride-tier_2')).toBeInTheDocument();
    expect(screen.getByTestId('pva-input-tierOverride-tier_3')).toBeInTheDocument();
  });

  it('TC-PVA-InputsPanel-9b: TierOverride hidden when planType is non-private-DB (e.g. cash_balance subtype)', () => {
    seedInputs({ planType: 'private_db_cash_balance' });
    render(<InputsPanel assetId={ASSET_ID} path="cash_balance" />);
    expect(screen.queryByTestId('pva-input-tierOverride-tier_1')).not.toBeInTheDocument();
  });

  it('TC-PVA-InputsPanel-9c: TierOverride hides tier_3 when frozenRoutingApplied prop is true (R4)', () => {
    // Prop-threaded per PR 3 Phase 2 TierOverride flag-timing fix — eliminates
    // the m5Store roundtrip and the 1-cycle staleness window that briefly
    // showed tier_3 before the store hydrated.
    seedInputs({ planType: 'private_db_traditional' });
    render(<InputsPanel assetId={ASSET_ID} path="tier_1" frozenRoutingApplied={true} />);
    expect(screen.getByTestId('pva-input-tierOverride-tier_1')).toBeInTheDocument();
    expect(screen.getByTestId('pva-input-tierOverride-tier_2')).toBeInTheDocument();
    expect(screen.queryByTestId('pva-input-tierOverride-tier_3')).not.toBeInTheDocument();
  });

  it('TC-PVA-InputsPanel-10a: ReceiptFormDropdown defaults to DEFAULT_RECEIPT_FORM_BY_PATH[path] when inputs.receiptForm is null', () => {
    seedInputs({});
    render(<InputsPanel assetId={ASSET_ID} path="tier_3" />);
    const sel = screen.getByTestId('pva-input-receiptForm');
    expect(sel).toHaveValue('monthly_db_stream'); // default for tier_3
  });

  it('TC-PVA-InputsPanel-10b: ReceiptFormDropdown override writes inputs.receiptForm', () => {
    seedInputs({});
    render(<InputsPanel assetId={ASSET_ID} path="cash_balance" />);
    const sel = screen.getByTestId('pva-input-receiptForm');
    expect(sel).toHaveValue('lump_sum_rollover_to_ira'); // default for cash_balance
    fireEvent.change(sel, { target: { value: 'lump_sum_cash_taxable' } });
    expect(useM5Store.getState().pensionValuation.assets[ASSET_ID].inputs.receiptForm).toBe('lump_sum_cash_taxable');
  });

  it('TC-PVA-InputsPanel-11: discountRateBps numeric field writes value through to inputs', () => {
    seedInputs({});
    render(<InputsPanel assetId={ASSET_ID} path="tier_1" />);
    const input = screen.getByTestId('pva-input-discountRateBps');
    fireEvent.change(input, { target: { value: '5234' } });
    expect(useM5Store.getState().pensionValuation.assets[ASSET_ID].inputs.discountRateBps).toBe(5234);
  });

  it('TC-PVA-InputsPanel-12: clearing a numeric field writes null (not 0)', () => {
    seedInputs({ cola: 2.5 });
    render(<InputsPanel assetId={ASSET_ID} path="tier_1" />);
    const input = screen.getByTestId('pva-input-cola');
    fireEvent.change(input, { target: { value: '' } });
    expect(useM5Store.getState().pensionValuation.assets[ASSET_ID].inputs.cola).toBeNull();
  });
});
