# Tax-Adjusted Asset View Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a "Face Value / Tax-Adjusted" toggle to Blueprint §3 and §5 that reveals hidden taxes in assets by computing built-in gains from cost basis data.

**Architecture:** A new `CostBasisEntryPanel` component reads individual assets from m2Store, lets users enter cost basis, computes hidden taxes at 15% LTCG, and writes results to blueprintStore. S3 and S5 get a shared toggle that switches between face-value and tax-adjusted views, powered by `costBasisViewEnabled` in blueprintStore.

**Tech Stack:** React 19, Zustand (m2Store read-only, blueprintStore read/write), inline styles with brand tokens.

---

## File Structure

| File | Action | Responsibility |
|---|---|---|
| `src/components/blueprint/sections/CostBasisEntryPanel.jsx` | Create | Entry panel: reads m2Store items, collects cost basis input, computes hidden taxes, writes to blueprintStore |
| `src/components/blueprint/sections/S3AssetInventory.jsx` | Modify | Add toggle UI, conditionally render CostBasisEntryPanel, show tax-adjusted values in category breakdown |
| `src/components/blueprint/sections/S5PropertyDivision.jsx` | Modify | Add toggle UI, gate existing render paths on toggle state |

**Do NOT modify:** `blueprintStore.js`, `m2Store.js`, `m4Store.js`, `BlueprintView.jsx`, `BlueprintBar.jsx`, any M1/M2/M3/M4 tool components.

---

## Task 1: Create CostBasisEntryPanel

**Files:**
- Create: `src/components/blueprint/sections/CostBasisEntryPanel.jsx`

- [ ] **Step 1.1: Create CostBasisEntryPanel.jsx**

```jsx
'use client';

import { useState, useMemo } from 'react';
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
```

**Important:** The `React.Fragment` usage requires React to be in scope. Since this is a Next.js 19 app with the new JSX transform, `React` is NOT automatically in scope for `React.Fragment`. Replace `React.Fragment` with the shorthand `<>...</>` syntax, OR import React. Since we use named fragments with `key`, we must import React:

Add at the top of the imports:
```jsx
import React, { useState, useMemo } from 'react';
```

- [ ] **Step 1.2: Verify file exists and syntax**

Run: `ls -la src/components/blueprint/sections/CostBasisEntryPanel.jsx`
Expected: file exists, non-zero bytes.

Run: `grep -c "CostBasisEntryPanel\|setCostBasisEntries\|updatePropertyDivisionTaxAdjusted\|useM2Store\|useBlueprintStore" src/components/blueprint/sections/CostBasisEntryPanel.jsx`
Expected: >= `5`.

- [ ] **Step 1.3: Commit**

```bash
git add src/components/blueprint/sections/CostBasisEntryPanel.jsx
git commit -m "feat: add CostBasisEntryPanel for tax-adjusted asset view"
```

---

## Task 2: Add toggle and tax-adjusted view to S3AssetInventory

**Files:**
- Modify: `src/components/blueprint/sections/S3AssetInventory.jsx`

This task adds:
1. Import blueprintStore and CostBasisEntryPanel
2. The "Face Value | Tax-Adjusted" toggle
3. Conditional rendering of CostBasisEntryPanel
4. Tax-adjusted values in category breakdown and Net Worth KPI

- [ ] **Step 2.1: Add imports at the top of S3AssetInventory.jsx**

Find the existing imports block (lines 1–3):

```jsx
'use client';

import { useState } from 'react';
```

Replace with:

```jsx
'use client';

import { useState, useMemo } from 'react';
// Store import needed for cross-section cost basis toggle (shared with S5)
import useBlueprintStore from '@/src/stores/blueprintStore';
import CostBasisEntryPanel from './CostBasisEntryPanel';
```

- [ ] **Step 2.2: Add brand token constants**

Find (line 6):

```jsx
const RED = '#C0392B';
```

Add after it:

```jsx
const GREEN = '#2D8A4E';
const MUTED = '#6B7280';
```

- [ ] **Step 2.3: Add store hooks and computed values inside the component**

Find the existing component state (lines 123–126):

```jsx
export default function S3AssetInventory({ data, status }) {
  const [showAssets, setShowAssets] = useState(false);
  const [showLiabilities, setShowLiabilities] = useState(false);
  const [showPersonal, setShowPersonal] = useState(false);
```

Replace with:

```jsx
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
```

- [ ] **Step 2.4: Add the toggle UI**

Find the opening of the return JSX (line 141–142):

```jsx
  return (
    <div>
```

Replace with:

```jsx
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
```

- [ ] **Step 2.5: Update Net Worth KPI to show tax-adjusted when toggled**

Find the Net Worth KPI (lines 163–168):

```jsx
        <div style={{ flex: '1 1 160px', minWidth: 140 }}>
          <div style={labelStyle}>NET WORTH</div>
          <div style={{ ...keyFigureStyle(GOLD), marginTop: 4 }}>
            {currency(data.netWorth)}
          </div>
        </div>
```

Replace with:

```jsx
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
```

- [ ] **Step 2.6: Update CategoryRow to show tax-adjusted values**

Find the existing `CategoryRow` component (lines 96–120):

```jsx
function CategoryRow({ name, total, count, parenthesize }) {
  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'baseline',
        padding: '6px 0',
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
      <div style={{ ...bodyStyle, color: parenthesize ? RED : 'rgba(27,42,74,0.8)' }}>
        {parenthesize ? `(${currency(total)})` : currency(total)}
      </div>
    </div>
  );
}
```

Replace with:

```jsx
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
```

- [ ] **Step 2.7: Pass taxAdj prop to CategoryRow in the assets breakdown**

Find the assets category mapping (lines 188–195):

```jsx
            <div style={{ marginTop: 12 }}>
              {assetEntries.map(([key, cat]) => (
                <CategoryRow
                  key={key}
                  name={CATEGORY_LABELS[key] || titleize(key)}
                  total={cat.total}
                  count={cat.count}
                />
              ))}
            </div>
```

Replace with:

```jsx
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
```

- [ ] **Step 2.8: Verify**

Run: `grep -c "useBlueprintStore\|CostBasisEntryPanel\|costBasisViewEnabled\|toggleCostBasisView\|taxByCat\|showTaxAdjusted" src/components/blueprint/sections/S3AssetInventory.jsx`
Expected: >= `8`.

- [ ] **Step 2.9: Commit**

```bash
git add src/components/blueprint/sections/S3AssetInventory.jsx
git commit -m "feat: add cost basis toggle and tax-adjusted view to S3 Asset Inventory"
```

---

## Task 3: Add toggle and conditional rendering to S5PropertyDivision

**Files:**
- Modify: `src/components/blueprint/sections/S5PropertyDivision.jsx`

This task adds:
1. Import blueprintStore
2. The same "Face Value | Tax-Adjusted" toggle
3. Gate existing render paths on toggle state
4. "Enter cost basis in §3" nudge when toggle is on but no data

- [ ] **Step 3.1: Add import**

Find (line 1):

```jsx
'use client';
```

Replace with:

```jsx
'use client';

// Store import needed for cross-section cost basis toggle (shared with S3)
import useBlueprintStore from '@/src/stores/blueprintStore';
```

- [ ] **Step 3.2: Add brand token constants**

Find (line 6 — now line 9 after import added):

```jsx
const SANS = "var(--font-source-sans), 'Source Sans 3', sans-serif";
```

Add after it:

```jsx
const MUTED = '#6B7280';
```

- [ ] **Step 3.3: Add store hooks inside the component**

Find (line 51 — now line 55 after earlier additions):

```jsx
export default function S5PropertyDivision({ data, status }) {
  if (!data || !data.faceValue) return null;
```

Replace with:

```jsx
export default function S5PropertyDivision({ data, status }) {
  // Cost basis toggle (shared with S3)
  const costBasisViewEnabled = useBlueprintStore((s) => s.costBasisViewEnabled);
  const toggleCostBasisView = useBlueprintStore((s) => s.toggleCostBasisView);

  if (!data || !data.faceValue) return null;
```

- [ ] **Step 3.4: Add the toggle UI and gate rendering**

Find the current `hasCostBasis` branch (the first return — the tax-adjusted table). The existing code at line 61 reads:

```jsx
  if (hasCostBasis && taxAdjusted && hiddenTax) {
```

We need to wrap the entire rendering in a new outer div that includes the toggle. Replace everything from `if (hasCostBasis && taxAdjusted && hiddenTax) {` through the final closing `}` of the component (the face-value return and the note) with:

```jsx
  // Determine which view to show
  const showTaxView = costBasisViewEnabled && hasCostBasis && taxAdjusted && hiddenTax;
  const showNudge = costBasisViewEnabled && !hasCostBasis;

  return (
    <div>
      {/* Cost basis view toggle */}
      {data.faceValue && (
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

      {showTaxView ? (
        <>
          <div style={noteStyle}>
            Based on the allocations from your Asset Inventory (§3). Toggle to Tax-Adjusted
            view to reveal hidden taxes.
          </div>

          <div style={{ overflowX: 'auto', marginTop: 16 }}>
            <table
              style={{
                width: '100%',
                borderCollapse: 'collapse',
                fontFamily: SANS,
              }}
            >
              <thead>
                <tr>
                  <th style={{ ...headCellBase, textAlign: 'left' }}></th>
                  <th style={headCellBase}>Face Value</th>
                  <th style={headCellBase}>Tax-Adjusted</th>
                  <th style={headCellBase}>Hidden Tax</th>
                </tr>
              </thead>
              <tbody>
                <TaxRow label="Your Assets" face={faceValue.client} adj={taxAdjusted.client} hid={hiddenTax.client} />
                <TaxRow label="Spouse's Assets" face={faceValue.spouse} adj={taxAdjusted.spouse} hid={hiddenTax.spouse} />
                <TaxRow label="Undecided" face={faceValue.undecided} adj={taxAdjusted.undecided} hid={hiddenTax.undecided} />
                <TaxRow label="Total" face={faceTotal} adj={(taxAdjusted.client || 0) + (taxAdjusted.spouse || 0) + (taxAdjusted.undecided || 0)} hid={(hiddenTax.client || 0) + (hiddenTax.spouse || 0) + (hiddenTax.undecided || 0)} bold />
              </tbody>
            </table>
          </div>

          <p style={{ ...bodyStyle, marginTop: 24, lineHeight: 1.55 }}>
            The face-value division appears to give you <strong>{total > 0 ? Math.round((faceValue.client / total) * 100) : 0}%</strong> of
            marital assets. After accounting for hidden taxes, you receive{' '}
            <strong>{(() => { const adjTotal = (taxAdjusted.client || 0) + (taxAdjusted.spouse || 0) + (taxAdjusted.undecided || 0); return adjTotal > 0 ? Math.round((taxAdjusted.client / adjTotal) * 1000) / 10 : 0; })()}%</strong> — a difference of{' '}
            <strong style={{ color: RED }}>{currency(Math.abs(hiddenTax.client || 0))}</strong> in built-in
            tax liability.
          </p>
        </>
      ) : (
        <>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontFamily: SANS }}>
              <thead>
                <tr>
                  <th style={{ ...headCellBase, textAlign: 'left' }}></th>
                  <th style={headCellBase}>Face Value</th>
                  <th style={{ ...headCellBase, width: 80 }}></th>
                </tr>
              </thead>
              <tbody>
                <FaceRow label="Your Assets" value={faceValue.client} pct={pct(faceValue.client)} />
                <FaceRow label="Spouse's Assets" value={faceValue.spouse} pct={pct(faceValue.spouse)} />
                <FaceRow label="Undecided" value={faceValue.undecided} pct={pct(faceValue.undecided)} />
                <FaceRow label="Total" value={faceTotal} pct={100} bold />
              </tbody>
            </table>
          </div>
          {showNudge ? (
            <div style={{ fontFamily: SANS, fontWeight: 400, fontSize: 13, color: MUTED, fontStyle: 'italic', marginTop: 12 }}>
              Enter cost basis in Section 3 above to see tax-adjusted values.
            </div>
          ) : (
            <div style={{ ...noteStyle, marginTop: 16 }}>
              Tax-adjusted values add with Module 4 — revealing hidden taxes in transferred assets.
            </div>
          )}
        </>
      )}
    </div>
  );
```

Remove the old two separate return statements that were replaced.

- [ ] **Step 3.5: Verify**

Run: `grep -c "useBlueprintStore\|costBasisViewEnabled\|toggleCostBasisView\|showNudge\|showTaxView" src/components/blueprint/sections/S5PropertyDivision.jsx`
Expected: >= `5`.

- [ ] **Step 3.6: Commit**

```bash
git add src/components/blueprint/sections/S5PropertyDivision.jsx
git commit -m "feat: add cost basis toggle and conditional rendering to S5 Property Division"
```

---

## Task 4: Build verification and final commit

**Files:** (none changed — verification only)

- [ ] **Step 4.1: Verify new file exists**

Run: `ls -la src/components/blueprint/sections/CostBasisEntryPanel.jsx`
Expected: file exists, non-zero bytes.

- [ ] **Step 4.2: Verify store integration across all files**

Run: `grep -n "costBasis\|toggleCostBasisView\|setCostBasisEntries" src/components/blueprint/sections/S3AssetInventory.jsx src/components/blueprint/sections/S5PropertyDivision.jsx src/components/blueprint/sections/CostBasisEntryPanel.jsx`
Expected: multiple hits across all three files.

- [ ] **Step 4.3: Verify m2Store access in entry panel**

Run: `grep -n "m2Store\|useM2Store" src/components/blueprint/sections/CostBasisEntryPanel.jsx`
Expected: at least 2 hits (import + usage).

- [ ] **Step 4.4: Verify educational prompts**

Run: `grep -n "1041\|built-in gain\|121" src/components/blueprint/sections/CostBasisEntryPanel.jsx`
Expected: at least 3 hits.

- [ ] **Step 4.5: Verify no forbidden files were modified**

Run: `git diff --name-only HEAD~3`
Expected: only these files:
- `src/components/blueprint/sections/CostBasisEntryPanel.jsx`
- `src/components/blueprint/sections/S3AssetInventory.jsx`
- `src/components/blueprint/sections/S5PropertyDivision.jsx`

- [ ] **Step 4.6: Print summary**

Report:
- Files created: `CostBasisEntryPanel.jsx` (new)
- Files modified: `S3AssetInventory.jsx`, `S5PropertyDivision.jsx`
- Key decisions:
  - Individual item-level entries (from m2Store), not category-level
  - Pre-populates cost basis from m2Store (Option 3: read-only)
  - 15% LTCG rate hardcoded
  - Titleholder mapping: self→client, spouse→spouse, else→undecided
  - Toggle is shared state in blueprintStore (`costBasisViewEnabled`)
  - S3 and S5 both import blueprintStore (deviation from no-store-import rule, commented)
  - CostBasisEntryPanel hidden in print via `clearpath-blueprint-interactive` class

---

## What NOT to do during execution

- Do NOT modify `blueprintStore.js` — all state/actions already exist
- Do NOT modify `m2Store.js` — read-only access
- Do NOT modify `BlueprintView.jsx` or `BlueprintBar.jsx`
- Do NOT modify any M1/M2/M3/M4 tool components
- Do NOT create a new route page
- Do NOT install packages
- Do NOT run `npm run dev`
