/**
 * Tests for PvComputationRationale (§7.9.3 general expandable).
 *
 * Spec-pinned copy verbatim per LL-25. Assertions target spec phrases that
 * uniquely identify the rationale (intro, §417(e), simplifications,
 * ±100bp sensitivity).
 */

import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import PvComputationRationale from '../PvComputationRationale';

describe('PvComputationRationale (§7.9.3 general)', () => {
  it('renders default-collapsed with spec-pinned "Want to learn more?" toggle', () => {
    render(<PvComputationRationale />);
    expect(screen.getByTestId('pv-computation-rationale')).toBeInTheDocument();
    expect(screen.queryByTestId('pv-computation-rationale-body')).toBeNull();
    expect(screen.getByText(/Want to learn more/i)).toBeInTheDocument();
  });

  it('expands on toggle click and renders spec phrases', () => {
    render(<PvComputationRationale />);
    fireEvent.click(screen.getByTestId('pv-computation-rationale-toggle'));
    expect(screen.getByTestId('pv-computation-rationale-body')).toBeInTheDocument();
    expect(screen.getByText(/Present value of a future pension benefit/i)).toBeInTheDocument();
    // Several spec phrases appear in multiple text nodes (strong + body
    // paragraph wrap them). Assert presence rather than uniqueness.
    expect(screen.getAllByText(/§417\(e\)/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Termination basis/).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Annual annuity-due approximation/).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Unisex static mortality tables/).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/segment-2 single-rate approximation/i).length).toBeGreaterThan(0);
    expect(screen.getByText(/±100bp sensitivity range/i)).toBeInTheDocument();
  });

  it('toggles closed when clicked again', () => {
    render(<PvComputationRationale />);
    const toggle = screen.getByTestId('pv-computation-rationale-toggle');
    fireEvent.click(toggle);
    fireEvent.click(toggle);
    expect(screen.queryByTestId('pv-computation-rationale-body')).toBeNull();
  });
});
