/**
 * HomeDecisionComparator tests — §9.8.1 desktop layout.
 * Grid, verdict badge placement, per-scenario narrative (column order /
 * stacked / no truncation), cross-scenario summary, disclaimer block,
 * selection mechanism (toggle / transfer), and Save action.
 *
 * Shortfall banner (§9.2.1): absent when feasibility.shortfall is falsy; present when true.
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import HomeDecisionComparator from '../HomeDecisionComparator.jsx';

const baseInputs = { currentFMV: 650000, spouseEquityShare: 0.5 };

function mkScenario(over = {}) {
  return {
    horizons: [
      { year: 3, netWealth: 100000, liquidCash: 40000, homeEquity: 60000 },
      { year: 6, netWealth: 150000, liquidCash: 70000, homeEquity: 80000 },
      { year: 10, netWealth: 220000, liquidCash: 120000, homeEquity: 100000 },
    ],
    section121: null,
    refiQualification: null,
    callouts: [],
    metadata: { scenario: 'x' },
    ...over,
  };
}

const scenarios = {
  keepAndRefi: mkScenario({
    refiQualification: {
      verdictTier: 'yellow',
      bindingConstraint: 'margin-of-safety',
      narrative: 'Your DTI ratios pass but back-end is within 2pp. Discuss with your CDFA.',
    },
    metadata: { scenario: 'keepAndRefi', projectedPmiDropYear: 9 },
  }),
  sellNow: mkScenario({
    callouts: ['Use-test callout: you may not satisfy §121 use. Discuss with your CDFA.'],
    metadata: { scenario: 'sellNow' },
  }),
  deferredSale: mkScenario({
    metadata: { scenario: 'deferredSale', mfjSingleDifferentialAtSaleYear: 100000 },
  }),
};

function renderComparator(props = {}) {
  return render(
    <HomeDecisionComparator
      inputs={baseInputs}
      onInputChange={vi.fn()}
      scenarios={scenarios}
      userSelection={null}
      onSelectScenario={vi.fn()}
      onSave={vi.fn()}
      {...props}
    />,
  );
}

describe('HomeDecisionComparator', () => {
  it('pre-calc (scenarios null) shows a placeholder, no grid, but disclaimer block still renders', () => {
    render(
      <HomeDecisionComparator
        inputs={baseInputs}
        onInputChange={vi.fn()}
        scenarios={null}
        userSelection={null}
        onSelectScenario={vi.fn()}
        onSave={vi.fn()}
      />,
    );
    expect(screen.getByTestId('hda-grid-placeholder')).toBeInTheDocument();
    expect(screen.queryByTestId('hda-projection-grid')).not.toBeInTheDocument();
    expect(screen.getByTestId('hda-disclaimer-block')).toBeInTheDocument();
  });

  it('renders the projection grid with the three horizon rows and formatted USD cells', () => {
    renderComparator();
    expect(screen.getByTestId('hda-projection-grid')).toBeInTheDocument();
    expect(screen.getByTestId('hda-horizon-row-3')).toBeInTheDocument();
    expect(screen.getByTestId('hda-horizon-row-6')).toBeInTheDocument();
    expect(screen.getByTestId('hda-horizon-row-10')).toBeInTheDocument();
    const cell = screen.getByTestId('hda-cell-keepAndRefi-10');
    expect(cell).toHaveTextContent('$220,000');
    expect(cell).toHaveTextContent('$120,000');
  });

  it('verdict badge renders in the Keep & refi header; Sell-now/Deferred show no badge', () => {
    renderComparator();
    expect(screen.getByTestId('hda-verdict-badge')).toHaveAttribute('data-verdict', 'yellow');
    expect(screen.getByText('Borderline')).toBeInTheDocument();
    // only one badge total (Keep & refi only)
    expect(screen.getAllByTestId('hda-verdict-badge')).toHaveLength(1);
  });

  it('per-scenario narrative renders in column order with opening lines', () => {
    renderComparator();
    const kr = screen.getByTestId('hda-narrative-keepAndRefi');
    const sn = screen.getByTestId('hda-narrative-sellNow');
    const ds = screen.getByTestId('hda-narrative-deferredSale');
    expect(kr).toHaveTextContent(/you retain the home and pay your spouse a buyout/i);
    expect(sn).toHaveTextContent(/the home is sold during divorce/i);
    expect(ds).toHaveTextContent(/you remain in the home with the kids/i);
    // column order in the DOM
    expect(kr.compareDocumentPosition(sn) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(sn.compareDocumentPosition(ds) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it('sell-now narrative carries the accumulatedCashflow=0 footnote', () => {
    renderComparator();
    expect(screen.getByTestId('hda-narrative-sellNow')).toHaveTextContent(
      /does not include post-sale cashflow accumulation in v1/i,
    );
  });

  it('keep & refi narrative carries the PMI projected-drop-year copy', () => {
    renderComparator();
    expect(screen.getByTestId('hda-narrative-keepAndRefi')).toHaveTextContent(
      /PMI is projected to drop in year 9/i,
    );
  });

  it('deferred-sale narrative carries the MFJ-differential footnote with the dollar value', () => {
    renderComparator();
    expect(screen.getByTestId('hda-narrative-deferredSale')).toHaveTextContent(
      /could be up to \$100,000 higher than shown/i,
    );
  });

  it('lib callouts (use-test) render verbatim in the scenario narrative (no truncation)', () => {
    renderComparator();
    expect(screen.getByTestId('hda-narrative-sellNow')).toHaveTextContent(
      'Use-test callout: you may not satisfy §121 use. Discuss with your CDFA.',
    );
  });

  it('binding-constraint mini renders for the Keep & refi verdict', () => {
    renderComparator();
    const mini = screen.getByTestId('hda-binding-constraint-mini');
    expect(mini).toHaveAttribute('data-binding', 'margin-of-safety');
  });

  it('cross-scenario summary + strict-comparator stance line render', () => {
    renderComparator();
    expect(screen.getByTestId('hda-cross-scenario-summary')).toBeInTheDocument();
    expect(screen.getByTestId('hda-strict-comparator-line')).toHaveTextContent(
      /does not recommend a scenario or rank them/i,
    );
  });

  it('disclaimer block renders the four §9.8.4 notes in fixed order', () => {
    renderComparator();
    const block = screen.getByTestId('hda-disclaimer-block');
    const text = block.textContent;
    const iFmv = text.indexOf('LTV calculation uses your FMV estimate');
    const iConv = text.indexOf('Refi qualification assumes a 30-year conventional');
    const iBpmi = text.indexOf('PMI rates assume borrower-paid PMI');
    const iInd = text.indexOf('HDA outputs are indicative');
    expect(iFmv).toBeGreaterThanOrEqual(0);
    expect(iConv).toBeGreaterThan(iFmv);
    expect(iBpmi).toBeGreaterThan(iConv);
    expect(iInd).toBeGreaterThan(iBpmi);
  });

  it('does NOT render a shortfall banner when feasibility.shortfall is falsy (absent field)', () => {
    renderComparator();
    expect(screen.queryByTestId('hda-shortfall-banner')).not.toBeInTheDocument();
  });

  it('does NOT render a shortfall banner when feasibility.shortfall is explicitly false', () => {
    renderComparator({
      scenarios: {
        ...scenarios,
        keepAndRefi: mkScenario({
          refiQualification: { verdictTier: 'red', bindingConstraint: 'dti', narrative: 'DTI fails.' },
          feasibility: { shortfall: false },
          metadata: { scenario: 'keepAndRefi' },
        }),
      },
    });
    expect(screen.queryByTestId('hda-shortfall-banner')).not.toBeInTheDocument();
  });

  it('renders the shortfall banner when feasibility.shortfall is true', () => {
    renderComparator({
      scenarios: {
        ...scenarios,
        keepAndRefi: mkScenario({
          refiQualification: { verdictTier: 'red', bindingConstraint: 'dti', narrative: 'DTI fails.' },
          feasibility: { shortfall: true },
          metadata: { scenario: 'keepAndRefi' },
        }),
      },
    });
    const banner = screen.getByTestId('hda-shortfall-banner');
    expect(banner).toBeInTheDocument();
    expect(banner).toHaveTextContent(/Cash-out refi cannot fund the full buyout/);
  });

  it('clicking an unselected column header selects that scenario', () => {
    const onSelectScenario = vi.fn();
    renderComparator({ onSelectScenario });
    fireEvent.click(screen.getByTestId('hda-col-keepAndRefi'));
    expect(onSelectScenario).toHaveBeenCalledWith('keepAndRefi');
  });

  it('clicking the already-selected column toggles selection off (null)', () => {
    const onSelectScenario = vi.fn();
    renderComparator({ userSelection: 'keepAndRefi', onSelectScenario });
    fireEvent.click(screen.getByTestId('hda-col-keepAndRefi'));
    expect(onSelectScenario).toHaveBeenCalledWith(null);
  });

  it('clicking a different column transfers selection (last-click wins)', () => {
    const onSelectScenario = vi.fn();
    renderComparator({ userSelection: 'keepAndRefi', onSelectScenario });
    fireEvent.click(screen.getByTestId('hda-col-sellNow'));
    expect(onSelectScenario).toHaveBeenCalledWith('sellNow');
  });

  it('the selected column shows the "Selected" badge', () => {
    renderComparator({ userSelection: 'deferredSale' });
    expect(screen.getByTestId('hda-selected-badge-deferredSale')).toBeInTheDocument();
    expect(screen.getByTestId('hda-col-deferredSale')).toHaveAttribute('data-selected', 'true');
    expect(screen.getByTestId('hda-col-keepAndRefi')).toHaveAttribute('data-selected', 'false');
  });

  it('Save button raises onSave', () => {
    const onSave = vi.fn();
    renderComparator({ onSave });
    fireEvent.click(screen.getByTestId('hda-save-button'));
    expect(onSave).toHaveBeenCalledTimes(1);
  });

  it('save confirmation reflects partial vs complete status', () => {
    const { rerender } = renderComparator({ saveState: { status: 'partial' } });
    expect(screen.getByTestId('hda-save-confirmation')).toHaveTextContent(/no scenario selected/i);
    rerender(
      <HomeDecisionComparator
        inputs={baseInputs}
        onInputChange={vi.fn()}
        scenarios={scenarios}
        userSelection="sellNow"
        onSelectScenario={vi.fn()}
        onSave={vi.fn()}
        saveState={{ status: 'complete' }}
      />,
    );
    expect(screen.getByTestId('hda-save-confirmation')).toHaveTextContent(/selection recorded/i);
  });

  describe('§9.8.5 underwater-prefix callouts', () => {
    it('renders underwater prefix on sell-now and deferred-sale narratives when bindingConstraint=underwater', () => {
      const underwaterInputs = { currentFMV: 300000, existingMortgageBalance: 400000, spouseEquityShare: 0.5 };
      const underwaterScenarios = {
        keepAndRefi: mkScenario({
          refiQualification: { verdictTier: 'red', bindingConstraint: 'underwater', narrative: 'Underwater.' },
          metadata: { scenario: 'keepAndRefi' },
        }),
        sellNow: mkScenario({ metadata: { scenario: 'sellNow' } }),
        deferredSale: mkScenario({ metadata: { scenario: 'deferredSale' } }),
      };
      render(
        <HomeDecisionComparator
          inputs={underwaterInputs}
          onInputChange={vi.fn()}
          scenarios={underwaterScenarios}
          userSelection={null}
          onSelectScenario={vi.fn()}
          onSave={vi.fn()}
        />,
      );
      expect(screen.getByTestId('hda-narrative-sellNow')).toHaveTextContent(
        /Note: your home is currently underwater \(FMV \$300,000 < mortgage \$400,000\)/,
      );
      expect(screen.getByTestId('hda-narrative-sellNow')).toHaveTextContent(/may be your primary path/);
      expect(screen.getByTestId('hda-narrative-deferredSale')).toHaveTextContent(
        /Note: your home is currently underwater \(FMV \$300,000 < mortgage \$400,000\)/,
      );
      expect(screen.getByTestId('hda-narrative-deferredSale')).toHaveTextContent(/may be your primary path/);
      // Keep & refi must NOT carry the prefix (its underwater case is binding-constraint-mini's job)
      expect(screen.getByTestId('hda-narrative-keepAndRefi')).not.toHaveTextContent(
        /your home is currently underwater/,
      );
    });

    it('does NOT render underwater prefix on any narrative when bindingConstraint is not underwater', () => {
      renderComparator(); // default scenarios: bindingConstraint=margin-of-safety
      expect(screen.getByTestId('hda-narrative-sellNow')).not.toHaveTextContent(
        /your home is currently underwater/,
      );
      expect(screen.getByTestId('hda-narrative-deferredSale')).not.toHaveTextContent(
        /your home is currently underwater/,
      );
      expect(screen.getByTestId('hda-narrative-keepAndRefi')).not.toHaveTextContent(
        /your home is currently underwater/,
      );
    });
  });

  it('formats negative net wealth and missing cells defensively', () => {
    const underwaterScenarios = {
      ...scenarios,
      keepAndRefi: mkScenario({
        horizons: [
          { year: 3, netWealth: -25000, liquidCash: 10000 },
          { year: 6, netWealth: -10000, liquidCash: 20000 },
          { year: 10, netWealth: 5000, liquidCash: 30000 },
        ],
        refiQualification: { verdictTier: 'red', bindingConstraint: 'underwater', narrative: 'Underwater.' },
        metadata: { scenario: 'keepAndRefi' },
      }),
    };
    renderComparator({ scenarios: underwaterScenarios });
    expect(screen.getByTestId('hda-cell-keepAndRefi-3')).toHaveTextContent('-$25,000');
    // underwater overrides the red badge per §9.6.2
    expect(screen.getByTestId('hda-verdict-badge')).toHaveAttribute('data-verdict', 'underwater');
  });
});
