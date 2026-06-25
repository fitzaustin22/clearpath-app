import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import BudgetGapCalculator from '@/src/components/m1/BudgetGapCalculator';
import { useM1Store } from '@/src/stores/m1Store';

// Reset the persisted M1 store each test so the tool opens on Stage 1 (input).
// jsdom doesn't implement scrollTo (the component calls it on screen change).
//
// NOTE: the 1-/2-column responsive switch is now a pure CSS *container query*
// (`@container bgc (min-width: 1024px)`). jsdom does NOT evaluate @container, so
// the actual stacking / no-cold-flash behavior is proven by the JS-DISABLED
// in-browser cold load documented on the PR — NOT by a unit test. These tests
// guard (a) all rows render, and (b) the layout stays class-driven (no inline
// grid-template-columns that would defeat the container query).
beforeEach(() => {
  window.scrollTo = vi.fn();
  useM1Store.setState({
    budgetGap: { inputs: {}, completed: false, results: null, emailCaptured: false },
    readinessAssessment: { answers: [], completed: false, results: null },
  });
});

describe('BudgetGapCalculator — Stage 1 worksheet', () => {
  it('renders section 02 plus all 8 expense rows and the reveal control', () => {
    render(<BudgetGapCalculator entry="direct" />);

    expect(screen.getByText('What life costs on your own')).toBeInTheDocument();
    expect(screen.getByText(/Best guesses are fine/)).toBeInTheDocument();

    // Every expense line label must render (guards the section-02 rows from
    // silently going missing).
    const labels = [
      /Housing \(rent or mortgage\)/,
      /Utilities \(electric, gas, water/,
      /Groceries & household supplies/,
      /Transportation \(car payment/,
      /Health insurance/,
      /Childcare & children.s expenses/,
      /Debt payments \(credit cards/,
      /Personal \(clothing/,
    ];
    labels.forEach((re) => expect(screen.getByText(re)).toBeInTheDocument());

    // One currency input per expense line, plus the gross-income field.
    expect(screen.getAllByLabelText(/monthly cost$/)).toHaveLength(8);
    expect(screen.getByLabelText(/Gross household income/)).toBeInTheDocument();

    // The total + reveal prompt that sit BELOW the rows.
    expect(screen.getByText('Adds up to')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'See My Results' })).toBeInTheDocument();
  });

  it('drives the column layout via CSS class (container query), not inline styles', () => {
    // grid-template-columns is switched by `@container bgc (min-width:1024px)` on
    // .cp-bgc-grid; it must stay class-driven and NOT be hardcoded inline (that
    // would defeat the container query and bring back the cold-load flash). jsdom
    // can't evaluate @container, so this only guards the wiring — the visual
    // stacking is verified in-browser with JS disabled (see PR notes).
    const { container } = render(<BudgetGapCalculator entry="direct" />);
    const grid = container.querySelector('.cp-bgc-grid');
    expect(grid).toBeTruthy();
    expect(grid.style.gridTemplateColumns).toBe(''); // not hardcoded inline
    // The container-query context wrapper is present (its width is what @container reads).
    expect(container.querySelector('.cp-bgc-page')).toBeTruthy();
  });
});
