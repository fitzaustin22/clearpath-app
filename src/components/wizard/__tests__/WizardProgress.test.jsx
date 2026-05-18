/**
 * WizardProgress tests — the blueprint progress bar above the card.
 *
 * Verifies the three-part layout (YOUR BLUEPRINT label / 6px gold
 * gradient bar / Step N / M count), the stateless currentStep /
 * totalSteps API (Q-8), the fill-width math with clamp edge cases,
 * the 300ms ease-out fill animation (Q-7), and full progressbar ARIA
 * threading (Q-6).
 */

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { render, screen } from '@testing-library/react';
import WizardProgress from '../WizardProgress.jsx';
import { T } from '@/src/lib/brand/tokens';

const SOURCE = readFileSync(
  path.resolve(process.cwd(), 'src/components/wizard/WizardProgress.jsx'),
  'utf8',
);

// jsdom normalizes hex color stops inside linear-gradient() to rgb(),
// so compare against the tokens' rgb equivalents (still token-coupled).
function hexToRgb(hex) {
  const h = hex.replace('#', '');
  return `rgb(${parseInt(h.slice(0, 2), 16)}, ${parseInt(
    h.slice(2, 4),
    16,
  )}, ${parseInt(h.slice(4, 6), 16)})`;
}

describe('WizardProgress', () => {
  it('renders the three-part layout: label, bar, count', () => {
    render(<WizardProgress currentStep={6} totalSteps={12} />);
    expect(screen.getByText('YOUR BLUEPRINT')).toBeInTheDocument();
    expect(screen.getByTestId('wizard-progress-count')).toHaveTextContent(
      'Step 6 / 12',
    );
    expect(screen.getByRole('progressbar')).toBeInTheDocument();
  });

  it('renders the label at 11px uppercase', () => {
    render(<WizardProgress currentStep={1} totalSteps={12} />);
    expect(screen.getByText('YOUR BLUEPRINT')).toHaveStyle({
      fontSize: '11px',
      textTransform: 'uppercase',
    });
  });

  it('renders the step count with tabular numerals', () => {
    render(<WizardProgress currentStep={3} totalSteps={7} />);
    const count = screen.getByTestId('wizard-progress-count');
    expect(count).toHaveTextContent('Step 3 / 7');
    expect(count.style.fontVariantNumeric).toBe('tabular-nums');
  });

  it('styles the track at 6px height with a T.LINE background', () => {
    render(<WizardProgress currentStep={1} totalSteps={4} />);
    expect(screen.getByRole('progressbar')).toHaveStyle({
      height: '6px',
      backgroundColor: T.LINE,
    });
  });

  it('sets the fill width to (currentStep / totalSteps) * 100%', () => {
    render(<WizardProgress currentStep={6} totalSteps={12} />);
    expect(screen.getByTestId('wizard-progress-fill')).toHaveStyle({
      width: '50%',
    });
  });

  it('fills with a gold gradient and a 300ms ease-out animation', () => {
    render(<WizardProgress currentStep={1} totalSteps={4} />);
    const fill = screen.getByTestId('wizard-progress-fill');
    const bg = fill.style.backgroundImage.toLowerCase();
    expect(bg).toContain('linear-gradient');
    expect(bg).toContain(hexToRgb(T.GOLD).toLowerCase());
    expect(bg).toContain(hexToRgb(T.GOLD_SOFT).toLowerCase());
    expect(fill.style.transition).toContain('300ms');
    expect(fill.style.transition).toContain('ease-out');
  });

  it('threads full progressbar ARIA (Q-6)', () => {
    render(<WizardProgress currentStep={6} totalSteps={12} />);
    const bar = screen.getByRole('progressbar');
    expect(bar.getAttribute('aria-valuenow')).toBe('6');
    expect(bar.getAttribute('aria-valuemin')).toBe('1');
    expect(bar.getAttribute('aria-valuemax')).toBe('12');
    expect(bar.getAttribute('aria-valuetext')).toBe('Step 6 of 12');
  });

  it('clamps the fill to 100% when currentStep > totalSteps', () => {
    render(<WizardProgress currentStep={15} totalSteps={12} />);
    expect(screen.getByTestId('wizard-progress-fill')).toHaveStyle({
      width: '100%',
    });
  });

  it('clamps the fill to 0% when currentStep < 1', () => {
    render(<WizardProgress currentStep={0} totalSteps={12} />);
    expect(screen.getByTestId('wizard-progress-fill')).toHaveStyle({
      width: '0%',
    });
  });

  it('documents currentStep and totalSteps with JSDoc @param', () => {
    expect(SOURCE).toContain('@param');
    expect(SOURCE).toMatch(/@param.*currentStep/);
    expect(SOURCE).toMatch(/@param.*totalSteps/);
  });
});
