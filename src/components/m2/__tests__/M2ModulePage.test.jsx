import { describe, it, expect, vi, beforeAll, beforeEach } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import M2ModulePage from '../M2ModulePage.jsx';
import { useM2Store } from '@/src/stores/m2Store';
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
  useM2Store.getState().resetDocumentChecklist();
  useM2Store.getState().resetMaritalEstateInventory();
  useM2Store.getState().resetPersonalPropertyInventory();
  useBlueprintStore.getState().resetBlueprint();
});

function seedInventoryProgress(pct) {
  useM2Store.setState((s) => ({
    maritalEstateInventory: {
      ...s.maritalEstateInventory,
      completenessScore: pct,
      startedAt: '2026-01-01T00:00:00.000Z',
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

describe('M2ModulePage — chrome reuse / nav', () => {
  it.each(['navigator', 'signature', 'essentials', 'free'])(
    'renders a "Back to Dashboard" link to /dashboard for %s tier',
    (tier) => {
      render(<M2ModulePage userTier={tier} />);
      const link = screen.getByRole('link', { name: /Back to Dashboard/i });
      expect(link).toHaveAttribute('href', '/dashboard');
    },
  );

  it('does NOT duplicate the "not a law firm" disclaimer (the app footer provides it)', () => {
    render(<M2ModulePage userTier="essentials" />);
    expect(screen.queryByText(/is not a law firm/i)).toBeNull();
  });
});

describe('M2ModulePage — hero', () => {
  it('renders the module eyebrow, gold-accented headline, and three-steps lead', () => {
    render(<M2ModulePage userTier="essentials" />);
    expect(screen.getByText(/Module 02 · Your Tools/i)).toBeInTheDocument();
    const h1 = screen.getByRole('heading', { level: 1 });
    expect(h1).toHaveTextContent(/Know what you\s*own/i);
    expect(
      screen.getByText(/complete picture of what exists/i),
    ).toBeInTheDocument();
  });
});

describe('M2ModulePage — readiness callout', () => {
  it('renders the readiness callout and the three gap pills', () => {
    render(<M2ModulePage userTier="essentials" />);
    expect(
      screen.getByText(/From your readiness assessment/i),
    ).toBeInTheDocument();
    expect(screen.getByText('Debt Awareness')).toBeInTheDocument();
    expect(screen.getByText('Asset Awareness')).toBeInTheDocument();
    expect(screen.getByText('Document Access')).toBeInTheDocument();
  });

  it('renders the "path through this module" section label', () => {
    render(<M2ModulePage userTier="essentials" />);
    expect(
      screen.getByText(/The path through this module/i),
    ).toBeInTheDocument();
  });
});

describe('M2ModulePage — worksheet journey', () => {
  it('renders all three worksheet cards with their step eyebrows and descriptions', () => {
    render(<M2ModulePage userTier="essentials" />);
    expect(screen.getByText('Documentation Checklist')).toBeInTheDocument();
    expect(screen.getByText('Marital Estate Inventory')).toBeInTheDocument();
    expect(screen.getByText('Personal Property Inventory')).toBeInTheDocument();
    expect(screen.getByText(/Step 1 · Gather documents/i)).toBeInTheDocument();
    expect(screen.getByText(/Step 2 · Build inventory/i)).toBeInTheDocument();
    expect(screen.getByText(/Step 3 · Personal property/i)).toBeInTheDocument();
    expect(
      screen.getByText(/Map every asset and debt/i),
    ).toBeInTheDocument();
  });

  it('each worksheet CTA links to its worksheet route', () => {
    render(<M2ModulePage userTier="essentials" />);
    // Step 1 has a unique CTA label.
    expect(
      screen.getByRole('link', { name: /Start checklist/i }),
    ).toHaveAttribute('href', '/modules/m2/checklist');
    // Steps 2 & 3 both read "Start inventory" when not started; assert both routes appear.
    const inventoryHrefs = screen
      .getAllByRole('link', { name: /Start inventory/i })
      .map((l) => l.getAttribute('href'));
    expect(inventoryHrefs).toContain('/modules/m2/inventory');
    expect(inventoryHrefs).toContain('/modules/m2/personal-property');
  });

  it('wires the in-progress worksheet (Marital Estate Inventory) to real completeness %', () => {
    seedInventoryProgress(86);
    render(<M2ModulePage userTier="essentials" />);
    // status pill + percent both reflect the seeded 86%
    expect(screen.getByText(/In progress/i)).toBeInTheDocument();
    expect(screen.getByText(/86%/)).toBeInTheDocument();
    // the in-progress CTA reads "Continue" and routes to the inventory worksheet
    const cont = screen.getByRole('link', { name: /Continue/i });
    expect(cont).toHaveAttribute('href', '/modules/m2/inventory');
  });
});

describe('M2ModulePage — Blueprint sidebar', () => {
  it('renders the Blueprint count, "of 12 sections", 12 ticks, and a link to /blueprint', () => {
    seedBlueprintComplete(3);
    render(<M2ModulePage userTier="essentials" />);
    expect(screen.getByText(/of 12 sections/i)).toBeInTheDocument();
    expect(screen.getByTestId('m2-blueprint-count')).toHaveTextContent('3');
    expect(screen.getAllByTestId('m2-blueprint-tick')).toHaveLength(12);
    expect(
      screen.getByRole('link', { name: /View your Blueprint/i }),
    ).toHaveAttribute('href', '/blueprint');
  });
});

describe('M2ModulePage — Full Access upgrade promo (tier-gated)', () => {
  it.each(['free', 'essentials'])(
    'shows the promo (link to /upgrade) for %s tier',
    (tier) => {
      render(<M2ModulePage userTier={tier} />);
      const link = screen.getByRole('link', {
        name: /Learn about Full Access/i,
      });
      expect(link).toHaveAttribute('href', '/upgrade');
    },
  );

  it.each(['navigator', 'signature'])(
    'hides the promo for Full Access tier %s',
    (tier) => {
      render(<M2ModulePage userTier={tier} />);
      expect(
        screen.queryByRole('link', { name: /Learn about Full Access/i }),
      ).toBeNull();
    },
  );
});

describe('M2ModulePage — Ask Theo (coming soon, non-interactive)', () => {
  it('renders Ask Theo with a "Coming soon" pill and no actionable control', () => {
    render(<M2ModulePage userTier="essentials" />);
    const theo = screen.getByTestId('m2-theo-card');
    expect(within(theo).getByText(/Ask Theo/i)).toBeInTheDocument();
    expect(within(theo).getByText(/Coming soon/i)).toBeInTheDocument();
    expect(within(theo).getByText(/arriving shortly/i)).toBeInTheDocument();
    // Non-interactive: no link or button inside the Theo card.
    expect(within(theo).queryByRole('link')).toBeNull();
    expect(within(theo).queryByRole('button')).toBeNull();
  });
});
