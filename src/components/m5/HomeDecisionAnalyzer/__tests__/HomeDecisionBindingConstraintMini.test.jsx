/**
 * HomeDecisionBindingConstraintMini tests — §9.8.1 el.6 / §9.6.2 Q-10.
 * The five binding-constraint case branches plus the always-rendered
 * green/`none` affirmative, and the strict-comparator guarantee that the
 * component frames the lib narrative without adding directive language.
 */

import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import HomeDecisionBindingConstraintMini from '../HomeDecisionBindingConstraintMini.jsx';

describe('HomeDecisionBindingConstraintMini', () => {
  it('green/none renders the affirmative no-binding-constraint copy', () => {
    render(
      <HomeDecisionBindingConstraintMini
        verdictTier="green"
        bindingConstraint="none"
        narrative={null}
      />,
    );
    const el = screen.getByTestId('hda-binding-constraint-mini');
    expect(el).toHaveAttribute('data-binding', 'none');
    expect(screen.getByText(/no binding constraint/i)).toBeInTheDocument();
    expect(screen.getByText(/No single constraint is binding the verdict/i)).toBeInTheDocument();
  });

  it('dti binding renders the lib-built narrative verbatim', () => {
    const narrative =
      'Back-end DTI of 39% exceeds the 38% threshold. Discuss with your CDFA.';
    render(
      <HomeDecisionBindingConstraintMini
        verdictTier="red"
        bindingConstraint="dti"
        narrative={narrative}
      />,
    );
    expect(screen.getByTestId('hda-binding-constraint-mini')).toHaveAttribute('data-binding', 'dti');
    expect(screen.getByText(narrative)).toBeInTheDocument();
  });

  it('credit binding (yellow) renders its narrative', () => {
    const narrative =
      'Your DTI ratios fall in the qualifying range, but `fair` credit (580–669) typically downgrades a verdict to borderline. Discuss with your CDFA about credit-improvement runway before refi application.';
    render(
      <HomeDecisionBindingConstraintMini
        verdictTier="yellow"
        bindingConstraint="credit"
        narrative={narrative}
      />,
    );
    expect(screen.getByTestId('hda-binding-constraint-mini')).toHaveAttribute('data-binding', 'credit');
    expect(screen.getByText(narrative)).toBeInTheDocument();
  });

  it('margin-of-safety binding renders its narrative', () => {
    const narrative =
      'Your DTI ratios pass the qualifying thresholds, but your back-end DTI lands within 2 percentage points of the limit. Some lenders apply tighter overlays at this margin. Discuss with your CDFA.';
    render(
      <HomeDecisionBindingConstraintMini
        verdictTier="yellow"
        bindingConstraint="margin-of-safety"
        narrative={narrative}
      />,
    );
    expect(screen.getByTestId('hda-binding-constraint-mini')).toHaveAttribute(
      'data-binding',
      'margin-of-safety',
    );
    expect(screen.getByText(narrative)).toBeInTheDocument();
  });

  it('multiple binding renders its narrative', () => {
    const narrative =
      'Back-end DTI at 37% is in the borderline zone, and LTV at 84% adds further pressure. Discuss with your CDFA.';
    render(
      <HomeDecisionBindingConstraintMini
        verdictTier="red"
        bindingConstraint="multiple"
        narrative={narrative}
      />,
    );
    expect(screen.getByTestId('hda-binding-constraint-mini')).toHaveAttribute(
      'data-binding',
      'multiple',
    );
    expect(screen.getByText(narrative)).toBeInTheDocument();
  });

  it('underwater binding renders its narrative and is keyed underwater (not red)', () => {
    const narrative =
      "Your home's current FMV ($420,000) is below the outstanding mortgage balance ($465,000). Refinancing requires positive equity; the Keep & refi scenario is not viable at this LTV. Discuss with your CDFA.";
    render(
      <HomeDecisionBindingConstraintMini
        verdictTier="red"
        bindingConstraint="underwater"
        narrative={narrative}
      />,
    );
    expect(screen.getByTestId('hda-binding-constraint-mini')).toHaveAttribute(
      'data-binding',
      'underwater',
    );
    expect(screen.getByText(narrative)).toBeInTheDocument();
  });

  it('strict-comparator: the rendered body is exactly the passed narrative — no appended directive text', () => {
    const narrative = 'Front-end DTI at 29% is in the borderline 28–30% zone. Discuss with your CDFA.';
    render(
      <HomeDecisionBindingConstraintMini
        verdictTier="yellow"
        bindingConstraint="dti"
        narrative={narrative}
      />,
    );
    const para = screen.getByText(narrative);
    expect(para.textContent).toBe(narrative);
  });

  it('renders nothing pre-calc (missing verdictTier)', () => {
    const { container } = render(
      <HomeDecisionBindingConstraintMini bindingConstraint="dti" narrative="x" />,
    );
    expect(container.firstChild).toBeNull();
  });

  it('renders nothing when a non-none binding has no narrative (defensive soft state)', () => {
    const { container } = render(
      <HomeDecisionBindingConstraintMini
        verdictTier="red"
        bindingConstraint="dti"
        narrative={null}
      />,
    );
    expect(container.firstChild).toBeNull();
  });
});
