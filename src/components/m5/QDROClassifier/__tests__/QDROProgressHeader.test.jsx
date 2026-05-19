/**
 * QDROProgressHeader tests — Q-C3 ratification (header bar at top with
 * count + "N of M classified" progress).
 *
 * "Classified" = an asset with BOTH userRole AND planType set (a pre-popped
 * asset has planType but no userRole → not yet classified). Consumes
 * m5Store.qdroDecision.assets via the Zustand hook.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import QDROProgressHeader from '../QDROProgressHeader.jsx';
import { useM5Store } from '@/src/stores/m5Store';

function seedAssets(assets) {
  useM5Store.setState((state) => ({
    qdroDecision: { ...state.qdroDecision, assets },
  }));
}

function asset(overrides = {}) {
  return {
    userRole: null,
    planType: null,
    planName: null,
    employer: null,
    decisions: {},
    pvSource: null,
    _prePopSources: {},
    metadata: { formulaId: null, citations: [], qdroPacketGeneratedAt: null },
    ...overrides,
  };
}

beforeEach(() => {
  localStorage.clear();
  useM5Store.persist?.rehydrate?.();
  seedAssets({});
});

describe('QDROProgressHeader (Q-C3)', () => {
  it('renders "N of M classified" where N = assets with BOTH classifiers set', () => {
    seedAssets({
      a1: asset({ userRole: 'participant', planType: 'dc' }),
      a2: asset({ userRole: 'alternatePayee', planType: 'ira' }),
      a3: asset({ userRole: null, planType: 'dc' }), // pre-popped only
    });
    render(<QDROProgressHeader />);
    expect(screen.getByText(/2 of 3 classified/i)).toBeInTheDocument();
  });

  it('does NOT count an asset with only planType set (pre-pop, no perspective)', () => {
    seedAssets({ a1: asset({ userRole: null, planType: 'dc' }) });
    render(<QDROProgressHeader />);
    expect(screen.getByText(/0 of 1 classified/i)).toBeInTheDocument();
  });

  it('does NOT count an asset with only userRole set (no plan type)', () => {
    seedAssets({ a1: asset({ userRole: 'participant', planType: null }) });
    render(<QDROProgressHeader />);
    expect(screen.getByText(/0 of 1 classified/i)).toBeInTheDocument();
  });

  it('all-classified: N === M renders full (100%) fill', () => {
    seedAssets({
      a1: asset({ userRole: 'participant', planType: 'dc' }),
      a2: asset({ userRole: 'participant', planType: 'ira' }),
    });
    render(<QDROProgressHeader />);
    expect(screen.getByText(/2 of 2 classified/i)).toBeInTheDocument();
    expect(screen.getByTestId('qdro-progress-header-fill')).toHaveStyle({
      width: '100%',
    });
  });

  it('zero-progress: assets present but none classified → 0% fill', () => {
    seedAssets({ a1: asset(), a2: asset(), a3: asset() });
    render(<QDROProgressHeader />);
    expect(screen.getByText(/0 of 3 classified/i)).toBeInTheDocument();
    expect(screen.getByTestId('qdro-progress-header-fill')).toHaveStyle({
      width: '0%',
    });
  });

  it('0/0 case (no assets) renders without crashing', () => {
    seedAssets({});
    render(<QDROProgressHeader />);
    expect(screen.getByText(/0 of 0 classified/i)).toBeInTheDocument();
    expect(screen.getByTestId('qdro-progress-header-fill')).toHaveStyle({
      width: '0%',
    });
  });

  it('fill width reflects the N/M ratio', () => {
    seedAssets({
      a1: asset({ userRole: 'participant', planType: 'dc' }),
      a2: asset(),
      a3: asset(),
      a4: asset(),
    });
    render(<QDROProgressHeader />);
    expect(screen.getByTestId('qdro-progress-header-fill')).toHaveStyle({
      width: '25%',
    });
  });

  it('exposes progressbar a11y semantics (role + aria-valuenow/min/max)', () => {
    seedAssets({
      a1: asset({ userRole: 'participant', planType: 'dc' }),
      a2: asset(),
      a3: asset(),
    });
    render(<QDROProgressHeader />);
    const bar = screen.getByRole('progressbar');
    expect(bar).toHaveAttribute('aria-valuenow', '1');
    expect(bar).toHaveAttribute('aria-valuemin', '0');
    expect(bar).toHaveAttribute('aria-valuemax', '3');
  });

  it('exposes a stable root test id', () => {
    seedAssets({ a1: asset() });
    render(<QDROProgressHeader />);
    expect(screen.getByTestId('qdro-progress-header')).toBeInTheDocument();
  });

  it('reactively updates the count when the store changes', () => {
    seedAssets({ a1: asset({ userRole: null, planType: 'dc' }) });
    render(<QDROProgressHeader />);
    expect(screen.getByText(/0 of 1 classified/i)).toBeInTheDocument();
    act(() => {
      useM5Store.getState().setQDROClassifiers('a1', {
        userRole: 'participant',
        planType: 'dc',
      });
    });
    expect(screen.getByText(/1 of 1 classified/i)).toBeInTheDocument();
  });
});
