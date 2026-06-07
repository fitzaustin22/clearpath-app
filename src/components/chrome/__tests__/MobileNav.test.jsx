import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import MobileNav from '../MobileNav.jsx';

vi.mock('next/navigation', () => ({ usePathname: vi.fn() }));
vi.mock('next/link', () => ({
  default: ({ href, children, ...props }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

import { usePathname } from 'next/navigation';

// Sheet toggles aria-hidden, so getByRole would drop it from the a11y tree when
// closed — grab it by its stable id instead and assert attributes directly.
const sheet = () => document.getElementById('cp-mobile-nav-sheet');
const toggle = () => screen.getByRole('button');
const sheetLinks = () => screen.getAllByRole('link', { hidden: true });

describe('MobileNav — slide-down sheet', () => {
  beforeEach(() => {
    usePathname.mockReturnValue('/dashboard');
  });

  it('renders the sheet closed by default', () => {
    render(<MobileNav />);
    expect(toggle()).toHaveAttribute('aria-expanded', 'false');
    expect(toggle()).toHaveAccessibleName(/open menu/i);
    expect(sheet()).toHaveAttribute('aria-hidden', 'true');
  });

  it('opens the sheet when the hamburger is tapped', () => {
    render(<MobileNav />);
    fireEvent.click(toggle());
    expect(toggle()).toHaveAttribute('aria-expanded', 'true');
    expect(toggle()).toHaveAccessibleName(/close menu/i);
    expect(sheet()).toHaveAttribute('aria-hidden', 'false');
  });

  it('closes the sheet when a link is tapped', () => {
    render(<MobileNav />);
    fireEvent.click(toggle());
    fireEvent.click(sheetLinks()[0]);
    expect(sheet()).toHaveAttribute('aria-hidden', 'true');
    expect(toggle()).toHaveAttribute('aria-expanded', 'false');
  });

  it('closes the sheet on Escape', () => {
    render(<MobileNav />);
    fireEvent.click(toggle());
    expect(sheet()).toHaveAttribute('aria-hidden', 'false');
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(sheet()).toHaveAttribute('aria-hidden', 'true');
  });

  it('closes the sheet on an outside pointer-down', () => {
    render(<MobileNav />);
    fireEvent.click(toggle());
    fireEvent.mouseDown(document.body);
    expect(sheet()).toHaveAttribute('aria-hidden', 'true');
  });

  it('wires the toggle to the sheet via aria-controls', () => {
    render(<MobileNav />);
    expect(toggle()).toHaveAttribute('aria-controls', 'cp-mobile-nav-sheet');
    expect(sheet()).toHaveAttribute('id', 'cp-mobile-nav-sheet');
  });

  it('flags the active route in the sheet with aria-current="page"', () => {
    usePathname.mockReturnValue('/blueprint');
    render(<MobileNav />);
    fireEvent.click(toggle());
    const current = sheetLinks().filter((a) => a.getAttribute('aria-current') === 'page');
    expect(current).toHaveLength(1);
    expect(current[0]).toHaveTextContent('Blueprint');
  });
});
