/**
 * HomeDecisionVerdictBadge tests — §9.6.2 Q-10 cell-badge.
 * Verifies the WCAG 2.1 AA (1.4.1) contract: text label is load-bearing,
 * icon is decorative (aria-hidden), underwater overrides the red tier.
 */

import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import HomeDecisionVerdictBadge from '../HomeDecisionVerdictBadge.jsx';

describe('HomeDecisionVerdictBadge', () => {
  it('green tier renders "Likely qualifies"', () => {
    render(<HomeDecisionVerdictBadge verdictTier="green" bindingConstraint="none" />);
    const badge = screen.getByTestId('hda-verdict-badge');
    expect(badge).toBeInTheDocument();
    expect(badge).toHaveAttribute('data-verdict', 'green');
    expect(screen.getByText('Likely qualifies')).toBeInTheDocument();
  });

  it('yellow tier renders "Borderline"', () => {
    render(<HomeDecisionVerdictBadge verdictTier="yellow" bindingConstraint="margin-of-safety" />);
    expect(screen.getByTestId('hda-verdict-badge')).toHaveAttribute('data-verdict', 'yellow');
    expect(screen.getByText('Borderline')).toBeInTheDocument();
  });

  it('red tier renders "Likely doesn\'t qualify"', () => {
    render(<HomeDecisionVerdictBadge verdictTier="red" bindingConstraint="dti" />);
    expect(screen.getByTestId('hda-verdict-badge')).toHaveAttribute('data-verdict', 'red');
    expect(screen.getByText("Likely doesn't qualify")).toBeInTheDocument();
  });

  it('underwater bindingConstraint overrides the red tier with the "not viable" treatment', () => {
    // refiQualifier returns { verdictTier: 'red', bindingConstraint: 'underwater' }
    render(<HomeDecisionVerdictBadge verdictTier="red" bindingConstraint="underwater" />);
    const badge = screen.getByTestId('hda-verdict-badge');
    expect(badge).toHaveAttribute('data-verdict', 'underwater');
    expect(screen.getByText('Not viable — see narrative')).toBeInTheDocument();
    expect(screen.queryByText("Likely doesn't qualify")).not.toBeInTheDocument();
  });

  it('red tier WITHOUT underwater stays "Likely doesn\'t qualify"', () => {
    render(<HomeDecisionVerdictBadge verdictTier="red" bindingConstraint="multiple" />);
    expect(screen.getByTestId('hda-verdict-badge')).toHaveAttribute('data-verdict', 'red');
    expect(screen.getByText("Likely doesn't qualify")).toBeInTheDocument();
  });

  it('text label is real text content, not color-only (WCAG 1.4.1 load-bearing channel)', () => {
    render(<HomeDecisionVerdictBadge verdictTier="green" />);
    // getByText resolves only against rendered text nodes — proves the verdict
    // is conveyed textually, independent of the decorative color/icon channels.
    expect(screen.getByText('Likely qualifies')).toBeVisible();
  });

  it('decorative icon is aria-hidden so screen readers rely on the text label', () => {
    const { container } = render(<HomeDecisionVerdictBadge verdictTier="yellow" />);
    const hidden = container.querySelector('[aria-hidden="true"]');
    expect(hidden).not.toBeNull();
    expect(hidden).toHaveTextContent('▲');
  });

  it('renders nothing for an unknown / missing verdictTier (pre-calc soft state)', () => {
    const { container } = render(<HomeDecisionVerdictBadge verdictTier={undefined} />);
    expect(container.firstChild).toBeNull();
    expect(screen.queryByTestId('hda-verdict-badge')).not.toBeInTheDocument();
  });
});
