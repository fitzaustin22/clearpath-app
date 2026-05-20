/**
 * M5ModulePage — module landing page tests.
 *
 * Spec authority: M5-Tool-Specs.md §3 Tier Gating + §4 Module Landing Page.
 * PR1 scope: core landing page in Full + Locked render states. Cross-module
 * callouts and per-tool prerequisite notes deferred to PR2. PR1 reads only
 * the user's access tier — no tool-store reads.
 */

import { describe, it, expect } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import M5ModulePage from '../M5ModulePage.jsx';

// ─── §1.5 verbatim educational paragraph ────────────────────────────────────
const EDU_PARAGRAPH =
  "Some of the most consequential assets in a divorce can't be valued at face — a pension, the marital home, a support obligation, the mechanics of dividing a retirement account without triggering tax or penalty. Each takes real analysis to understand what it's actually worth and how a given choice plays out over time. The four tools in this module give you CDFA-grade valuations and decision frameworks for exactly these assets, so you negotiate from clarity rather than guesswork.";

// ─── Helpers ────────────────────────────────────────────────────────────────
const m5Links = () =>
  screen
    .getAllByRole('link')
    .filter((a) => (a.getAttribute('href') || '').includes('m5'));

const footerLinks = () => {
  const footer = screen.getByRole('contentinfo');
  return within(footer).getAllByRole('link');
};

// ─── Shell (header + educational paragraph + footer) — both states ──────────
describe('M5ModulePage — shell (Full state)', () => {
  it('renders the module header', () => {
    render(<M5ModulePage userTier="navigator" />);
    expect(
      screen.getByRole('heading', { name: /M5 — Value What Matters/ }),
    ).toBeInTheDocument();
  });

  it('renders the §1.5 educational paragraph verbatim', () => {
    render(<M5ModulePage userTier="navigator" />);
    expect(screen.getByText(EDU_PARAGRAPH)).toBeInTheDocument();
  });

  it('renders the footer with links to M2 (Know What You Own) and M4 (Tax Landscape)', () => {
    render(<M5ModulePage userTier="navigator" />);
    const links = footerLinks();
    const m2 = links.find((a) => a.getAttribute('href') === '/modules/m2');
    const m4 = links.find((a) => a.getAttribute('href') === '/modules/m4');
    expect(m2).toBeTruthy();
    expect(m2).toHaveTextContent(/Know What You Own/i);
    expect(m4).toBeTruthy();
    expect(m4).toHaveTextContent(/Tax Landscape/i);
  });
});

describe('M5ModulePage — shell (Locked state)', () => {
  it('renders the module header in Locked state', () => {
    render(<M5ModulePage userTier="essentials" />);
    expect(
      screen.getByRole('heading', { name: /M5 — Value What Matters/ }),
    ).toBeInTheDocument();
  });

  it('renders the §1.5 educational paragraph verbatim in Locked state', () => {
    render(<M5ModulePage userTier="essentials" />);
    expect(screen.getByText(EDU_PARAGRAPH)).toBeInTheDocument();
  });

  it('renders the footer in Locked state', () => {
    render(<M5ModulePage userTier="free" />);
    const links = footerLinks();
    expect(links.find((a) => a.getAttribute('href') === '/modules/m2')).toBeTruthy();
    expect(links.find((a) => a.getAttribute('href') === '/modules/m4')).toBeTruthy();
  });
});

// ─── Tier-state selection (hasAccess wiring) ───────────────────────────────
describe('M5ModulePage — tier state selection', () => {
  it.each(['navigator', 'signature'])(
    'treats %s as Full Access (no upsell CTA)',
    (tier) => {
      render(<M5ModulePage userTier={tier} />);
      expect(screen.queryByText(/Unlock with Full Access/i)).not.toBeInTheDocument();
    },
  );

  it.each(['free', 'essentials'])(
    'treats %s as Locked (upsell CTA visible)',
    (tier) => {
      render(<M5ModulePage userTier={tier} />);
      expect(screen.getByText(/Unlock with Full Access/i)).toBeInTheDocument();
    },
  );
});

// ─── §1.6 verbatim tool copy (used in both states) ──────────────────────────
const TOOL_COPY = [
  {
    title: 'Support Estimator',
    line: 'Estimate state-specific child and spousal support — pendente lite or post-divorce.',
    fullHref: '/dev/m5-support-estimator',
  },
  {
    title: 'Pension Valuation Analyzer',
    line: 'Value a defined-benefit pension at present value, with marital-portion and sensitivity ranges.',
    fullHref: '/dev/m5/pva',
  },
  {
    title: 'QDRO Decision Guide',
    line: 'Map how each retirement account divides, and produce an attorney handoff packet.',
    fullHref: '/modules/m5/qdro',
  },
  {
    title: 'Home Decision Analyzer',
    line: 'Compare keep, sell, and deferred-sale outcomes for the marital home across 3-, 6-, and 10-year horizons.',
    fullHref: '/modules/m5/home-decision',
  },
];

// ─── Full-state tool card grid (§1.4 / §4) ──────────────────────────────────
describe('M5ModulePage — Full-state tool grid', () => {
  it('renders all four tool cards in §2 inventory order (SE, PVA, QDRO, HDA)', () => {
    render(<M5ModulePage userTier="navigator" />);
    const titles = screen.getAllByRole('heading', { level: 2 }).map((h) => h.textContent);
    expect(titles).toEqual(TOOL_COPY.map((t) => t.title));
  });

  it.each(TOOL_COPY)(
    'renders the verbatim §1.6 description for $title',
    ({ line }) => {
      render(<M5ModulePage userTier="navigator" />);
      expect(screen.getByText(line)).toBeInTheDocument();
    },
  );

  it.each(TOOL_COPY)(
    'wires the "Open" button on $title to $fullHref',
    ({ title, fullHref }) => {
      render(<M5ModulePage userTier="navigator" />);
      const heading = screen.getByRole('heading', { level: 2, name: title });
      const card = heading.closest('[data-testid="m5-tool-card"]');
      expect(card).toBeTruthy();
      const link = within(card).getByRole('link', { name: /Open/i });
      expect(link).toHaveAttribute('href', fullHref);
    },
  );

  it('renders exactly four tool cards', () => {
    render(<M5ModulePage userTier="navigator" />);
    expect(screen.getAllByTestId('m5-tool-card')).toHaveLength(4);
  });
});

// ─── Locked-state tool card grid (§1.4 / §4) ────────────────────────────────
describe('M5ModulePage — Locked-state tool grid', () => {
  it.each(['free', 'essentials'])(
    'renders all four tool cards (greyed) for %s',
    (tier) => {
      render(<M5ModulePage userTier={tier} />);
      expect(screen.getAllByTestId('m5-tool-card')).toHaveLength(4);
      for (const { title } of TOOL_COPY) {
        expect(screen.getByRole('heading', { level: 2, name: title })).toBeInTheDocument();
      }
    },
  );

  it.each(TOOL_COPY)(
    'renders the same verbatim line for $title in Locked state',
    ({ line }) => {
      render(<M5ModulePage userTier="essentials" />);
      expect(screen.getByText(line)).toBeInTheDocument();
    },
  );

  it('Locked cards are not clickable — no Open links inside the cards', () => {
    render(<M5ModulePage userTier="essentials" />);
    for (const card of screen.getAllByTestId('m5-tool-card')) {
      expect(within(card).queryByRole('link', { name: /Open/i })).toBeNull();
    }
  });

  it('Locked cards render a lock icon', () => {
    render(<M5ModulePage userTier="essentials" />);
    const cards = screen.getAllByTestId('m5-tool-card');
    expect(cards).toHaveLength(4);
    for (const card of cards) {
      expect(within(card).getByTestId('m5-tool-card-lock')).toBeInTheDocument();
    }
  });

  it('Full state has no lock icons', () => {
    render(<M5ModulePage userTier="navigator" />);
    expect(screen.queryAllByTestId('m5-tool-card-lock')).toHaveLength(0);
  });

  it('Locked grid surfaces a single "Unlock with Full Access" button linking to /upgrade', () => {
    render(<M5ModulePage userTier="essentials" />);
    const upsell = screen.getByRole('link', { name: /Unlock with Full Access/i });
    expect(upsell).toHaveAttribute('href', '/upgrade');
  });

  it('Locked cards do not link to any tool route', () => {
    render(<M5ModulePage userTier="essentials" />);
    const links = m5Links();
    expect(links).toHaveLength(0);
  });
});
