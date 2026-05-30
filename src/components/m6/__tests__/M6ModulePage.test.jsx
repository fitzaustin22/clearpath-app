/**
 * M6ModulePage — landing tests (Phase 0a foundation + Phase 1 Priorities).
 *
 * M6 is Full Access only (`hasAccess(userTier, 'navigator')`). Phase 1 flips the
 * Priorities card to `available: true`, so the Full-state surface is one live
 * Open link (Priorities) plus three "Coming soon" pills. Tier-lock still
 * dominates: a non-Full user sees the Locked treatment regardless of `available`.
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

describe('M6ModulePage — Full state (Priorities live, three tools "Coming soon")', () => {
  // Phase 1 flips the Priorities card to available: true. In the Full state it
  // is now a live Open link; the other three remain Coming soon pills.
  it.each(['navigator', 'signature'])(
    '%s tier renders the Priorities card as a live Open link → /modules/m6/priorities',
    (tier) => {
      render(<M6ModulePage userTier={tier} />);

      const cards = screen.getAllByTestId('m6-tool-card');
      expect(cards).toHaveLength(4);

      const prioritiesCard = cards[0];
      const open = within(prioritiesCard).getByRole('link', { name: /Open/i });
      expect(open).toHaveAttribute('href', '/modules/m6/priorities');
      expect(within(prioritiesCard).queryByTestId('m6-tool-card-coming-soon')).toBeNull();
      expect(within(prioritiesCard).queryByTestId('m6-tool-card-lock')).toBeNull();
    },
  );

  it.each(['navigator', 'signature'])(
    '%s tier renders the other three tools as Coming soon pills, no Open link, no Unlock CTA',
    (tier) => {
      render(<M6ModulePage userTier={tier} />);

      const cards = screen.getAllByTestId('m6-tool-card');
      for (const card of cards.slice(1)) {
        expect(
          within(card).getByTestId('m6-tool-card-coming-soon'),
        ).toBeInTheDocument();
        expect(within(card).queryByRole('link', { name: /Open/i })).toBeNull();
        expect(within(card).queryByTestId('m6-tool-card-lock')).toBeNull();
      }

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

  it('links the built Priorities route but not the three unbuilt tool routes', () => {
    render(<M6ModulePage userTier="navigator" />);
    const hrefs = screen.getAllByRole('link').map((a) => a.getAttribute('href'));
    expect(hrefs).toContain('/modules/m6/priorities');
    for (const route of TOOL_ROUTES.slice(1)) {
      expect(hrefs).not.toContain(route);
    }
  });

  it('Coming soon pills convey status to assistive tech (not color alone)', () => {
    render(<M6ModulePage userTier="navigator" />);
    const pills = screen.getAllByTestId('m6-tool-card-coming-soon');
    expect(pills).toHaveLength(3);
    for (const pill of pills) {
      // aria-label combines title + status so screen readers announce it.
      expect(pill.getAttribute('aria-label')).toMatch(/coming soon/i);
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
