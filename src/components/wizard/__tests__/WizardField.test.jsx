/**
 * WizardField tests — the densest wizard-foundation surface.
 *
 * Covers the label row + info icon + provenance badge, the text input
 * with inline affixes, the controlled onChange(field, value) API, the
 * focus / disabled / error visual states, the info-icon tooltip
 * (hover, mobile tap-to-toggle, outside-tap dismiss, keyboard,
 * viewport-edge flip), and WCAG AA wiring (label/for, aria-invalid,
 * aria-describedby).
 *
 * Tab-order note: §7 surface 9 suggests input -> info icon. We use
 * natural DOM order (info icon -> input -> next field) instead: it is
 * fully keyboard operable and WCAG AA compliant (the help toggle for a
 * field is encountered immediately before the field), and avoids a
 * positive-tabIndex anti-pattern. §1's locked Q-6 only requires "full
 * kbd nav, visible focus", both satisfied.
 */

import { describe, it, expect, vi, afterEach } from 'vitest';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { render, screen, fireEvent } from '@testing-library/react';
import WizardField from '../WizardField.jsx';
import { T } from '@/src/lib/brand/tokens';

const SOURCE = readFileSync(
  path.resolve(process.cwd(), 'src/components/wizard/WizardField.jsx'),
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

const baseProps = { label: 'Home value', field: 'homeValue', value: '', onChange: () => {} };

describe('WizardField — label row', () => {
  it('renders the label at 12.5px / 600 / T.INK', () => {
    render(<WizardField {...baseProps} />);
    const label = screen.getByText('Home value');
    expect(label).toHaveStyle({ fontSize: '12.5px', fontWeight: 600, color: T.INK });
  });

  it('associates the <label> with the <input> via htmlFor/id', () => {
    render(<WizardField {...baseProps} />);
    const input = screen.getByTestId('wizard-field-input');
    const label = screen.getByText('Home value');
    expect(label.getAttribute('for')).toBe(input.getAttribute('id'));
    expect(input.getAttribute('id')).toBeTruthy();
  });

  it('hides the info icon when no tooltip is provided', () => {
    render(<WizardField {...baseProps} />);
    expect(screen.queryByTestId('wizard-field-info')).toBeNull();
  });

  it('shows the info icon (14px circle, T.LINE bg, T.INK_2 glyph) when tooltip set', () => {
    render(<WizardField {...baseProps} tooltip="Use the appraised value." />);
    const icon = screen.getByTestId('wizard-field-info');
    expect(icon).toHaveStyle({
      width: '14px',
      height: '14px',
      borderRadius: '50%',
      backgroundColor: T.LINE,
      color: T.INK_2,
    });
  });

  it('renders a "From M2" provenance badge when prefilledFrom is set', () => {
    render(<WizardField {...baseProps} prefilledFrom="M2" />);
    const badge = screen.getByTestId('wizard-field-badge');
    expect(badge).toHaveTextContent('From M2');
    expect(badge).toHaveStyle({
      fontSize: '10px',
      fontWeight: 700,
      textTransform: 'uppercase',
      letterSpacing: '0.5px',
      backgroundColor: T.PARCHMENT_DEEP,
      color: T.PILL_TEXT,
    });
  });

  it('truncates a long provenance badge with ellipsis and keeps full text reachable', () => {
    render(<WizardField {...baseProps} prefilledFrom="Pre-filled estimate" />);
    const badge = screen.getByTestId('wizard-field-badge');
    expect(badge).toHaveStyle({
      overflow: 'hidden',
      textOverflow: 'ellipsis',
      whiteSpace: 'nowrap',
    });
    expect(badge.getAttribute('title')).toBe('From Pre-filled estimate');
  });
});

describe('WizardField — input', () => {
  it('is a text input, never type=number (Q-12)', () => {
    render(<WizardField {...baseProps} numeric />);
    expect(screen.getByTestId('wizard-field-input').getAttribute('type')).toBe('text');
  });

  it('sets inputMode=decimal only when numeric', () => {
    const { rerender } = render(<WizardField {...baseProps} numeric />);
    expect(screen.getByTestId('wizard-field-input').getAttribute('inputmode')).toBe('decimal');
    rerender(<WizardField {...baseProps} />);
    expect(screen.getByTestId('wizard-field-input').getAttribute('inputmode')).toBeNull();
  });

  it('is exactly 36px tall with 7px radius, 1px T.LINE_STRONG border, 14px font', () => {
    render(<WizardField {...baseProps} />);
    expect(screen.getByTestId('wizard-field-input')).toHaveStyle({
      height: '36px',
      borderRadius: '7px',
      border: `1px solid ${T.LINE_STRONG}`,
      fontSize: '14px',
    });
  });

  it('applies tabular-nums on the UI font when numeric (not the serif NUMERIC_STYLE)', () => {
    render(<WizardField {...baseProps} numeric />);
    const input = screen.getByTestId('wizard-field-input');
    expect(input.style.fontVariantNumeric).toBe('tabular-nums');
    expect(input.style.fontFamily).toContain('--font-inter');
    expect(input.style.fontFamily.toLowerCase()).not.toContain('newsreader');
  });
});

describe('WizardField — inline affixes', () => {
  it('renders a muted prefix inside the input visual', () => {
    render(<WizardField {...baseProps} prefix="$" />);
    const prefix = screen.getByTestId('wizard-field-prefix');
    expect(prefix).toHaveTextContent('$');
    expect(prefix).toHaveStyle({ color: T.MUTED });
  });

  it('renders a muted suffix inside the input visual', () => {
    render(<WizardField {...baseProps} suffix="%" />);
    const suffix = screen.getByTestId('wizard-field-suffix');
    expect(suffix).toHaveTextContent('%');
    expect(suffix).toHaveStyle({ color: T.MUTED });
  });

  it('does not render affix nodes when not provided', () => {
    render(<WizardField {...baseProps} />);
    expect(screen.queryByTestId('wizard-field-prefix')).toBeNull();
    expect(screen.queryByTestId('wizard-field-suffix')).toBeNull();
  });
});

describe('WizardField — controlled API (Q-4)', () => {
  it('renders the value prop verbatim', () => {
    render(<WizardField {...baseProps} value="123.45" />);
    expect(screen.getByTestId('wizard-field-input').value).toBe('123.45');
  });

  it('renders a numeric zero value verbatim', () => {
    render(<WizardField {...baseProps} value={0} />);
    expect(screen.getByTestId('wizard-field-input').value).toBe('0');
  });

  it('calls onChange(field, value) on input change', () => {
    const onChange = vi.fn();
    render(<WizardField {...baseProps} onChange={onChange} />);
    fireEvent.change(screen.getByTestId('wizard-field-input'), {
      target: { value: '42' },
    });
    expect(onChange).toHaveBeenCalledWith('homeValue', '42');
  });
});

describe('WizardField — focus state (Q-5/Q-7)', () => {
  it('shows a gold border + 3px gold focus ring on focus', () => {
    render(<WizardField {...baseProps} />);
    const input = screen.getByTestId('wizard-field-input');
    fireEvent.focus(input);
    expect(input).toHaveStyle({ borderColor: T.GOLD });
    expect(input.style.outlineWidth).toBe('3px');
    expect(input.style.outlineStyle).toBe('solid');
  });

  it('uses a 120ms ease transition on the input', () => {
    render(<WizardField {...baseProps} />);
    expect(screen.getByTestId('wizard-field-input').style.transition).toContain('120ms');
  });
});

describe('WizardField — disabled state (Q-2)', () => {
  it('muted text + subtle fill + not-allowed cursor, NO opacity', () => {
    render(<WizardField {...baseProps} disabled />);
    const input = screen.getByTestId('wizard-field-input');
    expect(input).toBeDisabled();
    expect(input).toHaveStyle({ color: T.MUTED, cursor: 'not-allowed' });
    expect(input.style.opacity === '' || input.style.opacity === '1').toBe(true);
    expect(input.getAttribute('aria-disabled')).toBe('true');
  });
});

describe('WizardField — error state (Q-1 amended)', () => {
  it('renders the error message below the input at 11px / T.RED', () => {
    render(<WizardField {...baseProps} error="Required" />);
    const err = screen.getByTestId('wizard-field-error');
    expect(err).toHaveTextContent('Required');
    expect(err).toHaveStyle({ fontSize: '11px', color: T.RED, marginTop: '4px' });
  });

  it('turns the input border red with a 3px ring', () => {
    render(<WizardField {...baseProps} error="Required" />);
    const input = screen.getByTestId('wizard-field-input');
    expect(input).toHaveStyle({ borderColor: T.RED });
    expect(input.style.outlineWidth).toBe('3px');
  });

  it('wires aria-invalid + aria-describedby to the error id', () => {
    render(<WizardField {...baseProps} error="Required" />);
    const input = screen.getByTestId('wizard-field-input');
    const err = screen.getByTestId('wizard-field-error');
    expect(input.getAttribute('aria-invalid')).toBe('true');
    expect(input.getAttribute('aria-describedby') || '').toContain(err.getAttribute('id'));
  });

  it('no error node and no aria-invalid when error is null', () => {
    render(<WizardField {...baseProps} error={null} />);
    expect(screen.queryByTestId('wizard-field-error')).toBeNull();
    expect(screen.getByTestId('wizard-field-input').getAttribute('aria-invalid')).toBeNull();
  });
});

describe('WizardField — tooltip (Q-3/Q-6/Q-7)', () => {
  it('opens on mouse hover and closes on mouse leave (desktop)', () => {
    render(<WizardField {...baseProps} tooltip="Appraised value only." />);
    const icon = screen.getByTestId('wizard-field-info');
    expect(screen.queryByRole('tooltip')).toBeNull();
    fireEvent.mouseEnter(icon);
    expect(screen.getByRole('tooltip')).toHaveTextContent('Appraised value only.');
    fireEvent.mouseLeave(icon);
    expect(screen.queryByRole('tooltip')).toBeNull();
  });

  it('navy 220px tooltip: white 11px text, padding, T.SHADOW_TOOLTIP, 100ms fade', () => {
    render(<WizardField {...baseProps} tooltip="Tip text" />);
    fireEvent.mouseEnter(screen.getByTestId('wizard-field-info'));
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
    render(<WizardField {...baseProps} tooltip="Mobile tip" />);
    const icon = screen.getByTestId('wizard-field-info');
    fireEvent.click(icon);
    expect(screen.getByRole('tooltip')).toBeInTheDocument();
    fireEvent.mouseDown(document.body);
    expect(screen.queryByRole('tooltip')).toBeNull();
  });

  it('keyboard: Enter toggles, Escape dismisses', () => {
    render(<WizardField {...baseProps} tooltip="Kbd tip" />);
    const icon = screen.getByTestId('wizard-field-info');
    fireEvent.keyDown(icon, { key: 'Enter' });
    expect(screen.getByRole('tooltip')).toBeInTheDocument();
    fireEvent.keyDown(icon, { key: 'Escape' });
    expect(screen.queryByRole('tooltip')).toBeNull();
  });

  it('links input aria-describedby to the tooltip id when tooltip present', () => {
    render(<WizardField {...baseProps} tooltip="Described" />);
    fireEvent.mouseEnter(screen.getByTestId('wizard-field-info'));
    const input = screen.getByTestId('wizard-field-input');
    const tip = screen.getByRole('tooltip');
    expect(input.getAttribute('aria-describedby') || '').toContain(tip.getAttribute('id'));
  });

  it('flips to a right anchor when the icon sits near the viewport right edge', () => {
    setWidth(800);
    render(<WizardField {...baseProps} tooltip="Edge tip" />);
    const icon = screen.getByTestId('wizard-field-info');
    vi.spyOn(icon, 'getBoundingClientRect').mockReturnValue({
      left: 760, right: 774, top: 100, bottom: 114, width: 14, height: 14,
    });
    fireEvent.mouseEnter(icon);
    expect(screen.getByRole('tooltip').getAttribute('data-anchor')).toBe('right');
  });

  it('uses a left anchor away from the edge', () => {
    setWidth(1200);
    render(<WizardField {...baseProps} tooltip="Mid tip" />);
    const icon = screen.getByTestId('wizard-field-info');
    vi.spyOn(icon, 'getBoundingClientRect').mockReturnValue({
      left: 200, right: 214, top: 100, bottom: 114, width: 14, height: 14,
    });
    fireEvent.mouseEnter(icon);
    expect(screen.getByRole('tooltip').getAttribute('data-anchor')).toBe('left');
  });
});

describe('WizardField — source contract', () => {
  it("declares 'use client' at the top", () => {
    expect(SOURCE.startsWith("'use client';")).toBe(true);
  });

  it('documents props with JSDoc @param', () => {
    expect(SOURCE).toContain('@param');
    expect(SOURCE).toMatch(/@param.*\bfield\b/);
    expect(SOURCE).toMatch(/@param.*\bvalue\b/);
    expect(SOURCE).toMatch(/@param.*onChange/);
    expect(SOURCE).toMatch(/@param.*tooltip/);
  });
});
