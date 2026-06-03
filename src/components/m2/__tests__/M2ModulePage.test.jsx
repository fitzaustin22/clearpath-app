import { describe, it, expect, vi, beforeAll } from 'vitest';
import { render, screen } from '@testing-library/react';
import M2ModulePage from '../M2ModulePage.jsx';

// M2ToolCard calls useRouter() unconditionally; stub the App Router so
// jsdom renders don't throw "invariant expected app router to be mounted".
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn() }),
}));

// M2ModulePage's useIsDesktop hook calls window.matchMedia in a useEffect;
// jsdom does not provide matchMedia, so we stub it here.
beforeAll(() => {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: vi.fn().mockImplementation((query) => ({
      matches: false,
      media: query,
      onchange: null,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    })),
  });
});

describe('M2ModulePage — nav', () => {
  it.each(['navigator', 'signature', 'essentials', 'free'])(
    'renders "← Back to Dashboard" link → /dashboard for %s tier',
    (tier) => {
      render(<M2ModulePage userTier={tier} />);
      const link = screen.getByRole('link', { name: /Back to Dashboard/i });
      expect(link).toHaveAttribute('href', '/dashboard');
    },
  );
});
