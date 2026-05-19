/**
 * QDROBranchCapture tests — §8.4.1 / Q-B2 / Q-B5 / D6.
 *
 * The routing wrapper. Renders nothing until BOTH classifiers are set
 * (Q-B2). Then routes by planType: dc → QDROBranchDC; ira → QDROBranchIRA;
 * flag-only (gov_civilian/military/state_municipal) → QDGConsultSpecialist
 * (full starter-Q capture is PR4); private_db → nothing (silent, step 6);
 * anything unknown → nothing (fail closed).
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import QDROBranchCapture from '../QDROBranchCapture.jsx';
import { useM5Store } from '@/src/stores/m5Store';

function asset(overrides = {}) {
  return {
    userRole: null,
    planType: null,
    planName: 'Some plan',
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

beforeEach(() => {
  localStorage.clear();
  useM5Store.persist?.rehydrate?.();
  useM5Store.setState((state) => ({
    qdroDecision: { ...state.qdroDecision, assets: {} },
  }));
});

describe('QDROBranchCapture — Q-B2 visibility gate', () => {
  it('renders nothing when planType is null (even if userRole set)', () => {
    seedAsset('a1', asset({ userRole: 'participant' }));
    const { container } = render(
      <QDROBranchCapture assetId="a1" userRole="participant" planType={null} />,
    );
    expect(container).toBeEmptyDOMElement();
  });

  it('renders nothing when userRole is null (even if planType set)', () => {
    seedAsset('a1', asset({ planType: 'dc' }));
    const { container } = render(
      <QDROBranchCapture assetId="a1" userRole={null} planType="dc" />,
    );
    expect(container).toBeEmptyDOMElement();
  });

  it('renders nothing when both classifiers are null', () => {
    seedAsset('a1', asset());
    const { container } = render(
      <QDROBranchCapture assetId="a1" userRole={null} planType={null} />,
    );
    expect(container).toBeEmptyDOMElement();
  });
});

describe('QDROBranchCapture — planType routing (§8.4.1 / D6)', () => {
  it('routes dc → QDROBranchDC', () => {
    seedAsset('a1', asset({ userRole: 'participant', planType: 'dc' }));
    render(
      <QDROBranchCapture assetId="a1" userRole="participant" planType="dc" />,
    );
    expect(screen.getByTestId('qdro-branch-dc')).toBeInTheDocument();
    expect(screen.queryByTestId('qdro-branch-ira')).not.toBeInTheDocument();
  });

  it('routes ira → QDROBranchIRA', () => {
    seedAsset('a1', asset({ userRole: 'participant', planType: 'ira' }));
    render(
      <QDROBranchCapture assetId="a1" userRole="participant" planType="ira" />,
    );
    expect(screen.getByTestId('qdro-branch-ira')).toBeInTheDocument();
    expect(screen.queryByTestId('qdro-branch-dc')).not.toBeInTheDocument();
  });

  it('routes gov_civilian → QDGConsultSpecialist (flag-only, Q-B5)', () => {
    seedAsset('a1', asset({ userRole: 'alternatePayee', planType: 'gov_civilian' }));
    render(
      <QDROBranchCapture
        assetId="a1"
        userRole="alternatePayee"
        planType="gov_civilian"
      />,
    );
    expect(screen.getByTestId('qdg-consult-specialist')).toBeInTheDocument();
  });

  it('routes military → QDGConsultSpecialist (flag-only, Q-B5)', () => {
    seedAsset('a1', asset({ userRole: 'participant', planType: 'military' }));
    render(
      <QDROBranchCapture
        assetId="a1"
        userRole="participant"
        planType="military"
      />,
    );
    expect(screen.getByTestId('qdg-consult-specialist')).toBeInTheDocument();
  });

  it('routes state_municipal → QDGConsultSpecialist (flag-only, Q-B5)', () => {
    seedAsset(
      'a1',
      asset({ userRole: 'participant', planType: 'state_municipal' }),
    );
    render(
      <QDROBranchCapture
        assetId="a1"
        userRole="participant"
        planType="state_municipal"
      />,
    );
    expect(screen.getByTestId('qdg-consult-specialist')).toBeInTheDocument();
  });

  it('private_db renders nothing (silent — step 6 / PVA-dependent)', () => {
    seedAsset('a1', asset({ userRole: 'participant', planType: 'private_db' }));
    const { container } = render(
      <QDROBranchCapture
        assetId="a1"
        userRole="participant"
        planType="private_db"
      />,
    );
    expect(container).toBeEmptyDOMElement();
  });

  it('an unknown planType renders nothing (fail closed)', () => {
    seedAsset('a1', asset({ userRole: 'participant', planType: 'nonsense' }));
    const { container } = render(
      <QDROBranchCapture
        assetId="a1"
        userRole="participant"
        planType="nonsense"
      />,
    );
    expect(container).toBeEmptyDOMElement();
  });
});

describe('QDROBranchCapture — passes userRole through to DC', () => {
  it('participant DC: receipt-method (Q2) is not rendered', () => {
    seedAsset('a1', asset({ userRole: 'participant', planType: 'dc' }));
    render(
      <QDROBranchCapture assetId="a1" userRole="participant" planType="dc" />,
    );
    expect(screen.getByTestId('qdro-dc-q1')).toBeInTheDocument();
    expect(screen.queryByTestId('qdro-dc-q2')).not.toBeInTheDocument();
  });

  it('alternatePayee DC: receipt-method (Q2) is rendered', () => {
    seedAsset('a1', asset({ userRole: 'alternatePayee', planType: 'dc' }));
    render(
      <QDROBranchCapture
        assetId="a1"
        userRole="alternatePayee"
        planType="dc"
      />,
    );
    expect(screen.getByTestId('qdro-dc-q2')).toBeInTheDocument();
  });
});
