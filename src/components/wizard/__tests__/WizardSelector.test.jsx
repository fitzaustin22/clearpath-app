/**
 * WizardSelector tests — the styled native-<select> extension primitive
 * (foundation v1.2). Covers the label row + info icon + provenance badge,
 * the controlled onChange(field, value) API, placeholder option behavior,
 * focus / disabled / error visual states, the info-icon tooltip
 * (hover + mobile tap), and WCAG AA wiring (label/for, aria-invalid,
 * aria-describedby).
 *
 * Mirrors WizardField's API surface so PR-B/C/D migrations can swap a
 * select-shaped chain for this component without prop translation. The
 * native <select> is the control — no custom JS dropdown, no listbox
 * role; we lean on native semantics + a styled chrome.
 *
 * jsdom note: outline is asserted via longhand (jsdom does not expand the
 * shorthand) — same honesty precedent as WizardField.test.jsx.
 */

import { describe, it, expect, vi, afterEach } from 'vitest';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { render, screen, fireEvent } from '@testing-library/react';
import WizardSelector from '../WizardSelector.jsx';
import { T } from '@/src/lib/brand/tokens';

const SOURCE = readFileSync(
  path.resolve(process.cwd(), 'src/components/wizard/WizardSelector.jsx'),
  'utf8',
);

function setWidth(w) {
  Object.defineProperty(window, 'innerWidth', {
    writable: true,
    configurable: true,
    value: w,
  });
}

afterEach(() => {
  vi.restoreAllMocks();
  setWidth(1024);
});

const FILING_OPTIONS = [
  { value: 'single', label: 'Single' },
  { value: 'mfj', label: 'Married filing jointly' },
  { value: 'mfs', label: 'Married filing separately' },
  { value: 'hoh', label: 'Head of household' },
];

const baseProps = {
  label: 'Filing status',
  field: 'filingStatus',
  value: '',
  onChange: () => {},
  options: FILING_OPTIONS,
};

describe('WizardSelector — label row', () => {
  it('renders the label at 12.5px / 600 / T.INK', () => {
    render(<WizardSelector {...baseProps} />);
    const label = screen.getByText('Filing status');
    expect(label).toHaveStyle({ fontSize: '12.5px', fontWeight: 600, color: T.INK });
  });

  it('associates the <label> with the <select> via htmlFor/id', () => {
    render(<WizardSelector {...baseProps} />);
    const control = screen.getByTestId('wizard-selector-control');
    const label = screen.getByText('Filing status');
    expect(label.getAttribute('for')).toBe(control.getAttribute('id'));
    expect(control.getAttribute('id')).toBeTruthy();
  });

  it('hides the info icon when no tooltip is provided', () => {
    render(<WizardSelector {...baseProps} />);
    expect(screen.queryByTestId('wizard-selector-info')).toBeNull();
  });

  it('shows the info icon (14px circle, T.LINE bg, T.INK_2 glyph) when tooltip set', () => {
    render(<WizardSelector {...baseProps} tooltip="Picks the IRS filing status." />);
    const icon = screen.getByTestId('wizard-selector-info');
    expect(icon).toHaveStyle({
      width: '14px',
      height: '14px',
      borderRadius: '50%',
      backgroundColor: T.LINE,
      color: T.INK_2,
    });
  });

  it('renders a "From M4" provenance badge when prefilledFrom is set', () => {
    render(<WizardSelector {...baseProps} prefilledFrom="M4" />);
    const badge = screen.getByTestId('wizard-selector-badge');
    expect(badge).toHaveTextContent('From M4');
    expect(badge).toHaveStyle({
      fontSize: '10px',
      fontWeight: 700,
      textTransform: 'uppercase',
      letterSpacing: '0.5px',
      backgroundColor: T.PARCHMENT_DEEP,
      color: T.PILL_TEXT,
    });
  });
});

describe('WizardSelector — native control', () => {
  it('renders a native <select>, not a custom dropdown', () => {
    render(<WizardSelector {...baseProps} />);
    const control = screen.getByTestId('wizard-selector-control');
    expect(control.tagName).toBe('SELECT');
    // No custom listbox role — the spec rejects a custom dropdown
    expect(screen.queryByRole('listbox')).toBeNull();
  });

  it('renders one <option> per provided option', () => {
    render(<WizardSelector {...baseProps} />);
    const control = screen.getByTestId('wizard-selector-control');
    const labels = Array.from(control.querySelectorAll('option')).map(
      (o) => o.textContent,
    );
    expect(labels).toEqual([
      'Single',
      'Married filing jointly',
      'Married filing separately',
      'Head of household',
    ]);
  });

  it('is 36px tall, 7px radius, 1px T.LINE_STRONG border, 14px Inter', () => {
    render(<WizardSelector {...baseProps} />);
    const control = screen.getByTestId('wizard-selector-control');
    expect(control).toHaveStyle({
      height: '36px',
      borderRadius: '7px',
      border: `1px solid ${T.LINE_STRONG}`,
      fontSize: '14px',
    });
    expect(control.style.fontFamily).toContain('--font-inter');
  });
});

describe('WizardSelector — placeholder', () => {
  it('renders a disabled, empty-value placeholder option when placeholder prop is set', () => {
    render(<WizardSelector {...baseProps} placeholder="Choose a status..." />);
    const control = screen.getByTestId('wizard-selector-control');
    const first = control.querySelector('option');
    expect(first.value).toBe('');
    expect(first.textContent).toBe('Choose a status...');
    expect(first.disabled).toBe(true);
  });

  it('does not render a placeholder option when placeholder is absent', () => {
    render(<WizardSelector {...baseProps} />);
    const control = screen.getByTestId('wizard-selector-control');
    const opts = Array.from(control.querySelectorAll('option'));
    // No empty-value option leaks in
    expect(opts.every((o) => o.value !== '')).toBe(true);
    expect(opts).toHaveLength(FILING_OPTIONS.length);
  });
});

describe('WizardSelector — controlled API (Q-4)', () => {
  it('renders the value prop verbatim', () => {
    render(<WizardSelector {...baseProps} value="mfj" />);
    expect(screen.getByTestId('wizard-selector-control').value).toBe('mfj');
  });

  it('renders empty string when value is undefined', () => {
    render(
      <WizardSelector
        {...baseProps}
        value={undefined}
        placeholder="Choose..."
      />,
    );
    expect(screen.getByTestId('wizard-selector-control').value).toBe('');
  });

  it('calls onChange(field, value) on change', () => {
    const onChange = vi.fn();
    render(<WizardSelector {...baseProps} onChange={onChange} />);
    fireEvent.change(screen.getByTestId('wizard-selector-control'), {
      target: { value: 'hoh' },
    });
    expect(onChange).toHaveBeenCalledWith('filingStatus', 'hoh');
  });
});

describe('WizardSelector — focus state (Q-5/Q-7)', () => {
  it('shows a gold border + 3px gold focus ring on focus', () => {
    render(<WizardSelector {...baseProps} />);
    const control = screen.getByTestId('wizard-selector-control');
    fireEvent.focus(control);
    expect(control).toHaveStyle({ borderColor: T.GOLD });
    expect(control.style.outlineWidth).toBe('3px');
    expect(control.style.outlineStyle).toBe('solid');
  });

  it('uses a 120ms ease transition on the control', () => {
    render(<WizardSelector {...baseProps} />);
    expect(
      screen.getByTestId('wizard-selector-control').style.transition,
    ).toContain('120ms');
  });
});

describe('WizardSelector — disabled state (Q-2)', () => {
  it('muted text + subtle fill + not-allowed cursor, NO opacity', () => {
    render(<WizardSelector {...baseProps} disabled />);
    const control = screen.getByTestId('wizard-selector-control');
    expect(control).toBeDisabled();
    expect(control).toHaveStyle({ color: T.MUTED, cursor: 'not-allowed' });
    expect(control.style.opacity === '' || control.style.opacity === '1').toBe(true);
    expect(control.getAttribute('aria-disabled')).toBe('true');
  });
});

describe('WizardSelector — error state (Q-1 amended)', () => {
  it('renders the error message below the control at 11px / T.RED', () => {
    render(<WizardSelector {...baseProps} error="Required" />);
    const err = screen.getByTestId('wizard-selector-error');
    expect(err).toHaveTextContent('Required');
    expect(err).toHaveStyle({ fontSize: '11px', color: T.RED, marginTop: '4px' });
  });

  it('turns the control border red with a 3px ring', () => {
    render(<WizardSelector {...baseProps} error="Required" />);
    const control = screen.getByTestId('wizard-selector-control');
    expect(control).toHaveStyle({ borderColor: T.RED });
    expect(control.style.outlineWidth).toBe('3px');
  });

  it('wires aria-invalid + aria-describedby to the error id', () => {
    render(<WizardSelector {...baseProps} error="Required" />);
    const control = screen.getByTestId('wizard-selector-control');
    const err = screen.getByTestId('wizard-selector-error');
    expect(control.getAttribute('aria-invalid')).toBe('true');
    expect(control.getAttribute('aria-describedby') || '').toContain(
      err.getAttribute('id'),
    );
  });

  it('no error node and no aria-invalid when error is null', () => {
    render(<WizardSelector {...baseProps} error={null} />);
    expect(screen.queryByTestId('wizard-selector-error')).toBeNull();
    expect(
      screen.getByTestId('wizard-selector-control').getAttribute('aria-invalid'),
    ).toBeNull();
  });
});

describe('WizardSelector — tooltip (mirror WizardField)', () => {
  it('opens on mouse hover and closes on mouse leave (desktop)', () => {
    render(<WizardSelector {...baseProps} tooltip="Use IRS Pub 501." />);
    const icon = screen.getByTestId('wizard-selector-info');
    expect(screen.queryByRole('tooltip')).toBeNull();
    fireEvent.mouseEnter(icon);
    expect(screen.getByRole('tooltip')).toHaveTextContent('Use IRS Pub 501.');
    fireEvent.mouseLeave(icon);
    expect(screen.queryByRole('tooltip')).toBeNull();
  });

  it('navy 220px tooltip: 11px text, padding, T.SHADOW_TOOLTIP, 100ms fade', () => {
    render(<WizardSelector {...baseProps} tooltip="Tip text" />);
    fireEvent.mouseEnter(screen.getByTestId('wizard-selector-info'));
    const tip = screen.getByRole('tooltip');
    expect(tip).toHaveStyle({
      width: '220px',
      backgroundColor: T.NAVY,
      fontSize: '11px',
      padding: '7px 10px',
      boxShadow: T.SHADOW_TOOLTIP,
    });
    expect(tip.style.color === 'white' || tip.style.color === 'rgb(255, 255, 255)').toBe(true);
    expect(tip.style.transition).toContain('100ms');
  });

  it('mobile: tap toggles the tooltip and an outside tap dismisses it', () => {
    setWidth(600);
    render(<WizardSelector {...baseProps} tooltip="Mobile tip" />);
    const icon = screen.getByTestId('wizard-selector-info');
    fireEvent.click(icon);
    expect(screen.getByRole('tooltip')).toBeInTheDocument();
    fireEvent.mouseDown(document.body);
    expect(screen.queryByRole('tooltip')).toBeNull();
  });

  it('keyboard: Enter toggles, Escape dismisses', () => {
    render(<WizardSelector {...baseProps} tooltip="Kbd tip" />);
    const icon = screen.getByTestId('wizard-selector-info');
    fireEvent.keyDown(icon, { key: 'Enter' });
    expect(screen.getByRole('tooltip')).toBeInTheDocument();
    fireEvent.keyDown(icon, { key: 'Escape' });
    expect(screen.queryByRole('tooltip')).toBeNull();
  });

  it('links control aria-describedby to the tooltip id when tooltip present', () => {
    render(<WizardSelector {...baseProps} tooltip="Described" />);
    fireEvent.mouseEnter(screen.getByTestId('wizard-selector-info'));
    const control = screen.getByTestId('wizard-selector-control');
    const tip = screen.getByRole('tooltip');
    expect(control.getAttribute('aria-describedby') || '').toContain(
      tip.getAttribute('id'),
    );
  });
});

describe('WizardSelector — test id override', () => {
  it('respects a custom data-testid on the root', () => {
    render(<WizardSelector {...baseProps} data-testid="filing-selector" />);
    expect(screen.getByTestId('filing-selector')).toBeInTheDocument();
  });
});

describe('WizardSelector — source contract', () => {
  it("declares 'use client' at the top", () => {
    expect(SOURCE.startsWith("'use client';")).toBe(true);
  });

  it('documents the controlled API with JSDoc @param', () => {
    expect(SOURCE).toContain('@param');
    expect(SOURCE).toMatch(/@param.*\bfield\b/);
    expect(SOURCE).toMatch(/@param.*\bvalue\b/);
    expect(SOURCE).toMatch(/@param.*onChange/);
    expect(SOURCE).toMatch(/@param.*options/);
  });

  it('self-identifies as a foundation extension primitive in its docstring', () => {
    expect(SOURCE).toMatch(/foundation extension/i);
  });

  it('applies tokens inline — no CSS custom properties (Q-0b lock)', () => {
    expect(SOURCE).not.toMatch(/var\(--(?!font-)/);
  });
});
