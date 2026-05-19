/**
 * WizardRadio tests — the extension-primitive radio group (foundation
 * v1.1). Covers both visually distinct variants (stacked + segmented),
 * the controlled onChange(field, value) API, group-level error/disabled,
 * per-option marker visuals, hover/focus states, the stacked per-option
 * description (mandatory — helper-text carve-out) and optional info
 * tooltip, and WCAG AA wiring (fieldset/legend group semantics, native
 * radio inputs, aria-invalid/describedby).
 *
 * jsdom note: native radio-group arrow-key roving is a browser behavior
 * jsdom does not implement. We therefore assert the *structural enabler*
 * (all options are real <input type="radio"> sharing one name inside a
 * <fieldset>) rather than simulating roving — same honesty precedent as
 * WizardField.test.jsx documenting the jsdom outline/tab-order limits.
 * Outline is asserted via longhand (jsdom does not expand the shorthand).
 */

import { describe, it, expect, vi, afterEach } from 'vitest';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { render, screen, fireEvent } from '@testing-library/react';
import WizardRadio from '../WizardRadio.jsx';
import { T } from '@/src/lib/brand/tokens';

const SOURCE = readFileSync(
  path.resolve(process.cwd(), 'src/components/wizard/WizardRadio.jsx'),
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

const STACKED_OPTS = [
  {
    value: 'private_db',
    label: 'Defined Benefit (DB)',
    description: 'Pension where benefit is formula-driven.',
    tooltipContent: 'Common in public-sector and legacy private employers.',
  },
  {
    value: 'private_dc',
    label: 'Defined Contribution (DC)',
    description: 'Account-balance plan such as a 401(k) or 403(b).',
  },
];

const SEGMENTED_OPTS = [
  { value: 'participant', label: 'Participant' },
  { value: 'alternate', label: 'Alternate payee' },
];

const stackedBase = {
  field: 'planType',
  value: '',
  onChange: () => {},
  legend: 'What kind of retirement plan is this?',
  options: STACKED_OPTS,
};

const segmentedBase = {
  field: 'perspective',
  value: '',
  onChange: () => {},
  legend: 'Whose side are you modelling?',
  variant: 'segmented',
  options: SEGMENTED_OPTS,
};

describe('WizardRadio — group structure & a11y', () => {
  it('renders a <fieldset> wrapper with the chrome reset', () => {
    render(<WizardRadio {...stackedBase} />);
    const fs = screen.getByTestId('wizard-radio');
    expect(fs.tagName).toBe('FIELDSET');
    // jsdom does not serialize a bare `border: 0` shorthand through
    // getComputedStyle (same class of limitation as the `outline`
    // shorthand noted in WizardField.test.jsx) — assert the reset via
    // inline-style longhands instead.
    expect(fs.style.borderWidth).toBe('0px');
    expect(fs.style.padding).toBe('0px');
    expect(fs.style.margin).toBe('0px');
    expect(fs.style.minWidth).toBe('0px');
  });

  it('exposes an accessible radiogroup named by the legend', () => {
    render(<WizardRadio {...stackedBase} />);
    expect(
      screen.getByRole('radiogroup', {
        name: 'What kind of retirement plan is this?',
      }),
    ).toBeInTheDocument();
  });

  it('renders the legend visibly by default', () => {
    render(<WizardRadio {...stackedBase} />);
    const legend = screen.getByTestId('wizard-radio-legend');
    expect(legend.tagName).toBe('LEGEND');
    expect(legend).toHaveTextContent('What kind of retirement plan is this?');
    expect(legend.style.position).not.toBe('absolute');
  });

  it('sr-only-hides the legend when legendHidden is set (still accessible)', () => {
    render(<WizardRadio {...stackedBase} legendHidden />);
    const legend = screen.getByTestId('wizard-radio-legend');
    expect(legend).toHaveStyle({ position: 'absolute', width: '1px', height: '1px' });
    expect(
      screen.getByRole('radiogroup', {
        name: 'What kind of retirement plan is this?',
      }),
    ).toBeInTheDocument();
  });

  it('renders one native <input type="radio"> per option', () => {
    render(<WizardRadio {...stackedBase} />);
    const radios = screen.getAllByRole('radio');
    expect(radios).toHaveLength(2);
    radios.forEach((r) => expect(r.getAttribute('type')).toBe('radio'));
  });

  it('shares one name across all options (native arrow-roving enabler)', () => {
    render(<WizardRadio {...stackedBase} />);
    const radios = screen.getAllByRole('radio');
    const names = new Set(radios.map((r) => r.getAttribute('name')));
    expect(names.size).toBe(1);
    expect([...names][0]).toBeTruthy();
  });

  it('visually hides the native input but keeps it in the a11y tree', () => {
    render(<WizardRadio {...stackedBase} />);
    const radio = screen.getByTestId('wizard-radio-input-private_db');
    expect(radio).toHaveStyle({ position: 'absolute', opacity: '0' });
    expect(radio.style.appearance).toBe('none');
  });
});

describe('WizardRadio — controlled API (Q-4)', () => {
  it('marks the option matching value as checked', () => {
    render(<WizardRadio {...stackedBase} value="private_dc" />);
    expect(screen.getByTestId('wizard-radio-input-private_dc').checked).toBe(true);
    expect(screen.getByTestId('wizard-radio-input-private_db').checked).toBe(false);
  });

  it('checks nothing when value is empty', () => {
    render(<WizardRadio {...stackedBase} value="" />);
    screen.getAllByRole('radio').forEach((r) => expect(r.checked).toBe(false));
  });

  it('calls onChange(field, value) when an input is clicked', () => {
    const onChange = vi.fn();
    render(<WizardRadio {...stackedBase} onChange={onChange} />);
    fireEvent.click(screen.getByTestId('wizard-radio-input-private_dc'));
    expect(onChange).toHaveBeenCalledWith('planType', 'private_dc');
  });

  it('calls onChange(field, value) when the option label/row is clicked', () => {
    const onChange = vi.fn();
    render(<WizardRadio {...stackedBase} onChange={onChange} />);
    fireEvent.click(screen.getByTestId('wizard-radio-option-private_db'));
    expect(onChange).toHaveBeenCalledWith('planType', 'private_db');
  });
});

describe('WizardRadio — stacked variant', () => {
  it('renders a visible label and the mandatory description per option', () => {
    render(<WizardRadio {...stackedBase} />);
    expect(screen.getByText('Defined Benefit (DB)')).toBeInTheDocument();
    const desc = screen.getByTestId('wizard-radio-desc-private_db');
    expect(desc).toHaveTextContent('Pension where benefit is formula-driven.');
    expect(desc).toHaveStyle({ fontSize: '13px', color: T.MUTED });
  });

  it('gives each option a >=44px hit area (WCAG AA touch target)', () => {
    render(<WizardRadio {...stackedBase} />);
    expect(screen.getByTestId('wizard-radio-option-private_db')).toHaveStyle({
      minHeight: '44px',
    });
  });

  it('selected option: 2px navy outer ring + gold inner dot', () => {
    render(<WizardRadio {...stackedBase} value="private_db" />);
    const marker = screen.getByTestId('wizard-radio-marker-private_db');
    expect(marker).toHaveStyle({
      width: '18px',
      height: '18px',
      border: `2px solid ${T.NAVY}`,
      borderRadius: '50%',
    });
    const dot = screen.getByTestId('wizard-radio-dot-private_db');
    expect(dot).toHaveStyle({
      width: '8px',
      height: '8px',
      backgroundColor: T.GOLD,
      borderRadius: '50%',
    });
  });

  it('unselected option: line-strong ring, no inner dot', () => {
    render(<WizardRadio {...stackedBase} value="private_db" />);
    expect(screen.getByTestId('wizard-radio-marker-private_dc')).toHaveStyle({
      border: `2px solid ${T.LINE_STRONG}`,
    });
    expect(screen.queryByTestId('wizard-radio-dot-private_dc')).toBeNull();
  });

  it('applies T.GOLD_TINT_SUBTLE hover bg to an unselected option row', () => {
    render(<WizardRadio {...stackedBase} value="private_db" />);
    const row = screen.getByTestId('wizard-radio-option-private_dc');
    fireEvent.mouseEnter(row);
    expect(row).toHaveStyle({ backgroundColor: T.GOLD_TINT_SUBTLE });
    fireEvent.mouseLeave(row);
    expect(row.style.backgroundColor).not.toBe('rgba(200, 169, 110, 0.04)');
  });

  it('renders an optional info tooltip that opens on hover and closes on leave', () => {
    render(<WizardRadio {...stackedBase} />);
    const icon = screen.getByTestId('wizard-radio-info-private_db');
    expect(screen.queryByRole('tooltip')).toBeNull();
    fireEvent.mouseEnter(icon);
    expect(screen.getByRole('tooltip')).toHaveTextContent(
      'Common in public-sector and legacy private employers.',
    );
    fireEvent.mouseLeave(icon);
    expect(screen.queryByRole('tooltip')).toBeNull();
  });

  it('tooltip: mobile tap toggles, outside tap and Escape dismiss', () => {
    setWidth(600);
    render(<WizardRadio {...stackedBase} />);
    const icon = screen.getByTestId('wizard-radio-info-private_db');
    fireEvent.click(icon);
    expect(screen.getByRole('tooltip')).toBeInTheDocument();
    fireEvent.mouseDown(document.body);
    expect(screen.queryByRole('tooltip')).toBeNull();
    fireEvent.click(icon);
    expect(screen.getByRole('tooltip')).toBeInTheDocument();
    fireEvent.keyDown(icon, { key: 'Escape' });
    expect(screen.queryByRole('tooltip')).toBeNull();
  });

  it('does not render an info icon for an option without tooltipContent', () => {
    render(<WizardRadio {...stackedBase} />);
    expect(screen.queryByTestId('wizard-radio-info-private_dc')).toBeNull();
  });

  it('warns (dev) when a stacked option is missing its description', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    render(
      <WizardRadio
        {...stackedBase}
        options={[{ value: 'x', label: 'No description option' }]}
      />,
    );
    expect(warn).toHaveBeenCalled();
    expect(screen.getByText('No description option')).toBeInTheDocument();
  });
});

describe('WizardRadio — segmented variant', () => {
  it('renders a pill container (rounded, parchment bg, line-strong border)', () => {
    render(<WizardRadio {...segmentedBase} />);
    const group = screen.getByTestId('wizard-radio-segmented');
    expect(group).toHaveStyle({
      borderRadius: '9999px',
      backgroundColor: T.PARCHMENT,
      border: `1px solid ${T.LINE_STRONG}`,
    });
  });

  it('selected cell: navy fill + parchment text', () => {
    render(<WizardRadio {...segmentedBase} value="participant" />);
    expect(screen.getByTestId('wizard-radio-option-participant')).toHaveStyle({
      backgroundColor: T.NAVY,
      color: T.PARCHMENT,
    });
  });

  it('unselected cell: transparent bg + ink text', () => {
    render(<WizardRadio {...segmentedBase} value="participant" />);
    const cell = screen.getByTestId('wizard-radio-option-alternate');
    // jsdom getComputedStyle normalizes the `transparent` keyword to
    // rgba(0,0,0,0); assert the keyword via the inline style instead.
    expect(cell.style.backgroundColor).toBe('transparent');
    expect(cell).toHaveStyle({ color: T.INK });
  });

  it('never renders description or tooltip even if provided in options', () => {
    render(
      <WizardRadio
        {...segmentedBase}
        options={[
          {
            value: 'participant',
            label: 'Participant',
            description: 'should not show',
            tooltipContent: 'should not show',
          },
          { value: 'alternate', label: 'Alternate payee' },
        ]}
      />,
    );
    expect(screen.queryByTestId('wizard-radio-desc-participant')).toBeNull();
    expect(screen.queryByTestId('wizard-radio-info-participant')).toBeNull();
    expect(screen.queryByText('should not show')).toBeNull();
  });

  it('keeps the >=44px hit area on each segmented cell', () => {
    render(<WizardRadio {...segmentedBase} />);
    expect(screen.getByTestId('wizard-radio-option-participant')).toHaveStyle({
      minHeight: '44px',
    });
  });

  it('is controlled: clicking a cell input fires onChange(field, value)', () => {
    const onChange = vi.fn();
    render(<WizardRadio {...segmentedBase} onChange={onChange} />);
    fireEvent.click(screen.getByTestId('wizard-radio-input-alternate'));
    expect(onChange).toHaveBeenCalledWith('perspective', 'alternate');
  });
});

describe('WizardRadio — error state (Q-1, group-level)', () => {
  it('puts a red border on the fieldset and a message below it', () => {
    render(<WizardRadio {...stackedBase} error="Pick one to continue." />);
    expect(screen.getByTestId('wizard-radio')).toHaveStyle({
      border: `1px solid ${T.RED}`,
    });
    const err = screen.getByTestId('wizard-radio-error');
    expect(err).toHaveTextContent('Pick one to continue.');
    expect(err).toHaveStyle({ fontSize: '11px', color: T.RED, marginTop: '4px' });
  });

  it('wires group-level aria-invalid + aria-describedby to the error id (W11)', () => {
    render(<WizardRadio {...stackedBase} error="Required" />);
    const group = screen.getByTestId('wizard-radio');
    const err = screen.getByTestId('wizard-radio-error');
    expect(group.getAttribute('aria-invalid')).toBe('true');
    expect(group.getAttribute('aria-describedby') || '').toContain(
      err.getAttribute('id'),
    );
    // error is group-level, never per-option (spec W11)
    expect(
      screen.getByTestId('wizard-radio-input-private_db').getAttribute('aria-invalid'),
    ).toBeNull();
  });

  it('no error node and no group aria-invalid when error is null', () => {
    render(<WizardRadio {...stackedBase} error={null} />);
    expect(screen.queryByTestId('wizard-radio-error')).toBeNull();
    expect(
      screen.getByTestId('wizard-radio').getAttribute('aria-invalid'),
    ).toBeNull();
  });
});

describe('WizardRadio — disabled state (Q-2, no opacity)', () => {
  it('disables every input, muted text + grey fill, not-allowed, no opacity', () => {
    render(<WizardRadio {...stackedBase} disabled />);
    screen.getAllByRole('radio').forEach((r) => expect(r).toBeDisabled());
    const row = screen.getByTestId('wizard-radio-option-private_db');
    expect(row).toHaveStyle({ color: T.MUTED, cursor: 'not-allowed' });
    expect(row.style.opacity === '' || row.style.opacity === '1').toBe(true);
  });
});

describe('WizardRadio — focus state (Q-7)', () => {
  it('stacked: 3px gold focus ring on the focused marker, 120ms ease', () => {
    render(<WizardRadio {...stackedBase} />);
    const radio = screen.getByTestId('wizard-radio-input-private_db');
    fireEvent.focus(radio);
    const marker = screen.getByTestId('wizard-radio-marker-private_db');
    expect(marker.style.outlineWidth).toBe('3px');
    expect(marker.style.outlineStyle).toBe('solid');
    expect(marker.style.outlineColor).toBe('rgba(200, 169, 110, 0.2)');
    expect(marker.style.transition).toContain('120ms');
  });

  it('segmented: 3px gold focus ring on the focused pill cell', () => {
    render(<WizardRadio {...segmentedBase} />);
    const radio = screen.getByTestId('wizard-radio-input-participant');
    fireEvent.focus(radio);
    const cell = screen.getByTestId('wizard-radio-option-participant');
    expect(cell.style.outlineWidth).toBe('3px');
    expect(cell.style.outlineStyle).toBe('solid');
  });
});

describe('WizardRadio — source contract', () => {
  it("declares 'use client' at the top", () => {
    expect(SOURCE.startsWith("'use client';")).toBe(true);
  });

  it('documents the controlled API with JSDoc @param', () => {
    expect(SOURCE).toContain('@param');
    expect(SOURCE).toMatch(/@param.*\bfield\b/);
    expect(SOURCE).toMatch(/@param.*\bvalue\b/);
    expect(SOURCE).toMatch(/@param.*onChange/);
    expect(SOURCE).toMatch(/@param.*variant/);
    expect(SOURCE).toMatch(/@param.*options/);
  });

  it('applies tokens inline — no CSS custom properties (Q-0b lock)', () => {
    expect(SOURCE).not.toMatch(/var\(--/);
  });
});
