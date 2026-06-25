import { describe, it, expect, vi, beforeAll, beforeEach } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import ModuleLanding from './ModuleLanding';
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
  useBlueprintStore.getState().resetBlueprint();
});

// A synthetic ModuleLandingConfig: four worksheets, two ungated (one in_progress,
// one not_started) + two `gated` behind a navigator (Full Access) tier gate. No real
// module ships gated worksheets yet, so this drives the locked render path the way
// #90 proved N=2 / N=4 — through the shared ModuleLanding, not a real page.
const SYNTH_CONFIG = {
  module: 'synth',
  eyebrow: 'Module 00 · Synthetic',
  headline: { text: 'Synthetic locked module', goldWord: 'locked' },
  lead: 'A synthetic config exercising the gated/locked worksheet treatment.',
  readiness: { copy: 'Synthetic readiness copy.', pills: ['Alpha', 'Beta'] },
  worksheets: [
    {
      id: 'ungated-progress',
      stepLabel: 'Step 1 · Inventory',
      title: 'Inventory Worksheet',
      description: 'An ungated, in-progress worksheet.',
      route: '/synth/inventory',
      ctaCopy: 'Start inventory',
    },
    {
      id: 'ungated-fresh',
      stepLabel: 'Step 2 · Debts',
      title: 'Debt Worksheet',
      description: 'An ungated, not-started worksheet.',
      route: '/synth/debts',
      ctaCopy: 'Start debts',
    },
    {
      id: 'gated-tax',
      stepLabel: 'Step 3 · Tax impact',
      title: 'Tax-Impact Modeler',
      description: 'A gated worksheet requiring Full Access.',
      route: '/synth/tax',
      ctaCopy: 'Start tax',
      gated: true,
    },
    {
      id: 'gated-settlement',
      stepLabel: 'Step 4 · Settlement',
      title: 'Settlement Comparison',
      description: 'Another gated worksheet requiring Full Access.',
      route: '/synth/settlement',
      ctaCopy: 'Start settlement',
      gated: true,
    },
  ],
  tierGate: 'navigator',
  upgrade: {
    headline: 'See your complete settlement picture.',
    body: 'Upgrade to unlock the gated worksheets.',
    ctaCopy: 'Learn about Full Access',
  },
  links: { dashboard: '/dashboard', blueprint: '/blueprint', upgrade: '/upgrade' },
};

// The gated worksheets carry REAL progress in the adapter output — locking must
// override it (the 60% on gated-tax is suppressed for a locked user, restored for
// a Full Access user). This proves locking is a presentation overlay, not a data edit.
const SYNTH_PROGRESS = [
  { id: 'ungated-progress', status: 'in_progress', pct: 40 },
  { id: 'ungated-fresh', status: 'not_started', pct: 0 },
  { id: 'gated-tax', status: 'in_progress', pct: 60 },
  { id: 'gated-settlement', status: 'not_started', pct: 0 },
];

const renderSynth = (userTier) =>
  render(
    <ModuleLanding
      config={SYNTH_CONFIG}
      progress={SYNTH_PROGRESS}
      userTier={userTier}
    />,
  );

describe('ModuleLanding — locked worksheets (Option C) for users below the tier gate', () => {
  it.each(['free', 'essentials'])(
    'renders the two gated worksheets LOCKED for %s tier',
    (tier) => {
      renderSynth(tier);

      // Two locked nodes, each a lock glyph (svg) — NOT a step number.
      const lockedNodes = screen.getAllByTestId('synth-locked-node');
      expect(lockedNodes).toHaveLength(2);
      for (const node of lockedNodes) {
        expect(node.querySelector('svg')).toBeTruthy();
        expect(node.textContent).not.toMatch(/\d/);
      }

      // Two gold-tint locked cards.
      const lockedCards = screen.getAllByTestId('synth-locked-card');
      expect(lockedCards).toHaveLength(2);

      // Each locked card: tool name (clear), the "Included in Full Access" sub-line,
      // and a single "Unlock →" link to the upgrade route — and NOTHING else
      // actionable (no progress bar, no primary CTA).
      const titles = ['Tax-Impact Modeler', 'Settlement Comparison'];
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
        expect(scope.queryByText(/Continue/i)).toBeNull();
        expect(scope.queryByRole('button')).toBeNull();
      });

      // Sanity: exactly two Unlock links across the page (one per locked row); the
      // sidebar promo CTA reads "Learn about Full Access", not "Unlock".
      expect(screen.getAllByRole('link', { name: /Unlock/i })).toHaveLength(2);
    },
  );

  it('leaves the ungated worksheets in their normal in_progress / not_started states', () => {
    renderSynth('free');

    // Step 1 ungated: in_progress, 40%, "Continue" CTA to its own route.
    expect(screen.getByText(/In progress/i)).toBeInTheDocument();
    expect(screen.getByText(/40%/)).toBeInTheDocument();
    const cont = screen.getByRole('link', { name: /Continue/i });
    expect(cont).toHaveAttribute('href', '/synth/inventory');

    // Step 2 ungated: not started, its own "Start debts" CTA to its route.
    const start = screen.getByRole('link', { name: /Start debts/i });
    expect(start).toHaveAttribute('href', '/synth/debts');

    // The ungated rows are NOT rendered with the locked treatment.
    expect(screen.getByText('Inventory Worksheet')).toBeInTheDocument();
    expect(screen.queryByText('A gated worksheet requiring Full Access.')).toBeNull();
  });
});

describe('ModuleLanding — gated worksheets resolve to REAL status for Full Access users', () => {
  it.each(['navigator', 'signature'])(
    'shows NO locked treatment for %s tier',
    (tier) => {
      renderSynth(tier);

      // The locked node + card are entirely absent.
      expect(screen.queryByTestId('synth-locked-node')).toBeNull();
      expect(screen.queryByTestId('synth-locked-card')).toBeNull();
      expect(screen.queryByText('Included in Full Access')).toBeNull();
      expect(screen.queryByRole('link', { name: /Unlock/i })).toBeNull();
    },
  );

  it('resolves the gated tax worksheet to its real in_progress status with a route CTA', () => {
    renderSynth('navigator');

    // gated-tax was in_progress 60% in the adapter output → now visible.
    expect(screen.getByText(/60%/)).toBeInTheDocument();
    // Its CTA is "Continue" to its OWN route, not the upgrade route.
    const taxCta = screen
      .getAllByRole('link', { name: /Continue/i })
      .map((l) => l.getAttribute('href'));
    expect(taxCta).toContain('/synth/tax');

    // gated-settlement (not_started) shows its own start CTA to its route.
    expect(
      screen.getByRole('link', { name: /Start settlement/i }),
    ).toHaveAttribute('href', '/synth/settlement');
  });
});
