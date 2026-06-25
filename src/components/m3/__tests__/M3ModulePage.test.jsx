import { describe, it, expect, vi, beforeAll, beforeEach } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import M3ModulePage from '../M3ModulePage.jsx';
import { useM3Store } from '@/src/stores/m3Store';
import useBlueprintStore from '@/src/stores/blueprintStore';

// next/link reaches for the App Router; stub it so jsdom renders don't throw.
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), prefetch: vi.fn() }),
}));

beforeAll(() => {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: vi.fn().mockImplementation((query) => ({
      matches: false,
      media: query,
      onchange: null,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      addListener: vi.fn(),
      removeListener: vi.fn(),
    })),
  });
});

beforeEach(() => {
  // Reset both persisted stores so tests don't bleed via jsdom localStorage.
  useM3Store.getState().resetPayStubDecoder();
  useM3Store.getState().resetBudgetModeler();
  useM3Store.getState().resetAffidavitBuilder();
  useBlueprintStore.getState().resetBlueprint();
});

// Put the Budget Modeler into the in_progress badge state: a column value entered,
// but no results yet (badge keys on results !== null).
function seedBudgetInProgress() {
  useM3Store.setState((s) => ({
    budgetModeler: {
      ...s.budgetModeler,
      results: null,
      current: {
        ...s.budgetModeler.current,
        home: { ...s.budgetModeler.current.home, rentMortgage: 1500 },
      },
    },
  }));
}

function seedBlueprintComplete(n) {
  useBlueprintStore.setState((s) => {
    const keys = Object.keys(s.sections).slice(0, n);
    const sections = { ...s.sections };
    for (const k of keys) sections[k] = { ...sections[k], status: 'complete' };
    return { sections };
  });
}

describe('M3ModulePage — chrome reuse / nav', () => {
  it.each(['navigator', 'signature', 'essentials', 'free'])(
    'renders a "Back to Dashboard" link to /dashboard for %s tier',
    (tier) => {
      render(<M3ModulePage userTier={tier} />);
      const link = screen.getByRole('link', { name: /Back to Dashboard/i });
      expect(link).toHaveAttribute('href', '/dashboard');
    },
  );

  it('does NOT duplicate the "not a law firm" disclaimer (the app footer provides it)', () => {
    render(<M3ModulePage userTier="essentials" />);
    expect(screen.queryByText(/is not a law firm/i)).toBeNull();
  });
});

describe('M3ModulePage — hero', () => {
  it('renders the module eyebrow, gold-accented headline, and income/expenses lead', () => {
    render(<M3ModulePage userTier="essentials" />);
    expect(screen.getByText(/Module 03 · Your Tools/i)).toBeInTheDocument();
    const h1 = screen.getByRole('heading', { level: 1 });
    expect(h1).toHaveTextContent(/Know What You\s*Spend/i);
    expect(
      screen.getByText(/prepare the financial data your attorney needs/i),
    ).toBeInTheDocument();
  });
});

describe('M3ModulePage — readiness callout', () => {
  it('renders the readiness callout and the three gap pills', () => {
    render(<M3ModulePage userTier="essentials" />);
    expect(
      screen.getByText(/From your readiness assessment/i),
    ).toBeInTheDocument();
    expect(screen.getByText('Income Awareness')).toBeInTheDocument();
    expect(screen.getByText('Spending Awareness')).toBeInTheDocument();
    expect(screen.getByText('Debt Awareness')).toBeInTheDocument();
  });

  it('renders the "path through this module" section label', () => {
    render(<M3ModulePage userTier="essentials" />);
    expect(
      screen.getByText(/The path through this module/i),
    ).toBeInTheDocument();
  });
});

describe('M3ModulePage — worksheet journey', () => {
  it('renders all three worksheet cards with their step eyebrows and descriptions', () => {
    render(<M3ModulePage userTier="essentials" />);
    expect(screen.getByText('Pay Stub Decoder')).toBeInTheDocument();
    expect(screen.getByText('Budget Modeler')).toBeInTheDocument();
    expect(screen.getByText('Financial Affidavit Builder')).toBeInTheDocument();
    expect(screen.getByText(/Step 1 · Decode your pay stub/i)).toBeInTheDocument();
    expect(screen.getByText(/Step 2 · Model your budget/i)).toBeInTheDocument();
    expect(screen.getByText(/Step 3 · Build your affidavit/i)).toBeInTheDocument();
    expect(
      screen.getByText(/Compare your current household expenses/i),
    ).toBeInTheDocument();
  });

  it('each not-started worksheet CTA links to its worksheet route (id ≠ slug)', () => {
    render(<M3ModulePage userTier="essentials" />);
    expect(
      screen.getByRole('link', { name: /Start decoder/i }),
    ).toHaveAttribute('href', '/modules/m3/pay-stub');
    expect(
      screen.getByRole('link', { name: /Start modeler/i }),
    ).toHaveAttribute('href', '/modules/m3/budget');
    expect(
      screen.getByRole('link', { name: /Start affidavit/i }),
    ).toHaveAttribute('href', '/modules/m3/affidavit');
  });

  it('wires the in-progress worksheet (Budget Modeler) to its real badge state', () => {
    seedBudgetInProgress();
    render(<M3ModulePage userTier="essentials" />);
    expect(screen.getByText(/In progress/i)).toBeInTheDocument();
    expect(screen.getByText(/50%/)).toBeInTheDocument();
    const cont = screen.getByRole('link', { name: /Continue/i });
    expect(cont).toHaveAttribute('href', '/modules/m3/budget');
  });
});

describe('M3ModulePage — Blueprint sidebar', () => {
  it('renders the Blueprint count, "of 12 sections", 12 ticks, and a link to /blueprint', () => {
    seedBlueprintComplete(3);
    render(<M3ModulePage userTier="essentials" />);
    expect(screen.getByText(/of 12 sections/i)).toBeInTheDocument();
    expect(screen.getByTestId('m3-blueprint-count')).toHaveTextContent('3');
    expect(screen.getAllByTestId('m3-blueprint-tick')).toHaveLength(12);
    expect(
      screen.getByRole('link', { name: /View your Blueprint/i }),
    ).toHaveAttribute('href', '/blueprint');
  });
});

describe('M3ModulePage — Full Access upgrade promo (tier-gated, mirrors M2)', () => {
  it.each(['free', 'essentials'])(
    'shows the promo (link to /upgrade) for %s tier',
    (tier) => {
      render(<M3ModulePage userTier={tier} />);
      const link = screen.getByRole('link', {
        name: /Learn about Full Access/i,
      });
      expect(link).toHaveAttribute('href', '/upgrade');
    },
  );

  it.each(['navigator', 'signature'])(
    'hides the promo for Full Access tier %s',
    (tier) => {
      render(<M3ModulePage userTier={tier} />);
      expect(
        screen.queryByRole('link', { name: /Learn about Full Access/i }),
      ).toBeNull();
    },
  );
});

describe('M3ModulePage — Ask Theo (coming soon, non-interactive)', () => {
  it('renders Ask Theo with a "Coming soon" pill and no actionable control', () => {
    render(<M3ModulePage userTier="essentials" />);
    const theo = screen.getByTestId('m3-theo-card');
    expect(within(theo).getByText(/Ask Theo/i)).toBeInTheDocument();
    expect(within(theo).getByText(/Coming soon/i)).toBeInTheDocument();
    expect(within(theo).getByText(/arriving shortly/i)).toBeInTheDocument();
    expect(within(theo).queryByRole('link')).toBeNull();
    expect(within(theo).queryByRole('button')).toBeNull();
  });
});
