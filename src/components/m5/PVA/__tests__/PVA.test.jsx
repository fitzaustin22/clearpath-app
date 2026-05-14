/**
 * PVA orchestrator tests (§7.10.3 / LL-17).
 *
 * Verifies the orchestrator consumes all three §7.10.3 discriminated-union
 * variants explicitly:
 *   1. null                                → "no claim" surface
 *   2. {error, missingFields, path: null}  → ValidationErrorPanel
 *   3. {path, inputs, ...}                 → InputsPanel + ResultsPanel
 *
 * Also exercises the seedOverride pathway (bypasses m2 read) and verifies
 * the engine call is gated against the error variant.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import PVA from '../PVA.jsx';
import { useM2Store } from '@/src/stores/m2Store';
import { useM5Store } from '@/src/stores/m5Store';
import { SEED_VARIANTS } from '../__fixtures__/seedVariants.js';

function seedM2(items) {
  useM2Store.setState((state) => ({
    maritalEstateInventory: { ...state.maritalEstateInventory, items },
  }));
}

beforeEach(() => {
  localStorage.clear();
  useM2Store.persist?.rehydrate?.();
  useM5Store.persist?.rehydrate?.();
  seedM2([]);
  useM5Store.setState((state) => ({
    pensionValuation: { ...state.pensionValuation, assets: {} },
  }));
});

describe('PVA orchestrator (§7.10.3 / LL-17)', () => {
  it('TC-PVA-Orchestrator-1: with no asset selected and no seed, renders AssetPicker only', () => {
    seedM2([{ id: 'pen-1', category: 'pensions', planName: 'A', whoseplan: 'Client', accrualStatus: 'accruing' }]);
    render(<PVA />);
    expect(screen.getByTestId('pva-asset-picker')).toBeInTheDocument();
    expect(screen.queryByTestId('pva-no-claim')).not.toBeInTheDocument();
    expect(screen.queryByTestId('pva-validation-error')).not.toBeInTheDocument();
    expect(screen.queryByTestId('pva-inputs-panel')).not.toBeInTheDocument();
  });

  it('TC-PVA-Orchestrator-2 (Variant 3): selecting a normal pension renders InputsPanel + ResultsPanel placeholder', () => {
    seedM2([
      { id: 'pen-1', category: 'pensions', planName: 'A', whoseplan: 'Client', accrualStatus: 'accruing' },
    ]);
    render(<PVA />);
    fireEvent.click(screen.getByTestId('pva-asset-picker-item-pen-1'));

    expect(screen.getByTestId('pva-inputs-panel')).toBeInTheDocument();
    // No m2 fields filled → engine throws → results=null → soft placeholder
    expect(screen.getByTestId('pva-results-placeholder')).toBeInTheDocument();
    expect(screen.queryByTestId('pva-validation-error')).not.toBeInTheDocument();
  });

  it('TC-PVA-Orchestrator-3 (Variant 2): selecting an incomplete in-pay claim renders ValidationErrorPanel', () => {
    seedM2([
      {
        id: 'pen-incomplete',
        category: 'pensions',
        planName: 'Partial',
        whoseplan: 'Client',
        accrualStatus: 'in_pay_status',
        // monthlyBenefit + benefitStartDate intentionally missing — R3 guard fires
      },
    ]);
    render(<PVA />);
    fireEvent.click(screen.getByTestId('pva-asset-picker-item-pen-incomplete'));

    expect(screen.getByTestId('pva-validation-error')).toBeInTheDocument();
    expect(screen.queryByTestId('pva-inputs-panel')).not.toBeInTheDocument();
    expect(screen.queryByTestId('pva-results-panel')).not.toBeInTheDocument();
  });

  it('TC-PVA-Orchestrator-4 (Variant 1): when prePopResult resolves null with selection set, the no-claim message surfaces', async () => {
    seedM2([
      { id: 'pen-other', category: 'pensions', planName: 'Other', whoseplan: 'Client', accrualStatus: 'accruing' },
    ]);
    render(<PVA seedOverride={null} />);
    // Select an existing claim, then mutate m2 out from under it — prePopResult
    // recomputes to null (claim no longer present) and Variant 1 takes over.
    fireEvent.click(screen.getByTestId('pva-asset-picker-item-pen-other'));
    seedM2([]);
    // Async wait — Zustand store update propagates on the next React render tick.
    expect(await screen.findByTestId('pva-no-claim')).toBeInTheDocument();
  });

  it('TC-PVA-Orchestrator-5: seedOverride bypasses m2 and renders the InputsPanel + ResultsPanel for tier_1', () => {
    render(<PVA seedOverride={SEED_VARIANTS.tier1_canonical} />);
    expect(screen.queryByTestId('pva-asset-picker')).not.toBeInTheDocument();
    expect(screen.getByTestId('pva-inputs-panel')).toBeInTheDocument();
    // Real engine call should produce headline PV ≈ $165,783 per fixture pin.
    expect(screen.getByTestId('pva-bignumber-headline')).toBeInTheDocument();
  });

  it('TC-PVA-Orchestrator-6: seedOverride for r3 error renders ValidationErrorPanel + no engine call', () => {
    render(<PVA seedOverride={SEED_VARIANTS.r3_validation_error} />);
    expect(screen.getByTestId('pva-validation-error')).toBeInTheDocument();
    expect(screen.queryByTestId('pva-inputs-panel')).not.toBeInTheDocument();
    expect(screen.queryByTestId('pva-results-panel')).not.toBeInTheDocument();
    expect(screen.queryByTestId('pva-results-placeholder')).not.toBeInTheDocument();
  });

  it('TC-PVA-Orchestrator-7: seedOverride for flag_only_multiemployer renders flag-only banner', () => {
    render(<PVA seedOverride={SEED_VARIANTS.flag_only_multiemployer} />);
    expect(screen.getByTestId('pva-banner-flagonly')).toBeInTheDocument();
    // ReceiptFormDropdown hidden for flag_only
    expect(screen.queryByTestId('pva-input-receiptForm')).not.toBeInTheDocument();
  });

  it('TC-PVA-Orchestrator-8: seedOverride for frozen_routing_banner surfaces frozen banner over Tier 1 numbers', () => {
    render(<PVA seedOverride={SEED_VARIANTS.frozen_routing_banner} />);
    expect(screen.getByTestId('pva-banner-frozen')).toBeInTheDocument();
    expect(screen.getByTestId('pva-bignumber-headline')).toBeInTheDocument();
  });

  it('TC-PVA-Orchestrator-9: seedOverride for legacy_currentvalue_banner surfaces legacy banner over Tier 3 numbers', () => {
    render(<PVA seedOverride={SEED_VARIANTS.legacy_currentvalue_banner} />);
    expect(screen.getByTestId('pva-banner-legacy')).toBeInTheDocument();
    expect(screen.getByTestId('pva-bignumber-marital')).toBeInTheDocument();
    expect(screen.getByTestId('pva-bignumber-total')).toBeInTheDocument();
  });
});
