'use client';

/**
 * AssetPicker — pension-claim selector for the PVA orchestrator.
 *
 * Filters m2Store's marital-estate-inventory items by `category === 'pensions'`
 * per §7.5 plan-type coverage. Each pension claim becomes a button; clicking
 * selects that claim's id for PVA computation.
 *
 * Per §7.6.4 each asset's PVA state lives at `m5Store.pensionValuation.assets[assetId]`;
 * a "(valued)" marker surfaces beside claims with a non-null `results` slot.
 *
 * Brand-token discipline per LL-7: inline `style={{}}` only; no Tailwind utility
 * chains. Selector discipline per LL-9: primitive selectors only; `.filter()` is
 * lifted out into `useMemo` rather than inlined into a Zustand selector callback.
 */

import { useMemo } from 'react';
import { useM2Store } from '@/src/stores/m2Store';
import { useM5Store } from '@/src/stores/m5Store';
import { T } from '@/src/lib/brand/tokens';

/**
 * @param {object} props
 * @param {string | null} props.selectedAssetId
 * @param {(assetId: string) => void} props.onSelect
 */
export default function AssetPicker({ selectedAssetId, onSelect }) {
  // LL-9: primitive selector, no object literal, no inline array methods.
  const items = useM2Store((s) => s.maritalEstateInventory?.items);
  const assetsBySlice = useM5Store((s) => s.pensionValuation?.assets);

  // Derive the pension subset via useMemo so the filtered array's identity
  // is stable per `items` snapshot, not per render.
  const pensionClaims = useMemo(() => {
    if (!Array.isArray(items)) return [];
    return items.filter((item) => item && item.category === 'pensions');
  }, [items]);

  if (pensionClaims.length === 0) {
    return (
      <div
        style={{
          fontFamily: T.FONT_BODY,
          color: T.NAVY,
          background: T.CARD,
          border: `1px solid ${T.NAVY_12}`,
          padding: '1rem',
          borderRadius: 8,
        }}
        data-testid="pva-asset-picker-empty"
      >
        No pension claims found in your Marital Estate Inventory. Add a pension claim
        in M2 (Know What You Own) to use the Pension Valuation Analyzer.
      </div>
    );
  }

  return (
    <div
      data-testid="pva-asset-picker"
      style={{ fontFamily: T.FONT_BODY, color: T.NAVY }}
    >
      <h2
        style={{
          fontFamily: T.FONT_DISPLAY,
          color: T.NAVY,
          fontSize: '1.25rem',
          fontWeight: 500,
          margin: '0 0 0.75rem 0',
        }}
      >
        Select a pension to value
      </h2>
      <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
        {pensionClaims.map((claim) => {
          const isSelected = claim.id === selectedAssetId;
          const hasResults = !!(assetsBySlice && assetsBySlice[claim.id]?.results);
          const label = claim.description || 'Untitled pension';
          const whoseplan = claim.whoseplan ? ` — ${claim.whoseplan}` : '';
          return (
            <li key={claim.id} style={{ marginBottom: '0.5rem' }}>
              <button
                type="button"
                onClick={() => onSelect(claim.id)}
                data-testid={`pva-asset-picker-item-${claim.id}`}
                aria-pressed={isSelected}
                style={{
                  width: '100%',
                  textAlign: 'left',
                  padding: '0.75rem 1rem',
                  background: isSelected ? T.GOLD_TINT : T.CARD,
                  border: `1px solid ${isSelected ? T.GOLD_BORDER : T.NAVY_12}`,
                  color: T.NAVY,
                  fontFamily: T.FONT_BODY,
                  fontSize: '0.9375rem',
                  cursor: 'pointer',
                  borderRadius: 6,
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}
              >
                <span>
                  <span style={{ fontWeight: 500 }}>{label}</span>
                  <span style={{ color: T.NAVY_55 }}>{whoseplan}</span>
                </span>
                {hasResults && (
                  <span
                    style={{
                      fontSize: '0.75rem',
                      color: T.GOLD,
                      fontStyle: 'italic',
                      marginLeft: '0.5rem',
                    }}
                    data-testid={`pva-asset-picker-item-${claim.id}-valued`}
                  >
                    valued
                  </span>
                )}
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
