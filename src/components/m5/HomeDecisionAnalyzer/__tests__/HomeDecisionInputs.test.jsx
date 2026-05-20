/**
 * HomeDecisionInputs tests — §9.8.1 el.1–2 / §9.3.
 * Shared inputs always visible; per-scenario accordions collapsed by default;
 * controlled fields write through onChange(field, value) with null discipline.
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import HomeDecisionInputs from '../HomeDecisionInputs.jsx';

// Minimal inputs object (subset of makeInitialHomeDecision()).
const baseInputs = {
  currentFMV: null,
  existingMortgageBalance: null,
  existingMortgageRate: null,
  existingMortgageRemainingTermMonths: 360,
  monthlyPropertyTax: null,
  monthlyInsurance: null,
  monthlyHOA: 0,
  userPostDivorceGrossMonthlyIncome: null,
  userTotalMonthlyDebtPayments: 0,
  startingLiquidCash: null,
  userCreditScoreBand: null,
  userState: null,
  homeAcquisitionYear: null,
  propertyAppreciationRateReal: 0,
  spouseEquityShare: 0.5,
  buyoutAmount: null,
  refiRate: null,
  refiClosingCostsPercent: null,
  refiTerm: '30-year',
  realtorCommissionPercent: 0.05,
  saleClosingCostsPercent: 0.02,
  expectedFilingStatusAtSellNow: null,
  userMovedOutYearsAgo: 0,
  occupancyYears: null,
  interimCostSharePct: 50,
  stressTestUserPays100Pct: false,
  deferredSaleMortgageContinuity: 'refi-at-current',
};

describe('HomeDecisionInputs', () => {
  it('renders the shared-inputs section (always visible)', () => {
    render(<HomeDecisionInputs inputs={baseInputs} onChange={vi.fn()} />);
    expect(screen.getByTestId('hda-inputs-shared')).toBeInTheDocument();
    expect(screen.getByTestId('hda-input-currentFMV')).toBeInTheDocument();
    expect(screen.getByTestId('hda-input-userCreditScoreBand')).toBeInTheDocument();
    expect(screen.getByTestId('hda-input-spouseEquityShare')).toBeInTheDocument();
  });

  it('per-scenario accordions are collapsed by default (§9.8.1 el.2)', () => {
    render(<HomeDecisionInputs inputs={baseInputs} onChange={vi.fn()} />);
    expect(screen.getByTestId('hda-scenario-keepAndRefi-toggle')).toHaveAttribute(
      'aria-expanded',
      'false',
    );
    expect(screen.getByTestId('hda-scenario-sellNow-toggle')).toHaveAttribute(
      'aria-expanded',
      'false',
    );
    expect(screen.getByTestId('hda-scenario-deferredSale-toggle')).toHaveAttribute(
      'aria-expanded',
      'false',
    );
    // collapsed → per-scenario fields not in the DOM
    expect(screen.queryByTestId('hda-input-refiRate')).not.toBeInTheDocument();
    expect(screen.queryByTestId('hda-input-occupancyYears')).not.toBeInTheDocument();
  });

  it('expanding the Keep & refi accordion reveals its fields', () => {
    render(<HomeDecisionInputs inputs={baseInputs} onChange={vi.fn()} />);
    fireEvent.click(screen.getByTestId('hda-scenario-keepAndRefi-toggle'));
    expect(screen.getByTestId('hda-scenario-keepAndRefi-toggle')).toHaveAttribute(
      'aria-expanded',
      'true',
    );
    expect(screen.getByTestId('hda-input-refiRate')).toBeInTheDocument();
    expect(screen.getByTestId('hda-input-buyoutAmount')).toBeInTheDocument();
    // other accordions stay collapsed (independent state)
    expect(screen.queryByTestId('hda-input-occupancyYears')).not.toBeInTheDocument();
  });

  it('accordions toggle independently and can collapse again', () => {
    render(<HomeDecisionInputs inputs={baseInputs} onChange={vi.fn()} />);
    const sellToggle = screen.getByTestId('hda-scenario-sellNow-toggle');
    fireEvent.click(sellToggle);
    expect(screen.getByTestId('hda-input-userMovedOutYearsAgo')).toBeInTheDocument();
    fireEvent.click(sellToggle);
    expect(sellToggle).toHaveAttribute('aria-expanded', 'false');
    expect(screen.queryByTestId('hda-input-userMovedOutYearsAgo')).not.toBeInTheDocument();
  });

  it('NumberField writes a numeric value through onChange', () => {
    const onChange = vi.fn();
    render(<HomeDecisionInputs inputs={baseInputs} onChange={onChange} />);
    const input = screen.getByTestId('hda-input-currentFMV').querySelector('input');
    fireEvent.change(input, { target: { value: '650000' } });
    expect(onChange).toHaveBeenCalledWith('currentFMV', 650000);
  });

  it('NumberField cleared to empty writes null, never 0 (null discipline)', () => {
    const onChange = vi.fn();
    render(
      <HomeDecisionInputs
        inputs={{ ...baseInputs, currentFMV: 650000 }}
        onChange={onChange}
      />,
    );
    const input = screen.getByTestId('hda-input-currentFMV').querySelector('input');
    fireEvent.change(input, { target: { value: '' } });
    expect(onChange).toHaveBeenCalledWith('currentFMV', null);
  });

  it('SelectField writes the selected enum value', () => {
    const onChange = vi.fn();
    render(<HomeDecisionInputs inputs={baseInputs} onChange={onChange} />);
    fireEvent.change(screen.getByTestId('hda-input-userCreditScoreBand'), {
      target: { value: 'fair' },
    });
    expect(onChange).toHaveBeenCalledWith('userCreditScoreBand', 'fair');
  });

  it('userState text field uppercases the USPS code', () => {
    const onChange = vi.fn();
    render(<HomeDecisionInputs inputs={baseInputs} onChange={onChange} />);
    fireEvent.change(screen.getByTestId('hda-input-userState'), {
      target: { value: 'va' },
    });
    expect(onChange).toHaveBeenCalledWith('userState', 'VA');
  });

  it('stress-test checkbox writes a boolean', () => {
    const onChange = vi.fn();
    render(<HomeDecisionInputs inputs={baseInputs} onChange={onChange} />);
    fireEvent.click(screen.getByTestId('hda-scenario-deferredSale-toggle'));
    fireEvent.click(screen.getByTestId('hda-input-stressTestUserPays100Pct'));
    expect(onChange).toHaveBeenCalledWith('stressTestUserPays100Pct', true);
  });

  it('refiTerm select is locked to the single 30-year v1 option (no empty choice)', () => {
    render(<HomeDecisionInputs inputs={baseInputs} onChange={vi.fn()} />);
    fireEvent.click(screen.getByTestId('hda-scenario-keepAndRefi-toggle'));
    const select = screen.getByTestId('hda-input-refiTerm');
    const optionValues = [...select.querySelectorAll('option')].map((o) => o.value);
    expect(optionValues).toEqual(['30-year']);
  });

  it('controlled fields reflect provided input values', () => {
    render(
      <HomeDecisionInputs
        inputs={{ ...baseInputs, currentFMV: 700000, spouseEquityShare: 0.6 }}
        onChange={vi.fn()}
      />,
    );
    expect(
      screen.getByTestId('hda-input-currentFMV').querySelector('input'),
    ).toHaveValue('700000');
    expect(
      screen.getByTestId('hda-input-spouseEquityShare').querySelector('input'),
    ).toHaveValue('0.6');
  });

  describe('RefiRateInput integration wiring', () => {
    it('threads creditBand: opt-in link present when creditBand is a valid band', () => {
      render(
        <HomeDecisionInputs
          inputs={{ ...baseInputs, userCreditScoreBand: 'good' }}
          onChange={vi.fn()}
        />,
      );
      fireEvent.click(screen.getByTestId('hda-scenario-keepAndRefi-toggle'));
      expect(screen.getByTestId('hda-input-refiRate')).toBeInTheDocument();
      expect(screen.getByTestId('hda-refiRate-optin')).toBeInTheDocument();
    });

    it('threads onChange: typing fires dual-write (refiRate + refiRateProvenance)', () => {
      const onChange = vi.fn();
      render(
        <HomeDecisionInputs
          inputs={{ ...baseInputs, userCreditScoreBand: 'good' }}
          onChange={onChange}
        />,
      );
      fireEvent.click(screen.getByTestId('hda-scenario-keepAndRefi-toggle'));
      fireEvent.change(screen.getByTestId('hda-input-refiRate'), {
        target: { value: '0.0725' },
      });
      expect(onChange).toHaveBeenCalledWith('refiRate', 0.0725);
      expect(onChange).toHaveBeenCalledWith('refiRateProvenance', 'user-quoted');
    });

    it('opt-in link absent when creditBand is null', () => {
      render(
        <HomeDecisionInputs
          inputs={{ ...baseInputs }}
          onChange={vi.fn()}
        />,
      );
      fireEvent.click(screen.getByTestId('hda-scenario-keepAndRefi-toggle'));
      expect(screen.queryByTestId('hda-refiRate-optin')).not.toBeInTheDocument();
    });
  });
});
