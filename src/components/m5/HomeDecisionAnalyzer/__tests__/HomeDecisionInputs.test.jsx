/**
 * HomeDecisionInputs tests — §9.8.1 el.1–2 / §9.3.
 * Shared inputs always visible; per-scenario accordions collapsed by default;
 * controlled fields write through onChange(field, value) with null discipline.
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';
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
    const select = screen.getByTestId('hda-input-userCreditScoreBand').querySelector('select');
    fireEvent.change(select, { target: { value: 'fair' } });
    expect(onChange).toHaveBeenCalledWith('userCreditScoreBand', 'fair');
  });

  it('userState text field uppercases the USPS code', () => {
    const onChange = vi.fn();
    render(<HomeDecisionInputs inputs={baseInputs} onChange={onChange} />);
    const input = screen.getByTestId('hda-input-userState').querySelector('input');
    fireEvent.change(input, { target: { value: 'va' } });
    expect(onChange).toHaveBeenCalledWith('userState', 'VA');
  });

  it('stress-test checkbox writes a boolean', () => {
    const onChange = vi.fn();
    render(<HomeDecisionInputs inputs={baseInputs} onChange={onChange} />);
    fireEvent.click(screen.getByTestId('hda-scenario-deferredSale-toggle'));
    const checkbox = screen
      .getByTestId('hda-input-stressTestUserPays100Pct')
      .querySelector('input');
    fireEvent.click(checkbox);
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
      // PR-FIX-2: refi rate field now accepts percent form (user types 7.25
      // for 7.25% APR); the bridge writes the fraction (0.0725) to the store.
      const onChange = vi.fn();
      render(
        <HomeDecisionInputs
          inputs={{ ...baseInputs, userCreditScoreBand: 'good' }}
          onChange={onChange}
        />,
      );
      fireEvent.click(screen.getByTestId('hda-scenario-keepAndRefi-toggle'));
      const rateInput = screen.getByTestId('hda-input-refiRate').querySelector('input');
      fireEvent.change(rateInput, { target: { value: '7.25' } });
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

  // PR-FIX-1: WizardField numeric fields rejected decimals before this fix
  // (every keystroke round-tripped through Number() → "0." displayed as "0").
  // The integration tests below simulate one-character-at-a-time typing so
  // the round-trip defect cannot hide behind a single coerced change event.
  describe('decimal-input survival (PR-FIX-1)', () => {
    function Harness({ field, initial = null }) {
      // mini-store: mirrors how HomeDecisionAnalyzer threads onChange
      const [inputs, setInputs] = React.useState({ ...baseInputs, [field]: initial });
      const onChange = (k, v) => setInputs((s) => ({ ...s, [k]: v }));
      return <HomeDecisionInputs inputs={inputs} onChange={onChange} />;
    }

    function typeChars(input, chars) {
      let acc = input.value;
      for (const ch of chars) {
        acc += ch;
        fireEvent.change(input, { target: { value: acc } });
      }
    }

    it('keystroke-by-keystroke "0.0625" lands in a shared fraction field', () => {
      render(<Harness field="propertyAppreciationRateReal" initial={null} />);
      const input = screen
        .getByTestId('hda-input-propertyAppreciationRateReal')
        .querySelector('input');
      typeChars(input, ['0', '.', '0', '6', '2', '5']);
      expect(input.value).toBe('0.0625');
    });

    it('keystroke-by-keystroke "0.5" lands in spouseEquityShare', () => {
      render(<Harness field="spouseEquityShare" initial={null} />);
      const input = screen.getByTestId('hda-input-spouseEquityShare').querySelector('input');
      typeChars(input, ['0', '.', '5']);
      expect(input.value).toBe('0.5');
    });

    it('typed decimal survives in the refi rate (APR) field', () => {
      render(<Harness field="refiRate" initial={null} />);
      fireEvent.click(screen.getByTestId('hda-scenario-keepAndRefi-toggle'));
      const input = screen.getByTestId('hda-input-refiRate').querySelector('input');
      typeChars(input, ['6', '.', '2', '5']);
      expect(input.value).toBe('6.25');
    });
  });

  // PR-FIX-2: rate fields labeled with "%" / "APR" now accept percent form
  // ("6.25" for 6.25% APR); the bridge writes the fraction (0.0625) to the
  // store, which is what the engine and its 11 fixtures expect. This guards
  // against silent 100× projection errors on keep-or-sell-the-home settlement
  // decisions.
  describe('PR-FIX-2 — rate fields accept percent form (store stays fraction)', () => {
    function Harness({ field, initial = null }) {
      const [inputs, setInputs] = React.useState({ ...baseInputs, [field]: initial });
      const onChange = (k, v) => setInputs((s) => ({ ...s, [k]: v }));
      return <HomeDecisionInputs inputs={inputs} onChange={onChange} />;
    }

    it('existingMortgageRate: typing "4.5" writes the fraction 0.045 to the store', () => {
      const onChange = vi.fn();
      render(<HomeDecisionInputs inputs={baseInputs} onChange={onChange} />);
      const input = screen.getByTestId('hda-input-existingMortgageRate').querySelector('input');
      fireEvent.change(input, { target: { value: '4.5' } });
      expect(onChange).toHaveBeenCalledWith('existingMortgageRate', 0.045);
    });

    it('existingMortgageRate: a stored fraction 0.045 displays as "4.5"', () => {
      render(
        <HomeDecisionInputs
          inputs={{ ...baseInputs, existingMortgageRate: 0.045 }}
          onChange={vi.fn()}
        />,
      );
      const input = screen.getByTestId('hda-input-existingMortgageRate').querySelector('input');
      expect(input).toHaveValue('4.5');
    });

    it('existingMortgageRate: stored 0.07 displays as "7" (no IEEE float artifact)', () => {
      render(
        <HomeDecisionInputs
          inputs={{ ...baseInputs, existingMortgageRate: 0.07 }}
          onChange={vi.fn()}
        />,
      );
      const input = screen.getByTestId('hda-input-existingMortgageRate').querySelector('input');
      expect(input).toHaveValue('7');
    });

    it('refiRate: typing "6.25" through the accordion writes the fraction 0.0625', () => {
      const onChange = vi.fn();
      render(
        <HomeDecisionInputs
          inputs={{ ...baseInputs, userCreditScoreBand: 'good' }}
          onChange={onChange}
        />,
      );
      fireEvent.click(screen.getByTestId('hda-scenario-keepAndRefi-toggle'));
      const input = screen.getByTestId('hda-input-refiRate').querySelector('input');
      fireEvent.change(input, { target: { value: '6.25' } });
      expect(onChange).toHaveBeenCalledWith('refiRate', 0.0625);
      // Regression guard for PR #33: the provenance dual-write must still fire
      // alongside refiRate on every user keystroke.
      expect(onChange).toHaveBeenCalledWith('refiRateProvenance', 'user-quoted');
    });

    it('refiRate: a stored fraction 0.0625 displays as "6.25"', () => {
      render(
        <HomeDecisionInputs
          inputs={{ ...baseInputs, refiRate: 0.0625 }}
          onChange={vi.fn()}
        />,
      );
      fireEvent.click(screen.getByTestId('hda-scenario-keepAndRefi-toggle'));
      const input = screen.getByTestId('hda-input-refiRate').querySelector('input');
      expect(input).toHaveValue('6.25');
    });

    it('refiRate: an in-progress "6." survives keystroke-by-keystroke entry (decimal-fix preserved)', () => {
      render(<Harness field="refiRate" initial={null} />);
      fireEvent.click(screen.getByTestId('hda-scenario-keepAndRefi-toggle'));
      const input = screen.getByTestId('hda-input-refiRate').querySelector('input');
      typeChars(input, ['6', '.']);
      expect(input.value).toBe('6.');
    });

    it('existingMortgageRate: keystroke-by-keystroke "4.5" round-trips stably to the displayed value', () => {
      render(<Harness field="existingMortgageRate" initial={null} />);
      const input = screen.getByTestId('hda-input-existingMortgageRate').querySelector('input');
      typeChars(input, ['4', '.', '5']);
      expect(input.value).toBe('4.5');
    });

    // Helper for the keystroke tests above — mirrors the PR-FIX-1 typeChars
    // utility but local to this describe so the suite is self-contained.
    function typeChars(input, chars) {
      let acc = input.value;
      for (const ch of chars) {
        acc += ch;
        fireEvent.change(input, { target: { value: acc } });
      }
    }
  });

  describe('Phase 3 — stress-test row spacing', () => {
    it('wraps the stress-test checkbox in a marginBottom row to match the other field rhythm', () => {
      render(<HomeDecisionInputs inputs={baseInputs} onChange={vi.fn()} />);
      fireEvent.click(screen.getByTestId('hda-scenario-deferredSale-toggle'));
      const row = screen.getByTestId('hda-stress-test-row');
      expect(row).toHaveStyle({ marginBottom: '14px' });
    });
  });
});
