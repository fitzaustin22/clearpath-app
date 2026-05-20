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

// Suppress lint warning about unused helper until tool-grid commit uses it.
void m5Links;
