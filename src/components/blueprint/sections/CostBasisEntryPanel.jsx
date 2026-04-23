'use client';

import React, { useState, useMemo, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useM2Store } from '@/src/stores/m2Store';
import useBlueprintStore from '@/src/stores/blueprintStore';
import { useM4Store } from '@/src/stores/m4Store';

// ─── Brand tokens ────────────────────────────────────────────────────────────
const NAVY = '#1B2A4A';
const GOLD = '#C8A96E';
const GREEN = '#2D8A4E';
const RED = '#C0392B';
const MUTED = '#6B7280';
const WHITE = '#FFFFFF';
const SANS = "var(--font-source-sans), 'Source Sans 3', sans-serif";

const LTCG_RATE = 0.15;
// DEF-9: Locked v1 category taxonomy. Replaces fictional 'investments' / 'vehicles'
// with the canonical M2 inventory keys. Exported so M2 (and tests) can stay in sync.
export const APPLICABLE_CATEGORIES = [
  'realEstate',
  'workingCapital',
  'stockOptions',
  'corporateIncentives',
  'businessInterests',
];

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

const SECTION_121_ASSUMPTIONS_TEXT =
  "§121 assumptions: This calculation assumes you've owned the home AND lived in it as your primary residence for at least 2 of the last 5 years, and haven't claimed this exclusion on another home in the last 2 years. In a divorce, IRC §1041 lets you count time your spouse owned or used the home toward these tests. If any of this doesn't describe your situation, the exclusion may not fully apply — consult your CDFA or CPA.";

// DEF-9: Contextual prompts shown below the table when relevant rows exist.
const BROKERAGE_BASIS_TEXT =
  'For brokerage and investment accounts, cost basis is what you originally paid for the holdings (including reinvested dividends). Bank accounts have no cost basis — the full balance is yours after tax.';

const EQUITY_COMP_BASIS_TEXT =
  'Vested or already-exercised equity has a cost basis equal to what was paid (or already taxed as income) at vest/exercise. Unvested or unexercised grants have no current cost basis — record those separately as deferred-comp placeholders in Module 2 so they appear in your Blueprint without inflating today\'s tax-adjusted total.';

const BUSINESS_INTERESTS_BASIS_TEXT =
  'For business interests, cost basis is what you contributed in capital plus retained earnings already taxed. The actual hidden tax depends on whether the buyout is structured as a stock or asset sale — this estimate uses LTCG as a baseline and your CDFA can model alternatives.';

const UNSUPPORTED_CATEGORY_PROMPT_TEXT =
  'Items categorized as "Other Assets" don\'t have a built-in tax model in this tool. If any of those items have meaningful unrealized gain (e.g., collectibles, crypto, private investments), flag them with your CDFA — they may need bespoke treatment outside this estimate.';

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

const segmentedLabelStyle = {
  fontFamily: SANS,
  fontWeight: 400,
  fontSize: 13,
  color: 'rgba(27,42,74,0.5)',
  textTransform: 'uppercase',
  letterSpacing: '0.05em',
  marginBottom: 6,
};

const segmentedGroupStyle = {
  display: 'inline-flex',
  border: `1px solid ${GOLD}`,
  borderRadius: 6,
  overflow: 'hidden',
  marginBottom: 16,
};

const segmentedButtonStyle = (active) => ({
  fontFamily: SANS,
  fontSize: 14,
  fontWeight: active ? 700 : 400,
  color: active ? WHITE : NAVY,
  backgroundColor: active ? GOLD : 'transparent',
  border: 'none',
  padding: '8px 14px',
  cursor: active ? 'default' : 'pointer',
  transition: 'background-color 0.15s ease-out',
});

const infoBarStyle = {
  fontFamily: SANS,
  fontSize: 13,
  color: NAVY,
  lineHeight: 1.5,
  padding: '12px 16px',
  marginTop: 16,
  marginBottom: 0,
  border: `1px solid ${GOLD}`,
  borderLeft: `3px solid ${GOLD}`,
  borderRadius: 6,
  backgroundColor: 'rgba(200, 169, 110, 0.08)',
};

// DEF-9: Dismissible warning bar (top of panel) for "Other Assets" items the
// tool can't model.
const warningBarStyle = {
  fontFamily: SANS,
  fontSize: 13,
  color: NAVY,
  lineHeight: 1.5,
  padding: '10px 14px',
  marginTop: 0,
  marginBottom: 16,
  border: `1px solid ${GOLD}`,
  borderLeft: `3px solid ${GOLD}`,
  borderRadius: 6,
  backgroundColor: 'rgba(200, 169, 110, 0.08)',
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'flex-start',
  gap: 12,
};

// DEF-9: Inline sub-type toggle (e.g. Brokerage / Bank) shown in the
// "Type / details" cell next to per-row qualifiers like the §121 checkbox.
const subTypeLabelStyle = {
  fontFamily: SANS,
  fontWeight: 400,
  fontSize: 12,
  color: 'rgba(27,42,74,0.5)',
  textTransform: 'uppercase',
  letterSpacing: '0.04em',
  marginRight: 6,
};

const subTypeGroupStyle = {
  display: 'inline-flex',
  border: `1px solid ${GOLD}`,
  borderRadius: 4,
  overflow: 'hidden',
  verticalAlign: 'middle',
};

const subTypeButtonStyle = (active) => ({
  fontFamily: SANS,
  fontSize: 12,
  fontWeight: active ? 700 : 400,
  color: active ? WHITE : NAVY,
  backgroundColor: active ? GOLD : 'transparent',
  border: 'none',
  padding: '4px 10px',
  cursor: active ? 'default' : 'pointer',
  transition: 'background-color 0.15s ease-out',
});

// ─── Component ───────────────────────────────────────────────────────────────
export default function CostBasisEntryPanel() {
  // Store reads
  const items = useM2Store((s) => s.maritalEstateInventory.items);
  const costBasisEntries = useBlueprintStore((s) => s.costBasisEntries);
  const setCostBasisEntries = useBlueprintStore((s) => s.setCostBasisEntries);
  const updatePropertyDivisionTaxAdjusted = useBlueprintStore(
    (s) => s.updatePropertyDivisionTaxAdjusted
  );
  const costBasisFilingStatus = useBlueprintStore((s) => s.costBasisFilingStatus);
  const setCostBasisFilingStatus = useBlueprintStore((s) => s.setCostBasisFilingStatus);

  // Filter to applicable categories. DEF-9: also exclude items the user marked
  // as unvested (vested === false) — those have no current FMV and should be
  // converted to deferred-comp stubs in M2 rather than appearing here as dead
  // $0 rows.
  const applicableItems = useMemo(
    () => items.filter(
      (i) => APPLICABLE_CATEGORIES.includes(i.category) && i.vested !== false
    ),
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

  // DEF-7: Local state for per-item "Primary residence" checkbox, keyed by item id.
  // Defaults to false for every applicable item; persisted onto the cost basis
  // entry record on Calculate.
  const [primaryResidenceValues, setPrimaryResidenceValues] = useState({});

  const handlePrimaryResidenceChange = (id, checked) => {
    setPrimaryResidenceValues((prev) => ({ ...prev, [id]: checked }));
  };

  // DEF-9: Per-row sub-type toggle (currently only used by workingCapital, where
  // the user picks 'brokerage' (LTCG on built-in gain) vs 'bank' (no tax)).
  // Defaults to 'brokerage' for any workingCapital row that hasn't been touched —
  // chosen because brokerage is the conservative assumption (shows a hidden tax)
  // and forces the user to opt out rather than silently zeroing the impact.
  const [subTypeValues, setSubTypeValues] = useState({});

  const handleSubTypeChange = (id, value) => {
    setSubTypeValues((prev) => ({ ...prev, [id]: value }));
  };

  // DEF-9: User-dismissible "Other Assets" warning. Sticky for the lifetime of
  // the panel — once the user dismisses it, we don't re-surface as they edit
  // the inventory in the same session.
  const [unsupportedWarningDismissed, setUnsupportedWarningDismissed] = useState(false);

  // DEF-9 / ESLint set-state-in-effect: Sync basisValues when itemsNeedingBasis
  // grows (new M2 items added after mount). Guarded by a ref so the effect only
  // mutates state when the array reference actually changes, not on every re-render.
  // useMemo is wrong here — basisValues is form input that can be edited live, so
  // we can't recompute it from scratch each render.
  const lastSyncedItemsRef = useRef(itemsNeedingBasis);
  useEffect(() => {
    if (lastSyncedItemsRef.current === itemsNeedingBasis) return;
    lastSyncedItemsRef.current = itemsNeedingBasis;
    setBasisValues((prev) => {
      const next = { ...prev };
      let changed = false;
      itemsNeedingBasis.forEach((item) => {
        if (!(item.id in next)) {
          next[item.id] = item.costBasis !== null && item.costBasis !== undefined
            ? String(item.costBasis)
            : '';
          changed = true;
        }
      });
      return changed ? next : prev;
    });
  }, [itemsNeedingBasis]);

  // DEF-7: One-shot pre-pop of filing status from M4 Filing Status Optimizer.
  // Runs exactly once on mount; never re-runs. Uses getState() to read the
  // latest store values at effect-execution time so empty deps is correct.
  useEffect(() => {
    const blueprintState = useBlueprintStore.getState();
    if (blueprintState.costBasisFilingStatus != null) return; // already set — user or prior pre-pop wins
    const blueprintTimeline = blueprintState.sections?.s4?.data?.divorceTimeline;
    const m4Timeline = useM4Store.getState().filingStatusOptimizer?.inputs?.divorceTimeline;
    const timeline = blueprintTimeline ?? m4Timeline ?? null;
    // Only 'afterJan1' maps to MFJ; 'beforeDec31', 'notSure', null all default to 'single' (conservative).
    const defaultValue = timeline === 'afterJan1' ? 'mfj' : 'single';
    blueprintState.setCostBasisFilingStatus(defaultValue);
  }, []);

  const handleBasisChange = (id, raw) => {
    setBasisValues((prev) => ({ ...prev, [id]: raw }));
  };

  // At least one asset has a value entered (including "0")
  const hasAnyBasis = Object.values(basisValues).some((v) => {
    const parsed = parseCurrency(v);
    return parsed !== null;
  });

  // DEF-7: Controls whether the §121 assumptions prompt renders below the table.
  const hasAnyPrimaryResidenceMarked = Object.values(primaryResidenceValues).some(Boolean);

  // DEF-9: A row is "calc-ready" once we have enough info to push it into the
  // estimate. Bank-accountSubType workingCapital rows are always ready (no basis
  // needed — full balance is post-tax). Every other category needs a parsed
  // numeric basis. This is what gates the Calculate button.
  const isRowCalcReady = (item) => {
    if (item.category === 'workingCapital') {
      const subType = subTypeValues[item.id] || 'brokerage';
      if (subType === 'bank') return true;
    }
    return parseCurrency(basisValues[item.id]) !== null;
  };

  const hasAnyCalcReadyRow = itemsNeedingBasis.some(isRowCalcReady);

  // DEF-9: Count items the tool can't model (currently anything in 'otherAssets').
  // Drives the dismissible warning bar at the top of the panel.
  const otherAssetsCount = useMemo(
    () => items.filter((i) => i.category === 'otherAssets').length,
    [items]
  );
  const showUnsupportedWarning = otherAssetsCount > 0 && !unsupportedWarningDismissed;

  // DEF-9: Contextual prompt flags. A category-specific educational note appears
  // at the bottom of the panel only when at least one matching row exists,
  // keeping the panel quiet for users with simple estate compositions.
  const hasBrokerageRow = itemsNeedingBasis.some(
    (i) => i.category === 'workingCapital' && (subTypeValues[i.id] || 'brokerage') === 'brokerage'
  );
  const hasEquityCompRow = itemsNeedingBasis.some(
    (i) => i.category === 'stockOptions' || i.category === 'corporateIncentives'
  );
  const hasBusinessInterestsRow = itemsNeedingBasis.some(
    (i) => i.category === 'businessInterests'
  );

  const handleCalculate = () => {
    // Build entries for ALL applicable items (items already in store + new ones being entered)
    const newEntries = [];

    // Items being entered now — branch by category + qualifier per DEF-9 spec.
    // DEF-6 invariant: every entry stores `baseline` (the reference value the
    // hidden tax is subtracted from) so §3 and §5 can render
    //   baseline − estimatedTax === taxAdjustedValue
    // without re-deriving net equity in the display layer.
    itemsNeedingBasis.forEach((item) => {
      if (!isRowCalcReady(item)) return;

      const fmv = Number(item.currentValue) || 0;
      const parsed = parseCurrency(basisValues[item.id]);
      let costBasis = parsed;
      let baseline = fmv;
      let builtInGain = 0;
      let estimatedTax = 0;
      let taxAdjustedValue = fmv;
      let isPrimaryResidence = false;
      let accountSubType;

      if (item.category === 'realEstate') {
        // DEF-6: real estate baseline is net equity (FMV − mortgage), not FMV,
        // because the mortgage encumbers what the spouse actually receives.
        // §121 exclusion still applies to the raw built-in gain (which is
        // computed off FMV vs. cost basis, NOT off net equity).
        const mortgage = Number(item.outstandingBalance) || 0;
        const netEquity = fmv - mortgage;
        const rawGain = parsed !== null ? fmv - parsed : 0;
        builtInGain = rawGain;
        isPrimaryResidence = !!primaryResidenceValues[item.id];
        const exclusionCap = isPrimaryResidence
          ? (costBasisFilingStatus === 'mfj' ? 500000 : 250000)
          : 0;
        const taxableGain = Math.max(0, rawGain - exclusionCap);
        estimatedTax = Math.max(0, taxableGain * LTCG_RATE);
        baseline = netEquity;
      } else if (item.category === 'workingCapital') {
        accountSubType = subTypeValues[item.id] || 'brokerage';
        if (accountSubType === 'bank') {
          // Bank balance is already post-tax — no built-in gain, no hidden tax.
          costBasis = null;
          builtInGain = 0;
          estimatedTax = 0;
          baseline = fmv;
        } else {
          // Brokerage: LTCG on built-in gain (floored at 0).
          const gain = parsed !== null ? Math.max(0, fmv - parsed) : 0;
          builtInGain = gain;
          estimatedTax = gain * LTCG_RATE;
          baseline = fmv;
        }
      } else if (item.category === 'stockOptions' || item.category === 'corporateIncentives') {
        // Vested-only equity reaches this panel — unvested grants are routed to
        // M2's deferred-comp stub flow and never appear here. Treat the basis
        // the user entered as already-taxed cost basis at vest/exercise; LTCG
        // on the built-in gain over that.
        const gain = parsed !== null ? Math.max(0, fmv - parsed) : 0;
        builtInGain = gain;
        estimatedTax = gain * LTCG_RATE;
        baseline = fmv;
      } else if (item.category === 'businessInterests') {
        // LTCG baseline. Asset-vs-stock-sale variations are out of scope for v1
        // and addressed in the BUSINESS_INTERESTS_BASIS_TEXT prompt.
        const gain = parsed !== null ? Math.max(0, fmv - parsed) : 0;
        builtInGain = gain;
        estimatedTax = gain * LTCG_RATE;
        baseline = fmv;
      } else {
        // Unknown category — should be unreachable because itemsNeedingBasis is
        // pre-filtered by APPLICABLE_CATEGORIES. Skip rather than corrupt §5.
        return;
      }

      taxAdjustedValue = baseline - estimatedTax;

      newEntries.push({
        assetId: item.id,
        description: item.description,
        category: item.category,
        fmv,
        costBasis,
        baseline,
        builtInGain,
        estimatedTax,
        taxAdjustedValue,
        isPrimaryResidence,
        ...(accountSubType ? { accountSubType } : {}),
      });
    });

    // Combine with existing entries
    const allEntries = [...costBasisEntries, ...newEntries];
    setCostBasisEntries(allEntries);

    // Aggregate by titleholder for §5. Joint-title items split 50/50 between
    // client and spouse to match m2Store's face-value bucketing
    // (computeCategoryTotals in src/lib/m2Sections.js); otherwise the §5 Face
    // Value column would show $X/2 each while Tax-Adjusted dumps the full $X
    // into Undecided, breaking the per-column DEF-6 invariant.
    const buckets = { client: { adj: 0, tax: 0 }, spouse: { adj: 0, tax: 0 }, undecided: { adj: 0, tax: 0 } };
    allEntries.forEach((entry) => {
      const original = items.find((i) => i.id === entry.assetId);
      if (!original) {
        // Orphaned entry — item removed from m2Store after basis was entered (harmless per spec)
        console.warn(`CostBasisEntryPanel: asset ${entry.assetId} not found in inventory, defaulting to undecided`);
      }
      const holder = original?.titleholder;
      if (holder === 'self') {
        buckets.client.adj += entry.taxAdjustedValue;
        buckets.client.tax += entry.estimatedTax;
      } else if (holder === 'spouse') {
        buckets.spouse.adj += entry.taxAdjustedValue;
        buckets.spouse.tax += entry.estimatedTax;
      } else if (holder === 'joint') {
        buckets.client.adj += entry.taxAdjustedValue / 2;
        buckets.client.tax += entry.estimatedTax / 2;
        buckets.spouse.adj += entry.taxAdjustedValue / 2;
        buckets.spouse.tax += entry.estimatedTax / 2;
      } else {
        buckets.undecided.adj += entry.taxAdjustedValue;
        buckets.undecided.tax += entry.estimatedTax;
      }
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
      {showUnsupportedWarning && (
        <div style={warningBarStyle}>
          <div>{UNSUPPORTED_CATEGORY_PROMPT_TEXT}</div>
          <button
            type="button"
            onClick={() => setUnsupportedWarningDismissed(true)}
            aria-label="Dismiss unsupported category warning"
            style={{
              fontFamily: SANS,
              fontSize: 18,
              lineHeight: 1,
              background: 'none',
              border: 'none',
              color: NAVY,
              cursor: 'pointer',
              padding: 0,
              marginTop: -2,
            }}
          >
            ×
          </button>
        </div>
      )}
      <p style={eduStyle}>{IRC_1041_TEXT}</p>

      <div>
        <div style={segmentedLabelStyle}>Filing status at time of sale</div>
        <div style={segmentedGroupStyle} role="group" aria-label="Filing status at time of sale">
          <button
            type="button"
            onClick={() => setCostBasisFilingStatus('single')}
            style={segmentedButtonStyle(costBasisFilingStatus !== 'mfj')}
            aria-pressed={costBasisFilingStatus !== 'mfj'}
          >
            Single ($250K exclusion)
          </button>
          <button
            type="button"
            onClick={() => setCostBasisFilingStatus('mfj')}
            style={segmentedButtonStyle(costBasisFilingStatus === 'mfj')}
            aria-pressed={costBasisFilingStatus === 'mfj'}
          >
            MFJ ($500K exclusion)
          </button>
        </div>
      </div>

      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr>
            <th style={thStyle}>Asset</th>
            <th style={{ ...thStyle, textAlign: 'right' }}>FMV</th>
            <th style={{ ...thStyle, textAlign: 'right' }}>Cost Basis</th>
            <th
              style={{
                ...thStyle,
                textAlign: 'center',
                textTransform: 'none',
                fontWeight: 400,
                letterSpacing: 'normal',
              }}
            >
              Type / details
            </th>
          </tr>
        </thead>
        <tbody>
          {itemsNeedingBasis.map((item) => {
            const fmv = Number(item.currentValue) || 0;
            const parsed = parseCurrency(basisValues[item.id]);
            const gain = parsed !== null ? fmv - parsed : null;
            const isHighGain = gain !== null && gain > fmv * 0.5;
            const isRealEstate = item.category === 'realEstate';
            const isWorkingCapital = item.category === 'workingCapital';
            const subType = subTypeValues[item.id] || 'brokerage';
            // DEF-9: Bank-account workingCapital rows have no cost basis — the
            // input is disabled and shown as "—" so the user understands the
            // tool is treating the full balance as post-tax.
            const isBankRow = isWorkingCapital && subType === 'bank';

            return (
              <React.Fragment key={item.id}>
                <tr>
                  <td style={tdStyle}>{item.description || item.category}</td>
                  <td style={{ ...tdStyle, textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>
                    {fmtCurrency(fmv)}
                  </td>
                  <td style={{ ...tdStyle, textAlign: 'right' }}>
                    {isBankRow ? (
                      <span style={{ color: 'rgba(27,42,74,0.35)' }}>—</span>
                    ) : (
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
                    )}
                  </td>
                  <td style={{ ...tdStyle, textAlign: 'center' }}>
                    {isRealEstate && (
                      <label style={{ display: 'inline-flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}>
                        <input
                          type="checkbox"
                          checked={!!primaryResidenceValues[item.id]}
                          onChange={(e) => handlePrimaryResidenceChange(item.id, e.target.checked)}
                          aria-label={`Primary residence (qualifies for §121) — ${item.description || item.category}`}
                          style={{ cursor: 'pointer', width: 16, height: 16 }}
                        />
                        <span style={{ fontSize: 13, color: NAVY }}>Primary residence (§121)</span>
                      </label>
                    )}
                    {isWorkingCapital && (
                      <div>
                        <span style={subTypeLabelStyle}>Type</span>
                        <div style={subTypeGroupStyle} role="group" aria-label={`Account type for ${item.description || 'working capital'}`}>
                          <button
                            type="button"
                            onClick={() => handleSubTypeChange(item.id, 'brokerage')}
                            style={subTypeButtonStyle(subType === 'brokerage')}
                            aria-pressed={subType === 'brokerage'}
                          >
                            Brokerage
                          </button>
                          <button
                            type="button"
                            onClick={() => handleSubTypeChange(item.id, 'bank')}
                            style={subTypeButtonStyle(subType === 'bank')}
                            aria-pressed={subType === 'bank'}
                          >
                            Bank
                          </button>
                        </div>
                      </div>
                    )}
                    {!isRealEstate && !isWorkingCapital && (
                      <span style={{ color: 'rgba(27,42,74,0.35)' }}>—</span>
                    )}
                  </td>
                </tr>
                {isRealEstate && (
                  <tr>
                    <td colSpan={4} style={inlineEduStyle}>{SECTION_121_TEXT}</td>
                  </tr>
                )}
                {isHighGain && !isBankRow && (
                  <tr>
                    <td colSpan={4} style={inlineEduStyle}>{HIGH_GAIN_TEXT}</td>
                  </tr>
                )}
              </React.Fragment>
            );
          })}
        </tbody>
      </table>

      {hasAnyPrimaryResidenceMarked && (
        <div style={infoBarStyle}>{SECTION_121_ASSUMPTIONS_TEXT}</div>
      )}

      {(hasBrokerageRow || hasEquityCompRow || hasBusinessInterestsRow) && (
        <div style={{ marginTop: 16 }}>
          <div
            style={{
              fontFamily: SANS,
              fontWeight: 700,
              fontSize: 13,
              color: NAVY,
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
              marginBottom: 6,
            }}
          >
            Notes
          </div>
          {hasBrokerageRow && (
            <p style={{ ...eduStyle, marginTop: 0, marginBottom: 8 }}>{BROKERAGE_BASIS_TEXT}</p>
          )}
          {hasEquityCompRow && (
            <p style={{ ...eduStyle, marginTop: 0, marginBottom: 8 }}>{EQUITY_COMP_BASIS_TEXT}</p>
          )}
          {hasBusinessInterestsRow && (
            <p style={{ ...eduStyle, marginTop: 0, marginBottom: 8 }}>{BUSINESS_INTERESTS_BASIS_TEXT}</p>
          )}
        </div>
      )}

      <p style={{ ...eduStyle, marginTop: 12, marginBottom: 0, fontStyle: 'normal', fontSize: 13 }}>
        Cost basis is what was originally paid for the asset. If unsure, your CDFA or CPA can help determine this.
      </p>

      <button
        type="button"
        onClick={handleCalculate}
        disabled={!hasAnyCalcReadyRow}
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
          cursor: hasAnyCalcReadyRow ? 'pointer' : 'not-allowed',
          opacity: hasAnyCalcReadyRow ? 1 : 0.5,
          letterSpacing: 0.3,
        }}
      >
        Calculate Hidden Taxes
      </button>
    </div>
  );
}
