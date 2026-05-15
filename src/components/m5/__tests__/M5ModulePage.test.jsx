/**
 * M5ModulePage route-wiring smoke test (HDA PR 5).
 *
 * Scope is page-wiring only — these assertions pin that the M5 landing
 * page is reachable and routes correctly, NOT HDA behavior (covered by
 * the HomeDecisionAnalyzer suites). Mirrors the colocated component-test
 * convention; no server-route-file tests (the route wrappers are 6-line
 * auth scaffolds with no logic and no test precedent).
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { useM5Store } from '@/src/stores/m5Store';
import M5ModulePage from '../M5ModulePage.jsx';

beforeEach(() => {
  localStorage.clear();
  useM5Store.persist.rehydrate();
  // Deterministic slate: userSelection null → HDA badge "Not started".
  useM5Store.getState().clearHomeDecision();
});

const TOOL_TITLES = [
  'Marital Home Decision Analyzer',
  'Support Estimator',
  'Present Value Analyzer',
  'QDRO Decision Guide',
];

const m5Links = () =>
  screen
    .getAllByRole('link')
    .filter((a) => (a.getAttribute('href') || '').startsWith('/modules/m5/'));

describe('M5ModulePage — route wiring', () => {
  it('renders all four M5 tool cards', () => {
    render(<M5ModulePage userTier="navigator" />);
    for (const title of TOOL_TITLES) {
      expect(screen.getByText(title)).toBeInTheDocument();
    }
  });

  it('links the HDA card to /modules/m5/home-decision', () => {
    render(<M5ModulePage userTier="navigator" />);
    const links = m5Links();
    expect(links).toHaveLength(1);
    expect(links[0]).toHaveAttribute('href', '/modules/m5/home-decision');
    expect(links[0]).toHaveTextContent('Marital Home Decision Analyzer');
  });

  it('renders the three non-wired tools as non-interactive "Coming soon" cards', () => {
    render(<M5ModulePage userTier="navigator" />);
    expect(screen.getAllByText('Coming soon')).toHaveLength(3);
    // Only HDA is a live tool link; the other three are inert.
    expect(m5Links()).toHaveLength(1);
  });

  it('shows the upgrade CTA and no live tool link for a locked tier', () => {
    render(<M5ModulePage userTier="essentials" />);
    expect(
      screen.getByText(/full curriculum access for \$247/i),
    ).toBeInTheDocument();
    expect(m5Links()).toHaveLength(0);
  });

  it('does not show the upgrade CTA for the full-access tier', () => {
    render(<M5ModulePage userTier="navigator" />);
    expect(
      screen.queryByText(/full curriculum access for \$247/i),
    ).not.toBeInTheDocument();
  });
});
