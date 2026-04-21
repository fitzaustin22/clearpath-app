'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';
import {
  useM3Store,
  AFFIDAVIT_EXPENSE_CATEGORIES,
  CATEGORY_LABELS,
  LINE_ITEM_LABELS,
} from '@/src/stores/m3Store';
import { useDirtyFieldGuard } from '@/src/lib/hooks/useDirtyFieldGuard';

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
function formatCurrency(n) {
  if (n == null || isNaN(n)) return '$0';
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(n);
}

function parseCurrency(str) {
  const cleaned = String(str).replace(/[$,\s]/g, '');
  const val = parseFloat(cleaned);
  return isNaN(val) ? 0 : val;
}

function round2(n) {
  return Math.round(n * 100) / 100;
}

// ─── Responsive hook ──────────────────────────────────────────────────────────
function useBreakpoint() {
  const [bp, setBp] = useState('desktop');
  useEffect(() => {
    const update = () => {
      const w = window.innerWidth;
      if (w < 640) setBp('mobile');
      else if (w < 1024) setBp('tablet');
      else setBp('desktop');
    };
    update();
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, []);
  return bp;
}

// ─── CurrencyInput ────────────────────────────────────────────────────────────
function CurrencyInput({
  id,
  value,
  onChange,
  ariaLabel,
  placeholder = '0.00',
  disabled = false,
  prePopulated = false,
  onEdit,
}) {
  const formatForDisplay = (n) =>
    n > 0 ? n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '';

  const [display, setDisplay] = useState(() => formatForDisplay(value));
  const [prevValue, setPrevValue] = useState(value);
  const [focused, setFocused] = useState(false);

  // Sync display to external value during render when unfocused (React-supported pattern)
  if (!focused && value !== prevValue) {
    setPrevValue(value);
    const formatted = formatForDisplay(value);
    if (formatted !== display) {
      setDisplay(formatted);
    }
  }

  const borderColor = disabled ? '#D8DCE4' : '#C8D0DC';

  return (
    <div
      style={{
        position: 'relative',
        display: 'flex',
        alignItems: 'center',
        width: '100%',
        borderLeft: prePopulated ? `4px solid ${GOLD}` : undefined,
        paddingLeft: prePopulated ? 6 : 0,
      }}
      data-prepopulated={prePopulated ? 'true' : undefined}
    >
      <span
        style={{
          position: 'absolute',
          left: prePopulated ? 16 : 10,
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
          if (onEdit) onEdit();
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
          border: `1px solid ${borderColor}`,
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
function Callout({ text, variant = 'gold', onDismiss, children, role = 'note' }) {
  const isAmber = variant === 'amber';
  const isNavy = variant === 'navy';
  const borderColor = isAmber ? AMBER : isNavy ? NAVY : GOLD;
  const bgColor = isAmber ? '#FFFAEC' : isNavy ? '#F0F2F7' : '#FDF8EF';
  return (
    <aside
      role={role}
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
          <p style={{ fontFamily: SOURCE, fontSize: 13, color: NAVY, margin: 0, lineHeight: 1.55 }}>
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
    </aside>
  );
}

// ─── Parts meta ───────────────────────────────────────────────────────────────
const PARTS = [
  { id: 'income',      letter: 'A', title: 'Income' },
  { id: 'expenses',    letter: 'B', title: 'Expenses' },
  { id: 'assets',      letter: 'C', title: 'Assets' },
  { id: 'liabilities', letter: 'D', title: 'Liabilities' },
  { id: 'summary',     letter: 'Σ', title: 'Summary' },
];

// ─── Main Component ───────────────────────────────────────────────────────────
export default function AffidavitBuilder({ userTier = 'essentials' }) {
  const breakpoint = useBreakpoint();
  const isDesktop = breakpoint === 'desktop';

  const affidavitBuilder = useM3Store((s) => s.affidavitBuilder);
  const prePopulateAffidavitFromTools = useM3Store((s) => s.prePopulateAffidavitFromTools);
  const setAffidavitField = useM3Store((s) => s.setAffidavitField);
  const calculateAffidavitTotals = useM3Store((s) => s.calculateAffidavitTotals);
  const markSectionComplete = useM3Store((s) => s.markSectionComplete);

  // Hydration guard for zustand persist (SSR-safety: flip after mount)
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => {
    setHydrated(true);
  }, []);

  // Run pre-population once on mount (store guards via prePopulated flags internally)
  useEffect(() => {
    if (!hydrated) return;
    prePopulateAffidavitFromTools();
    // Recalculate totals after pre-pop
    calculateAffidavitTotals();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hydrated]);

  // Active stepper part
  const [activePart, setActivePart] = useState('income');

  // Dismissable nudges (prerequisite reminders)
  const [dismissedNudges, setDismissedNudges] = useState({});
  const dismissNudge = (id) =>
    setDismissedNudges((prev) => ({ ...prev, [id]: true }));

  // Track which pre-populated field paths have been edited.
  // Persisted to sessionStorage so edits survive intra-session navigation —
  // the generic hook is shared with M5+ tools that pre-populate from upstream.
  const { isDirty: isEdited, markDirty: markEdited } = useDirtyFieldGuard({
    storageKey: 'm3-affidavit-dirty-fields',
  });

  // Accordion open state for expenses
  const [expenseExpanded, setExpenseExpanded] = useState(() => {
    const initial = {};
    AFFIDAVIT_EXPENSE_CATEGORIES.forEach((c) => {
      initial[c] = c === 'home';
    });
    return initial;
  });
  const toggleExpenseAccordion = (cat) =>
    setExpenseExpanded((prev) => ({ ...prev, [cat]: !prev[cat] }));

  // Debounced recalculation when expenses change
  const debounceTimerRef = useRef(null);
  const handleExpenseChange = useCallback(
    (category, field, value) => {
      setAffidavitField('expenses', `${category}.${field}`, value);
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
      debounceTimerRef.current = setTimeout(() => {
        calculateAffidavitTotals();
      }, 150);
    },
    [setAffidavitField, calculateAffidavitTotals]
  );

  const handleAssetLiabilityChange = useCallback(
    (section, path, value) => {
      setAffidavitField(section, path, value);
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
      debounceTimerRef.current = setTimeout(() => {
        calculateAffidavitTotals();
      }, 150);
    },
    [setAffidavitField, calculateAffidavitTotals]
  );

  // Cleanup debounce timer on unmount
  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, []);

  // Recompute income-derived totals after any income-side edit, then persist them.
  // Store shape confirmed from m3Store.js:
  //   primaryEmployment.totalDeductions — flat number (monthly total)
  //   primaryEmployment.netMonthlyIncome — flat number
  //   netMonthlyIncomeAllSources — flat number at section root
  //   deductions[] items carry { monthly } (no perPaycheck)
  //   otherIncome[] items carry { monthlyAmount }
  //   deductionsFromOtherIncome[] items carry { monthlyAmount }
  const handleIncomeChange = useCallback(
    (path, value) => {
      setAffidavitField('income', path, value);
      queueMicrotask(() => {
        const incomeState = useM3Store.getState().affidavitBuilder.sections.income;
        const pe = incomeState.primaryEmployment;
        // Auto-calculate grossMonthlyIncome whenever grossPayPerCheck or paychecksPerYear changes
        let grossMonthly = Number(pe.grossMonthlyIncome) || 0;
        if (pe.grossPayPerCheck > 0 && pe.paychecksPerYear > 0) {
          grossMonthly = round2((pe.grossPayPerCheck * pe.paychecksPerYear) / 12);
          setAffidavitField('income', 'primaryEmployment.grossMonthlyIncome', grossMonthly);
        }
        const deductionsMonthly = (pe.deductions || []).reduce(
          (sum, d) => sum + (Number(d.monthly) || 0),
          0
        );
        setAffidavitField(
          'income',
          'primaryEmployment.totalDeductions',
          round2(deductionsMonthly)
        );
        const netMonthly = grossMonthly - deductionsMonthly;
        setAffidavitField(
          'income',
          'primaryEmployment.netMonthlyIncome',
          round2(netMonthly)
        );

        const otherIncomeMonthly = (incomeState.otherIncome || []).reduce(
          (sum, src) => sum + (Number(src.monthlyAmount) || 0),
          0
        );
        const otherDeductionsMonthly = (incomeState.deductionsFromOtherIncome || []).reduce(
          (sum, d) => sum + (Number(d.monthlyAmount) || 0),
          0
        );
        const netAllSources = netMonthly + otherIncomeMonthly - otherDeductionsMonthly;
        setAffidavitField(
          'income',
          'netMonthlyIncomeAllSources',
          round2(netAllSources)
        );
      });
    },
    [setAffidavitField]
  );

  if (!hydrated) {
    return (
      <div style={{ padding: 24, fontFamily: SOURCE, color: NAVY }}>
        Loading Financial Affidavit Builder…
      </div>
    );
  }

  const { sections, progress, prePopulated } = affidavitBuilder;
  const { income, expenses, assets, liabilities } = sections;

  // Derived status for stepper
  const sectionStatus = (id) => {
    if (id === 'income' && progress.incomeComplete) return 'complete';
    if (id === 'expenses' && progress.expensesComplete) return 'complete';
    if (id === 'assets' && progress.assetsComplete) return 'complete';
    if (id === 'liabilities' && progress.liabilitiesComplete) return 'complete';
    // In progress if any data exists for that section
    if (id === 'income') {
      const pe = income.primaryEmployment;
      if (
        pe.grossPayPerCheck > 0 ||
        pe.grossMonthlyIncome > 0 ||
        (pe.deductions && pe.deductions.length > 0) ||
        income.otherIncome.length > 0 ||
        income.monthlyIncomeOfDependentChildren > 0 ||
        prePopulated.fromTool1
      ) {
        return 'inProgress';
      }
    }
    if (id === 'expenses') {
      if (expenses.totalMonthlyExpenses > 0 || prePopulated.fromTool2) return 'inProgress';
    }
    if (id === 'assets') {
      if (assets.summary.totalAssets > 0 || prePopulated.fromM2) return 'inProgress';
    }
    if (id === 'liabilities') {
      if (
        liabilities.summary.totalLiabilities > 0 ||
        liabilities.noLiabilitiesConfirmed ||
        prePopulated.fromM2
      ) {
        return 'inProgress';
      }
    }
    return 'notStarted';
  };

  const statusToAriaLabel = (status) => {
    if (status === 'complete') return 'Complete';
    if (status === 'inProgress') return 'In Progress';
    return 'Not Started';
  };

  // ─── Persistent top banner ─────────────────────────────────────────────────
  const persistentBanner = (
    <div
      role="note"
      aria-label="Educational tool disclaimer"
      style={{
        position: 'sticky',
        top: 0,
        zIndex: 10,
        backgroundColor: '#FDF8EF',
        border: `2px solid ${GOLD}`,
        borderRadius: 8,
        padding: '12px 16px',
        marginBottom: 16,
        fontFamily: SOURCE,
        fontSize: 13,
        color: NAVY,
        lineHeight: 1.55,
      }}
    >
      This is an educational tool to help you understand and prepare for the financial
      affidavit process. <strong>This is not a legal document.</strong> Your attorney will
      prepare the official affidavit for filing with the court. The organized data you
      create here will make that process faster and more accurate.
    </div>
  );

  // ─── Stepper ──────────────────────────────────────────────────────────────
  const Stepper = () => (
    <nav
      aria-label="Affidavit sections"
      style={
        isDesktop
          ? {
              width: 200,
              flexShrink: 0,
              position: 'sticky',
              top: 90,
              alignSelf: 'flex-start',
            }
          : { marginBottom: 16 }
      }
    >
      {isDesktop ? (
        <ul
          style={{
            listStyle: 'none',
            padding: 8,
            margin: 0,
            backgroundColor: WHITE,
            border: '1px solid #E8EBF0',
            borderRadius: 10,
            display: 'flex',
            flexDirection: 'column',
            gap: 2,
          }}
        >
          {PARTS.map((p) => {
            const status = p.id === 'summary' ? null : sectionStatus(p.id);
            const isActive = activePart === p.id;
            const icon =
              status === 'complete' ? '✓' : status === 'inProgress' ? '◐' : p.letter;
            const iconColor =
              status === 'complete' ? GREEN : status === 'inProgress' ? AMBER : '#8A94A6';
            return (
              <li key={p.id}>
                <button
                  type="button"
                  onClick={() => setActivePart(p.id)}
                  aria-current={isActive ? 'step' : undefined}
                  aria-label={
                    p.id === 'summary'
                      ? 'Summary'
                      : `Part ${p.letter}: ${p.title} — ${statusToAriaLabel(status)}`
                  }
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                    width: '100%',
                    padding: '10px 12px',
                    backgroundColor: isActive ? PARCHMENT : 'transparent',
                    border: 'none',
                    borderLeft: isActive ? `3px solid ${GOLD}` : '3px solid transparent',
                    borderRadius: 6,
                    cursor: 'pointer',
                    textAlign: 'left',
                    fontFamily: SOURCE,
                    fontSize: 14,
                    color: NAVY,
                    fontWeight: isActive ? 600 : 400,
                  }}
                >
                  <span
                    aria-hidden="true"
                    style={{
                      width: 22,
                      height: 22,
                      borderRadius: '50%',
                      backgroundColor:
                        status === 'complete' ? GREEN : status === 'inProgress' ? '#FDF8EF' : '#F0F2F5',
                      color:
                        status === 'complete'
                          ? WHITE
                          : status === 'inProgress'
                          ? iconColor
                          : '#8A94A6',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: 11,
                      fontWeight: 700,
                      flexShrink: 0,
                    }}
                  >
                    {icon}
                  </span>
                  <span>
                    {p.id === 'summary' ? 'Summary' : `Part ${p.letter}: ${p.title}`}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      ) : (
        <div>
          <label
            htmlFor="part-select"
            style={{
              display: 'block',
              fontFamily: SOURCE,
              fontSize: 13,
              fontWeight: 600,
              color: NAVY,
              marginBottom: 6,
            }}
          >
            Section
          </label>
          <select
            id="part-select"
            value={activePart}
            onChange={(e) => setActivePart(e.target.value)}
            style={{
              width: '100%',
              padding: '10px 36px 10px 12px',
              fontFamily: SOURCE,
              fontSize: 14,
              color: NAVY,
              border: `1px solid #C8D0DC`,
              borderRadius: 6,
              backgroundColor: WHITE,
              appearance: 'none',
              backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='8' viewBox='0 0 12 8'%3E%3Cpath d='M1 1l5 5 5-5' stroke='%231B2A4A' stroke-width='1.5' fill='none' stroke-linecap='round'/%3E%3C/svg%3E")`,
              backgroundRepeat: 'no-repeat',
              backgroundPosition: 'right 12px center',
              cursor: 'pointer',
            }}
          >
            {PARTS.map((p) => {
              const status = p.id === 'summary' ? null : sectionStatus(p.id);
              const suffix =
                p.id === 'summary'
                  ? ''
                  : status === 'complete'
                  ? ' ✓'
                  : status === 'inProgress'
                  ? ' (in progress)'
                  : '';
              return (
                <option key={p.id} value={p.id}>
                  {p.id === 'summary' ? 'Summary' : `Part ${p.letter}: ${p.title}${suffix}`}
                </option>
              );
            })}
          </select>
        </div>
      )}
    </nav>
  );

  // ─── Part A: Income ────────────────────────────────────────────────────────
  const PartA = () => {
    const pe = income.primaryEmployment;
    // Note: no prior prerequisite for Part A; nudges only appear on Parts B/C/D

    return (
      <section aria-labelledby="part-a-heading">
        <header style={{ marginBottom: 16 }}>
          <div
            style={{
              fontFamily: SOURCE,
              fontSize: 12,
              fontWeight: 600,
              color: GOLD,
              letterSpacing: 1,
              textTransform: 'uppercase',
              marginBottom: 4,
            }}
          >
            Part A
          </div>
          <h2
            id="part-a-heading"
            style={{
              fontFamily: PLAYFAIR,
              fontWeight: 700,
              fontSize: 26,
              color: NAVY,
              margin: 0,
            }}
          >
            Income
          </h2>
          <p
            style={{
              fontFamily: SOURCE,
              fontSize: 14,
              color: NAVY,
              opacity: 0.75,
              marginTop: 6,
              marginBottom: 0,
              lineHeight: 1.55,
            }}
          >
            Employment, deductions, and other income sources — shown per-paycheck and
            per-month.
          </p>
        </header>

        {prePopulated.fromTool1 && (
          <Callout
            text="We loaded your income data from the Pay Stub Decoder. Review it here in the affidavit format."
            variant="gold"
          />
        )}

        {/* Employer */}
        <div style={cardStyle}>
          <label
            htmlFor="employer"
            style={labelStyle}
          >
            Employer
          </label>
          <input
            id="employer"
            type="text"
            value={pe.employer || ''}
            onChange={(e) => setAffidavitField('income', 'primaryEmployment.employer', e.target.value)}
            placeholder="e.g., Acme Corporation"
            style={{
              width: '100%',
              padding: '9px 12px',
              fontFamily: SOURCE,
              fontSize: 14,
              color: NAVY,
              border: `1px solid #C8D0DC`,
              borderRadius: 6,
              backgroundColor: WHITE,
              boxSizing: 'border-box',
            }}
          />
        </div>

        {/* Primary Employment Income */}
        <div style={cardStyle}>
          <h3 style={subheadingStyle}>Primary Employment</h3>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: 12,
              marginBottom: 14,
            }}
          >
            <div>
              <label htmlFor="payFreq" style={labelStyle}>
                Pay Frequency
              </label>
              <select
                id="payFreq"
                value={pe.payFrequency || ''}
                onChange={(e) =>
                  setAffidavitField('income', 'primaryEmployment.payFrequency', e.target.value || null)
                }
                style={{
                  width: '100%',
                  padding: '9px 12px',
                  fontFamily: SOURCE,
                  fontSize: 14,
                  color: pe.payFrequency ? NAVY : '#9AA0AA',
                  border: `1px solid #C8D0DC`,
                  borderRadius: 6,
                  backgroundColor: WHITE,
                  boxSizing: 'border-box',
                }}
              >
                <option value="">Select…</option>
                <option value="weekly">Weekly</option>
                <option value="biweekly">Biweekly</option>
                <option value="semimonthly">Semi-monthly</option>
                <option value="monthly">Monthly</option>
              </select>
            </div>
            <div>
              <label htmlFor="paychecksYr" style={labelStyle}>
                Paychecks per Year
              </label>
              <input
                id="paychecksYr"
                type="number"
                min={1}
                max={52}
                value={pe.paychecksPerYear || ''}
                onChange={(e) => {
                  const n = parseInt(e.target.value, 10);
                  handleIncomeChange(
                    'primaryEmployment.paychecksPerYear',
                    isNaN(n) ? null : n
                  );
                }}
                style={inputStyle}
              />
            </div>
          </div>

          {/* Two-column: Per Paycheck | Monthly */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr 1fr',
              gap: 12,
              alignItems: 'end',
            }}
          >
            <div>
              <label htmlFor="grossPerCheck" style={labelStyle}>
                Gross Pay (per paycheck)
              </label>
              <CurrencyInput
                id="grossPerCheck"
                value={pe.grossPayPerCheck || 0}
                prePopulated={prePopulated.fromTool1 && !isEdited('primaryEmployment.grossPayPerCheck')}
                onEdit={() => markEdited('primaryEmployment.grossPayPerCheck')}
                onChange={(v) =>
                  handleIncomeChange('primaryEmployment.grossPayPerCheck', v)
                }
              />
            </div>
            <div>
              <label htmlFor="grossMonthly" style={labelStyle}>
                Gross Monthly Income
              </label>
              <CurrencyInput
                id="grossMonthly"
                value={pe.grossMonthlyIncome || 0}
                disabled={true}
                prePopulated={prePopulated.fromTool1 && !isEdited('primaryEmployment.grossMonthlyIncome')}
              />
            </div>
            <div />
          </div>
        </div>

        {/* Deductions Table */}
        <div style={cardStyle}>
          <h3 style={subheadingStyle}>Deductions</h3>
          {pe.deductions && pe.deductions.length > 0 ? (
            <div style={{ overflowX: 'auto' }}>
              <table
                style={{
                  width: '100%',
                  borderCollapse: 'collapse',
                  fontFamily: SOURCE,
                  fontSize: 13,
                }}
              >
                <thead>
                  <tr style={{ borderBottom: `2px solid #E8EBF0` }}>
                    <th style={tableHeaderStyle}>Deduction</th>
                    <th style={{ ...tableHeaderStyle, textAlign: 'right' }}>
                      Per Paycheck
                    </th>
                    <th style={{ ...tableHeaderStyle, textAlign: 'right' }}>
                      Monthly
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {pe.deductions.map((ded, idx) => {
                    const perPaycheck =
                      pe.grossPayPerCheck && pe.paychecksPerYear && ded.monthly
                        ? round2((ded.monthly * 12) / pe.paychecksPerYear)
                        : 0;
                    return (
                      <tr key={ded.id || idx} style={{ borderBottom: '1px solid #F0F2F5' }}>
                        <td style={{ padding: '10px 8px 10px 0', color: NAVY }}>
                          {ded.label}
                          {ded.isVoluntary && (
                            <span
                              style={{
                                marginLeft: 8,
                                fontSize: 10,
                                backgroundColor: '#FDF1DC',
                                color: '#7A5010',
                                padding: '1px 5px',
                                borderRadius: 3,
                                fontWeight: 600,
                                letterSpacing: 0.3,
                              }}
                            >
                              Voluntary
                            </span>
                          )}
                        </td>
                        <td style={{ padding: '10px 8px', textAlign: 'right' }}>
                          <CurrencyInput
                            id={`ded-pp-${idx}`}
                            value={perPaycheck}
                            ariaLabel={`${ded.label} per paycheck`}
                            prePopulated={
                              prePopulated.fromTool1 &&
                              !isEdited(`primaryEmployment.deductions.${idx}.perPaycheck`)
                            }
                            onEdit={() =>
                              markEdited(`primaryEmployment.deductions.${idx}.perPaycheck`)
                            }
                            onChange={(v) => {
                              // Update monthly based on paychecks-per-year
                              const monthly =
                                pe.paychecksPerYear > 0
                                  ? round2((v * pe.paychecksPerYear) / 12)
                                  : 0;
                              handleIncomeChange(
                                `primaryEmployment.deductions.${idx}.monthly`,
                                monthly
                              );
                            }}
                          />
                        </td>
                        <td style={{ padding: '10px 0', textAlign: 'right' }}>
                          <CurrencyInput
                            id={`ded-m-${idx}`}
                            value={ded.monthly || 0}
                            ariaLabel={`${ded.label} monthly`}
                            prePopulated={
                              prePopulated.fromTool1 &&
                              !isEdited(`primaryEmployment.deductions.${idx}.monthly`)
                            }
                            onEdit={() =>
                              markEdited(`primaryEmployment.deductions.${idx}.monthly`)
                            }
                            onChange={(v) =>
                              handleIncomeChange(
                                `primaryEmployment.deductions.${idx}.monthly`,
                                v
                              )
                            }
                          />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot>
                  <tr>
                    <td
                      style={{
                        padding: '12px 8px 4px 0',
                        fontWeight: 600,
                        color: NAVY,
                        borderTop: `1px solid ${GOLD}`,
                      }}
                    >
                      Total Deductions (Monthly)
                    </td>
                    <td style={{ borderTop: `1px solid ${GOLD}` }} />
                    <td
                      style={{
                        padding: '12px 0 4px',
                        textAlign: 'right',
                        fontFamily: PLAYFAIR,
                        fontWeight: 700,
                        color: NAVY,
                        borderTop: `1px solid ${GOLD}`,
                      }}
                    >
                      {formatCurrency(pe.totalDeductions || 0)}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          ) : (
            <p style={{ fontFamily: SOURCE, fontSize: 13, color: NAVY, opacity: 0.65, margin: 0 }}>
              No deductions entered. Complete the{' '}
              <Link
                href="/modules/m3/pay-stub"
                style={{ color: GOLD, textDecoration: 'underline' }}
              >
                Pay Stub Decoder
              </Link>{' '}
              to auto-populate deductions, or add them here.
            </p>
          )}
        </div>

        {/* Net Monthly Income */}
        <div style={cardStyle}>
          <h3 style={subheadingStyle}>Net Monthly Income</h3>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '10px 0',
              borderBottom: '1px solid #EEF0F5',
            }}
          >
            <span style={{ fontFamily: SOURCE, fontSize: 14, color: NAVY }}>
              Net Monthly Income (after deductions)
            </span>
            <span
              style={{
                fontFamily: PLAYFAIR,
                fontSize: 18,
                fontWeight: 700,
                color: NAVY,
              }}
            >
              {formatCurrency(pe.netMonthlyIncome || 0)}
            </span>
          </div>
        </div>

        {/* Other income sources */}
        <div style={cardStyle}>
          <h3 style={subheadingStyle}>Other Income Sources</h3>
          {income.otherIncome && income.otherIncome.length > 0 ? (
            <div>
              {income.otherIncome.map((src, idx) => (
                <div
                  key={src.id || idx}
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '1.4fr 1fr',
                    gap: 12,
                    padding: '8px 0',
                    borderBottom: '1px solid #F0F2F5',
                    alignItems: 'center',
                  }}
                >
                  <div style={{ fontFamily: SOURCE, fontSize: 14, color: NAVY }}>
                    {src.source || '(Unnamed source)'}
                    {src.isTaxable !== undefined && (
                      <span
                        style={{
                          marginLeft: 8,
                          fontSize: 11,
                          color: NAVY,
                          opacity: 0.6,
                        }}
                      >
                        ({src.isTaxable ? 'Taxable' : 'Non-taxable'})
                      </span>
                    )}
                  </div>
                  <CurrencyInput
                    id={`other-inc-${idx}`}
                    value={src.monthlyAmount || 0}
                    ariaLabel={`${src.source || 'Other income'} monthly amount`}
                    prePopulated={
                      prePopulated.fromTool1 &&
                      !isEdited(`otherIncome.${idx}.monthlyAmount`)
                    }
                    onEdit={() => markEdited(`otherIncome.${idx}.monthlyAmount`)}
                    onChange={(v) =>
                      handleIncomeChange(`otherIncome.${idx}.monthlyAmount`, v)
                    }
                  />
                </div>
              ))}
            </div>
          ) : (
            <p style={{ fontFamily: SOURCE, fontSize: 13, color: NAVY, opacity: 0.65, margin: 0 }}>
              No other income sources. Part-time work, child support, rental income, and
              trust distributions would be listed here.
            </p>
          )}
        </div>

        {/* Deductions from other income (manual) */}
        <div style={cardStyle}>
          <h3 style={subheadingStyle}>Deductions from Other Income (Optional)</h3>
          <p
            style={{
              fontFamily: SOURCE,
              fontSize: 13,
              color: NAVY,
              opacity: 0.7,
              marginTop: 0,
              marginBottom: 12,
              lineHeight: 1.5,
            }}
          >
            Taxes or other deductions withheld from other income sources (e.g., estimated
            quarterly taxes on self-employment income).
          </p>
          {income.deductionsFromOtherIncome && income.deductionsFromOtherIncome.length > 0 ? (
            income.deductionsFromOtherIncome.map((ded, idx) => (
              <div
                key={idx}
                style={{
                  display: 'grid',
                  gridTemplateColumns: '1.4fr 1fr',
                  gap: 12,
                  padding: '6px 0',
                  alignItems: 'center',
                }}
              >
                <input
                  type="text"
                  value={ded.label || ''}
                  placeholder="Description"
                  onChange={(e) =>
                    setAffidavitField(
                      'income',
                      `deductionsFromOtherIncome.${idx}.label`,
                      e.target.value
                    )
                  }
                  style={inputStyle}
                />
                <CurrencyInput
                  id={`od-${idx}`}
                  value={ded.monthlyAmount || 0}
                  onChange={(v) =>
                    handleIncomeChange(
                      `deductionsFromOtherIncome.${idx}.monthlyAmount`,
                      v
                    )
                  }
                />
              </div>
            ))
          ) : null}
          <button
            type="button"
            onClick={() => {
              const next = [
                ...(income.deductionsFromOtherIncome || []),
                { label: '', monthlyAmount: 0 },
              ];
              setAffidavitField('income', 'deductionsFromOtherIncome', next);
            }}
            style={{
              marginTop: 8,
              fontFamily: SOURCE,
              fontSize: 13,
              color: GOLD,
              background: 'none',
              border: `1px solid ${GOLD}`,
              borderRadius: 6,
              padding: '6px 14px',
              cursor: 'pointer',
            }}
          >
            + Add Deduction
          </button>
        </div>

        {/* Net Monthly Income All Sources */}
        <div style={{ ...cardStyle, borderColor: GOLD, borderWidth: 2 }}>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}
          >
            <span
              style={{
                fontFamily: PLAYFAIR,
                fontWeight: 700,
                fontSize: 16,
                color: NAVY,
              }}
            >
              Net Monthly Income (All Sources)
            </span>
            <span
              style={{
                fontFamily: PLAYFAIR,
                fontSize: 26,
                fontWeight: 700,
                color: NAVY,
              }}
            >
              {formatCurrency(income.netMonthlyIncomeAllSources || 0)}
            </span>
          </div>
        </div>

        {/* Monthly income of dependent children */}
        <div style={cardStyle}>
          <label htmlFor="depChildren" style={labelStyle}>
            Monthly Income of Dependent Children
          </label>
          <div style={{ maxWidth: 260 }}>
            <CurrencyInput
              id="depChildren"
              value={income.monthlyIncomeOfDependentChildren || 0}
              onChange={(v) =>
                setAffidavitField('income', 'monthlyIncomeOfDependentChildren', v)
              }
            />
          </div>
          <p
            style={{
              fontFamily: SOURCE,
              fontSize: 12,
              color: NAVY,
              opacity: 0.65,
              marginTop: 6,
              marginBottom: 0,
              lineHeight: 1.5,
            }}
          >
            Include any income your children earn — employment, trust distributions. Most
            families enter $0 here.
          </p>
        </div>

        {/* Mark Complete */}
        <CompleteButton
          isComplete={progress.incomeComplete}
          label="Mark Income Complete"
          onClick={() => markSectionComplete('income')}
        />
      </section>
    );
  };

  // ─── Part B: Expenses ──────────────────────────────────────────────────────
  const PartB = () => {
    const showIncomeFirstNudge =
      !progress.incomeComplete && dismissedNudges.expensesNudge !== true;

    // Double-count check: health insurance both in expenses and in Part A deductions
    const healthInExpenses = (expenses.insurance?.healthDental || 0) > 0;
    const medicalDeductionInPartA = (income.primaryEmployment?.deductions || []).some(
      (d) =>
        d.perPaycheck > 0 &&
        /medical|dental|health/i.test(d.label || '')
    ) || (income.primaryEmployment?.deductions || []).some(
      (d) =>
        d.monthly > 0 &&
        /medical|dental|health/i.test(d.label || '')
    );
    const showDoubleCountWarning = healthInExpenses && medicalDeductionInPartA;

    return (
      <section aria-labelledby="part-b-heading">
        <header style={{ marginBottom: 16 }}>
          <div style={partLabelStyle}>Part B</div>
          <h2 id="part-b-heading" style={partHeadingStyle}>
            Expenses
          </h2>
          <p style={partDescStyle}>
            Nine categories tracked monthly and annually. Expand each category to enter
            line-item detail.
          </p>
        </header>

        {showIncomeFirstNudge && (
          <Callout
            text="Completing your income first helps ensure accuracy in your expense section."
            variant="gold"
            onDismiss={() => dismissNudge('expensesNudge')}
          />
        )}

        {prePopulated.fromTool2 && (
          <Callout
            text="We loaded your single-household expenses from the Budget Modeler. These are the numbers that will appear on your affidavit."
            variant="gold"
          />
        )}

        {/* Accordion list */}
        {AFFIDAVIT_EXPENSE_CATEGORIES.map((cat) => {
          const categoryObj = expenses[cat] || {};
          const fieldKeys = Object.keys(categoryObj);
          const subtotal = fieldKeys.reduce(
            (s, f) => s + (Number(categoryObj[f]) || 0),
            0
          );
          const isOpen = !!expenseExpanded[cat];
          const headerId = `acc-h-${cat}`;
          const panelId = `acc-p-${cat}`;

          return (
            <div
              key={cat}
              style={{
                backgroundColor: WHITE,
                border: '1px solid #E8EBF0',
                borderRadius: 10,
                marginBottom: 10,
                overflow: 'hidden',
              }}
            >
              <button
                type="button"
                id={headerId}
                aria-expanded={isOpen}
                aria-controls={panelId}
                onClick={() => toggleExpenseAccordion(cat)}
                style={{
                  width: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '14px 18px',
                  background: 'transparent',
                  border: 'none',
                  cursor: 'pointer',
                  textAlign: 'left',
                }}
              >
                <span
                  style={{
                    fontFamily: PLAYFAIR,
                    fontWeight: 700,
                    fontSize: 16,
                    color: NAVY,
                  }}
                >
                  {CATEGORY_LABELS[cat]}
                </span>
                <span style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                  <span
                    style={{
                      fontFamily: PLAYFAIR,
                      fontWeight: 700,
                      fontSize: 15,
                      color: NAVY,
                    }}
                  >
                    {formatCurrency(subtotal)}
                    <span
                      style={{
                        fontFamily: SOURCE,
                        fontSize: 11,
                        color: NAVY,
                        opacity: 0.55,
                        fontWeight: 400,
                        marginLeft: 4,
                      }}
                    >
                      /mo
                    </span>
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
                    }}
                  >
                    ▾
                  </span>
                </span>
              </button>

              {isOpen && (
                <div
                  id={panelId}
                  role="region"
                  aria-labelledby={headerId}
                  style={{ padding: '0 18px 18px', borderTop: '1px solid #EEF0F5' }}
                >
                  {/* Category-specific educational prompts at TOP of body */}
                  <div style={{ paddingTop: 12 }}>
                    {cat === 'home' && (expenses.home?.rentMortgage || 0) > 0 && (
                      <Callout
                        text="Are property taxes and insurance included in your mortgage payment? Many people double-count these."
                        variant="gold"
                      />
                    )}
                    {cat === 'entertainment' && (
                      <Callout
                        text="Entertainment and dining expenses often change significantly after separation. Think about what you'll realistically spend, not what feels comfortable to claim."
                        variant="gold"
                      />
                    )}
                    {cat === 'medical' && (
                      <Callout
                        text="Include therapy, counseling, and mental health costs — these are legitimate medical expenses and often increase during divorce."
                        variant="gold"
                      />
                    )}
                    {cat === 'insurance' && (expenses.insurance?.healthDental || 0) === 0 && (
                      <Callout
                        text="If you're on your spouse's plan, estimate your own post-divorce coverage cost here."
                        variant="gold"
                      />
                    )}
                    {cat === 'insurance' && showDoubleCountWarning && (
                      <Callout
                        text="Health insurance appears in both your paycheck deductions and your expense list. This may be double-counting."
                        variant="amber"
                      />
                    )}
                    {cat === 'personalMisc' && (
                      <Callout
                        text="Personal expenses like clothing, haircuts, and gym memberships are easy to underestimate. Review your bank and credit card statements for the last 3 months."
                        variant="gold"
                      />
                    )}
                    {cat === 'otherPayments' && (
                      <>
                        <Callout
                          text="Don't include your mortgage or car payment here — those are already counted in Home and Transportation. This is for credit cards, student loans, and personal loans only."
                          variant="gold"
                        />
                        <Callout
                          text="If you're currently paying temporary spousal or child support, enter it here. This is your current obligation, not what you're requesting."
                          variant="gold"
                        />
                      </>
                    )}
                    {cat === 'children' && (
                      <Callout
                        text="Record only your share of children's expenses, not the total. If your spouse is also listing children's expenses, coordinate to avoid double-counting."
                        variant="gold"
                      />
                    )}
                  </div>

                  {/* Column headers */}
                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: '1.4fr 1fr 1fr',
                      gap: 12,
                      alignItems: 'center',
                      padding: '12px 0 8px',
                      borderBottom: '1px solid #EEF0F5',
                      marginBottom: 8,
                    }}
                  >
                    <div style={columnHeaderStyle}>Line Item</div>
                    <div style={{ ...columnHeaderStyle, textAlign: 'right' }}>
                      Monthly
                    </div>
                    <div style={{ ...columnHeaderStyle, textAlign: 'right' }}>
                      Annual
                    </div>
                  </div>

                  {fieldKeys.map((field) => {
                    const monthly = Number(categoryObj[field]) || 0;
                    const annual = round2(monthly * 12);
                    const rowId = `exp-${cat}-${field}`;
                    const path = `${cat}.${field}`;
                    return (
                      <div
                        key={field}
                        style={{
                          display: 'grid',
                          gridTemplateColumns: '1.4fr 1fr 1fr',
                          gap: 12,
                          alignItems: 'center',
                          padding: '6px 0',
                        }}
                      >
                        <label
                          htmlFor={`${rowId}-m`}
                          style={{ fontFamily: SOURCE, fontSize: 13, color: NAVY }}
                        >
                          {LINE_ITEM_LABELS[field] || field}
                        </label>
                        <CurrencyInput
                          id={`${rowId}-m`}
                          value={monthly}
                          ariaLabel={`${CATEGORY_LABELS[cat]} ${LINE_ITEM_LABELS[field] || field} monthly`}
                          prePopulated={
                            prePopulated.fromTool2 && !isEdited(`expenses.${path}`)
                          }
                          onEdit={() => markEdited(`expenses.${path}`)}
                          onChange={(v) => handleExpenseChange(cat, field, v)}
                        />
                        <div
                          aria-label={`${LINE_ITEM_LABELS[field] || field} annual`}
                          style={{
                            fontFamily: SOURCE,
                            fontSize: 13,
                            color: NAVY,
                            opacity: 0.7,
                            textAlign: 'right',
                            paddingRight: 8,
                          }}
                        >
                          {formatCurrency(annual)}
                        </div>
                      </div>
                    );
                  })}

                  {/* Category subtotal */}
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      marginTop: 10,
                      paddingTop: 10,
                      borderTop: `1px solid ${GOLD}`,
                    }}
                  >
                    <span
                      style={{
                        fontFamily: SOURCE,
                        fontSize: 13,
                        fontWeight: 600,
                        color: NAVY,
                      }}
                    >
                      {CATEGORY_LABELS[cat]} Subtotal
                    </span>
                    <span
                      style={{
                        fontFamily: PLAYFAIR,
                        fontSize: 16,
                        fontWeight: 700,
                        color: NAVY,
                      }}
                    >
                      {formatCurrency(subtotal)}
                      <span
                        style={{
                          fontFamily: SOURCE,
                          fontSize: 11,
                          opacity: 0.6,
                          fontWeight: 400,
                          marginLeft: 4,
                        }}
                      >
                        /mo
                      </span>
                    </span>
                  </div>
                </div>
              )}
            </div>
          );
        })}

        {/* Totals */}
        <div
          style={{
            ...cardStyle,
            borderColor: GOLD,
            borderWidth: 2,
          }}
        >
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '6px 0',
              borderBottom: '1px solid #EEF0F5',
            }}
          >
            <span style={{ fontFamily: SOURCE, fontSize: 14, color: NAVY }}>
              Total Monthly Expenses (excluding children)
            </span>
            <span
              style={{
                fontFamily: PLAYFAIR,
                fontSize: 18,
                fontWeight: 700,
                color: NAVY,
              }}
            >
              {formatCurrency(expenses.totalMonthlyExpensesExcludingChildren || 0)}
            </span>
          </div>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '10px 0 4px',
            }}
          >
            <span
              style={{
                fontFamily: PLAYFAIR,
                fontSize: 16,
                fontWeight: 700,
                color: NAVY,
              }}
            >
              Total Monthly Expenses
            </span>
            <span
              style={{
                fontFamily: PLAYFAIR,
                fontSize: 26,
                fontWeight: 700,
                color: NAVY,
              }}
            >
              {formatCurrency(expenses.totalMonthlyExpenses || 0)}
            </span>
          </div>
        </div>

        <CompleteButton
          isComplete={progress.expensesComplete}
          label="Mark Expenses Complete"
          onClick={() => markSectionComplete('expenses')}
        />
      </section>
    );
  };

  // ─── Part C: Assets ────────────────────────────────────────────────────────
  const PartC = () => {
    const showM2Nudge =
      !prePopulated.fromM2 && dismissedNudges.assetsNudge !== true;

    const rows = [
      { field: 'realProperty',       label: 'Real Property' },
      { field: 'cashAccounts',       label: 'Cash Accounts' },
      { field: 'investments',        label: 'Investments' },
      { field: 'retirementAccounts', label: 'Retirement Accounts' },
      { field: 'otherAssets',        label: 'Other Assets' },
      { field: 'personalProperty',   label: 'Personal Property' },
    ];

    return (
      <section aria-labelledby="part-c-heading">
        <header style={{ marginBottom: 16 }}>
          <div style={partLabelStyle}>Part C</div>
          <h2 id="part-c-heading" style={partHeadingStyle}>
            Assets (Summary View)
          </h2>
          <p style={partDescStyle}>
            Summary totals by category. The detailed inventory lives in Module 2&apos;s
            Marital Estate Inventory.
          </p>
        </header>

        {showM2Nudge && (
          <Callout
            text="The detailed asset inventory lives in Module 2 — Marital Estate Inventory. Completing it first will pre-populate these totals. You can also enter summary numbers directly."
            variant="gold"
            onDismiss={() => dismissNudge('assetsNudge')}
          />
        )}

        {prePopulated.fromM2 && (
          <Callout
            text="We loaded your asset and liability data from the Marital Estate Inventory (Module 2). The detailed breakdown lives there — this is a summary view for the affidavit."
            variant="gold"
          />
        )}

        {!prePopulated.fromM2 && (
          <Callout
            text="Complete the Marital Estate Inventory in Module 2 to populate this section, or enter summary totals below."
            variant="gold"
          />
        )}

        <div style={cardStyle}>
          <table
            style={{
              width: '100%',
              borderCollapse: 'collapse',
              fontFamily: SOURCE,
              fontSize: 14,
            }}
          >
            <thead>
              <tr style={{ borderBottom: `2px solid #E8EBF0` }}>
                <th style={tableHeaderStyle}>Category</th>
                <th style={{ ...tableHeaderStyle, textAlign: 'right' }}>Value</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(({ field, label }) => {
                const val = Number(assets.summary?.[field]) || 0;
                const rowId = `asset-${field}`;
                return (
                  <tr key={field} style={{ borderBottom: '1px solid #F0F2F5' }}>
                    <td style={{ padding: '12px 8px 12px 0', color: NAVY }}>
                      <label htmlFor={rowId}>{label}</label>
                    </td>
                    <td style={{ padding: '12px 0', textAlign: 'right' }}>
                      <div style={{ display: 'inline-block', minWidth: 180 }}>
                        <CurrencyInput
                          id={rowId}
                          value={val}
                          ariaLabel={`${label} value`}
                          prePopulated={
                            prePopulated.fromM2 && !isEdited(`assets.summary.${field}`)
                          }
                          onEdit={() => markEdited(`assets.summary.${field}`)}
                          onChange={(v) =>
                            handleAssetLiabilityChange('assets', `summary.${field}`, v)
                          }
                        />
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr>
                <td
                  style={{
                    padding: '14px 8px 4px 0',
                    fontFamily: PLAYFAIR,
                    fontWeight: 700,
                    fontSize: 16,
                    color: NAVY,
                    borderTop: `2px solid ${GOLD}`,
                  }}
                >
                  Total Assets
                </td>
                <td
                  style={{
                    padding: '14px 0 4px',
                    textAlign: 'right',
                    fontFamily: PLAYFAIR,
                    fontWeight: 700,
                    fontSize: 22,
                    color: NAVY,
                    borderTop: `2px solid ${GOLD}`,
                  }}
                >
                  {formatCurrency(assets.summary?.totalAssets || 0)}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>

        <CompleteButton
          isComplete={progress.assetsComplete}
          label="Mark Assets Complete"
          onClick={() => markSectionComplete('assets')}
        />
      </section>
    );
  };

  // ─── Part D: Liabilities ───────────────────────────────────────────────────
  const PartD = () => {
    const showM2Nudge =
      !prePopulated.fromM2 && dismissedNudges.liabilitiesNudge !== true;

    const rows = [
      { field: 'loans',       label: 'Loans' },
      { field: 'creditCards', label: 'Credit Cards' },
      { field: 'otherDebt',   label: 'Other Debt' },
    ];

    const { noLiabilitiesConfirmed } = liabilities;

    return (
      <section aria-labelledby="part-d-heading">
        <header style={{ marginBottom: 16 }}>
          <div style={partLabelStyle}>Part D</div>
          <h2 id="part-d-heading" style={partHeadingStyle}>
            Liabilities (Summary View)
          </h2>
          <p style={partDescStyle}>
            Summary totals by category. The detailed liability inventory lives in Module
            2.
          </p>
        </header>

        {showM2Nudge && (
          <Callout
            text="Your detailed liability inventory lives in Module 2 — Marital Estate Inventory. Module 2&apos;s Documentation Checklist can help you track down debts you may have missed."
            variant="gold"
            onDismiss={() => dismissNudge('liabilitiesNudge')}
          />
        )}

        {prePopulated.fromM2 && (
          <Callout
            text="We loaded your asset and liability data from the Marital Estate Inventory (Module 2). The detailed breakdown lives there — this is a summary view for the affidavit."
            variant="gold"
          />
        )}

        {noLiabilitiesConfirmed ? (
          <div
            style={{
              ...cardStyle,
              backgroundColor: '#F2F9F5',
              borderColor: GREEN,
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 14,
                flexWrap: 'wrap',
              }}
            >
              <span
                style={{
                  fontFamily: SOURCE,
                  fontSize: 14,
                  fontWeight: 600,
                  color: NAVY,
                }}
              >
                ✓ No liabilities confirmed
              </span>
              <button
                type="button"
                onClick={() =>
                  setAffidavitField('liabilities', 'noLiabilitiesConfirmed', false)
                }
                style={{
                  background: 'none',
                  border: 'none',
                  color: GOLD,
                  textDecoration: 'underline',
                  cursor: 'pointer',
                  fontFamily: SOURCE,
                  fontSize: 13,
                  padding: 0,
                }}
              >
                Change this
              </button>
            </div>
          </div>
        ) : (
          <>
            <div style={cardStyle}>
              <table
                style={{
                  width: '100%',
                  borderCollapse: 'collapse',
                  fontFamily: SOURCE,
                  fontSize: 14,
                }}
              >
                <thead>
                  <tr style={{ borderBottom: `2px solid #E8EBF0` }}>
                    <th style={tableHeaderStyle}>Category</th>
                    <th style={{ ...tableHeaderStyle, textAlign: 'right' }}>Balance</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map(({ field, label }) => {
                    const val = Number(liabilities.summary?.[field]) || 0;
                    const rowId = `lia-${field}`;
                    return (
                      <tr key={field} style={{ borderBottom: '1px solid #F0F2F5' }}>
                        <td style={{ padding: '12px 8px 12px 0', color: NAVY }}>
                          <label htmlFor={rowId}>{label}</label>
                        </td>
                        <td style={{ padding: '12px 0', textAlign: 'right' }}>
                          <div style={{ display: 'inline-block', minWidth: 180 }}>
                            <CurrencyInput
                              id={rowId}
                              value={val}
                              ariaLabel={`${label} balance`}
                              prePopulated={
                                prePopulated.fromM2 &&
                                !isEdited(`liabilities.summary.${field}`)
                              }
                              onEdit={() => markEdited(`liabilities.summary.${field}`)}
                              onChange={(v) =>
                                handleAssetLiabilityChange(
                                  'liabilities',
                                  `summary.${field}`,
                                  v
                                )
                              }
                            />
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot>
                  <tr>
                    <td
                      style={{
                        padding: '14px 8px 4px 0',
                        fontFamily: PLAYFAIR,
                        fontWeight: 700,
                        fontSize: 16,
                        color: NAVY,
                        borderTop: `2px solid ${GOLD}`,
                      }}
                    >
                      Total Liabilities
                    </td>
                    <td
                      style={{
                        padding: '14px 0 4px',
                        textAlign: 'right',
                        fontFamily: PLAYFAIR,
                        fontWeight: 700,
                        fontSize: 22,
                        color: NAVY,
                        borderTop: `2px solid ${GOLD}`,
                      }}
                    >
                      {formatCurrency(liabilities.summary?.totalLiabilities || 0)}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
            <div style={{ marginBottom: 16 }}>
              <button
                type="button"
                onClick={() =>
                  setAffidavitField('liabilities', 'noLiabilitiesConfirmed', true)
                }
                style={{
                  fontFamily: SOURCE,
                  fontSize: 13,
                  color: NAVY,
                  background: 'transparent',
                  border: `1px solid #C8D0DC`,
                  borderRadius: 6,
                  padding: '8px 16px',
                  cursor: 'pointer',
                }}
              >
                I have no liabilities
              </button>
            </div>
          </>
        )}

        <CompleteButton
          isComplete={progress.liabilitiesComplete}
          label="Mark Liabilities Complete"
          onClick={() => markSectionComplete('liabilities')}
        />
      </section>
    );
  };

  // ─── Summary ───────────────────────────────────────────────────────────────
  const SummaryPart = () => {
    const totalAssets = assets.summary?.totalAssets || 0;
    const totalLiabilities = liabilities.summary?.totalLiabilities || 0;
    const netWorth = totalAssets - totalLiabilities;
    const showNetWorth =
      progress.assetsComplete ||
      progress.liabilitiesComplete ||
      totalAssets > 0 ||
      totalLiabilities > 0;

    // Completeness flags for each section
    const hasIncomeData =
      (income.primaryEmployment?.grossPayPerCheck || 0) > 0 ||
      (income.primaryEmployment?.grossMonthlyIncome || 0) > 0 ||
      (income.primaryEmployment?.deductions || []).length > 0 ||
      (income.otherIncome || []).length > 0 ||
      prePopulated.fromTool1;
    const hasExpenseData = (expenses.totalMonthlyExpenses || 0) > 0 || prePopulated.fromTool2;
    const hasAssetData = totalAssets > 0 || prePopulated.fromM2;
    const hasLiabilityData =
      totalLiabilities > 0 || liabilities.noLiabilitiesConfirmed || prePopulated.fromM2;

    const checklistIcon = (complete, hasData) => {
      if (complete) return { icon: '✅', color: GREEN };
      if (hasData) return { icon: '⚠️', color: AMBER };
      return { icon: '❌', color: RED };
    };

    const items = [
      {
        id: 'A',
        title: 'Part A: Income',
        complete: progress.incomeComplete,
        hasData: hasIncomeData,
        subtitle: progress.incomeComplete
          ? 'Complete'
          : hasIncomeData
          ? prePopulated.fromTool1
            ? 'Loaded from Pay Stub Decoder'
            : 'In progress'
          : 'Not started',
      },
      {
        id: 'B',
        title: 'Part B: Expenses',
        complete: progress.expensesComplete,
        hasData: hasExpenseData,
        subtitle: progress.expensesComplete
          ? 'Complete'
          : hasExpenseData
          ? prePopulated.fromTool2
            ? 'Loaded from Budget Modeler'
            : 'In progress'
          : 'Not started',
      },
      {
        id: 'C',
        title: 'Part C: Assets',
        complete: progress.assetsComplete,
        hasData: hasAssetData,
        subtitle: progress.assetsComplete
          ? 'Complete'
          : hasAssetData
          ? prePopulated.fromM2
            ? 'Loaded from M2 (summary only)'
            : 'In progress'
          : 'Not started',
      },
      {
        id: 'D',
        title: 'Part D: Liabilities',
        complete: progress.liabilitiesComplete,
        hasData: hasLiabilityData,
        subtitle: progress.liabilitiesComplete
          ? 'Complete'
          : liabilities.noLiabilitiesConfirmed
          ? 'No liabilities confirmed'
          : hasLiabilityData
          ? 'In progress'
          : 'Not started',
      },
    ];

    const missingMessages = [
      {
        when: !progress.incomeComplete,
        text: 'Part A is empty or incomplete. Your affidavit will need income information — pay frequency, gross pay, deductions, and any other sources of income.',
      },
      {
        when: !progress.expensesComplete,
        text: 'Part B is empty or incomplete. Expense details are required across home, food, insurance, transportation, children, and other categories — the court uses these to evaluate support and budget.',
      },
      {
        when: !progress.assetsComplete,
        text: 'Part C is empty or incomplete. Asset values need to be documented: real property, cash accounts, investments, retirement, other assets, and personal property.',
      },
      {
        when: !progress.liabilitiesComplete && !liabilities.noLiabilitiesConfirmed,
        text: "Part D is empty. If you have any debts — credit cards, student loans, car loans, personal loans — they need to be disclosed. Module 2's Documentation Checklist can help you track these down.",
      },
    ];

    return (
      <section aria-labelledby="summary-heading">
        <header style={{ marginBottom: 16 }}>
          <div style={partLabelStyle}>Summary</div>
          <h2 id="summary-heading" style={partHeadingStyle}>
            Financial Affidavit Summary
          </h2>
          <p style={partDescStyle}>
            A snapshot of the data you&apos;ve organized so far.
          </p>
        </header>

        {/* Net Worth */}
        {showNetWorth && (
          <div style={cardStyle}>
            <h3 style={subheadingStyle}>Net Worth Summary</h3>
            <div style={{ maxWidth: 460 }}>
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  padding: '6px 0',
                }}
              >
                <span style={{ fontFamily: SOURCE, fontSize: 14, color: NAVY }}>
                  Total Assets
                </span>
                <span
                  style={{
                    fontFamily: PLAYFAIR,
                    fontSize: 16,
                    fontWeight: 600,
                    color: NAVY,
                  }}
                >
                  {formatCurrency(totalAssets)}
                </span>
              </div>
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  padding: '6px 0',
                }}
              >
                <span style={{ fontFamily: SOURCE, fontSize: 14, color: NAVY }}>
                  Total Liabilities
                </span>
                <span
                  style={{
                    fontFamily: PLAYFAIR,
                    fontSize: 16,
                    fontWeight: 600,
                    color: RED,
                  }}
                >
                  ({formatCurrency(totalLiabilities)})
                </span>
              </div>
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  padding: '12px 0 2px',
                  borderTop: `2px solid ${GOLD}`,
                  marginTop: 6,
                }}
              >
                <span
                  style={{
                    fontFamily: PLAYFAIR,
                    fontSize: 16,
                    fontWeight: 700,
                    color: NAVY,
                  }}
                >
                  Net Worth
                </span>
                <span
                  style={{
                    fontFamily: PLAYFAIR,
                    fontSize: 22,
                    fontWeight: 700,
                    color: netWorth < 0 ? RED : NAVY,
                  }}
                >
                  {formatCurrency(netWorth)}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Completeness Checklist */}
        <div style={cardStyle}>
          <h3 style={subheadingStyle}>Completeness Checklist</h3>
          <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
            {items.map((it) => {
              const { icon, color } = checklistIcon(it.complete, it.hasData);
              return (
                <li
                  key={it.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 12,
                    padding: '10px 0',
                    borderBottom: '1px solid #F0F2F5',
                  }}
                >
                  <span aria-hidden="true" style={{ fontSize: 18 }}>
                    {icon}
                  </span>
                  <div style={{ flex: 1 }}>
                    <div
                      style={{
                        fontFamily: SOURCE,
                        fontSize: 14,
                        color: NAVY,
                        fontWeight: 600,
                      }}
                    >
                      {it.title}
                    </div>
                    <div
                      style={{
                        fontFamily: SOURCE,
                        fontSize: 12,
                        color,
                        opacity: 0.85,
                        marginTop: 2,
                      }}
                    >
                      {it.subtitle}
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        </div>

        {/* Missing info flags */}
        {missingMessages.some((m) => m.when) && (
          <div style={{ marginBottom: 14 }}>
            {missingMessages
              .filter((m) => m.when)
              .map((m, i) => (
                <Callout key={i} text={m.text} variant="amber" />
              ))}
          </div>
        )}

        {/* Revelation message */}
        <Callout
          variant="navy"
          text="You've organized a comprehensive financial picture. In a real affidavit, this data would be sworn under oath and filed with the court — and it's frequently amended as new information surfaces. A Certified Divorce Financial Analyst® reviews these numbers for accuracy, flags errors, identifies missing items, and analyzes what the numbers mean for your settlement."
        />

        {/* Tier-dependent CTA */}
        <div
          style={{
            ...cardStyle,
            backgroundColor: NAVY,
            borderColor: NAVY,
            color: WHITE,
            textAlign: 'center',
            padding: '24px 28px',
          }}
        >
          {userTier === 'essentials' && (
            <>
              <h3
                style={{
                  fontFamily: PLAYFAIR,
                  fontWeight: 700,
                  fontSize: 20,
                  color: PARCHMENT,
                  margin: '0 0 8px',
                }}
              >
                Get deeper insight into your numbers.
              </h3>
              <p
                style={{
                  fontFamily: SOURCE,
                  fontSize: 14,
                  color: PARCHMENT,
                  opacity: 0.85,
                  margin: '0 0 18px',
                  lineHeight: 1.55,
                }}
              >
                Get AI-guided analysis of your financial data with Full Access.
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
                Unlock Full Access
              </Link>
            </>
          )}
          {userTier === 'signature' && (
            <p
              style={{
                fontFamily: SOURCE,
                fontSize: 15,
                color: PARCHMENT,
                opacity: 0.9,
                margin: 0,
                lineHeight: 1.6,
              }}
            >
              Your CDFA professional will review this data in your next session.
            </p>
          )}
        </div>

        {/* Print Preview link */}
        <div style={{ marginBottom: 20, textAlign: 'center' }}>
          <Link
            href="/modules/m3/affidavit/print"
            style={{
              display: 'inline-block',
              backgroundColor: WHITE,
              color: NAVY,
              fontFamily: SOURCE,
              fontWeight: 600,
              fontSize: 14,
              padding: '10px 24px',
              border: `1px solid ${GOLD}`,
              borderRadius: 8,
              textDecoration: 'none',
            }}
          >
            Print Preview
          </Link>
        </div>
      </section>
    );
  };

  // ─── Active content ────────────────────────────────────────────────────────
  let activeContent = null;
  if (activePart === 'income') activeContent = PartA();
  else if (activePart === 'expenses') activeContent = PartB();
  else if (activePart === 'assets') activeContent = PartC();
  else if (activePart === 'liabilities') activeContent = PartD();
  else if (activePart === 'summary') activeContent = SummaryPart();

  // ─── Render ────────────────────────────────────────────────────────────────
  return (
    <div
      style={{
        backgroundColor: PARCHMENT,
        minHeight: '100vh',
        paddingBottom: 60,
        fontFamily: SOURCE,
        color: NAVY,
      }}
    >
      <div
        style={{
          maxWidth: 1200,
          margin: '0 auto',
          padding: isDesktop ? '24px 28px 20px' : '16px 16px 20px',
        }}
      >
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

        {/* Page header */}
        <header style={{ marginBottom: 14 }}>
          <h1
            style={{
              fontFamily: PLAYFAIR,
              fontWeight: 700,
              fontSize: isDesktop ? 32 : 26,
              color: NAVY,
              margin: 0,
              lineHeight: 1.15,
            }}
          >
            Financial Affidavit Builder
          </h1>
          <p
            style={{
              fontFamily: SOURCE,
              fontSize: 15,
              color: NAVY,
              opacity: 0.78,
              margin: '8px 0 0',
              maxWidth: 780,
              lineHeight: 1.55,
            }}
          >
            Understand what goes into a financial affidavit, surface missing information,
            and prepare organized data for your attorney.
          </p>
        </header>

        {/* Persistent banner */}
        {persistentBanner}

        {/* Main layout */}
        {isDesktop ? (
          <div style={{ display: 'flex', gap: 28, alignItems: 'flex-start' }}>
            {Stepper()}
            <div style={{ flex: 1, minWidth: 0 }}>{activeContent}</div>
          </div>
        ) : (
          <>
            {Stepper()}
            <div>{activeContent}</div>
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
              lineHeight: 1.65,
              maxWidth: 840,
              borderTop: `1px solid #E8EBF0`,
              paddingTop: 16,
              margin: 0,
            }}
          >
            This tool is for educational and planning purposes only. A Financial Affidavit
            is a sworn legal document that must be prepared and filed by your attorney.
            The data you organize here can help make that process more efficient and
            accurate. ClearPath does not provide legal advice. For guidance specific to
            your situation, consult an attorney and/or a Certified Divorce Financial
            Analyst®.
          </p>
        </footer>
      </div>
    </div>
  );
}

// ─── Complete Button subcomponent ────────────────────────────────────────────
function CompleteButton({ isComplete, label, onClick }) {
  if (isComplete) {
    return (
      <div
        style={{
          backgroundColor: '#F2F9F5',
          border: `1px solid ${GREEN}`,
          borderRadius: 10,
          padding: '14px 18px',
          marginTop: 14,
          marginBottom: 20,
          display: 'flex',
          alignItems: 'center',
          gap: 10,
        }}
      >
        <span
          aria-hidden="true"
          style={{
            width: 24,
            height: 24,
            borderRadius: '50%',
            backgroundColor: GREEN,
            color: WHITE,
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontWeight: 700,
            fontSize: 13,
          }}
        >
          ✓
        </span>
        <span style={{ fontFamily: SOURCE, fontSize: 14, fontWeight: 600, color: NAVY }}>
          Section complete
        </span>
      </div>
    );
  }
  return (
    <div style={{ marginTop: 14, marginBottom: 20 }}>
      <button
        type="button"
        onClick={onClick}
        style={{
          width: '100%',
          padding: '14px 20px',
          backgroundColor: NAVY,
          color: WHITE,
          fontFamily: PLAYFAIR,
          fontWeight: 700,
          fontSize: 16,
          border: 'none',
          borderRadius: 10,
          cursor: 'pointer',
        }}
      >
        {label}
      </button>
    </div>
  );
}

// ─── Shared styles ───────────────────────────────────────────────────────────
const cardStyle = {
  backgroundColor: WHITE,
  border: '1px solid #E8EBF0',
  borderRadius: 10,
  padding: '18px 20px',
  marginBottom: 14,
};

const labelStyle = {
  display: 'block',
  fontFamily: SOURCE,
  fontSize: 13,
  fontWeight: 600,
  color: NAVY,
  marginBottom: 4,
};

const inputStyle = {
  width: '100%',
  padding: '9px 12px',
  fontFamily: SOURCE,
  fontSize: 14,
  color: NAVY,
  border: `1px solid #C8D0DC`,
  borderRadius: 6,
  backgroundColor: WHITE,
  boxSizing: 'border-box',
};

const subheadingStyle = {
  fontFamily: PLAYFAIR,
  fontWeight: 700,
  fontSize: 16,
  color: NAVY,
  margin: '0 0 12px',
};

const tableHeaderStyle = {
  textAlign: 'left',
  padding: '8px 8px 8px 0',
  color: NAVY,
  fontWeight: 600,
  fontFamily: SOURCE,
  fontSize: 13,
};

const columnHeaderStyle = {
  fontFamily: SOURCE,
  fontSize: 11,
  color: NAVY,
  opacity: 0.6,
  textTransform: 'uppercase',
  letterSpacing: 0.4,
};

const partLabelStyle = {
  fontFamily: SOURCE,
  fontSize: 12,
  fontWeight: 600,
  color: GOLD,
  letterSpacing: 1,
  textTransform: 'uppercase',
  marginBottom: 4,
};

const partHeadingStyle = {
  fontFamily: PLAYFAIR,
  fontWeight: 700,
  fontSize: 26,
  color: NAVY,
  margin: 0,
};

const partDescStyle = {
  fontFamily: SOURCE,
  fontSize: 14,
  color: NAVY,
  opacity: 0.75,
  marginTop: 6,
  marginBottom: 0,
  lineHeight: 1.55,
};
