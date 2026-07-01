import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
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
    render(<BudgetGapCalculator />);

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
    const { container } = render(<BudgetGapCalculator />);
    const grid = container.querySelector('.cp-bgc-grid');
    expect(grid).toBeTruthy();
    expect(grid.style.gridTemplateColumns).toBe(''); // not hardcoded inline
    // The container-query context wrapper is present (its width is what @container reads).
    expect(container.querySelector('.cp-bgc-page')).toBeTruthy();
  });
});

// ─────────────────────────────────────────────────────────────────
// Embedded mode (M1 landing Card 2): self-chrome suppression + the
// neutralize-not-delete stage-card skin. Standalone (default) is unchanged.
// ─────────────────────────────────────────────────────────────────
describe('BudgetGapCalculator — embedded chrome suppression', () => {
  it('suppresses the page wordmark, step tracker, rail eyebrow, and legal line when embedded', () => {
    render(<BudgetGapCalculator embedded />);
    // <Chrome> (wordmark + 3-step tracker) is not rendered…
    expect(screen.queryByText('ClearPath')).not.toBeInTheDocument();
    expect(screen.queryByText('Your numbers')).not.toBeInTheDocument();
    expect(screen.queryByText('Verify email')).not.toBeInTheDocument();
    // …the rail "Module 1 · Budget Gap" eyebrow is gone…
    expect(screen.queryByText(/Module 1.*Budget Gap/)).not.toBeInTheDocument();
    // …and the trailing legal line is gone (the app shell footer carries it).
    expect(
      screen.queryByText(/is not a law firm and does not provide legal advice/)
    ).not.toBeInTheDocument();
  });

  it('keeps all that chrome in the standalone (default) presentation', () => {
    render(<BudgetGapCalculator />);
    expect(screen.getByText('ClearPath')).toBeInTheDocument();
    expect(screen.getByText('Your numbers')).toBeInTheDocument();
    expect(screen.getByText(/Module 1.*Budget Gap/)).toBeInTheDocument();
    expect(
      screen.getByText(/is not a law firm and does not provide legal advice/)
    ).toBeInTheDocument();
  });

  it('embedded: drops the stage-card skin but keeps the layout-driving grid + container context', () => {
    const { container } = render(<BudgetGapCalculator embedded />);
    const grid = container.querySelector('.cp-bgc-grid');
    expect(grid).toBeTruthy();
    // Layout role preserved…
    expect(grid.style.display).toBe('grid');
    // …visual skin dropped (no inline border / radius / shadow).
    expect(grid.style.border).toBe('');
    expect(grid.style.borderRadius).toBe('');
    expect(grid.style.boxShadow).toBe('');
    // The container-query context wrapper still mounts (responsive layout needs it).
    expect(container.querySelector('.cp-bgc-page')).toBeTruthy();
  });
});

// ─────────────────────────────────────────────────────────────────
// Embedded scroll anchoring: on a screen transition the embedded tool scrolls
// to the landing's Budget Gap section (Card 2), NOT the document top — so the
// user stays anchored in the tool. Standalone keeps window.scrollTo(top).
// ─────────────────────────────────────────────────────────────────
describe('BudgetGapCalculator — embedded scroll anchoring', () => {
  it('embedded: a screen transition scrolls the landing Budget Gap section into view, not the page top', () => {
    const section = document.createElement('div');
    section.id = 'm1-budget-gap-section';
    const scrollSpy = vi.fn();
    section.scrollIntoView = scrollSpy;
    document.body.appendChild(section);

    render(<BudgetGapCalculator embedded />);
    // Enter gross income so "See My Results" enables, then advance input → gate.
    fireEvent.change(screen.getByLabelText(/Gross household income/), { target: { value: '5000' } });
    fireEvent.click(screen.getByRole('button', { name: 'See My Results' }));

    // The transition scrolls the landing section into view (embedded anchoring)…
    expect(scrollSpy).toHaveBeenCalled();
    // …and does NOT fall back to window.scrollTo (that's the standalone path).
    expect(window.scrollTo).not.toHaveBeenCalled();

    document.body.removeChild(section);
  });

  it('standalone: a screen transition scrolls the document to top (unchanged)', () => {
    render(<BudgetGapCalculator />);
    fireEvent.change(screen.getByLabelText(/Gross household income/), { target: { value: '5000' } });
    fireEvent.click(screen.getByRole('button', { name: 'See My Results' }));
    expect(window.scrollTo).toHaveBeenCalledWith({ top: 0, behavior: 'smooth' });
  });
});
