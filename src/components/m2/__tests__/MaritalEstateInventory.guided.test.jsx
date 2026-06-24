/**
 * Marital Estate Inventory — "Guided Path" reskin smoke + integration test.
 *
 * The orchestrator has no other render coverage, so this catches compile/render
 * crashes AND pins the load-bearing wiring the reskin must preserve:
 *   • allocation (AllocControl → titleholder) live-recomputes the estate, and
 *   • the final "Save to Blueprint →" writes §3 via the EXISTING
 *     blueprintStore.updateAssetInventory action (not a new/bypassed path).
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, within } from '@testing-library/react';
import { useM2Store } from '@/src/stores/m2Store';
import useBlueprintStore from '@/src/stores/blueprintStore';
import MaritalEstateInventory from '../MaritalEstateInventory.jsx';

vi.mock('next/navigation', () => ({ useRouter: () => ({ push: vi.fn() }) }));

// Net $620k real estate to the client; $228k retirement to the spouse. Both
// pre-classified 'marital' so titleholder drives the division (essentials tier
// does not auto-classify).
function seedTwoItems() {
  useM2Store.getState().initInventoryItems([
    { id: 're-1', category: 'realEstate', description: 'Primary Residence', currentValue: 820000, outstandingBalance: 200000, titleholder: 'self', classification: 'marital', sourceOfPayment: 'marital-funds', dateAcquired: '2012-06-01' },
    { id: 'ra-1', category: 'retirement', description: "Spouse 401(k)", currentValue: 228000, outstandingBalance: 0, titleholder: 'spouse', classification: 'marital', sourceOfPayment: 'marital-funds', dateAcquired: '2012-06-01' },
  ]);
}

beforeEach(() => {
  localStorage.clear();
  useM2Store.persist?.rehydrate?.();
  useBlueprintStore.persist?.rehydrate?.();
  useM2Store.getState().resetMaritalEstateInventory();
  useBlueprintStore.getState().resetBlueprint?.();
});

describe('MaritalEstateInventory — Guided Path shell', () => {
  it('renders the guided path at step 1 (Real Estate) without crashing', () => {
    render(<MaritalEstateInventory userTier="essentials" />);
    expect(screen.getByRole('heading', { name: 'Marital Estate Inventory' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Real Estate' })).toBeInTheDocument();
    expect(screen.getByText('Estate so far')).toBeInTheDocument();
    // Chapters viz + footer both read "Step 1 … of 13".
    expect(screen.getAllByText(/Step 1/).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/of 13/).length).toBeGreaterThan(0);
  });

  it('reflects seeded items in the Estate so far box + rail totals', () => {
    seedTwoItems();
    render(<MaritalEstateInventory userTier="essentials" />);
    expect(useM2Store.getState().maritalEstateInventory.summary.clientAssets).toBe(620000);
    expect(useM2Store.getState().maritalEstateInventory.summary.spouseAssets).toBe(228000);
    expect(screen.getAllByText('$620,000').length).toBeGreaterThan(0);
    expect(screen.getAllByText('$228,000').length).toBeGreaterThan(0);
  });
});

describe('MaritalEstateInventory — allocation live-recomputation', () => {
  it('changing "Who keeps it?" writes titleholder and moves the estate totals', () => {
    seedTwoItems();
    render(<MaritalEstateInventory userTier="essentials" />);
    // Step 1 (Real Estate) shows the $620k item; it currently goes to You.
    expect(useM2Store.getState().maritalEstateInventory.summary.clientAssets).toBe(620000);

    const allocGroup = screen.getByRole('group', { name: 'Who keeps it?' });
    fireEvent.click(within(allocGroup).getByRole('button', { name: 'Spouse' }));

    const summary = useM2Store.getState().maritalEstateInventory.summary;
    expect(summary.clientAssets).toBe(0);
    expect(summary.spouseAssets).toBe(620000 + 228000);
    // The item's titleholder was written to the frozen store field.
    expect(useM2Store.getState().maritalEstateInventory.items[0].titleholder).toBe('spouse');
  });
});

describe('MaritalEstateInventory — review + Blueprint write', () => {
  it('the review step renders the divided-estate summary', () => {
    seedTwoItems();
    render(<MaritalEstateInventory userTier="essentials" />);
    fireEvent.click(screen.getByRole('button', { name: /Review & divide/ }));
    expect(screen.getByRole('heading', { name: 'Your estate, divided' })).toBeInTheDocument();
    expect(screen.getByText('You keep (net)')).toBeInTheDocument();
    expect(screen.getByText('Spouse keeps (net)')).toBeInTheDocument();
  });

  it('"Save to Blueprint →" writes §3 via the existing updateAssetInventory action', () => {
    seedTwoItems();
    render(<MaritalEstateInventory userTier="essentials" />);
    fireEvent.click(screen.getByRole('button', { name: /Review & divide/ }));
    fireEvent.click(screen.getByRole('button', { name: /Save to Blueprint/ }));

    const s3 = useBlueprintStore.getState().sections.s3;
    expect(s3.data.totalAssets).toBe(848000); // 620k + 228k
    expect(s3.data.divisionStatus.client).toBe(620000);
    expect(s3.data.divisionStatus.spouse).toBe(228000);
    expect(s3.data.assetsByCategory.realEstate.total).toBe(620000);
  });
});
