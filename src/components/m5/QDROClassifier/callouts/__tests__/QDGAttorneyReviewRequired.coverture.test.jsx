/**
 * QDGAttorneyReviewRequired — PR-B2-α §8.6.4 coverture recap extension.
 *
 * Additive prop `covertureApplies` (default false → existing callers
 * unchanged). When true, the component appends the LOCKED §8.6.4 recap
 * copy and the prose cross-link to PVA's coverture callout. Per D3 +
 * Phase 5: the prop is set true only on the `private_db`-with-coverture
 * path. dc / ira / flag-only never pass it true.
 *
 * LOCKED recap (per §8.6.4):
 *   "Only the marital portion of this pension is divisible — the share
 *    earned during marriage. See PVA report for the full coverture
 *    calculation."
 *
 * The existing default-body assertions are covered by the sibling
 * QDGAttorneyReviewRequired.test.jsx — this file tests only the additive
 * coverture branch and the no-regression default path.
 */

import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import QDGAttorneyReviewRequired from '../QDGAttorneyReviewRequired.jsx';

const RECAP_LOCKED =
  'Only the marital portion of this pension is divisible — the share earned during marriage. See PVA report for the full coverture calculation.';

describe('QDGAttorneyReviewRequired — covertureApplies (default false)', () => {
  it('renders the existing body and does NOT include the §8.6.4 recap by default', () => {
    render(<QDGAttorneyReviewRequired />);
    expect(
      screen.getByTestId('qdg-attorney-review-required'),
    ).toHaveTextContent(/licensed attorney/i);
    expect(
      screen.queryByTestId('qdg-attorney-review-required-coverture-recap'),
    ).not.toBeInTheDocument();
    expect(
      screen.getByTestId('qdg-attorney-review-required').textContent,
    ).not.toContain('Only the marital portion of this pension is divisible');
  });

  it('renders the existing body when covertureApplies={false} (explicit)', () => {
    render(<QDGAttorneyReviewRequired covertureApplies={false} />);
    expect(
      screen.queryByTestId('qdg-attorney-review-required-coverture-recap'),
    ).not.toBeInTheDocument();
  });
});

describe('QDGAttorneyReviewRequired — covertureApplies={true} (§8.6.4)', () => {
  it('appends the LOCKED §8.6.4 recap copy + prose cross-link', () => {
    render(<QDGAttorneyReviewRequired covertureApplies />);
    const recap = screen.getByTestId('qdg-attorney-review-required-coverture-recap');
    expect(recap).toBeInTheDocument();
    expect(recap.textContent).toContain(RECAP_LOCKED);
  });

  it('preserves the existing default body alongside the recap', () => {
    render(<QDGAttorneyReviewRequired covertureApplies />);
    const root = screen.getByTestId('qdg-attorney-review-required');
    expect(root).toHaveTextContent(/licensed attorney/i);
    expect(root.textContent).toContain(RECAP_LOCKED);
  });

  it('continues to expose the note role landmark', () => {
    render(<QDGAttorneyReviewRequired covertureApplies />);
    expect(screen.getByRole('note')).toBeInTheDocument();
  });
});
