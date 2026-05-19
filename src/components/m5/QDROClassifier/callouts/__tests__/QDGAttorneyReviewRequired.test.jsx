/**
 * QDGAttorneyReviewRequired tests — §8.9.1.
 *
 * The `qdg_attorney_review_required` callout: surfaced per-asset once any
 * decision is captured (Q-B7). §8.9.1 designates its body as build-phase
 * authored (PR1 QDG_CALLOUTS.qdg_attorney_review_required.body === null);
 * there is no spec-locked literal. The component carries NO conditional
 * logic — the parent (QDROAssetCard) decides when to mount it.
 */

import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import QDGAttorneyReviewRequired from '../QDGAttorneyReviewRequired.jsx';

describe('QDGAttorneyReviewRequired (§8.9.1)', () => {
  it('exposes a stable root test id', () => {
    render(<QDGAttorneyReviewRequired />);
    expect(
      screen.getByTestId('qdg-attorney-review-required'),
    ).toBeInTheDocument();
  });

  it('is announced as a note landmark for assistive tech', () => {
    render(<QDGAttorneyReviewRequired />);
    expect(screen.getByRole('note')).toBeInTheDocument();
  });

  it('states that a licensed attorney must draft and review the order', () => {
    render(<QDGAttorneyReviewRequired />);
    expect(screen.getByTestId('qdg-attorney-review-required')).toHaveTextContent(
      /licensed attorney/i,
    );
    expect(screen.getByTestId('qdg-attorney-review-required')).toHaveTextContent(
      /draft|review/i,
    );
  });

  it('frames captured decisions as preferences, not a finished order (§8.9 spirit)', () => {
    render(<QDGAttorneyReviewRequired />);
    expect(
      screen.getByTestId('qdg-attorney-review-required'),
    ).toHaveTextContent(/preference|not a (finished|legal)/i);
  });

  it('carries no built-in conditional logic — always renders when mounted', () => {
    const { container } = render(<QDGAttorneyReviewRequired />);
    expect(container).not.toBeEmptyDOMElement();
  });

  it('is pure presentation — renders with no props and does not throw', () => {
    expect(() => render(<QDGAttorneyReviewRequired />)).not.toThrow();
  });
});
