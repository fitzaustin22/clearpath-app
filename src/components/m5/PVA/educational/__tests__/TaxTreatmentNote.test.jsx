/**
 * Tests for TaxTreatmentNote (§7.9.4 universal disclaimer).
 *
 * Spec-pinned copy verbatim per LL-25. Always-rendered, not collapsible.
 */

import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import TaxTreatmentNote from '../TaxTreatmentNote';

describe('TaxTreatmentNote (§7.9.4)', () => {
  it('renders unconditionally (not collapsible)', () => {
    render(<TaxTreatmentNote />);
    expect(screen.getByTestId('tax-treatment-note')).toBeInTheDocument();
  });

  it('renders spec phrases (Tax treatment + M4 PIT)', () => {
    render(<TaxTreatmentNote />);
    expect(screen.getByText(/Tax treatment\./)).toBeInTheDocument();
    expect(screen.getByText(/M4 PIT/i)).toBeInTheDocument();
  });
});
