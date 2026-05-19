/**
 * QDROAssetCard tests — §8.2 perspective + §8.3 plan-type classifiers,
 * §8.3.4/§10.7 pre-pop provenance, Q-C2 (both on one screen) / Q-C7
 * (classified end-state, no continue affordance).
 *
 * setQDROClassifiers writes BOTH userRole+planType, so each change handler
 * must pass the current sibling value through (verified below). §10.7
 * clear-on-override is honored at the presentation layer: the pre-pop
 * badge hides once the current planType no longer matches the value its
 * _prePopSources.source implies (no PR1 setter clears _prePopSources, and
 * stores are out of PR2 scope).
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import QDROAssetCard from '../QDROAssetCard.jsx';
import { useM5Store } from '@/src/stores/m5Store';

function asset(overrides = {}) {
  return {
    userRole: null,
    planType: null,
    planName: null,
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

describe('QDROAssetCard — card chrome (§8.7.4 header)', () => {
  it('exposes a stable root test id', () => {
    seedAsset('a1', asset());
    render(<QDROAssetCard assetId="a1" />);
    expect(screen.getByTestId('qdro-asset-card')).toBeInTheDocument();
  });

  it('renders inside a foundation WizardCard', () => {
    seedAsset('a1', asset());
    render(<QDROAssetCard assetId="a1" />);
    expect(screen.getByTestId('wizard-card')).toBeInTheDocument();
  });

  it('renders the asset plan name and employer in the header', () => {
    seedAsset(
      'a1',
      asset({ planName: 'MegaCorp 401(k)', employer: 'Globex Industries' }),
    );
    render(<QDROAssetCard assetId="a1" />);
    expect(screen.getByText('MegaCorp 401(k)')).toBeInTheDocument();
    expect(screen.getByText('Globex Industries')).toBeInTheDocument();
  });

  it('renders the M2 currentValue when an m2Item is supplied', () => {
    seedAsset('a1', asset({ planName: 'Plan A' }));
    render(
      <QDROAssetCard assetId="a1" m2Item={{ id: 'a1', currentValue: 250000 }} />,
    );
    expect(screen.getByText(/250,000/)).toBeInTheDocument();
  });

  it('falls back gracefully when planName/employer are absent', () => {
    seedAsset('a1', asset());
    expect(() => render(<QDROAssetCard assetId="a1" />)).not.toThrow();
    expect(screen.getByTestId('qdro-asset-card')).toBeInTheDocument();
  });

  it('renders nothing (no crash) when the asset is absent from the store', () => {
    const { container } = render(<QDROAssetCard assetId="missing" />);
    expect(screen.queryByTestId('qdro-asset-card')).not.toBeInTheDocument();
    expect(container).toBeEmptyDOMElement();
  });
});

describe('QDROAssetCard — perspective classifier (§8.2)', () => {
  it('renders a segmented perspective control with both roles', () => {
    seedAsset('a1', asset());
    render(<QDROAssetCard assetId="a1" />);
    expect(screen.getByTestId('wizard-radio-input-participant')).toBeInTheDocument();
    expect(
      screen.getByTestId('wizard-radio-input-alternatePayee'),
    ).toBeInTheDocument();
  });

  it('reflects the current userRole from the store as the selection', () => {
    seedAsset('a1', asset({ userRole: 'alternatePayee' }));
    render(<QDROAssetCard assetId="a1" />);
    expect(screen.getByTestId('wizard-radio-input-alternatePayee')).toBeChecked();
  });

  it('selecting a perspective sets userRole and PRESERVES existing planType', () => {
    seedAsset('a1', asset({ planType: 'dc' }));
    render(<QDROAssetCard assetId="a1" />);
    fireEvent.click(screen.getByTestId('wizard-radio-input-participant'));
    expect(getAsset('a1').userRole).toBe('participant');
    expect(getAsset('a1').planType).toBe('dc');
  });

  it('surfaces the §8.2.2 participant role definition', () => {
    seedAsset('a1', asset());
    render(<QDROAssetCard assetId="a1" />);
    expect(
      screen.getByText(
        'This plan covers your employment. You are dividing your own plan.',
      ),
    ).toBeInTheDocument();
  });

  it('surfaces the §8.2.2 alternate-payee role definition', () => {
    seedAsset('a1', asset());
    render(<QDROAssetCard assetId="a1" />);
    expect(
      screen.getByText(
        "This plan covers your spouse's employment. You are receiving a portion of your spouse's plan.",
      ),
    ).toBeInTheDocument();
  });
});

describe('QDROAssetCard — plan-type classifier (§8.3)', () => {
  it('renders all 6 §8.3.2 plan-type choices', () => {
    seedAsset('a1', asset());
    render(<QDROAssetCard assetId="a1" />);
    [
      'db_pension',
      'account_balance',
      'ira',
      'federal_civilian',
      'military',
      'state_municipal',
    ].forEach((id) => {
      expect(screen.getByTestId(`wizard-radio-input-${id}`)).toBeInTheDocument();
    });
  });

  it('renders the spec-locked label for each plan-type choice', () => {
    seedAsset('a1', asset());
    render(<QDROAssetCard assetId="a1" />);
    expect(
      screen.getByText(/defined benefit \/ DB/i),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/Account-balance plan: 401\(k\), 403\(b\), 457\(b\)/),
    ).toBeInTheDocument();
    expect(screen.getByText(/IRA \(Traditional, Roth, SEP, SIMPLE\)/)).toBeInTheDocument();
  });

  it('every stacked plan-type option has a description (no WizardRadio dev warn)', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    seedAsset('a1', asset());
    render(<QDROAssetCard assetId="a1" />);
    const radioWarn = warn.mock.calls.find(
      (c) => typeof c[0] === 'string' && c[0].includes('WizardRadio'),
    );
    expect(radioWarn).toBeUndefined();
    warn.mockRestore();
  });

  it('each plan-type option exposes an info tooltip control (§8.3.5)', () => {
    seedAsset('a1', asset());
    render(<QDROAssetCard assetId="a1" />);
    expect(screen.getByTestId('wizard-radio-info-ira')).toBeInTheDocument();
    expect(
      screen.getByTestId('wizard-radio-info-federal_civilian'),
    ).toBeInTheDocument();
  });

  it('the IRA tooltip clarifies it is NOT a QDRO (§8.8.1)', () => {
    seedAsset('a1', asset());
    render(<QDROAssetCard assetId="a1" />);
    fireEvent.click(screen.getByTestId('wizard-radio-info-ira'));
    expect(
      screen.getByTestId('wizard-radio-tooltip-ira'),
    ).toHaveTextContent(/not a QDRO/i);
  });

  it('reflects the current planType from the store as the selected radio', () => {
    seedAsset('a1', asset({ planType: 'dc' }));
    render(<QDROAssetCard assetId="a1" />);
    // planType 'dc' ↔ radio choice id 'account_balance' (§8.3.3)
    expect(screen.getByTestId('wizard-radio-input-account_balance')).toBeChecked();
  });

  it('selecting a plan-type radio routes choice→planType and PRESERVES userRole', () => {
    seedAsset('a1', asset({ userRole: 'participant' }));
    render(<QDROAssetCard assetId="a1" />);
    fireEvent.click(screen.getByTestId('wizard-radio-input-account_balance'));
    expect(getAsset('a1').planType).toBe('dc');
    expect(getAsset('a1').userRole).toBe('participant');
  });

  it('selecting the DB pension radio routes to planType private_db', () => {
    seedAsset('a1', asset());
    render(<QDROAssetCard assetId="a1" />);
    fireEvent.click(screen.getByTestId('wizard-radio-input-db_pension'));
    expect(getAsset('a1').planType).toBe('private_db');
  });
});

describe('QDROAssetCard — pre-pop provenance badge (§8.3.4 / §10.7)', () => {
  it('shows the M2 pension-claim badge when planType is pre-popped from a pension claim', () => {
    seedAsset(
      'a1',
      asset({
        planType: 'private_db',
        _prePopSources: {
          planType: { source: 'm2.pensionClaim', timestamp: 't' },
        },
      }),
    );
    render(<QDROAssetCard assetId="a1" />);
    expect(
      screen.getByText('from M2 pension claim — review or override'),
    ).toBeInTheDocument();
  });

  it('shows the M2 retirement-asset badge when planType is pre-popped from a retirement asset', () => {
    seedAsset(
      'a1',
      asset({
        planType: 'dc',
        _prePopSources: {
          planType: { source: 'm2.retirementAsset', timestamp: 't' },
        },
      }),
    );
    render(<QDROAssetCard assetId="a1" />);
    expect(
      screen.getByText('from M2 retirement asset — review or override'),
    ).toBeInTheDocument();
  });

  it('shows no pre-pop badge when there is no _prePopSources entry', () => {
    seedAsset('a1', asset({ planType: 'dc' }));
    render(<QDROAssetCard assetId="a1" />);
    expect(screen.queryByText(/review or override/i)).not.toBeInTheDocument();
  });

  it('clears the badge once the user overrides planType (§10.7)', () => {
    seedAsset(
      'a1',
      asset({
        planType: 'dc',
        _prePopSources: {
          planType: { source: 'm2.retirementAsset', timestamp: 't' },
        },
      }),
    );
    render(<QDROAssetCard assetId="a1" />);
    expect(
      screen.getByText('from M2 retirement asset — review or override'),
    ).toBeInTheDocument();
    // Override DC → IRA: current planType no longer matches the pre-pop
    // source's implied value, so the badge clears (§10.7).
    fireEvent.click(screen.getByTestId('wizard-radio-input-ira'));
    expect(screen.queryByText(/review or override/i)).not.toBeInTheDocument();
  });
});

describe('QDROAssetCard — diagnostic integration (Q-C6)', () => {
  it('renders the "Still not sure?" diagnostic below the plan-type group', () => {
    seedAsset('a1', asset());
    render(<QDROAssetCard assetId="a1" />);
    expect(screen.getByTestId('qdro-still-not-sure')).toBeInTheDocument();
  });

  it('accepting a diagnostic best guess sets planType and preserves userRole', () => {
    seedAsset('a1', asset({ userRole: 'alternatePayee' }));
    render(<QDROAssetCard assetId="a1" />);
    fireEvent.click(screen.getByRole('button', { name: /still not sure/i }));
    fireEvent.click(screen.getByTestId('wizard-radio-input-q1_yes')); // pays monthly
    fireEvent.click(screen.getByTestId('wizard-radio-input-q2_no')); // no balance
    fireEvent.click(screen.getByRole('button', { name: /see best guess/i }));
    fireEvent.click(
      screen.getByRole('button', { name: /use this classification/i }),
    );
    expect(getAsset('a1').planType).toBe('private_db'); // db_pension → private_db
    expect(getAsset('a1').userRole).toBe('alternatePayee');
  });
});

describe('QDROAssetCard — completion state (Q-C7)', () => {
  it('shows a classified indicator when BOTH classifiers are set', () => {
    seedAsset('a1', asset({ userRole: 'participant', planType: 'dc' }));
    render(<QDROAssetCard assetId="a1" />);
    expect(screen.getByTestId('qdro-asset-card-classified')).toBeInTheDocument();
  });

  it('does not show the classified indicator when only one classifier is set', () => {
    seedAsset('a1', asset({ userRole: 'participant' }));
    render(<QDROAssetCard assetId="a1" />);
    expect(
      screen.queryByTestId('qdro-asset-card-classified'),
    ).not.toBeInTheDocument();
  });

  it('renders NO continue affordance / coming-soon placeholder (Q-C7)', () => {
    seedAsset('a1', asset({ userRole: 'participant', planType: 'dc' }));
    render(<QDROAssetCard assetId="a1" />);
    expect(
      screen.queryByRole('button', { name: /continue/i }),
    ).not.toBeInTheDocument();
    expect(screen.queryByText(/coming soon/i)).not.toBeInTheDocument();
  });
});
