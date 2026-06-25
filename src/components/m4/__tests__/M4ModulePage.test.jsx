import { describe, it, expect, vi, beforeAll, beforeEach } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import M4ModulePage from '../M4ModulePage.jsx';
import { useM4Store } from '@/src/stores/m4Store';
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
  useM4Store.getState().resetM4();
  useBlueprintStore.getState().resetBlueprint();
});

// Mark a worksheet complete by stamping its completedAt (the binary signal the
// adapter keys on; setFilingStatusResults/setPITResults stamp it in real use).
function seedFilingStatusComplete() {
  useM4Store.setState((s) => ({
    filingStatusOptimizer: {
      ...s.filingStatusOptimizer,
      completedAt: '2026-06-25T12:00:00.000Z',
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

describe('M4ModulePage — chrome reuse / nav', () => {
  it.each(['navigator', 'signature', 'essentials', 'free'])(
    'renders a "Back to Dashboard" link to /dashboard for %s tier',
    (tier) => {
      render(<M4ModulePage userTier={tier} />);
      const link = screen.getByRole('link', { name: /Back to Dashboard/i });
      expect(link).toHaveAttribute('href', '/dashboard');
    },
  );

  it('does NOT duplicate the "not a law firm" disclaimer (the app footer provides it)', () => {
    render(<M4ModulePage userTier="navigator" />);
    expect(screen.queryByText(/is not a law firm/i)).toBeNull();
  });
});

describe('M4ModulePage — hero', () => {
  it('renders the module eyebrow, gold-accented headline, and reconciled lead', () => {
    render(<M4ModulePage userTier="navigator" />);
    expect(screen.getByText(/Module 04 · Your Tools/i)).toBeInTheDocument();
    const h1 = screen.getByRole('heading', { level: 1 });
    expect(h1).toHaveTextContent(/Tax\s*Landscape/i);
    expect(
      screen.getByText(/the proper tax treatment of dividing retirement plans/i),
    ).toBeInTheDocument();
  });

  it('the lead does NOT reference the removed Tax-Adjusted Asset View', () => {
    render(<M4ModulePage userTier="navigator" />);
    expect(screen.queryByText(/hidden taxes in transferred assets/i)).toBeNull();
    expect(screen.queryByText(/Tax-Adjusted Asset View/i)).toBeNull();
  });
});

describe('M4ModulePage — readiness callout', () => {
  it('renders the readiness callout and the two gap pills', () => {
    render(<M4ModulePage userTier="navigator" />);
    expect(
      screen.getByText(/From your readiness assessment/i),
    ).toBeInTheDocument();
    expect(screen.getByText('Document Access')).toBeInTheDocument();
    expect(screen.getByText('Asset Awareness')).toBeInTheDocument();
  });

  it('renders the "path through this module" section label', () => {
    render(<M4ModulePage userTier="navigator" />);
    expect(
      screen.getByText(/The path through this module/i),
    ).toBeInTheDocument();
  });
});

describe('M4ModulePage — worksheet journey for Full Access (navigator/signature)', () => {
  it.each(['navigator', 'signature'])(
    'renders both worksheet cards with step eyebrows + descriptions for %s',
    (tier) => {
      render(<M4ModulePage userTier={tier} />);
      expect(screen.getByText('Filing Status Optimizer')).toBeInTheDocument();
      expect(screen.getByText('PIT Tax Discount Calculator')).toBeInTheDocument();
      expect(
        screen.getByText(/Step 1 · Optimize your filing status/i),
      ).toBeInTheDocument();
      expect(
        screen.getByText(/Step 2 · Discount retirement fairly/i),
      ).toBeInTheDocument();
      expect(
        screen.getByText(/why the date of your divorce matters/i),
      ).toBeInTheDocument();
    },
  );

  it('each not-started worksheet CTA links to its worksheet route (id ≠ slug)', () => {
    render(<M4ModulePage userTier="navigator" />);
    expect(
      screen.getByRole('link', { name: /Start optimizer/i }),
    ).toHaveAttribute('href', '/modules/m4/filing-status');
    expect(
      screen.getByRole('link', { name: /Start calculator/i }),
    ).toHaveAttribute('href', '/modules/m4/tax-discount');
  });

  it('a completed worksheet (completedAt set) shows the complete treatment with a Review CTA to its route', () => {
    seedFilingStatusComplete();
    render(<M4ModulePage userTier="navigator" />);
    expect(screen.getByText(/Complete/i)).toBeInTheDocument();
    const review = screen.getByRole('link', { name: /Review/i });
    expect(review).toHaveAttribute('href', '/modules/m4/filing-status');
  });

  it('shows NO locked treatment for Full Access users', () => {
    render(<M4ModulePage userTier="navigator" />);
    expect(screen.queryByTestId('m4-locked-node')).toBeNull();
    expect(screen.queryByTestId('m4-locked-card')).toBeNull();
    expect(screen.queryByText('Included in Full Access')).toBeNull();
    expect(screen.queryByRole('link', { name: /Unlock/i })).toBeNull();
  });
});

describe('M4ModulePage — wholesale-gated locked treatment (free/essentials)', () => {
  it.each(['free', 'essentials'])(
    'renders BOTH worksheets LOCKED (Option C) for %s tier',
    (tier) => {
      render(<M4ModulePage userTier={tier} />);

      // Two locked nodes, each a lock glyph (svg) — NOT a step number.
      const lockedNodes = screen.getAllByTestId('m4-locked-node');
      expect(lockedNodes).toHaveLength(2);
      for (const node of lockedNodes) {
        expect(node.querySelector('svg')).toBeTruthy();
        expect(node.textContent).not.toMatch(/\d/);
      }

      // Two gold-tint locked cards, each: tool name + "Included in Full Access"
      // sub-line + a single "Unlock →" link to /upgrade — and nothing actionable.
      const lockedCards = screen.getAllByTestId('m4-locked-card');
      expect(lockedCards).toHaveLength(2);
      const titles = ['Filing Status Optimizer', 'PIT Tax Discount Calculator'];
      lockedCards.forEach((card, i) => {
        const scope = within(card);
        expect(scope.getByText(titles[i])).toBeInTheDocument();
        expect(scope.getByText('Included in Full Access')).toBeInTheDocument();

        const links = scope.getAllByRole('link');
        expect(links).toHaveLength(1); // only the Unlock link
        expect(links[0]).toHaveAccessibleName(/Unlock/i);
        expect(links[0]).toHaveAttribute('href', '/upgrade');

        expect(scope.queryByText(/Worksheet progress/i)).toBeNull();
        expect(scope.queryByText(/% complete/i)).toBeNull();
        expect(scope.queryByRole('button')).toBeNull();
      });

      // No per-worksheet route CTAs leak through for a locked user.
      expect(
        screen.queryByRole('link', { name: /Start optimizer/i }),
      ).toBeNull();
      expect(
        screen.queryByRole('link', { name: /Start calculator/i }),
      ).toBeNull();
    },
  );

  it('locking overrides real progress — a completed worksheet still renders locked for free/essentials', () => {
    seedFilingStatusComplete();
    render(<M4ModulePage userTier="essentials" />);
    expect(screen.getAllByTestId('m4-locked-card')).toHaveLength(2);
    // The "Complete" status pill is suppressed under the locked treatment.
    expect(screen.queryByText(/Complete/i)).toBeNull();
  });
});

describe('M4ModulePage — Blueprint sidebar', () => {
  it('renders the Blueprint count, "of 12 sections", 12 ticks, and a link to /blueprint', () => {
    seedBlueprintComplete(4);
    render(<M4ModulePage userTier="navigator" />);
    expect(screen.getByText(/of 12 sections/i)).toBeInTheDocument();
    expect(screen.getByTestId('m4-blueprint-count')).toHaveTextContent('4');
    expect(screen.getAllByTestId('m4-blueprint-tick')).toHaveLength(12);
    expect(
      screen.getByRole('link', { name: /View your Blueprint/i }),
    ).toHaveAttribute('href', '/blueprint');
  });
});

describe('M4ModulePage — Full Access upgrade promo (tier-gated, mirrors M2/M3)', () => {
  it.each(['free', 'essentials'])(
    'shows the promo (link to /upgrade) for %s tier',
    (tier) => {
      render(<M4ModulePage userTier={tier} />);
      const link = screen.getByRole('link', {
        name: /Learn about Full Access/i,
      });
      expect(link).toHaveAttribute('href', '/upgrade');
    },
  );

  it.each(['navigator', 'signature'])(
    'hides the promo for Full Access tier %s',
    (tier) => {
      render(<M4ModulePage userTier={tier} />);
      expect(
        screen.queryByRole('link', { name: /Learn about Full Access/i }),
      ).toBeNull();
    },
  );
});

describe('M4ModulePage — Ask Theo (coming soon, non-interactive)', () => {
  it('renders Ask Theo with a "Coming soon" pill and no actionable control', () => {
    render(<M4ModulePage userTier="navigator" />);
    const theo = screen.getByTestId('m4-theo-card');
    expect(within(theo).getByText(/Ask Theo/i)).toBeInTheDocument();
    expect(within(theo).getByText(/Coming soon/i)).toBeInTheDocument();
    expect(within(theo).getByText(/arriving shortly/i)).toBeInTheDocument();
    expect(within(theo).queryByRole('link')).toBeNull();
    expect(within(theo).queryByRole('button')).toBeNull();
  });
});
