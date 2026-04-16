'use client';

import { useState, useMemo } from 'react';
// Store import needed for cross-section cost basis toggle (shared with S5)
import useBlueprintStore from '@/src/stores/blueprintStore';
import CostBasisEntryPanel from './CostBasisEntryPanel';

const NAVY = '#1B2A4A';
const GOLD = '#C8A96E';
const RED = '#C0392B';
const GREEN = '#2D8A4E';
const MUTED = '#6B7280';
const SANS = "var(--font-source-sans), 'Source Sans 3', sans-serif";

const CATEGORY_LABELS = {
  realEstate: 'Real Estate',
  retirementAccounts: 'Retirement Accounts',
  bankAccounts: 'Bank Accounts',
  investments: 'Investments',
  vehicles: 'Vehicles',
  businessInterests: 'Business Interests',
  otherAssets: 'Other Assets',
};

function titleize(key) {
  return key
    .replace(/([A-Z])/g, ' $1')
    .replace(/^./, (c) => c.toUpperCase())
    .trim();
}

const currency = (n) =>
  (n || 0).toLocaleString('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });

const labelStyle = {
  fontFamily: SANS,
  fontWeight: 400,
  fontSize: 13,
  color: 'rgba(27,42,74,0.5)',
  textTransform: 'uppercase',
  letterSpacing: '0.05em',
};

const bodyStyle = {
  fontFamily: SANS,
  fontWeight: 400,
  fontSize: 16,
  color: 'rgba(27,42,74,0.8)',
};

const subHeaderStyle = {
  fontFamily: SANS,
  fontWeight: 600,
  fontSize: 16,
  color: NAVY,
};

const keyFigureStyle = (color = NAVY) => ({
  fontFamily: SANS,
  fontWeight: 600,
  fontSize: 28,
  color,
  lineHeight: 1.1,
});

const noteStyle = {
  fontFamily: SANS,
  fontWeight: 400,
  fontSize: 14,
  color: 'rgba(27,42,74,0.5)',
  fontStyle: 'italic',
};

const toggleStyle = {
  fontFamily: SANS,
  fontWeight: 400,
  fontSize: 13,
  color: GOLD,
  background: 'transparent',
  border: 'none',
  padding: 0,
  cursor: 'pointer',
};

const linkStyle = {
  ...bodyStyle,
  color: GOLD,
  background: 'transparent',
  border: 'none',
  padding: 0,
  textDecoration: 'underline',
  cursor: 'pointer',
  fontSize: 16,
};

function CategoryRow({ name, total, count, parenthesize, taxAdj }) {
  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'baseline',
        padding: '6px 0',
        flexWrap: 'wrap',
        gap: '0 8px',
      }}
    >
      <div style={bodyStyle}>
        {name}
        {typeof count === 'number' ? (
          <span style={{ ...bodyStyle, color: 'rgba(27,42,74,0.5)' }}>
            {' '}
            ({count})
          </span>
        ) : null}
      </div>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
        <span style={{ ...bodyStyle, color: parenthesize ? RED : 'rgba(27,42,74,0.8)' }}>
          {parenthesize ? `(${currency(total)})` : currency(total)}
        </span>
        {taxAdj && (
          <>
            <span style={{ ...bodyStyle, color: NAVY, fontWeight: 400 }}>→</span>
            <span style={{ ...bodyStyle, color: NAVY, fontWeight: 600 }}>
              {currency(taxAdj.taxAdjustedValue)}
            </span>
            <span
              style={{
                fontFamily: SANS,
                fontSize: 13,
                color: taxAdj.estimatedTax > 0 ? RED : taxAdj.estimatedTax < 0 ? GREEN : 'rgba(27,42,74,0.5)',
                fontWeight: 400,
              }}
            >
              ({taxAdj.estimatedTax >= 0 ? '−' : '+'}
              {currency(Math.abs(taxAdj.estimatedTax))} hidden tax)
            </span>
          </>
        )}
      </div>
    </div>
  );
}

export default function S3AssetInventory({ data, status }) {
  const [showAssets, setShowAssets] = useState(false);
  const [showLiabilities, setShowLiabilities] = useState(false);
  const [showPersonal, setShowPersonal] = useState(false);

  // Cost basis toggle (shared with S5)
  const costBasisViewEnabled = useBlueprintStore((s) => s.costBasisViewEnabled);
  const costBasisEntries = useBlueprintStore((s) => s.costBasisEntries);
  const toggleCostBasisView = useBlueprintStore((s) => s.toggleCostBasisView);

  // Tax adjustments grouped by category
  const taxByCat = useMemo(() => {
    const map = {};
    costBasisEntries.forEach((e) => {
      if (!map[e.category]) map[e.category] = { estimatedTax: 0, taxAdjustedValue: 0, fmv: 0 };
      map[e.category].estimatedTax += e.estimatedTax;
      map[e.category].taxAdjustedValue += e.taxAdjustedValue;
      map[e.category].fmv += e.fmv;
    });
    return map;
  }, [costBasisEntries]);

  const totalEstimatedTax = useMemo(
    () => costBasisEntries.reduce((sum, e) => sum + e.estimatedTax, 0),
    [costBasisEntries]
  );

  const showTaxAdjusted = costBasisViewEnabled && costBasisEntries.length > 0;

  if (!data) return null;

  const assetEntries = Object.entries(data.assetsByCategory || {});
  const liabilityEntries = Object.entries(data.liabilitiesByCategory || {});

  const allocated =
    (data.divisionStatus?.client || 0) + (data.divisionStatus?.spouse || 0);
  const totalAssets = data.totalAssets || 0;
  const allocatedPercent =
    totalAssets > 0 ? Math.round((allocated / totalAssets) * 100) : 0;
  const undecidedPercent = Math.max(0, 100 - allocatedPercent);

  const hasAllocations = allocated > 0;

  return (
    <div>
      {/* Cost basis view toggle */}
      {data && (status === 'partial' || status === 'complete') && (
        <div
          style={{
            fontFamily: SANS,
            fontSize: 14,
            marginBottom: 16,
            display: 'flex',
            alignItems: 'center',
            gap: 4,
          }}
          className="clearpath-blueprint-interactive"
        >
          <span style={{ color: 'rgba(27,42,74,0.5)', fontWeight: 400 }}>View:</span>
          <button
            type="button"
            onClick={costBasisViewEnabled ? toggleCostBasisView : undefined}
            style={{
              fontFamily: SANS,
              fontSize: 14,
              background: 'none',
              border: 'none',
              padding: '2px 4px',
              cursor: costBasisViewEnabled ? 'pointer' : 'default',
              color: !costBasisViewEnabled ? GOLD : NAVY,
              opacity: !costBasisViewEnabled ? 1 : 0.5,
              fontWeight: !costBasisViewEnabled ? 600 : 400,
            }}
          >
            Face Value
          </button>
          <span style={{ color: 'rgba(27,42,74,0.3)' }}>|</span>
          <button
            type="button"
            onClick={!costBasisViewEnabled ? toggleCostBasisView : undefined}
            style={{
              fontFamily: SANS,
              fontSize: 14,
              background: 'none',
              border: 'none',
              padding: '2px 4px',
              cursor: !costBasisViewEnabled ? 'pointer' : 'default',
              color: costBasisViewEnabled ? GOLD : NAVY,
              opacity: costBasisViewEnabled ? 1 : 0.5,
              fontWeight: costBasisViewEnabled ? 600 : 400,
            }}
          >
            Tax-Adjusted
          </button>
        </div>
      )}

      {/* Cost basis entry panel — shown when toggled to Tax-Adjusted and items need basis */}
      {costBasisViewEnabled && <CostBasisEntryPanel />}

      <section
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: 24,
          alignItems: 'flex-start',
        }}
      >
        <div style={{ flex: '1 1 160px', minWidth: 140 }}>
          <div style={labelStyle}>TOTAL ASSETS</div>
          <div style={{ ...keyFigureStyle(), marginTop: 4 }}>
            {currency(data.totalAssets)}
          </div>
        </div>
        <div style={{ flex: '1 1 160px', minWidth: 140 }}>
          <div style={labelStyle}>TOTAL LIABILITIES</div>
          <div style={{ ...keyFigureStyle(RED), marginTop: 4 }}>
            ({currency(Math.abs(data.totalLiabilities || 0))})
          </div>
        </div>
        <div style={{ flex: '1 1 160px', minWidth: 140 }}>
          <div style={labelStyle}>NET WORTH{showTaxAdjusted ? ' (TAX-ADJ.)' : ''}</div>
          <div
            style={{
              ...keyFigureStyle(GOLD),
              marginTop: 4,
              transition: 'opacity 0.4s ease-out',
            }}
          >
            {showTaxAdjusted
              ? currency(data.netWorth - totalEstimatedTax)
              : currency(data.netWorth)}
          </div>
        </div>
      </section>

      {assetEntries.length > 0 && (
        <section style={{ marginTop: 32 }}>
          <div
            style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}
          >
            <div style={subHeaderStyle}>Assets by Category</div>
            <button
              type="button"
              onClick={() => setShowAssets((v) => !v)}
              style={toggleStyle}
              className="clearpath-blueprint-interactive"
            >
              {showAssets ? 'Hide breakdown ▴' : 'Show breakdown ▾'}
            </button>
          </div>
          {showAssets && (
            <div style={{ marginTop: 12 }}>
              {assetEntries.map(([key, cat]) => (
                <CategoryRow
                  key={key}
                  name={CATEGORY_LABELS[key] || titleize(key)}
                  total={cat.total}
                  count={cat.count}
                  taxAdj={showTaxAdjusted && taxByCat[key] ? taxByCat[key] : null}
                />
              ))}
            </div>
          )}
        </section>
      )}

      {liabilityEntries.length > 0 && (
        <section style={{ marginTop: 24 }}>
          <div
            style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}
          >
            <div style={subHeaderStyle}>Liabilities by Category</div>
            <button
              type="button"
              onClick={() => setShowLiabilities((v) => !v)}
              style={toggleStyle}
              className="clearpath-blueprint-interactive"
            >
              {showLiabilities ? 'Hide breakdown ▴' : 'Show breakdown ▾'}
            </button>
          </div>
          {showLiabilities && (
            <div style={{ marginTop: 12 }}>
              {liabilityEntries.map(([key, cat]) => (
                <CategoryRow
                  key={key}
                  name={CATEGORY_LABELS[key] || titleize(key)}
                  total={Math.abs(cat.total)}
                  count={cat.count}
                  parenthesize
                />
              ))}
            </div>
          )}
        </section>
      )}

      {hasAllocations && (
        <section style={{ marginTop: 32 }}>
          <div style={bodyStyle}>
            Division: {allocatedPercent}% allocated · {undecidedPercent}% undecided{' '}
            <a href="#section-5" style={{ color: GOLD, textDecoration: 'underline' }}>
              See full division in §5 below.
            </a>
          </div>
        </section>
      )}

      {(typeof data.documentsGathered === 'number' ||
        typeof data.documentsTotal === 'number') && (
        <div style={{ ...bodyStyle, marginTop: 16 }}>
          Documents Gathered: {data.documentsGathered || 0} of {data.documentsTotal || 0}
        </div>
      )}

      {data.personalProperty && (
        <section style={{ marginTop: 32 }}>
          <div
            style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}
          >
            <div style={subHeaderStyle}>Personal Property</div>
            <button
              type="button"
              onClick={() => setShowPersonal((v) => !v)}
              style={toggleStyle}
              className="clearpath-blueprint-interactive"
            >
              {showPersonal ? 'Hide breakdown ▴' : 'Show breakdown ▾'}
            </button>
          </div>
          {showPersonal && (
            <div style={{ ...bodyStyle, marginTop: 12 }}>
              Estimated Total Value: {currency(data.personalProperty.totalEstimatedValue)} (
              {data.personalProperty.itemCount} items across{' '}
              {data.personalProperty.roomCount} rooms)
            </div>
          )}
        </section>
      )}

      {status === 'partial' && (
        <div style={{ ...noteStyle, marginTop: 24 }}>
          {!hasAllocations
            ? 'Allocate assets in the Marital Estate Inventory (Module 2) to complete this section.'
            : 'Add more asset categories in Module 2 for a complete inventory.'}
        </div>
      )}
    </div>
  );
}
