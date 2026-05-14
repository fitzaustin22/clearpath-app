/**
 * ValidationErrorPanel tests (§7.2 R3 / [R5b-8]).
 */

import { describe, it, expect, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import ValidationErrorPanel from '../ValidationErrorPanel.jsx';

afterEach(() => {
  cleanup();
});

describe('ValidationErrorPanel', () => {
  it('TC-PVA-VE-1: renders the in_pay_data_incomplete message and missing-fields list', () => {
    render(
      <ValidationErrorPanel
        error={{
          error: 'in_pay_data_incomplete',
          missingFields: ['monthlyBenefit', 'benefitStartDate'],
          path: null,
        }}
      />,
    );
    expect(screen.getByTestId('pva-validation-error')).toBeInTheDocument();
    expect(screen.getByText(/Cannot value this pension yet/i)).toBeInTheDocument();
    expect(screen.getByText(/monthly benefit amount/i)).toBeInTheDocument();
    expect(screen.getByText(/benefit start date/i)).toBeInTheDocument();
  });

  it('TC-PVA-VE-2: returns null when error prop is null', () => {
    const { container } = render(<ValidationErrorPanel error={null} />);
    expect(container.firstChild).toBeNull();
    expect(screen.queryByTestId('pva-validation-error')).not.toBeInTheDocument();
  });

  it('TC-PVA-VE-3: returns null when error prop missing .error field', () => {
    const { container } = render(<ValidationErrorPanel error={{ missingFields: ['x'] }} />);
    expect(container.firstChild).toBeNull();
  });

  it('TC-PVA-VE-4: with only monthlyBenefit missing, shows only that field', () => {
    render(
      <ValidationErrorPanel
        error={{
          error: 'in_pay_data_incomplete',
          missingFields: ['monthlyBenefit'],
          path: null,
        }}
      />,
    );
    expect(screen.getByText(/monthly benefit amount/i)).toBeInTheDocument();
    expect(screen.queryByText(/benefit start date/i)).not.toBeInTheDocument();
  });
});
