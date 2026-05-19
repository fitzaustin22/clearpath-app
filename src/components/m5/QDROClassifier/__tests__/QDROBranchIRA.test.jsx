/**
 * QDROBranchIRA tests — §8.5.5 / §8.10.2 / §10.7 / D2.
 *
 * IRA = 3 items: Q1 §408(d)(6) informational block (no input), Q2
 * decree-language radio, Q3 custodian free-text + notes. No perspective
 * conditioning (D2 — renders identically regardless of userRole). Locked
 * question wording is consumed from the PR1 IRA_QUESTIONS constant (single
 * source of truth). Per-keystroke partial-merge persistence (PVA idiom);
 * §10.7 pre-pop badge + presentation-layer clear-on-override.
 *
 * Covers TC-QDG-5 / TC-QDG-6 (IRA, both perspectives — no wording delta).
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent, within } from '@testing-library/react';
import QDROBranchIRA from '../QDROBranchIRA.jsx';
import { useM5Store } from '@/src/stores/m5Store';
import { IRA_QUESTIONS } from '@/src/lib/qdro';

function asset(overrides = {}) {
  return {
    userRole: null,
    planType: 'ira',
    planName: 'Fidelity IRA',
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

describe('QDROBranchIRA — chrome (§8.5.5)', () => {
  it('renders nothing when the asset is absent from the store', () => {
    const { container } = render(<QDROBranchIRA assetId="missing" />);
    expect(screen.queryByTestId('qdro-branch-ira')).not.toBeInTheDocument();
    expect(container).toBeEmptyDOMElement();
  });

  it('exposes a stable root test id', () => {
    seedAsset('a1', asset());
    render(<QDROBranchIRA assetId="a1" />);
    expect(screen.getByTestId('qdro-branch-ira')).toBeInTheDocument();
  });
});

describe('QDROBranchIRA — Q1 §408(d)(6) informational block (§8.5.5.1)', () => {
  it('renders the locked §408(d)(6) transfer-mechanic copy verbatim', () => {
    seedAsset('a1', asset());
    render(<QDROBranchIRA assetId="a1" />);
    const q1 = IRA_QUESTIONS.find((q) => q.id === 'transferMechanic');
    expect(screen.getByText(q1.wording)).toBeInTheDocument();
  });

  it('is informational only — no radio/text input for Q1', () => {
    seedAsset('a1', asset());
    render(<QDROBranchIRA assetId="a1" />);
    const block = screen.getByTestId('qdro-branch-ira-q1');
    expect(within(block).queryByRole('radio')).not.toBeInTheDocument();
    expect(within(block).queryByRole('textbox')).not.toBeInTheDocument();
  });
});

describe('QDROBranchIRA — Q2 decree-language (§8.5.5.2)', () => {
  it('renders the locked decree-language question wording verbatim', () => {
    seedAsset('a1', asset());
    render(<QDROBranchIRA assetId="a1" />);
    const q2 = IRA_QUESTIONS.find((q) => q.id === 'decreeLanguageConfirmed');
    expect(screen.getByText(q2.wording)).toBeInTheDocument();
  });

  it('renders all 4 spec-locked decree-language options', () => {
    seedAsset('a1', asset());
    render(<QDROBranchIRA assetId="a1" />);
    ['yes', 'no', 'not_yet_drafted', 'not_sure'].forEach((v) => {
      expect(
        screen.getByTestId(`wizard-radio-input-${v}`),
      ).toBeInTheDocument();
    });
  });

  it('reflects the stored decreeLanguageConfirmed as the selected radio', () => {
    seedAsset(
      'a1',
      asset({ decisions: { decreeLanguageConfirmed: 'not_sure' } }),
    );
    render(<QDROBranchIRA assetId="a1" />);
    expect(screen.getByTestId('wizard-radio-input-not_sure')).toBeChecked();
  });

  it('selecting an option persists decreeLanguageConfirmed (per-keystroke)', () => {
    seedAsset('a1', asset());
    render(<QDROBranchIRA assetId="a1" />);
    fireEvent.click(screen.getByTestId('wizard-radio-input-not_yet_drafted'));
    expect(getAsset('a1').decisions.decreeLanguageConfirmed).toBe(
      'not_yet_drafted',
    );
  });

  it('every stacked decree-language option has a description (no WizardRadio dev warn)', () => {
    seedAsset('a1', asset());
    render(<QDROBranchIRA assetId="a1" />);
    // missing-description triggers a WizardRadio console.warn; assert none
    // mention WizardRadio by spying is covered elsewhere — here assert the
    // description nodes exist for all four options.
    ['yes', 'no', 'not_yet_drafted', 'not_sure'].forEach((v) => {
      expect(
        screen.getByTestId(`wizard-radio-desc-${v}`),
      ).toBeInTheDocument();
    });
  });
});

describe('QDROBranchIRA — Q3 custodian + notes (§8.5.5.3)', () => {
  it('renders a custodian free-text field and an optional notes field', () => {
    seedAsset('a1', asset());
    render(<QDROBranchIRA assetId="a1" />);
    expect(screen.getByTestId('qdro-ira-custodian')).toBeInTheDocument();
    expect(screen.getByTestId('qdro-ira-custodian-notes')).toBeInTheDocument();
  });

  it('reflects an existing custodian value from the store', () => {
    seedAsset('a1', asset({ decisions: { custodian: 'Vanguard' } }));
    render(<QDROBranchIRA assetId="a1" />);
    const field = screen.getByTestId('qdro-ira-custodian');
    expect(within(field).getByTestId('wizard-field-input')).toHaveValue(
      'Vanguard',
    );
  });

  it('typing a custodian persists decisions.custodian', () => {
    seedAsset('a1', asset());
    render(<QDROBranchIRA assetId="a1" />);
    const field = screen.getByTestId('qdro-ira-custodian');
    fireEvent.change(within(field).getByTestId('wizard-field-input'), {
      target: { value: 'Schwab' },
    });
    expect(getAsset('a1').decisions.custodian).toBe('Schwab');
  });

  it('typing notes persists decisions.custodianNotes', () => {
    seedAsset('a1', asset());
    render(<QDROBranchIRA assetId="a1" />);
    const notes = screen.getByTestId('qdro-ira-custodian-notes');
    fireEvent.change(within(notes).getByTestId('wizard-field-input'), {
      target: { value: 'Requires their internal form 1099-R' },
    });
    expect(getAsset('a1').decisions.custodianNotes).toBe(
      'Requires their internal form 1099-R',
    );
  });
});

describe('QDROBranchIRA — no perspective conditioning (D2 / §8.5.1)', () => {
  it('renders the identical question set for participant and alternatePayee', () => {
    seedAsset('p', asset({ userRole: 'participant' }));
    seedAsset('ap', asset({ userRole: 'alternatePayee' }));

    const { unmount } = render(<QDROBranchIRA assetId="p" />);
    const participantRadios = screen
      .getAllByTestId(/wizard-radio-input-/)
      .map((n) => n.getAttribute('data-testid'))
      .sort();
    unmount();

    render(<QDROBranchIRA assetId="ap" />);
    const apRadios = screen
      .getAllByTestId(/wizard-radio-input-/)
      .map((n) => n.getAttribute('data-testid'))
      .sort();

    expect(apRadios).toEqual(participantRadios);
  });
});

describe('QDROBranchIRA — partial-merge persistence (§8.10.1)', () => {
  it('setting decree language does not clobber an existing custodian', () => {
    seedAsset('a1', asset({ decisions: { custodian: 'Fidelity' } }));
    render(<QDROBranchIRA assetId="a1" />);
    fireEvent.click(screen.getByTestId('wizard-radio-input-yes'));
    expect(getAsset('a1').decisions.decreeLanguageConfirmed).toBe('yes');
    expect(getAsset('a1').decisions.custodian).toBe('Fidelity');
  });
});

describe('QDROBranchIRA — §10.7 pre-pop badge + clear-on-override', () => {
  it('shows a source badge when a custodian _prePopSources entry exists', () => {
    seedAsset(
      'a1',
      asset({
        decisions: { custodian: 'Pre-filled Custodian' },
        _prePopSources: {
          custodian: { source: 'm2.retirementAsset', timestamp: 't' },
        },
      }),
    );
    render(<QDROBranchIRA assetId="a1" />);
    expect(
      screen.getByText('from M2 retirement asset — review or override'),
    ).toBeInTheDocument();
  });

  it('clears the custodian badge once the user overrides the field (§10.7)', () => {
    seedAsset(
      'a1',
      asset({
        decisions: { custodian: 'Pre-filled Custodian' },
        _prePopSources: {
          custodian: { source: 'm2.retirementAsset', timestamp: 't' },
        },
      }),
    );
    render(<QDROBranchIRA assetId="a1" />);
    expect(
      screen.getByText('from M2 retirement asset — review or override'),
    ).toBeInTheDocument();
    const field = screen.getByTestId('qdro-ira-custodian');
    fireEvent.change(within(field).getByTestId('wizard-field-input'), {
      target: { value: 'User Override Custodian' },
    });
    expect(
      screen.queryByText(/review or override/i),
    ).not.toBeInTheDocument();
  });
});
