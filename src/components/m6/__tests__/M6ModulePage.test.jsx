/**
 * M6ModulePage — landing tests (Phase 0a foundation + Phase 1 Priorities +
 * Phase 2 Trade-Off Analyzer).
 *
 * M6 is Full Access only (`hasAccess(userTier, 'navigator')`). Phases 1–3 flipped
 * the Priorities, Trade-Off Analyzer, and Settlement Offer Organizer cards to
 * `available: true`. The Full-state surface is now THREE live Open links
 * (Priorities + Trade-Off + Offer Organizer) plus ONE "Coming soon" pill
 * (Deferred Comp). Tier-lock still dominates: a non-Full user sees the Locked
 * treatment regardless of `available`.
 */

import { describe, it, expect } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import M6ModulePage from '../M6ModulePage.jsx';

const TOOL_TITLES = [
  'Priorities Worksheet',
  'Trade-Off Analyzer',
  'Settlement Offer Organizer',
  'Deferred Compensation Analyzer',
];

const TOOL_ROUTES = [
  '/modules/m6/priorities',
  '/modules/m6/trade-off',
  '/modules/m6/offer-organizer',
  '/modules/m6/deferred-comp',
];

describe('M6ModulePage — header + nav', () => {
  it.each(['navigator', 'signature', 'essentials', 'free'])(
    'renders the module header for %s tier',
    (tier) => {
      render(<M6ModulePage userTier={tier} />);
      expect(
        screen.getByRole('heading', { name: /M6 — Negotiate from Strength/ }),
      ).toBeInTheDocument();
    },
  );

  it.each(['navigator', 'signature', 'essentials', 'free'])(
    'renders "← Back to Dashboard" link → /dashboard for %s tier',
    (tier) => {
      render(<M6ModulePage userTier={tier} />);
      const link = screen.getByRole('link', { name: /Back to Dashboard/i });
      expect(link).toHaveAttribute('href', '/dashboard');
    },
  );
});

describe('M6ModulePage — Full state (all four tools live)', () => {
  // M6 Phase 4 flipped the Deferred Compensation Analyzer card to available:true —
  // it was the last M6 card to flip (§9.5), so Full Access now shows four live
  // Open links and zero "Coming soon" pills.
  it.each(['navigator', 'signature'])(
    '%s tier renders all four tools as live Open links to their routes (no Coming soon, no Unlock CTA)',
    (tier) => {
      render(<M6ModulePage userTier={tier} />);

      const cards = screen.getAllByTestId('m6-tool-card');
      expect(cards).toHaveLength(4);

      TOOL_ROUTES.forEach((route, i) => {
        const open = within(cards[i]).getByRole('link', { name: /Open/i });
        expect(open).toHaveAttribute('href', route);
        expect(within(cards[i]).queryByTestId('m6-tool-card-coming-soon')).toBeNull();
        expect(within(cards[i]).queryByTestId('m6-tool-card-lock')).toBeNull();
      });

      expect(screen.queryByTestId('m6-tool-card-coming-soon')).toBeNull();
      expect(screen.queryByText(/Unlock with Full Access/i)).not.toBeInTheDocument();
    },
  );

  it('renders all four tool titles in the canonical order', () => {
    render(<M6ModulePage userTier="navigator" />);
    const titles = screen
      .getAllByRole('heading', { level: 2 })
      .map((h) => h.textContent);
    expect(titles).toEqual(TOOL_TITLES);
  });

  it('links all four built tool routes (incl. the Deferred Compensation Analyzer)', () => {
    render(<M6ModulePage userTier="navigator" />);
    const hrefs = screen.getAllByRole('link').map((a) => a.getAttribute('href'));
    for (const route of TOOL_ROUTES) {
      expect(hrefs).toContain(route);
    }
  });
});

describe('M6ModulePage — Locked state (tier-lock dominates)', () => {
  it.each(['free', 'essentials'])(
    '%s tier renders Locked treatment on all four cards (no Coming soon pill bleeds through)',
    (tier) => {
      render(<M6ModulePage userTier={tier} />);

      const cards = screen.getAllByTestId('m6-tool-card');
      expect(cards).toHaveLength(4);

      for (const card of cards) {
        expect(within(card).getByTestId('m6-tool-card-lock')).toBeInTheDocument();
        expect(within(card).queryByRole('link', { name: /Open/i })).toBeNull();
        // Tier-lock dominates: when locked, do not also show "Coming soon".
        expect(within(card).queryByTestId('m6-tool-card-coming-soon')).toBeNull();
      }
    },
  );

  it.each(['free', 'essentials'])(
    '%s tier surfaces a single "Unlock with Full Access" CTA → /upgrade',
    (tier) => {
      render(<M6ModulePage userTier={tier} />);
      const upsell = screen.getByRole('link', { name: /Unlock with Full Access/i });
      expect(upsell).toHaveAttribute('href', '/upgrade');
    },
  );

  it('Locked cards do not link to any tool route', () => {
    render(<M6ModulePage userTier="essentials" />);
    const allLinks = screen.getAllByRole('link');
    for (const route of TOOL_ROUTES) {
      const dead = allLinks.find((a) => a.getAttribute('href') === route);
      expect(dead).toBeUndefined();
    }
  });
});
