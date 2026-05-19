/**
 * QDGNotLegalOrder tests — §8.9.1 / §8.9.2.
 *
 * The `qdg_not_legal_order` callout: the locked 4-bullet disclaimer copy
 * (§8.9.2, verbatim) rendered top-of-tool-entry (Q-B7). Pure presentation;
 * the parent decides placement. Copy is consumed from the PR1 lib
 * (QDG_DISCLAIMER_BULLETS), never re-authored here.
 */

import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import QDGNotLegalOrder from '../QDGNotLegalOrder.jsx';
import { QDG_DISCLAIMER_BULLETS } from '@/src/lib/qdro';

describe('QDGNotLegalOrder (§8.9.1 / §8.9.2)', () => {
  it('exposes a stable root test id', () => {
    render(<QDGNotLegalOrder />);
    expect(screen.getByTestId('qdg-not-legal-order')).toBeInTheDocument();
  });

  it('is announced as a note landmark for assistive tech', () => {
    render(<QDGNotLegalOrder />);
    expect(screen.getByRole('note')).toBeInTheDocument();
  });

  it('renders the spec-locked bullet 1 verbatim (NOT a legal order)', () => {
    render(<QDGNotLegalOrder />);
    expect(
      screen.getByText(
        'This tool produces a decision-capture and handoff document, NOT a legal order.',
      ),
    ).toBeInTheDocument();
  });

  it('renders all 4 §8.9.2 locked disclaimer bullets verbatim', () => {
    render(<QDGNotLegalOrder />);
    for (const bullet of QDG_DISCLAIMER_BULLETS) {
      expect(screen.getByText(bullet)).toBeInTheDocument();
    }
  });

  it('renders exactly 4 list items (one per locked bullet — no extras)', () => {
    render(<QDGNotLegalOrder />);
    expect(QDG_DISCLAIMER_BULLETS).toHaveLength(4);
    expect(screen.getAllByRole('listitem')).toHaveLength(4);
  });

  it('is pure presentation — renders with no props and does not throw', () => {
    expect(() => render(<QDGNotLegalOrder />)).not.toThrow();
  });
});
