/**
 * QDROBranchDBPVDisplay — §8.6.2 per-perspective PV display tests.
 *
 * Architect-locked matrix (D3 — table is canonical):
 *
 *   No coverture (results.coverture === null):
 *     Both perspectives: headline = full PV with low/high range. No secondary.
 *
 *   Coverture (results.coverture !== null):
 *     Both perspectives:
 *       headline = marital PV with low/high range, labeled "marital portion"
 *       secondary = full PV in a collapsible labeled "for context: total PV"
 *     Alternate-payee variant additionally surfaces the LOCKED line:
 *       "Only the marital portion is on the negotiating table. The non-marital portion is your former spouse's separate property."
 *     Participant variant does NOT include that line.
 *
 *   `getHeadlinePV(results) == null` (no usable results — e.g. flag-only,
 *   missing results, or pre-reconciliation transient):
 *     Component renders nothing. The §8.6.3 callout (shipped) owns the null path.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import QDROBranchDBPVDisplay from '../QDROBranchDBPVDisplay.jsx';
import { useM5Store } from '@/src/stores/m5Store';

function seedPVA(assetId, results) {
  useM5Store.setState((s) => ({
    pensionValuation: {
      ...s.pensionValuation,
      assets: {
        ...s.pensionValuation.assets,
        [assetId]: { ...(s.pensionValuation.assets[assetId] ?? {}), results },
      },
    },
  }));
}

function clearPVA() {
  useM5Store.setState((s) => ({
    pensionValuation: { ...s.pensionValuation, assets: {} },
  }));
}

function nonCovertureResults(formulaId = 'pva_db_tier2_v1') {
  return {
    path: 'tier_2',
    formulaId,
    pv: { best: 400000, low: 360000, high: 450000 },
    coverture: null,
    maritalPortion: null,
    metadata: { formulaId, path: 'tier_2', citations: [] },
  };
}

function covertureResults(formulaId = 'pva_db_tier3_coverture_v1') {
  return {
    path: 'tier_3',
    formulaId,
    pv: {
      total: { best: 500000, low: 450000, high: 550000 },
      marital: { best: 200000, low: 180000, high: 220000 },
    },
    coverture: {
      fraction: 0.4,
      numeratorMonths: 120,
      denominatorMonths: 300,
      maritalServiceStart: '2010-01-01',
      maritalServiceEnd: '2020-01-01',
    },
    maritalPortion: null,
    metadata: { formulaId, path: 'tier_3', citations: [] },
  };
}

function flagOnlyResults() {
  return {
    path: 'flag_only',
    formulaId: null,
    pv: null,
    coverture: null,
    maritalPortion: null,
    metadata: {},
  };
}

beforeEach(() => {
  localStorage.clear();
  clearPVA();
});

describe('QDROBranchDBPVDisplay — no-coverture (both perspectives identical)', () => {
  it.each([['participant'], ['alternatePayee']])(
    'renders the full PV headline + low/high range with NO secondary (perspective=%s)',
    (perspective) => {
      seedPVA('a1', nonCovertureResults());
      render(<QDROBranchDBPVDisplay assetId="a1" perspective={perspective} />);

      const block = screen.getByTestId('qdro-db-pv-display');
      expect(block).toBeInTheDocument();
      expect(block.textContent).toContain('$400,000');
      expect(block.textContent).toContain('$360,000');
      expect(block.textContent).toContain('$450,000');
      // No marital-portion label, no collapsible chrome.
      expect(block.textContent).not.toContain('marital portion');
      expect(
        screen.queryByTestId('qdro-db-pv-display-collapsible-toggle'),
      ).not.toBeInTheDocument();
    },
  );
});

describe('QDROBranchDBPVDisplay — coverture-applies (both perspectives)', () => {
  it.each([['participant'], ['alternatePayee']])(
    'renders marital headline + range labeled "marital portion" and a collapsible "for context: total PV" (perspective=%s)',
    (perspective) => {
      seedPVA('a1', covertureResults());
      render(<QDROBranchDBPVDisplay assetId="a1" perspective={perspective} />);

      const block = screen.getByTestId('qdro-db-pv-display');
      // Marital headline + range
      expect(block.textContent).toContain('marital portion');
      expect(block.textContent).toContain('$200,000');
      expect(block.textContent).toContain('$180,000');
      expect(block.textContent).toContain('$220,000');

      // Collapsible toggle present, region hidden by default
      const toggle = screen.getByTestId('qdro-db-pv-display-collapsible-toggle');
      expect(toggle).toHaveTextContent(/for context: total PV/i);
      expect(toggle).toHaveAttribute('aria-expanded', 'false');
      expect(
        screen.queryByTestId('qdro-db-pv-display-collapsible-region'),
      ).not.toBeInTheDocument();
    },
  );

  it('shows total PV + range when the collapsible is expanded (keyboard-operable button)', () => {
    seedPVA('a1', covertureResults());
    render(<QDROBranchDBPVDisplay assetId="a1" perspective="alternatePayee" />);

    const toggle = screen.getByTestId('qdro-db-pv-display-collapsible-toggle');
    expect(toggle.tagName).toBe('BUTTON'); // real button, keyboard-operable
    expect(toggle).toHaveAttribute('aria-controls');
    fireEvent.click(toggle);

    expect(toggle).toHaveAttribute('aria-expanded', 'true');
    const region = screen.getByTestId('qdro-db-pv-display-collapsible-region');
    expect(region.id).toBe(toggle.getAttribute('aria-controls'));
    expect(region.textContent).toContain('$500,000');
    expect(region.textContent).toContain('$450,000');
    expect(region.textContent).toContain('$550,000');
  });

  it('alternate-payee variant surfaces the LOCKED non-marital-property line', () => {
    seedPVA('a1', covertureResults());
    render(<QDROBranchDBPVDisplay assetId="a1" perspective="alternatePayee" />);

    fireEvent.click(screen.getByTestId('qdro-db-pv-display-collapsible-toggle'));
    const region = screen.getByTestId('qdro-db-pv-display-collapsible-region');
    expect(region.textContent).toContain(
      "Only the marital portion is on the negotiating table. The non-marital portion is your former spouse's separate property.",
    );
  });

  it('participant variant does NOT include the AP-only LOCKED line (D3)', () => {
    seedPVA('a1', covertureResults());
    render(<QDROBranchDBPVDisplay assetId="a1" perspective="participant" />);

    fireEvent.click(screen.getByTestId('qdro-db-pv-display-collapsible-toggle'));
    const region = screen.getByTestId('qdro-db-pv-display-collapsible-region');
    expect(region.textContent).not.toContain('Only the marital portion is on the negotiating table');
  });
});

describe('QDROBranchDBPVDisplay — defensive: no usable PV → renders nothing', () => {
  it('renders nothing when there are no PVA results at the asset key', () => {
    // No PVA results seeded.
    const { container } = render(
      <QDROBranchDBPVDisplay assetId="a1" perspective="participant" />,
    );
    expect(container.firstChild).toBeNull();
  });

  it('renders nothing when PVA result is flag-only (pv === null)', () => {
    seedPVA('a1', flagOnlyResults());
    const { container } = render(
      <QDROBranchDBPVDisplay assetId="a1" perspective="alternatePayee" />,
    );
    expect(container.firstChild).toBeNull();
  });
});
