/**
 * QDROBranchDC tests — §8.5.4 / §8.10.2 / §10.7 / Q-B3 / Q-B4 / A11.
 *
 * DC = 3 questions: Q1 allocation (radio + dependent numeric), Q2
 * receipt-method (alternate-payee-only — hidden entirely for participant,
 * with QDROWhyThisMatters education wrapper per D3/Q-B6), Q3 valuation-date
 * (radio + dependent date). Participant-DC persists receiptMethod: null
 * (A11) and question numbering stays Q1/Q3, NOT renumbered (Q-B4).
 *
 * Q-B3: the dependent numeric (Q1) / date (Q3) are rendered via
 * composition `{cond && <Field/>}`, visually nested under the parent
 * radio (indent + accent + contextual label) so the parent-child
 * association is unambiguous.
 *
 * Covers TC-QDG-3 (DC participant) and TC-QDG-4 (DC alternate payee).
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent, within } from '@testing-library/react';
import QDROBranchDC from '../QDROBranchDC.jsx';
import { useM5Store } from '@/src/stores/m5Store';
import { DC_QUESTIONS } from '@/src/lib/qdro';

function asset(overrides = {}) {
  return {
    userRole: null,
    planType: 'dc',
    planName: 'MegaCorp 401(k)',
    employer: null,
    decisions: {},
    pvSource: null,
    _prePopSources: {},
    metadata: { formulaId: null, citations: [], qdroPacketGeneratedAt: null },
    ...overrides,
  };
}

function seedAsset(assetId, payload) {
  useM5Store.setState((state) => ({
    qdroDecision: {
      ...state.qdroDecision,
      assets: { ...state.qdroDecision.assets, [assetId]: payload },
    },
  }));
}

function getAsset(assetId) {
  return useM5Store.getState().qdroDecision.assets[assetId];
}

beforeEach(() => {
  localStorage.clear();
  useM5Store.persist?.rehydrate?.();
  useM5Store.setState((state) => ({
    qdroDecision: { ...state.qdroDecision, assets: {} },
  }));
});

describe('QDROBranchDC — chrome (§8.5.4)', () => {
  it('renders nothing when the asset is absent from the store', () => {
    const { container } = render(
      <QDROBranchDC assetId="missing" userRole="participant" />,
    );
    expect(screen.queryByTestId('qdro-branch-dc')).not.toBeInTheDocument();
    expect(container).toBeEmptyDOMElement();
  });

  it('exposes a stable root test id', () => {
    seedAsset('a1', asset({ userRole: 'participant' }));
    render(<QDROBranchDC assetId="a1" userRole="participant" />);
    expect(screen.getByTestId('qdro-branch-dc')).toBeInTheDocument();
  });
});

describe('QDROBranchDC — Q1 allocation, radio + numeric (§8.5.4.1 / Q-B3)', () => {
  it('renders the locked allocation question wording verbatim', () => {
    seedAsset('a1', asset({ userRole: 'participant' }));
    render(<QDROBranchDC assetId="a1" userRole="participant" />);
    const q1 = DC_QUESTIONS.find((q) => q.id === 'allocation');
    expect(screen.getByText(q1.wording)).toBeInTheDocument();
  });

  it('renders both allocation-type options (percentage / fixed_dollar)', () => {
    seedAsset('a1', asset({ userRole: 'participant' }));
    render(<QDROBranchDC assetId="a1" userRole="participant" />);
    expect(
      screen.getByTestId('wizard-radio-input-percentage'),
    ).toBeInTheDocument();
    expect(
      screen.getByTestId('wizard-radio-input-fixed_dollar'),
    ).toBeInTheDocument();
  });

  it('hides the dependent numeric field until an allocation type is chosen (composition)', () => {
    seedAsset('a1', asset({ userRole: 'participant' }));
    render(<QDROBranchDC assetId="a1" userRole="participant" />);
    expect(
      screen.queryByTestId('qdro-dc-allocation-value'),
    ).not.toBeInTheDocument();
  });

  it('reveals the dependent numeric field after selecting an allocation type', () => {
    seedAsset('a1', asset({ userRole: 'participant' }));
    render(<QDROBranchDC assetId="a1" userRole="participant" />);
    fireEvent.click(screen.getByTestId('wizard-radio-input-percentage'));
    expect(
      screen.getByTestId('qdro-dc-allocation-value'),
    ).toBeInTheDocument();
  });

  it('persists allocationType per-keystroke', () => {
    seedAsset('a1', asset({ userRole: 'participant' }));
    render(<QDROBranchDC assetId="a1" userRole="participant" />);
    fireEvent.click(screen.getByTestId('wizard-radio-input-fixed_dollar'));
    expect(getAsset('a1').decisions.allocationType).toBe('fixed_dollar');
  });

  it('persists allocationValue as a number', () => {
    seedAsset(
      'a1',
      asset({ userRole: 'participant', decisions: { allocationType: 'percentage' } }),
    );
    render(<QDROBranchDC assetId="a1" userRole="participant" />);
    const field = screen.getByTestId('qdro-dc-allocation-value');
    fireEvent.change(within(field).getByTestId('wizard-field-input'), {
      target: { value: '50' },
    });
    expect(getAsset('a1').decisions.allocationValue).toBe(50);
  });

  it('shows a percentage affordance for percentage and a $ affordance for fixed_dollar (Q-B3 visual connection)', () => {
    seedAsset(
      'a1',
      asset({ userRole: 'participant', decisions: { allocationType: 'percentage' } }),
    );
    const { rerender } = render(
      <QDROBranchDC assetId="a1" userRole="participant" />,
    );
    let field = screen.getByTestId('qdro-dc-allocation-value');
    expect(within(field).getByText('%')).toBeInTheDocument();

    seedAsset(
      'a1',
      asset({ userRole: 'participant', decisions: { allocationType: 'fixed_dollar' } }),
    );
    rerender(<QDROBranchDC assetId="a1" userRole="participant" />);
    field = screen.getByTestId('qdro-dc-allocation-value');
    expect(within(field).getByText('$')).toBeInTheDocument();
  });
});

describe('QDROBranchDC — Q2 receipt-method, alternate-payee-only (§8.5.4.2 / Q-B4 / A11)', () => {
  it('renders the receipt-method radio with all 4 spec options for alternatePayee', () => {
    seedAsset('a1', asset({ userRole: 'alternatePayee' }));
    render(<QDROBranchDC assetId="a1" userRole="alternatePayee" />);
    // Scope to Q2 — `not_yet_decided` is also a Q3 valuation-date option,
    // so the WizardRadio testid namespace collides at the screen level.
    const q2 = within(screen.getByTestId('qdro-dc-q2'));
    ['rollover_ira', 'cash_72t', 'leave_in_plan', 'not_yet_decided'].forEach(
      (v) => {
        expect(q2.getByTestId(`wizard-radio-input-${v}`)).toBeInTheDocument();
      },
    );
  });

  it('does NOT render the receipt-method question for a participant (Q-B4 hidden entirely)', () => {
    seedAsset('a1', asset({ userRole: 'participant' }));
    render(<QDROBranchDC assetId="a1" userRole="participant" />);
    expect(
      screen.queryByTestId('wizard-radio-input-rollover_ira'),
    ).not.toBeInTheDocument();
    expect(screen.queryByTestId('qdro-dc-q2')).not.toBeInTheDocument();
  });

  it('persists receiptMethod: null for a participant on mount (A11 / TC-QDG-3)', () => {
    seedAsset('a1', asset({ userRole: 'participant' }));
    render(<QDROBranchDC assetId="a1" userRole="participant" />);
    expect(getAsset('a1').decisions.receiptMethod).toBe(null);
  });

  it('does NOT force receiptMethod to null for an alternate payee', () => {
    seedAsset('a1', asset({ userRole: 'alternatePayee' }));
    render(<QDROBranchDC assetId="a1" userRole="alternatePayee" />);
    expect(getAsset('a1').decisions.receiptMethod).toBeUndefined();
  });

  it('alternatePayee: selecting a receipt method persists decisions.receiptMethod', () => {
    seedAsset('a1', asset({ userRole: 'alternatePayee' }));
    render(<QDROBranchDC assetId="a1" userRole="alternatePayee" />);
    fireEvent.click(screen.getByTestId('wizard-radio-input-rollover_ira'));
    expect(getAsset('a1').decisions.receiptMethod).toBe('rollover_ira');
  });

  it('alternatePayee: surfaces the QDROWhyThisMatters education wrapper on receipt-method (D3 / Q-B6)', () => {
    seedAsset('a1', asset({ userRole: 'alternatePayee' }));
    render(<QDROBranchDC assetId="a1" userRole="alternatePayee" />);
    expect(screen.getByTestId('qdro-why-this-matters')).toBeInTheDocument();
  });

  it('participant: no QDROWhyThisMatters (receipt-method question not rendered, §8.5.2)', () => {
    seedAsset('a1', asset({ userRole: 'participant' }));
    render(<QDROBranchDC assetId="a1" userRole="participant" />);
    expect(
      screen.queryByTestId('qdro-why-this-matters'),
    ).not.toBeInTheDocument();
  });

  it('preserves spec-locked receipt-method semantics (§72(t), rollover)', () => {
    seedAsset('a1', asset({ userRole: 'alternatePayee' }));
    render(<QDROBranchDC assetId="a1" userRole="alternatePayee" />);
    expect(screen.getByTestId('qdro-dc-q2')).toHaveTextContent(/§72\(t\)/);
    expect(screen.getByTestId('qdro-dc-q2')).toHaveTextContent(/rollover/i);
  });
});

describe('QDROBranchDC — Q-B4 question numbering not renumbered for participant', () => {
  it('participant sees Q1 and Q3 with Q3 still labelled "3" (gap, not renumbered)', () => {
    seedAsset('a1', asset({ userRole: 'participant' }));
    render(<QDROBranchDC assetId="a1" userRole="participant" />);
    expect(screen.getByTestId('qdro-dc-q1')).toBeInTheDocument();
    expect(screen.queryByTestId('qdro-dc-q2')).not.toBeInTheDocument();
    expect(screen.getByTestId('qdro-dc-q3')).toBeInTheDocument();
    expect(screen.getByTestId('qdro-dc-q3')).toHaveTextContent(/\b3\b/);
  });
});

describe('QDROBranchDC — Q3 valuation-date, radio + date (§8.5.4.3 / Q-B3)', () => {
  it('renders the locked valuation-date question wording verbatim', () => {
    seedAsset('a1', asset({ userRole: 'participant' }));
    render(<QDROBranchDC assetId="a1" userRole="participant" />);
    const q3 = DC_QUESTIONS.find((q) => q.id === 'valuationDate');
    expect(screen.getByText(q3.wording)).toBeInTheDocument();
  });

  it('renders all 5 spec-locked valuation-date options', () => {
    seedAsset('a1', asset({ userRole: 'participant' }));
    render(<QDROBranchDC assetId="a1" userRole="participant" />);
    ['divorce', 'separation', 'other', 'no_specific', 'not_yet_decided'].forEach(
      (v) => {
        expect(
          screen.getByTestId(`wizard-radio-input-${v}`),
        ).toBeInTheDocument();
      },
    );
  });

  it('hides the dependent date picker until a date-requiring type is chosen', () => {
    seedAsset('a1', asset({ userRole: 'participant' }));
    render(<QDROBranchDC assetId="a1" userRole="participant" />);
    expect(
      screen.queryByTestId('qdro-dc-valuation-date'),
    ).not.toBeInTheDocument();
  });

  it('reveals the date picker for "divorce" but not for "no_specific" (§8.10.2)', () => {
    seedAsset('a1', asset({ userRole: 'participant' }));
    render(<QDROBranchDC assetId="a1" userRole="participant" />);
    fireEvent.click(screen.getByTestId('wizard-radio-input-divorce'));
    expect(screen.getByTestId('qdro-dc-valuation-date')).toBeInTheDocument();
    fireEvent.click(screen.getByTestId('wizard-radio-input-no_specific'));
    expect(
      screen.queryByTestId('qdro-dc-valuation-date'),
    ).not.toBeInTheDocument();
  });

  it('persists valuationDate.type', () => {
    seedAsset('a1', asset({ userRole: 'participant' }));
    render(<QDROBranchDC assetId="a1" userRole="participant" />);
    fireEvent.click(screen.getByTestId('wizard-radio-input-separation'));
    expect(getAsset('a1').decisions.valuationDate.type).toBe('separation');
  });

  it('persists valuationDate.date when a date is entered', () => {
    seedAsset(
      'a1',
      asset({
        userRole: 'participant',
        decisions: { valuationDate: { type: 'divorce', date: null } },
      }),
    );
    render(<QDROBranchDC assetId="a1" userRole="participant" />);
    fireEvent.change(screen.getByTestId('qdro-dc-valuation-date'), {
      target: { value: '2026-03-15' },
    });
    expect(getAsset('a1').decisions.valuationDate).toEqual({
      type: 'divorce',
      date: '2026-03-15',
    });
  });
});

describe('QDROBranchDC — partial-merge + §10.7 provenance', () => {
  it('setting allocation does not clobber an existing valuationDate', () => {
    seedAsset(
      'a1',
      asset({
        userRole: 'participant',
        decisions: { valuationDate: { type: 'divorce', date: '2026-01-01' } },
      }),
    );
    render(<QDROBranchDC assetId="a1" userRole="participant" />);
    fireEvent.click(screen.getByTestId('wizard-radio-input-percentage'));
    expect(getAsset('a1').decisions.allocationType).toBe('percentage');
    expect(getAsset('a1').decisions.valuationDate).toEqual({
      type: 'divorce',
      date: '2026-01-01',
    });
  });

  it('shows a §10.7 source badge for a pre-popped allocationType and clears it on override', () => {
    seedAsset(
      'a1',
      asset({
        userRole: 'participant',
        decisions: { allocationType: 'percentage' },
        _prePopSources: {
          allocationType: { source: 'm2.retirementAsset', timestamp: 't' },
        },
      }),
    );
    render(<QDROBranchDC assetId="a1" userRole="participant" />);
    expect(
      screen.getByText('from M2 retirement asset — review or override'),
    ).toBeInTheDocument();
    fireEvent.click(screen.getByTestId('wizard-radio-input-fixed_dollar'));
    expect(
      screen.queryByText(/review or override/i),
    ).not.toBeInTheDocument();
  });
});
