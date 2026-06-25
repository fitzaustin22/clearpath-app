/**
 * M5ModulePage — module landing tests, REWRITTEN for the shared ModuleLanding
 * "Primary" layout (sidebar + journey spine). Replaces the prior card-grid suite
 * (m5-tool-card grid / Open|Locked buttons / M2+M4 footer / hero "View Your
 * Blueprint" CTA / EDU-paragraph section) — none of those DOM elements survive the
 * migration. Mirrors M4ModulePage.test.jsx (the wholesale-gated sibling): hero copy,
 * readiness callout, journey (locked for free/essentials, resolved for navigator),
 * Blueprint sidebar, upgrade promo, Ask Theo.
 *
 * M5 is wholesale-gated (all four worksheets `gated`), so free/essentials see four
 * Option-C locked cards; navigator/signature see real per-worksheet status from the
 * heterogeneous adapter. The two novel completion mappings — Pension Valuation
 * (multi-instance `assets{}`) and QDRO (the dormant `metadata.qdroPacketGeneratedAt`)
 * — are exercised here end-to-end by seeding the store.
 */

import { describe, it, expect, vi, beforeAll, beforeEach } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import M5ModulePage from '../M5ModulePage.jsx';
import { useM5Store } from '@/src/stores/m5Store';
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

// m5Store has no resetM5 helper — clear the four tool slices directly (+ blueprint).
function resetStores() {
  useM5Store.setState((s) => ({
    supportEstimator: { ...s.supportEstimator, results: null },
    homeDecision: { ...s.homeDecision, results: null },
    pensionValuation: { ...s.pensionValuation, assets: {} },
    qdroDecision: { ...s.qdroDecision, assets: {} },
  }));
  useBlueprintStore.getState().resetBlueprint();
}
beforeEach(resetStores);

// ── Seed helpers — one per completion semantic ───────────────────────────────
const seedSupportComplete = () =>
  useM5Store.setState((s) => ({
    supportEstimator: { ...s.supportEstimator, results: { childSupport: { monthly: 500 } } },
  }));
const seedPensionComplete = () =>
  useM5Store.setState((s) => ({
    pensionValuation: {
      ...s.pensionValuation,
      assets: { a1: { inputs: {}, results: { pv: { best: 100000 } } } },
    },
  }));
const seedPensionStarted = () =>
  useM5Store.setState((s) => ({
    pensionValuation: { ...s.pensionValuation, assets: { a1: { inputs: {}, results: null } } },
  }));
const seedQdroPacketComplete = () =>
  useM5Store.setState((s) => ({
    qdroDecision: {
      ...s.qdroDecision,
      assets: {
        a1: {
          userRole: null,
          planType: 'private_db',
          decisions: {},
          metadata: { formulaId: 'x', citations: [], qdroPacketGeneratedAt: '2026-06-25T00:00:00.000Z' },
        },
      },
    },
  }));
const seedBlueprintComplete = (n) =>
  useBlueprintStore.setState((s) => {
    const keys = Object.keys(s.sections).slice(0, n);
    const sections = { ...s.sections };
    for (const k of keys) sections[k] = { ...sections[k], status: 'complete' };
    return { sections };
  });

// Verbatim §1.6 descriptions (carried from the old page) + net-new step labels / CTAs.
const WORKSHEETS = [
  {
    title: 'Support Estimator',
    step: 'Step 1 · Estimate support',
    descMatch: /child and spousal support/i,
    route: '/modules/m5/support-estimator',
    cta: /Start estimator/i,
  },
  {
    title: 'Pension Valuation Analyzer',
    step: 'Step 2 · Value the pension',
    descMatch: /defined-benefit pension at present value/i,
    route: '/modules/m5/pva',
    cta: /Start analyzer/i,
  },
  {
    title: 'QDRO Decision Guide',
    step: 'Step 3 · Plan the retirement split',
    descMatch: /attorney handoff packet/i,
    route: '/modules/m5/qdro',
    cta: /Start guide/i,
  },
  {
    title: 'Home Decision Analyzer',
    step: 'Step 4 · Decide on the home',
    descMatch: /keep, sell, and deferred-sale outcomes/i,
    route: '/modules/m5/home-decision',
    cta: /Compare scenarios/i,
  },
];

// ── Chrome / nav ─────────────────────────────────────────────────────────────
describe('M5ModulePage — chrome / nav', () => {
  it.each(['navigator', 'signature', 'essentials', 'free'])(
    'renders a "Back to Dashboard" link to /dashboard for %s tier',
    (tier) => {
      render(<M5ModulePage userTier={tier} />);
      expect(
        screen.getByRole('link', { name: /Back to Dashboard/i }),
      ).toHaveAttribute('href', '/dashboard');
    },
  );

  it('does NOT duplicate the "not a law firm" disclaimer (the app footer provides it)', () => {
    render(<M5ModulePage userTier="navigator" />);
    expect(screen.queryByText(/is not a law firm/i)).toBeNull();
  });
});

// ── Hero ─────────────────────────────────────────────────────────────────────
describe('M5ModulePage — hero', () => {
  it('renders the module eyebrow, gold-accented headline, and trimmed lead', () => {
    render(<M5ModulePage userTier="navigator" />);
    expect(screen.getByText(/Module 05 · Your Tools/i)).toBeInTheDocument();
    const h1 = screen.getByRole('heading', { level: 1 });
    expect(h1).toHaveTextContent(/Value What\s*Matters/i);
    expect(
      screen.getByText(/CDFA-grade valuations and decision frameworks/i),
    ).toBeInTheDocument();
  });
});

// ── Readiness callout ────────────────────────────────────────────────────────
describe('M5ModulePage — readiness callout', () => {
  it('renders the readiness callout and the two M1-domain gap pills', () => {
    render(<M5ModulePage userTier="navigator" />);
    expect(screen.getByText(/From your readiness assessment/i)).toBeInTheDocument();
    expect(screen.getByText('Asset Awareness')).toBeInTheDocument();
    expect(screen.getByText('Income Awareness')).toBeInTheDocument();
  });

  it('renders the "path through this module" section label', () => {
    render(<M5ModulePage userTier="navigator" />);
    expect(screen.getByText(/The path through this module/i)).toBeInTheDocument();
  });
});

// ── Worksheet journey — Full Access (navigator / signature) ──────────────────
describe('M5ModulePage — worksheet journey for Full Access', () => {
  it.each(['navigator', 'signature'])(
    'renders all four worksheet cards with step eyebrows + titles for %s',
    (tier) => {
      render(<M5ModulePage userTier={tier} />);
      for (const w of WORKSHEETS) {
        expect(screen.getByText(w.title)).toBeInTheDocument();
        expect(screen.getByText(w.step)).toBeInTheDocument();
        expect(screen.getByText(w.descMatch)).toBeInTheDocument();
      }
    },
  );

  it('the first not-started worksheet CTA links to its worksheet route (id ≠ slug)', () => {
    render(<M5ModulePage userTier="navigator" />);
    // SE is the first actionable (primary) step; its CTA is the not-started verb.
    expect(screen.getByRole('link', { name: /Start estimator/i })).toHaveAttribute(
      'href',
      '/modules/m5/support-estimator',
    );
  });

  it('shows NO locked treatment for Full Access users', () => {
    render(<M5ModulePage userTier="navigator" />);
    expect(screen.queryByTestId('m5-locked-node')).toBeNull();
    expect(screen.queryByTestId('m5-locked-card')).toBeNull();
    expect(screen.queryByText('Included in Full Access')).toBeNull();
    expect(screen.queryByRole('link', { name: /Unlock/i })).toBeNull();
  });
});

// ── Completion mappings exercised end-to-end (navigator) ─────────────────────
describe('M5ModulePage — completion treatment (navigator)', () => {
  it('a completed singleton (Support Estimator results) shows Complete + a Review CTA to its route', () => {
    seedSupportComplete();
    render(<M5ModulePage userTier="navigator" />);
    expect(screen.getAllByText(/Complete/i).length).toBeGreaterThan(0);
    const review = screen.getByRole('link', { name: /Review/i });
    expect(review).toHaveAttribute('href', '/modules/m5/support-estimator');
  });

  it('Pension Valuation: an asset WITH results renders the complete treatment (multi-instance rule)', () => {
    seedPensionComplete();
    render(<M5ModulePage userTier="navigator" />);
    const review = screen.getByRole('link', { name: /Review/i });
    expect(review).toHaveAttribute('href', '/modules/m5/pva');
  });

  it('Pension Valuation: a bare asset (no results) renders in_progress with a Continue CTA', () => {
    seedPensionStarted();
    render(<M5ModulePage userTier="navigator" />);
    expect(screen.getByText(/In progress/i)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Continue/i })).toHaveAttribute(
      'href',
      '/modules/m5/pva',
    );
  });

  it('QDRO: seeding metadata.qdroPacketGeneratedAt renders the complete treatment (dormant-flag rule)', () => {
    seedQdroPacketComplete();
    render(<M5ModulePage userTier="navigator" />);
    const review = screen.getByRole('link', { name: /Review/i });
    expect(review).toHaveAttribute('href', '/modules/m5/qdro');
  });
});

// ── Wholesale-gated locked treatment (free / essentials) ─────────────────────
describe('M5ModulePage — wholesale-gated locked treatment (free/essentials)', () => {
  it.each(['free', 'essentials'])(
    'renders ALL FOUR worksheets LOCKED (Option C) for %s tier',
    (tier) => {
      render(<M5ModulePage userTier={tier} />);

      const lockedNodes = screen.getAllByTestId('m5-locked-node');
      expect(lockedNodes).toHaveLength(4);
      for (const node of lockedNodes) {
        expect(node.querySelector('svg')).toBeTruthy(); // lock glyph
        expect(node.textContent).not.toMatch(/\d/); // not a step number
      }

      const lockedCards = screen.getAllByTestId('m5-locked-card');
      expect(lockedCards).toHaveLength(4);
      WORKSHEETS.forEach((w, i) => {
        const scope = within(lockedCards[i]);
        expect(scope.getByText(w.title)).toBeInTheDocument();
        expect(scope.getByText('Included in Full Access')).toBeInTheDocument();
        const links = scope.getAllByRole('link');
        expect(links).toHaveLength(1); // only the Unlock link
        expect(links[0]).toHaveAccessibleName(/Unlock/i);
        expect(links[0]).toHaveAttribute('href', '/upgrade');
        expect(scope.queryByText(/Worksheet progress/i)).toBeNull();
        expect(scope.queryByText(/% complete/i)).toBeNull();
      });

      // No per-worksheet route CTA leaks through for a locked user.
      for (const w of WORKSHEETS) {
        expect(screen.queryByRole('link', { name: w.cta })).toBeNull();
      }
    },
  );

  it('locking overrides real progress — a seeded-complete worksheet still renders locked', () => {
    seedSupportComplete();
    seedQdroPacketComplete();
    render(<M5ModulePage userTier="essentials" />);
    expect(screen.getAllByTestId('m5-locked-card')).toHaveLength(4);
    expect(screen.queryByText(/Complete/i)).toBeNull();
    expect(screen.queryByRole('link', { name: /Review/i })).toBeNull();
  });
});

// ── Blueprint sidebar ────────────────────────────────────────────────────────
describe('M5ModulePage — Blueprint sidebar', () => {
  it('renders the Blueprint count, "of 12 sections", 12 ticks, and a link to /blueprint', () => {
    seedBlueprintComplete(5);
    render(<M5ModulePage userTier="navigator" />);
    expect(screen.getByText(/of 12 sections/i)).toBeInTheDocument();
    expect(screen.getByTestId('m5-blueprint-count')).toHaveTextContent('5');
    expect(screen.getAllByTestId('m5-blueprint-tick')).toHaveLength(12);
    expect(
      screen.getByRole('link', { name: /View your Blueprint/i }),
    ).toHaveAttribute('href', '/blueprint');
  });
});

// ── Full Access upgrade promo (wholesale-gated) ──────────────────────────────
describe('M5ModulePage — Full Access upgrade promo', () => {
  it.each(['free', 'essentials'])(
    'shows the promo (link to /upgrade) for %s tier',
    (tier) => {
      render(<M5ModulePage userTier={tier} />);
      expect(
        screen.getByRole('link', { name: /Learn about Full Access/i }),
      ).toHaveAttribute('href', '/upgrade');
    },
  );

  it.each(['navigator', 'signature'])(
    'hides the promo for Full Access tier %s',
    (tier) => {
      render(<M5ModulePage userTier={tier} />);
      expect(
        screen.queryByRole('link', { name: /Learn about Full Access/i }),
      ).toBeNull();
    },
  );
});

// ── Ask Theo (coming soon, non-interactive) ──────────────────────────────────
describe('M5ModulePage — Ask Theo', () => {
  it('renders Ask Theo with a "Coming soon" pill and no actionable control', () => {
    render(<M5ModulePage userTier="navigator" />);
    const theo = screen.getByTestId('m5-theo-card');
    expect(within(theo).getByText(/Ask Theo/i)).toBeInTheDocument();
    expect(within(theo).getByText(/Coming soon/i)).toBeInTheDocument();
    expect(within(theo).queryByRole('link')).toBeNull();
    expect(within(theo).queryByRole('button')).toBeNull();
  });
});
