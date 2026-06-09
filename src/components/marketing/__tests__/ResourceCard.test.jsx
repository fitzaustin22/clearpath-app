import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { BookOpen } from 'lucide-react';
import ResourceCard from '../ResourceCard.jsx';

describe('ResourceCard', () => {
  it('renders the meta label, title, and description', () => {
    render(
      <ResourceCard
        icon={BookOpen}
        meta="Guide · PDF"
        title="The Readiness Guide"
        description="A plain-language walkthrough."
        comingSoon
      />,
    );
    expect(screen.getByText('Guide · PDF')).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { level: 3, name: 'The Readiness Guide' }),
    ).toBeInTheDocument();
    expect(screen.getByText('A plain-language walkthrough.')).toBeInTheDocument();
  });

  it('renders the icon as an svg', () => {
    const { container } = render(
      <ResourceCard icon={BookOpen} meta="Guide" title="T" description="D" comingSoon />,
    );
    expect(container.querySelector('svg')).toBeInTheDocument();
  });

  it('renders an active link with the right href, splitting the arrow into a decorative span', () => {
    render(
      <ResourceCard
        icon={BookOpen}
        meta="Tool"
        title="Asset & Debt Inventory"
        description="Map the estate."
        link={{ href: '/modules/m2', text: 'Open inventory →' }}
      />,
    );
    const link = screen.getByRole('link', { name: /Open inventory/i });
    expect(link).toHaveAttribute('href', '/modules/m2');
    // The arrow is split into an aria-hidden span; the label text stays present.
    expect(link).toHaveTextContent('Open inventory');
    const arrow = link.querySelector('[aria-hidden="true"]');
    expect(arrow).toBeInTheDocument();
    expect(arrow).toHaveTextContent('→');
  });

  it('renders a "Coming soon" label and no link when comingSoon is set', () => {
    render(
      <ResourceCard icon={BookOpen} meta="Guide" title="Soon" description="D" comingSoon />,
    );
    expect(screen.getByText('Coming soon')).toBeInTheDocument();
    expect(screen.queryByRole('link')).not.toBeInTheDocument();
  });
});
