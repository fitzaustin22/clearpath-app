/**
 * WizardCard tests — wizard foundation paper surface.
 *
 * Verifies token-driven default styling (memory #23 inline-T idiom),
 * children rendering, className/style passthrough, the data-testid
 * default + override, and the 'use client' / JSDoc source contract.
 */

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { render, screen } from '@testing-library/react';
import WizardCard from '../WizardCard.jsx';
import { T } from '@/src/lib/brand/tokens';

const SOURCE = readFileSync(
  path.resolve(process.cwd(), 'src/components/wizard/WizardCard.jsx'),
  'utf8',
);

describe('WizardCard', () => {
  it('renders its children', () => {
    render(
      <WizardCard>
        <p>card body</p>
      </WizardCard>,
    );
    expect(screen.getByText('card body')).toBeInTheDocument();
  });

  it('applies the default card styling from brand tokens', () => {
    render(<WizardCard>x</WizardCard>);
    const card = screen.getByTestId('wizard-card');
    expect(card).toHaveStyle({
      maxWidth: '1040px',
      borderRadius: '12px',
      padding: '28px 32px 24px',
      backgroundColor: T.CARD,
      border: `1px solid ${T.LINE}`,
      boxShadow: T.SHADOW_CARD,
    });
  });

  it('uses wizard-card as the default data-testid', () => {
    render(<WizardCard>x</WizardCard>);
    expect(screen.getByTestId('wizard-card')).toBeInTheDocument();
  });

  it('accepts a custom data-testid', () => {
    render(<WizardCard data-testid="custom-card">x</WizardCard>);
    expect(screen.getByTestId('custom-card')).toBeInTheDocument();
  });

  it('forwards a className', () => {
    render(<WizardCard className="extra-class">x</WizardCard>);
    expect(screen.getByTestId('wizard-card')).toHaveClass('extra-class');
  });

  it('merges style overrides over the token defaults', () => {
    render(
      <WizardCard style={{ maxWidth: '600px', marginTop: '10px' }}>x</WizardCard>,
    );
    const card = screen.getByTestId('wizard-card');
    expect(card).toHaveStyle({ maxWidth: '600px', marginTop: '10px' });
    expect(card).toHaveStyle({ borderRadius: '12px' });
  });

  it("declares the 'use client' directive at the top of the file", () => {
    expect(SOURCE.startsWith("'use client';")).toBe(true);
  });

  it('documents every prop with a JSDoc @param block', () => {
    expect(SOURCE).toContain('@param');
    expect(SOURCE).toMatch(/@param.*children/);
    expect(SOURCE).toMatch(/@param.*className/);
    expect(SOURCE).toMatch(/@param.*style/);
    expect(SOURCE).toMatch(/@param.*data-testid/);
  });
});
