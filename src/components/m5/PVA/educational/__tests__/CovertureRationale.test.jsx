/**
 * Tests for CovertureRationale (§7.9.3 Tier 3 only).
 *
 * Spec-pinned copy per LL-25. Required assertions: time-rule
 * intro, frozen vs projected variants, four case-law citations (Barbour,
 * Mosley, Deering, Lehman — DC seat re-cited Bender → Barbour in batch #2),
 * marital-cutoff-date guidance, marriage-before-hire edge case.
 */

import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import CovertureRationale from '../CovertureRationale';

describe('CovertureRationale (§7.9.3 Tier 3)', () => {
  it('renders default-collapsed with spec-pinned "Want to learn more?" toggle', () => {
    render(<CovertureRationale />);
    expect(screen.getByTestId('coverture-rationale')).toBeInTheDocument();
    expect(screen.queryByTestId('coverture-rationale-body')).toBeNull();
    expect(screen.getByText(/Want to learn more/i)).toBeInTheDocument();
  });

  it('expands and renders coverture intro + time rule phrase', () => {
    render(<CovertureRationale />);
    fireEvent.click(screen.getByTestId('coverture-rationale-toggle'));
    expect(screen.getAllByText(/time rule/i).length).toBeGreaterThan(0);
    expect(screen.getByText(/Frozen-at-valuation-date/)).toBeInTheDocument();
    expect(screen.getByText(/Projected-at-retirement/)).toBeInTheDocument();
  });

  it('renders all four required case-law citations (Barbour, Mosley, Deering, Lehman)', () => {
    render(<CovertureRationale />);
    fireEvent.click(screen.getByTestId('coverture-rationale-toggle'));
    expect(screen.getByText(/Barbour v\. Barbour/)).toBeInTheDocument();
    expect(screen.getByText(/Mosley v\. Mosley/)).toBeInTheDocument();
    expect(screen.getByText(/Deering v\. Deering/)).toBeInTheDocument();
    expect(screen.getByText(/In re Marriage of Lehman/)).toBeInTheDocument();
  });

  it('explains denominator-end-date rationale (expectedRetirementAge vs planNRA)', () => {
    render(<CovertureRationale />);
    fireEvent.click(screen.getByTestId('coverture-rationale-toggle'));
    expect(screen.getByText(/TOTAL PROJECTED SERVICE/)).toBeInTheDocument();
  });

  it('explains the marriage-before-hire edge case', () => {
    render(<CovertureRationale />);
    fireEvent.click(screen.getByTestId('coverture-rationale-toggle'));
    expect(screen.getByText(/marriage predates your hire date/i)).toBeInTheDocument();
  });
});
