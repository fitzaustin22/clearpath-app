/**
 * S10NegotiationStrategy render tests — Phase 0b multi-source hardening +
 * Phase 1 Priorities Worksheet renderer.
 *
 * Post-amendment, s10.data is { priorities, tradeOffs } (a non-null object even
 * when both slots are empty), so the legacy `if (!data) return null` no longer
 * fires for the empty case. The all-empty guard (no priorities provided AND no
 * tradeOffs → null) prevents an empty <div> from rendering.
 *
 * Phase 1: the priorities sub-block partitions by importance into Must-Haves /
 * Would-Likes groups, each numbered independently (one <ol> per group); drops
 * any willing-to-trade item (privacy guard + console.warn); and shows a neutral
 * placeholder when no secure groups remain. tradeOffs = { give, get } is
 * unchanged. A `status` prop is passed alongside `data`.
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import S10NegotiationStrategy from '../S10NegotiationStrategy.jsx';

const PRIORITIES = [
  { item: 'Keep the house', importance: 'must-have', rank: 1 },
  { item: 'Retirement security', importance: 'must-have', rank: 2 },
  { item: 'Stay in the school district', importance: 'would-like', rank: 1 },
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

describe('S10NegotiationStrategy — populated render (per-tier groups)', () => {
  it('renders Must-Haves and Would-Likes as separate, independently numbered groups', () => {
    const { container } = render(
      <S10NegotiationStrategy data={{ priorities: PRIORITIES, tradeOffs: null }} status="partial" />,
    );
    expect(screen.getByText('Must-Haves')).toBeInTheDocument();
    expect(screen.getByText('Would-Likes')).toBeInTheDocument();
    expect(screen.getByText('Keep the house')).toBeInTheDocument();
    expect(screen.getByText('Retirement security')).toBeInTheDocument();
    expect(screen.getByText('Stay in the school district')).toBeInTheDocument();
    // Independent per-group numbering: one <ol> per group, not a single flat list.
    const lists = container.querySelectorAll('ol');
    expect(lists).toHaveLength(2);
    expect(lists[0].querySelectorAll('li')).toHaveLength(2); // Must-Haves
    expect(lists[1].querySelectorAll('li')).toHaveLength(1); // Would-Likes
  });

  it('does not render a per-item importance suffix', () => {
    render(
      <S10NegotiationStrategy data={{ priorities: PRIORITIES, tradeOffs: null }} status="partial" />,
    );
    expect(screen.queryByText(/— must-have/)).toBeNull();
    expect(screen.queryByText(/— would-like/)).toBeNull();
    expect(screen.getByText('Keep the house').textContent).toBe('Keep the house');
  });

  it('suppresses an empty group header — only the populated tier renders', () => {
    render(
      <S10NegotiationStrategy
        data={{ priorities: [{ item: 'A nice-to-have', importance: 'would-like', rank: 1 }], tradeOffs: null }}
        status="partial"
      />,
    );
    expect(screen.getByText('Would-Likes')).toBeInTheDocument();
    expect(screen.queryByText('Must-Haves')).toBeNull();
    expect(screen.getByText('A nice-to-have')).toBeInTheDocument();
  });

  it('drops a willing-to-trade item with a console.warn and shows the neutral placeholder', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    render(
      <S10NegotiationStrategy
        data={{ priorities: [{ item: 'Secret leverage', importance: 'willing-to-trade', rank: 1 }], tradeOffs: null }}
        status="partial"
      />,
    );
    expect(screen.getByText('No priorities recorded yet')).toBeInTheDocument();
    expect(screen.queryByText('Secret leverage')).toBeNull();
    expect(screen.queryByText('Must-Haves')).toBeNull();
    expect(screen.queryByText('Would-Likes')).toBeNull();
    expect(warn).toHaveBeenCalled();
    warn.mockRestore();
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
