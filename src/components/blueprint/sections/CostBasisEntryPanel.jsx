'use client';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import { useM2Store } from '@/src/stores/m2Store';
import useBlueprintStore from '@/src/stores/blueprintStore';

// ─── Brand tokens ────────────────────────────────────────────────────────────
const NAVY = '#1B2A4A';
const GOLD = '#C8A96E';
const GREEN = '#2D8A4E';
const RED = '#C0392B';
const MUTED = '#6B7280';
const WHITE = '#FFFFFF';
const SANS = "var(--font-source-sans), 'Source Sans 3', sans-serif";

const LTCG_RATE = 0.15;
const APPLICABLE_CATEGORIES = ['realEstate', 'investments', 'businessInterests', 'vehicles'];

// ─── Formatters ──────────────────────────────────────────────────────────────
const fmtCurrency = (n) =>
  (n || 0).toLocaleString('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });

function parseCurrency(raw) {
  if (typeof raw === 'number') return raw;
  const stripped = String(raw).replace(/[^0-9.-]/g, '');
  const val = parseFloat(stripped);
  return Number.isNaN(val) ? null : val;
}

// ─── Educational prompts ─────────────────────────────────────────────────────
const IRC_1041_TEXT =
  'Under IRC section 1041, property transferred in divorce is tax-free at transfer — but you inherit the original cost basis. The gap between what an asset is worth and what was paid for it is the "built-in gain." When you sell, you\'ll owe taxes on that gain.';

const SECTION_121_TEXT =
  'Your primary residence may qualify for the section 121 exclusion — up to $250,000 gain tax-free ($500,000 if married). Module 5 covers this decision in detail.';

const HIGH_GAIN_TEXT =
  'This asset has significant built-in gain — more than half its value is unrealized appreciation.';

// ─── Styles ──────────────────────────────────────────────────────────────────
const panelStyle = {
  border: '1px solid #E5E7EB',
  borderRadius: 8,
  padding: '24px 20px',
  backgroundColor: WHITE,
  marginTop: 16,
  marginBottom: 16,
};

const headingStyle = {
  fontFamily: SANS,
  fontWeight: 700,
  fontSize: 16,
  color: NAVY,
  margin: '0 0 8px',
};

const eduStyle = {
  fontFamily: SANS,
  fontWeight: 400,
  fontSize: 13,
  color: MUTED,
  fontStyle: 'italic',
  lineHeight: 1.5,
  margin: '0 0 16px',
};

const thStyle = {
  fontFamily: SANS,
  fontWeight: 400,
  fontSize: 13,
  color: 'rgba(27,42,74,0.5)',
  textTransform: 'uppercase',
  letterSpacing: '0.05em',
  padding: '8px 10px',
  textAlign: 'left',
};

const tdStyle = {
  fontFamily: SANS,
  fontWeight: 400,
  fontSize: 15,
  color: NAVY,
  padding: '10px 10px',
  verticalAlign: 'middle',
};

const inputStyle = {
  fontFamily: SANS,
  fontSize: 15,
  color: NAVY,
  padding: '8px 12px',
  border: '1px solid #D1D5DB',
  borderRadius: 6,
  width: '100%',
  maxWidth: 160,
  boxSizing: 'border-box',
};

const inlineEduStyle = {
  fontFamily: SANS,
  fontWeight: 400,
  fontSize: 13,
  color: MUTED,
  fontStyle: 'italic',
  lineHeight: 1.45,
  padding: '4px 10px 8px',
};

// ─── Component ───────────────────────────────────────────────────────────────
export default function CostBasisEntryPanel() {
  // Store reads
  const items = useM2Store((s) => s.maritalEstateInventory.items);
  const costBasisEntries = useBlueprintStore((s) => s.costBasisEntries);
  const setCostBasisEntries = useBlueprintStore((s) => s.setCostBasisEntries);
  const updatePropertyDivisionTaxAdjusted = useBlueprintStore(
    (s) => s.updatePropertyDivisionTaxAdjusted
  );

  // Filter to applicable categories
  const applicableItems = useMemo(
    () => items.filter((i) => APPLICABLE_CATEGORIES.includes(i.category)),
    [items]
  );

  // Determine which items still need cost basis (exclude items already in costBasisEntries)
  const existingIds = useMemo(
    () => new Set(costBasisEntries.map((e) => e.assetId)),
    [costBasisEntries]
  );
  const itemsNeedingBasis = useMemo(
    () => applicableItems.filter((i) => !existingIds.has(i.id)),
    [applicableItems, existingIds]
  );

  // Local state: cost basis values keyed by item id
  const [basisValues, setBasisValues] = useState(() => {
    const init = {};
    itemsNeedingBasis.forEach((item) => {
      // Pre-populate from m2Store costBasis field (Option 3: read-only from m2)
      init[item.id] = item.costBasis !== null && item.costBasis !== undefined
        ? String(item.costBasis)
        : '';
    });
    return init;
  });

  const handleBasisChange = (id, raw) => {
    setBasisValues((prev) => ({ ...prev, [id]: raw }));
  };

  // At least one asset has a value entered (including "0")
  const hasAnyBasis = Object.values(basisValues).some((v) => {
    const parsed = parseCurrency(v);
    return parsed !== null;
  });

  const handleCalculate = () => {
    // Build entries for ALL applicable items (items already in store + new ones being entered)
    const newEntries = [];

    // Items being entered now
    itemsNeedingBasis.forEach((item) => {
      const parsed = parseCurrency(basisValues[item.id]);
      if (parsed === null) return; // skip items without entered basis

      const fmv = Number(item.currentValue) || 0;
      const builtInGain = fmv - parsed;
      const estimatedTax = builtInGain * LTCG_RATE;
      const taxAdjustedValue = fmv - estimatedTax;

      newEntries.push({
        assetId: item.id,
        description: item.description,
        category: item.category,
        fmv,
        costBasis: parsed,
        builtInGain,
        estimatedTax,
        taxAdjustedValue,
      });
    });

    // Combine with existing entries
    const allEntries = [...costBasisEntries, ...newEntries];
    setCostBasisEntries(allEntries);

    // Aggregate by titleholder for §5
    const buckets = { client: { adj: 0, tax: 0 }, spouse: { adj: 0, tax: 0 }, undecided: { adj: 0, tax: 0 } };
    allEntries.forEach((entry) => {
      // Look up original item to get titleholder
      const original = items.find((i) => i.id === entry.assetId);
      if (!original) {
        // Orphaned entry — item removed from m2Store after basis was entered (harmless per spec)
        console.warn(`CostBasisEntryPanel: asset ${entry.assetId} not found in inventory, defaulting to undecided`);
      }
      const holder = original?.titleholder;
      let bucket;
      if (holder === 'self') bucket = 'client';
      else if (holder === 'spouse') bucket = 'spouse';
      else bucket = 'undecided';
      buckets[bucket].adj += entry.taxAdjustedValue;
      buckets[bucket].tax += entry.estimatedTax;
    });

    updatePropertyDivisionTaxAdjusted({
      taxAdjusted: {
        client: buckets.client.adj,
        spouse: buckets.spouse.adj,
        undecided: buckets.undecided.adj,
      },
      hiddenTax: {
        client: buckets.client.tax,
        spouse: buckets.spouse.tax,
        undecided: buckets.undecided.tax,
      },
    });
  };

  // No applicable m2 items at all
  if (applicableItems.length === 0) {
    return (
      <div style={panelStyle} className="clearpath-blueprint-interactive">
        <div style={headingStyle}>Enter Cost Basis to Reveal Hidden Taxes</div>
        <p style={{ ...eduStyle, fontStyle: 'normal' }}>
          No applicable assets found. Add assets in Module 2 first.
        </p>
        <Link
          href="/modules/m2/inventory"
          style={{
            fontFamily: SANS,
            fontSize: 14,
            color: GOLD,
            textDecoration: 'underline',
          }}
        >
          Go to Marital Estate Inventory →
        </Link>
      </div>
    );
  }

  // All applicable items already have entries — panel not needed
  if (itemsNeedingBasis.length === 0) return null;

  return (
    <div style={panelStyle} className="clearpath-blueprint-interactive">
      <div style={headingStyle}>Enter Cost Basis to Reveal Hidden Taxes</div>
      <p style={eduStyle}>{IRC_1041_TEXT}</p>

      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr>
            <th style={thStyle}>Asset</th>
            <th style={{ ...thStyle, textAlign: 'right' }}>FMV</th>
            <th style={{ ...thStyle, textAlign: 'right' }}>Cost Basis</th>
          </tr>
        </thead>
        <tbody>
          {itemsNeedingBasis.map((item) => {
            const fmv = Number(item.currentValue) || 0;
            const parsed = parseCurrency(basisValues[item.id]);
            const gain = parsed !== null ? fmv - parsed : null;
            const isHighGain = gain !== null && gain > fmv * 0.5;
            const isRealEstate = item.category === 'realEstate';

            return (
              <React.Fragment key={item.id}>
                <tr>
                  <td style={tdStyle}>{item.description || item.category}</td>
                  <td style={{ ...tdStyle, textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>
                    {fmtCurrency(fmv)}
                  </td>
                  <td style={{ ...tdStyle, textAlign: 'right' }}>
                    <input
                      type="text"
                      inputMode="numeric"
                      placeholder="$0"
                      aria-label={`Cost basis for ${item.description || item.category}`}
                      value={basisValues[item.id] || ''}
                      onChange={(e) => handleBasisChange(item.id, e.target.value)}
                      onBlur={() => {
                        const p = parseCurrency(basisValues[item.id]);
                        if (p !== null) handleBasisChange(item.id, fmtCurrency(p));
                      }}
                      style={inputStyle}
                    />
                  </td>
                </tr>
                {isRealEstate && (
                  <tr>
                    <td colSpan={3} style={inlineEduStyle}>{SECTION_121_TEXT}</td>
                  </tr>
                )}
                {isHighGain && (
                  <tr>
                    <td colSpan={3} style={inlineEduStyle}>{HIGH_GAIN_TEXT}</td>
                  </tr>
                )}
              </React.Fragment>
            );
          })}
        </tbody>
      </table>

      <p style={{ ...eduStyle, marginTop: 12, marginBottom: 0, fontStyle: 'normal', fontSize: 13 }}>
        Cost basis is what was originally paid for the asset. If unsure, your CDFA or CPA can help determine this.
      </p>

      <button
        type="button"
        onClick={handleCalculate}
        disabled={!hasAnyBasis}
        style={{
          marginTop: 16,
          backgroundColor: GOLD,
          color: NAVY,
          fontFamily: SANS,
          fontWeight: 700,
          fontSize: 15,
          padding: '12px 24px',
          borderRadius: 8,
          border: 'none',
          cursor: hasAnyBasis ? 'pointer' : 'not-allowed',
          opacity: hasAnyBasis ? 1 : 0.5,
          letterSpacing: 0.3,
        }}
      >
        Calculate Hidden Taxes
      </button>
    </div>
  );
}
