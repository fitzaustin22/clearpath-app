import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import ResourcesPage from '../page';

describe('ResourcesPage', () => {
  it('renders the hero eyebrow and both headline lines', () => {
    render(<ResourcesPage />);
    expect(screen.getByText('Resources')).toBeInTheDocument();
    expect(screen.getByText(/Free tools to help you/i)).toBeInTheDocument();
    expect(screen.getByText(/find your footing/i)).toBeInTheDocument();
  });

  it('renders all three category labels', () => {
    render(<ResourcesPage />);
    expect(screen.getByText(/Start here/i)).toBeInTheDocument();
    expect(screen.getByText(/Worksheets & Templates/i)).toBeInTheDocument();
    expect(screen.getByText('Free Tools')).toBeInTheDocument();
  });

  it('renders seven cards; only the three live tools link out, to m1/m2/m4', () => {
    render(<ResourcesPage />);
    expect(screen.getAllByRole('heading', { level: 3 })).toHaveLength(7);

    const links = screen.getAllByRole('link');
    expect(links).toHaveLength(3);
    const hrefs = links.map((a) => a.getAttribute('href')).sort();
    expect(hrefs).toEqual(['/modules/m1', '/modules/m2', '/modules/m4']);

    // The four not-yet-shipped resources show the muted label, not a link.
    expect(screen.getAllByText('Coming soon')).toHaveLength(4);
  });

  it('renders the closing italic statement', () => {
    render(<ResourcesPage />);
    expect(screen.getByText(/take whatever.s useful here/i)).toBeInTheDocument();
  });
});
