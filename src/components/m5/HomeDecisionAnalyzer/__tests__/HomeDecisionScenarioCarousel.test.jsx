/**
 * HomeDecisionScenarioCarousel tests — §9.8.2 items 2–5 / TC-HDA-9.
 * Swipeable scenario pages (output-only except deferred-sale stress toggle),
 * per-page Select CTA, shortfall banner, underwater prefix, cross-scenario
 * summary, disclaimer block, save action.
 * TC-HDA-9: hda-carousel-track is the sole overflowX:auto element; all
 * per-page tables have tableLayout:'fixed'.
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import HomeDecisionScenarioCarousel from '../HomeDecisionScenarioCarousel.jsx';

const baseInputs = {
  currentFMV: 650000,
  existingMortgageBalance: 400000,
  spouseEquityShare: 0.5,
  stressTestUserPays100Pct: false,
};

function mkScenario(over = {}) {
  return {
    horizons: [
      { year: 3, netWealth: 100000, liquidCash: 40000, homeEquity: 60000 },
      { year: 6, netWealth: 150000, liquidCash: 70000, homeEquity: 80000 },
      { year: 10, netWealth: 220000, liquidCash: 120000, homeEquity: 100000 },
    ],
    section121: null,
    refiQualification: null,
    feasibility: undefined,
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
      narrative: 'DTI tight.',
    },
    metadata: { scenario: 'keepAndRefi', projectedPmiDropYear: 9 },
  }),
  sellNow: mkScenario({
    callouts: ['Use-test callout: you may not satisfy §121 use. Discuss with your CDFA.'],
    metadata: { scenario: 'sellNow' },
  }),
  deferredSale: mkScenario({
    metadata: { scenario: 'deferredSale', mfjSingleDifferentialAtSaleYear: 80000 },
  }),
};

function renderCarousel(props = {}) {
  return render(
    <HomeDecisionScenarioCarousel
      inputs={baseInputs}
      scenarios={scenarios}
      userSelection={null}
      onSelectScenario={vi.fn()}
      onSave={vi.fn()}
      saveState={null}
      onInputChange={vi.fn()}
      {...props}
    />,
  );
}

describe('HomeDecisionScenarioCarousel', () => {
  it('renders null when scenarios is falsy', () => {
    const { container } = render(
      <HomeDecisionScenarioCarousel
        inputs={baseInputs}
        scenarios={null}
        userSelection={null}
        onSelectScenario={vi.fn()}
        onSave={vi.fn()}
        saveState={null}
        onInputChange={vi.fn()}
      />,
    );
    expect(container.firstChild).toBeNull();
  });

  it('renders the carousel root and track', () => {
    renderCarousel();
    expect(screen.getByTestId('hda-mobile-carousel')).toBeInTheDocument();
    expect(screen.getByTestId('hda-carousel-track')).toBeInTheDocument();
  });

  it('renders 3 pages in order: keepAndRefi, sellNow, deferredSale', () => {
    renderCarousel();
    const kr = screen.getByTestId('hda-carousel-page-keepAndRefi');
    const sn = screen.getByTestId('hda-carousel-page-sellNow');
    const ds = screen.getByTestId('hda-carousel-page-deferredSale');
    expect(kr).toBeInTheDocument();
    expect(sn).toBeInTheDocument();
    expect(ds).toBeInTheDocument();
    expect(
      kr.compareDocumentPosition(sn) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
    expect(
      sn.compareDocumentPosition(ds) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
  });

  describe('navigation controls', () => {
    it('prev button is disabled at index 0', () => {
      renderCarousel();
      expect(screen.getByTestId('hda-carousel-prev')).toBeDisabled();
      expect(screen.getByTestId('hda-carousel-next')).not.toBeDisabled();
    });

    it('clicking next advances the dot indicator aria-current to page 1', () => {
      renderCarousel();
      // Initially dot for keepAndRefi is aria-current=true
      expect(screen.getByTestId('hda-carousel-dot-keepAndRefi')).toHaveAttribute('aria-current', 'true');
      expect(screen.getByTestId('hda-carousel-dot-sellNow')).toHaveAttribute('aria-current', 'false');

      fireEvent.click(screen.getByTestId('hda-carousel-next'));

      expect(screen.getByTestId('hda-carousel-dot-keepAndRefi')).toHaveAttribute('aria-current', 'false');
      expect(screen.getByTestId('hda-carousel-dot-sellNow')).toHaveAttribute('aria-current', 'true');
    });

    it('next is disabled at index 2, prev is enabled', () => {
      renderCarousel();
      fireEvent.click(screen.getByTestId('hda-carousel-next'));
      fireEvent.click(screen.getByTestId('hda-carousel-next'));
      expect(screen.getByTestId('hda-carousel-next')).toBeDisabled();
      expect(screen.getByTestId('hda-carousel-prev')).not.toBeDisabled();
    });

    it('prev navigates back from index 2 to index 1', () => {
      renderCarousel();
      fireEvent.click(screen.getByTestId('hda-carousel-next'));
      fireEvent.click(screen.getByTestId('hda-carousel-next'));
      fireEvent.click(screen.getByTestId('hda-carousel-prev'));
      expect(screen.getByTestId('hda-carousel-dot-sellNow')).toHaveAttribute('aria-current', 'true');
      expect(screen.getByTestId('hda-carousel-dot-deferredSale')).toHaveAttribute('aria-current', 'false');
    });

    it('dot indicators render for all 3 scenarios', () => {
      renderCarousel();
      expect(screen.getByTestId('hda-carousel-dot-keepAndRefi')).toBeInTheDocument();
      expect(screen.getByTestId('hda-carousel-dot-sellNow')).toBeInTheDocument();
      expect(screen.getByTestId('hda-carousel-dot-deferredSale')).toBeInTheDocument();
    });
  });

  describe('Select CTA', () => {
    it('clicking unselected CTA calls onSelectScenario with that id', () => {
      const onSelectScenario = vi.fn();
      renderCarousel({ onSelectScenario });
      fireEvent.click(screen.getByTestId('hda-carousel-select-sellNow'));
      expect(onSelectScenario).toHaveBeenCalledWith('sellNow');
    });

    it('with userSelection=sellNow the sellNow CTA shows "Selected ✓"', () => {
      renderCarousel({ userSelection: 'sellNow' });
      expect(screen.getByTestId('hda-carousel-select-sellNow')).toHaveTextContent('Selected ✓');
    });

    it('clicking the already-selected CTA calls onSelectScenario(null)', () => {
      const onSelectScenario = vi.fn();
      renderCarousel({ userSelection: 'sellNow', onSelectScenario });
      fireEvent.click(screen.getByTestId('hda-carousel-select-sellNow'));
      expect(onSelectScenario).toHaveBeenCalledWith(null);
    });

    it('unselected CTAs show "Select this scenario"', () => {
      renderCarousel({ userSelection: 'sellNow' });
      expect(screen.getByTestId('hda-carousel-select-keepAndRefi')).toHaveTextContent('Select this scenario');
      expect(screen.getByTestId('hda-carousel-select-deferredSale')).toHaveTextContent('Select this scenario');
    });

    it('clicking a different scenario CTA calls onSelectScenario with that id', () => {
      const onSelectScenario = vi.fn();
      renderCarousel({ userSelection: 'keepAndRefi', onSelectScenario });
      fireEvent.click(screen.getByTestId('hda-carousel-select-deferredSale'));
      expect(onSelectScenario).toHaveBeenCalledWith('deferredSale');
    });
  });

  describe('shortfall banner', () => {
    it('shows hda-mobile-shortfall-banner on Keep&refi page when feasibility.shortfall=true', () => {
      const scenariosWithShortfall = {
        ...scenarios,
        keepAndRefi: mkScenario({
          refiQualification: { verdictTier: 'red', bindingConstraint: 'dti', narrative: 'Fails.' },
          feasibility: { shortfall: true },
          metadata: { scenario: 'keepAndRefi' },
        }),
      };
      renderCarousel({ scenarios: scenariosWithShortfall });
      const banner = screen.getByTestId('hda-mobile-shortfall-banner');
      expect(banner).toBeInTheDocument();
      expect(banner).toHaveTextContent(/Cash-out refi cannot fund the full buyout/);
    });

    it('does NOT show shortfall banner when feasibility.shortfall is false', () => {
      const scenariosNoShortfall = {
        ...scenarios,
        keepAndRefi: mkScenario({
          refiQualification: { verdictTier: 'red', bindingConstraint: 'dti', narrative: 'Fails.' },
          feasibility: { shortfall: false },
          metadata: { scenario: 'keepAndRefi' },
        }),
      };
      renderCarousel({ scenarios: scenariosNoShortfall });
      expect(screen.queryByTestId('hda-mobile-shortfall-banner')).not.toBeInTheDocument();
    });

    it('does NOT show shortfall banner when feasibility is undefined', () => {
      renderCarousel();
      expect(screen.queryByTestId('hda-mobile-shortfall-banner')).not.toBeInTheDocument();
    });
  });

  describe('underwater prefix', () => {
    const underwaterInputs = {
      currentFMV: 300000,
      existingMortgageBalance: 400000,
      spouseEquityShare: 0.5,
    };
    const underwaterScenarios = {
      keepAndRefi: mkScenario({
        refiQualification: { verdictTier: 'red', bindingConstraint: 'underwater', narrative: 'Underwater.' },
        metadata: { scenario: 'keepAndRefi' },
      }),
      sellNow: mkScenario({ metadata: { scenario: 'sellNow' } }),
      deferredSale: mkScenario({ metadata: { scenario: 'deferredSale' } }),
    };

    it('sellNow narrative contains the underwater prefix', () => {
      renderCarousel({ inputs: underwaterInputs, scenarios: underwaterScenarios });
      expect(screen.getByTestId('hda-carousel-narrative-sellNow')).toHaveTextContent(
        /Note: your home is currently underwater \(FMV \$300,000 < mortgage \$400,000\)/,
      );
    });

    it('deferredSale narrative contains the underwater prefix', () => {
      renderCarousel({ inputs: underwaterInputs, scenarios: underwaterScenarios });
      expect(screen.getByTestId('hda-carousel-narrative-deferredSale')).toHaveTextContent(
        /Note: your home is currently underwater \(FMV \$300,000 < mortgage \$400,000\)/,
      );
    });

    it('keepAndRefi narrative does NOT contain the underwater prefix', () => {
      renderCarousel({ inputs: underwaterInputs, scenarios: underwaterScenarios });
      expect(screen.getByTestId('hda-carousel-narrative-keepAndRefi')).not.toHaveTextContent(
        /your home is currently underwater/,
      );
    });

    it('underwater prefix includes "may be your primary path"', () => {
      renderCarousel({ inputs: underwaterInputs, scenarios: underwaterScenarios });
      expect(screen.getByTestId('hda-carousel-narrative-sellNow')).toHaveTextContent(
        /may be your primary path/,
      );
    });

    it('no underwater prefix on any narrative when bindingConstraint is not underwater', () => {
      renderCarousel(); // default: margin-of-safety
      expect(screen.getByTestId('hda-carousel-narrative-sellNow')).not.toHaveTextContent(
        /your home is currently underwater/,
      );
      expect(screen.getByTestId('hda-carousel-narrative-deferredSale')).not.toHaveTextContent(
        /your home is currently underwater/,
      );
    });
  });

  describe('deferred-sale stress-test toggle', () => {
    it('renders the stress-test checkbox on the deferredSale page', () => {
      renderCarousel();
      expect(screen.getByTestId('hda-mobile-stress-toggle')).toBeInTheDocument();
    });

    it('reflects inputs.stressTestUserPays100Pct=false as unchecked', () => {
      renderCarousel({ inputs: { ...baseInputs, stressTestUserPays100Pct: false } });
      expect(screen.getByTestId('hda-mobile-stress-toggle')).not.toBeChecked();
    });

    it('reflects inputs.stressTestUserPays100Pct=true as checked', () => {
      renderCarousel({ inputs: { ...baseInputs, stressTestUserPays100Pct: true } });
      expect(screen.getByTestId('hda-mobile-stress-toggle')).toBeChecked();
    });

    it('onChange calls onInputChange("stressTestUserPays100Pct", true) when checked', () => {
      const onInputChange = vi.fn();
      renderCarousel({ inputs: { ...baseInputs, stressTestUserPays100Pct: false }, onInputChange });
      fireEvent.click(screen.getByTestId('hda-mobile-stress-toggle'));
      expect(onInputChange).toHaveBeenCalledWith('stressTestUserPays100Pct', true);
    });

    it('onChange calls onInputChange("stressTestUserPays100Pct", false) when unchecked', () => {
      const onInputChange = vi.fn();
      renderCarousel({ inputs: { ...baseInputs, stressTestUserPays100Pct: true }, onInputChange });
      fireEvent.click(screen.getByTestId('hda-mobile-stress-toggle'));
      expect(onInputChange).toHaveBeenCalledWith('stressTestUserPays100Pct', false);
    });

    it('stress toggle is ONLY on the deferredSale page (not on keepAndRefi or sellNow pages)', () => {
      renderCarousel();
      const krPage = screen.getByTestId('hda-carousel-page-keepAndRefi');
      const snPage = screen.getByTestId('hda-carousel-page-sellNow');
      expect(krPage.querySelector('[data-testid="hda-mobile-stress-toggle"]')).toBeNull();
      expect(snPage.querySelector('[data-testid="hda-mobile-stress-toggle"]')).toBeNull();
    });
  });

  describe('per-horizon tables', () => {
    it('each page has a horizon table with 3 data rows', () => {
      renderCarousel();
      ['keepAndRefi', 'sellNow', 'deferredSale'].forEach((id) => {
        const table = screen.getByTestId(`hda-carousel-table-${id}`);
        // 3 data rows + 1 header row = 4 <tr> total
        const rows = table.querySelectorAll('tr');
        expect(rows.length).toBeGreaterThanOrEqual(4);
        // tbody has 3 rows
        const tbodyRows = table.querySelectorAll('tbody tr');
        expect(tbodyRows).toHaveLength(3);
      });
    });

    it('table cells show fmtUSD formatted values for keepAndRefi', () => {
      renderCarousel();
      const krPage = screen.getByTestId('hda-carousel-page-keepAndRefi');
      expect(krPage).toHaveTextContent('$220,000'); // 10-yr netWealth
      expect(krPage).toHaveTextContent('$120,000'); // 10-yr liquidCash
      expect(krPage).toHaveTextContent('$100,000'); // 3-yr netWealth
      expect(krPage).toHaveTextContent('$40,000');  // 3-yr liquidCash
    });
  });

  describe('narrative content', () => {
    it('keepAndRefi narrative has the opening line', () => {
      renderCarousel();
      expect(screen.getByTestId('hda-carousel-narrative-keepAndRefi')).toHaveTextContent(
        /you retain the home and pay your spouse a buyout/i,
      );
    });

    it('sellNow narrative has the opening line and cashflow footnote', () => {
      renderCarousel();
      const sn = screen.getByTestId('hda-carousel-narrative-sellNow');
      expect(sn).toHaveTextContent(/the home is sold during divorce/i);
      expect(sn).toHaveTextContent(/does not include post-sale cashflow accumulation in v1/i);
    });

    it('deferredSale narrative has the opening line', () => {
      renderCarousel();
      expect(screen.getByTestId('hda-carousel-narrative-deferredSale')).toHaveTextContent(
        /you remain in the home with the kids/i,
      );
    });

    it('keepAndRefi narrative carries the PMI drop-year copy', () => {
      renderCarousel();
      expect(screen.getByTestId('hda-carousel-narrative-keepAndRefi')).toHaveTextContent(
        /PMI is projected to drop in year 9/i,
      );
    });

    it('deferredSale narrative carries the MFJ footnote with dollar value', () => {
      renderCarousel();
      expect(screen.getByTestId('hda-carousel-narrative-deferredSale')).toHaveTextContent(
        /could be up to \$80,000 higher than shown/i,
      );
    });

    it('lib callouts render verbatim in the scenario narrative', () => {
      renderCarousel();
      expect(screen.getByTestId('hda-carousel-narrative-sellNow')).toHaveTextContent(
        'Use-test callout: you may not satisfy §121 use. Discuss with your CDFA.',
      );
    });

    it('callouts as {message: string} objects are rendered', () => {
      const scenariosWithObjCallout = {
        ...scenarios,
        keepAndRefi: mkScenario({
          callouts: [{ message: 'Object callout message here.' }],
          refiQualification: { verdictTier: 'yellow', bindingConstraint: 'margin-of-safety', narrative: '' },
          metadata: { scenario: 'keepAndRefi' },
        }),
      };
      renderCarousel({ scenarios: scenariosWithObjCallout });
      expect(screen.getByTestId('hda-carousel-narrative-keepAndRefi')).toHaveTextContent(
        'Object callout message here.',
      );
    });
  });

  describe('cross-scenario summary', () => {
    it('renders the cross-scenario summary section', () => {
      renderCarousel();
      expect(screen.getByTestId('hda-mobile-cross-scenario-summary')).toBeInTheDocument();
    });

    it('strict-comparator line is present and contains canonical phrase', () => {
      renderCarousel();
      expect(screen.getByTestId('hda-mobile-strict-comparator-line')).toHaveTextContent(
        /does not recommend a scenario or rank them/i,
      );
    });

    it('contains the opportunity-cost paragraph', () => {
      renderCarousel();
      expect(screen.getByTestId('hda-mobile-cross-scenario-summary')).toHaveTextContent(
        /compare the 3\/6\/10-year liquid-cash positions/i,
      );
    });

    it('contains the real-dollar paragraph', () => {
      renderCarousel();
      expect(screen.getByTestId('hda-mobile-cross-scenario-summary')).toHaveTextContent(
        /real dollars.*inflation neutralized/i,
      );
    });
  });

  describe('disclaimer block', () => {
    it('renders the disclaimer block', () => {
      renderCarousel();
      expect(screen.getByTestId('hda-mobile-disclaimer-block')).toBeInTheDocument();
    });

    it('contains all 4 disclaimer notes in fixed order', () => {
      renderCarousel();
      const block = screen.getByTestId('hda-mobile-disclaimer-block');
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
  });

  describe('save action', () => {
    it('save button calls onSave', () => {
      const onSave = vi.fn();
      renderCarousel({ onSave });
      fireEvent.click(screen.getByTestId('hda-mobile-save-button'));
      expect(onSave).toHaveBeenCalledTimes(1);
    });

    it('save confirmation absent when saveState is null', () => {
      renderCarousel({ saveState: null });
      expect(screen.queryByTestId('hda-mobile-save-confirmation')).not.toBeInTheDocument();
    });

    it('save confirmation shows "comparator only — no scenario selected" for partial status', () => {
      renderCarousel({ saveState: { status: 'partial' } });
      expect(screen.getByTestId('hda-mobile-save-confirmation')).toHaveTextContent(
        /no scenario selected/i,
      );
    });

    it('save confirmation shows "selection recorded" for complete status', () => {
      renderCarousel({ saveState: { status: 'complete' } });
      expect(screen.getByTestId('hda-mobile-save-confirmation')).toHaveTextContent(
        /selection recorded/i,
      );
    });
  });

  describe('TC-HDA-9 structural — overflow and table constraints', () => {
    it('hda-carousel-track is the ONLY element with inline overflowX auto or scroll', () => {
      const { container } = renderCarousel();
      const all = container.querySelectorAll('*');
      const withOverflow = Array.from(all).filter(
        (el) => el.style.overflowX === 'auto' || el.style.overflowX === 'scroll',
      );
      expect(withOverflow).toHaveLength(1);
      expect(withOverflow[0]).toHaveAttribute('data-testid', 'hda-carousel-track');
    });

    it('all per-page carousel tables have tableLayout:fixed', () => {
      renderCarousel();
      ['keepAndRefi', 'sellNow', 'deferredSale'].forEach((id) => {
        const table = screen.getByTestId(`hda-carousel-table-${id}`);
        expect(table.style.tableLayout).toBe('fixed');
      });
    });

    it('all per-page carousel tables have width:100%', () => {
      renderCarousel();
      ['keepAndRefi', 'sellNow', 'deferredSale'].forEach((id) => {
        const table = screen.getByTestId(`hda-carousel-table-${id}`);
        expect(table.style.width).toBe('100%');
      });
    });

    it('carousel track has scrollSnapType:x mandatory', () => {
      renderCarousel();
      const track = screen.getByTestId('hda-carousel-track');
      expect(track.style.scrollSnapType).toBe('x mandatory');
    });

    it('each page section has scrollSnapAlign:start and flex:0 0 100%', () => {
      renderCarousel();
      ['keepAndRefi', 'sellNow', 'deferredSale'].forEach((id) => {
        const page = screen.getByTestId(`hda-carousel-page-${id}`);
        expect(page.style.scrollSnapAlign).toBe('start');
        expect(page.style.flex).toBe('0 0 100%');
      });
    });
  });
});
