/**
 * QDROMixedPerspectiveBanner tests — §8.2.4 (lines 2731–2738) + Q-C5.
 *
 * Top-of-page informational banner. Surfacing is delegated to PR1's
 * §8.10.3 selector `isMixedPerspective(assets)` (consumed, not re-derived).
 * Two-line clarifier copy is LOCKED verbatim in §8.2.4. Informational only —
 * NOT dismissible, no callout escalation.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import QDROMixedPerspectiveBanner from '../QDROMixedPerspectiveBanner.jsx';
import { useM5Store } from '@/src/stores/m5Store';

const LINE_1 = "You'll work through these assets one at a time.";
const LINE_2 =
  "Some are your own plans (you're the participant). Some are your " +
  "spouse's plans you're receiving a share of (you're the alternate " +
  'payee). The questions and your decisions differ for each.';

function seedAssets(assets) {
  useM5Store.setState((state) => ({
    qdroDecision: { ...state.qdroDecision, assets },
  }));
}

function asset(userRole) {
  return {
    userRole,
    planType: 'dc',
    planName: null,
    employer: null,
    decisions: {},
    pvSource: null,
    _prePopSources: {},
    metadata: { formulaId: null, citations: [], qdroPacketGeneratedAt: null },
  };
}

beforeEach(() => {
  localStorage.clear();
  useM5Store.persist?.rehydrate?.();
  seedAssets({});
});

describe('QDROMixedPerspectiveBanner (§8.2.4 / Q-C5)', () => {
  it('renders nothing when there are no assets', () => {
    seedAssets({});
    const { container } = render(<QDROMixedPerspectiveBanner />);
    expect(
      screen.queryByTestId('qdro-mixed-perspective-banner'),
    ).not.toBeInTheDocument();
    expect(container).toBeEmptyDOMElement();
  });

  it('renders nothing for a single asset (one perspective)', () => {
    seedAssets({ a1: asset('participant') });
    render(<QDROMixedPerspectiveBanner />);
    expect(
      screen.queryByTestId('qdro-mixed-perspective-banner'),
    ).not.toBeInTheDocument();
  });

  it('renders nothing when all assets share the same perspective', () => {
    seedAssets({ a1: asset('participant'), a2: asset('participant') });
    render(<QDROMixedPerspectiveBanner />);
    expect(
      screen.queryByTestId('qdro-mixed-perspective-banner'),
    ).not.toBeInTheDocument();
  });

  it('renders the banner when assets carry both participant and alternatePayee', () => {
    seedAssets({ a1: asset('participant'), a2: asset('alternatePayee') });
    render(<QDROMixedPerspectiveBanner />);
    expect(
      screen.getByTestId('qdro-mixed-perspective-banner'),
    ).toBeInTheDocument();
  });

  it('renders §8.2.4 Line 1 verbatim', () => {
    seedAssets({ a1: asset('participant'), a2: asset('alternatePayee') });
    render(<QDROMixedPerspectiveBanner />);
    expect(screen.getByText(LINE_1)).toBeInTheDocument();
  });

  it('renders §8.2.4 Line 2 verbatim', () => {
    seedAssets({ a1: asset('participant'), a2: asset('alternatePayee') });
    render(<QDROMixedPerspectiveBanner />);
    expect(screen.getByText(LINE_2)).toBeInTheDocument();
  });

  it('is informational only — not dismissible (no control inside the banner)', () => {
    seedAssets({ a1: asset('participant'), a2: asset('alternatePayee') });
    render(<QDROMixedPerspectiveBanner />);
    const banner = screen.getByTestId('qdro-mixed-perspective-banner');
    expect(banner.querySelector('button')).toBeNull();
  });
});
