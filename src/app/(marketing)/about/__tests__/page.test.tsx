import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import AboutPage from '../page';

describe('AboutPage', () => {
  it('renders all four section eyebrows', () => {
    render(<AboutPage />);
    expect(screen.getByText('About ClearPath')).toBeInTheDocument();
    expect(screen.getByText('Why we built this')).toBeInTheDocument();
    expect(screen.getByText('The standard')).toBeInTheDocument();
    expect(screen.getByText('Contact')).toBeInTheDocument();
  });

  it('renders the embedded contact mailto link', () => {
    render(<AboutPage />);
    const mail = screen.getByRole('link', { name: /Support@Clearpath\.com/i });
    expect(mail).toHaveAttribute('href', 'mailto:Support@Clearpath.com');
  });

  it('renders the four standard definitions as level-3 headings', () => {
    render(<AboutPage />);
    expect(screen.getAllByRole('heading', { level: 3 })).toHaveLength(4);
    expect(
      screen.getByRole('heading', { level: 3, name: 'Forensic, not approximate' }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('heading', {
        level: 3,
        name: 'Built for the decades, not the decree',
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { level: 3, name: 'Plain language, always' }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { level: 3, name: 'Education, not legal advice' }),
    ).toBeInTheDocument();
  });

  it('renders the mission pull quote', () => {
    render(<AboutPage />);
    expect(screen.getByText(/Clarity isn.t a luxury/i)).toBeInTheDocument();
  });
});
