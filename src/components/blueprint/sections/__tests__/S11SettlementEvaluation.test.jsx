/**
 * S11SettlementEvaluation render tests — M6 Phase 3 redesign.
 *
 * The dormant verdict UI (fairnessScore / strengths / concerns / totalValue) is
 * REPLACED by the neutral Settlement Offer Overview readout: the offer summary,
 * the priority map (priority → addressed/silent), and the neutral gap list.
 * The component keeps the { data, status } prop signature and the
 * `if (!data) return null` guard (s11.data is null until the first save).
 *
 * Compliance: the readout NEVER scores, grades, or judges. This suite proves the
 * verdict markup is gone and that no score/strength/concern/fairness language is
 * rendered, even when handed a legacy-shaped data object.
 */

import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import S11SettlementEvaluation from '../S11SettlementEvaluation.jsx';

const DATA = {
  offerSummary: {
    assetItems: [{ label: 'The house', toUser: 'You' }],
    support: { amount: 2000, durationMonths: 36, kind: 'Spousal' },
  },
  map: [
    { priority: 'Keep the house', offerSays: 'Keep the house', status: 'addressed' },
    { priority: 'Time with the kids', offerSays: 'Time with the kids', status: 'silent' },
  ],
  gaps: [
    { key: 'residence', text: 'The offer is silent on the home.' },
    { key: 'retirement', text: 'The offer is silent on retirement.' },
  ],
};

describe('S11SettlementEvaluation — guard', () => {
  it('renders nothing when data is null (the dormant-until-saved guard)', () => {
    const { container } = render(<S11SettlementEvaluation data={null} status="empty" />);
    expect(container).toBeEmptyDOMElement();
  });

  it('renders nothing when summary/map/gaps are all empty', () => {
    const { container } = render(
      <S11SettlementEvaluation data={{ offerSummary: null, map: [], gaps: [] }} status="empty" />,
    );
    expect(container).toBeEmptyDOMElement();
  });
});

describe('S11SettlementEvaluation — neutral readout (summary + map + gaps)', () => {
  it('renders the priority map: each priority with an addressed/silent status', () => {
    render(<S11SettlementEvaluation data={DATA} status="complete" />);
    expect(screen.getByText('Keep the house')).toBeInTheDocument();
    expect(screen.getByText('Time with the kids')).toBeInTheDocument();
    // Two-status presentation — one Addressed pill, one Silent pill.
    expect(screen.getByText('Addressed')).toBeInTheDocument();
    expect(screen.getByText('Silent')).toBeInTheDocument();
  });

  it('renders the neutral gap list ("The offer is silent on X")', () => {
    render(<S11SettlementEvaluation data={DATA} status="complete" />);
    expect(screen.getByText('The offer is silent on the home.')).toBeInTheDocument();
    expect(screen.getByText('The offer is silent on retirement.')).toBeInTheDocument();
  });

  it('renders the offer summary (displayed fields)', () => {
    const { container } = render(<S11SettlementEvaluation data={DATA} status="complete" />);
    expect(screen.getByText('The house')).toBeInTheDocument();
    // support amount is rendered (currency-formatted)
    expect(container.textContent).toMatch(/2,000/);
    expect(container.textContent).toMatch(/36/);
    expect(container.textContent).toMatch(/Spousal/);
  });
});

describe('S11SettlementEvaluation — verdict markup is GONE', () => {
  // Hand the redesigned renderer the LEGACY verdict-shaped data: none of it
  // may surface. This is the regression guard against the dead markup returning.
  const LEGACY = {
    fairnessScore: 82,
    strengths: ['Strong support terms'],
    concerns: ['Retirement underweighted'],
    totalValue: 500000,
    offerSummary: { otherTerms: 'Placeholder' },
    map: [],
    gaps: [],
  };

  it('renders no fairnessScore / Strengths / Concerns / Settlement Value headings', () => {
    render(<S11SettlementEvaluation data={LEGACY} status="complete" />);
    expect(screen.queryByText(/Fairness/i)).toBeNull();
    expect(screen.queryByText(/Strengths/i)).toBeNull();
    expect(screen.queryByText(/Concerns/i)).toBeNull();
    expect(screen.queryByText(/Settlement Value/i)).toBeNull();
  });

  it('renders none of the legacy verdict values (score, totalValue, strength/concern strings)', () => {
    const { container } = render(<S11SettlementEvaluation data={LEGACY} status="complete" />);
    const text = container.textContent;
    expect(text).not.toContain('82');
    expect(text).not.toContain('500,000');
    expect(text).not.toContain('Strong support terms');
    expect(text).not.toContain('Retirement underweighted');
  });

  it('the rendered readout contains no scoring / verdict vocabulary', () => {
    const { container } = render(<S11SettlementEvaluation data={DATA} status="complete" />);
    expect(container.textContent).not.toMatch(
      /score|grade|fairness|\bfair\b|better|worse|accept|reject|recommend|strength|concern/i,
    );
  });
});
