/**
 * QDROStillNotSureDiagnostic tests — §8.3.5 (lines 2793–2797) + Q-C6.
 *
 * Inline-expand (no modal, no route) "still not sure" 3-question diagnostic.
 * The best-guess + rationale resolution is delegated to PR1's
 * `diagnosePlanType` (consumed, not re-derived). No hard validation: the
 * user may accept the surfaced best guess or dismiss by collapsing.
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import QDROStillNotSureDiagnostic from '../QDROStillNotSureDiagnostic.jsx';

function expand() {
  fireEvent.click(screen.getByRole('button', { name: /still not sure/i }));
}

describe('QDROStillNotSureDiagnostic (§8.3.5 / Q-C6)', () => {
  it('renders the "Still not sure?" trigger', () => {
    render(<QDROStillNotSureDiagnostic onAccept={() => {}} />);
    expect(
      screen.getByRole('button', { name: /still not sure/i }),
    ).toBeInTheDocument();
  });

  it('is collapsed by default (aria-expanded=false, questions hidden)', () => {
    render(<QDROStillNotSureDiagnostic onAccept={() => {}} />);
    const trigger = screen.getByRole('button', { name: /still not sure/i });
    expect(trigger).toHaveAttribute('aria-expanded', 'false');
    expect(screen.queryByTestId('qdro-diagnostic-panel')).not.toBeInTheDocument();
  });

  it('expands inline when the trigger is clicked (aria-expanded=true)', () => {
    render(<QDROStillNotSureDiagnostic onAccept={() => {}} />);
    expand();
    expect(
      screen.getByRole('button', { name: /still not sure/i }),
    ).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByTestId('qdro-diagnostic-panel')).toBeInTheDocument();
  });

  it('collapses again when the trigger is clicked a second time', () => {
    render(<QDROStillNotSureDiagnostic onAccept={() => {}} />);
    expand();
    expand();
    expect(
      screen.getByRole('button', { name: /still not sure/i }),
    ).toHaveAttribute('aria-expanded', 'false');
    expect(screen.queryByTestId('qdro-diagnostic-panel')).not.toBeInTheDocument();
  });

  it('renders the 3 §8.3.5 diagnostic questions when expanded', () => {
    render(<QDROStillNotSureDiagnostic onAccept={() => {}} />);
    expand();
    expect(screen.getByText(/pay a monthly benefit at retirement/i)).toBeInTheDocument();
    expect(screen.getByText(/have an account balance/i)).toBeInTheDocument();
    expect(screen.getByText(/W-2 box 12/i)).toBeInTheDocument();
  });

  it('is inline only — never renders a modal/dialog (Q-C6)', () => {
    render(<QDROStillNotSureDiagnostic onAccept={() => {}} />);
    expand();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('best guess: pays monthly + no balance → defined-benefit rationale', () => {
    render(<QDROStillNotSureDiagnostic onAccept={() => {}} />);
    expand();
    fireEvent.click(screen.getByTestId('wizard-radio-input-q1_yes'));
    fireEvent.click(screen.getByTestId('wizard-radio-input-q2_no'));
    fireEvent.click(screen.getByTestId('wizard-radio-input-q3_no'));
    fireEvent.click(screen.getByRole('button', { name: /see best guess/i }));
    expect(
      screen.getByText(/characteristic of a defined-benefit pension/i),
    ).toBeInTheDocument();
  });

  it('best guess: account balance + W-2 code → 401(k)/403(b)/457(b) rationale', () => {
    render(<QDROStillNotSureDiagnostic onAccept={() => {}} />);
    expand();
    fireEvent.click(screen.getByTestId('wizard-radio-input-q1_no'));
    fireEvent.click(screen.getByTestId('wizard-radio-input-q2_yes'));
    fireEvent.click(screen.getByTestId('wizard-radio-input-q3_yes'));
    fireEvent.click(screen.getByRole('button', { name: /see best guess/i }));
    expect(
      screen.getByText(/401\(k\) \/ 403\(b\) \/ 457\(b\)/i),
    ).toBeInTheDocument();
  });

  it('best guess: account balance, no W-2, no monthly → IRA rationale', () => {
    render(<QDROStillNotSureDiagnostic onAccept={() => {}} />);
    expand();
    fireEvent.click(screen.getByTestId('wizard-radio-input-q1_no'));
    fireEvent.click(screen.getByTestId('wizard-radio-input-q2_yes'));
    fireEvent.click(screen.getByTestId('wizard-radio-input-q3_no'));
    fireEvent.click(screen.getByRole('button', { name: /see best guess/i }));
    expect(screen.getByText(/characteristic of an IRA/i)).toBeInTheDocument();
  });

  it('ambiguous (no monthly, no balance) → no clear answer, no accept control', () => {
    render(<QDROStillNotSureDiagnostic onAccept={() => {}} />);
    expand();
    fireEvent.click(screen.getByTestId('wizard-radio-input-q1_no'));
    fireEvent.click(screen.getByTestId('wizard-radio-input-q2_no'));
    fireEvent.click(screen.getByRole('button', { name: /see best guess/i }));
    expect(
      screen.getByText(/do not point clearly to one plan type/i),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: /use this classification/i }),
    ).not.toBeInTheDocument();
  });

  it('accepting the best guess calls onAccept with the radio-choice id', () => {
    const onAccept = vi.fn();
    render(<QDROStillNotSureDiagnostic onAccept={onAccept} />);
    expand();
    fireEvent.click(screen.getByTestId('wizard-radio-input-q1_yes'));
    fireEvent.click(screen.getByTestId('wizard-radio-input-q2_no'));
    fireEvent.click(screen.getByRole('button', { name: /see best guess/i }));
    fireEvent.click(
      screen.getByRole('button', { name: /use this classification/i }),
    );
    expect(onAccept).toHaveBeenCalledTimes(1);
    expect(onAccept).toHaveBeenCalledWith('db_pension');
  });

  it('does not call onAccept on mount or before the user accepts', () => {
    const onAccept = vi.fn();
    render(<QDROStillNotSureDiagnostic onAccept={onAccept} />);
    expand();
    fireEvent.click(screen.getByTestId('wizard-radio-input-q1_yes'));
    fireEvent.click(screen.getByRole('button', { name: /see best guess/i }));
    expect(onAccept).not.toHaveBeenCalled();
  });

  it('exposes a stable root test id', () => {
    render(<QDROStillNotSureDiagnostic onAccept={() => {}} />);
    expect(screen.getByTestId('qdro-still-not-sure')).toBeInTheDocument();
  });
});
