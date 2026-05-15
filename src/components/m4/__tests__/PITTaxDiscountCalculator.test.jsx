/**
 * PITTaxDiscountCalculator tests — Session 22 PR 2 PVA pre-pop branch.
 *
 * Focused on the third pre-pop source (M5 PVA) added alongside the existing
 * M2 (retirement inventory) and Tool 1 (filing-status rate) sources.
 * Verifies pre-pop firing, banner display, edit-suppression, PVA-over-M2
 * precedence, and the flag_only no-op path.
 *
 * Tests use `userTier="navigator"` to bypass the upgrade gate. Banner text
 * is matched directly (no testid on InfoBanner). Inputs are read from
 * useM4Store after render to verify the pre-pop side effect landed.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import PITTaxDiscountCalculator from '../PITTaxDiscountCalculator.jsx';
import { useM4Store } from '@/src/stores/m4Store';
import { useM2Store } from '@/src/stores/m2Store';
import useBlueprintStore from '@/src/stores/blueprintStore';

const PVA_TIER3_FIXTURE = {
  path: 'tier_3',
  headlinePV: 425000,
  maritalPV: 280000,
  expectedRetirementAge: 67,
  coverturePercent: 0.6588,
  citations: ['IRC §417(e)'],
};

const PVA_FLAG_ONLY_FIXTURE = {
  path: 'flag_only',
  headlinePV: null,
  maritalPV: null,
};

function seedM2Retirement(items) {
  useM2Store.setState((state) => ({
    maritalEstateInventory: { ...state.maritalEstateInventory, items },
  }));
}

beforeEach(() => {
  localStorage.clear();
  useM4Store.persist?.rehydrate?.();
  useM2Store.persist?.rehydrate?.();
  useBlueprintStore.persist?.rehydrate?.();
  useM4Store.getState().resetM4();
  useBlueprintStore.getState().resetBlueprint();
  seedM2Retirement([]);
});

describe('PITTaxDiscountCalculator — PVA pre-pop (Session 22 PR 2)', () => {
  it('TC-PITPVA-1: PVA tier_3 data triggers planBalance / planType / withdrawalStartAge pre-pop', () => {
    useBlueprintStore.getState().updatePensionValuation(PVA_TIER3_FIXTURE);

    render(<PITTaxDiscountCalculator userTier="navigator" />);

    const inputs = useM4Store.getState().pitTaxDiscount.inputs;
    expect(inputs.planBalance).toBe(280000);
    expect(inputs.planType).toBe('pension');
    expect(inputs.withdrawalStartAge).toBe(67);
    expect(useM4Store.getState().pitTaxDiscount.prePopulated.fromPVA).toBe(true);
  });

  it('TC-PITPVA-2: pvaBanner displays maritalPV formatted as currency', () => {
    useBlueprintStore.getState().updatePensionValuation(PVA_TIER3_FIXTURE);

    render(<PITTaxDiscountCalculator userTier="navigator" />);

    expect(
      screen.getByText(/Plan balance pre-filled from Pension Valuation: \$280,000 \(marital share\)/),
    ).toBeInTheDocument();
  });

  it('TC-PITPVA-3: user-edited planBalance suppresses banner (banner not rendered)', () => {
    useBlueprintStore.getState().updatePensionValuation(PVA_TIER3_FIXTURE);
    // Simulate having previously pre-popped, then user edited planBalance away.
    useM4Store.setState((state) => ({
      pitTaxDiscount: {
        ...state.pitTaxDiscount,
        inputs: { ...state.pitTaxDiscount.inputs, planBalance: 999999 },
        prePopulated: { ...state.pitTaxDiscount.prePopulated, fromPVA: true },
      },
    }));

    render(<PITTaxDiscountCalculator userTier="navigator" />);

    // Banner suppressed because user's edited balance ≠ pvaData.maritalPV.
    expect(
      screen.queryByText(/Plan balance pre-filled from Pension Valuation/),
    ).not.toBeInTheDocument();
    // User's edit preserved.
    expect(useM4Store.getState().pitTaxDiscount.inputs.planBalance).toBe(999999);
  });

  it('TC-PITPVA-4: PVA + M2 both present — M2 banner suppressed, PVA banner shown', () => {
    seedM2Retirement([
      { id: 'r1', category: 'retirement', currentValue: 150000 },
    ]);
    useBlueprintStore.getState().updatePensionValuation(PVA_TIER3_FIXTURE);

    render(<PITTaxDiscountCalculator userTier="navigator" />);

    // PVA banner present.
    expect(
      screen.getByText(/Plan balance pre-filled from Pension Valuation/),
    ).toBeInTheDocument();
    // M2 banner suppressed (precedence).
    expect(
      screen.queryByText(/Plan balance pre-filled from your Marital Estate Inventory/),
    ).not.toBeInTheDocument();
    // PVA wins for the planBalance input.
    expect(useM4Store.getState().pitTaxDiscount.inputs.planBalance).toBe(280000);
  });

  it('TC-PITPVA-5: flag_only PVA data (maritalPV null) — no auto-fill, no banner, no fromPVA flag', () => {
    useBlueprintStore.getState().updatePensionValuation(PVA_FLAG_ONLY_FIXTURE);
    const initialPlanBalance = useM4Store.getState().pitTaxDiscount.inputs.planBalance;

    render(<PITTaxDiscountCalculator userTier="navigator" />);

    expect(useM4Store.getState().pitTaxDiscount.inputs.planBalance).toBe(initialPlanBalance);
    expect(useM4Store.getState().pitTaxDiscount.prePopulated.fromPVA).toBe(false);
    expect(
      screen.queryByText(/Plan balance pre-filled from Pension Valuation/),
    ).not.toBeInTheDocument();
  });
});
