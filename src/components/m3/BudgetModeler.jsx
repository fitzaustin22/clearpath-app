'use client';

import { useState, useEffect, useMemo, useRef } from 'react';
import Link from 'next/link';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  LabelList,
  ResponsiveContainer,
  Tooltip,
} from 'recharts';
import {
  useM3Store,
  BUDGET_CATEGORIES,
  CATEGORY_LABELS,
  LINE_ITEM_LABELS,
} from '@/src/stores/m3Store';
import { useM1Store } from '@/src/stores/m1Store';
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
const SOURCE    = '"Source Sans Pro", -apple-system, system-ui, sans-serif';
const PLAYFAIR  = '"Playfair Display", Georgia, serif';

// ─── Helpers ──────────────────────────────────────────────────────────────────
function fmtShort(n) {
  if (n == null || isNaN(n)) return '$0';
  const abs = Math.abs(Math.round(n));
  return (n < 0 ? '-$' : '$') + abs.toLocaleString('en-US');
}

function fmtSigned(n) {
  if (n == null || isNaN(n) || n === 0) return '$0';
  const abs = Math.abs(Math.round(n));
  return (n > 0 ? '+$' : '-$') + abs.toLocaleString('en-US');
}

function parseCurrency(str) {
  const cleaned = String(str).replace(/[$,\s]/g, '');
  const val = parseFloat(cleaned);
  return isNaN(val) ? 0 : val;
}

function categoryTotal(colData, category) {
  const cat = colData?.[category];
  if (!cat) return 0;
  return Object.values(cat).reduce((s, v) => s + (Number(v) || 0), 0);
}

function categoryNonZeroCount(colData, category) {
  const cat = colData?.[category];
  if (!cat) return 0;
  return Object.values(cat).filter((v) => Number(v) > 0).length;
}

function columnHasAnyValue(colData) {
  return BUDGET_CATEGORIES.some((c) => categoryTotal(colData, c) > 0);
}

function grandTotal(colData) {
  return BUDGET_CATEGORIES.reduce((s, c) => s + categoryTotal(colData, c), 0);
}

// ─── Responsive hook ──────────────────────────────────────────────────────────
function useBreakpoint() {
  const [bp, setBp] = useState({ isDesktop: false, isMedium: false });
  useEffect(() => {
    const update = () =>
      setBp({
        isDesktop: window.innerWidth >= 1024,
        isMedium: window.innerWidth >= 640,
      });
    update();
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, []);
  return bp;
}

// ─── CurrencyInput ────────────────────────────────────────────────────────────
function CurrencyInput({ id, value, onChange, ariaLabel, placeholder = '0.00', disabled = false }) {
  const [display, setDisplay] = useState(
    value > 0
      ? value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
      : ''
  );
  const [focused, setFocused] = useState(false);

  useEffect(() => {
    if (!focused) {
      setDisplay(
        value > 0
          ? value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
          : ''
      );
    }
  }, [value, focused]);

  return (
    <div style={{ position: 'relative', display: 'flex', alignItems: 'center', width: '100%' }}>
      <span
        style={{
          position: 'absolute',
          left: 10,
          fontFamily: SOURCE,
          fontSize: 14,
          color: disabled ? '#9AA0AA' : NAVY,
          pointerEvents: 'none',
          zIndex: 1,
        }}
      >
        $
      </span>
      <input
        id={id}
        type="text"
        inputMode="decimal"
        aria-label={ariaLabel}
        value={display}
        disabled={disabled}
        placeholder={placeholder}
        onChange={(e) => {
          const raw = e.target.value;
          setDisplay(raw);
          const num = parseCurrency(raw);
          onChange(num);
        }}
        onFocus={() => {
          setFocused(true);
          setDisplay(value > 0 ? String(value) : '');
        }}
        onBlur={(e) => {
          setFocused(false);
          const num = parseCurrency(e.target.value);
          onChange(num);
          setDisplay(
            num > 0
              ? num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
              : ''
          );
        }}
        style={{
          width: '100%',
          paddingLeft: 24,
          paddingRight: 8,
          paddingTop: 8,
          paddingBottom: 8,
          fontFamily: SOURCE,
          fontSize: 14,
          color: NAVY,
          border: `1px solid ${disabled ? '#D8DCE4' : '#C8D0DC'}`,
          borderRadius: 6,
          backgroundColor: disabled ? '#F4F5F7' : WHITE,
          outline: 'none',
          boxSizing: 'border-box',
        }}
      />
    </div>
  );
}

// ─── Callout ──────────────────────────────────────────────────────────────────
function Callout({ text, variant = 'gold', onDismiss, children }) {
  const borderColor = variant === 'amber' ? AMBER : GOLD;
  const bgColor = variant === 'amber' ? '#FFFAEC' : '#FDF8EF';
  return (
    <div
      style={{
        borderLeft: `3px solid ${borderColor}`,
        backgroundColor: bgColor,
        padding: '10px 14px',
        borderRadius: '0 6px 6px 0',
        marginTop: 8,
        marginBottom: 8,
        position: 'relative',
        display: 'flex',
        alignItems: 'flex-start',
        gap: 10,
      }}
    >
      <div style={{ flex: 1 }}>
        {text ? (
          <p style={{ fontFamily: SOURCE, fontSize: 13, color: NAVY, margin: 0, lineHeight: 1.5 }}>
            {text}
          </p>
        ) : (
          children
        )}
      </div>
      {onDismiss && (
        <button
          type="button"
          aria-label="Dismiss"
          onClick={onDismiss}
          style={{
            border: 'none',
            background: 'transparent',
            color: NAVY,
            opacity: 0.55,
            cursor: 'pointer',
            fontSize: 16,
            lineHeight: 1,
            padding: 4,
            flexShrink: 0,
          }}
        >
          ×
        </button>
      )}
    </div>
  );
}

// ─── Category educational prompts ─────────────────────────────────────────────
const CATEGORY_PROMPTS = {
  home:
    "Will you stay in the current home, or move? If moving, estimate new rent/mortgage. Property taxes, HOA, and insurance may change. Don't forget: maintenance costs don't halve — a roof replacement costs the same whether one person or two lives there.",
  food:
    'Groceries typically decrease 30–40% for a single-person household, but not by half. Restaurant and takeout spending often increases during and after divorce.',
  insurance:
    "If you're on your spouse's health plan, you'll need your own. COBRA is an option but expensive and temporary. Check your employer's plan or the marketplace. Budget $400–$700/month for individual coverage.",
  transportation:
    "Will you keep the same car? If you're a two-car household and keeping one, your payment and insurance may stay the same, but fuel and maintenance could change with a different commute.",
  children:
    "These expenses are shared between parents according to the custody arrangement. Estimate your share, not the total. Don't forget: children's expenses often increase after divorce (duplicate gear, transportation between homes).",
  otherPayments:
    "Debt payments: check whether each debt is in your name, your spouse's name, or joint. You may not be responsible for all of them post-divorce. Add legal fees, mediation costs, and therapy — these are real expenses during divorce.",
};

// ─── Main Component ───────────────────────────────────────────────────────────
export default function BudgetModeler({ userTier = 'essentials' }) {
  const { isDesktop, isMedium } = useBreakpoint();

  // Store pulls
  const budgetModeler = useM3Store((s) => s.budgetModeler);
  const payStubDecoder = useM3Store((s) => s.payStubDecoder);
  const setBudgetField = useM3Store((s) => s.setBudgetField);
  const copyAllToProjected = useM3Store((s) => s.copyAllToProjected);
  const copyCategoryToProjected = useM3Store((s) => s.copyCategoryToProjected);
  const calculateBudgetResults = useM3Store((s) => s.calculateBudgetResults);
  const prePopulateFromM1 = useM3Store((s) => s.prePopulateFromM1);
  const prePopulateFromM2Liabilities = useM3Store((s) => s.prePopulateFromM2Liabilities);
  const prePopulateFromPayStub = useM3Store((s) => s.prePopulateFromPayStub);

  // M1/M2 flags for pre-pop triggers
  const m1BudgetGapCompleted = useM1Store((s) => s.budgetGap?.completed);
  const m2Items = useM2Store((s) => s.maritalEstateInventory?.items);

  const { current, projected, m1References, m2LiabilityRefs, prePopulated, results } =
    budgetModeler;

  // Wait for Zustand persist to rehydrate both m3 and blueprint stores before
  // running the retrofit. Otherwise blueprint's rehydration would merge over
  // the write we just made, losing §7 data we just sent.
  const [hydrated, setHydrated] = useState(() => {
    if (typeof window === 'undefined') return false;
    return (
      (useM3Store.persist?.hasHydrated?.() ?? true) &&
      (useBlueprintStore.persist?.hasHydrated?.() ?? true)
    );
  });
  useEffect(() => {
    if (hydrated) return;
    const check = () => {
      const m3Ok = useM3Store.persist?.hasHydrated?.() ?? true;
      const bpOk = useBlueprintStore.persist?.hasHydrated?.() ?? true;
      if (m3Ok && bpOk) setHydrated(true);
    };
    check();
    const unsub3 = useM3Store.persist?.onFinishHydration?.(check);
    const unsubBp = useBlueprintStore.persist?.onFinishHydration?.(check);
    return () => {
      unsub3?.();
      unsubBp?.();
    };
  }, [hydrated]);

  // ─── Blueprint §7 sync ────────────────────────────────────────────────────
  // Fires on completion OR whenever current expenses exist (partial write).
  // Partial state lets §7 show "current-only" data before the user runs
  // projections, matching the spec's 'partial' status contract.
  useEffect(() => {
    if (!hydrated) return;
    const r = budgetModeler.results;

    if (budgetModeler.completed && r) {
      const categories = (r.categoryDeltas || []).map((d) => ({
        name: CATEGORY_LABELS?.[d.category] || d.category,
        current: d.current || 0,
        projected: d.projected || 0,
        change: d.delta || 0,
      }));
      const monthlyIncome = r.incomeComparison?.monthlyIncome || 0;
      const monthlyGap =
        r.incomeComparison?.projectedSurplusShortfall != null
          ? r.incomeComparison.projectedSurplusShortfall
          : monthlyIncome - (r.projectedTotal || 0);
      useBlueprintStore.getState().updateExpenseAnalysis({
        currentTotal: r.currentTotal || 0,
        projectedTotal: r.projectedTotal || 0,
        categories,
        monthlyIncome,
        monthlyGap,
        hasProjected: (r.projectedTotal || 0) > 0,
      });
      return;
    }

    // No completed results yet — compute a partial snapshot directly from
    // the `current` column so §7 isn't empty while the user is still editing.
    const { current: cur } = budgetModeler;
    if (!cur) return;
    const sum = (obj) =>
      Object.values(obj || {}).reduce((s, v) => s + (Number(v) || 0), 0);
    const categoriesPartial = BUDGET_CATEGORIES.map((cat) => ({
      name: CATEGORY_LABELS?.[cat] || cat,
      current: sum(cur[cat]),
      projected: 0,
      change: 0,
    }));
    const currentTotal = categoriesPartial.reduce((s, c) => s + c.current, 0);
    if (currentTotal <= 0) return;
    useBlueprintStore.getState().updateExpenseAnalysis({
      currentTotal,
      projectedTotal: 0,
      categories: categoriesPartial.filter((c) => c.current > 0),
      monthlyIncome: 0,
      monthlyGap: 0,
      hasProjected: false,
    });
  }, [hydrated, budgetModeler.completed, budgetModeler.results, budgetModeler.current]);

  // ─── Pre-population effect (runs once per trigger) ──────────────────────────
  useEffect(() => {
    if (!hydrated) return;
    if (m1BudgetGapCompleted && !prePopulated.fromM1) {
      prePopulateFromM1();
    }
    if (m2Items && m2Items.length > 0 && !prePopulated.fromM2) {
      prePopulateFromM2Liabilities();
    }
    if (payStubDecoder?.completed && !prePopulated.fromTool1) {
      prePopulateFromPayStub();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hydrated, m1BudgetGapCompleted, m2Items, payStubDecoder?.completed]);

  // Banner visibility (session-local — dismissable)
  const [m1BannerDismissed, setM1BannerDismissed] = useState(false);

  // Accordion expand/collapse state. Home auto-expands on first visit.
  const [expanded, setExpanded] = useState(() => {
    const initial = {};
    BUDGET_CATEGORIES.forEach((c) => {
      initial[c] = c === 'home';
    });
    return initial;
  });
  const toggleCategory = (cat) =>
    setExpanded((prev) => ({ ...prev, [cat]: !prev[cat] }));

  // Track which projected prompts have been dismissed (per-category)
  const [dismissedPrompts, setDismissedPrompts] = useState({});
  const dismissPrompt = (cat) =>
    setDismissedPrompts((prev) => ({ ...prev, [cat]: true }));

  // Mobile/tablet tab
  const [activeTab, setActiveTab] = useState('current'); // 'current' | 'projected' | 'results'

  // "Start scratch" dismissal for projected-empty prompt
  const [startScratchDismissed, setStartScratchDismissed] = useState(false);

  // Debounced running totals
  const [debouncedTotals, setDebouncedTotals] = useState({
    current: 0,
    projected: 0,
  });
  const debounceTimerRef = useRef(null);

  useEffect(() => {
    if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    debounceTimerRef.current = setTimeout(() => {
      setDebouncedTotals({
        current: grandTotal(current),
        projected: grandTotal(projected),
      });
    }, 150);
    return () => {
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    };
  }, [current, projected]);

  // Derived: how many non-zero categories each column has
  const currentHasData = useMemo(() => columnHasAnyValue(current), [current]);
  const projectedHasData = useMemo(() => columnHasAnyValue(projected), [projected]);

  const canViewResults = currentHasData && projectedHasData;
  const projectedTabDisabled = !currentHasData;
  const resultsTabDisabled = !canViewResults;

  // Copy-all confirmation
  const handleCopyAll = () => {
    if (projectedHasData) {
      const ok = window.confirm(
        'This will replace your current single budget with your married numbers. Continue?'
      );
      if (!ok) return;
    }
    copyAllToProjected();
  };

  const handleCalculate = () => {
    calculateBudgetResults();
    if (!isDesktop) setActiveTab('results');
    // scroll to results on desktop
    if (isDesktop) {
      requestAnimationFrame(() => {
        const el = document.getElementById('bm-results');
        if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      });
    }
  };

  const monthlyChange = debouncedTotals.projected - debouncedTotals.current;
  const monthlyChangeColor = monthlyChange > 0 ? RED : monthlyChange < 0 ? GREEN : NAVY;

  // ─── Render ──────────────────────────────────────────────────────────────────

  if (!hydrated) {
    return (
      <div style={{ padding: 24, fontFamily: SOURCE, color: NAVY }}>
        Loading Budget Modeler…
      </div>
    );
  }

  return (
    <div
      style={{
        backgroundColor: PARCHMENT,
        minHeight: '100vh',
        paddingBottom: 140,
        fontFamily: SOURCE,
        color: NAVY,
      }}
    >
      <div style={{ maxWidth: 1200, margin: '0 auto', padding: isMedium ? '28px 28px 20px' : '20px 16px' }}>
        {/* Back link */}
        <div style={{ marginBottom: 12 }}>
          <Link
            href="/modules/m3"
            style={{
              fontFamily: SOURCE,
              fontSize: 14,
              color: NAVY,
              opacity: 0.7,
              textDecoration: 'none',
            }}
          >
            ← Back to Know What You Spend
          </Link>
        </div>

        {/* Header */}
        <header style={{ marginBottom: 18 }}>
          <h1
            style={{
              fontFamily: PLAYFAIR,
              fontWeight: 700,
              fontSize: isMedium ? 32 : 26,
              color: NAVY,
              margin: 0,
              lineHeight: 1.15,
            }}
          >
            Married-vs-Single Budget Modeler
          </h1>
          <p
            style={{
              fontFamily: SOURCE,
              fontSize: 15,
              color: NAVY,
              opacity: 0.8,
              margin: '8px 0 0',
              maxWidth: 760,
              lineHeight: 1.5,
            }}
          >
            Compare your current household expenses to what life on your own will cost.
            Work through the ten categories below — we&apos;ll show you where the numbers
            change and by how much.
          </p>
        </header>

        {/* M1 pre-pop banner */}
        {prePopulated.fromM1 && !m1BannerDismissed && (
          <Callout
            text="We loaded your estimates from the Budget Gap Calculator. These are starting points — take time to refine them now."
            onDismiss={() => setM1BannerDismissed(true)}
          />
        )}

        {/* Mobile / Tablet tab bar */}
        {!isDesktop && (
          <div
            role="tablist"
            aria-label="Budget Modeler columns"
            style={{
              display: 'flex',
              gap: 4,
              backgroundColor: WHITE,
              border: '1px solid #E8EBF0',
              borderRadius: 10,
              padding: 4,
              margin: '12px 0 16px',
            }}
          >
            {[
              { id: 'current', label: 'Current Household', disabled: false },
              { id: 'projected', label: 'On My Own', disabled: projectedTabDisabled },
              { id: 'results', label: 'Results', disabled: resultsTabDisabled },
            ].map((t) => {
              const isActive = activeTab === t.id;
              return (
                <button
                  key={t.id}
                  role="tab"
                  aria-selected={isActive}
                  aria-controls={`bm-panel-${t.id}`}
                  aria-disabled={t.disabled}
                  disabled={t.disabled}
                  onClick={() => !t.disabled && setActiveTab(t.id)}
                  style={{
                    flex: 1,
                    padding: '10px 8px',
                    backgroundColor: isActive ? NAVY : 'transparent',
                    color: isActive ? WHITE : t.disabled ? '#9AA0AA' : NAVY,
                    border: 'none',
                    borderRadius: 7,
                    fontFamily: SOURCE,
                    fontWeight: isActive ? 600 : 500,
                    fontSize: 13,
                    cursor: t.disabled ? 'not-allowed' : 'pointer',
                  }}
                >
                  {t.label}
                </button>
              );
            })}
          </div>
        )}

        {/* Main area: desktop 2-column, mobile/tablet one column per tab */}
        {isDesktop ? (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: 24,
            }}
          >
            <ColumnHeader label="Current Household" total={debouncedTotals.current} />
            <ColumnHeader
              label="On My Own"
              total={debouncedTotals.projected}
              rightSide={
                !projectedHasData && !startScratchDismissed ? (
                  <div
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 6,
                      alignItems: 'flex-end',
                    }}
                  >
                    <button
                      type="button"
                      onClick={handleCopyAll}
                      disabled={!currentHasData}
                      style={{
                        backgroundColor: currentHasData ? NAVY : '#B0B8C8',
                        color: WHITE,
                        border: 'none',
                        borderRadius: 6,
                        padding: '8px 12px',
                        fontFamily: SOURCE,
                        fontWeight: 600,
                        fontSize: 13,
                        cursor: currentHasData ? 'pointer' : 'not-allowed',
                      }}
                    >
                      Start with Current Numbers
                    </button>
                    <button
                      type="button"
                      onClick={() => setStartScratchDismissed(true)}
                      style={{
                        background: 'transparent',
                        border: 'none',
                        color: NAVY,
                        opacity: 0.7,
                        fontFamily: SOURCE,
                        fontSize: 12,
                        cursor: 'pointer',
                        textDecoration: 'underline',
                      }}
                    >
                      or start from scratch
                    </button>
                  </div>
                ) : null
              }
            />

            {/* Side-by-side accordions */}
            <div style={{ gridColumn: '1 / span 2' }}>
              {BUDGET_CATEGORIES.map((cat) => (
                <div key={cat}>
                  {cat === 'otherPayments' && (
                    <LiabilityRefsPanel m2LiabilityRefs={m2LiabilityRefs} />
                  )}
                  <AccordionRowDesktop
                    category={cat}
                    current={current}
                    projected={projected}
                    m1References={m1References}
                    isOpen={expanded[cat]}
                    onToggle={() => toggleCategory(cat)}
                    setBudgetField={setBudgetField}
                    copyCategoryToProjected={copyCategoryToProjected}
                    dismissedPrompts={dismissedPrompts}
                    dismissPrompt={dismissPrompt}
                  />
                </div>
              ))}
            </div>

            <div style={{ gridColumn: '1 / span 2', marginTop: 18 }}>
              <button
                type="button"
                onClick={handleCalculate}
                disabled={!canViewResults}
                style={{
                  width: '100%',
                  padding: '14px 20px',
                  backgroundColor: canViewResults ? GOLD : '#D8DCE4',
                  color: canViewResults ? NAVY : '#8A94A6',
                  border: 'none',
                  borderRadius: 8,
                  fontFamily: PLAYFAIR,
                  fontWeight: 700,
                  fontSize: 16,
                  cursor: canViewResults ? 'pointer' : 'not-allowed',
                }}
              >
                Calculate &amp; View Results
              </button>
              {!canViewResults && (
                <p
                  style={{
                    fontFamily: SOURCE,
                    fontSize: 12,
                    color: NAVY,
                    opacity: 0.6,
                    textAlign: 'center',
                    marginTop: 6,
                  }}
                >
                  Enter at least one value in each column to calculate.
                </p>
              )}
            </div>

            {results && (
              <div style={{ gridColumn: '1 / span 2' }} id="bm-results">
                <ResultsSection
                  results={results}
                  showPayStubLink={!payStubDecoder?.completed}
                />
              </div>
            )}
          </div>
        ) : (
          <>
            {/* Current tab */}
            {activeTab === 'current' && (
              <div id="bm-panel-current" role="tabpanel" aria-labelledby="tab-current">
                <ColumnHeader label="Current Household" total={debouncedTotals.current} />
                {BUDGET_CATEGORIES.map((cat) => (
                  <div key={cat}>
                    {cat === 'otherPayments' && (
                      <LiabilityRefsPanel m2LiabilityRefs={m2LiabilityRefs} />
                    )}
                    <AccordionRowMobile
                      column="current"
                      category={cat}
                      data={current}
                      m1References={m1References}
                      isOpen={expanded[cat]}
                      onToggle={() => toggleCategory(cat)}
                      setBudgetField={setBudgetField}
                      dismissedPrompts={dismissedPrompts}
                      dismissPrompt={dismissPrompt}
                    />
                  </div>
                ))}
              </div>
            )}

            {activeTab === 'projected' && (
              <div id="bm-panel-projected" role="tabpanel" aria-labelledby="tab-projected">
                <ColumnHeader label="On My Own" total={debouncedTotals.projected} />

                {!projectedHasData && !startScratchDismissed && (
                  <div
                    style={{
                      backgroundColor: WHITE,
                      border: `1px solid ${GOLD}`,
                      borderRadius: 10,
                      padding: 14,
                      marginBottom: 14,
                    }}
                  >
                    <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
                      <button
                        type="button"
                        onClick={handleCopyAll}
                        disabled={!currentHasData}
                        style={{
                          backgroundColor: currentHasData ? NAVY : '#B0B8C8',
                          color: WHITE,
                          border: 'none',
                          borderRadius: 6,
                          padding: '8px 14px',
                          fontFamily: SOURCE,
                          fontWeight: 600,
                          fontSize: 13,
                          cursor: currentHasData ? 'pointer' : 'not-allowed',
                        }}
                      >
                        Start with Current Numbers
                      </button>
                      <button
                        type="button"
                        onClick={() => setStartScratchDismissed(true)}
                        style={{
                          background: 'transparent',
                          border: 'none',
                          color: NAVY,
                          opacity: 0.7,
                          fontFamily: SOURCE,
                          fontSize: 12,
                          cursor: 'pointer',
                          textDecoration: 'underline',
                        }}
                      >
                        or start from scratch
                      </button>
                    </div>
                  </div>
                )}

                {BUDGET_CATEGORIES.map((cat) => (
                  <div key={cat}>
                    {cat === 'otherPayments' && (
                      <LiabilityRefsPanel m2LiabilityRefs={m2LiabilityRefs} />
                    )}
                    <AccordionRowMobile
                      column="projected"
                      category={cat}
                      data={projected}
                      m1References={m1References}
                      isOpen={expanded[cat]}
                      onToggle={() => toggleCategory(cat)}
                      setBudgetField={setBudgetField}
                      copyCategoryToProjected={copyCategoryToProjected}
                      dismissedPrompts={dismissedPrompts}
                      dismissPrompt={dismissPrompt}
                    />
                  </div>
                ))}
              </div>
            )}

            {activeTab === 'results' && (
              <div id="bm-panel-results" role="tabpanel" aria-labelledby="tab-results">
                {!results ? (
                  <div
                    style={{
                      backgroundColor: WHITE,
                      border: '1px solid #E8EBF0',
                      borderRadius: 10,
                      padding: 20,
                      textAlign: 'center',
                    }}
                  >
                    <p
                      style={{
                        fontFamily: SOURCE,
                        fontSize: 14,
                        color: NAVY,
                        marginBottom: 12,
                      }}
                    >
                      Ready to see the comparison?
                    </p>
                    <button
                      type="button"
                      onClick={handleCalculate}
                      disabled={!canViewResults}
                      style={{
                        padding: '12px 20px',
                        backgroundColor: canViewResults ? GOLD : '#D8DCE4',
                        color: canViewResults ? NAVY : '#8A94A6',
                        border: 'none',
                        borderRadius: 8,
                        fontFamily: PLAYFAIR,
                        fontWeight: 700,
                        fontSize: 15,
                        cursor: canViewResults ? 'pointer' : 'not-allowed',
                      }}
                    >
                      Calculate &amp; View Results
                    </button>
                  </div>
                ) : (
                  <ResultsSection
                    results={results}
                    showPayStubLink={!payStubDecoder?.completed}
                  />
                )}
              </div>
            )}
          </>
        )}

        {/* Footer disclaimer */}
        <footer style={{ marginTop: 40 }}>
          <p
            style={{
              fontFamily: SOURCE,
              fontSize: 12,
              color: NAVY,
              opacity: 0.6,
              lineHeight: 1.55,
              maxWidth: 820,
            }}
          >
            This tool is for educational and planning purposes only. It provides estimates based on
            the numbers you enter. Actual post-divorce expenses depend on custody arrangements,
            housing decisions, insurance options, and court orders. For guidance specific to your
            situation, consult a Certified Divorce Financial Analyst® or attorney.
          </p>
        </footer>
      </div>

      {/* Sticky running-totals footer */}
      <div
        aria-live="polite"
        style={{
          position: 'fixed',
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: NAVY,
          color: WHITE,
          padding: '12px 16px',
          zIndex: 50,
          boxShadow: '0 -4px 18px rgba(0,0,0,0.15)',
        }}
      >
        <div
          style={{
            maxWidth: 1200,
            margin: '0 auto',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 12,
            flexWrap: 'wrap',
          }}
        >
          <div style={{ display: 'flex', gap: isMedium ? 28 : 14, flexWrap: 'wrap' }}>
            <FooterStat label="Current Household" value={debouncedTotals.current} />
            <FooterStat label="On My Own" value={debouncedTotals.projected} />
            <FooterStat
              label="Monthly Change"
              value={monthlyChange}
              color={monthlyChangeColor}
              signed
            />
          </div>
          {!isDesktop && activeTab !== 'results' && (
            <button
              type="button"
              onClick={handleCalculate}
              disabled={!canViewResults}
              style={{
                backgroundColor: canViewResults ? GOLD : '#5C6A84',
                color: canViewResults ? NAVY : '#AEB5C3',
                border: 'none',
                borderRadius: 8,
                padding: '9px 14px',
                fontFamily: PLAYFAIR,
                fontWeight: 700,
                fontSize: 13,
                cursor: canViewResults ? 'pointer' : 'not-allowed',
              }}
            >
              View Results →
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── ColumnHeader ─────────────────────────────────────────────────────────────
function ColumnHeader({ label, total, rightSide }) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'space-between',
        padding: '10px 14px',
        backgroundColor: WHITE,
        border: '1px solid #E8EBF0',
        borderRadius: 10,
        marginBottom: 10,
        gap: 12,
      }}
    >
      <div>
        <div style={{ fontFamily: PLAYFAIR, fontWeight: 700, fontSize: 16, color: NAVY }}>
          {label}
        </div>
        <div
          style={{
            fontFamily: SOURCE,
            fontSize: 13,
            color: NAVY,
            opacity: 0.7,
            marginTop: 2,
          }}
        >
          Running total: <strong>{fmtShort(total)}</strong>/mo
        </div>
      </div>
      {rightSide}
    </div>
  );
}

// ─── FooterStat ───────────────────────────────────────────────────────────────
function FooterStat({ label, value, color, signed }) {
  return (
    <div style={{ minWidth: 120 }}>
      <div style={{ fontFamily: SOURCE, fontSize: 11, opacity: 0.75, textTransform: 'uppercase', letterSpacing: 0.4 }}>
        {label}
      </div>
      <div
        style={{
          fontFamily: PLAYFAIR,
          fontWeight: 700,
          fontSize: 18,
          color: color || WHITE,
          marginTop: 2,
        }}
      >
        {signed ? fmtSigned(value) : fmtShort(value)}
      </div>
    </div>
  );
}

// ─── Liability refs panel (shown above Other Payments accordion) ─────────────
function LiabilityRefsPanel({ m2LiabilityRefs }) {
  if (!m2LiabilityRefs || m2LiabilityRefs.length === 0) return null;
  return (
    <div
      style={{
        backgroundColor: PARCHMENT,
        border: '1px solid #EAE3D0',
        borderRadius: 10,
        padding: '10px 14px',
        marginBottom: 10,
      }}
    >
      <div style={{ fontFamily: SOURCE, fontSize: 12, fontWeight: 600, color: NAVY, marginBottom: 6 }}>
        From your Marital Estate Inventory — these are balances, not monthly payments. Enter your monthly payment amounts below.
      </div>
      <ul style={{ margin: 0, paddingLeft: 18, fontFamily: SOURCE, fontSize: 12, color: NAVY }}>
        {m2LiabilityRefs.map((l, i) => (
          <li key={i} style={{ marginBottom: 2 }}>
            {l.description}: <strong>{fmtShort(l.balance)}</strong>
          </li>
        ))}
      </ul>
    </div>
  );
}

// ─── Desktop accordion row (two columns side-by-side) ────────────────────────
function AccordionRowDesktop({
  category,
  current,
  projected,
  m1References,
  isOpen,
  onToggle,
  setBudgetField,
  copyCategoryToProjected,
  dismissedPrompts,
  dismissPrompt,
}) {
  const fieldKeys = Object.keys(current[category]);
  const currentTotal = categoryTotal(current, category);
  const projectedTotal = categoryTotal(projected, category);
  const delta = projectedTotal - currentTotal;
  const nonZeroCount =
    categoryNonZeroCount(current, category) + categoryNonZeroCount(projected, category);

  const m1Ref = m1References?.[category] || 0;
  const showM1Bar = m1Ref > 0;
  const diffPct =
    m1Ref > 0 && currentTotal > 0 ? Math.abs((currentTotal - m1Ref) / m1Ref) * 100 : 0;
  const showDiffNote = showM1Bar && diffPct > 25 && currentTotal > 0;

  const showCategoryPrompt =
    CATEGORY_PROMPTS[category] && !dismissedPrompts[category];

  const headerId = `accordion-header-${category}`;
  const panelId = `accordion-panel-${category}`;

  return (
    <div
      style={{
        backgroundColor: WHITE,
        border: '1px solid #E8EBF0',
        borderRadius: 10,
        marginBottom: 10,
        overflow: 'hidden',
      }}
    >
      <div
        style={{
          position: 'relative',
          display: 'flex',
          alignItems: 'stretch',
          backgroundColor: WHITE,
        }}
      >
        <button
          type="button"
          id={headerId}
          aria-expanded={isOpen}
          aria-controls={panelId}
          onClick={onToggle}
          style={{
            flex: 1,
            display: 'grid',
            gridTemplateColumns: '1fr auto auto auto auto auto',
            gap: 14,
            padding: '14px 18px',
            alignItems: 'center',
            backgroundColor: 'transparent',
            border: 'none',
            cursor: 'pointer',
            textAlign: 'left',
            width: '100%',
            font: 'inherit',
            color: 'inherit',
          }}
        >
          <span style={{ display: 'block' }}>
            <span
              style={{
                display: 'block',
                fontFamily: PLAYFAIR,
                fontWeight: 700,
                fontSize: 16,
                color: NAVY,
              }}
            >
              {CATEGORY_LABELS[category]}
            </span>
            <span
              style={{
                display: 'block',
                fontFamily: SOURCE,
                fontSize: 12,
                color: NAVY,
                opacity: 0.6,
                marginTop: 2,
              }}
            >
              {nonZeroCount} of {fieldKeys.length * 2} items entered
            </span>
          </span>
          <span style={{ textAlign: 'right', display: 'block' }}>
            <span style={{ display: 'block', fontFamily: SOURCE, fontSize: 10, opacity: 0.6 }}>Current</span>
            <span style={{ display: 'block', fontFamily: PLAYFAIR, fontWeight: 700, fontSize: 15, color: NAVY }}>
              {fmtShort(currentTotal)}
            </span>
          </span>
          <span style={{ textAlign: 'right', display: 'block' }}>
            <span style={{ display: 'block', fontFamily: SOURCE, fontSize: 10, opacity: 0.6 }}>On My Own</span>
            <span style={{ display: 'block', fontFamily: PLAYFAIR, fontWeight: 700, fontSize: 15, color: NAVY }}>
              {fmtShort(projectedTotal)}
            </span>
          </span>
          <span style={{ textAlign: 'right', display: 'block', minWidth: 70 }}>
            <span style={{ display: 'block', fontFamily: SOURCE, fontSize: 10, opacity: 0.6 }}>Δ</span>
            <span
              style={{
                display: 'block',
                fontFamily: PLAYFAIR,
                fontWeight: 700,
                fontSize: 15,
                color: delta > 0 ? RED : delta < 0 ? GREEN : NAVY,
              }}
            >
              {delta === 0 ? '$0' : fmtSigned(delta)}
            </span>
          </span>
          {/* Spacer reserving room for the absolutely-positioned Copy button */}
          <span aria-hidden="true" style={{ display: 'inline-block', width: 128 }} />
          <span
            aria-hidden="true"
            style={{
              fontFamily: SOURCE,
              fontSize: 14,
              color: '#8A94A6',
              transform: isOpen ? 'rotate(180deg)' : 'rotate(0)',
              transition: 'transform 0.2s',
              lineHeight: 1,
              display: 'inline-block',
            }}
          >
            ▾
          </span>
        </button>
        <button
          type="button"
          aria-label={`Copy current ${CATEGORY_LABELS[category].toLowerCase()} expenses to single budget`}
          onClick={(e) => {
            e.stopPropagation();
            copyCategoryToProjected(category);
          }}
          style={{
            position: 'absolute',
            top: '50%',
            right: 44,
            transform: 'translateY(-50%)',
            backgroundColor: WHITE,
            border: `1px solid ${GOLD}`,
            color: NAVY,
            borderRadius: 6,
            padding: '5px 10px',
            fontFamily: SOURCE,
            fontSize: 11,
            fontWeight: 600,
            cursor: 'pointer',
            whiteSpace: 'nowrap',
          }}
        >
          Copy from Current
        </button>
      </div>

      {isOpen && (
        <div id={panelId} role="region" aria-labelledby={headerId} style={{ padding: '14px 18px 18px', borderTop: '1px solid #EEF0F5' }}>
          {showM1Bar && (
            <div
              style={{
                backgroundColor: PARCHMENT,
                border: '1px solid #EAE3D0',
                borderRadius: 6,
                padding: '8px 12px',
                marginBottom: 10,
                fontFamily: SOURCE,
                fontSize: 12,
                color: NAVY,
              }}
            >
              Budget Gap estimate: <strong>{fmtShort(m1Ref)}</strong>/mo
              {showDiffNote && (
                <div style={{ color: '#8C6A1C', marginTop: 4 }}>
                  This differs from your earlier estimate by {Math.round(diffPct)}%. That&apos;s fine — this is a more detailed look.
                </div>
              )}
            </div>
          )}

          {showCategoryPrompt && (
            <Callout
              text={CATEGORY_PROMPTS[category]}
              onDismiss={() => dismissPrompt(category)}
            />
          )}

          {/* Column headers for projected column */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr 1fr auto',
              gap: 12,
              alignItems: 'center',
              padding: '6px 0 10px',
              borderBottom: '1px solid #EEF0F5',
              marginBottom: 10,
            }}
          >
            <div style={{ fontFamily: SOURCE, fontSize: 11, color: NAVY, opacity: 0.6, textTransform: 'uppercase', letterSpacing: 0.4 }}>
              Line Item
            </div>
            <div style={{ fontFamily: SOURCE, fontSize: 11, color: NAVY, opacity: 0.6, textTransform: 'uppercase', letterSpacing: 0.4 }}>
              Current Household
            </div>
            <div style={{ fontFamily: SOURCE, fontSize: 11, color: NAVY, opacity: 0.6, textTransform: 'uppercase', letterSpacing: 0.4 }}>
              On My Own
            </div>
            <div />
          </div>

          {fieldKeys.map((field) => {
            const cVal = current[category][field] || 0;
            const pVal = projected[category][field] || 0;
            const rowDelta = pVal - cVal;
            const rowId = `bm-${category}-${field}`;
            return (
              <div
                key={field}
                style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr 1fr auto',
                  gap: 12,
                  alignItems: 'center',
                  padding: '6px 0',
                }}
              >
                <label
                  htmlFor={`${rowId}-current`}
                  style={{ fontFamily: SOURCE, fontSize: 13, color: NAVY }}
                >
                  {LINE_ITEM_LABELS[field] || field}
                </label>
                <CurrencyInput
                  id={`${rowId}-current`}
                  value={cVal}
                  ariaLabel={`Current household ${LINE_ITEM_LABELS[field] || field}`}
                  onChange={(v) => setBudgetField('current', category, field, v)}
                />
                <CurrencyInput
                  id={`${rowId}-projected`}
                  value={pVal}
                  ariaLabel={`On my own ${LINE_ITEM_LABELS[field] || field}`}
                  onChange={(v) => setBudgetField('projected', category, field, v)}
                />
                <div
                  style={{
                    fontFamily: SOURCE,
                    fontSize: 12,
                    fontWeight: 600,
                    minWidth: 70,
                    textAlign: 'right',
                    color: rowDelta > 0 ? RED : rowDelta < 0 ? GREEN : 'transparent',
                  }}
                >
                  {rowDelta !== 0 ? fmtSigned(rowDelta) : '—'}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── Mobile accordion row (single column per tab) ────────────────────────────
function AccordionRowMobile({
  column,
  category,
  data,
  m1References,
  isOpen,
  onToggle,
  setBudgetField,
  copyCategoryToProjected,
  dismissedPrompts,
  dismissPrompt,
}) {
  const fieldKeys = Object.keys(data[category]);
  const total = categoryTotal(data, category);
  const nonZeroCount = categoryNonZeroCount(data, category);
  const m1Ref = m1References?.[category] || 0;
  const showM1Bar = column === 'current' && m1Ref > 0;
  const diffPct =
    m1Ref > 0 && total > 0 ? Math.abs((total - m1Ref) / m1Ref) * 100 : 0;
  const showDiffNote = showM1Bar && diffPct > 25 && total > 0;

  const isProjected = column === 'projected';
  const showCategoryPrompt =
    isProjected && CATEGORY_PROMPTS[category] && !dismissedPrompts[category];

  const headerId = `accordion-header-${column}-${category}`;
  const panelId = `accordion-panel-${column}-${category}`;

  return (
    <div
      style={{
        backgroundColor: WHITE,
        border: '1px solid #E8EBF0',
        borderRadius: 10,
        marginBottom: 10,
        overflow: 'hidden',
      }}
    >
      <div
        style={{
          position: 'relative',
          width: '100%',
          display: 'flex',
          alignItems: 'stretch',
          backgroundColor: WHITE,
        }}
      >
        <button
          type="button"
          id={headerId}
          aria-expanded={isOpen}
          aria-controls={panelId}
          onClick={onToggle}
          style={{
            flex: 1,
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: 10,
            padding: '14px 16px',
            backgroundColor: 'transparent',
            border: 'none',
            cursor: 'pointer',
            textAlign: 'left',
            width: '100%',
            font: 'inherit',
            color: 'inherit',
          }}
        >
          <span style={{ display: 'block', flex: 1, minWidth: 0 }}>
            <span
              style={{
                display: 'block',
                fontFamily: PLAYFAIR,
                fontWeight: 700,
                fontSize: 15,
                color: NAVY,
              }}
            >
              {CATEGORY_LABELS[category]}
            </span>
            <span
              style={{
                display: 'block',
                fontFamily: SOURCE,
                fontSize: 11,
                color: NAVY,
                opacity: 0.6,
                marginTop: 2,
              }}
            >
              {nonZeroCount} of {fieldKeys.length} items entered
            </span>
          </span>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 10 }}>
            {isProjected && copyCategoryToProjected && (
              // Spacer reserving room for the absolutely-positioned Copy button
              <span aria-hidden="true" style={{ display: 'inline-block', width: 128 }} />
            )}
            <span style={{ fontFamily: PLAYFAIR, fontWeight: 700, fontSize: 15, color: NAVY }}>
              {fmtShort(total)}
            </span>
            <span
              aria-hidden="true"
              style={{
                fontFamily: SOURCE,
                fontSize: 14,
                color: '#8A94A6',
                transform: isOpen ? 'rotate(180deg)' : 'rotate(0)',
                transition: 'transform 0.2s',
                lineHeight: 1,
                display: 'inline-block',
              }}
            >
              ▾
            </span>
          </span>
        </button>
        {isProjected && copyCategoryToProjected && (
          <button
            type="button"
            aria-label={`Copy current ${CATEGORY_LABELS[category].toLowerCase()} expenses to single budget`}
            onClick={(e) => {
              e.stopPropagation();
              copyCategoryToProjected(category);
            }}
            style={{
              position: 'absolute',
              top: '50%',
              right: 76,
              transform: 'translateY(-50%)',
              backgroundColor: WHITE,
              border: `1px solid ${GOLD}`,
              color: NAVY,
              borderRadius: 6,
              padding: '5px 10px',
              fontFamily: SOURCE,
              fontSize: 11,
              fontWeight: 600,
              cursor: 'pointer',
              whiteSpace: 'nowrap',
            }}
          >
            Copy from Current
          </button>
        )}
      </div>

      {isOpen && (
        <div id={panelId} role="region" aria-labelledby={headerId} style={{ padding: '10px 16px 16px', borderTop: '1px solid #EEF0F5' }}>
          {showM1Bar && (
            <div
              style={{
                backgroundColor: PARCHMENT,
                border: '1px solid #EAE3D0',
                borderRadius: 6,
                padding: '8px 12px',
                marginBottom: 10,
                fontFamily: SOURCE,
                fontSize: 12,
                color: NAVY,
              }}
            >
              Budget Gap estimate: <strong>{fmtShort(m1Ref)}</strong>/mo
              {showDiffNote && (
                <div style={{ color: '#8C6A1C', marginTop: 4 }}>
                  This differs from your earlier estimate by {Math.round(diffPct)}%. That&apos;s fine — this is a more detailed look.
                </div>
              )}
            </div>
          )}

          {showCategoryPrompt && (
            <Callout
              text={CATEGORY_PROMPTS[category]}
              onDismiss={() => dismissPrompt(category)}
            />
          )}

          {fieldKeys.map((field) => {
            const val = data[category][field] || 0;
            const rowId = `bm-${column}-${category}-${field}`;
            return (
              <div
                key={field}
                style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 150px',
                  gap: 10,
                  alignItems: 'center',
                  padding: '6px 0',
                }}
              >
                <label
                  htmlFor={rowId}
                  style={{ fontFamily: SOURCE, fontSize: 13, color: NAVY }}
                >
                  {LINE_ITEM_LABELS[field] || field}
                </label>
                <CurrencyInput
                  id={rowId}
                  value={val}
                  ariaLabel={`${column === 'current' ? 'Current household' : 'On my own'} ${LINE_ITEM_LABELS[field] || field}`}
                  onChange={(v) => setBudgetField(column, category, field, v)}
                />
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── Results Section ──────────────────────────────────────────────────────────
function ResultsSection({ results, showPayStubLink }) {
  const { currentTotal, projectedTotal, delta, deltaPercent, categoryDeltas, topIncreases, topDecreases, incomeComparison } = results;

  const deltaColor = delta > 50 ? RED : delta < -50 ? GREEN : NAVY;

  // Revelation message
  let revelation = '';
  if (delta > 50) {
    revelation = `Living independently typically costs more, not less. Your single household expenses are ${fmtShort(delta)} more per month than your current budget. This is normal — expenses like housing, insurance, and utilities don't split evenly. Understanding this gap is the first step to planning around it.`;
  } else if (delta < -50) {
    revelation = `Your projected single expenses are ${fmtShort(Math.abs(delta))} less per month than your current household. This is less common — review your single budget to make sure you haven't underestimated new costs like health insurance, home maintenance, or children's duplicate needs.`;
  } else {
    revelation =
      "Your single and married expenses are roughly equal. The mix changes — some categories go up, others go down — but the total is similar. What matters now is whether your income covers these costs.";
  }

  const hasIncome = !!incomeComparison;
  const projectedShortfall =
    hasIncome && incomeComparison.projectedSurplusShortfall < 0
      ? Math.abs(incomeComparison.projectedSurplusShortfall)
      : 0;

  return (
    <section style={{ marginTop: 28 }}>
      {/* Output 1 — Comparison Summary Card */}
      <div
        style={{
          backgroundColor: WHITE,
          border: '1px solid #E8EBF0',
          borderRadius: 10,
          padding: 20,
          marginBottom: 18,
        }}
      >
        <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 10, padding: '6px 0' }}>
          <span style={{ fontFamily: SOURCE, fontSize: 14, color: NAVY }}>Current Monthly Expenses</span>
          <span style={{ fontFamily: PLAYFAIR, fontWeight: 700, fontSize: 18, color: NAVY }}>
            {fmtShort(currentTotal)}
          </span>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 10, padding: '6px 0', borderTop: '1px solid #EEF0F5' }}>
          <span style={{ fontFamily: SOURCE, fontSize: 14, color: NAVY }}>On My Own Monthly Expenses</span>
          <span style={{ fontFamily: PLAYFAIR, fontWeight: 700, fontSize: 18, color: NAVY }}>
            {fmtShort(projectedTotal)}
          </span>
        </div>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr auto',
            gap: 10,
            padding: '10px 0 4px',
            borderTop: `2px solid ${GOLD}`,
            marginTop: 6,
          }}
        >
          <span style={{ fontFamily: SOURCE, fontSize: 14, fontWeight: 600, color: NAVY }}>
            Monthly Change
          </span>
          <span
            style={{
              fontFamily: PLAYFAIR,
              fontWeight: 700,
              fontSize: 22,
              color: deltaColor,
            }}
          >
            {fmtSigned(delta)}
            {deltaPercent != null && (
              <span style={{ fontSize: 13, marginLeft: 6, opacity: 0.8 }}>
                ({delta > 0 ? '+' : ''}
                {Math.round(deltaPercent)}%)
              </span>
            )}
          </span>
        </div>

        {hasIncome && (
          <div style={{ marginTop: 16, paddingTop: 14, borderTop: '1px solid #EEF0F5' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 10, padding: '4px 0' }}>
              <span style={{ fontFamily: SOURCE, fontSize: 13, color: NAVY, opacity: 0.75 }}>
                Monthly Income
              </span>
              <span style={{ fontFamily: SOURCE, fontSize: 14, color: NAVY }}>
                {fmtShort(incomeComparison.monthlyIncome)}
              </span>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 10, padding: '4px 0' }}>
              <span style={{ fontFamily: SOURCE, fontSize: 13, color: NAVY, opacity: 0.75 }}>
                Current Surplus / Shortfall
              </span>
              <span
                style={{
                  fontFamily: SOURCE,
                  fontSize: 14,
                  fontWeight: 600,
                  color: incomeComparison.currentSurplusShortfall >= 0 ? GREEN : RED,
                }}
              >
                {fmtSigned(incomeComparison.currentSurplusShortfall)}
              </span>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 10, padding: '4px 0' }}>
              <span style={{ fontFamily: SOURCE, fontSize: 13, color: NAVY, opacity: 0.75 }}>
                Projected Surplus / Shortfall
              </span>
              <span
                style={{
                  fontFamily: SOURCE,
                  fontSize: 14,
                  fontWeight: 600,
                  color: incomeComparison.projectedSurplusShortfall >= 0 ? GREEN : RED,
                }}
              >
                {fmtSigned(incomeComparison.projectedSurplusShortfall)}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Output 2 — Category Comparison Chart */}
      <CategoryComparisonChart categoryDeltas={categoryDeltas} />

      {/* Output 3 — Top Changes Cards */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
          gap: 14,
          margin: '18px 0',
        }}
      >
        <TopChangesCard
          title="Where Costs Go Up"
          accent={RED}
          items={topIncreases}
          emptyText="No categories increased."
        />
        <TopChangesCard
          title="Where Costs Go Down"
          accent={GREEN}
          items={topDecreases}
          emptyText="No categories decreased."
        />
      </div>

      {/* Output 4 — Revelation message */}
      <div
        style={{
          backgroundColor: WHITE,
          borderLeft: `4px solid ${GOLD}`,
          border: '1px solid #E8EBF0',
          borderRadius: '0 10px 10px 0',
          padding: 18,
          marginBottom: 18,
        }}
      >
        <p style={{ fontFamily: SOURCE, fontSize: 15, color: NAVY, margin: 0, lineHeight: 1.55 }}>
          {revelation}
        </p>
        {projectedShortfall > 0 && (
          <p
            style={{
              fontFamily: SOURCE,
              fontSize: 14,
              color: NAVY,
              margin: '12px 0 0',
              lineHeight: 1.55,
              paddingTop: 12,
              borderTop: '1px solid #EEF0F5',
            }}
          >
            Your projected single expenses exceed your income by{' '}
            <strong>{fmtShort(projectedShortfall)}/month</strong>. The Financial Affidavit Builder
            (next tool) will help you organize these numbers, and Modules 4–6 cover strategies to
            close this gap — from tax planning to settlement negotiation.
          </p>
        )}
      </div>

      {/* Output 5 — CTA Card */}
      <div
        style={{
          backgroundColor: NAVY,
          color: WHITE,
          borderRadius: 12,
          padding: 22,
        }}
      >
        <div style={{ fontFamily: PLAYFAIR, fontWeight: 700, fontSize: 20, marginBottom: 8 }}>
          Ready to put this on paper?
        </div>
        <p
          style={{
            fontFamily: SOURCE,
            fontSize: 14,
            lineHeight: 1.55,
            margin: '0 0 14px',
            opacity: 0.92,
          }}
        >
          The Financial Affidavit Builder organizes your income and expenses into the format courts
          require — using the numbers you just worked through.
        </p>
        <Link
          href="/modules/m3/affidavit"
          style={{
            display: 'inline-block',
            backgroundColor: GOLD,
            color: NAVY,
            padding: '10px 16px',
            borderRadius: 8,
            fontFamily: PLAYFAIR,
            fontWeight: 700,
            fontSize: 14,
            textDecoration: 'none',
          }}
        >
          Build My Affidavit →
        </Link>
        {showPayStubLink && (
          <div style={{ marginTop: 14 }}>
            <Link
              href="/modules/m3/pay-stub"
              style={{
                fontFamily: SOURCE,
                fontSize: 13,
                color: PARCHMENT,
                textDecoration: 'underline',
                opacity: 0.9,
              }}
            >
              Or refine your income picture first with the Pay Stub Decoder.
            </Link>
          </div>
        )}
      </div>
    </section>
  );
}

// ─── Top Changes Card ─────────────────────────────────────────────────────────
function TopChangesCard({ title, accent, items, emptyText }) {
  return (
    <div
      style={{
        backgroundColor: WHITE,
        border: '1px solid #E8EBF0',
        borderTop: `4px solid ${accent}`,
        borderRadius: 10,
        padding: 16,
      }}
    >
      <div style={{ fontFamily: PLAYFAIR, fontWeight: 700, fontSize: 16, color: NAVY, marginBottom: 10 }}>
        {title}
      </div>
      {items.length === 0 ? (
        <p style={{ fontFamily: SOURCE, fontSize: 13, color: NAVY, opacity: 0.6, margin: 0 }}>
          {emptyText}
        </p>
      ) : (
        <ul style={{ margin: 0, padding: 0, listStyle: 'none' }}>
          {items.map((it, i) => (
            <li
              key={`${it.category}-${it.lineItem}-${i}`}
              style={{
                padding: '8px 0',
                borderTop: i === 0 ? 'none' : '1px solid #EEF0F5',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 10 }}>
                <div>
                  <div style={{ fontFamily: SOURCE, fontSize: 14, fontWeight: 600, color: NAVY }}>
                    {LINE_ITEM_LABELS[it.lineItem] || it.lineItem}
                  </div>
                  <div style={{ fontFamily: SOURCE, fontSize: 12, color: NAVY, opacity: 0.6 }}>
                    {CATEGORY_LABELS[it.category]} · {fmtShort(it.current)} → {fmtShort(it.projected)}
                  </div>
                </div>
                <div
                  style={{
                    fontFamily: PLAYFAIR,
                    fontWeight: 700,
                    fontSize: 15,
                    color: accent,
                  }}
                >
                  {fmtSigned(it.delta)}
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

// ─── Category Comparison Chart ────────────────────────────────────────────────
function CategoryComparisonChart({ categoryDeltas }) {
  const data = categoryDeltas.map((c) => ({
    category: CATEGORY_LABELS[c.category] || c.category,
    Current: c.current,
    Projected: c.projected,
    delta: c.delta,
  }));

  return (
    <div
      style={{
        backgroundColor: WHITE,
        border: '1px solid #E8EBF0',
        borderRadius: 10,
        padding: 18,
        marginBottom: 18,
      }}
    >
      <div style={{ fontFamily: PLAYFAIR, fontWeight: 700, fontSize: 16, color: NAVY, marginBottom: 12 }}>
        Category Comparison
      </div>
      <div style={{ width: '100%', height: Math.max(300, 44 * data.length) }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={data}
            layout="vertical"
            margin={{ top: 8, right: 72, bottom: 8, left: 8 }}
            barCategoryGap={10}
          >
            <XAxis type="number" hide />
            <YAxis
              type="category"
              dataKey="category"
              width={140}
              tick={{ fontFamily: 'Source Sans Pro, sans-serif', fontSize: 12, fill: NAVY }}
              axisLine={false}
              tickLine={false}
            />
            <Tooltip
              formatter={(v) => fmtShort(v)}
              contentStyle={{ fontFamily: 'Source Sans Pro, sans-serif', fontSize: 12 }}
            />
            <Bar dataKey="Current" fill={NAVY} />
            <Bar dataKey="Projected" fill={GOLD}>
              <LabelList
                dataKey="delta"
                position="right"
                formatter={(v) => (v === 0 ? '' : fmtSigned(v))}
                style={{
                  fontFamily: 'Source Sans Pro, sans-serif',
                  fontSize: 11,
                  fontWeight: 600,
                }}
                content={({ x, y, width, height, value }) => {
                  if (value == null || value === 0) return null;
                  const color = value > 0 ? RED : GREEN;
                  return (
                    <text
                      x={x + width + 6}
                      y={y + height / 2}
                      fill={color}
                      dominantBaseline="central"
                      fontFamily="Source Sans Pro, sans-serif"
                      fontSize={11}
                      fontWeight={600}
                    >
                      {fmtSigned(value)}
                    </text>
                  );
                }}
              />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
      {/* Legend */}
      <div style={{ display: 'flex', gap: 16, marginTop: 8 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <div style={{ width: 12, height: 12, backgroundColor: NAVY, borderRadius: 2 }} />
          <span style={{ fontFamily: SOURCE, fontSize: 12, color: NAVY }}>Current Household</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <div style={{ width: 12, height: 12, backgroundColor: GOLD, borderRadius: 2 }} />
          <span style={{ fontFamily: SOURCE, fontSize: 12, color: NAVY }}>On My Own</span>
        </div>
      </div>

      {/* Visually hidden accessible data table */}
      <table
        style={{ position: 'absolute', left: -9999, top: 'auto', width: 1, height: 1, overflow: 'hidden' }}
        aria-label="Category comparison data"
      >
        <thead>
          <tr>
            <th>Category</th>
            <th>Current Household</th>
            <th>On My Own</th>
            <th>Delta</th>
          </tr>
        </thead>
        <tbody>
          {categoryDeltas.map((c) => (
            <tr key={c.category}>
              <td>{CATEGORY_LABELS[c.category]}</td>
              <td>{fmtShort(c.current)}</td>
              <td>{fmtShort(c.projected)}</td>
              <td>{fmtSigned(c.delta)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
