/**
 * WizardCheckbox tests — the boolean primitive (foundation extension v1.2).
 * Covers two visually distinct variants ('checkbox' + 'toggle'), the
 * controlled onChange(field, value) API with a boolean payload, the
 * documented label-beside-control anatomy deviation, the info-icon
 * tooltip + provenance badge mirrored from WizardField, focus / disabled /
 * error visual states, and WCAG AA wiring (label association, aria-invalid,
 * aria-describedby).
 *
 * Single boolean only — there is no checkbox-group support; the `value`
 * prop is always a boolean, never an array.
 *
 * jsdom note: outline is asserted via longhand (jsdom does not expand the
 * shorthand) — same honesty precedent as WizardField.test.jsx.
 */

import { describe, it, expect, vi, afterEach } from 'vitest';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { render, screen, fireEvent } from '@testing-library/react';
import WizardCheckbox from '../WizardCheckbox.jsx';
import { T } from '@/src/lib/brand/tokens';

const SOURCE = readFileSync(
  path.resolve(process.cwd(), 'src/components/wizard/WizardCheckbox.jsx'),
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

const baseProps = {
  label: 'I have a QDRO already drafted',
  field: 'hasDraft',
  value: false,
  onChange: () => {},
};

describe('WizardCheckbox — anatomy (documented deviation)', () => {
  it('renders the control and the label in a single inline row', () => {
    render(<WizardCheckbox {...baseProps} />);
    const root = screen.getByTestId('wizard-checkbox');
    // The wrapper row holding the control + label is flex with the input
    // before the label visually (Q-X1 anatomy deviation vs WizardField).
    const row = screen.getByTestId('wizard-checkbox-row');
    expect(row.style.display).toBe('flex');
    expect(row.style.alignItems).toBe('center');
    // Sanity: the label and the visual marker both live inside the row.
    expect(row.contains(screen.getByText('I have a QDRO already drafted'))).toBe(
      true,
    );
    expect(root.contains(row)).toBe(true);
  });

  it('renders the label text to the right of the marker (control first in DOM order)', () => {
    render(<WizardCheckbox {...baseProps} />);
    const row = screen.getByTestId('wizard-checkbox-row');
    const marker = screen.getByTestId('wizard-checkbox-marker');
    const label = screen.getByText('I have a QDRO already drafted');
    // DOM order in the row: marker first, label after.
    const kids = Array.from(row.children);
    expect(kids.indexOf(marker.parentElement) < kids.indexOf(label.parentElement))
      .toBe(true);
  });

  it('associates the <label> with the native input via htmlFor/id', () => {
    render(<WizardCheckbox {...baseProps} />);
    const input = screen.getByTestId('wizard-checkbox-input');
    const label = screen.getByText('I have a QDRO already drafted');
    expect(label.getAttribute('for')).toBe(input.getAttribute('id'));
    expect(input.getAttribute('id')).toBeTruthy();
  });
});

describe('WizardCheckbox — native control', () => {
  it('renders a native <input type="checkbox">', () => {
    render(<WizardCheckbox {...baseProps} />);
    const input = screen.getByTestId('wizard-checkbox-input');
    expect(input.tagName).toBe('INPUT');
    expect(input.getAttribute('type')).toBe('checkbox');
  });

  it('visually hides the native input but keeps it in the a11y tree', () => {
    render(<WizardCheckbox {...baseProps} />);
    const input = screen.getByTestId('wizard-checkbox-input');
    expect(input).toHaveStyle({ position: 'absolute', opacity: '0' });
  });
});

describe('WizardCheckbox — controlled API (Q-4)', () => {
  it('renders the value=true as a checked input', () => {
    render(<WizardCheckbox {...baseProps} value={true} />);
    expect(screen.getByTestId('wizard-checkbox-input').checked).toBe(true);
  });

  it('renders the value=false as an unchecked input', () => {
    render(<WizardCheckbox {...baseProps} value={false} />);
    expect(screen.getByTestId('wizard-checkbox-input').checked).toBe(false);
  });

  it('treats undefined value as false (defensive default)', () => {
    render(<WizardCheckbox {...baseProps} value={undefined} />);
    expect(screen.getByTestId('wizard-checkbox-input').checked).toBe(false);
  });

  it('calls onChange(field, true) when toggled on', () => {
    const onChange = vi.fn();
    render(<WizardCheckbox {...baseProps} value={false} onChange={onChange} />);
    fireEvent.click(screen.getByTestId('wizard-checkbox-input'));
    expect(onChange).toHaveBeenCalledWith('hasDraft', true);
  });

  it('calls onChange(field, false) when toggled off', () => {
    const onChange = vi.fn();
    render(<WizardCheckbox {...baseProps} value={true} onChange={onChange} />);
    fireEvent.click(screen.getByTestId('wizard-checkbox-input'));
    expect(onChange).toHaveBeenCalledWith('hasDraft', false);
  });
});

describe('WizardCheckbox — variant: checkbox (default)', () => {
  it('defaults to the checkbox variant when no variant prop is passed', () => {
    render(<WizardCheckbox {...baseProps} />);
    expect(screen.getByTestId('wizard-checkbox-marker')).toBeInTheDocument();
    expect(screen.queryByTestId('wizard-checkbox-track')).toBeNull();
  });

  it('renders a square (non-pill) marker with line-strong border when unchecked', () => {
    render(<WizardCheckbox {...baseProps} value={false} />);
    const marker = screen.getByTestId('wizard-checkbox-marker');
    expect(marker).toHaveStyle({
      width: '18px',
      height: '18px',
      border: `2px solid ${T.LINE_STRONG}`,
    });
    // Not a pill — radius is small (square-ish), not 50% / 9999px.
    expect(marker.style.borderRadius).toBe('4px');
  });

  it('renders a checkmark glyph and a navy border when checked', () => {
    render(<WizardCheckbox {...baseProps} value={true} />);
    const marker = screen.getByTestId('wizard-checkbox-marker');
    expect(marker).toHaveStyle({ border: `2px solid ${T.NAVY}` });
    expect(screen.getByTestId('wizard-checkbox-check')).toBeInTheDocument();
  });

  it('hides the checkmark glyph when unchecked', () => {
    render(<WizardCheckbox {...baseProps} value={false} />);
    expect(screen.queryByTestId('wizard-checkbox-check')).toBeNull();
  });
});

describe('WizardCheckbox — variant: toggle', () => {
  it('renders a track + thumb when variant="toggle"', () => {
    render(<WizardCheckbox {...baseProps} variant="toggle" />);
    expect(screen.getByTestId('wizard-checkbox-track')).toBeInTheDocument();
    expect(screen.getByTestId('wizard-checkbox-thumb')).toBeInTheDocument();
    // No square marker in the toggle variant.
    expect(screen.queryByTestId('wizard-checkbox-marker')).toBeNull();
  });

  it('track uses T.GOLD background when checked', () => {
    render(
      <WizardCheckbox {...baseProps} variant="toggle" value={true} />,
    );
    expect(screen.getByTestId('wizard-checkbox-track')).toHaveStyle({
      backgroundColor: T.GOLD,
    });
  });

  it('track uses T.LINE_STRONG background when unchecked', () => {
    render(
      <WizardCheckbox {...baseProps} variant="toggle" value={false} />,
    );
    expect(screen.getByTestId('wizard-checkbox-track')).toHaveStyle({
      backgroundColor: T.LINE_STRONG,
    });
  });

  it('thumb is a white pill that lives inside the track', () => {
    render(<WizardCheckbox {...baseProps} variant="toggle" />);
    const track = screen.getByTestId('wizard-checkbox-track');
    const thumb = screen.getByTestId('wizard-checkbox-thumb');
    expect(thumb).toHaveStyle({ backgroundColor: T.CARD, borderRadius: '50%' });
    expect(track.contains(thumb)).toBe(true);
  });
});

describe('WizardCheckbox — label-row extras', () => {
  it('hides the info icon when no tooltip is provided', () => {
    render(<WizardCheckbox {...baseProps} />);
    expect(screen.queryByTestId('wizard-checkbox-info')).toBeNull();
  });

  it('shows the info icon (14px circle, T.LINE bg, T.INK_2 glyph) when tooltip set', () => {
    render(
      <WizardCheckbox {...baseProps} tooltip="A drafted QDRO speeds review." />,
    );
    const icon = screen.getByTestId('wizard-checkbox-info');
    expect(icon).toHaveStyle({
      width: '14px',
      height: '14px',
      borderRadius: '50%',
      backgroundColor: T.LINE,
      color: T.INK_2,
    });
  });

  it('renders a "From M4" provenance badge when prefilledFrom is set', () => {
    render(<WizardCheckbox {...baseProps} prefilledFrom="M4" />);
    const badge = screen.getByTestId('wizard-checkbox-badge');
    expect(badge).toHaveTextContent('From M4');
    expect(badge).toHaveStyle({
      fontSize: '10px',
      fontWeight: 700,
      textTransform: 'uppercase',
      backgroundColor: T.PARCHMENT_DEEP,
      color: T.PILL_TEXT,
    });
  });
});

describe('WizardCheckbox — focus state (Q-7)', () => {
  it('checkbox variant: 3px gold focus ring on the marker', () => {
    render(<WizardCheckbox {...baseProps} />);
    const input = screen.getByTestId('wizard-checkbox-input');
    fireEvent.focus(input);
    const marker = screen.getByTestId('wizard-checkbox-marker');
    expect(marker.style.outlineWidth).toBe('3px');
    expect(marker.style.outlineStyle).toBe('solid');
    expect(marker.style.outlineColor).toBe('rgba(200, 169, 110, 0.2)');
  });

  it('toggle variant: 3px gold focus ring on the track', () => {
    render(<WizardCheckbox {...baseProps} variant="toggle" />);
    const input = screen.getByTestId('wizard-checkbox-input');
    fireEvent.focus(input);
    const track = screen.getByTestId('wizard-checkbox-track');
    expect(track.style.outlineWidth).toBe('3px');
    expect(track.style.outlineStyle).toBe('solid');
  });
});

describe('WizardCheckbox — disabled state (Q-2, no opacity)', () => {
  it('disables the input, applies muted text + not-allowed cursor, no opacity', () => {
    render(<WizardCheckbox {...baseProps} disabled />);
    const input = screen.getByTestId('wizard-checkbox-input');
    expect(input).toBeDisabled();
    const row = screen.getByTestId('wizard-checkbox-row');
    expect(row).toHaveStyle({ cursor: 'not-allowed', color: T.MUTED });
    expect(row.style.opacity === '' || row.style.opacity === '1').toBe(true);
    expect(input.getAttribute('aria-disabled')).toBe('true');
  });
});

describe('WizardCheckbox — error state (Q-1 amended)', () => {
  it('renders the error message below the row at 11px / T.RED', () => {
    render(<WizardCheckbox {...baseProps} error="Required" />);
    const err = screen.getByTestId('wizard-checkbox-error');
    expect(err).toHaveTextContent('Required');
    expect(err).toHaveStyle({ fontSize: '11px', color: T.RED, marginTop: '4px' });
  });

  it('turns the checkbox marker border red', () => {
    render(<WizardCheckbox {...baseProps} error="Required" />);
    expect(screen.getByTestId('wizard-checkbox-marker')).toHaveStyle({
      border: `2px solid ${T.RED}`,
    });
  });

  it('turns the toggle track border red', () => {
    render(<WizardCheckbox {...baseProps} variant="toggle" error="Required" />);
    const track = screen.getByTestId('wizard-checkbox-track');
    expect(track.style.borderColor).toBe('rgb(168, 53, 30)');
  });

  it('wires aria-invalid + aria-describedby to the error id', () => {
    render(<WizardCheckbox {...baseProps} error="Required" />);
    const input = screen.getByTestId('wizard-checkbox-input');
    const err = screen.getByTestId('wizard-checkbox-error');
    expect(input.getAttribute('aria-invalid')).toBe('true');
    expect(input.getAttribute('aria-describedby') || '').toContain(
      err.getAttribute('id'),
    );
  });

  it('no error node and no aria-invalid when error is null', () => {
    render(<WizardCheckbox {...baseProps} error={null} />);
    expect(screen.queryByTestId('wizard-checkbox-error')).toBeNull();
    expect(
      screen.getByTestId('wizard-checkbox-input').getAttribute('aria-invalid'),
    ).toBeNull();
  });
});

describe('WizardCheckbox — tooltip (mirror WizardField)', () => {
  it('opens on mouse hover and closes on mouse leave (desktop)', () => {
    render(<WizardCheckbox {...baseProps} tooltip="Helps the lawyer review." />);
    const icon = screen.getByTestId('wizard-checkbox-info');
    expect(screen.queryByRole('tooltip')).toBeNull();
    fireEvent.mouseEnter(icon);
    expect(screen.getByRole('tooltip')).toHaveTextContent(
      'Helps the lawyer review.',
    );
    fireEvent.mouseLeave(icon);
    expect(screen.queryByRole('tooltip')).toBeNull();
  });

  it('mobile: tap toggles the tooltip and an outside tap dismisses it', () => {
    setWidth(600);
    render(<WizardCheckbox {...baseProps} tooltip="Mobile tip" />);
    const icon = screen.getByTestId('wizard-checkbox-info');
    fireEvent.click(icon);
    expect(screen.getByRole('tooltip')).toBeInTheDocument();
    fireEvent.mouseDown(document.body);
    expect(screen.queryByRole('tooltip')).toBeNull();
  });

  it('keyboard: Enter toggles, Escape dismisses', () => {
    render(<WizardCheckbox {...baseProps} tooltip="Kbd tip" />);
    const icon = screen.getByTestId('wizard-checkbox-info');
    fireEvent.keyDown(icon, { key: 'Enter' });
    expect(screen.getByRole('tooltip')).toBeInTheDocument();
    fireEvent.keyDown(icon, { key: 'Escape' });
    expect(screen.queryByRole('tooltip')).toBeNull();
  });
});

describe('WizardCheckbox — test id override', () => {
  it('respects a custom data-testid on the root', () => {
    render(<WizardCheckbox {...baseProps} data-testid="qdro-checkbox" />);
    expect(screen.getByTestId('qdro-checkbox')).toBeInTheDocument();
  });
});

describe('WizardCheckbox — source contract', () => {
  it("declares 'use client' at the top", () => {
    expect(SOURCE.startsWith("'use client';")).toBe(true);
  });

  it('documents the controlled API with JSDoc @param', () => {
    expect(SOURCE).toContain('@param');
    expect(SOURCE).toMatch(/@param.*\bfield\b/);
    expect(SOURCE).toMatch(/@param.*\bvalue\b/);
    expect(SOURCE).toMatch(/@param.*onChange/);
    expect(SOURCE).toMatch(/@param.*variant/);
  });

  it('self-identifies as a foundation extension primitive in its docstring', () => {
    expect(SOURCE).toMatch(/foundation extension/i);
  });

  it('documents the label-beside anatomy deviation in its docstring', () => {
    // The component intentionally diverges from WizardField's label-above
    // layout; that has to be called out so future readers do not "fix" it.
    expect(SOURCE).toMatch(/(label[- ]beside|deviat)/i);
  });

  it('applies tokens inline — no CSS custom properties (Q-0b lock)', () => {
    expect(SOURCE).not.toMatch(/var\(--(?!font-)/);
  });
});
