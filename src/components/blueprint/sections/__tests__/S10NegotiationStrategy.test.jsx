/**
 * S10NegotiationStrategy render tests — Phase 0b multi-source hardening.
 *
 * Post-amendment, s10.data is { priorities, tradeOffs } (a non-null object even
 * when both slots are empty), so the legacy `if (!data) return null` no longer
 * fires for the empty case. The added all-empty guard
 * (priorities.length === 0 && tradeOffs.length === 0 → null) prevents an empty
 * <div> from rendering.
 *
 * Item shapes mirror the M6 feeders: priorities = { item, importance, rank };
 * tradeOffs = { give, get }. A `status` prop is passed alongside `data`.
 */

import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import S10NegotiationStrategy from '../S10NegotiationStrategy.jsx';

const PRIORITIES = [
  { item: 'Keep the house', importance: 'high', rank: 1 },
  { item: 'Retirement security', importance: 'medium', rank: 2 },
];
const TRADEOFFS = [{ give: 'Vacation home', get: 'Primary residence' }];

describe('S10NegotiationStrategy — empty-object hardening', () => {
  it('renders nothing when both slots are null ({ priorities: null, tradeOffs: null })', () => {
    const { container } = render(
      <S10NegotiationStrategy data={{ priorities: null, tradeOffs: null }} status="empty" />,
    );
    expect(container).toBeEmptyDOMElement();
  });

  it('renders nothing when both slots are empty arrays ({ priorities: [], tradeOffs: [] })', () => {
    const { container } = render(
      <S10NegotiationStrategy data={{ priorities: [], tradeOffs: [] }} status="empty" />,
    );
    expect(container).toBeEmptyDOMElement();
  });
});

describe('S10NegotiationStrategy — populated render', () => {
  it('renders the "Your Priorities" list with item text when priorities are present', () => {
    render(
      <S10NegotiationStrategy data={{ priorities: PRIORITIES, tradeOffs: null }} status="partial" />,
    );
    expect(screen.getByText('Your Priorities')).toBeInTheDocument();
    expect(screen.getByText('Keep the house')).toBeInTheDocument();
    expect(screen.getByText('Retirement security')).toBeInTheDocument();
  });

  it('renders the "Potential Trade-Offs" rows (give → get) when tradeOffs are present', () => {
    render(
      <S10NegotiationStrategy data={{ priorities: null, tradeOffs: TRADEOFFS }} status="partial" />,
    );
    expect(screen.getByText('Potential Trade-Offs')).toBeInTheDocument();
    expect(screen.getByText(/Vacation home/)).toBeInTheDocument();
    expect(screen.getByText(/Primary residence/)).toBeInTheDocument();
  });
});
