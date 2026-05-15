/**
 * HomeDecisionMobileSummary tests — §9.8.2 item 1 / TC-HDA-9.
 * Compact 10-yr summary table: 3 rows × 4 cols, verdict badge on Keep&refi,
 * dash on Sell-now/Deferred-sale. TC-HDA-9: tableLayout:'fixed' + width:'100%'
 * prevents horizontal overflow at 375px.
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import HomeDecisionMobileSummary from '../HomeDecisionMobileSummary.jsx';

function mkScenario(over = {}) {
  return {
    horizons: [
      { year: 3, netWealth: 80000, liquidCash: 30000, homeEquity: 50000 },
      { year: 6, netWealth: 130000, liquidCash: 60000, homeEquity: 70000 },
      { year: 10, netWealth: 200000, liquidCash: 110000, homeEquity: 90000 },
    ],
    section121: null,
    refiQualification: null,
    callouts: [],
    metadata: {},
    ...over,
  };
}

const scenarios = {
  keepAndRefi: mkScenario({
    refiQualification: {
      verdictTier: 'yellow',
      bindingConstraint: 'margin-of-safety',
      narrative: 'DTI passes but tight.',
    },
    metadata: { scenario: 'keepAndRefi' },
  }),
  sellNow: mkScenario({ metadata: { scenario: 'sellNow' } }),
  deferredSale: mkScenario({ metadata: { scenario: 'deferredSale' } }),
};

describe('HomeDecisionMobileSummary', () => {
  it('renders null when scenarios is falsy', () => {
    const { container } = render(<HomeDecisionMobileSummary scenarios={null} />);
    expect(container.firstChild).toBeNull();
  });

  it('renders the summary table with data-testid hda-mobile-summary', () => {
    render(<HomeDecisionMobileSummary scenarios={scenarios} />);
    expect(screen.getByTestId('hda-mobile-summary')).toBeInTheDocument();
  });

  it('renders 3 scenario rows in order: keepAndRefi, sellNow, deferredSale', () => {
    render(<HomeDecisionMobileSummary scenarios={scenarios} />);
    const krRow = screen.getByTestId('hda-mobile-summary-row-keepAndRefi');
    const snRow = screen.getByTestId('hda-mobile-summary-row-sellNow');
    const dsRow = screen.getByTestId('hda-mobile-summary-row-deferredSale');
    expect(krRow).toBeInTheDocument();
    expect(snRow).toBeInTheDocument();
    expect(dsRow).toBeInTheDocument();
    // DOM order: keepAndRefi before sellNow before deferredSale
    expect(
      krRow.compareDocumentPosition(snRow) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
    expect(
      snRow.compareDocumentPosition(dsRow) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
  });

  it('shows scenario labels in the rows', () => {
    render(<HomeDecisionMobileSummary scenarios={scenarios} />);
    expect(screen.getByTestId('hda-mobile-summary-row-keepAndRefi')).toHaveTextContent('Keep & refi');
    expect(screen.getByTestId('hda-mobile-summary-row-sellNow')).toHaveTextContent('Sell now');
    expect(screen.getByTestId('hda-mobile-summary-row-deferredSale')).toHaveTextContent('Deferred sale');
  });

  it('shows 10-yr netWealth from horizons[2] formatted as USD for each scenario', () => {
    render(<HomeDecisionMobileSummary scenarios={scenarios} />);
    expect(screen.getByTestId('hda-mobile-summary-keepAndRefi-netWealth')).toHaveTextContent('$200,000');
    expect(screen.getByTestId('hda-mobile-summary-sellNow-netWealth')).toHaveTextContent('$200,000');
    expect(screen.getByTestId('hda-mobile-summary-deferredSale-netWealth')).toHaveTextContent('$200,000');
  });

  it('shows 10-yr liquidCash from horizons[2] formatted as USD for each scenario', () => {
    render(<HomeDecisionMobileSummary scenarios={scenarios} />);
    expect(screen.getByTestId('hda-mobile-summary-keepAndRefi-liquidCash')).toHaveTextContent('$110,000');
    expect(screen.getByTestId('hda-mobile-summary-sellNow-liquidCash')).toHaveTextContent('$110,000');
    expect(screen.getByTestId('hda-mobile-summary-deferredSale-liquidCash')).toHaveTextContent('$110,000');
  });

  it('shows distinct 10-yr values when scenarios differ', () => {
    const differentScenarios = {
      keepAndRefi: mkScenario({
        horizons: [
          { year: 3, netWealth: 100000, liquidCash: 40000, homeEquity: 60000 },
          { year: 6, netWealth: 150000, liquidCash: 70000, homeEquity: 80000 },
          { year: 10, netWealth: 300000, liquidCash: 150000, homeEquity: 150000 },
        ],
        refiQualification: { verdictTier: 'green', bindingConstraint: 'none', narrative: '' },
        metadata: { scenario: 'keepAndRefi' },
      }),
      sellNow: mkScenario({
        horizons: [
          { year: 3, netWealth: 90000, liquidCash: 90000, homeEquity: 0 },
          { year: 6, netWealth: 110000, liquidCash: 110000, homeEquity: 0 },
          { year: 10, netWealth: 250000, liquidCash: 250000, homeEquity: 0 },
        ],
        metadata: { scenario: 'sellNow' },
      }),
      deferredSale: mkScenario({ metadata: { scenario: 'deferredSale' } }),
    };
    render(<HomeDecisionMobileSummary scenarios={differentScenarios} />);
    expect(screen.getByTestId('hda-mobile-summary-keepAndRefi-netWealth')).toHaveTextContent('$300,000');
    expect(screen.getByTestId('hda-mobile-summary-sellNow-netWealth')).toHaveTextContent('$250,000');
  });

  it('formats negative net wealth with leading minus sign', () => {
    const negScenarios = {
      ...scenarios,
      keepAndRefi: mkScenario({
        horizons: [
          { year: 3, netWealth: -10000, liquidCash: 5000, homeEquity: 0 },
          { year: 6, netWealth: -5000, liquidCash: 8000, homeEquity: 0 },
          { year: 10, netWealth: -50000, liquidCash: 1000, homeEquity: 0 },
        ],
        refiQualification: { verdictTier: 'red', bindingConstraint: 'dti', narrative: '' },
        metadata: { scenario: 'keepAndRefi' },
      }),
    };
    render(<HomeDecisionMobileSummary scenarios={negScenarios} />);
    expect(screen.getByTestId('hda-mobile-summary-keepAndRefi-netWealth')).toHaveTextContent('-$50,000');
  });

  it('shows — for null/missing horizons', () => {
    const sparseScenarios = {
      keepAndRefi: { horizons: [], refiQualification: null, callouts: [], metadata: {} },
      sellNow: { horizons: null, refiQualification: null, callouts: [], metadata: {} },
      deferredSale: mkScenario({ metadata: { scenario: 'deferredSale' } }),
    };
    render(<HomeDecisionMobileSummary scenarios={sparseScenarios} />);
    expect(screen.getByTestId('hda-mobile-summary-keepAndRefi-netWealth')).toHaveTextContent('—');
    expect(screen.getByTestId('hda-mobile-summary-sellNow-netWealth')).toHaveTextContent('—');
  });

  it('Keep&refi row shows a verdict badge', () => {
    render(<HomeDecisionMobileSummary scenarios={scenarios} />);
    // Badge is inside the keepAndRefi row
    const krRow = screen.getByTestId('hda-mobile-summary-row-keepAndRefi');
    expect(krRow.querySelector('[data-testid="hda-verdict-badge"]')).toBeInTheDocument();
  });

  it('sellNow and deferredSale rows show — in the verdict column (no badge)', () => {
    render(<HomeDecisionMobileSummary scenarios={scenarios} />);
    const snRow = screen.getByTestId('hda-mobile-summary-row-sellNow');
    const dsRow = screen.getByTestId('hda-mobile-summary-row-deferredSale');
    expect(snRow.querySelector('[data-testid="hda-verdict-badge"]')).not.toBeInTheDocument();
    expect(dsRow.querySelector('[data-testid="hda-verdict-badge"]')).not.toBeInTheDocument();
  });

  it('only one verdict badge total (Keep&refi only)', () => {
    render(<HomeDecisionMobileSummary scenarios={scenarios} />);
    expect(screen.getAllByTestId('hda-verdict-badge')).toHaveLength(1);
  });

  describe('TC-HDA-9 structural — no horizontal overflow', () => {
    it('table has tableLayout:fixed and width:100%', () => {
      render(<HomeDecisionMobileSummary scenarios={scenarios} />);
      const table = screen.getByTestId('hda-mobile-summary');
      expect(table.style.tableLayout).toBe('fixed');
      expect(table.style.width).toBe('100%');
    });

    it('no element has inline overflowX of auto or scroll', () => {
      const { container } = render(<HomeDecisionMobileSummary scenarios={scenarios} />);
      const all = container.querySelectorAll('*');
      const violators = Array.from(all).filter(
        (el) => el.style.overflowX === 'auto' || el.style.overflowX === 'scroll',
      );
      expect(violators).toHaveLength(0);
    });
  });
});
