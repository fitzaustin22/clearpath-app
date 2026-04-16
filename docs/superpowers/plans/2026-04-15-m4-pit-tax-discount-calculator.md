# PIT Tax Discount Calculator Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the Point-in-Time Tax Discount Calculator (M4 Tool 2) — a math-intensive retirement-division calculator that implements the Sutherland PIT methodology, compares it to the traditional approach, shows property-division impact, a pensions scenario variant, a quick-reference table, and exports to PDF via browser print. Results write to m4Store and §6 of the blueprintStore.

**Architecture:** Single `'use client'` React component (`PITTaxDiscountCalculator.jsx`) that mirrors the structure of `FilingStatusOptimizer.jsx` (Step 5). Pure math helpers live at the top of the file. Inline UI primitives (inputs, banners, section headers) are redefined in this file to avoid cross-tool coupling. Tier gating follows the exact same three-tier pattern: `signature` = full interactive, `navigator` = read-only sample data with "Sample Data" badge, anything else = upgrade gate. Persistence goes through `useM4Store` (state already scaffolded in Step 5); blueprint sync goes through `useBlueprintStore.updateRetirementDivision`. The route page is a server component that reads the authenticated user's tier from Supabase (pattern copied from `filing-status/page.jsx`).

**Tech Stack:** React 19, Next.js 16 App Router, Zustand (persisted), recharts, lucide-react, Clerk auth, Supabase. No new dependencies. No PDF library — uses `window.print()` with an embedded `@media print` stylesheet (`package.json` confirms no react-pdf / puppeteer is installed).

---

## File Structure

- **Create:** `src/components/m4/PITTaxDiscountCalculator.jsx` — the entire tool (calc engine + UI + 5 panels + print stylesheet).
- **Create:** `src/app/modules/m4/tax-discount/page.jsx` — route page, server component, reads tier from Supabase and hands it to the client component.
- **Do NOT modify:** `src/stores/m4Store.js` (already has `pitTaxDiscount` state + actions from Step 5).
- **Do NOT modify:** `src/stores/blueprintStore.js` (already has `updateRetirementDivision` from Step 4).
- **Do NOT modify:** `src/components/m4/FilingStatusOptimizer.jsx` (reference only).

---

## Known store contracts (verified before planning)

**`useM4Store` — `src/stores/m4Store.js`:**
- Exports both named (`export const useM4Store`) and default (`export default useM4Store`).
- `state.pitTaxDiscount.inputs` defaults: `{ planBalance: 500000, planType: '401k', currentAge: 45, withdrawalStartAge: 65, withdrawalEndAge: 85, effectiveTaxRate: 25, discountRate: 5.0, totalCashAssets: 500000, showPropertyDivision: true }`.
- Actions: `setPITInputs(partialInputs)`, `setPITResults(results)`, `setPrePopulated(tool, source)` — call with `setPrePopulated('pitTaxDiscount', 'fromM2')` or `'fromTool1'`.
- `state.pitTaxDiscount.prePopulated = { fromM2: false, fromTool1: false }`.

**`useBlueprintStore` — `src/stores/blueprintStore.js`:**
- Default export only: `import useBlueprintStore from '@/src/stores/blueprintStore';`.
- `updateRetirementDivision(pitData)` expects keys: `planBalance, planType, taxDiscountPercent, taxDiscountDollars, taxAdjustedValue, traditionalDiscountDollars, overage, n, effectiveTaxRate, discountRate`.

**`useM2Store` — `src/stores/m2Store.js`:**
- Named export: `import { useM2Store } from '@/src/stores/m2Store';`.
- Retirement accounts: `state.maritalEstateInventory.items` filtered by `item.category === 'retirement'`, summed on `item.currentValue`.

**`useM4Store.filingStatusOptimizer.results`** (for Tool 1 pre-pop):
- Shape: `{ scenarios, eligible, bestOption, maxSavings }`.
- `scenarios[bestOption].effectiveRate` is a number in percent form (e.g. `14.32`).
- Is `null` until Tool 1 is completed.

---

## Brand tokens (identical to FilingStatusOptimizer.jsx)

```javascript
const NAVY      = '#1B2A4A';
const GOLD      = '#C8A96E';
const PARCHMENT = '#FAF8F2';
const WHITE     = '#FFFFFF';
const AMBER     = '#D4A843';
const GREEN     = '#2D8A4E';
const RED       = '#C0392B';
const MUTED     = '#6B7280';
const SOURCE    = '"Source Sans Pro", -apple-system, system-ui, sans-serif';
const PLAYFAIR  = '"Playfair Display", Georgia, serif';
```

---

## Task 1: Create route page + component skeleton with tier gate

**Files:**
- Create: `src/app/modules/m4/tax-discount/page.jsx`
- Create: `src/components/m4/PITTaxDiscountCalculator.jsx`

- [ ] **Step 1.1: Create the route page**

Write `src/app/modules/m4/tax-discount/page.jsx`:

```jsx
import { auth } from '@clerk/nextjs/server';
import { supabaseAdmin } from '@/src/lib/supabase/server';
import PITTaxDiscountCalculator from '@/src/components/m4/PITTaxDiscountCalculator';

export const metadata = {
  title: 'PIT Tax Discount Calculator | ClearPath',
};

export default async function PITCalcPage() {
  const { userId } = await auth();

  let userTier = 'essentials';
  if (userId) {
    const { data } = await supabaseAdmin
      .from('users')
      .select('tier')
      .eq('id', userId)
      .single();
    if (data?.tier) userTier = data.tier;
  }

  return (
    <main style={{ backgroundColor: '#FAF8F2', minHeight: '100vh' }}>
      <PITTaxDiscountCalculator userTier={userTier} />
    </main>
  );
}
```

- [ ] **Step 1.2: Create the component skeleton with imports, brand tokens, sample data, and tier gate**

Write `src/components/m4/PITTaxDiscountCalculator.jsx`:

```jsx
'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import Link from 'next/link';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
  LabelList,
} from 'recharts';
import { CheckCircle, XCircle, ChevronDown, ChevronUp } from 'lucide-react';
import { useM4Store } from '@/src/stores/m4Store';
import { useM2Store } from '@/src/stores/m2Store';
import useBlueprintStore from '@/src/stores/blueprintStore';

// ─── Brand tokens ─────────────────────────────────────────────────────────────
const NAVY      = '#1B2A4A';
const GOLD      = '#C8A96E';
const PARCHMENT = '#FAF8F2';
const WHITE     = '#FFFFFF';
const AMBER     = '#D4A843';
const GREEN     = '#2D8A4E';
const RED       = '#C0392B';
const MUTED     = '#6B7280';
const SOURCE    = '"Source Sans Pro", -apple-system, system-ui, sans-serif';
const PLAYFAIR  = '"Playfair Display", Georgia, serif';

// ─── Sample data for Navigator tier (read-only) ───────────────────────────────
const SAMPLE_DATA_PIT = {
  planBalance: 500000,
  planType: '401k',
  currentAge: 45,
  withdrawalStartAge: 65,
  withdrawalEndAge: 85,
  effectiveTaxRate: 25,
  discountRate: 5.0,
  totalCashAssets: 500000,
  showPropertyDivision: true,
};

// ─── Formatters ───────────────────────────────────────────────────────────────
function fmtCurrency(n) {
  if (n == null || isNaN(n)) return '$0';
  const rounded = Math.round(n);
  return (rounded < 0 ? '-$' : '$') + Math.abs(rounded).toLocaleString('en-US');
}

function fmtPercent(n, decimals = 2) {
  if (n == null || isNaN(n)) return '0%';
  return `${n.toFixed(decimals)}%`;
}

function parseCurrency(str) {
  const cleaned = String(str).replace(/[$,\s]/g, '');
  const val = parseFloat(cleaned);
  return isNaN(val) ? 0 : val;
}

// Calc engine helpers will go here in Task 2.

// Shared UI primitives will go here in Task 3.

// ─── Main component ───────────────────────────────────────────────────────────
export default function PITTaxDiscountCalculator({ userTier = 'essentials' }) {
  const isReadOnly   = userTier === 'navigator';
  const isFullAccess = userTier === 'signature';
  const lockedOut    = userTier !== 'navigator' && userTier !== 'signature';

  // Upgrade gate
  if (lockedOut) {
    return (
      <div
        style={{
          maxWidth: 800,
          margin: '0 auto',
          padding: '48px 20px',
          fontFamily: SOURCE,
          color: NAVY,
        }}
      >
        <h1 style={{ fontFamily: PLAYFAIR, fontWeight: 700, fontSize: 28, margin: '0 0 12px' }}>
          Point in Time Tax Discount Calculator
        </h1>
        <p style={{ fontSize: 16, color: `${NAVY}B3`, margin: '0 0 24px' }}>
          This tool is available to Navigator and Signature tier members.
        </p>
        <Link
          href="/pricing"
          style={{
            display: 'inline-block',
            backgroundColor: GOLD,
            color: NAVY,
            fontFamily: SOURCE,
            fontWeight: 700,
            fontSize: 15,
            padding: '12px 28px',
            borderRadius: 8,
            textDecoration: 'none',
          }}
        >
          Upgrade to Access
        </Link>
      </div>
    );
  }

  // Full component body will be filled in subsequent tasks.
  return (
    <div style={{ maxWidth: 900, margin: '0 auto', padding: '32px 20px 80px', fontFamily: SOURCE, color: NAVY }}>
      <h1 style={{ fontFamily: PLAYFAIR, fontWeight: 700, fontSize: 28, margin: '0 0 8px' }}>
        Point in Time Tax Discount Calculator
      </h1>
      <p style={{ fontFamily: SOURCE, fontSize: 16, color: `${NAVY}B3`, margin: '0 0 28px', lineHeight: 1.55 }}>
        Calculate the proper tax discount on a retirement plan being divided in divorce — accounting for the time value of money between division date and withdrawal.
      </p>
    </div>
  );
}
```

- [ ] **Step 1.3: Verify files compile**

Run: `node --check src/app/modules/m4/tax-discount/page.jsx 2>&1 || true`
(JSX won't parse with `node --check`, but this ensures no catastrophic syntax error — expect a JSX parse error message, not a file-not-found error.)

Run: `ls -la src/components/m4/PITTaxDiscountCalculator.jsx src/app/modules/m4/tax-discount/page.jsx`
Expected: both files exist, non-zero bytes.

- [ ] **Step 1.4: Commit**

```bash
git add src/components/m4/PITTaxDiscountCalculator.jsx src/app/modules/m4/tax-discount/page.jsx
git commit -m "M4 Tool 2: scaffold PITTaxDiscountCalculator + route page with tier gate"
```

---

## Task 2: Add the calculation engine

All four pure math functions live at the top of `PITTaxDiscountCalculator.jsx`, under the formatters. No React in them — they're pure and testable.

**Files:**
- Modify: `src/components/m4/PITTaxDiscountCalculator.jsx`

- [ ] **Step 2.1: Add `calculatePIT`, `calculatePropertyDivision`, `calculatePensionScenario`, `generateReferenceTable`**

In `PITTaxDiscountCalculator.jsx`, replace the `// Calc engine helpers will go here in Task 2.` line with:

```javascript
// ─── Calculation engine (pure functions) ──────────────────────────────────────

// Core PIT calculation. Returns all derived values plus traditional-method comparison.
function calculatePIT(inputs) {
  const {
    planBalance,
    currentAge,
    withdrawalStartAge,
    withdrawalEndAge,
    effectiveTaxRate,
    discountRate,
  } = inputs;

  const PB = planBalance;
  const TR = effectiveTaxRate / 100;
  const i  = discountRate / 100;
  const n  = ((withdrawalStartAge - currentAge) + (withdrawalEndAge - currentAge)) / 2;

  let tdPercent;
  let tdDollars;
  if (i === 0 || n === 0) {
    tdPercent = TR;
    tdDollars = PB * TR;
  } else {
    const denominator = (Math.pow(1 + i, n) - 1) * (1 - TR) + 1;
    tdPercent = TR / denominator;
    tdDollars = (PB * TR) / denominator;
  }

  const taxAdjustedValue        = PB - tdDollars;                          // TA
  const tdGrowth                = tdDollars * (Math.pow(1 + i, n) - 1);    // TDg
  const taxDiscountAtWithdrawal = tdDollars + tdGrowth;                    // TD + TDg
  const taxableDistribution     = taxAdjustedValue + taxDiscountAtWithdrawal; // = PB + TDg
  const taxes                   = taxableDistribution * TR;
  const afterTaxDistribution    = taxableDistribution - taxes;

  const traditionalTD = PB * TR;
  const overage       = traditionalTD - tdDollars;

  const verified = Math.abs(afterTaxDistribution - taxAdjustedValue) < 0.01;

  return {
    n,
    tdPercent: tdPercent * 100, // display percent
    tdDollars,
    taxAdjustedValue,
    tdGrowth,
    taxDiscountAtWithdrawal,
    taxableDistribution,
    taxes,
    afterTaxDistribution,
    traditionalTD,
    overage,
    verified,
    PB,
    TR: TR * 100,
    i: i * 100,
  };
}

// Property-division comparison: husband takes retirement, wife takes cash.
// Each half equals halfEstate; wife's difference = overage / 2.
function calculatePropertyDivision(pitResults, totalCashAssets) {
  const { PB, taxAdjustedValue, traditionalTD, overage } = pitResults;
  const totalEstate = PB + totalCashAssets;
  const halfEstate  = totalEstate / 2;

  const tradRetirementAfterDiscount = PB - traditionalTD;
  const tradHusbandCash             = halfEstate - tradRetirementAfterDiscount;
  const tradWifeCash                = totalEstate - tradRetirementAfterDiscount - tradHusbandCash;

  const pitRetirementAfterDiscount  = taxAdjustedValue;
  const pitHusbandCash              = halfEstate - pitRetirementAfterDiscount;
  const pitWifeCash                 = totalEstate - pitRetirementAfterDiscount - pitHusbandCash;

  const wifeDifference = overage / 2;

  return {
    totalEstate,
    halfEstate,
    traditional: {
      husbandRetirement: tradRetirementAfterDiscount,
      husbandCash:       tradHusbandCash,
      wifeCash:          tradWifeCash,
      total:             halfEstate,
    },
    pit: {
      husbandRetirement: pitRetirementAfterDiscount,
      husbandCash:       pitHusbandCash,
      wifeCash:          pitWifeCash,
      total:             halfEstate,
    },
    wifeDifference,
  };
}

// Pension scenario method — weighted average of per-year TD% across payout years.
function calculatePensionScenario(inputs) {
  const {
    planBalance,
    currentAge,
    withdrawalStartAge,
    withdrawalEndAge,
    effectiveTaxRate,
    discountRate,
  } = inputs;

  const TR = effectiveTaxRate / 100;
  const i  = discountRate / 100;
  const totalPaymentYears = withdrawalEndAge - withdrawalStartAge;

  const yearRows = [];
  let weightedTDSum = 0;

  for (let age = withdrawalStartAge; age < withdrawalEndAge; age++) {
    const yearNum  = age - withdrawalStartAge + 1;
    const nForYear = age - currentAge;

    let tdPercentForYear;
    if (i === 0 || nForYear <= 0) {
      tdPercentForYear = TR;
    } else {
      const denom = (Math.pow(1 + i, nForYear) - 1) * (1 - TR) + 1;
      tdPercentForYear = TR / denom;
    }

    const allocation  = totalPaymentYears > 0 ? 1 / totalPaymentYears : 0;
    const weightedTD  = tdPercentForYear * allocation;
    weightedTDSum    += weightedTD;

    yearRows.push({
      yearNum,
      age,
      n: nForYear,
      tdPercent: tdPercentForYear * 100,
      allocation: allocation * 100, // display percent
      weightedTD: weightedTD * 100,
    });
  }

  const scenarioTDPercent = weightedTDSum * 100;
  const scenarioTDDollars = planBalance * weightedTDSum;

  return { yearRows, scenarioTDPercent, scenarioTDDollars };
}

// Reference table: TD% matrix by age, tax rate, and retirement start.
// Uses the user's current discount rate, end age fixed at 85.
function generateReferenceTable(discountRate) {
  const ages      = [35, 45, 55, 65];
  const taxRates  = [20, 25, 30, 35, 40];
  const retirementStarts = [
    { label: 'Early (55)',    startAge: 55 },
    { label: 'Normal (65)',   startAge: 65 },
    { label: 'Deferred (75)', startAge: 75 },
  ];
  const endAge = 85;
  const i = discountRate / 100;

  return ages.map((currentAge) => ({
    age: currentAge,
    rates: taxRates.map((rate) => ({
      rate,
      scenarios: retirementStarts.map(({ label, startAge }) => {
        const actualStart = Math.max(startAge, currentAge);
        const n = ((actualStart - currentAge) + (endAge - currentAge)) / 2;
        const TR = rate / 100;
        let tdPercent;
        if (i === 0 || n <= 0) {
          tdPercent = rate;
        } else {
          const denom = (Math.pow(1 + i, n) - 1) * (1 - TR) + 1;
          tdPercent = (TR / denom) * 100;
        }
        return { label, tdPercent, n };
      }),
    })),
  }));
}
```

- [ ] **Step 2.2: Run the critical math verification**

Run this exact command:

```bash
node -e "
// Test Case 1 (Exhibit 2): PB=100K, TR=25%, i=5%, n=30
// Expected: TD% = 7.16%, TD = \$7,160
const PB=100000, TR=0.25, i=0.05, n=30;
const denom = (Math.pow(1+i,n)-1)*(1-TR)+1;
const tdPct = TR/denom;
const td = PB*TR/denom;
const ta = PB - td;
const tdg = td*(Math.pow(1+i,n)-1);
const taxDist = ta + td + tdg;
const taxes = taxDist * TR;
const afterTax = taxDist - taxes;
console.log('TC-1: TD%='+( tdPct*100).toFixed(2)+'%, TD=\$'+td.toFixed(0)+', TA=\$'+ta.toFixed(0));
console.log('  TDg=\$'+tdg.toFixed(0)+', Dist=\$'+taxDist.toFixed(0)+', Taxes=\$'+taxes.toFixed(0)+', AfterTax=\$'+afterTax.toFixed(0));
console.log('  Verified (AfterTax≈TA):', Math.abs(afterTax-ta)<0.01);
console.log('');
const denom2 = (Math.pow(1+0.05,0)-1)*(1-0.25)+1;
console.log('TC-3 (n=0): TD%='+(0.25/denom2*100).toFixed(2)+'% (expect 25.00%)');
const denom3 = (Math.pow(1+0,30)-1)*(1-0.25)+1;
console.log('TC-4 (i=0): TD%='+(0.25/denom3*100).toFixed(2)+'% (expect 25.00%)');
const PB2=500000;
const td2 = PB2*TR/denom;
const ta2 = PB2-td2;
const tradTD = PB2*TR;
const overage = tradTD - td2;
console.log('TC-2: TD=\$'+td2.toFixed(0)+', TA=\$'+ta2.toFixed(0)+', TradTD=\$'+tradTD.toFixed(0)+', Overage=\$'+overage.toFixed(0));
"
```

Expected output (within ±$1 rounding on dollars, ±0.01% on percentages):

```
TC-1: TD%=7.16%, TD=$7160, TA=$92840
  TDg=$23785, Dist=$123785, Taxes=$30946, AfterTax=$92839
  Verified (AfterTax≈TA): true
TC-3 (n=0): TD%=25.00% (expect 25.00%)
TC-4 (i=0): TD%=25.00% (expect 25.00%)
TC-2: TD=$35801, TA=$464199, TradTD=$125000, Overage=$89199
  Total estate=$1000000, Each half=$500000
```

**Self-consistency identity:** The PIT formula `TD = PB·TR / (((1+i)^n − 1)(1 − TR) + 1)` is derived so that `After-Tax Distribution = Tax Adjusted Award` exactly. For TC-1, algebraically: `AfterTax = (PB + TDg)·(1 − TR) = (100000 + 7160·3.3219)·0.75 = 123785·0.75 = 92839 ≈ 92840 = TA ✓`.

If the actual output does not match these numbers, STOP and re-examine the formula before continuing — the component is useless if the math is wrong. Do NOT modify the formula to match an incorrect expected value; instead, re-derive by hand and confirm the formula matches the Sutherland spec.

- [ ] **Step 2.3: Verify the engine was written correctly in the file**

Run: `grep -c "function calculatePIT\|function calculatePropertyDivision\|function calculatePensionScenario\|function generateReferenceTable" src/components/m4/PITTaxDiscountCalculator.jsx`
Expected: `4`

- [ ] **Step 2.4: Commit**

```bash
git add src/components/m4/PITTaxDiscountCalculator.jsx
git commit -m "M4 Tool 2: calculation engine (calculatePIT + property division + pension scenario + reference table)"
```

---

## Task 3: Add inline UI primitives

Add the shared UI building blocks this component needs. Keep them inline in the same file (matching the Filing Status pattern — not extracted to a shared module).

**Files:**
- Modify: `src/components/m4/PITTaxDiscountCalculator.jsx`

- [ ] **Step 3.1: Add shared primitives**

Replace the `// Shared UI primitives will go here in Task 3.` line with:

```jsx
// ─── Shared UI primitives ─────────────────────────────────────────────────────

function SectionHeader({ letter, title }) {
  return (
    <div style={{ marginTop: 28, marginBottom: 12 }}>
      <h2 style={{ fontFamily: PLAYFAIR, fontWeight: 700, fontSize: 20, color: NAVY, margin: 0 }}>
        <span style={{ color: GOLD, marginRight: 8 }}>{letter}.</span>
        {title}
      </h2>
    </div>
  );
}

function InfoBanner({ children, variant = 'gold' }) {
  const bg          = variant === 'gold' ? '#FBF4E3' : '#F0F4FA';
  const borderColor = variant === 'gold' ? GOLD : NAVY;
  return (
    <div
      style={{
        borderLeft: `4px solid ${borderColor}`,
        backgroundColor: bg,
        padding: '12px 16px',
        marginBottom: 20,
        fontFamily: SOURCE,
        fontSize: 14,
        color: NAVY,
        borderRadius: 4,
        lineHeight: 1.5,
      }}
    >
      {children}
    </div>
  );
}

function CurrencyInput({ id, label, helper, value, onChange, disabled, required, min = 0 }) {
  const [display, setDisplay] = useState(value > 0 ? String(value) : '');
  useEffect(() => {
    setDisplay(value > 0 ? String(value) : '');
  }, [value]);

  return (
    <div style={{ marginBottom: 18 }}>
      <label
        htmlFor={id}
        style={{ display: 'block', fontFamily: SOURCE, fontSize: 14, fontWeight: 600, color: NAVY, marginBottom: 6 }}
      >
        {label} {required && <span style={{ color: RED }}>*</span>}
      </label>
      <div style={{ position: 'relative' }}>
        <span
          style={{
            position: 'absolute',
            left: 12,
            top: '50%',
            transform: 'translateY(-50%)',
            fontFamily: SOURCE,
            color: disabled ? MUTED : NAVY,
            fontSize: 16,
            pointerEvents: 'none',
          }}
        >
          $
        </span>
        <input
          id={id}
          type="text"
          inputMode="numeric"
          value={display}
          disabled={disabled}
          onChange={(e) => {
            const cleaned = e.target.value.replace(/[^0-9.]/g, '');
            setDisplay(cleaned);
            const v = parseCurrency(cleaned);
            onChange(v < min ? min : v);
          }}
          style={{
            width: '100%',
            padding: '10px 12px 10px 24px',
            fontFamily: SOURCE,
            fontSize: 16,
            color: NAVY,
            border: `1px solid ${disabled ? '#D1D5DB' : '#CBD5E1'}`,
            borderRadius: 6,
            backgroundColor: disabled ? '#F3F4F6' : WHITE,
            outline: 'none',
            boxSizing: 'border-box',
          }}
        />
      </div>
      {helper && (
        <p style={{ fontFamily: SOURCE, fontSize: 13, color: MUTED, margin: '6px 0 0' }}>{helper}</p>
      )}
    </div>
  );
}

function IntegerInput({ id, label, helper, value, onChange, disabled, min = 0, max = 120 }) {
  return (
    <div style={{ marginBottom: 18 }}>
      <label
        htmlFor={id}
        style={{ display: 'block', fontFamily: SOURCE, fontSize: 14, fontWeight: 600, color: NAVY, marginBottom: 6 }}
      >
        {label}
      </label>
      <input
        id={id}
        type="number"
        value={value}
        min={min}
        max={max}
        disabled={disabled}
        onChange={(e) => {
          const n = parseInt(e.target.value, 10);
          if (isNaN(n)) return;
          const clamped = Math.max(min, Math.min(max, n));
          onChange(clamped);
        }}
        style={{
          width: 160,
          padding: '10px 12px',
          fontFamily: SOURCE,
          fontSize: 16,
          color: NAVY,
          border: `1px solid ${disabled ? '#D1D5DB' : '#CBD5E1'}`,
          borderRadius: 6,
          backgroundColor: disabled ? '#F3F4F6' : WHITE,
          outline: 'none',
          boxSizing: 'border-box',
        }}
      />
      {helper && (
        <p style={{ fontFamily: SOURCE, fontSize: 13, color: MUTED, margin: '6px 0 0' }}>{helper}</p>
      )}
    </div>
  );
}

function PercentInputWithSlider({ id, label, helper, value, onChange, disabled, min = 0, max = 100, step = 0.1 }) {
  return (
    <div style={{ marginBottom: 18 }}>
      <label
        htmlFor={id}
        style={{ display: 'block', fontFamily: SOURCE, fontSize: 14, fontWeight: 600, color: NAVY, marginBottom: 6 }}
      >
        {label}
      </label>
      <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
        <input
          id={id}
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          disabled={disabled}
          onChange={(e) => onChange(parseFloat(e.target.value))}
          style={{ flex: 1, accentColor: NAVY, cursor: disabled ? 'not-allowed' : 'pointer' }}
        />
        <div style={{ position: 'relative', width: 110 }}>
          <input
            type="number"
            value={value}
            min={min}
            max={max}
            step={step}
            disabled={disabled}
            onChange={(e) => {
              const n = parseFloat(e.target.value);
              if (isNaN(n)) return;
              onChange(Math.max(min, Math.min(max, n)));
            }}
            style={{
              width: '100%',
              padding: '10px 28px 10px 12px',
              fontFamily: SOURCE,
              fontSize: 16,
              color: NAVY,
              border: `1px solid ${disabled ? '#D1D5DB' : '#CBD5E1'}`,
              borderRadius: 6,
              backgroundColor: disabled ? '#F3F4F6' : WHITE,
              outline: 'none',
              boxSizing: 'border-box',
            }}
          />
          <span style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', color: MUTED, fontSize: 14 }}>%</span>
        </div>
      </div>
      {helper && (
        <p style={{ fontFamily: SOURCE, fontSize: 13, color: MUTED, margin: '6px 0 0' }}>{helper}</p>
      )}
    </div>
  );
}

function PercentInput({ id, label, helper, value, onChange, disabled, min = 0, max = 100, step = 0.01 }) {
  return (
    <div style={{ marginBottom: 18 }}>
      <label
        htmlFor={id}
        style={{ display: 'block', fontFamily: SOURCE, fontSize: 14, fontWeight: 600, color: NAVY, marginBottom: 6 }}
      >
        {label}
      </label>
      <div style={{ position: 'relative', width: 160 }}>
        <input
          id={id}
          type="number"
          value={value}
          min={min}
          max={max}
          step={step}
          disabled={disabled}
          onChange={(e) => {
            const n = parseFloat(e.target.value);
            if (isNaN(n)) return;
            onChange(Math.max(min, Math.min(max, n)));
          }}
          style={{
            width: '100%',
            padding: '10px 28px 10px 12px',
            fontFamily: SOURCE,
            fontSize: 16,
            color: NAVY,
            border: `1px solid ${disabled ? '#D1D5DB' : '#CBD5E1'}`,
            borderRadius: 6,
            backgroundColor: disabled ? '#F3F4F6' : WHITE,
            outline: 'none',
            boxSizing: 'border-box',
          }}
        />
        <span style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', color: MUTED, fontSize: 14 }}>%</span>
      </div>
      {helper && (
        <p style={{ fontFamily: SOURCE, fontSize: 13, color: MUTED, margin: '6px 0 0' }}>{helper}</p>
      )}
    </div>
  );
}

function ToggleGroup({ label, options, value, onChange, disabled }) {
  return (
    <div style={{ marginBottom: 18 }}>
      <div style={{ fontFamily: SOURCE, fontSize: 14, fontWeight: 600, color: NAVY, marginBottom: 8 }}>
        {label}
      </div>
      <div style={{ display: 'inline-flex', border: '1px solid #CBD5E1', borderRadius: 6, overflow: 'hidden' }}>
        {options.map((opt, idx) => (
          <button
            key={opt.value}
            type="button"
            disabled={disabled}
            onClick={() => onChange(opt.value)}
            style={{
              padding: '10px 20px',
              backgroundColor: value === opt.value ? NAVY : WHITE,
              color: value === opt.value ? PARCHMENT : NAVY,
              border: 'none',
              fontFamily: SOURCE,
              fontSize: 14,
              fontWeight: 600,
              cursor: disabled ? 'not-allowed' : 'pointer',
              borderLeft: idx === 0 ? 'none' : '1px solid #CBD5E1',
              opacity: disabled ? 0.6 : 1,
            }}
          >
            {opt.label}
          </button>
        ))}
      </div>
    </div>
  );
}

function CollapsiblePanel({ title, defaultOpen = false, children }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div
      style={{
        border: '1px solid #E5E7EB',
        borderRadius: 8,
        marginBottom: 20,
        overflow: 'hidden',
        backgroundColor: WHITE,
      }}
    >
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        style={{
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '14px 18px',
          backgroundColor: PARCHMENT,
          border: 'none',
          borderBottom: open ? '1px solid #E5E7EB' : 'none',
          cursor: 'pointer',
          fontFamily: SOURCE,
          fontSize: 15,
          fontWeight: 700,
          color: NAVY,
          textAlign: 'left',
        }}
        aria-expanded={open}
      >
        <span>{title}</span>
        {open ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
      </button>
      {open && <div style={{ padding: '18px 20px' }}>{children}</div>}
    </div>
  );
}
```

- [ ] **Step 3.2: Verify primitives exist**

Run: `grep -c "^function SectionHeader\|^function InfoBanner\|^function CurrencyInput\|^function IntegerInput\|^function PercentInputWithSlider\|^function PercentInput\|^function ToggleGroup\|^function CollapsiblePanel" src/components/m4/PITTaxDiscountCalculator.jsx`
Expected: `8`

- [ ] **Step 3.3: Commit**

```bash
git add src/components/m4/PITTaxDiscountCalculator.jsx
git commit -m "M4 Tool 2: inline UI primitives (inputs, banners, collapsible panel)"
```

---

## Task 4: Wire inputs, state, pre-population, and memoized results

Replace the stub main-component body from Task 1 with the full wired-up inputs and memoized `results`, `propertyDivision`, `pensionScenario`, and `referenceTable`.

**Files:**
- Modify: `src/components/m4/PITTaxDiscountCalculator.jsx`

- [ ] **Step 4.1: Replace the component body**

Find this block inside `PITTaxDiscountCalculator`:

```jsx
  // Full component body will be filled in subsequent tasks.
  return (
    <div style={{ maxWidth: 900, margin: '0 auto', padding: '32px 20px 80px', fontFamily: SOURCE, color: NAVY }}>
      <h1 style={{ fontFamily: PLAYFAIR, fontWeight: 700, fontSize: 28, margin: '0 0 8px' }}>
        Point in Time Tax Discount Calculator
      </h1>
      <p style={{ fontFamily: SOURCE, fontSize: 16, color: `${NAVY}B3`, margin: '0 0 28px', lineHeight: 1.55 }}>
        Calculate the proper tax discount on a retirement plan being divided in divorce — accounting for the time value of money between division date and withdrawal.
      </p>
    </div>
  );
```

Replace it with:

```jsx
  // ─── Store hooks ────────────────────────────────────────────────────────────
  const pitTaxDiscount     = useM4Store((s) => s.pitTaxDiscount);
  const setPITInputs       = useM4Store((s) => s.setPITInputs);
  const setPITResults      = useM4Store((s) => s.setPITResults);
  const setPrePopulated    = useM4Store((s) => s.setPrePopulated);
  const filingStatusResults = useM4Store((s) => s.filingStatusOptimizer.results);
  const retirementItems    = useM2Store((s) => s.maritalEstateInventory.items.filter((i) => i.category === 'retirement'));
  const updateRetirementDivision = useBlueprintStore((s) => s.updateRetirementDivision);

  const inputs = isReadOnly ? SAMPLE_DATA_PIT : pitTaxDiscount.inputs;
  const disabled = isReadOnly;

  // Pre-pop banners
  const [m2Banner, setM2Banner] = useState(null);     // { count, total } or null
  const [tool1Banner, setTool1Banner] = useState(null); // rate number or null

  // ─── Pre-population: M2 retirement accounts ─────────────────────────────────
  const retirementTotal = useMemo(() => retirementItems.reduce((sum, i) => sum + (Number(i.currentValue) || 0), 0), [retirementItems]);
  const retirementCount = retirementItems.length;

  useEffect(() => {
    if (!isFullAccess) return;
    if (retirementTotal <= 0) return;
    const alreadyPrePopped = pitTaxDiscount.prePopulated.fromM2;

    if (!alreadyPrePopped) {
      setPITInputs({ planBalance: retirementTotal });
      setPrePopulated('pitTaxDiscount', 'fromM2');
      setM2Banner({ count: retirementCount, total: retirementTotal });
    } else if (pitTaxDiscount.inputs.planBalance === retirementTotal) {
      setM2Banner({ count: retirementCount, total: retirementTotal });
    }
  }, [
    isFullAccess,
    retirementTotal,
    retirementCount,
    pitTaxDiscount.prePopulated.fromM2,
    pitTaxDiscount.inputs.planBalance,
    setPITInputs,
    setPrePopulated,
  ]);

  // ─── Pre-population: M4 Tool 1 (Filing Status Optimizer) effective tax rate ─
  useEffect(() => {
    if (!isFullAccess) return;
    if (!filingStatusResults) return;
    const best = filingStatusResults.bestOption;
    const rate = best && filingStatusResults.scenarios[best]?.effectiveRate;
    if (rate == null || rate <= 0) return;

    const alreadyPrePopped = pitTaxDiscount.prePopulated.fromTool1;
    if (!alreadyPrePopped) {
      setPITInputs({ effectiveTaxRate: rate });
      setPrePopulated('pitTaxDiscount', 'fromTool1');
      setTool1Banner(rate);
    } else if (Math.abs(pitTaxDiscount.inputs.effectiveTaxRate - rate) < 0.001) {
      setTool1Banner(rate);
    }
  }, [
    isFullAccess,
    filingStatusResults,
    pitTaxDiscount.prePopulated.fromTool1,
    pitTaxDiscount.inputs.effectiveTaxRate,
    setPITInputs,
    setPrePopulated,
  ]);

  // ─── Validation ─────────────────────────────────────────────────────────────
  const inputsValid =
    inputs.planBalance > 0 &&
    inputs.currentAge >= 18 &&
    inputs.currentAge <= 90 &&
    inputs.withdrawalStartAge > inputs.currentAge &&
    inputs.withdrawalEndAge > inputs.withdrawalStartAge &&
    inputs.effectiveTaxRate >= 10 && inputs.effectiveTaxRate <= 50 &&
    inputs.discountRate >= 0 && inputs.discountRate <= 15;

  // ─── Live-computed results ──────────────────────────────────────────────────
  const results = useMemo(() => (inputsValid ? calculatePIT(inputs) : null), [inputs, inputsValid]);

  const propertyDivision = useMemo(() => {
    if (!results || !inputs.showPropertyDivision) return null;
    return calculatePropertyDivision(results, inputs.totalCashAssets);
  }, [results, inputs.showPropertyDivision, inputs.totalCashAssets]);

  const pensionScenario = useMemo(() => {
    if (!results || inputs.planType !== 'pension') return null;
    return calculatePensionScenario(inputs);
  }, [results, inputs]);

  const referenceTable = useMemo(
    () => (inputsValid ? generateReferenceTable(inputs.discountRate) : null),
    [inputs.discountRate, inputsValid],
  );

  // ─── Persist results + sync to blueprint ────────────────────────────────────
  useEffect(() => {
    if (isReadOnly) return;
    if (!results) return;

    setPITResults(results);
    updateRetirementDivision({
      planBalance: inputs.planBalance,
      planType: inputs.planType,
      taxDiscountPercent: results.tdPercent,
      taxDiscountDollars: results.tdDollars,
      taxAdjustedValue: results.taxAdjustedValue,
      traditionalDiscountDollars: results.traditionalTD,
      overage: results.overage,
      n: results.n,
      effectiveTaxRate: inputs.effectiveTaxRate,
      discountRate: inputs.discountRate,
    });
  }, [isReadOnly, results, inputs, setPITResults, updateRetirementDivision]);

  // ─── Handlers ───────────────────────────────────────────────────────────────
  const updateInput = useCallback(
    (patch) => {
      if (disabled) return;
      setPITInputs(patch);
    },
    [disabled, setPITInputs],
  );

  const handlePrint = useCallback(() => {
    if (typeof window !== 'undefined') window.print();
  }, []);

  // ─── Render ─────────────────────────────────────────────────────────────────
  return (
    <div
      className="pit-calc-root"
      style={{
        maxWidth: 900,
        margin: '0 auto',
        padding: '32px 20px 80px',
        fontFamily: SOURCE,
        color: NAVY,
        position: 'relative',
      }}
    >
      {/* Sample Data badge for Navigator tier */}
      {isReadOnly && (
        <div
          style={{
            position: 'absolute',
            top: 20,
            right: 20,
            backgroundColor: GOLD,
            color: NAVY,
            fontFamily: SOURCE,
            fontWeight: 700,
            fontSize: 12,
            padding: '4px 10px',
            borderRadius: 999,
            letterSpacing: 0.3,
          }}
          className="pit-no-print"
        >
          Sample Data
        </div>
      )}

      {/* Header */}
      <h1 style={{ fontFamily: PLAYFAIR, fontWeight: 700, fontSize: 28, margin: '0 0 8px' }}>
        Point in Time Tax Discount Calculator
      </h1>
      <p
        style={{
          fontFamily: SOURCE,
          fontSize: 16,
          color: `${NAVY}B3`,
          margin: '0 0 28px',
          lineHeight: 1.55,
        }}
      >
        Calculate the proper tax discount on a retirement plan being divided in divorce — accounting for the time value of money between division date and withdrawal.
      </p>

      {/* Pre-population banners */}
      {isFullAccess && m2Banner && m2Banner.count > 1 && (
        <InfoBanner variant="gold">
          You listed {m2Banner.count} retirement accounts totaling {fmtCurrency(m2Banner.total)}. This calculator works with one plan at a time — enter the plan being divided below.
        </InfoBanner>
      )}
      {isFullAccess && m2Banner && m2Banner.count === 1 && (
        <InfoBanner variant="gold">
          Plan balance pre-filled from your Marital Estate Inventory ({fmtCurrency(m2Banner.total)}).
        </InfoBanner>
      )}
      {isFullAccess && tool1Banner != null && (
        <InfoBanner variant="gold">
          Tax rate pre-filled from your Filing Status Optimizer results ({fmtPercent(tool1Banner, 2)}).
        </InfoBanner>
      )}
      {isReadOnly && (
        <InfoBanner variant="gold">
          You are viewing a preview with sample data ($500,000 plan, age 45, 25% tax, 5% discount rate). Upgrade to Signature to run this tool with your own numbers.
        </InfoBanner>
      )}

      {/* Section A — Plan Details */}
      <SectionHeader letter="A" title="Retirement Plan Details" />
      <CurrencyInput
        id="pit-a1"
        label="Plan Balance"
        helper="The total value of the retirement plan being divided."
        value={inputs.planBalance}
        disabled={disabled}
        required
        onChange={(v) => updateInput({ planBalance: v })}
      />
      <ToggleGroup
        label="Plan Type"
        value={inputs.planType}
        disabled={disabled}
        options={[
          { value: '401k',    label: '401(k) / IRA' },
          { value: 'pension', label: 'Pension' },
        ]}
        onChange={(v) => updateInput({ planType: v })}
      />

      {/* Section B — Tax & Timing */}
      <SectionHeader letter="B" title="Tax & Timing Assumptions" />
      <IntegerInput
        id="pit-b1"
        label="Current age"
        value={inputs.currentAge}
        disabled={disabled}
        min={18}
        max={90}
        onChange={(v) => updateInput({ currentAge: v })}
      />
      <IntegerInput
        id="pit-b2"
        label="Withdrawal start age"
        helper={inputs.withdrawalStartAge <= inputs.currentAge ? 'Must be greater than current age.' : undefined}
        value={inputs.withdrawalStartAge}
        disabled={disabled}
        min={inputs.currentAge + 1}
        max={100}
        onChange={(v) => updateInput({ withdrawalStartAge: v })}
      />
      <IntegerInput
        id="pit-b3"
        label="Withdrawal end age"
        helper={inputs.withdrawalEndAge <= inputs.withdrawalStartAge ? 'Must be greater than start age.' : undefined}
        value={inputs.withdrawalEndAge}
        disabled={disabled}
        min={inputs.withdrawalStartAge + 1}
        max={110}
        onChange={(v) => updateInput({ withdrawalEndAge: v })}
      />
      <PercentInputWithSlider
        id="pit-b4"
        label="Future effective tax rate"
        helper="Your estimated tax rate when you withdraw funds. 20–30% is typical for most retirees."
        value={inputs.effectiveTaxRate}
        disabled={disabled}
        min={10}
        max={50}
        step={0.1}
        onChange={(v) => updateInput({ effectiveTaxRate: v })}
      />
      <PercentInput
        id="pit-b5"
        label="Discount rate"
        helper="Typically the US Treasury bond yield matching your time horizon. A financial advisor can help determine the right rate."
        value={inputs.discountRate}
        disabled={disabled}
        min={0}
        max={15}
        step={0.01}
        onChange={(v) => updateInput({ discountRate: v })}
      />

      {/* Section C — Property Division Comparison toggle */}
      <SectionHeader letter="C" title="Property Division Comparison" />
      <CurrencyInput
        id="pit-c1"
        label="Total cash / other marital assets"
        helper="Used to model a 50/50 split where one spouse takes the retirement plan and the other takes cash."
        value={inputs.totalCashAssets}
        disabled={disabled}
        onChange={(v) => updateInput({ totalCashAssets: v })}
      />
      <ToggleGroup
        label="Show Property Division Comparison"
        value={inputs.showPropertyDivision ? 'on' : 'off'}
        disabled={disabled}
        options={[
          { value: 'on',  label: 'On' },
          { value: 'off', label: 'Off' },
        ]}
        onChange={(v) => updateInput({ showPropertyDivision: v === 'on' })}
      />

      {/* Results panels — filled in Tasks 5–9 */}
      <div style={{ marginTop: 32 }}>
        {/* PANEL-1 */}
        {/* PANEL-2 */}
        {/* PANEL-3 */}
        {/* PANEL-4 */}
        {/* PANEL-5 */}
      </div>

      {/* Print button + disclaimer + print stylesheet — filled in Task 10 */}
    </div>
  );
```

- [ ] **Step 4.2: Verify file still compiles structurally**

Run: `grep -c "useM4Store\|useM2Store\|useBlueprintStore\|useMemo\|useEffect" src/components/m4/PITTaxDiscountCalculator.jsx`
Expected: at least `8` matches.

- [ ] **Step 4.3: Commit**

```bash
git add src/components/m4/PITTaxDiscountCalculator.jsx
git commit -m "M4 Tool 2: wire inputs, store hooks, pre-population, memoized results"
```

---

## Task 5: Build Panel 1 — Tax Discount Results (always shown)

**Files:**
- Modify: `src/components/m4/PITTaxDiscountCalculator.jsx`

- [ ] **Step 5.1: Add the Panel 1 renderer**

At the bottom of the file (after the main component's closing `}`), add a helper renderer:

```jsx
// ─── Panel 1 — Tax Discount Results ───────────────────────────────────────────
function Panel1TaxDiscount({ results, inputs }) {
  if (!results) {
    return (
      <div style={{ padding: 24, backgroundColor: PARCHMENT, borderRadius: 8, fontFamily: SOURCE, color: MUTED }}>
        Enter valid inputs above to see your tax discount.
      </div>
    );
  }

  const chartData = [
    { name: 'Traditional', amount: Math.round(results.traditionalTD), fill: RED },
    { name: 'Point in Time', amount: Math.round(results.tdDollars),   fill: GOLD },
  ];

  return (
    <div
      style={{
        backgroundColor: WHITE,
        border: `1px solid ${GOLD}`,
        borderRadius: 10,
        padding: '24px 24px 20px',
        marginBottom: 24,
      }}
    >
      <h2 style={{ fontFamily: PLAYFAIR, fontWeight: 700, fontSize: 22, color: NAVY, margin: '0 0 16px' }}>
        Tax Discount Results
      </h2>

      <div style={{ textAlign: 'center', marginBottom: 12 }}>
        <div
          style={{
            fontFamily: PLAYFAIR,
            fontWeight: 700,
            fontSize: 'clamp(36px, 8vw, 48px)',
            color: GOLD,
            lineHeight: 1.1,
          }}
        >
          {fmtPercent(results.tdPercent, 2)}
        </div>
        <div style={{ fontFamily: SOURCE, fontSize: 24, fontWeight: 600, color: NAVY, marginTop: 4 }}>
          {fmtCurrency(results.tdDollars)}
        </div>
        <div style={{ fontFamily: SOURCE, fontSize: 13, color: MUTED, marginTop: 4 }}>
          Point in Time Tax Discount on {fmtCurrency(results.PB)} plan balance
        </div>
      </div>

      <div style={{ height: 1, backgroundColor: '#E5E7EB', margin: '18px 0' }} />

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 24, justifyContent: 'space-between' }}>
        <div>
          <div style={{ fontFamily: SOURCE, fontSize: 13, color: MUTED }}>Tax Adjusted Plan Value (TA)</div>
          <div style={{ fontFamily: SOURCE, fontSize: 28, fontWeight: 600, color: NAVY }}>
            {fmtCurrency(results.taxAdjustedValue)}
          </div>
        </div>
        <div>
          <div style={{ fontFamily: SOURCE, fontSize: 13, color: MUTED }}>Years to withdrawal midpoint</div>
          <div style={{ fontFamily: SOURCE, fontSize: 20, fontWeight: 600, color: NAVY }}>{results.n}</div>
        </div>
      </div>

      <div style={{ marginTop: 20 }}>
        <div style={{ fontFamily: SOURCE, fontSize: 14, color: NAVY, marginBottom: 4 }}>
          <strong>Traditional Tax Discount:</strong> {fmtPercent(results.TR, 2)} ({fmtCurrency(results.traditionalTD)})
        </div>
        <div style={{ fontFamily: SOURCE, fontSize: 14, color: NAVY }}>
          <strong>Point in Time Tax Discount:</strong> {fmtPercent(results.tdPercent, 2)} ({fmtCurrency(results.tdDollars)})
        </div>
      </div>

      <div
        style={{
          marginTop: 12,
          padding: '10px 14px',
          backgroundColor: '#FDECEC',
          borderLeft: `4px solid ${RED}`,
          color: RED,
          fontFamily: SOURCE,
          fontSize: 14,
          fontWeight: 600,
          borderRadius: 4,
        }}
      >
        Potential Overage Using Traditional Method: {fmtCurrency(results.overage)}
      </div>

      <p style={{ fontFamily: SOURCE, fontSize: 14, color: NAVY, lineHeight: 1.55, marginTop: 14 }}>
        The traditional method would discount <strong>{fmtCurrency(results.traditionalTD)}</strong>. Point in Time discounts <strong>{fmtCurrency(results.tdDollars)}</strong>. That's <strong>{fmtCurrency(results.overage)}</strong> — money that should stay in the property division.
      </p>

      <div style={{ marginTop: 18, height: 200 }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData} margin={{ top: 16, right: 16, bottom: 8, left: 8 }}>
            <XAxis dataKey="name" tick={{ fontFamily: SOURCE, fontSize: 13, fill: NAVY }} />
            <YAxis tickFormatter={(v) => fmtCurrency(v)} tick={{ fontFamily: SOURCE, fontSize: 12, fill: NAVY }} width={80} />
            <Tooltip formatter={(v) => [fmtCurrency(v), 'Discount']} contentStyle={{ fontFamily: SOURCE, fontSize: 13 }} />
            <Bar dataKey="amount" radius={[4, 4, 0, 0]}>
              <LabelList dataKey="amount" position="top" formatter={(v) => fmtCurrency(v)} style={{ fontFamily: SOURCE, fontSize: 12, fill: NAVY }} />
              {chartData.map((entry, idx) => (
                <Cell key={idx} fill={entry.fill} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
```

- [ ] **Step 5.2: Mount Panel 1 in the component**

Find the `{/* PANEL-1 */}` marker inside the main component's JSX and replace it with:

```jsx
        <Panel1TaxDiscount results={results} inputs={inputs} />
```

- [ ] **Step 5.3: Verify**

Run: `grep -c "Panel1TaxDiscount" src/components/m4/PITTaxDiscountCalculator.jsx`
Expected: `2` (one definition + one JSX usage).

- [ ] **Step 5.4: Commit**

```bash
git add src/components/m4/PITTaxDiscountCalculator.jsx
git commit -m "M4 Tool 2: Panel 1 — Tax Discount Results with comparison bar chart"
```

---

## Task 6: Build Panel 2 — Math Verification (collapsible)

**Files:**
- Modify: `src/components/m4/PITTaxDiscountCalculator.jsx`

- [ ] **Step 6.1: Add the Panel 2 renderer**

Append after `Panel1TaxDiscount`:

```jsx
// ─── Panel 2 — Math Verification ──────────────────────────────────────────────
function Panel2MathVerification({ results }) {
  if (!results) return null;

  const rows = [
    { label: 'Tax Discount (TD)',                          value: fmtCurrency(results.tdDollars) },
    { label: `TD Growth over ${results.n} years (TDg)`,    value: fmtCurrency(results.tdGrowth) },
    { label: 'Tax Discount at Withdrawal (TD + TDg)',      value: fmtCurrency(results.taxDiscountAtWithdrawal) },
    { label: 'Tax-Adjusted Award (TA)',                    value: fmtCurrency(results.taxAdjustedValue) },
    { label: 'Taxable Distribution (TA + TD + TDg)',       value: fmtCurrency(results.taxableDistribution) },
    { label: 'Taxes (Distribution × TR)',                  value: fmtCurrency(results.taxes) },
    { label: 'After-Tax Distribution',                     value: fmtCurrency(results.afterTaxDistribution) },
  ];

  return (
    <CollapsiblePanel title="Proof / Math Check">
      <table style={{ width: '100%', borderCollapse: 'collapse', fontFamily: SOURCE, fontSize: 14, color: NAVY }}>
        <tbody>
          {rows.map((r, idx) => (
            <tr key={r.label} style={{ backgroundColor: idx % 2 === 0 ? WHITE : '#FAFAFA' }}>
              <td style={{ padding: '8px 10px', borderTop: '1px solid #E5E7EB' }}>{r.label}</td>
              <td style={{ padding: '8px 10px', borderTop: '1px solid #E5E7EB', textAlign: 'right', fontVariantNumeric: 'tabular-nums', fontWeight: 600 }}>
                {r.value}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <div
        style={{
          marginTop: 14,
          padding: '10px 14px',
          backgroundColor: results.verified ? '#E7F5EC' : '#FDECEC',
          borderLeft: `4px solid ${results.verified ? GREEN : RED}`,
          borderRadius: 4,
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          fontFamily: SOURCE,
          fontSize: 14,
          color: NAVY,
        }}
      >
        {results.verified ? (
          <>
            <CheckCircle size={18} color={GREEN} />
            <span>Verified: After-tax distribution equals Tax Adjusted Award.</span>
          </>
        ) : (
          <>
            <XCircle size={18} color={RED} />
            <span>Math check failed — please report this to support.</span>
          </>
        )}
      </div>
    </CollapsiblePanel>
  );
}
```

- [ ] **Step 6.2: Mount Panel 2**

Replace `{/* PANEL-2 */}` with:

```jsx
        <Panel2MathVerification results={results} />
```

- [ ] **Step 6.3: Verify**

Run: `grep -c "Panel2MathVerification" src/components/m4/PITTaxDiscountCalculator.jsx`
Expected: `2`.

- [ ] **Step 6.4: Commit**

```bash
git add src/components/m4/PITTaxDiscountCalculator.jsx
git commit -m "M4 Tool 2: Panel 2 — Math Verification (proof chain, collapsible)"
```

---

## Task 7: Build Panel 3 — Property Division Comparison (collapsible)

**Files:**
- Modify: `src/components/m4/PITTaxDiscountCalculator.jsx`

- [ ] **Step 7.1: Add the Panel 3 renderer**

Append after `Panel2MathVerification`:

```jsx
// ─── Panel 3 — Property Division Comparison ──────────────────────────────────
function DivisionTable({ title, data }) {
  return (
    <div style={{ flex: 1, minWidth: 260 }}>
      <h4 style={{ fontFamily: SOURCE, fontWeight: 700, fontSize: 15, color: NAVY, margin: '0 0 8px' }}>
        {title}
      </h4>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontFamily: SOURCE, fontSize: 13, color: NAVY }}>
        <thead>
          <tr style={{ backgroundColor: NAVY, color: PARCHMENT }}>
            <th style={{ textAlign: 'left',  padding: '8px 10px', fontWeight: 600 }}></th>
            <th style={{ textAlign: 'right', padding: '8px 10px', fontWeight: 600 }}>Husband</th>
            <th style={{ textAlign: 'right', padding: '8px 10px', fontWeight: 600 }}>Wife</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td style={{ padding: '8px 10px', borderTop: '1px solid #E5E7EB' }}>Retirement Plan (disc.)</td>
            <td style={{ padding: '8px 10px', borderTop: '1px solid #E5E7EB', textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>{fmtCurrency(data.husbandRetirement)}</td>
            <td style={{ padding: '8px 10px', borderTop: '1px solid #E5E7EB', textAlign: 'right' }}>—</td>
          </tr>
          <tr style={{ backgroundColor: '#FAFAFA' }}>
            <td style={{ padding: '8px 10px', borderTop: '1px solid #E5E7EB' }}>Cash Assets</td>
            <td style={{ padding: '8px 10px', borderTop: '1px solid #E5E7EB', textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>{fmtCurrency(data.husbandCash)}</td>
            <td style={{ padding: '8px 10px', borderTop: '1px solid #E5E7EB', textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>{fmtCurrency(data.wifeCash)}</td>
          </tr>
          <tr>
            <td style={{ padding: '8px 10px', borderTop: `2px solid ${NAVY}`, fontWeight: 700 }}>Total</td>
            <td style={{ padding: '8px 10px', borderTop: `2px solid ${NAVY}`, textAlign: 'right', fontVariantNumeric: 'tabular-nums', fontWeight: 700 }}>{fmtCurrency(data.total)}</td>
            <td style={{ padding: '8px 10px', borderTop: `2px solid ${NAVY}`, textAlign: 'right', fontVariantNumeric: 'tabular-nums', fontWeight: 700 }}>{fmtCurrency(data.total)}</td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}

function Panel3PropertyDivision({ propertyDivision }) {
  if (!propertyDivision) return null;

  return (
    <CollapsiblePanel title="Property Division Impact">
      <div style={{ marginBottom: 10, fontFamily: SOURCE, fontSize: 13, color: MUTED }}>
        Total marital estate: <strong>{fmtCurrency(propertyDivision.totalEstate)}</strong> · Each spouse's 50% share: <strong>{fmtCurrency(propertyDivision.halfEstate)}</strong>
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 24 }}>
        <DivisionTable title="Traditional Division" data={propertyDivision.traditional} />
        <DivisionTable title="Point in Time Division" data={propertyDivision.pit} />
      </div>
      <div
        style={{
          marginTop: 18,
          padding: '12px 16px',
          backgroundColor: '#FBF4E3',
          borderLeft: `4px solid ${GOLD}`,
          borderRadius: 4,
          fontFamily: SOURCE,
          fontSize: 14,
          color: NAVY,
          fontWeight: 600,
        }}
      >
        Wife receives {fmtCurrency(propertyDivision.wifeDifference)} more under Point in Time method.
      </div>
    </CollapsiblePanel>
  );
}
```

- [ ] **Step 7.2: Mount Panel 3**

Replace `{/* PANEL-3 */}` with:

```jsx
        {inputs.showPropertyDivision && <Panel3PropertyDivision propertyDivision={propertyDivision} />}
```

- [ ] **Step 7.3: Verify**

Run: `grep -c "Panel3PropertyDivision\|DivisionTable" src/components/m4/PITTaxDiscountCalculator.jsx`
Expected: at least `3`.

- [ ] **Step 7.4: Commit**

```bash
git add src/components/m4/PITTaxDiscountCalculator.jsx
git commit -m "M4 Tool 2: Panel 3 — Property Division Comparison (traditional vs PIT)"
```

---

## Task 8: Build Panel 4 — Reference Table (collapsible)

**Files:**
- Modify: `src/components/m4/PITTaxDiscountCalculator.jsx`

- [ ] **Step 8.1: Add the Panel 4 renderer**

Append after `Panel3PropertyDivision`:

```jsx
// ─── Panel 4 — Reference Table ────────────────────────────────────────────────
function Panel4ReferenceTable({ referenceTable, inputs }) {
  if (!referenceTable) return null;

  // Highlight rule: match on user's current age (closest of 35/45/55/65) and nearest bracket tax rate.
  const closestAge = [35, 45, 55, 65].reduce((best, a) => (
    Math.abs(a - inputs.currentAge) < Math.abs(best - inputs.currentAge) ? a : best
  ), 35);
  const closestRate = [20, 25, 30, 35, 40].reduce((best, r) => (
    Math.abs(r - inputs.effectiveTaxRate) < Math.abs(best - inputs.effectiveTaxRate) ? r : best
  ), 25);

  return (
    <CollapsiblePanel title="Quick Reference: Tax Discounts by Age & Rate">
      <p style={{ fontFamily: SOURCE, fontSize: 13, color: MUTED, margin: '0 0 12px' }}>
        TD% at your discount rate ({fmtPercent(inputs.discountRate, 2)}), end age 85. Highlighted cell is closest to your inputs (age {closestAge}, tax rate {closestRate}%).
      </p>
      <div style={{ overflowX: 'auto', border: '1px solid #E5E7EB', borderRadius: 6 }}>
        <table style={{ width: '100%', minWidth: 720, borderCollapse: 'collapse', fontFamily: SOURCE, fontSize: 13, color: NAVY }}>
          <thead>
            <tr>
              <th rowSpan={2} style={{ padding: '8px 10px', backgroundColor: NAVY, color: PARCHMENT, textAlign: 'left', verticalAlign: 'middle' }}>
                Age
              </th>
              {[20, 25, 30, 35, 40].map((rate) => (
                <th
                  key={rate}
                  colSpan={3}
                  style={{ padding: '8px 10px', backgroundColor: NAVY, color: PARCHMENT, textAlign: 'center', borderLeft: '1px solid rgba(255,255,255,0.2)' }}
                >
                  {rate}%
                </th>
              ))}
            </tr>
            <tr>
              {[20, 25, 30, 35, 40].flatMap((rate) =>
                ['Early (55)', 'Normal (65)', 'Deferred (75)'].map((scn, j) => (
                  <th
                    key={`${rate}-${scn}`}
                    style={{
                      padding: '6px 8px',
                      backgroundColor: '#2A3A5B',
                      color: PARCHMENT,
                      fontWeight: 500,
                      fontSize: 11,
                      textAlign: 'center',
                      borderLeft: j === 0 ? '1px solid rgba(255,255,255,0.2)' : 'none',
                    }}
                  >
                    {scn.split(' ')[0]}
                  </th>
                ))
              )}
            </tr>
          </thead>
          <tbody>
            {referenceTable.map((row, rIdx) => (
              <tr key={row.age} style={{ backgroundColor: rIdx % 2 === 0 ? WHITE : '#FAFAFA' }}>
                <td style={{ padding: '8px 10px', borderTop: '1px solid #E5E7EB', fontWeight: 700 }}>{row.age}</td>
                {row.rates.flatMap((rateCell) =>
                  rateCell.scenarios.map((scn, sIdx) => {
                    const isHighlight = row.age === closestAge && rateCell.rate === closestRate;
                    return (
                      <td
                        key={`${row.age}-${rateCell.rate}-${scn.label}`}
                        style={{
                          padding: '8px 8px',
                          borderTop: '1px solid #E5E7EB',
                          borderLeft: sIdx === 0 ? '1px solid #E5E7EB' : 'none',
                          textAlign: 'center',
                          fontVariantNumeric: 'tabular-nums',
                          backgroundColor: isHighlight ? '#FBF4E3' : 'transparent',
                          fontWeight: isHighlight ? 700 : 400,
                          color: isHighlight ? NAVY : NAVY,
                          outline: isHighlight ? `2px solid ${GOLD}` : 'none',
                          outlineOffset: -2,
                        }}
                      >
                        {fmtPercent(scn.tdPercent, 1)}
                      </td>
                    );
                  })
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </CollapsiblePanel>
  );
}
```

- [ ] **Step 8.2: Mount Panel 4**

Replace `{/* PANEL-4 */}` with:

```jsx
        <Panel4ReferenceTable referenceTable={referenceTable} inputs={inputs} />
```

- [ ] **Step 8.3: Verify**

Run: `grep -c "Panel4ReferenceTable\|referenceTable\|Reference" src/components/m4/PITTaxDiscountCalculator.jsx`
Expected: at least `4`.

- [ ] **Step 8.4: Commit**

```bash
git add src/components/m4/PITTaxDiscountCalculator.jsx
git commit -m "M4 Tool 2: Panel 4 — Quick Reference matrix with highlighted cell"
```

---

## Task 9: Build Panel 5 — Pension Scenario Method (collapsible, conditional)

**Files:**
- Modify: `src/components/m4/PITTaxDiscountCalculator.jsx`

- [ ] **Step 9.1: Add the Panel 5 renderer**

Append after `Panel4ReferenceTable`:

```jsx
// ─── Panel 5 — Pension Scenario Method ────────────────────────────────────────
function Panel5PensionScenario({ pensionScenario, results }) {
  if (!pensionScenario || !results) return null;

  const singlePointTD = results.tdPercent;
  const diff          = pensionScenario.scenarioTDPercent - singlePointTD;

  return (
    <CollapsiblePanel title="Pension Scenario Method">
      <p style={{ fontFamily: SOURCE, fontSize: 14, color: NAVY, lineHeight: 1.55, margin: '0 0 14px' }}>
        Pensions pay out over many years. The Scenario Method calculates a weighted average across each payment year — more precise than a single-point estimate.
      </p>
      <div style={{ overflowX: 'auto', border: '1px solid #E5E7EB', borderRadius: 6 }}>
        <table style={{ width: '100%', minWidth: 520, borderCollapse: 'collapse', fontFamily: SOURCE, fontSize: 13, color: NAVY }}>
          <thead>
            <tr style={{ backgroundColor: NAVY, color: PARCHMENT }}>
              <th style={{ padding: '8px 10px', textAlign: 'left' }}>Year</th>
              <th style={{ padding: '8px 10px', textAlign: 'left' }}>Age</th>
              <th style={{ padding: '8px 10px', textAlign: 'right' }}>n</th>
              <th style={{ padding: '8px 10px', textAlign: 'right' }}>TD%</th>
              <th style={{ padding: '8px 10px', textAlign: 'right' }}>Allocation</th>
              <th style={{ padding: '8px 10px', textAlign: 'right' }}>Weighted TD%</th>
            </tr>
          </thead>
          <tbody>
            {pensionScenario.yearRows.map((row, idx) => (
              <tr key={row.yearNum} style={{ backgroundColor: idx % 2 === 0 ? WHITE : '#FAFAFA' }}>
                <td style={{ padding: '6px 10px', borderTop: '1px solid #E5E7EB' }}>{row.yearNum}</td>
                <td style={{ padding: '6px 10px', borderTop: '1px solid #E5E7EB' }}>{row.age}</td>
                <td style={{ padding: '6px 10px', borderTop: '1px solid #E5E7EB', textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>{row.n}</td>
                <td style={{ padding: '6px 10px', borderTop: '1px solid #E5E7EB', textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>{fmtPercent(row.tdPercent, 2)}</td>
                <td style={{ padding: '6px 10px', borderTop: '1px solid #E5E7EB', textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>{fmtPercent(row.allocation, 2)}</td>
                <td style={{ padding: '6px 10px', borderTop: '1px solid #E5E7EB', textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>{fmtPercent(row.weightedTD, 3)}</td>
              </tr>
            ))}
            <tr style={{ backgroundColor: PARCHMENT }}>
              <td colSpan={5} style={{ padding: '10px', borderTop: `2px solid ${NAVY}`, fontWeight: 700 }}>
                Scenario TD%: <span style={{ color: GOLD }}>{fmtPercent(pensionScenario.scenarioTDPercent, 2)}</span> &nbsp;·&nbsp; TD$: <span style={{ color: GOLD }}>{fmtCurrency(pensionScenario.scenarioTDDollars)}</span>
              </td>
              <td style={{ borderTop: `2px solid ${NAVY}` }} />
            </tr>
          </tbody>
        </table>
      </div>
      <p style={{ fontFamily: SOURCE, fontSize: 13, color: MUTED, margin: '12px 0 0' }}>
        Scenario Method TD: <strong style={{ color: NAVY }}>{fmtPercent(pensionScenario.scenarioTDPercent, 2)}</strong> vs. Single-Point PIT TD: <strong style={{ color: NAVY }}>{fmtPercent(singlePointTD, 2)}</strong>. Difference: <strong style={{ color: NAVY }}>{fmtPercent(diff, 2)}</strong>.
      </p>
    </CollapsiblePanel>
  );
}
```

- [ ] **Step 9.2: Mount Panel 5 (conditional on planType === 'pension')**

Replace `{/* PANEL-5 */}` with:

```jsx
        {inputs.planType === 'pension' && (
          <Panel5PensionScenario pensionScenario={pensionScenario} results={results} />
        )}
```

- [ ] **Step 9.3: Verify**

Run: `grep -c "Scenario\|pension\|Pension" src/components/m4/PITTaxDiscountCalculator.jsx`
Expected: several matches (>= 8).

- [ ] **Step 9.4: Commit**

```bash
git add src/components/m4/PITTaxDiscountCalculator.jsx
git commit -m "M4 Tool 2: Panel 5 — Pension Scenario Method (year-by-year weighted TD)"
```

---

## Task 10: Print/PDF export, disclaimer, and print stylesheet

**Files:**
- Modify: `src/components/m4/PITTaxDiscountCalculator.jsx`

- [ ] **Step 10.1: Add the print CSS + print button + disclaimer**

Find this block inside the main component:

```jsx
      {/* Print button + disclaimer + print stylesheet — filled in Task 10 */}
    </div>
  );
```

Replace it with:

```jsx
      {/* Print button (Signature tier only) */}
      {isFullAccess && results && (
        <div style={{ marginTop: 24, marginBottom: 8 }} className="pit-no-print">
          <button
            type="button"
            onClick={handlePrint}
            style={{
              backgroundColor: NAVY,
              color: WHITE,
              fontFamily: SOURCE,
              fontWeight: 700,
              fontSize: 15,
              padding: '12px 24px',
              borderRadius: 8,
              border: 'none',
              cursor: 'pointer',
              letterSpacing: 0.3,
            }}
          >
            Generate PDF Report
          </button>
          <p style={{ fontFamily: SOURCE, fontSize: 12, color: MUTED, margin: '6px 0 0' }}>
            Opens your browser's print dialog. Choose "Save as PDF" to export.
          </p>
        </div>
      )}

      {/* Disclaimer */}
      <div
        style={{
          marginTop: 32,
          padding: '16px 18px',
          backgroundColor: '#F3F4F6',
          borderRadius: 6,
          fontFamily: SOURCE,
          fontSize: 13,
          color: MUTED,
          lineHeight: 1.55,
        }}
      >
        This calculator implements the "Point in Time" methodology as described by Steven E. Sutherland, CPA, CFP®, CFE, CDFA®. Results are for educational purposes only. Actual tax discounts depend on individual circumstances including tax law changes, actual withdrawal patterns, and investment returns. Consult a Certified Divorce Financial Analyst® for case-specific analysis.
      </div>

      {/* Print stylesheet — makes the calculator render cleanly in print/PDF */}
      <style jsx global>{`
        @media print {
          @page {
            size: letter;
            margin: 0.5in;
          }
          body {
            background-color: ${WHITE} !important;
          }
          .pit-no-print {
            display: none !important;
          }
          .pit-calc-root {
            max-width: none !important;
            padding: 0 !important;
          }
          /* Force every collapsible panel open for print */
          .pit-calc-root button[aria-expanded] + div {
            display: block !important;
          }
          /* Remove interactive affordances */
          .pit-calc-root button,
          .pit-calc-root input,
          .pit-calc-root select {
            color: ${NAVY} !important;
          }
          .pit-calc-root h1,
          .pit-calc-root h2,
          .pit-calc-root h3,
          .pit-calc-root h4 {
            page-break-after: avoid;
          }
          .pit-calc-root table {
            page-break-inside: avoid;
          }
        }
      `}</style>
    </div>
  );
```

**Note on collapsed panels in print:** the print CSS above attempts to force-open via the `[aria-expanded]` selector, but `CollapsiblePanel` only renders children when `open === true`. Since CSS can't flip React state, the safer approach is to force all panels open during print. Do this by adding a `forceOpen` prop. See Step 10.2.

- [ ] **Step 10.2: Add `forceOpen` support to `CollapsiblePanel` and an `isPrinting` hook**

Find the `CollapsiblePanel` definition (from Task 3). Replace it with:

```jsx
function CollapsiblePanel({ title, defaultOpen = false, forceOpen = false, children }) {
  const [open, setOpen] = useState(defaultOpen);
  const effectiveOpen = forceOpen || open;
  return (
    <div
      style={{
        border: '1px solid #E5E7EB',
        borderRadius: 8,
        marginBottom: 20,
        overflow: 'hidden',
        backgroundColor: WHITE,
      }}
    >
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        disabled={forceOpen}
        style={{
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '14px 18px',
          backgroundColor: PARCHMENT,
          border: 'none',
          borderBottom: effectiveOpen ? '1px solid #E5E7EB' : 'none',
          cursor: forceOpen ? 'default' : 'pointer',
          fontFamily: SOURCE,
          fontSize: 15,
          fontWeight: 700,
          color: NAVY,
          textAlign: 'left',
        }}
        aria-expanded={effectiveOpen}
      >
        <span>{title}</span>
        {effectiveOpen ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
      </button>
      {effectiveOpen && <div style={{ padding: '18px 20px' }}>{children}</div>}
    </div>
  );
}
```

Now add a print-detection hook to the main component. Find the existing `handlePrint` definition (added in Task 4):

```jsx
  const handlePrint = useCallback(() => {
    if (typeof window !== 'undefined') window.print();
  }, []);
```

and **replace it in place** with this expanded block (state + effect + handler — three declarations total, not duplicates of the original):

```jsx
  const [isPrinting, setIsPrinting] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const before = () => setIsPrinting(true);
    const after  = () => setIsPrinting(false);
    window.addEventListener('beforeprint', before);
    window.addEventListener('afterprint',  after);
    return () => {
      window.removeEventListener('beforeprint', before);
      window.removeEventListener('afterprint',  after);
    };
  }, []);

  const handlePrint = useCallback(() => {
    if (typeof window !== 'undefined') window.print();
  }, []);
```

Then pass `forceOpen={isPrinting}` to every `CollapsiblePanel` instance. Update each of the four panel renderers to accept `isPrinting` and forward it:

1. **`Panel2MathVerification`:** signature becomes `function Panel2MathVerification({ results, isPrinting })`. Its `<CollapsiblePanel title="Proof / Math Check">` becomes `<CollapsiblePanel title="Proof / Math Check" forceOpen={isPrinting}>`.

2. **`Panel3PropertyDivision`:** signature becomes `function Panel3PropertyDivision({ propertyDivision, isPrinting })`. Its `<CollapsiblePanel title="Property Division Impact">` becomes `<CollapsiblePanel title="Property Division Impact" forceOpen={isPrinting}>`.

3. **`Panel4ReferenceTable`:** signature becomes `function Panel4ReferenceTable({ referenceTable, inputs, isPrinting })`. Its `<CollapsiblePanel title="Quick Reference: Tax Discounts by Age & Rate">` becomes `<CollapsiblePanel title="Quick Reference: Tax Discounts by Age & Rate" forceOpen={isPrinting}>`.

4. **`Panel5PensionScenario`:** signature becomes `function Panel5PensionScenario({ pensionScenario, results, isPrinting })`. Its `<CollapsiblePanel title="Pension Scenario Method">` becomes `<CollapsiblePanel title="Pension Scenario Method" forceOpen={isPrinting}>`.

Then update the JSX mounting in the main component:

```jsx
        <Panel1TaxDiscount results={results} inputs={inputs} />
        <Panel2MathVerification results={results} isPrinting={isPrinting} />
        {inputs.showPropertyDivision && <Panel3PropertyDivision propertyDivision={propertyDivision} isPrinting={isPrinting} />}
        <Panel4ReferenceTable referenceTable={referenceTable} inputs={inputs} isPrinting={isPrinting} />
        {inputs.planType === 'pension' && (
          <Panel5PensionScenario pensionScenario={pensionScenario} results={results} isPrinting={isPrinting} />
        )}
```

- [ ] **Step 10.3: Verify**

Run: `grep -in "print\|pdf\|export" src/components/m4/PITTaxDiscountCalculator.jsx | head -10`
Expected: matches on `window.print`, `handlePrint`, `@media print`, `beforeprint`, `afterprint`, `Generate PDF Report`, `isPrinting`.

Run: `grep -c "forceOpen" src/components/m4/PITTaxDiscountCalculator.jsx`
Expected: at least `5` (one in definition, four in usage).

- [ ] **Step 10.4: Commit**

```bash
git add src/components/m4/PITTaxDiscountCalculator.jsx
git commit -m "M4 Tool 2: print-to-PDF via window.print + @media print stylesheet + force-open panels"
```

---

## Task 11: Final verification sweep

**Files:** (none changed — verification only)

- [ ] **Step 11.1: Files exist**

Run: `ls -la src/components/m4/PITTaxDiscountCalculator.jsx src/app/modules/m4/tax-discount/page.jsx`
Expected: both files exist, non-zero bytes.

- [ ] **Step 11.2: Blueprint integration**

Run: `grep -n "updateRetirementDivision" src/components/m4/PITTaxDiscountCalculator.jsx`
Expected: at least 2 hits (import + call site).

- [ ] **Step 11.3: Reference table**

Run: `grep -cn "generateReferenceTable\|referenceTable\|Panel4ReferenceTable" src/components/m4/PITTaxDiscountCalculator.jsx`
Expected: >= `4`.

- [ ] **Step 11.4: Pension panel**

Run: `grep -cn "Scenario\|pension\|Pension" src/components/m4/PITTaxDiscountCalculator.jsx`
Expected: >= `8`.

- [ ] **Step 11.5: PDF/print**

Run: `grep -in "print\|@media print\|Generate PDF" src/components/m4/PITTaxDiscountCalculator.jsx | head -10`
Expected: matches on `window.print`, `handlePrint`, `@media print`, `Generate PDF Report`.

- [ ] **Step 11.6: Critical math — re-run end-to-end**

Run:

```bash
node -e "
function calculatePIT(inputs) {
  const { planBalance, currentAge, withdrawalStartAge, withdrawalEndAge, effectiveTaxRate, discountRate } = inputs;
  const PB = planBalance, TR = effectiveTaxRate/100, i = discountRate/100;
  const n = ((withdrawalStartAge - currentAge) + (withdrawalEndAge - currentAge)) / 2;
  let tdPercent, tdDollars;
  if (i === 0 || n === 0) { tdPercent = TR; tdDollars = PB * TR; }
  else {
    const denominator = (Math.pow(1 + i, n) - 1) * (1 - TR) + 1;
    tdPercent = TR / denominator;
    tdDollars = (PB * TR) / denominator;
  }
  const taxAdjustedValue = PB - tdDollars;
  const tdGrowth = tdDollars * (Math.pow(1 + i, n) - 1);
  const taxDiscountAtWithdrawal = tdDollars + tdGrowth;
  const taxableDistribution = taxAdjustedValue + taxDiscountAtWithdrawal;
  const taxes = taxableDistribution * TR;
  const afterTaxDistribution = taxableDistribution - taxes;
  const traditionalTD = PB * TR;
  const overage = traditionalTD - tdDollars;
  const verified = Math.abs(afterTaxDistribution - taxAdjustedValue) < 0.01;
  return { n, tdPercent: tdPercent*100, tdDollars, taxAdjustedValue, tdGrowth, taxDiscountAtWithdrawal, taxableDistribution, taxes, afterTaxDistribution, traditionalTD, overage, verified };
}
const tc1 = calculatePIT({ planBalance: 100000, currentAge: 45, withdrawalStartAge: 65, withdrawalEndAge: 85, effectiveTaxRate: 25, discountRate: 5 });
console.log('TC-1 (100K, 25%, 5%, n=30):', JSON.stringify({ td: tc1.tdDollars.toFixed(0), ta: tc1.taxAdjustedValue.toFixed(0), pct: tc1.tdPercent.toFixed(2), verified: tc1.verified }));
const tc2 = calculatePIT({ planBalance: 500000, currentAge: 45, withdrawalStartAge: 65, withdrawalEndAge: 85, effectiveTaxRate: 25, discountRate: 5 });
console.log('TC-2 (500K, 25%, 5%, n=30):', JSON.stringify({ td: tc2.tdDollars.toFixed(0), ta: tc2.taxAdjustedValue.toFixed(0), overage: tc2.overage.toFixed(0), verified: tc2.verified }));
const tc3 = calculatePIT({ planBalance: 100000, currentAge: 65, withdrawalStartAge: 65, withdrawalEndAge: 65, effectiveTaxRate: 25, discountRate: 5 });
console.log('TC-3 (n=0 → TD% should equal TR=25%):', JSON.stringify({ pct: tc3.tdPercent.toFixed(2), expected: 25.00, verified: tc3.verified }));
const tc4 = calculatePIT({ planBalance: 100000, currentAge: 45, withdrawalStartAge: 65, withdrawalEndAge: 85, effectiveTaxRate: 25, discountRate: 0 });
console.log('TC-4 (i=0):', JSON.stringify({ pct: tc4.tdPercent.toFixed(2), expected: 25.00, verified: tc4.verified }));
"
```

Expected output (within rounding):
```
TC-1 (100K, 25%, 5%, n=30): {"td":"7160","ta":"92840","pct":"7.16","verified":true}
TC-2 (500K, 25%, 5%, n=30): {"td":"35801","ta":"464199","overage":"89199","verified":true}
TC-3 (n=0 → TD% should equal TR=25%): {"pct":"25.00","expected":25,"verified":true}
TC-4 (i=0): {"pct":"25.00","expected":25,"verified":true}
```

Pay special attention to `verified: true` on every case. If any case fails verification, the implementation has a formula bug — STOP and diagnose before declaring done.

- [ ] **Step 11.7: File-size / line-count summary**

Run: `wc -l src/components/m4/PITTaxDiscountCalculator.jsx src/app/modules/m4/tax-discount/page.jsx`
Expected: component file likely between 900–1,400 lines; page file ~25 lines.

- [ ] **Step 11.8: Summary report**

Print a short markdown summary of what was built, covering:
- Files created (paths + line counts).
- Key decisions: used `window.print()` (no PDF lib installed), added `forceOpen` prop to `CollapsiblePanel` so print flattens all panels, inlined UI primitives (matching Filing Status pattern), M2 pre-pop handles multi-plan case with a distinct gold banner.
- Verification test-case results: all four test cases, math verified.

---

## What NOT to do during execution

- Do NOT modify `src/stores/m4Store.js`, `src/stores/blueprintStore.js`, or any Blueprint components.
- Do NOT modify `src/components/m4/FilingStatusOptimizer.jsx` or any M1/M2/M3 components.
- Do NOT create `M4ModulePage.jsx` (that's Step 8 of the larger roadmap).
- Do NOT run `npm run dev`.
- Do NOT install packages.
- Do NOT extract inline UI primitives into a shared module. They are local to this file by design.
