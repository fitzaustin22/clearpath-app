/**
 * QDROAssetCard — PR-B2-α §8.6.4 wiring tests.
 *
 * The parent (QDROAssetCard) computes `covertureApplies` from the
 * same-key PVA results and passes it through to QDGAttorneyReviewRequired
 * when the callout is mounted. Per D3:
 *
 *   - planType === 'private_db' AND results.coverture != null → true
 *   - planType !== 'private_db' (dc, ira, gov_civilian, military,
 *     state_municipal) → never true, regardless of PVA results
 *   - no PVA results, or results.coverture === null → false
 *
 * Mount of QDGAttorneyReviewRequired itself is gated by
 * `hasCapturedDecision(asset.decisions)` per the existing parent logic;
 * these tests seed at least one decision so the callout renders.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import QDROAssetCard from '../QDROAssetCard.jsx';
import { useM5Store } from '@/src/stores/m5Store';

function seedQDRO(assetId, asset) {
  useM5Store.setState((s) => ({
    qdroDecision: {
      ...s.qdroDecision,
      assets: { ...s.qdroDecision.assets, [assetId]: asset },
    },
  }));
}

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

function asset(overrides = {}) {
  return {
    userRole: 'participant',
    planType: 'private_db',
    planName: 'ACME Pension',
    employer: 'ACME',
    decisions: { interestStructure: 'separate' }, // at least one captured
    pvSource: null,
    _prePopSources: {},
    metadata: { formulaId: null, citations: [], qdroPacketGeneratedAt: null },
    ...overrides,
  };
}

const RECAP =
  'Only the marital portion of this pension is divisible — the share earned during marriage. See PVA report for the full coverture calculation.';

beforeEach(() => {
  localStorage.clear();
  useM5Store.setState((s) => ({
    qdroDecision: { ...s.qdroDecision, assets: {} },
    pensionValuation: { ...s.pensionValuation, assets: {} },
  }));
});

describe('QDROAssetCard — §8.6.4 covertureApplies wiring (private_db)', () => {
  it('renders the recap when planType=private_db AND PVA results carry coverture', () => {
    seedQDRO('a1', asset({ planType: 'private_db' }));
    seedPVA('a1', {
      path: 'tier_3',
      formulaId: 'pva_db_tier3_coverture_v1',
      pv: { total: { best: 5, low: 4, high: 6 }, marital: { best: 2, low: 1, high: 3 } },
      coverture: { fraction: 0.4 },
      maritalPortion: null,
      metadata: {},
    });

    render(<QDROAssetCard assetId="a1" />);

    expect(
      screen.getByTestId('qdg-attorney-review-required-coverture-recap'),
    ).toBeInTheDocument();
    expect(
      screen.getByTestId('qdg-attorney-review-required-coverture-recap').textContent,
    ).toContain(RECAP);
  });

  it('does NOT render the recap when planType=private_db but PVA results are no-coverture (tier 1/2)', () => {
    seedQDRO('a1', asset({ planType: 'private_db' }));
    seedPVA('a1', {
      path: 'tier_2',
      formulaId: 'pva_db_tier2_v1',
      pv: { best: 400000, low: 360000, high: 450000 },
      coverture: null,
      maritalPortion: null,
      metadata: {},
    });

    render(<QDROAssetCard assetId="a1" />);

    expect(
      screen.queryByTestId('qdg-attorney-review-required-coverture-recap'),
    ).not.toBeInTheDocument();
  });

  it('does NOT render the recap when planType=private_db but no PVA results exist', () => {
    seedQDRO('a1', asset({ planType: 'private_db' }));
    // No PVA results seeded.

    render(<QDROAssetCard assetId="a1" />);

    expect(
      screen.queryByTestId('qdg-attorney-review-required-coverture-recap'),
    ).not.toBeInTheDocument();
  });
});

describe('QDROAssetCard — §8.6.4 covertureApplies stays false for non-private_db assets', () => {
  it.each([['dc'], ['ira'], ['gov_civilian'], ['military'], ['state_municipal']])(
    'never renders the recap for planType=%s, even when PVA results at same key carry coverture',
    (planType) => {
      seedQDRO('a1', asset({ planType }));
      // Defensive: even if PVA somehow had coverture results at the same
      // key (it should not, but hand-crafted state shouldn't trigger
      // coverture recap on a non-private_db asset).
      seedPVA('a1', {
        path: 'tier_3',
        formulaId: 'pva_db_tier3_coverture_v1',
        pv: { total: { best: 5, low: 4, high: 6 }, marital: { best: 2, low: 1, high: 3 } },
        coverture: { fraction: 0.4 },
        maritalPortion: null,
        metadata: {},
      });

      render(<QDROAssetCard assetId="a1" />);

      expect(
        screen.queryByTestId('qdg-attorney-review-required-coverture-recap'),
      ).not.toBeInTheDocument();
    },
  );
});
