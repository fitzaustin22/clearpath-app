/**
 * S9HomeDecision.jsx — HDA correctness fix PR1.
 *
 * Regression guard for the stale-shape bug: the old renderer read keys
 * (recommendation, homeValue, equity, monthlyCost, affordabilityRatio) that
 * never existed in the real payload `updateHomeDecision` writes. These tests
 * pin the REAL shape: { scenarios: ScenarioOutput[3] ordered [keepAndRefi,
 * sellNow, deferredSale], userSelection, selectionTimestamp, metadata }.
 */

import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import S9HomeDecision from '../S9HomeDecision.jsx';

function scenario(overrides = {}) {
  return {
    horizons: [
      { year: 3, netWealth: 100000, liquidCash: 40000, homeEquity: 60000 },
      { year: 6, netWealth: 150000, liquidCash: 70000, homeEquity: 80000 },
      { year: 10, netWealth: 220000, liquidCash: 120000, homeEquity: 100000 },
    ],
    section121: null,
    refiQualification: null,
    feasibility: null,
    callouts: [],
    metadata: {},
    ...overrides,
  };
}

function threeScenarios(overrides = {}) {
  return [
    scenario({
      refiQualification: { verdictTier: 'green', bindingConstraint: 'none' },
      feasibility: { shortfall: false },
      ...overrides.keepAndRefi,
    }),
    scenario(overrides.sellNow),
    scenario(overrides.deferredSale),
  ];
}

describe('S9HomeDecision — real data-shape rendering', () => {
  it('renders nothing when data is null (section not yet saved)', () => {
    const { container } = render(<S9HomeDecision data={null} status="empty" />);
    expect(container).toBeEmptyDOMElement();
  });

  it('renders nothing if scenarios is not an array (defensive against a malformed payload)', () => {
    const { container } = render(
      <S9HomeDecision data={{ scenarios: null, userSelection: null }} status="partial" />,
    );
    expect(container).toBeEmptyDOMElement();
  });

  it('a stale/corrupted userSelection not present in the scenarios array falls back to the comparator framing, no crash', () => {
    render(
      <S9HomeDecision
        data={{ scenarios: threeScenarios(), userSelection: 'bogusScenarioId', metadata: {} }}
        status="complete"
      />,
    );
    expect(screen.getByTestId('s9-home-decision')).toBeInTheDocument();
    expect(screen.getByText(/COMPARATOR/i)).toBeInTheDocument();
    expect(screen.queryByText(/SELECTED SCENARIO/i)).not.toBeInTheDocument();
  });

  it('a scenario missing the summary-year horizon is skipped in the list, no crash', () => {
    const scenarios = threeScenarios();
    scenarios[1] = { ...scenarios[1], horizons: [{ year: 3, netWealth: 1, liquidCash: 1, homeEquity: 1 }] };
    render(
      <S9HomeDecision
        data={{ scenarios, userSelection: null, metadata: {} }}
        status="partial"
      />,
    );
    expect(screen.getByTestId('s9-home-decision')).toBeInTheDocument();
    expect(screen.getByText('Keep & Refinance')).toBeInTheDocument();
    expect(screen.queryByText('Sell Now')).not.toBeInTheDocument();
    expect(screen.getByText('Deferred Sale')).toBeInTheDocument();
  });

  it('partial (no selection): neutral comparator framing, no "RECOMMENDATION" label, all three scenarios listed', () => {
    render(
      <S9HomeDecision
        data={{ scenarios: threeScenarios(), userSelection: null, metadata: {} }}
        status="partial"
      />,
    );
    expect(screen.getByTestId('s9-home-decision')).toBeInTheDocument();
    expect(screen.queryByText(/RECOMMENDATION/i)).not.toBeInTheDocument();
    expect(screen.getByText(/COMPARATOR/i)).toBeInTheDocument();
    expect(screen.getByText('Keep & Refinance')).toBeInTheDocument();
    expect(screen.getByText('Sell Now')).toBeInTheDocument();
    expect(screen.getByText('Deferred Sale')).toBeInTheDocument();
    // 6-year net wealth for each scenario is rendered (real figures, not $0/blank).
    expect(screen.getAllByText(/6-year net wealth \$150,000/)).toHaveLength(3);
  });

  it('complete (selection made): selected scenario headlined, marked in the list, still no "RECOMMENDATION" language', () => {
    render(
      <S9HomeDecision
        data={{
          scenarios: threeScenarios(),
          userSelection: 'sellNow',
          selectionTimestamp: '2026-06-01T00:00:00.000Z',
          metadata: {},
        }}
        status="complete"
      />,
    );
    expect(screen.getByText(/SELECTED SCENARIO/i)).toBeInTheDocument();
    // Headline figure for the selected scenario appears (may also appear in the list row).
    expect(screen.getAllByText(/Sell Now/).length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('Sell Now (selected)')).toBeInTheDocument();
    expect(screen.queryByText(/^RECOMMENDATION$/)).not.toBeInTheDocument();
  });

  it('keepAndRefi shortfall callout renders only when selected AND feasibility.shortfall is true', () => {
    render(
      <S9HomeDecision
        data={{
          scenarios: threeScenarios({
            keepAndRefi: {
              refiQualification: { verdictTier: 'red', bindingConstraint: 'dti' },
              feasibility: { shortfall: true },
            },
          }),
          userSelection: 'keepAndRefi',
          metadata: {},
        }}
        status="complete"
      />,
    );
    expect(screen.getByText(/cannot fund the full buyout/i)).toBeInTheDocument();
  });

  it('shortfall callout does NOT render when keepAndRefi has a shortfall but a different scenario is selected', () => {
    render(
      <S9HomeDecision
        data={{
          scenarios: threeScenarios({
            keepAndRefi: {
              refiQualification: { verdictTier: 'red', bindingConstraint: 'dti' },
              feasibility: { shortfall: true },
            },
          }),
          userSelection: 'sellNow',
          metadata: {},
        }}
        status="complete"
      />,
    );
    expect(screen.queryByText(/cannot fund the full buyout/i)).not.toBeInTheDocument();
  });
});
