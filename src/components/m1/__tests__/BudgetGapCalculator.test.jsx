import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import BudgetGapCalculator from '@/src/components/m1/BudgetGapCalculator';
import { useM1Store } from '@/src/stores/m1Store';

// The component measures its OWN width via ResizeObserver (not the viewport);
// jsdom implements neither ResizeObserver nor scrollTo, so stub them. Reset the
// persisted M1 store each test so the tool opens on Stage 1 (input).
let roInstances;
beforeEach(() => {
  window.scrollTo = vi.fn();
  roInstances = [];
  globalThis.ResizeObserver = vi.fn(function ResizeObserverMock(cb) {
    const inst = { cb, observe: vi.fn(), unobserve: vi.fn(), disconnect: vi.fn() };
    roInstances.push(inst);
    return inst;
  });
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

  it('sizes its layout from its OWN container (ResizeObserver), not the viewport', () => {
    // Root cause of the section-02 clip on /modules/m1: the calculator is embedded
    // in a ~720px card there, but switched 2-column/1-column off window.innerWidth,
    // so a wide viewport forced the squeezed 2-column layout that clipped/overflowed
    // section 02. It must observe its own rendered width instead.
    render(<BudgetGapCalculator entry="direct" />);
    expect(globalThis.ResizeObserver).toHaveBeenCalled();
    expect(roInstances.length).toBeGreaterThan(0);
    expect(roInstances[0].observe).toHaveBeenCalled();
  });
});
