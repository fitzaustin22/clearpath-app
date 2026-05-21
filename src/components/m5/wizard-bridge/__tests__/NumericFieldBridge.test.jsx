/**
 * NumericFieldBridge — keystroke-by-keystroke decimal-input coverage.
 *
 * Asserts the class of bug that let PR-FIX-1 ship: the bridge that converts
 * a WizardField's raw string into a store-shaped number must NOT round-trip
 * through Number() on every keystroke. A trailing "." in an in-progress
 * decimal entry ("0.", "1500.") must survive until the user keeps typing.
 *
 * Each test simulates separate change events — one per character — because
 * a paste/coerced single change cannot expose the round-trip defect.
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { useState } from 'react';
import NumericFieldBridge from '../NumericFieldBridge.jsx';

function Harness({ parser, initial = null, onChangeSpy }) {
  const [value, setValue] = useState(initial);
  return (
    <NumericFieldBridge
      field="amount"
      label="Amount"
      value={value}
      parser={parser}
      onChange={(field, num) => {
        onChangeSpy?.(field, num);
        setValue(num);
      }}
    />
  );
}

function typeChars(input, chars) {
  let acc = '';
  for (const ch of chars) {
    acc += ch;
    fireEvent.change(input, { target: { value: acc } });
  }
}

describe('NumericFieldBridge — decimal-input survival', () => {
  it('preserves trailing decimal "0." mid-type', () => {
    const spy = vi.fn();
    render(<Harness parser="number" onChangeSpy={spy} />);
    const input = screen.getByTestId('wizard-field-input');
    typeChars(input, ['0', '.']);
    expect(input.value).toBe('0.');
    expect(spy).toHaveBeenLastCalledWith('amount', 0);
  });

  it('preserves the decimal across all three keystrokes of "0.5"', () => {
    const spy = vi.fn();
    render(<Harness parser="number" onChangeSpy={spy} />);
    const input = screen.getByTestId('wizard-field-input');
    typeChars(input, ['0', '.', '5']);
    expect(input.value).toBe('0.5');
    expect(spy).toHaveBeenLastCalledWith('amount', 0.5);
  });

  it('survives a 7-character currency entry "1500.50"', () => {
    const spy = vi.fn();
    render(<Harness parser="currency" onChangeSpy={spy} />);
    const input = screen.getByTestId('wizard-field-input');
    typeChars(input, ['1', '5', '0', '0', '.', '5', '0']);
    expect(input.value).toBe('1500.50');
    expect(spy).toHaveBeenLastCalledWith('amount', 1500.5);
  });

  it('handles a percent-style rate "6.25"', () => {
    const spy = vi.fn();
    render(<Harness parser="number" onChangeSpy={spy} />);
    const input = screen.getByTestId('wizard-field-input');
    typeChars(input, ['6', '.', '2', '5']);
    expect(input.value).toBe('6.25');
    expect(spy).toHaveBeenLastCalledWith('amount', 6.25);
  });

  it('handles a fraction-style rate "0.0625"', () => {
    const spy = vi.fn();
    render(<Harness parser="number" onChangeSpy={spy} />);
    const input = screen.getByTestId('wizard-field-input');
    typeChars(input, ['0', '.', '0', '6', '2', '5']);
    expect(input.value).toBe('0.0625');
    expect(spy).toHaveBeenLastCalledWith('amount', 0.0625);
  });

  it('tolerates a leading-dot entry ".5"', () => {
    const spy = vi.fn();
    render(<Harness parser="number" onChangeSpy={spy} />);
    const input = screen.getByTestId('wizard-field-input');
    typeChars(input, ['.', '5']);
    expect(input.value).toBe('.5');
    expect(spy).toHaveBeenLastCalledWith('amount', 0.5);
  });
});

describe('NumericFieldBridge — store contract', () => {
  it('emits null for empty input', () => {
    const spy = vi.fn();
    render(<Harness parser="number" initial={42} onChangeSpy={spy} />);
    const input = screen.getByTestId('wizard-field-input');
    fireEvent.change(input, { target: { value: '' } });
    expect(spy).toHaveBeenLastCalledWith('amount', null);
    expect(input.value).toBe('');
  });

  it('emits null for non-numeric garbage', () => {
    const spy = vi.fn();
    render(<Harness parser="number" onChangeSpy={spy} />);
    const input = screen.getByTestId('wizard-field-input');
    fireEvent.change(input, { target: { value: 'abc' } });
    expect(spy).toHaveBeenLastCalledWith('amount', null);
  });

  it('emits the parsed integer for a whole-number entry', () => {
    const spy = vi.fn();
    render(<Harness parser="number" onChangeSpy={spy} />);
    const input = screen.getByTestId('wizard-field-input');
    typeChars(input, ['1', '5', '0', '0']);
    expect(spy).toHaveBeenLastCalledWith('amount', 1500);
  });

  it('currency parser clamps negative to zero (legacy behavior)', () => {
    const spy = vi.fn();
    render(<Harness parser="currency" onChangeSpy={spy} />);
    const input = screen.getByTestId('wizard-field-input');
    fireEvent.change(input, { target: { value: '-100' } });
    expect(spy).toHaveBeenLastCalledWith('amount', 100);
  });

  it('currency parser strips non-digits ("$1,500.50" -> 1500.5)', () => {
    const spy = vi.fn();
    render(<Harness parser="currency" onChangeSpy={spy} />);
    const input = screen.getByTestId('wizard-field-input');
    fireEvent.change(input, { target: { value: '$1,500.50' } });
    expect(spy).toHaveBeenLastCalledWith('amount', 1500.5);
  });
});

describe('NumericFieldBridge — external value sync', () => {
  function ExternalHarness({ controlled }) {
    return (
      <NumericFieldBridge
        field="amount"
        label="Amount"
        value={controlled}
        parser="number"
        onChange={() => {}}
      />
    );
  }

  it('displays the prop value verbatim when the user has not typed', () => {
    const { rerender } = render(<ExternalHarness controlled={5000} />);
    const input = screen.getByTestId('wizard-field-input');
    expect(input.value).toBe('5000');
    rerender(<ExternalHarness controlled={7500} />);
    expect(input.value).toBe('7500');
  });

  it('drops a stale draft when the prop value changes externally', () => {
    // The bridge holds its own draft. To simulate a parent (pre-pop / reset)
    // changing the prop value mid-typing, render with onChange=noop so the
    // prop value remains under test control, then rerender with the new value.
    function Wrapper({ value }) {
      return (
        <NumericFieldBridge
          field="amount"
          label="Amount"
          value={value}
          parser="number"
          onChange={() => {}}
        />
      );
    }
    const { rerender } = render(<Wrapper value={0} />);
    const input = screen.getByTestId('wizard-field-input');
    typeChars(input, ['0', '.']);
    expect(input.value).toBe('0.');

    rerender(<Wrapper value={5000} />);
    expect(input.value).toBe('5000');
  });

  it('renders empty when value is null and no draft', () => {
    render(<ExternalHarness controlled={null} />);
    const input = screen.getByTestId('wizard-field-input');
    expect(input.value).toBe('');
  });
});

describe('NumericFieldBridge — WizardField pass-through', () => {
  it('forwards prefix/suffix/tooltip/numeric/error props', () => {
    render(
      <NumericFieldBridge
        field="x"
        label="X"
        value={null}
        parser="number"
        onChange={() => {}}
        prefix="$"
        suffix="%"
        tooltip="hint"
        numeric
        error="bad"
      />,
    );
    expect(screen.getByTestId('wizard-field-prefix')).toBeTruthy();
    expect(screen.getByTestId('wizard-field-suffix')).toBeTruthy();
    expect(screen.getByTestId('wizard-field-info')).toBeTruthy();
    expect(screen.getByTestId('wizard-field-error')).toBeTruthy();
  });
});
