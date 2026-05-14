/**
 * Tests for PerStepNarrative (§7.6.2 collapsible step table).
 *
 * Invariants:
 *   - Empty / non-array steps → renders nothing
 *   - Default-collapsed; expands on toggle click
 *   - Each row mounts with a deterministic stepId-derived testid
 *   - Numeric results format as currency (≥1000) or decimal (<1000)
 *   - Null results render as em-dash
 *   - Unknown step IDs emit a dev-mode console warning but still render
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, within } from '@testing-library/react';
import PerStepNarrative from '../PerStepNarrative';

const SAMPLE_STEPS = [
  { step: 0, stepId: 'step_cp_resolve_constants', label: 'Resolve constants', computation: '417(e) Q3 2026', result: null },
  { step: 1, stepId: 'step_cp_dispatch_path', label: 'Dispatch to tier_1', computation: '', result: null },
  { step: 2, stepId: 'step_t_compute_annuity_factor', label: 'Annuity factor', computation: 'ä_x at age 65', result: 13.245 },
  { step: 3, stepId: 'step_t_compute_pv', label: 'Present value', computation: 'monthly × 12 × ä × discount', result: 165783 },
];

describe('PerStepNarrative (§7.6.2)', () => {
  it('renders nothing when steps is empty', () => {
    const { container } = render(<PerStepNarrative steps={[]} />);
    expect(container.firstChild).toBeNull();
  });

  it('renders nothing when steps is non-array', () => {
    const { container } = render(<PerStepNarrative steps={null} />);
    expect(container.firstChild).toBeNull();
  });

  it('renders default-collapsed', () => {
    render(<PerStepNarrative steps={SAMPLE_STEPS} />);
    expect(screen.getByTestId('per-step-narrative')).toBeInTheDocument();
    expect(screen.queryByTestId('per-step-narrative-body')).toBeNull();
  });

  it('expands on toggle click', () => {
    render(<PerStepNarrative steps={SAMPLE_STEPS} />);
    fireEvent.click(screen.getByTestId('per-step-narrative-toggle'));
    expect(screen.getByTestId('per-step-narrative-body')).toBeInTheDocument();
  });

  it('renders one row per step when expanded', () => {
    render(<PerStepNarrative steps={SAMPLE_STEPS} />);
    fireEvent.click(screen.getByTestId('per-step-narrative-toggle'));
    const body = screen.getByTestId('per-step-narrative-body');
    expect(within(body).getAllByTestId(/^step-/)).toHaveLength(4);
  });

  it('formats numeric results as currency for large values', () => {
    render(<PerStepNarrative steps={SAMPLE_STEPS} />);
    fireEvent.click(screen.getByTestId('per-step-narrative-toggle'));
    expect(screen.getByText(/\$165,783\.00/)).toBeInTheDocument();
  });

  it('formats small numeric results as decimals', () => {
    render(<PerStepNarrative steps={SAMPLE_STEPS} />);
    fireEvent.click(screen.getByTestId('per-step-narrative-toggle'));
    expect(screen.getByText(/13\.245/)).toBeInTheDocument();
  });

  it('renders em-dash for null results', () => {
    render(<PerStepNarrative steps={SAMPLE_STEPS} />);
    fireEvent.click(screen.getByTestId('per-step-narrative-toggle'));
    expect(screen.getAllByText('—').length).toBeGreaterThanOrEqual(2);
  });

  it('does not crash on unknown step ID; emits dev warning', () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const unknownStep = [{ step: 1, stepId: 'step_xyz_unknown', label: 'Unknown', computation: '', result: 0 }];
    render(<PerStepNarrative steps={unknownStep} />);
    fireEvent.click(screen.getByTestId('per-step-narrative-toggle'));
    expect(screen.getByText(/Unknown/)).toBeInTheDocument();
    expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('step_xyz_unknown'));
    warnSpy.mockRestore();
  });

  it('renders structured-object result as a key-value list, not JSON.stringify', () => {
    const structuredStep = [
      {
        step: 1,
        stepId: 'step_t_compute_coverture_fraction',
        label: 'Coverture fraction',
        computation: '',
        result: { fraction: 0.3194, numeratorMonths: 115, denominatorMonths: 360 },
      },
    ];
    render(<PerStepNarrative steps={structuredStep} />);
    fireEvent.click(screen.getByTestId('per-step-narrative-toggle'));
    // Key-value list rows must include the key names — NOT raw JSON braces.
    expect(screen.getByText(/fraction:/)).toBeInTheDocument();
    expect(screen.getByText(/numeratorMonths:/)).toBeInTheDocument();
    // Defensive: ensure JSON.stringify wasn't used (no curly-brace literal).
    expect(screen.queryByText(/^{.*}$/)).toBeNull();
  });
});
