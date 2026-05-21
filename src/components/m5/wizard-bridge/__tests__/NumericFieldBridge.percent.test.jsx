/**
 * NumericFieldBridge — percent-mode coverage (PR-FIX-2).
 *
 * In percent mode the bridge is a display/input translation layer over a
 * fraction-valued store: the prop is a decimal fraction (0.0625 = 6.25%),
 * the input renders the prop ×100 ("6.25"), and a user keystroke is parsed
 * and ÷100 before reaching onChange. The store and any downstream consumer
 * still see the fraction — the engine and its fixtures are untouched.
 *
 * Tests assert: prop→display scaling (with IEEE float-artifact protection),
 * keystroke→prop conversion (÷100), in-progress draft preservation that
 * survives the decimal-fix discipline, null discipline, external-value sync,
 * and backward compatibility for the default (non-percent) mode.
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { useEffect, useState } from 'react';
import NumericFieldBridge from '../NumericFieldBridge.jsx';

function PercentHarness({ initial = null, onChangeSpy }) {
  const [value, setValue] = useState(initial);
  return (
    <NumericFieldBridge
      field="rate"
      label="Rate"
      value={value}
      parser="number"
      percent
      onChange={(field, num) => {
        onChangeSpy?.(field, num);
        setValue(num);
      }}
    />
  );
}

function typeChars(input, chars) {
  let acc = input.value;
  for (const ch of chars) {
    acc += ch;
    fireEvent.change(input, { target: { value: acc } });
  }
}

describe('NumericFieldBridge — percent mode: display scaling', () => {
  function ControlledHarness({ value }) {
    return (
      <NumericFieldBridge
        field="rate"
        label="Rate"
        value={value}
        parser="number"
        percent
        onChange={() => {}}
      />
    );
  }

  it('renders stored fraction 0.0625 as "6.25"', () => {
    render(<ControlledHarness value={0.0625} />);
    expect(screen.getByTestId('wizard-field-input')).toHaveValue('6.25');
  });

  it('renders stored fraction 0.045 as "4.5"', () => {
    render(<ControlledHarness value={0.045} />);
    expect(screen.getByTestId('wizard-field-input')).toHaveValue('4.5');
  });

  it('renders stored fraction 0.07 as "7" (no IEEE float artifact)', () => {
    // Without protection, 0.07 * 100 === 7.000000000000001 → bad UX.
    render(<ControlledHarness value={0.07} />);
    expect(screen.getByTestId('wizard-field-input')).toHaveValue('7');
  });

  it('renders stored 0.10000000000000001 as "10" (no float artifact)', () => {
    render(<ControlledHarness value={0.1} />);
    expect(screen.getByTestId('wizard-field-input')).toHaveValue('10');
  });

  it('renders stored 0 as "0"', () => {
    render(<ControlledHarness value={0} />);
    expect(screen.getByTestId('wizard-field-input')).toHaveValue('0');
  });

  it('renders null as empty string', () => {
    render(<ControlledHarness value={null} />);
    expect(screen.getByTestId('wizard-field-input')).toHaveValue('');
  });
});

describe('NumericFieldBridge — percent mode: keystroke → store', () => {
  it('typed "6.25" stores 0.0625', () => {
    const spy = vi.fn();
    render(<PercentHarness onChangeSpy={spy} />);
    const input = screen.getByTestId('wizard-field-input');
    typeChars(input, ['6', '.', '2', '5']);
    expect(spy).toHaveBeenLastCalledWith('rate', 0.0625);
  });

  it('typed "4.5" stores 0.045', () => {
    const spy = vi.fn();
    render(<PercentHarness onChangeSpy={spy} />);
    const input = screen.getByTestId('wizard-field-input');
    typeChars(input, ['4', '.', '5']);
    expect(spy).toHaveBeenLastCalledWith('rate', 0.045);
  });

  it('typed whole-number "7" stores 0.07', () => {
    const spy = vi.fn();
    render(<PercentHarness onChangeSpy={spy} />);
    const input = screen.getByTestId('wizard-field-input');
    typeChars(input, ['7']);
    expect(spy).toHaveBeenLastCalledWith('rate', 0.07);
  });

  it('cleared input stores null (null discipline)', () => {
    const spy = vi.fn();
    render(<PercentHarness initial={0.0625} onChangeSpy={spy} />);
    const input = screen.getByTestId('wizard-field-input');
    fireEvent.change(input, { target: { value: '' } });
    expect(spy).toHaveBeenLastCalledWith('rate', null);
    expect(input.value).toBe('');
  });

  it('non-numeric garbage stores null', () => {
    const spy = vi.fn();
    render(<PercentHarness onChangeSpy={spy} />);
    const input = screen.getByTestId('wizard-field-input');
    fireEvent.change(input, { target: { value: 'abc' } });
    expect(spy).toHaveBeenLastCalledWith('rate', null);
  });
});

describe('NumericFieldBridge — percent mode: in-progress draft preservation', () => {
  it('preserves trailing decimal "6." mid-type (display + non-destructive store)', () => {
    const spy = vi.fn();
    render(<PercentHarness onChangeSpy={spy} />);
    const input = screen.getByTestId('wizard-field-input');
    typeChars(input, ['6', '.']);
    expect(input.value).toBe('6.');
    // "6." parses to 6; 6/100 === 0.06 (IEEE-exact).
    expect(spy).toHaveBeenLastCalledWith('rate', 0.06);
  });

  it('preserves the decimal across all four keystrokes of "6.25"', () => {
    const spy = vi.fn();
    render(<PercentHarness onChangeSpy={spy} />);
    const input = screen.getByTestId('wizard-field-input');
    typeChars(input, ['6', '.', '2', '5']);
    expect(input.value).toBe('6.25');
    expect(spy).toHaveBeenLastCalledWith('rate', 0.0625);
  });

  it('tolerates a leading-dot entry ".5" (display preserved)', () => {
    const spy = vi.fn();
    render(<PercentHarness onChangeSpy={spy} />);
    const input = screen.getByTestId('wizard-field-input');
    typeChars(input, ['.', '5']);
    expect(input.value).toBe('.5');
    expect(spy).toHaveBeenLastCalledWith('rate', 0.005);
  });

  it('round-trip is stable: typing "7" then re-rendering still shows "7" (no 7.000…001)', () => {
    const spy = vi.fn();
    render(<PercentHarness onChangeSpy={spy} />);
    const input = screen.getByTestId('wizard-field-input');
    typeChars(input, ['7']);
    // After commit, the draft is "7" and the prop is 0.07. Draft preservation
    // shows "7" verbatim — proves we never round-trip through (value*100).
    expect(input.value).toBe('7');
  });
});

describe('NumericFieldBridge — percent mode: external value sync', () => {
  function ExternalHarness({ controlled }) {
    return (
      <NumericFieldBridge
        field="rate"
        label="Rate"
        value={controlled}
        parser="number"
        percent
        onChange={() => {}}
      />
    );
  }

  it('displays the prop value as a percent when user has not typed', () => {
    const { rerender } = render(<ExternalHarness controlled={0.0625} />);
    const input = screen.getByTestId('wizard-field-input');
    expect(input.value).toBe('6.25');
    rerender(<ExternalHarness controlled={0.075} />);
    expect(input.value).toBe('7.5');
  });

  it('drops a stale draft when the prop value changes externally', () => {
    // Stateful wrapper: keystrokes drive local state (so the draft settles),
    // and a useEffect syncs an explicit `external` prop change in over the
    // top (simulates pre-pop / reset overwriting an in-progress edit).
    function Wrapper({ external }) {
      const [value, setValue] = useState(external);
      useEffect(() => {
        setValue(external);
      }, [external]);
      return (
        <NumericFieldBridge
          field="rate"
          label="Rate"
          value={value}
          parser="number"
          percent
          onChange={(_f, v) => setValue(v)}
        />
      );
    }
    const { rerender } = render(<Wrapper external={null} />);
    const input = screen.getByTestId('wizard-field-input');
    typeChars(input, ['6', '.']);
    expect(input.value).toBe('6.');

    rerender(<Wrapper external={0.045} />);
    expect(input.value).toBe('4.5');
  });
});

describe('NumericFieldBridge — default (non-percent) mode unchanged (backward compat)', () => {
  function NumberHarness({ initial = null, onChangeSpy }) {
    const [value, setValue] = useState(initial);
    return (
      <NumericFieldBridge
        field="amount"
        label="Amount"
        value={value}
        parser="number"
        onChange={(field, num) => {
          onChangeSpy?.(field, num);
          setValue(num);
        }}
      />
    );
  }

  it('default mode: typed "6.25" stores 6.25 (no ÷100)', () => {
    const spy = vi.fn();
    render(<NumberHarness onChangeSpy={spy} />);
    const input = screen.getByTestId('wizard-field-input');
    typeChars(input, ['6', '.', '2', '5']);
    expect(spy).toHaveBeenLastCalledWith('amount', 6.25);
  });

  it('default mode: stored 0.0625 displays as "0.0625" (no ×100)', () => {
    render(
      <NumericFieldBridge
        field="amount"
        label="Amount"
        value={0.0625}
        parser="number"
        onChange={() => {}}
      />,
    );
    expect(screen.getByTestId('wizard-field-input')).toHaveValue('0.0625');
  });
});
