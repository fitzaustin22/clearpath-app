/**
 * AssetPicker tests (§7.5 / §7.6.4).
 *
 * Covers filtering by `category === 'pensions'`, empty state, selection
 * callback, selected-vs-unselected styling, and the "valued" marker that
 * surfaces when an asset has a results slot in m5Store.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import AssetPicker from '../AssetPicker.jsx';
import { useM2Store } from '@/src/stores/m2Store';
import { useM5Store } from '@/src/stores/m5Store';

function seedM2Items(items) {
  useM2Store.setState((state) => ({
    maritalEstateInventory: {
      ...state.maritalEstateInventory,
      items,
    },
  }));
}

function seedM5Asset(assetId, payload) {
  useM5Store.setState((state) => ({
    pensionValuation: {
      ...state.pensionValuation,
      assets: { ...state.pensionValuation.assets, [assetId]: payload },
    },
  }));
}

beforeEach(() => {
  localStorage.clear();
  useM2Store.persist?.rehydrate?.();
  useM5Store.persist?.rehydrate?.();
  seedM2Items([]);
  useM5Store.setState((state) => ({
    pensionValuation: { ...state.pensionValuation, assets: {} },
  }));
});

describe('AssetPicker (§7.5 / §7.6.4)', () => {
  it('TC-PVA-AssetPicker-1: renders empty-state message when m2Store has zero pension claims', () => {
    seedM2Items([
      // Non-pension items should NOT trigger the picker — empty state wins.
      { id: 'cash-1', category: 'depositAccounts', label: 'Checking' },
      { id: 'retirement-1', category: 'retirement', label: '401(k)' },
    ]);

    render(<AssetPicker selectedAssetId={null} onSelect={() => {}} />);

    expect(screen.getByTestId('pva-asset-picker-empty')).toBeInTheDocument();
    expect(screen.queryByTestId('pva-asset-picker')).not.toBeInTheDocument();
    expect(screen.getByText(/no pension claims found/i)).toBeInTheDocument();
  });

  it('TC-PVA-AssetPicker-2: renders one button per pension claim and filters by category', () => {
    seedM2Items([
      { id: 'pension-1', category: 'pensions', description: 'ABC Corp Pension', titleholder: 'self' },
      { id: 'pension-2', category: 'pensions', description: 'XYZ Pension', titleholder: 'spouse' },
      { id: 'cash-1', category: 'depositAccounts', description: 'Checking' },
      { id: 'retire-1', category: 'retirement', description: '401(k)' },
    ]);

    render(<AssetPicker selectedAssetId={null} onSelect={() => {}} />);

    expect(screen.getByTestId('pva-asset-picker-item-pension-1')).toBeInTheDocument();
    expect(screen.getByTestId('pva-asset-picker-item-pension-2')).toBeInTheDocument();
    // Non-pension items NOT rendered.
    expect(screen.queryByTestId('pva-asset-picker-item-cash-1')).not.toBeInTheDocument();
    expect(screen.queryByTestId('pva-asset-picker-item-retire-1')).not.toBeInTheDocument();
    expect(screen.getByText(/ABC Corp Pension/)).toBeInTheDocument();
    expect(screen.getByText(/XYZ Pension/)).toBeInTheDocument();
  });

  it('TC-PVA-AssetPicker-3: clicking a button calls onSelect with that claim id', () => {
    seedM2Items([
      { id: 'pension-1', category: 'pensions', description: 'ABC Corp Pension', titleholder: 'self' },
    ]);
    const onSelect = vi.fn();

    render(<AssetPicker selectedAssetId={null} onSelect={onSelect} />);
    fireEvent.click(screen.getByTestId('pva-asset-picker-item-pension-1'));

    expect(onSelect).toHaveBeenCalledTimes(1);
    expect(onSelect).toHaveBeenCalledWith('pension-1');
  });

  it('TC-PVA-AssetPicker-4: selected asset has aria-pressed=true and GOLD_TINT background', () => {
    seedM2Items([
      { id: 'pension-1', category: 'pensions', description: 'A', titleholder: 'self' },
      { id: 'pension-2', category: 'pensions', description: 'B', titleholder: 'spouse' },
    ]);

    render(<AssetPicker selectedAssetId="pension-2" onSelect={() => {}} />);
    const btn1 = screen.getByTestId('pva-asset-picker-item-pension-1');
    const btn2 = screen.getByTestId('pva-asset-picker-item-pension-2');

    expect(btn2).toHaveAttribute('aria-pressed', 'true');
    expect(btn1).toHaveAttribute('aria-pressed', 'false');
  });

  it('TC-PVA-AssetPicker-5: claims with results in m5Store show "valued" marker', () => {
    seedM2Items([
      { id: 'pension-valued', category: 'pensions', description: 'Plan A', titleholder: 'self' },
      { id: 'pension-unvalued', category: 'pensions', description: 'Plan B', titleholder: 'spouse' },
    ]);
    seedM5Asset('pension-valued', {
      inputs: { planName: 'Plan A' },
      results: { path: 'tier_1', formulaId: 'pva_db_tier1_v1', pv: { best: 100000, low: 90000, high: 110000 } },
    });

    render(<AssetPicker selectedAssetId={null} onSelect={() => {}} />);

    expect(screen.getByTestId('pva-asset-picker-item-pension-valued-valued')).toBeInTheDocument();
    expect(screen.queryByTestId('pva-asset-picker-item-pension-unvalued-valued')).not.toBeInTheDocument();
  });

  it('TC-PVA-AssetPicker-6: empty description falls back to "Untitled pension"', () => {
    seedM2Items([
      { id: 'pension-blank', category: 'pensions', description: '', titleholder: 'unknown' },
    ]);

    render(<AssetPicker selectedAssetId={null} onSelect={() => {}} />);

    expect(screen.getByText(/Untitled pension/)).toBeInTheDocument();
  });

  it('TC-PVA-AssetPicker-7: owner suffix maps titleholder → " — Client"/" — Spouse"; joint/other/unknown/absent suppress the suffix', () => {
    seedM2Items([
      { id: 'pen-self', category: 'pensions', description: 'Plan Self', titleholder: 'self' },
      { id: 'pen-spouse', category: 'pensions', description: 'Plan Spouse', titleholder: 'spouse' },
      { id: 'pen-joint', category: 'pensions', description: 'Plan Joint', titleholder: 'joint' },
      { id: 'pen-other', category: 'pensions', description: 'Plan Other', titleholder: 'other' },
      { id: 'pen-unknown', category: 'pensions', description: 'Plan Unknown', titleholder: 'unknown' },
      { id: 'pen-absent', category: 'pensions', description: 'Plan Absent' },
    ]);

    render(<AssetPicker selectedAssetId={null} onSelect={() => {}} />);

    const selfBtn = screen.getByTestId('pva-asset-picker-item-pen-self');
    expect(selfBtn).toHaveTextContent('Plan Self');
    expect(selfBtn).toHaveTextContent('— Client');

    const spouseBtn = screen.getByTestId('pva-asset-picker-item-pen-spouse');
    expect(spouseBtn).toHaveTextContent('Plan Spouse');
    expect(spouseBtn).toHaveTextContent('— Spouse');

    // Joint/other/unknown/absent: render the description but no owner suffix.
    for (const id of ['pen-joint', 'pen-other', 'pen-unknown', 'pen-absent']) {
      const btn = screen.getByTestId(`pva-asset-picker-item-${id}`);
      expect(btn.textContent).not.toMatch(/— /);
    }
  });
});
