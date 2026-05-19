/**
 * QDGConsultSpecialist tests — §8.5.6 / Q-B5.
 *
 * Flag-only planTypes (gov_civilian / military / state_municipal) render
 * the locked branch-level `consult specialist` callout NOW (full starter-Q
 * capture is PR4). The locked copy lives in §8.5.6.1–§8.5.6.3, exposed by
 * PR1 as getFlagOnlyBranch(planType).consultSpecialistCallout — the build
 * prompt's "§8.9.2" cite is imprecise; this is the actual locked source.
 * The component consumes the PR1 constant verbatim (single source of
 * truth) and renders nothing for any non-flag planType (defensive).
 *
 * Also covers the callouts/ barrel introduced in this commit.
 */

import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import QDGConsultSpecialist from '../QDGConsultSpecialist.jsx';
import { getFlagOnlyBranch } from '@/src/lib/qdro';
import * as calloutsBarrel from '../index.js';

describe('QDGConsultSpecialist (§8.5.6 / Q-B5)', () => {
  it('exposes a stable root test id for a flag-only planType', () => {
    render(<QDGConsultSpecialist planType="gov_civilian" />);
    expect(screen.getByTestId('qdg-consult-specialist')).toBeInTheDocument();
  });

  it('is announced as a note landmark for assistive tech', () => {
    render(<QDGConsultSpecialist planType="military" />);
    expect(screen.getByRole('note')).toBeInTheDocument();
  });

  it('renders the locked COAP (gov_civilian) §8.5.6.1 copy verbatim', () => {
    render(<QDGConsultSpecialist planType="gov_civilian" />);
    expect(
      screen.getByText(getFlagOnlyBranch('gov_civilian').consultSpecialistCallout),
    ).toBeInTheDocument();
  });

  it('renders the locked USFSPA (military) §8.5.6.2 copy verbatim', () => {
    render(<QDGConsultSpecialist planType="military" />);
    expect(
      screen.getByText(getFlagOnlyBranch('military').consultSpecialistCallout),
    ).toBeInTheDocument();
  });

  it('renders the locked state/municipal §8.5.6.3 copy verbatim', () => {
    render(<QDGConsultSpecialist planType="state_municipal" />);
    expect(
      screen.getByText(
        getFlagOnlyBranch('state_municipal').consultSpecialistCallout,
      ),
    ).toBeInTheDocument();
  });

  it('renders nothing for a non-flag planType (dc — defensive)', () => {
    const { container } = render(<QDGConsultSpecialist planType="dc" />);
    expect(
      screen.queryByTestId('qdg-consult-specialist'),
    ).not.toBeInTheDocument();
    expect(container).toBeEmptyDOMElement();
  });

  it('renders nothing when planType is missing (defensive)', () => {
    const { container } = render(<QDGConsultSpecialist />);
    expect(container).toBeEmptyDOMElement();
  });

  it('callouts/ barrel re-exports all three QDG callouts', () => {
    expect(calloutsBarrel.QDGNotLegalOrder).toBeTypeOf('function');
    expect(calloutsBarrel.QDGAttorneyReviewRequired).toBeTypeOf('function');
    expect(calloutsBarrel.QDGConsultSpecialist).toBeTypeOf('function');
  });
});
