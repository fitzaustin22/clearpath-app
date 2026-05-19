/**
 * QDROWhyThisMatters tests — Q-B6 / §8.5.2 (A14).
 *
 * Reusable inline-expand education wrapper, mirroring the
 * QDROStillNotSureDiagnostic disclosure idiom (a11y-correct <button>
 * with aria-expanded / aria-controls; collapsed by default; content
 * mounts only when expanded). First consumer is the DC receipt-method
 * question (§8.5.4.2), but the component is content-agnostic.
 */

import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import QDROWhyThisMatters from '../QDROWhyThisMatters.jsx';

describe('QDROWhyThisMatters (Q-B6 / §8.5.2)', () => {
  it('exposes a stable root test id', () => {
    render(
      <QDROWhyThisMatters>
        <p>Tax consequences differ.</p>
      </QDROWhyThisMatters>,
    );
    expect(screen.getByTestId('qdro-why-this-matters')).toBeInTheDocument();
  });

  it('defaults the trigger label to "Why this matters"', () => {
    render(
      <QDROWhyThisMatters>
        <p>body</p>
      </QDROWhyThisMatters>,
    );
    expect(
      screen.getByRole('button', { name: /why this matters/i }),
    ).toBeInTheDocument();
  });

  it('accepts a custom triggerText', () => {
    render(
      <QDROWhyThisMatters triggerText="Why receipt method matters">
        <p>body</p>
      </QDROWhyThisMatters>,
    );
    expect(
      screen.getByRole('button', { name: /why receipt method matters/i }),
    ).toBeInTheDocument();
  });

  it('is collapsed by default — children not in the DOM, aria-expanded false', () => {
    render(
      <QDROWhyThisMatters>
        <p>Hidden explanatory content.</p>
      </QDROWhyThisMatters>,
    );
    expect(
      screen.queryByText('Hidden explanatory content.'),
    ).not.toBeInTheDocument();
    expect(screen.getByRole('button')).toHaveAttribute(
      'aria-expanded',
      'false',
    );
  });

  it('expands on trigger click — children visible, aria-expanded true', () => {
    render(
      <QDROWhyThisMatters>
        <p>Now-visible explanatory content.</p>
      </QDROWhyThisMatters>,
    );
    fireEvent.click(screen.getByRole('button'));
    expect(
      screen.getByText('Now-visible explanatory content.'),
    ).toBeInTheDocument();
    expect(screen.getByRole('button')).toHaveAttribute('aria-expanded', 'true');
  });

  it('collapses again on a second trigger click', () => {
    render(
      <QDROWhyThisMatters>
        <p>Toggle me.</p>
      </QDROWhyThisMatters>,
    );
    const btn = screen.getByRole('button');
    fireEvent.click(btn);
    expect(screen.getByText('Toggle me.')).toBeInTheDocument();
    fireEvent.click(btn);
    expect(screen.queryByText('Toggle me.')).not.toBeInTheDocument();
    expect(btn).toHaveAttribute('aria-expanded', 'false');
  });

  it('wires aria-controls on the trigger to the expanded panel id', () => {
    render(
      <QDROWhyThisMatters>
        <p>panel body</p>
      </QDROWhyThisMatters>,
    );
    const btn = screen.getByRole('button');
    fireEvent.click(btn);
    const controls = btn.getAttribute('aria-controls');
    expect(controls).toBeTruthy();
    expect(document.getElementById(controls)).toBeInTheDocument();
  });

  it('renders arbitrary composable children when expanded', () => {
    render(
      <QDROWhyThisMatters>
        <ul>
          <li>Rollover keeps it tax-deferred.</li>
          <li>Cash is taxable income.</li>
        </ul>
      </QDROWhyThisMatters>,
    );
    fireEvent.click(screen.getByRole('button'));
    expect(
      screen.getByText('Rollover keeps it tax-deferred.'),
    ).toBeInTheDocument();
    expect(screen.getByText('Cash is taxable income.')).toBeInTheDocument();
  });

  it('does not throw when rendered without children', () => {
    expect(() => render(<QDROWhyThisMatters />)).not.toThrow();
  });
});
