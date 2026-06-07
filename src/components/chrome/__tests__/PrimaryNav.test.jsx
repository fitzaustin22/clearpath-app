import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import PrimaryNav from '../PrimaryNav.jsx';

// usePathname drives the active state — mock it as a vi.fn so each test sets the
// "current" route. next/link is stubbed to a plain <a> so the test exercises the
// active-route logic, not Next's App Router context internals.
vi.mock('next/navigation', () => ({
  usePathname: vi.fn(),
}));
vi.mock('next/link', () => ({
  default: ({ href, children, ...props }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

import { usePathname } from 'next/navigation';

// The active discriminator is the a11y signal aria-current="page" (NOT a
// className — classes shift around). Returns the single current link, or null.
function currentLink() {
  return (
    screen.getAllByRole('link').find((a) => a.getAttribute('aria-current') === 'page') || null
  );
}

describe('PrimaryNav — active-route detection', () => {
  beforeEach(() => {
    usePathname.mockReset();
  });

  it('flags Dashboard as current on /dashboard', () => {
    usePathname.mockReturnValue('/dashboard');
    render(<PrimaryNav />);
    expect(currentLink()).toHaveTextContent('Dashboard');
  });

  it('flags Modules as current on a nested /modules/m4 (nested-route case)', () => {
    usePathname.mockReturnValue('/modules/m4');
    render(<PrimaryNav />);
    expect(currentLink()).toHaveTextContent('Modules');
  });

  it('flags Blueprint as current on /blueprint', () => {
    usePathname.mockReturnValue('/blueprint');
    render(<PrimaryNav />);
    expect(currentLink()).toHaveTextContent('Blueprint');
  });

  it('flags nothing as current on an unrelated /unknown', () => {
    usePathname.mockReturnValue('/unknown');
    render(<PrimaryNav />);
    expect(currentLink()).toBeNull();
  });

  it('marks exactly one link current at a time', () => {
    usePathname.mockReturnValue('/modules/m4');
    render(<PrimaryNav />);
    const current = screen
      .getAllByRole('link')
      .filter((a) => a.getAttribute('aria-current') === 'page');
    expect(current).toHaveLength(1);
  });

  it('links Modules to /modules/m1 (entry point), since bare /modules has no page', () => {
    usePathname.mockReturnValue('/dashboard');
    render(<PrimaryNav />);
    expect(screen.getByRole('link', { name: 'Dashboard' })).toHaveAttribute('href', '/dashboard');
    expect(screen.getByRole('link', { name: 'Modules' })).toHaveAttribute('href', '/modules/m1');
    expect(screen.getByRole('link', { name: 'Blueprint' })).toHaveAttribute('href', '/blueprint');
  });
});
