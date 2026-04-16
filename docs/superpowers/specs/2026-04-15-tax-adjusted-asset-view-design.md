# Tax-Adjusted Asset View — Design Spec

> **For agentic workers:** Use superpowers:writing-plans to create an implementation plan from this spec.

**Goal:** Add a "Face Value / Tax-Adjusted" toggle to Blueprint sections 3 and 5 that reveals hidden taxes in assets by computing built-in gains from cost basis data.

**Date:** 2026-04-15

---

## Context

The ClearPath Blueprint displays a marital estate inventory (section 3) and property division (section 5). Both currently show face values only. Attorneys and CDFA practitioners need to see tax-adjusted values — an asset worth $675,000 with a $500,000 cost basis carries $26,250 in hidden tax (at 15% LTCG), making its tax-adjusted value $648,750.

This is not a standalone tool. It is a view mode within the Blueprint activated via a toggle. When the user first toggles to "Tax-Adjusted" and has no cost basis data, an entry panel slides down asking for cost basis on each applicable asset. Once entered, the asset values update to show tax-adjusted numbers.

### Existing Infrastructure

The following already exists and must not be modified:

| Location | What exists |
|---|---|
| `blueprintStore.js` | `costBasisEntries[]`, `costBasisViewEnabled`, `setCostBasisEntries()`, `toggleCostBasisView()`, `updatePropertyDivisionTaxAdjusted()` |
| `m2Store.js` | Individual inventory items with `costBasis` field (nullable number) |
| `S5PropertyDivision.jsx` | Full two-path rendering: face-value table when `hasCostBasis === false`, 4-column tax-adjusted table when `hasCostBasis === true` |
| `MaritalEstateInventory.jsx` | Per-item cost basis input in M2 tool |

### What Needs to Be Built

1. **`CostBasisEntryPanel.jsx`** — new component for entering cost basis per asset
2. **S3 modifications** — toggle UI + tax-adjusted value display in category breakdown
3. **S5 modifications** — toggle UI + "enter basis in section 3" nudge

---

## Data Flow

```
m2Store.maritalEstateInventory.items
    │
    │ (pre-populate cost basis, read-only — Option 3)
    ▼
CostBasisEntryPanel
    │
    │ on "Calculate Hidden Taxes" click:
    │   1. blueprintStore.setCostBasisEntries(entries)
    │   2. blueprintStore.updatePropertyDivisionTaxAdjusted({ taxAdjusted, hiddenTax })
    ▼
blueprintStore.costBasisEntries ──► S3 reads for per-category tax adjustments
blueprintStore.sections.s5.data ──► S5 renders tax-adjusted table (existing path)
```

**Pre-population rule (Option 3):** Read cost basis from m2Store items. Pre-fill any item that already has `costBasis !== null`. Edits in the Blueprint panel only update blueprintStore — m2Store is never written to. This follows the cumulative data pipeline pattern (M2 is source of truth, Blueprint aggregates and extends).

---

## Components

### 1. CostBasisEntryPanel

**File:** `src/components/blueprint/sections/CostBasisEntryPanel.jsx`

**Purpose:** Let the user enter cost basis for applicable assets, compute hidden taxes, and write results to blueprintStore.

**Props:** None. Reads directly from m2Store and blueprintStore.

**Which assets appear:** Filter `m2Store.maritalEstateInventory.items` to categories: `realEstate`, `investments`, `businessInterests`, `vehicles`. Exclude `retirementAccounts` (handled by PIT Calculator), `bankAccounts` (basis equals value), and `otherAssets`.

**Layout:**

```
┌─────────────────────────────────────────────────────┐
│  Enter Cost Basis to Reveal Hidden Taxes            │
│                                                     │
│  [Educational text — IRC §1041 explanation]         │
│                                                     │
│  Asset              FMV          Cost Basis         │
│  Family Home        $450,000     [$450,000 ]        │
│  Rental Property    $225,000     [_________ ]       │
│  Brokerage Account  $120,000     [$85,000  ]        │
│  Stock Options      $60,000      [_________ ]       │
│                                                     │
│  [Per-asset educational prompts when applicable]    │
│                                                     │
│  [ Calculate Hidden Taxes ]                         │
└─────────────────────────────────────────────────────┘
```

Pre-populated values (from m2Store) are shown in the input field. Items without m2 cost basis show an empty input.

**Calculation on button click:**

For each asset with cost basis entered (value >= 0, including explicit $0):

```
builtInGain = FMV - costBasis
estimatedTax = builtInGain * 0.15    // 15% LTCG rate
taxAdjustedValue = FMV - estimatedTax
```

- `builtInGain` can be negative (cost basis > FMV = built-in loss). This is valid for depreciated assets.
- `costBasis` of $0 is allowed — represents full built-in gain.
- `estimatedTax` can be negative (a loss = tax benefit). Show in green.

**After calculation:**

1. Build entries array:
```js
entries = applicableItems.map(item => ({
  assetId: item.id,
  description: item.description,
  category: item.category,
  fmv: item.currentValue,
  costBasis: enteredCostBasis,
  builtInGain,
  estimatedTax,
  taxAdjustedValue,
}))
```

2. Call `blueprintStore.setCostBasisEntries(entries)`

3. Aggregate by allocation bucket for S5:
```js
// Group entries by titleholder → map to client/spouse/undecided
// Sum taxAdjustedValue and estimatedTax per bucket
blueprintStore.updatePropertyDivisionTaxAdjusted({
  taxAdjusted: { client, spouse, undecided },
  hiddenTax: { client, spouse, undecided },
})
```

Titleholder mapping: `self` → client, `spouse` → spouse, everything else (`joint`, `other`, `unknown`) → undecided.

4. Panel disappears after calculation — all applicable items now have entries, so the state machine transitions to "all entries complete, no entry panel."

**"Calculate Hidden Taxes" button:**
- Background: Gold (#C8A96E), text: Navy (#1B2A4A)
- Disabled until at least 1 asset has cost basis entered
- Disabled state: 50% opacity, cursor not-allowed

**Educational prompts:**

| Trigger | Text |
|---|---|
| Panel first appears | "Under IRC section 1041, property transferred in divorce is tax-free at transfer — but you inherit the original cost basis. The gap between what an asset is worth and what was paid for it is the 'built-in gain.' When you sell, you'll owe taxes on that gain." |
| Asset with gain > 50% of FMV | "This asset has significant built-in gain — more than half its value is unrealized appreciation." |
| Real estate category asset | "Your primary residence may qualify for the section 121 exclusion — up to $250,000 gain tax-free ($500,000 if married). Module 5 covers this decision in detail." |

Educational prompts appear inline below the relevant asset row, in MUTED (#6B7280) italic text at 13px.

---

### 2. S3AssetInventory Modifications

**File:** `src/components/blueprint/sections/S3AssetInventory.jsx`

**New import:** `useBlueprintStore` from `@/src/stores/blueprintStore`. Add a comment: `// Store import needed for cross-section cost basis toggle (shared with S5)`.

**Also import:** `useM2Store` is NOT needed in S3 — the entry panel handles m2Store reads. S3 only reads `costBasisEntries` and `costBasisViewEnabled` from blueprintStore.

**Also import:** `CostBasisEntryPanel` from `./CostBasisEntryPanel`.

#### Toggle UI

Position: top of the section, below the section header, above the hero KPIs. Only visible when `data` exists (status is `partial` or `complete`).

```
View: Face Value | Tax-Adjusted
```

- Two text options separated by " | "
- Active option: Gold (#C8A96E) text, fontWeight 600
- Inactive option: Navy (#1B2A4A) at 50% opacity, fontWeight 400, cursor pointer
- On click inactive option: call `blueprintStore.toggleCostBasisView()`
- Font: Source Sans Pro, 14px
- No background, no border — subtle text tabs

#### Toggle State Machine

| State | Behavior |
|---|---|
| Face Value mode (default) | Normal S3 rendering, no changes |
| Tax-Adjusted, `costBasisEntries.length === 0` | CostBasisEntryPanel slides down below toggle. Values unchanged. |
| Tax-Adjusted, partial entries (some assets have basis) | CostBasisEntryPanel shows only assets without basis. Values with basis show adjusted. |
| Tax-Adjusted, all entries complete | No entry panel. All values show adjusted. |
| Toggle back to Face Value | Values revert to face value. Basis data preserved in store. |

#### Tax-Adjusted Value Display

When toggled to Tax-Adjusted and costBasisEntries exist, modify the category breakdown rows:

**Current format:** `Real Estate: $675,000`

**Tax-adjusted format:** `Real Estate: $675,000 → $648,750 (−$26,250 hidden tax)`

- Arrow (→) in NAVY at normal weight
- Tax-adjusted value in NAVY at 600 weight
- Delta in parentheses: Red (#C0392B) at 13px if positive hidden tax, Green (#2D8A4E) if negative (built-in loss = tax benefit)
- Compute per-category sums from `costBasisEntries` grouped by `entry.category`

**Net Worth hero KPI update:** When tax-adjusted view is active, the Net Worth KPI shows the tax-adjusted total instead of face value. Compute as: `data.netWorth - totalEstimatedTax` (sum of all `estimatedTax` from costBasisEntries).

**Number transition:** When toggling between views, values animate with a 400ms ease-out opacity transition. Implement by toggling a CSS class that controls opacity, with the new value swapped during the transition.

---

### 3. S5PropertyDivision Modifications

**File:** `src/components/blueprint/sections/S5PropertyDivision.jsx`

**New import:** `useBlueprintStore` from `@/src/stores/blueprintStore`. Add same explanatory comment.

#### Toggle UI

Same design as S3 toggle: "View: Face Value | Tax-Adjusted" text tabs at top of section.

- Reads from same `blueprintStore.costBasisViewEnabled`
- Calls same `blueprintStore.toggleCostBasisView()`
- Both S3 and S5 toggles stay in sync (shared state)

#### Rendering Logic

S5 already has two render paths based on `data.hasCostBasis`. The toggle adds a third consideration:

| `costBasisViewEnabled` | `data.hasCostBasis` | What renders |
|---|---|---|
| `false` | any | Face-value table (existing path) |
| `true` | `true` | Tax-adjusted 4-column table (existing path) |
| `true` | `false` | Face-value table + note: "Enter cost basis in Section 3 above to see tax-adjusted values." |

The note renders in MUTED (#6B7280) italic, 13px, with margin-top 12px.

---

## Styling

All components follow the established Blueprint styling pattern:

- **Brand tokens:** NAVY (#1B2A4A), GOLD (#C8A96E), PARCHMENT (#FAF8F2), WHITE (#FFFFFF), RED (#C0392B), GREEN (#2D8A4E), MUTED (#6B7280)
- **Fonts:** Playfair Display (headings), Source Sans Pro (body)
- **Inline styles** using brand token constants (matching existing section renderer pattern)
- **Interactive elements** get `className="clearpath-blueprint-interactive"` for print hiding (existing pattern in S3)

### Print Behavior

- Toggle UI: hidden in print (via `clearpath-blueprint-interactive` class)
- CostBasisEntryPanel: hidden in print (add same class to panel wrapper)
- Tax-adjusted values: if toggled on, print shows tax-adjusted. If toggled off, print shows face value. Whatever the user sees on screen is what prints.

---

## Constraints

- Do NOT modify `blueprintStore.js` — all needed state and actions already exist
- Do NOT modify `m4Store.js`
- Do NOT modify `BlueprintBar.jsx` or `BlueprintView.jsx`
- Do NOT modify any M1/M2/M3 tool components
- Do NOT create a new route page — this is not a standalone tool
- Do NOT install new packages
- 15% LTCG rate is hardcoded (not configurable)
- m2Store is read-only from the Blueprint's perspective

---

## Edge Cases

| Scenario | Behavior |
|---|---|
| No m2Store items in applicable categories | Entry panel shows "No applicable assets found. Add assets in Module 2 first." with link to `/modules/m2/inventory` |
| Cost basis > FMV | Valid (built-in loss). builtInGain is negative, estimatedTax is negative (tax benefit). Delta shows in Green. |
| Cost basis = $0 | Valid (full built-in gain). |
| Cost basis = FMV | builtInGain = 0, no hidden tax. Tax-adjusted value = FMV. |
| User enters basis, toggles to Face Value, toggles back | Basis data preserved. No re-entry needed. |
| User enters basis for some items, not others | Partial: items without basis show FMV in tax-adjusted view. Only items with entered basis show adjusted values. |
| m2Store items change after basis entered | Entry panel re-reads m2Store on each render. New items appear without basis. Removed items' entries become orphaned (harmless — they won't match any displayed category). |
