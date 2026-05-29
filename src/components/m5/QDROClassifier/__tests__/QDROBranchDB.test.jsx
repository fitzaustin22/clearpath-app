/**
 * QDROBranchDB tests — §8.5.3 / §8.6.3 / §8.10.2.
 *
 * Five spec-locked questions: interestStructure (Type-A), qpsa (Type-A),
 * qjsa (Type-A), cola (Type-B), earlyRetirementSubsidy (Type-B). The §8.6.3
 * entry callout renders when `pvSource == null`. PR-B owns the 5 decision
 * fields and the §8.6.3 callout only; §8.6.2 / §8.6.4 / §8.6.5 (the PV
 * display, callout extension, packet embed) are PR-B2.
 *
 * Integration with shipped completion-state machinery: a fully-captured
 * private_db asset with pvSource still null caps at 'partial' via the
 * §10.8 carve-out (deriveCompletionState); an untouched asset is 'empty'.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent, within } from '@testing-library/react';
import QDROBranchDB from '../QDROBranchDB.jsx';
import { useM5Store } from '@/src/stores/m5Store';
import { deriveCompletionState } from '@/src/lib/qdro/blueprint/divisionData.js';

function asset(overrides = {}) {
  return {
    userRole: null,
    planType: 'private_db',
    planName: 'MegaCorp Pension Plan',
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

describe('QDROBranchDB — chrome (§8.5.3)', () => {
  it('renders nothing when the asset is absent from the store', () => {
    const { container } = render(
      <QDROBranchDB assetId="missing" userRole="participant" />,
    );
    expect(screen.queryByTestId('qdro-branch-db')).not.toBeInTheDocument();
    expect(container).toBeEmptyDOMElement();
  });

  it('exposes a stable root test id when the asset is present', () => {
    seedAsset('a1', asset({ userRole: 'participant' }));
    render(<QDROBranchDB assetId="a1" userRole="participant" />);
    expect(screen.getByTestId('qdro-branch-db')).toBeInTheDocument();
  });

  it('renders all 5 question sections (Q1–Q5)', () => {
    seedAsset('a1', asset({ userRole: 'participant' }));
    render(<QDROBranchDB assetId="a1" userRole="participant" />);
    expect(screen.getByTestId('qdro-db-q1')).toBeInTheDocument();
    expect(screen.getByTestId('qdro-db-q2')).toBeInTheDocument();
    expect(screen.getByTestId('qdro-db-q3')).toBeInTheDocument();
    expect(screen.getByTestId('qdro-db-q4')).toBeInTheDocument();
    expect(screen.getByTestId('qdro-db-q5')).toBeInTheDocument();
  });
});

describe('QDROBranchDB — Type-A perspective flip (§8.5.3 / §8.2)', () => {
  it('Q1 interestStructure: participant wording references "you" choosing for the alternate payee', () => {
    seedAsset('a1', asset({ userRole: 'participant' }));
    render(<QDROBranchDB assetId="a1" userRole="participant" />);
    const q1 = within(screen.getByTestId('qdro-db-q1'));
    expect(
      q1.getByText(/Are you choosing a separate-interest QDRO/),
    ).toBeInTheDocument();
  });

  it('Q1 interestStructure: alternate-payee wording references the proposed QDRO structure', () => {
    seedAsset('a1', asset({ userRole: 'alternatePayee' }));
    render(<QDROBranchDB assetId="a1" userRole="alternatePayee" />);
    const q1 = within(screen.getByTestId('qdro-db-q1'));
    expect(
      q1.getByText(/Is the proposed QDRO structured as separate interest/),
    ).toBeInTheDocument();
  });

  it('Q2 qpsa: participant wording is about "you" electing', () => {
    seedAsset('a1', asset({ userRole: 'participant' }));
    render(<QDROBranchDB assetId="a1" userRole="participant" />);
    const q2 = within(screen.getByTestId('qdro-db-q2'));
    expect(
      q2.getByText(/Will you elect to designate the alternate payee as QPSA/),
    ).toBeInTheDocument();
  });

  it('Q2 qpsa: alternate-payee wording is about "requiring" QPSA designation', () => {
    seedAsset('a1', asset({ userRole: 'alternatePayee' }));
    render(<QDROBranchDB assetId="a1" userRole="alternatePayee" />);
    const q2 = within(screen.getByTestId('qdro-db-q2'));
    expect(
      q2.getByText(/Are you requiring QPSA designation/),
    ).toBeInTheDocument();
  });

  it('Q3 qjsa: participant wording references the alternate payee receiving QJSA', () => {
    seedAsset('a1', asset({ userRole: 'participant' }));
    render(<QDROBranchDB assetId="a1" userRole="participant" />);
    const q3 = within(screen.getByTestId('qdro-db-q3'));
    expect(
      q3.getByText(/Will the alternate payee receive QJSA/),
    ).toBeInTheDocument();
  });

  it('Q3 qjsa: alternate-payee wording is about "requiring" QJSA designation', () => {
    seedAsset('a1', asset({ userRole: 'alternatePayee' }));
    render(<QDROBranchDB assetId="a1" userRole="alternatePayee" />);
    const q3 = within(screen.getByTestId('qdro-db-q3'));
    expect(
      q3.getByText(/Are you requiring QJSA designation/),
    ).toBeInTheDocument();
  });

  it('userRole fallback: non-participant value (e.g., unknown / null label) resolves to alternate-payee wording', () => {
    seedAsset('a1', asset({ userRole: 'alternatePayee' }));
    render(<QDROBranchDB assetId="a1" userRole={undefined} />);
    const q1 = within(screen.getByTestId('qdro-db-q1'));
    expect(
      q1.getByText(/Is the proposed QDRO structured as separate interest/),
    ).toBeInTheDocument();
  });
});

describe('QDROBranchDB — Type-B single wording (§8.5.3)', () => {
  it('Q4 cola: same wording regardless of perspective', () => {
    seedAsset('a1', asset({ userRole: 'participant' }));
    const { rerender } = render(
      <QDROBranchDB assetId="a1" userRole="participant" />,
    );
    const expected = /Will the alternate payee share in cost-of-living adjustments/;
    expect(within(screen.getByTestId('qdro-db-q4')).getByText(expected))
      .toBeInTheDocument();

    seedAsset('a1', asset({ userRole: 'alternatePayee' }));
    rerender(<QDROBranchDB assetId="a1" userRole="alternatePayee" />);
    expect(within(screen.getByTestId('qdro-db-q4')).getByText(expected))
      .toBeInTheDocument();
  });

  it('Q5 earlyRetirementSubsidy: same wording regardless of perspective', () => {
    seedAsset('a1', asset({ userRole: 'participant' }));
    const { rerender } = render(
      <QDROBranchDB assetId="a1" userRole="participant" />,
    );
    const expected = /If the participant retires early with a subsidized benefit/;
    expect(within(screen.getByTestId('qdro-db-q5')).getByText(expected))
      .toBeInTheDocument();

    seedAsset('a1', asset({ userRole: 'alternatePayee' }));
    rerender(<QDROBranchDB assetId="a1" userRole="alternatePayee" />);
    expect(within(screen.getByTestId('qdro-db-q5')).getByText(expected))
      .toBeInTheDocument();
  });
});

describe('QDROBranchDB — writer persists each of the 5 decision fields (§8.10.2)', () => {
  it('Q1 interestStructure: persists "separate"', () => {
    seedAsset('a1', asset({ userRole: 'participant' }));
    render(<QDROBranchDB assetId="a1" userRole="participant" />);
    const q1 = within(screen.getByTestId('qdro-db-q1'));
    fireEvent.click(q1.getByTestId('wizard-radio-input-separate'));
    expect(getAsset('a1').decisions.interestStructure).toBe('separate');
  });

  it('Q1 interestStructure: persists "shared"', () => {
    seedAsset('a1', asset({ userRole: 'alternatePayee' }));
    render(<QDROBranchDB assetId="a1" userRole="alternatePayee" />);
    const q1 = within(screen.getByTestId('qdro-db-q1'));
    fireEvent.click(q1.getByTestId('wizard-radio-input-shared'));
    expect(getAsset('a1').decisions.interestStructure).toBe('shared');
  });

  it('Q2 qpsa: persists "yes"', () => {
    seedAsset('a1', asset({ userRole: 'participant' }));
    render(<QDROBranchDB assetId="a1" userRole="participant" />);
    const q2 = within(screen.getByTestId('qdro-db-q2'));
    fireEvent.click(q2.getByTestId('wizard-radio-input-yes'));
    expect(getAsset('a1').decisions.qpsa).toBe('yes');
  });

  it('Q2 qpsa: persists "no"', () => {
    seedAsset('a1', asset({ userRole: 'participant' }));
    render(<QDROBranchDB assetId="a1" userRole="participant" />);
    const q2 = within(screen.getByTestId('qdro-db-q2'));
    fireEvent.click(q2.getByTestId('wizard-radio-input-no'));
    expect(getAsset('a1').decisions.qpsa).toBe('no');
  });

  it('Q3 qjsa: persists "yes"', () => {
    seedAsset('a1', asset({ userRole: 'participant' }));
    render(<QDROBranchDB assetId="a1" userRole="participant" />);
    const q3 = within(screen.getByTestId('qdro-db-q3'));
    fireEvent.click(q3.getByTestId('wizard-radio-input-yes'));
    expect(getAsset('a1').decisions.qjsa).toBe('yes');
  });

  it('Q4 cola: persists "yes"', () => {
    seedAsset('a1', asset({ userRole: 'participant' }));
    render(<QDROBranchDB assetId="a1" userRole="participant" />);
    const q4 = within(screen.getByTestId('qdro-db-q4'));
    fireEvent.click(q4.getByTestId('wizard-radio-input-yes'));
    expect(getAsset('a1').decisions.cola).toBe('yes');
  });

  it('Q4 cola: persists "plan_no_cola"', () => {
    seedAsset('a1', asset({ userRole: 'participant' }));
    render(<QDROBranchDB assetId="a1" userRole="participant" />);
    const q4 = within(screen.getByTestId('qdro-db-q4'));
    fireEvent.click(q4.getByTestId('wizard-radio-input-plan_no_cola'));
    expect(getAsset('a1').decisions.cola).toBe('plan_no_cola');
  });

  it('Q5 earlyRetirementSubsidy: persists "yes"', () => {
    seedAsset('a1', asset({ userRole: 'participant' }));
    render(<QDROBranchDB assetId="a1" userRole="participant" />);
    const q5 = within(screen.getByTestId('qdro-db-q5'));
    fireEvent.click(q5.getByTestId('wizard-radio-input-yes'));
    expect(getAsset('a1').decisions.earlyRetirementSubsidy).toBe('yes');
  });

  it('Q5 earlyRetirementSubsidy: persists "not_applicable"', () => {
    seedAsset('a1', asset({ userRole: 'participant' }));
    render(<QDROBranchDB assetId="a1" userRole="participant" />);
    const q5 = within(screen.getByTestId('qdro-db-q5'));
    fireEvent.click(q5.getByTestId('wizard-radio-input-not_applicable'));
    expect(getAsset('a1').decisions.earlyRetirementSubsidy).toBe('not_applicable');
  });
});

describe('QDROBranchDB — every enum option is selectable, incl. not_yet_decided / plan_no_cola / not_applicable', () => {
  it('Q1 interestStructure: all 3 options render', () => {
    seedAsset('a1', asset({ userRole: 'participant' }));
    render(<QDROBranchDB assetId="a1" userRole="participant" />);
    const q1 = within(screen.getByTestId('qdro-db-q1'));
    ['separate', 'shared', 'not_yet_decided'].forEach((v) => {
      expect(q1.getByTestId(`wizard-radio-input-${v}`)).toBeInTheDocument();
    });
  });

  it('Q2 qpsa: all 3 options render', () => {
    seedAsset('a1', asset({ userRole: 'participant' }));
    render(<QDROBranchDB assetId="a1" userRole="participant" />);
    const q2 = within(screen.getByTestId('qdro-db-q2'));
    ['yes', 'no', 'not_yet_decided'].forEach((v) => {
      expect(q2.getByTestId(`wizard-radio-input-${v}`)).toBeInTheDocument();
    });
  });

  it('Q3 qjsa: all 3 options render', () => {
    seedAsset('a1', asset({ userRole: 'participant' }));
    render(<QDROBranchDB assetId="a1" userRole="participant" />);
    const q3 = within(screen.getByTestId('qdro-db-q3'));
    ['yes', 'no', 'not_yet_decided'].forEach((v) => {
      expect(q3.getByTestId(`wizard-radio-input-${v}`)).toBeInTheDocument();
    });
  });

  it('Q4 cola: all 4 options render (incl. plan_no_cola)', () => {
    seedAsset('a1', asset({ userRole: 'participant' }));
    render(<QDROBranchDB assetId="a1" userRole="participant" />);
    const q4 = within(screen.getByTestId('qdro-db-q4'));
    ['yes', 'no', 'plan_no_cola', 'not_yet_decided'].forEach((v) => {
      expect(q4.getByTestId(`wizard-radio-input-${v}`)).toBeInTheDocument();
    });
  });

  it('Q5 earlyRetirementSubsidy: all 4 options render (incl. not_applicable)', () => {
    seedAsset('a1', asset({ userRole: 'participant' }));
    render(<QDROBranchDB assetId="a1" userRole="participant" />);
    const q5 = within(screen.getByTestId('qdro-db-q5'));
    ['yes', 'no', 'not_applicable', 'not_yet_decided'].forEach((v) => {
      expect(q5.getByTestId(`wizard-radio-input-${v}`)).toBeInTheDocument();
    });
  });

  it('not_yet_decided is selectable on every question (it is a valid, non-null capture)', () => {
    const fields = [
      ['qdro-db-q1', 'interestStructure'],
      ['qdro-db-q2', 'qpsa'],
      ['qdro-db-q3', 'qjsa'],
      ['qdro-db-q4', 'cola'],
      ['qdro-db-q5', 'earlyRetirementSubsidy'],
    ];
    for (const [sectionId, field] of fields) {
      seedAsset('a1', asset({ userRole: 'participant' }));
      const { unmount } = render(
        <QDROBranchDB assetId="a1" userRole="participant" />,
      );
      const section = within(screen.getByTestId(sectionId));
      fireEvent.click(section.getByTestId('wizard-radio-input-not_yet_decided'));
      expect(getAsset('a1').decisions[field]).toBe('not_yet_decided');
      unmount();
    }
  });
});

describe('QDROBranchDB — partial capture persists (partial-merge per §8.10.2)', () => {
  it('setting Q3 does not clobber earlier Q1 / Q2', () => {
    seedAsset(
      'a1',
      asset({
        userRole: 'participant',
        decisions: { interestStructure: 'separate', qpsa: 'yes' },
      }),
    );
    render(<QDROBranchDB assetId="a1" userRole="participant" />);
    const q3 = within(screen.getByTestId('qdro-db-q3'));
    fireEvent.click(q3.getByTestId('wizard-radio-input-no'));
    expect(getAsset('a1').decisions).toMatchObject({
      interestStructure: 'separate',
      qpsa: 'yes',
      qjsa: 'no',
    });
  });

  it('a partially-captured asset (3 of 5) remains partial, not overwritten by re-render', () => {
    seedAsset(
      'a1',
      asset({
        userRole: 'alternatePayee',
        decisions: {
          interestStructure: 'shared',
          qpsa: 'no',
          qjsa: 'not_yet_decided',
        },
      }),
    );
    render(<QDROBranchDB assetId="a1" userRole="alternatePayee" />);
    expect(getAsset('a1').decisions).toEqual({
      interestStructure: 'shared',
      qpsa: 'no',
      qjsa: 'not_yet_decided',
    });
  });
});

describe('QDROBranchDB — §8.6.3 PVA-not-run entry callout', () => {
  it('renders the §8.6.3 callout verbatim when pvSource is null', () => {
    seedAsset('a1', asset({ userRole: 'participant', pvSource: null }));
    render(<QDROBranchDB assetId="a1" userRole="participant" />);
    expect(
      screen.getByTestId('qdro-db-pva-not-run-callout'),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        /We don't have a PVA computation for this pension yet\. You can capture your decisions now and run PVA later\. Your decisions and the PVA result will combine in the handoff packet\./,
      ),
    ).toBeInTheDocument();
  });

  it('does NOT render the §8.6.3 callout when pvSource is set (forward-correct for PR-B2)', () => {
    seedAsset(
      'a1',
      asset({
        userRole: 'participant',
        pvSource: { tool: 'pva', assetId: 'p1', generatedAt: '2026-05-01T00:00:00Z' },
      }),
    );
    render(<QDROBranchDB assetId="a1" userRole="participant" />);
    expect(
      screen.queryByTestId('qdro-db-pva-not-run-callout'),
    ).not.toBeInTheDocument();
  });
});

describe('QDROBranchDB — integration via shipped §10.8 / §8.10.3 selectors', () => {
  it('untouched private_db asset → completionState "empty"', () => {
    seedAsset('a1', asset({ userRole: 'participant' }));
    render(<QDROBranchDB assetId="a1" userRole="participant" />);
    expect(deriveCompletionState(getAsset('a1'))).toBe('empty');
  });

  it('all 5 fields captured + pvSource still null → completionState "partial" (§10.8 carve-out)', () => {
    seedAsset('a1', asset({ userRole: 'participant' }));
    render(<QDROBranchDB assetId="a1" userRole="participant" />);
    fireEvent.click(
      within(screen.getByTestId('qdro-db-q1')).getByTestId(
        'wizard-radio-input-separate',
      ),
    );
    fireEvent.click(
      within(screen.getByTestId('qdro-db-q2')).getByTestId(
        'wizard-radio-input-yes',
      ),
    );
    fireEvent.click(
      within(screen.getByTestId('qdro-db-q3')).getByTestId(
        'wizard-radio-input-no',
      ),
    );
    fireEvent.click(
      within(screen.getByTestId('qdro-db-q4')).getByTestId(
        'wizard-radio-input-plan_no_cola',
      ),
    );
    fireEvent.click(
      within(screen.getByTestId('qdro-db-q5')).getByTestId(
        'wizard-radio-input-not_applicable',
      ),
    );
    const a = getAsset('a1');
    expect(a.decisions).toMatchObject({
      interestStructure: 'separate',
      qpsa: 'yes',
      qjsa: 'no',
      cola: 'plan_no_cola',
      earlyRetirementSubsidy: 'not_applicable',
    });
    expect(a.pvSource).toBe(null);
    expect(deriveCompletionState(a)).toBe('partial');
  });
});

describe('QDROBranchDB — a11y radio-group semantics (via WizardRadio primitive)', () => {
  it('each question renders an accessible <fieldset role="radiogroup"> with a labelled legend', () => {
    seedAsset('a1', asset({ userRole: 'participant' }));
    render(<QDROBranchDB assetId="a1" userRole="participant" />);
    const sections = [
      'qdro-db-q1',
      'qdro-db-q2',
      'qdro-db-q3',
      'qdro-db-q4',
      'qdro-db-q5',
    ];
    for (const id of sections) {
      const section = within(screen.getByTestId(id));
      const group = section.getByRole('radiogroup');
      expect(group.tagName).toBe('FIELDSET');
      // legend is referenced via aria-labelledby — confirm both ends present
      const labelledBy = group.getAttribute('aria-labelledby');
      expect(labelledBy).toBeTruthy();
      const legend = document.getElementById(labelledBy);
      expect(legend).toBeTruthy();
      expect(legend.textContent.length).toBeGreaterThan(0);
    }
  });

  it('renders 5 radiogroups (one per question), all keyboard-discoverable', () => {
    seedAsset('a1', asset({ userRole: 'participant' }));
    render(<QDROBranchDB assetId="a1" userRole="participant" />);
    expect(screen.getAllByRole('radiogroup')).toHaveLength(5);
  });

  it('Q1 interestStructure: real <input type="radio"> elements share one group name', () => {
    seedAsset('a1', asset({ userRole: 'participant' }));
    render(<QDROBranchDB assetId="a1" userRole="participant" />);
    const q1 = within(screen.getByTestId('qdro-db-q1'));
    const inputs = ['separate', 'shared', 'not_yet_decided'].map((v) =>
      q1.getByTestId(`wizard-radio-input-${v}`),
    );
    inputs.forEach((el) => expect(el.getAttribute('type')).toBe('radio'));
    const names = new Set(inputs.map((el) => el.getAttribute('name')));
    expect(names.size).toBe(1);
  });
});
