import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, within } from '@testing-library/react';
import { renderToString } from 'react-dom/server';
import { SupportEstimator } from '../../SupportEstimator';
import { useM5Store } from '@/src/stores/m5Store';
import useBlueprintStore from '@/src/stores/blueprintStore';
import { useM3Store } from '@/src/stores/m3Store';
import { useM4Store } from '@/src/stores/m4Store';
import { makeInitialSupportRangeInputs } from '@/src/lib/supportRange/prefill';

// next/link reaches for the App Router; stub it so jsdom renders don't throw.
vi.mock('next/link', () => ({ default: ({ children }) => children }));

beforeEach(() => {
  useM5Store.setState({ supportRange: { inputs: makeInitialSupportRangeInputs(), _prePopSources: null } });
  useBlueprintStore.getState().resetBlueprint();
  // Zero the upstream prefill sources so the prefill cases are order-independent.
  useM3Store.setState({ payStubDecoder: { results: { grossMonthlyIncome: 0 } } });
  useM4Store.setState({ filingStatusOptimizer: { inputs: { spouseGrossAnnualIncome: 0 } } });
});

// Walk to step 4 by entering the two incomes on step 1 and advancing.
function enterIncomesAndAdvanceToResults() {
  const inputs = within(screen.getByTestId('se-step-income')).getAllByTestId('wizard-field-input');
  fireEvent.change(inputs[0], { target: { value: '2000' } });   // incomeYou
  fireEvent.change(inputs[1], { target: { value: '12000' } });  // incomeSpouse
  fireEvent.click(screen.getByTestId('se-next')); // 1 -> 2
  fireEvent.click(screen.getByTestId('se-next')); // 2 -> 3
  fireEvent.click(screen.getByTestId('se-next')); // 3 -> 4
}

describe('Support Estimator wizard flow', () => {
  it('walks Income -> Children -> Marriage -> Results and computes live', () => {
    render(<SupportEstimator disablePrePop />);
    const inputs = within(screen.getByTestId('se-step-income')).getAllByTestId('wizard-field-input');
    fireEvent.change(inputs[0], { target: { value: '2000' } });
    fireEvent.change(inputs[1], { target: { value: '12000' } });
    fireEvent.click(screen.getByTestId('se-next'));
    expect(screen.getByTestId('se-step-children')).toBeInTheDocument();
    fireEvent.click(screen.getByTestId('se-next'));
    expect(screen.getByTestId('se-step-marriage')).toBeInTheDocument();
    fireEvent.click(screen.getByTestId('se-next'));
    expect(screen.getByTestId('se-step-results')).toBeInTheDocument();
    // Default numChildren is '2', parentingPct 65 -> spousal 3200 + childToHer 1775 = 4975 net to her.
    expect(screen.getByTestId('se-headline')).toHaveTextContent('$4,975');
  });

  it('Save writes §8 (region persisted) and flips the saved pill + blueprint completion', () => {
    render(<SupportEstimator disablePrePop />);
    enterIncomesAndAdvanceToResults();
    fireEvent.click(screen.getByTestId('se-save'));
    expect(screen.getByTestId('se-saved-pill')).toBeInTheDocument();
    const s8 = useBlueprintStore.getState().sections.s8;
    expect(s8.status).toBe('complete');
    expect(s8.data.totalMonthlySupport).toBe(4975);
    expect(s8.data.metadata.region).toBe('MD');
    expect(s8.data.metadata.payorMonthly).toBe(12000);
  });

  it('editing an income after save clears §8 and re-exposes Save', () => {
    render(<SupportEstimator disablePrePop />);
    enterIncomesAndAdvanceToResults();
    fireEvent.click(screen.getByTestId('se-save'));
    expect(screen.getByTestId('se-saved-pill')).toBeInTheDocument();

    fireEvent.click(screen.getByTestId('se-edit')); // back to step 1
    const inputs = within(screen.getByTestId('se-step-income')).getAllByTestId('wizard-field-input');
    fireEvent.change(inputs[0], { target: { value: '2500' } }); // edit incomeYou

    const s8AfterEdit = useBlueprintStore.getState().sections.s8;
    expect(s8AfterEdit.status).toBe('empty');
    expect(s8AfterEdit.data).toBeNull();

    fireEvent.click(screen.getByTestId('se-next')); // 1 -> 2
    fireEvent.click(screen.getByTestId('se-next')); // 2 -> 3
    fireEvent.click(screen.getByTestId('se-next')); // 3 -> 4
    expect(screen.getByTestId('se-save')).toBeInTheDocument();
    expect(screen.queryByTestId('se-saved-pill')).not.toBeInTheDocument();
  });

  it('re-saving after an edit persists the new figure', () => {
    render(<SupportEstimator disablePrePop />);
    enterIncomesAndAdvanceToResults();
    fireEvent.click(screen.getByTestId('se-save'));
    expect(useBlueprintStore.getState().sections.s8.data.totalMonthlySupport).toBe(4975);

    fireEvent.click(screen.getByTestId('se-edit'));
    const inputs = within(screen.getByTestId('se-step-income')).getAllByTestId('wizard-field-input');
    fireEvent.change(inputs[1], { target: { value: '20000' } }); // bump spouse income
    fireEvent.click(screen.getByTestId('se-next'));
    fireEvent.click(screen.getByTestId('se-next'));
    fireEvent.click(screen.getByTestId('se-next'));
    fireEvent.click(screen.getByTestId('se-save'));

    const s8 = useBlueprintStore.getState().sections.s8;
    expect(s8.status).toBe('complete');
    expect(s8.data.totalMonthlySupport).toBe(8675);
  });

  it('advancing to results with blank income does not mark §8 complete', () => {
    render(<SupportEstimator disablePrePop />);
    fireEvent.click(screen.getByTestId('se-next')); // 1 -> 2, incomes left blank
    fireEvent.click(screen.getByTestId('se-next')); // 2 -> 3
    fireEvent.click(screen.getByTestId('se-next')); // 3 -> 4
    fireEvent.click(screen.getByTestId('se-save'));

    const s8 = useBlueprintStore.getState().sections.s8;
    expect(s8.status).not.toBe('complete');
    expect(s8.data).toBeNull();
  });

  it('Edit my answers returns to step 1', () => {
    render(<SupportEstimator disablePrePop />);
    fireEvent.click(screen.getByTestId('se-next'));
    fireEvent.click(screen.getByTestId('se-next'));
    fireEvent.click(screen.getByTestId('se-next'));
    expect(screen.getByTestId('se-step-results')).toBeInTheDocument();
    fireEvent.click(screen.getByTestId('se-edit'));
    expect(screen.getByTestId('se-step-income')).toBeInTheDocument();
  });

  it('Back from step 2 returns to step 1', () => {
    render(<SupportEstimator disablePrePop />);
    fireEvent.click(screen.getByTestId('se-next')); // 1 -> 2
    expect(screen.getByTestId('se-step-children')).toBeInTheDocument();
    fireEvent.click(screen.getByTestId('se-back')); // 2 -> 1
    expect(screen.getByTestId('se-step-income')).toBeInTheDocument();
  });

  it('prefills incomes from M3/M4 on mount and badges them in the assembled wizard', () => {
    useM3Store.setState({ payStubDecoder: { results: { grossMonthlyIncome: 6000 } } });
    useM4Store.setState({ filingStatusOptimizer: { inputs: { spouseGrossAnnualIncome: 120000 } } });
    render(<SupportEstimator />); // prefill enabled (no disablePrePop)
    const incomeInputs = within(screen.getByTestId('se-step-income')).getAllByTestId('wizard-field-input');
    expect(incomeInputs[0]).toHaveValue('6000');   // M3 gross monthly
    expect(incomeInputs[1]).toHaveValue('10000');  // M4 annual / 12
    expect(screen.getByText('From M3')).toBeInTheDocument();
    expect(screen.getByText('From M4')).toBeInTheDocument();
  });

  it('drops the "From M3" attribution once the prefilled income is overridden', () => {
    useM3Store.setState({ payStubDecoder: { results: { grossMonthlyIncome: 6000 } } });
    render(<SupportEstimator />); // prefill enabled; M4 stays 0 (beforeEach) so only incomeYou is badged
    expect(screen.getByText('From M3')).toBeInTheDocument();
    const incomeInputs = within(screen.getByTestId('se-step-income')).getAllByTestId('wizard-field-input');
    fireEvent.change(incomeInputs[0], { target: { value: '7500' } }); // she overrides her income
    expect(incomeInputs[0]).toHaveValue('7500');
    expect(screen.queryByText('From M3')).not.toBeInTheDocument();
  });

  it('server-renders step 1 without throwing, with the responsive two-up income grid', () => {
    // SSR smoke: catches first-paint/SSR-only bugs (window access during render,
    // effect-only state) the way a cold page load would — the live route is
    // Clerk-gated and can't be curled headlessly.
    const html = renderToString(<SupportEstimator disablePrePop />);
    expect(html).toContain('data-testid="se-step-income"');
    // Asserts the auto-fit grid PATTERN is present in SSR markup — it collapses to
    // one column intrinsically (no JS). This does NOT prove the visual reflow at a
    // narrow width (renderToString does no viewport/CSS resolution). Status:
    // SSR-clean + collapse-capable grid pattern; actual reflow is eyeball-verified
    // on the authed route.
    expect(html).toContain('repeat(auto-fit, minmax(220px, 1fr))');
  });
});
