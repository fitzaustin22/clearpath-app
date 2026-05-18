/**
 * WizardSection tests — always-visible named subsection.
 *
 * Verifies the 11px uppercase tracked title in T.INK, the T.LINE
 * hairline rule extending to the right edge, 18px vertical padding,
 * the top-border-between-sections rule (suppressed when first), the
 * semantic `as` element override, and children rendering.
 */

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { render, screen } from '@testing-library/react';
import WizardSection from '../WizardSection.jsx';
import { T } from '@/src/lib/brand/tokens';

const SOURCE = readFileSync(
  path.resolve(process.cwd(), 'src/components/wizard/WizardSection.jsx'),
  'utf8',
);

describe('WizardSection', () => {
  it('renders the title with the spec typography', () => {
    render(<WizardSection title="Your home">body</WizardSection>);
    const title = screen.getByText('Your home');
    expect(title).toHaveStyle({
      fontSize: '11px',
      fontWeight: 700,
      textTransform: 'uppercase',
      letterSpacing: '0.9px',
      color: T.INK,
    });
  });

  it('renders a hairline rule in T.LINE that flexes to the right edge', () => {
    render(<WizardSection title="Equity">body</WizardSection>);
    const rule = screen.getByTestId('wizard-section-rule');
    expect(rule).toHaveStyle({
      backgroundColor: T.LINE,
      height: '1px',
      flexGrow: 1,
    });
  });

  it('applies 18px vertical padding to the root', () => {
    render(<WizardSection title="Padding">body</WizardSection>);
    expect(screen.getByTestId('wizard-section')).toHaveStyle({
      paddingTop: '18px',
      paddingBottom: '18px',
    });
  });

  it('draws a T.LINE top border when not the first section', () => {
    render(<WizardSection title="Second">body</WizardSection>);
    expect(screen.getByTestId('wizard-section')).toHaveStyle({
      borderTop: `1px solid ${T.LINE}`,
    });
  });

  it('omits the top border when first === true', () => {
    render(
      <WizardSection title="First" first>
        body
      </WizardSection>,
    );
    expect(screen.getByTestId('wizard-section')).not.toHaveStyle({
      borderTop: `1px solid ${T.LINE}`,
    });
  });

  it('renders children inside the section body', () => {
    render(
      <WizardSection title="Has children">
        <p>section child</p>
      </WizardSection>,
    );
    const body = screen.getByTestId('wizard-section-body');
    expect(body).toHaveTextContent('section child');
  });

  it('defaults to a <section> element', () => {
    render(<WizardSection title="Sem">body</WizardSection>);
    expect(screen.getByTestId('wizard-section').tagName).toBe('SECTION');
  });

  it('honors the `as` prop for the semantic element', () => {
    render(
      <WizardSection title="Sem" as="div">
        body
      </WizardSection>,
    );
    expect(screen.getByTestId('wizard-section').tagName).toBe('DIV');
  });

  it('documents every prop with a JSDoc @param block', () => {
    expect(SOURCE).toContain('@param');
    expect(SOURCE).toMatch(/@param.*title/);
    expect(SOURCE).toMatch(/@param.*children/);
    expect(SOURCE).toMatch(/@param.*first/);
    expect(SOURCE).toMatch(/@param.*\bas\b/);
  });
});
