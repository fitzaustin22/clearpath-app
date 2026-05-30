/**
 * TradeOffAnalyzer — wizard behavior (§7.4).
 *
 * Covers tier gating (locked teaser vs wizard), the Build step pickers
 * (secure-priority gets, allowlisted-asset gives with formatUSD), the give-side
 * privacy invariant (willing-to-trade renders as a display-only Private hint and
 * is never a selectable get or give), and the explicit Build → Review → Save
 * path that writes { get, give } strings into Blueprint §10.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, within, fireEvent } from '@testing-library/react';
import TradeOffAnalyzer from '../TradeOffAnalyzer';
import { useM6Store } from '@/src/stores/m6Store';
import { useM2Store } from '@/src/stores/m2Store';
import useBlueprintStore from '@/src/stores/blueprintStore';

function seedPriorities(specs) {
  for (const spec of specs) {
    useM6Store.getState().addPriority({ item: spec.item });
    const items = useM6Store.getState().priorities.items;
    const justAdded = items[items.length - 1];
    if (spec.importance && spec.importance !== 'unsorted') {
      useM6Store.getState().setPriorityImportance(justAdded.id, spec.importance);
    }
  }
}

function seedAssets(items) {
  useM2Store.getState().initInventoryItems(items);
}

function gotoBuild(tier = 'navigator') {
  render(<TradeOffAnalyzer userTier={tier} />);
  fireEvent.click(screen.getByRole('button', { name: /Let's start/i }));
}

beforeEach(() => {
  localStorage.clear();
  useM6Store.getState().resetPriorities();
  useM6Store.getState().resetTradeOffs();
  useM2Store.getState().resetMaritalEstateInventory();
  useBlueprintStore.getState().resetBlueprint();
});

describe('TradeOffAnalyzer — tier gating', () => {
  it.each(['free', 'essentials'])('shows the locked teaser (no wizard) for %s', (tier) => {
    render(<TradeOffAnalyzer userTier={tier} />);
    expect(screen.getByTestId('trade-off-locked-teaser')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Unlock with Full Access/i })).toHaveAttribute(
      'href',
      '/upgrade',
    );
    expect(screen.queryByTestId('trade-off-step-framing')).toBeNull();
  });

  it.each(['navigator', 'signature'])('shows the wizard (Framing first) for %s', (tier) => {
    render(<TradeOffAnalyzer userTier={tier} />);
    expect(screen.getByTestId('trade-off-step-framing')).toBeInTheDocument();
    expect(screen.queryByTestId('trade-off-locked-teaser')).toBeNull();
  });
});

describe('TradeOffAnalyzer — Build step pickers + privacy invariant', () => {
  beforeEach(() => {
    seedPriorities([
      { item: 'House', importance: 'must-have' },
      { item: 'Cabin', importance: 'would-like' },
      { item: 'Frequent-flyer miles', importance: 'willing-to-trade' },
      { item: 'Loose end', importance: 'unsorted' },
    ]);
    seedAssets([
      { id: 'a1', category: 'realEstate', description: 'Vacation home', currentValue: 250000, titleholder: 'joint' },
      { id: 'p1', category: 'personalProperty', description: 'Living-room couch', currentValue: 400, titleholder: 'self' },
      { id: 'l1', category: 'loans', description: 'Car loan', currentValue: 15000, titleholder: 'self' },
    ]);
  });

  it('offers secure priorities as gets and excludes willing-to-trade + unsorted', () => {
    gotoBuild();
    expect(screen.getByRole('button', { name: /Add: House/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Add: Cabin/i })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Add: Loose end/i })).toBeNull();
    // willing-to-trade is never a selectable get (no button bears its label).
    expect(screen.queryByRole('button', { name: /Frequent-flyer miles/i })).toBeNull();
  });

  it('renders willing-to-trade as a display-only Private hint (never a selectable control)', () => {
    gotoBuild();
    const hint = screen.getByTestId('trade-off-wt-hint');
    expect(within(hint).getByText('Private')).toBeInTheDocument();
    expect(within(hint).getByText(/willing to trade/i)).toBeInTheDocument();
    // the WT label is shown as plain text inside the hint, not as a control
    expect(within(hint).getByText('Frequent-flyer miles')).toBeInTheDocument();
    expect(within(hint).queryByRole('button')).toBeNull();
  });

  it('offers only allowlisted assets as gives (excludes personalProperty + liabilities) with formatUSD beside them', () => {
    gotoBuild();
    // Pick a get → a row with its own give-picker appears.
    fireEvent.click(screen.getByRole('button', { name: /Add: House/i }));
    expect(screen.getByRole('button', { name: /Vacation home/i })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Living-room couch/i })).toBeNull();
    expect(screen.queryByRole('button', { name: /Car loan/i })).toBeNull();
    // value shown beside the M2 give (informational only).
    expect(screen.getByText('$250,000')).toBeInTheDocument();
  });

  it('shows the factual garage-sale note near the give-picker', () => {
    gotoBuild();
    expect(screen.getByText(/garage-sale prices/i)).toBeInTheDocument();
  });
});

describe('TradeOffAnalyzer — empty-upstream pointers (non-blocking)', () => {
  it('points to the Priorities Worksheet when there are no secure priorities, but still allows free-text', () => {
    seedAssets([
      { id: 'a1', category: 'realEstate', description: 'Vacation home', currentValue: 250000, titleholder: 'joint' },
    ]);
    gotoBuild();
    expect(screen.getByText(/haven't set priorities yet/i)).toBeInTheDocument();
    // free-text get input is still available
    expect(screen.getByTestId('trade-off-get-freetext')).toBeInTheDocument();
  });
});

describe('TradeOffAnalyzer — Build → Review → Save', () => {
  beforeEach(() => {
    seedPriorities([{ item: 'House', importance: 'must-have' }]);
    seedAssets([
      { id: 'a1', category: 'realEstate', description: 'Vacation home', currentValue: 250000, titleholder: 'joint' },
    ]);
  });

  it('saving a built trade writes { get, give } strings to Blueprint §10 and shows success', () => {
    render(<TradeOffAnalyzer userTier="navigator" />);
    fireEvent.click(screen.getByRole('button', { name: /Let's start/i }));
    fireEvent.click(screen.getByRole('button', { name: /Add: House/i })); // get → row
    fireEvent.click(screen.getByRole('button', { name: /Vacation home/i })); // give
    fireEvent.click(screen.getByRole('button', { name: /Continue to review/i }));
    fireEvent.click(screen.getByRole('button', { name: /Save to my Blueprint/i }));

    const s10 = useBlueprintStore.getState().sections.s10;
    expect(s10.data.tradeOffs).toEqual([{ get: 'House', give: 'Vacation home' }]);
    expect(s10.data.tradeOffs[0]).not.toHaveProperty('value');
    expect(screen.getByTestId('trade-off-save-success')).toBeInTheDocument();
  });
});
