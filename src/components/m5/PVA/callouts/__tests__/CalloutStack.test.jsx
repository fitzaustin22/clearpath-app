/**
 * Tests for CalloutStack — aggregator that consumes engine
 * `breakdown.callouts[]` and renders in §7.9.1 precedence order.
 *
 * Invariants:
 *   - Empty / non-array callouts → renders nothing
 *   - Single callout renders its testid
 *   - Multi callouts render in §7.9.1 precedence order regardless of input order
 *   - Unknown types are skipped + warned in dev mode
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import CalloutStack from '../CalloutStack';

describe('CalloutStack', () => {
  it('renders nothing for empty callouts', () => {
    const { container } = render(<CalloutStack callouts={[]} />);
    expect(container.firstChild).toBeNull();
  });

  it('renders nothing for non-array callouts', () => {
    const { container } = render(<CalloutStack callouts={null} />);
    expect(container.firstChild).toBeNull();
  });

  it('renders a single callout', () => {
    render(<CalloutStack callouts={[{ type: 'liability_disclaimer' }]} />);
    expect(screen.getByTestId('callout-liability_disclaimer')).toBeInTheDocument();
  });

  it('sorts callouts by §7.9.1 precedence regardless of input order', () => {
    render(
      <CalloutStack
        callouts={[
          { type: 'liability_disclaimer' }, // precedence 12 (last)
          { type: 'qdro_handoff_recommended', path: 'tier_1', planType: 'private_db' }, // 11
          { type: 'vesting_status_callout', vestingStatus: 'partially_vested' }, // 6
          { type: 'qpsa_election_callout' }, // 8
        ]}
      />,
    );
    const stack = screen.getByTestId('callout-stack');
    const ids = within(stack)
      .getAllByTestId(/^callout-/)
      .map((c) => c.getAttribute('data-testid'));
    expect(ids).toEqual([
      'callout-vesting_status_callout',
      'callout-qpsa_election_callout',
      'callout-qdro_handoff_recommended',
      'callout-liability_disclaimer',
    ]);
  });

  it('skips unknown callout types and warns in dev', () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    render(
      <CalloutStack
        callouts={[
          { type: 'qdro_handoff_recommended', path: 'tier_1', planType: 'private_db' },
          { type: 'unknown_type_xyz', foo: 'bar' },
          { type: 'liability_disclaimer' },
        ]}
      />,
    );
    const stack = screen.getByTestId('callout-stack');
    const ids = within(stack)
      .getAllByTestId(/^callout-/)
      .map((c) => c.getAttribute('data-testid'));
    expect(ids).toEqual(['callout-qdro_handoff_recommended', 'callout-liability_disclaimer']);
    expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('unknown_type_xyz'));
    warnSpy.mockRestore();
  });

  it('preserves precedence across the full 11-type set', () => {
    render(
      <CalloutStack
        callouts={[
          { type: 'liability_disclaimer' },
          { type: 'qdro_handoff_recommended', path: 'tier_1', planType: 'private_db' },
          { type: 'lump_sum_offer_divergence', offer: 80000, toolPv: 100000, diff: -20000, pctDiff: -0.2 },
          { type: 'cash_balance_passthrough_explanation' },
          { type: 'qpsa_election_callout' },
          { type: 'form_of_benefit_callout', context: 'on_statement', form: 'joint_50' },
          { type: 'vesting_status_callout', vestingStatus: 'partially_vested' },
          { type: 'coverture_zero_fraction' },
          { type: 'frozen_plan_tier1_routing', planName: 'X' },
          { type: 'gov_flag_only', variant: 'csrs_fers', planName: 'C' },
          { type: 'multi_employer_flag_only', planName: 'M' },
        ]}
      />,
    );
    const stack = screen.getByTestId('callout-stack');
    const ids = within(stack)
      .getAllByTestId(/^callout-/)
      .map((c) => c.getAttribute('data-testid'));
    expect(ids).toEqual([
      'callout-multi_employer_flag_only',
      'callout-gov_flag_only',
      'callout-frozen_plan_tier1_routing',
      'callout-coverture_zero_fraction',
      'callout-vesting_status_callout',
      'callout-form_of_benefit_callout',
      'callout-qpsa_election_callout',
      'callout-cash_balance_passthrough_explanation',
      'callout-lump_sum_offer_divergence',
      'callout-qdro_handoff_recommended',
      'callout-liability_disclaimer',
    ]);
  });
});
