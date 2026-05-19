/**
 * WizardDate tests — the native HTML5 date input, chrome-matched to the
 * foundation form aesthetic (extension primitive v1.1). Covers the
 * controlled onChange(field, value) API, ISO-8601 storage, the
 * native-attribute `...rest` spread, the chrome (36px / parchment / ink /
 * Inter), focus / disabled / error states, accent-color, and WCAG AA
 * wiring (label/for, aria-invalid/describedby).
 *
 * jsdom note: outline is asserted via longhand (jsdom does not expand the
 * shorthand) and accent-color via the inline style (cssstyle does not
 * model accent-color through getComputedStyle) — same honesty precedent
 * as WizardField.test.jsx.
 */

import { describe, it, expect, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { render, screen, fireEvent } from '@testing-library/react';
import WizardDate from '../WizardDate.jsx';
import { T } from '@/src/lib/brand/tokens';

const SOURCE = readFileSync(
  path.resolve(process.cwd(), 'src/components/wizard/WizardDate.jsx'),
  'utf8',
);

const baseProps = {
  label: 'Valuation date',
  field: 'valuationDate',
  value: '',
  onChange: () => {},
};

describe('WizardDate — chrome', () => {
  it('renders a native <input type="date">', () => {
    render(<WizardDate {...baseProps} />);
    const input = screen.getByTestId('wizard-date-input');
    expect(input.tagName).toBe('INPUT');
    expect(input.getAttribute('type')).toBe('date');
  });

  it('is 36px tall, 7px radius, 1px T.LINE_STRONG border, 14px Inter', () => {
    render(<WizardDate {...baseProps} />);
    const input = screen.getByTestId('wizard-date-input');
    expect(input).toHaveStyle({
      height: '36px',
      borderRadius: '7px',
      border: `1px solid ${T.LINE_STRONG}`,
      fontSize: '14px',
    });
    expect(input.style.fontFamily).toContain('--font-inter');
  });

  it('uses a parchment background and ink text (spec W15)', () => {
    render(<WizardDate {...baseProps} />);
    expect(screen.getByTestId('wizard-date-input')).toHaveStyle({
      backgroundColor: T.PARCHMENT,
      color: T.INK,
    });
  });

  it('sets accent-color to T.GOLD for the native picker popup', () => {
    render(<WizardDate {...baseProps} />);
    // jsdom CSSOM normalizes the hex to rgb(); toHaveStyle canonicalizes
    // both sides (same as the other T.* color assertions here).
    expect(screen.getByTestId('wizard-date-input')).toHaveStyle({
      accentColor: T.GOLD,
    });
  });

  it('renders the label and wires htmlFor to the input id', () => {
    render(<WizardDate {...baseProps} />);
    const input = screen.getByTestId('wizard-date-input');
    const label = screen.getByText('Valuation date');
    expect(label.getAttribute('for')).toBe(input.getAttribute('id'));
    expect(input.getAttribute('id')).toBeTruthy();
  });
});

describe('WizardDate — controlled API (Q-4) & ISO storage', () => {
  it('renders an ISO value verbatim', () => {
    render(<WizardDate {...baseProps} value="2026-05-18" />);
    expect(screen.getByTestId('wizard-date-input').value).toBe('2026-05-18');
  });

  it('renders empty value as "" (never undefined/null)', () => {
    render(<WizardDate {...baseProps} value={undefined} />);
    expect(screen.getByTestId('wizard-date-input').value).toBe('');
  });

  it('calls onChange(field, value) with an ISO YYYY-MM-DD string', () => {
    const onChange = vi.fn();
    render(<WizardDate {...baseProps} onChange={onChange} />);
    fireEvent.change(screen.getByTestId('wizard-date-input'), {
      target: { value: '2026-12-31' },
    });
    expect(onChange).toHaveBeenCalledWith('valuationDate', '2026-12-31');
  });
});

describe('WizardDate — native attribute spread (...rest)', () => {
  it('forwards min / max / step to the underlying input', () => {
    render(
      <WizardDate {...baseProps} min="2020-01-01" max="2030-12-31" step="7" />,
    );
    const input = screen.getByTestId('wizard-date-input');
    expect(input.getAttribute('min')).toBe('2020-01-01');
    expect(input.getAttribute('max')).toBe('2030-12-31');
    expect(input.getAttribute('step')).toBe('7');
  });

  it('forwards required and arbitrary native attributes', () => {
    render(<WizardDate {...baseProps} required data-foo="bar" />);
    const input = screen.getByTestId('wizard-date-input');
    expect(input.hasAttribute('required')).toBe(true);
    expect(input.getAttribute('data-foo')).toBe('bar');
  });

  it('does not let rest override the controlled type/value contract', () => {
    render(<WizardDate {...baseProps} value="2026-01-01" type="text" />);
    const input = screen.getByTestId('wizard-date-input');
    expect(input.getAttribute('type')).toBe('date');
    expect(input.value).toBe('2026-01-01');
  });
});

describe('WizardDate — focus state (Q-7)', () => {
  it('shows a gold border + 3px gold focus ring, 120ms ease', () => {
    render(<WizardDate {...baseProps} />);
    const input = screen.getByTestId('wizard-date-input');
    fireEvent.focus(input);
    expect(input).toHaveStyle({ borderColor: T.GOLD });
    expect(input.style.outlineWidth).toBe('3px');
    expect(input.style.outlineStyle).toBe('solid');
    expect(input.style.transition).toContain('120ms');
  });
});

describe('WizardDate — disabled state (Q-2, no opacity)', () => {
  it('muted text + grey fill + not-allowed cursor, no opacity', () => {
    render(<WizardDate {...baseProps} disabled />);
    const input = screen.getByTestId('wizard-date-input');
    expect(input).toBeDisabled();
    expect(input).toHaveStyle({ color: T.MUTED, cursor: 'not-allowed' });
    expect(input.style.opacity === '' || input.style.opacity === '1').toBe(true);
    expect(input.getAttribute('aria-disabled')).toBe('true');
  });
});

describe('WizardDate — error state (Q-1)', () => {
  it('renders the error below the input at 11px / T.RED', () => {
    render(<WizardDate {...baseProps} error="Pick a date." />);
    const err = screen.getByTestId('wizard-date-error');
    expect(err).toHaveTextContent('Pick a date.');
    expect(err).toHaveStyle({ fontSize: '11px', color: T.RED, marginTop: '4px' });
  });

  it('turns the input border red with a 3px ring', () => {
    render(<WizardDate {...baseProps} error="Pick a date." />);
    const input = screen.getByTestId('wizard-date-input');
    expect(input).toHaveStyle({ borderColor: T.RED });
    expect(input.style.outlineWidth).toBe('3px');
  });

  it('wires aria-invalid + aria-describedby to the error id', () => {
    render(<WizardDate {...baseProps} error="Required" />);
    const input = screen.getByTestId('wizard-date-input');
    const err = screen.getByTestId('wizard-date-error');
    expect(input.getAttribute('aria-invalid')).toBe('true');
    expect(input.getAttribute('aria-describedby') || '').toContain(
      err.getAttribute('id'),
    );
  });

  it('no error node and no aria-invalid when error is null', () => {
    render(<WizardDate {...baseProps} error={null} />);
    expect(screen.queryByTestId('wizard-date-error')).toBeNull();
    expect(
      screen.getByTestId('wizard-date-input').getAttribute('aria-invalid'),
    ).toBeNull();
  });
});

describe('WizardDate — source contract', () => {
  it("declares 'use client' at the top", () => {
    expect(SOURCE.startsWith("'use client';")).toBe(true);
  });

  it('documents the controlled API with JSDoc @param', () => {
    expect(SOURCE).toContain('@param');
    expect(SOURCE).toMatch(/@param.*\bfield\b/);
    expect(SOURCE).toMatch(/@param.*\bvalue\b/);
    expect(SOURCE).toMatch(/@param.*onChange/);
    expect(SOURCE).toMatch(/@param.*\blabel\b/);
  });

  it('applies tokens inline — no CSS custom properties (Q-0b lock)', () => {
    expect(SOURCE).not.toMatch(/var\(--/);
  });
});
