/**
 * QDROClassifier tests — orchestrator (§8.1.4 pre-flow, §8.2.4 banner,
 * Q-C1/Q-C3 layout). On-mount one-shot pre-pop (PVA/HDA freshness-gate
 * idiom), empty-state vs asset-list branching, stable M2-order rendering,
 * idempotency, no continue affordance (Q-C7).
 *
 * Pre-pop assertions are behavioral (asset keys / planType / source) — NOT
 * _prePopSources timestamp deep-equality — to stay deterministic against
 * PR1's known wall-clock-timestamp idempotency flake (out of PR2 scope).
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import QDROClassifier from '../QDROClassifier.jsx';
import * as barrel from '../index.js';
import { useM2Store } from '@/src/stores/m2Store';
import { useM5Store } from '@/src/stores/m5Store';

function seedM2(items) {
  useM2Store.setState((state) => ({
    maritalEstateInventory: { ...state.maritalEstateInventory, items },
  }));
}

function seedQDRO(assets) {
  useM5Store.setState((state) => ({
    qdroDecision: { ...state.qdroDecision, assets },
  }));
}

function qdroAssets() {
  return useM5Store.getState().qdroDecision.assets;
}

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

beforeEach(() => {
  localStorage.clear();
  useM2Store.persist?.rehydrate?.();
  useM5Store.persist?.rehydrate?.();
  seedM2([]);
  seedQDRO({});
});

describe('QDROClassifier — empty M2 (§8.1.4 / TC-QDG-9)', () => {
  it('renders the empty state when M2 has no retirement/pension items', () => {
    seedM2([{ id: 'c1', category: 'depositAccounts', label: 'Checking' }]);
    render(<QDROClassifier />);
    expect(screen.getByTestId('qdro-empty-state')).toBeInTheDocument();
    expect(screen.queryByTestId('qdro-progress-header')).not.toBeInTheDocument();
    expect(screen.queryByTestId('qdro-asset-card')).not.toBeInTheDocument();
  });

  it('"Add asset here" creates an asset and transitions to the classifier', () => {
    seedM2([]);
    render(<QDROClassifier />);
    fireEvent.click(screen.getByRole('button', { name: /add asset here/i }));
    expect(screen.getByTestId('qdro-asset-card')).toBeInTheDocument();
    expect(screen.queryByTestId('qdro-empty-state')).not.toBeInTheDocument();
    expect(Object.keys(qdroAssets())).toHaveLength(1);
  });
});

describe('QDROClassifier — on-mount pre-pop (§8.3.4)', () => {
  it('seeds the slice from M2 retirement/pension items on mount', () => {
    seedM2([
      { id: 'pen1', category: 'pensions', label: 'ACME Pension' },
      { id: 'ret1', category: 'retirement', label: 'ACME 401(k)' },
    ]);
    render(<QDROClassifier />);
    const assets = qdroAssets();
    expect(Object.keys(assets).sort()).toEqual(['pen1', 'ret1']);
  });

  it('maps M2 category to the §8.3.4 default planType', () => {
    seedM2([
      { id: 'pen1', category: 'pensions', label: 'P' },
      { id: 'ret1', category: 'retirement', label: 'R' },
    ]);
    render(<QDROClassifier />);
    const assets = qdroAssets();
    expect(assets.pen1.planType).toBe('private_db');
    expect(assets.ret1.planType).toBe('dc');
  });

  it('records pre-pop provenance source on seeded assets', () => {
    seedM2([
      { id: 'pen1', category: 'pensions', label: 'P' },
      { id: 'ret1', category: 'retirement', label: 'R' },
    ]);
    render(<QDROClassifier />);
    const assets = qdroAssets();
    expect(assets.pen1._prePopSources.planType.source).toBe('m2.pensionClaim');
    expect(assets.ret1._prePopSources.planType.source).toBe(
      'm2.retirementAsset',
    );
  });

  it('ignores non-retirement M2 items', () => {
    seedM2([
      { id: 'pen1', category: 'pensions', label: 'P' },
      { id: 'cash1', category: 'depositAccounts', label: 'Checking' },
      { id: 're1', category: 'realEstate', label: 'House' },
    ]);
    render(<QDROClassifier />);
    expect(Object.keys(qdroAssets())).toEqual(['pen1']);
  });

  it('does NOT re-trigger pre-pop when the slice already has assets (idempotent)', () => {
    seedQDRO({
      existing: asset({ userRole: 'participant', planType: 'dc' }),
    });
    seedM2([{ id: 'pen1', category: 'pensions', label: 'P' }]);
    render(<QDROClassifier />);
    const assets = qdroAssets();
    expect(Object.keys(assets)).toEqual(['existing']);
    expect(assets.existing.userRole).toBe('participant');
  });
});

describe('QDROClassifier — asset-list layout (Q-C1/Q-C3)', () => {
  it('renders a progress header and one card per asset', () => {
    seedM2([
      { id: 'pen1', category: 'pensions', label: 'P' },
      { id: 'ret1', category: 'retirement', label: 'R' },
    ]);
    render(<QDROClassifier />);
    expect(screen.getByTestId('qdro-progress-header')).toBeInTheDocument();
    expect(screen.getAllByTestId('qdro-asset-card')).toHaveLength(2);
  });

  it('renders cards in stable M2 insertion order', () => {
    seedM2([
      { id: 'b_pen', category: 'pensions', label: 'Bravo Pension' },
      { id: 'a_ret', category: 'retirement', label: 'Alpha 401(k)' },
    ]);
    render(<QDROClassifier />);
    const headings = screen.getAllByRole('heading', { level: 3 });
    expect(headings[0]).toHaveTextContent('Bravo Pension');
    expect(headings[1]).toHaveTextContent('Alpha 401(k)');
  });

  it('passes the matching M2 item to each card (currentValue shows)', () => {
    seedM2([
      {
        id: 'ret1',
        category: 'retirement',
        label: 'ACME 401(k)',
        currentValue: 250000,
      },
    ]);
    render(<QDROClassifier />);
    expect(screen.getByText(/250,000/)).toBeInTheDocument();
  });

  it('shows the mixed-perspective banner when assets span perspectives', () => {
    seedQDRO({
      a1: asset({ userRole: 'participant', planType: 'dc' }),
      a2: asset({ userRole: 'alternatePayee', planType: 'ira' }),
    });
    render(<QDROClassifier />);
    expect(
      screen.getByTestId('qdro-mixed-perspective-banner'),
    ).toBeInTheDocument();
  });

  it('hides the mixed-perspective banner for a single perspective', () => {
    seedQDRO({
      a1: asset({ userRole: 'participant', planType: 'dc' }),
      a2: asset({ userRole: 'participant', planType: 'ira' }),
    });
    render(<QDROClassifier />);
    expect(
      screen.queryByTestId('qdro-mixed-perspective-banner'),
    ).not.toBeInTheDocument();
  });

  it('renders NO continue affordance (Q-C7)', () => {
    seedM2([{ id: 'pen1', category: 'pensions', label: 'P' }]);
    render(<QDROClassifier />);
    expect(
      screen.queryByRole('button', { name: /continue/i }),
    ).not.toBeInTheDocument();
    expect(screen.queryByText(/coming soon/i)).not.toBeInTheDocument();
  });

  it('exposes a stable root test id', () => {
    seedM2([{ id: 'pen1', category: 'pensions', label: 'P' }]);
    render(<QDROClassifier />);
    expect(screen.getByTestId('qdro-classifier')).toBeInTheDocument();
  });
});

describe('QDROClassifier — qdg_not_legal_order top-of-page callout (Q-B7 / §8.9.1)', () => {
  it('renders the not-legal-order callout at tool entry when assets exist', () => {
    seedM2([{ id: 'pen1', category: 'pensions', label: 'P' }]);
    render(<QDROClassifier />);
    expect(screen.getByTestId('qdg-not-legal-order')).toBeInTheDocument();
  });

  it('renders the not-legal-order callout even in the empty state', () => {
    seedM2([]);
    seedQDRO({});
    render(<QDROClassifier />);
    expect(screen.getByTestId('qdg-not-legal-order')).toBeInTheDocument();
  });

  it('places the callout above the asset list (top-of-page, Q-B7)', () => {
    seedM2([{ id: 'pen1', category: 'pensions', label: 'P' }]);
    render(<QDROClassifier />);
    const callout = screen.getByTestId('qdg-not-legal-order');
    const card = screen.getByTestId('qdro-asset-card');
    expect(callout.compareDocumentPosition(card)).toBe(
      Node.DOCUMENT_POSITION_FOLLOWING,
    );
  });
});

describe('QDROClassifier — barrel', () => {
  it('re-exports QDROClassifier (default + named) and the subcomponents', () => {
    expect(barrel.default).toBe(QDROClassifier);
    expect(barrel.QDROClassifier).toBe(QDROClassifier);
    expect(typeof barrel.QDROEmptyState).toBe('function');
    expect(typeof barrel.QDROProgressHeader).toBe('function');
    expect(typeof barrel.QDROMixedPerspectiveBanner).toBe('function');
    expect(typeof barrel.QDROAssetCard).toBe('function');
    expect(typeof barrel.QDROStillNotSureDiagnostic).toBe('function');
  });

  it('re-exports the PR3 branch-capture + education + callout components', () => {
    expect(typeof barrel.QDROBranchCapture).toBe('function');
    expect(typeof barrel.QDROBranchDC).toBe('function');
    expect(typeof barrel.QDROBranchIRA).toBe('function');
    expect(typeof barrel.QDROWhyThisMatters).toBe('function');
    expect(typeof barrel.QDGNotLegalOrder).toBe('function');
    expect(typeof barrel.QDGAttorneyReviewRequired).toBe('function');
    expect(typeof barrel.QDGConsultSpecialist).toBe('function');
  });
});
