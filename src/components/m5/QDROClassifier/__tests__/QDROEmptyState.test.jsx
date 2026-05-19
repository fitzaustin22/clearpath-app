/**
 * QDROEmptyState tests — §8.1.4 pre-flow filter (lines 2696–2702) + TC-QDG-9.
 *
 * 0-asset case: locked educational copy + two action paths ("Go to M2" link
 * to the M2 module landing; "Add asset here" proceeds via the synthetic-UUID
 * wizard add path). No hard gate. PVA/HDA empty-state visual idiom.
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import QDROEmptyState from '../QDROEmptyState.jsx';

const LOCKED_COPY =
  'No retirement assets recorded yet. Either go to M2 (Know What You Own) ' +
  'to inventory your retirement and pension assets first, or add an asset ' +
  'directly here to begin the QDRO decision flow.';

describe('QDROEmptyState (§8.1.4 / TC-QDG-9)', () => {
  it('renders the locked §8.1.4 educational copy verbatim', () => {
    render(<QDROEmptyState onAddAsset={() => {}} />);
    expect(screen.getByText(LOCKED_COPY)).toBeInTheDocument();
  });

  it('renders the "Go to M2" CTA as a link to the M2 module landing', () => {
    render(<QDROEmptyState onAddAsset={() => {}} />);
    const link = screen.getByRole('link', { name: /go to m2/i });
    expect(link).toBeInTheDocument();
    expect(link).toHaveAttribute('href', '/modules/m2');
  });

  it('renders the "Add asset here" CTA as a button', () => {
    render(<QDROEmptyState onAddAsset={() => {}} />);
    expect(
      screen.getByRole('button', { name: /add asset here/i }),
    ).toBeInTheDocument();
  });

  it('invokes onAddAsset exactly once when "Add asset here" is clicked', () => {
    const onAddAsset = vi.fn();
    render(<QDROEmptyState onAddAsset={onAddAsset} />);
    fireEvent.click(screen.getByRole('button', { name: /add asset here/i }));
    expect(onAddAsset).toHaveBeenCalledTimes(1);
  });

  it('does not invoke onAddAsset on mount (only on explicit click)', () => {
    const onAddAsset = vi.fn();
    render(<QDROEmptyState onAddAsset={onAddAsset} />);
    expect(onAddAsset).not.toHaveBeenCalled();
  });

  it('exposes a stable root test id for the empty-state surface', () => {
    render(<QDROEmptyState onAddAsset={() => {}} />);
    expect(screen.getByTestId('qdro-empty-state')).toBeInTheDocument();
  });

  it('does not throw when onAddAsset is omitted and the button is clicked', () => {
    render(<QDROEmptyState />);
    expect(() =>
      fireEvent.click(screen.getByRole('button', { name: /add asset here/i })),
    ).not.toThrow();
  });
});
