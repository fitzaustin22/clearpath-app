'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useM1Store } from '@/src/stores/m1Store';
import {
  PieChart,
  Pie,
  Cell,
  Legend,
  ResponsiveContainer,
} from 'recharts';

// ─── Brand tokens ──────────────────────────────────────────────
const NAVY = '#1B2A4A';
const GOLD = '#C8A96E';
const PARCHMENT = '#FAF8F2';
const WHITE = '#FFFFFF';
const GREEN = '#2D8A4E';
const RED = '#C0392B';

// ─── Pie chart palette (spec order) ───────────────────────────
const PIE_COLORS = [
  '#1B2A4A', '#C8A96E', '#4A6FA5', '#8B6F47',
  '#6B8E9B', '#A67C52', '#5C7A6E', '#9B7D6A',
];

// ─── Pay frequency definitions ─────────────────────────────────
const PAY_FREQUENCIES = [
  { value: 'weekly', label: 'Weekly', fieldLabel: 'Gross weekly household income' },
  { value: 'biweekly', label: 'Biweekly', fieldLabel: 'Gross biweekly household income' },
  { value: 'semimonthly', label: 'Semi-monthly', fieldLabel: 'Gross semi-monthly household income' },
  { value: 'monthly', label: 'Monthly', fieldLabel: 'Gross monthly household income' },
];

const FREQ_TOOLTIP =
  'Biweekly means you\u2019re paid every two weeks (26 paychecks per year). Semi-monthly means you\u2019re paid twice a month on set dates (24 paychecks per year). This matters because biweekly pay results in slightly higher monthly income than semi-monthly.';

// ─── Expense field definitions ─────────────────────────────────
const EXPENSE_FIELDS = [
  { key: 'housing', label: 'Housing (rent or mortgage)', required: true, helper: 'What you\u2019d pay for housing on your own \u2014 whether that\u2019s your current mortgage, a new rental, or an estimate.' },
  { key: 'utilities', label: 'Utilities (electric, gas, water, internet, phone)', required: false },
  { key: 'groceries', label: 'Groceries and household supplies', required: false },
  { key: 'transportation', label: 'Transportation (car payment, gas, insurance, maintenance)', required: false },
  { key: 'healthInsurance', label: 'Health insurance', required: false, helper: 'If you\u2019re currently on your spouse\u2019s plan, estimate what individual coverage would cost. $400\u2013$700/month is typical for individual marketplace coverage.' },
  { key: 'childcare', label: 'Childcare and children\u2019s expenses', required: false, helper: 'Include daycare, school costs, extracurriculars, clothing, and medical copays for children.' },
  { key: 'debtPayments', label: 'Debt payments (credit cards, student loans, personal loans)', required: false, helper: 'Monthly minimum payments on all debts you\u2019d be responsible for.' },
  { key: 'personal', label: 'Personal (clothing, subscriptions, dining out, everything else)', required: false },
];

// ─── Shared styles ─────────────────────────────────────────────
const srOnly = {
  position: 'absolute', width: '1px', height: '1px', padding: 0,
  margin: '-1px', overflow: 'hidden', clip: 'rect(0,0,0,0)',
  whiteSpace: 'nowrap', borderWidth: 0,
};
const labelStyle = {
  display: 'block', fontFamily: '"Source Sans Pro", sans-serif',
  fontSize: 14, color: `${NAVY}CC`, marginBottom: 4, fontWeight: 600,
};
const helperStyle = {
  fontFamily: '"Source Sans Pro", sans-serif', fontSize: 13,
  color: `${NAVY}99`, margin: '4px 0 0', lineHeight: 1.5,
};
const errorStyle = {
  fontFamily: '"Source Sans Pro", sans-serif', fontSize: 13,
  color: RED, margin: '4px 0 0',
};
const inputWrap = {
  display: 'flex', alignItems: 'center', gap: 6,
};
const dollarPrefix = {
  fontFamily: '"Source Sans Pro", sans-serif', fontSize: 16,
  color: `${NAVY}88`, lineHeight: '42px', userSelect: 'none',
};
const baseInput = {
  width: '100%', padding: '10px 12px', fontFamily: '"Source Sans Pro", sans-serif',
  fontSize: 16, color: NAVY, backgroundColor: WHITE, border: `1px solid ${NAVY}1A`,
  borderRadius: 4, outline: 'none', transition: 'border-color 0.15s',
};

// ─── Helpers ───────────────────────────────────────────────────

function convertToMonthly(gross, freq) {
  if (!gross || gross <= 0) return 0;
  switch (freq) {
    case 'weekly': return (gross * 52) / 12;
    case 'biweekly': return (gross * 26) / 12;
    case 'semimonthly': return gross * 2;
    default: return gross;
  }
}

function fmt(n) {
  if (n == null || isNaN(n)) return '$0';
  return '$' + Math.round(n).toLocaleString('en-US');
}

function fmtDisplay(n) {
  if (n == null || n === '' || isNaN(n)) return '';
  return Math.round(Number(n)).toLocaleString('en-US');
}

function parseCurrencyInput(str) {
  if (!str) return '';
  const cleaned = str.replace(/[^0-9.]/g, '');
  // Allow at most one decimal point
  const parts = cleaned.split('.');
  if (parts.length > 2) return parts[0] + '.' + parts.slice(1).join('');
  return cleaned;
}

function getVerdict(gapPercent) {
  if (gapPercent === null) return 'There\u2019s a gap. That\u2019s not a dead end \u2014 it\u2019s a starting point. Most women in your situation find income sources and expense adjustments they hadn\u2019t considered.';
  if (gapPercent > 20) return 'You have breathing room. The next step is understanding what you own and owe.';
  if (gapPercent >= 0) return 'It\u2019s tight, but workable. Where you live and how you structure expenses will shape this number \u2014 and Module 2 helps you see the full picture.';
  return 'There\u2019s a gap. That\u2019s not a dead end \u2014 it\u2019s a starting point. Most women in your situation find income sources and expense adjustments they hadn\u2019t considered.';
}

function getM2CTA(gapPercent) {
  if (gapPercent === null) return 'A gap doesn\u2019t mean you\u2019re stuck. Module 2 shows you every asset and debt in the picture \u2014 and that\u2019s where most women find options they didn\u2019t know they had.';
  if (gapPercent > 20) return 'You have room to plan. Module 2 helps you understand what you own and owe \u2014 so your decisions are grounded in the full picture.';
  if (gapPercent >= 0) return 'The margin is there. Module 2 maps your complete financial picture \u2014 assets, debts, and everything in between \u2014 so your next decisions are grounded.';
  return 'A gap doesn\u2019t mean you\u2019re stuck. Module 2 shows you every asset and debt in the picture \u2014 and that\u2019s where most women find options they didn\u2019t know they had.';
}

function getGapColor(gap, isBreakeven) {
  if (isBreakeven) return NAVY;
  return gap >= 0 ? GREEN : RED;
}

function isValidEmail(email) {
  const atIdx = email.indexOf('@');
  if (atIdx < 1) return false;
  const afterAt = email.slice(atIdx + 1);
  return afterAt.indexOf('.') > 0 && afterAt.indexOf('.') < afterAt.length - 1;
}

// ─── Disclaimer text ───────────────────────────────────────────
const DISCLAIMER = 'This calculator is for educational and planning purposes only. It provides a simplified estimate based on the numbers you enter. It does not account for taxes, spousal support, child support, or other factors that affect post-divorce income. For guidance specific to your situation, consult a Certified Divorce Financial Analyst\u00AE or attorney.';

// ════════════════════════════════════════════════════════════════
// Currency Input sub-component
// ════════════════════════════════════════════════════════════════

function CurrencyField({ id, label: labelText, value, onChange, onFieldBlur, helper, error, required }) {
  const [display, setDisplay] = useState(() => (value ? fmtDisplay(value) : ''));
  const prevValueRef = useRef(value);

  // Sync display when store value changes externally (e.g., hydration)
  useEffect(() => {
    if (value !== prevValueRef.current) {
      prevValueRef.current = value;
      if (document.activeElement?.id !== id) {
        setDisplay(value ? fmtDisplay(value) : '');
      }
    }
  }, [value, id]);

  const handleChange = (e) => {
    const raw = parseCurrencyInput(e.target.value);
    setDisplay(raw);
    if (raw === '') {
      onChange(0);
    } else {
      const num = parseFloat(raw);
      onChange(isNaN(num) ? 0 : num);
    }
  };

  const handleBlur = () => {
    if (value !== '' && value != null && !isNaN(value)) {
      setDisplay(fmtDisplay(value));
    }
    onFieldBlur?.();
  };

  const handleFocus = () => {
    if (value === 0) {
      setDisplay('');
    } else if (value != null && value !== '' && !isNaN(value)) {
      setDisplay(String(value));
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === '-' || e.key === 'e' || e.key === 'E') e.preventDefault();
  };

  return (
    <div style={{ marginBottom: 16 }}>
      <label htmlFor={id} style={labelStyle}>
        {labelText}{required ? ' *' : ''}
      </label>
      <div style={inputWrap}>
        <span style={dollarPrefix} aria-hidden="true">$</span>
        <input
          id={id}
          type="text"
          inputMode="decimal"
          value={display}
          onChange={handleChange}
          onBlur={handleBlur}
          onFocus={handleFocus}
          onKeyDown={handleKeyDown}
          style={{
            ...baseInput,
            ...(error ? { borderColor: RED } : {}),
          }}
          aria-required={required || undefined}
          aria-invalid={error ? 'true' : undefined}
          aria-describedby={helper ? `${id}-helper` : undefined}
        />
      </div>
      {helper && <p id={`${id}-helper`} style={helperStyle}>{helper}</p>}
      {error && <p role="alert" style={errorStyle}>{error}</p>}
    </div>
  );
}

// ════════════════════════════════════════════════════════════════
// Horizontal Gap Bar Chart (custom SVG)
// ════════════════════════════════════════════════════════════════

function GapBarChart({ income, expenses }) {
  const containerRef = useRef(null);
  const [width, setWidth] = useState(400);

  useEffect(() => {
    if (!containerRef.current) return;
    const ro = new ResizeObserver((entries) => {
      setWidth(entries[0].contentRect.width);
    });
    ro.observe(containerRef.current);
    return () => ro.disconnect();
  }, []);

  const isZeroIncome = income === 0;
  const maxVal = Math.max(income, expenses) || 1;
  const scale = (v) => (v / maxVal) * width;
  const barH = 40;
  const gap = 16;
  const svgH = isZeroIncome ? barH : barH * 2 + gap;
  const isSurplus = income > expenses;
  const isShortfall = expenses > income;
  const overlap = Math.min(income, expenses);

  const incomeLabel = `Your estimated monthly income: ${fmt(income)}`;
  const expenseLabel = `Your estimated monthly expenses: ${fmt(expenses)}`;

  return (
    <div ref={containerRef} style={{ width: '100%', marginBottom: 24 }}>
      <svg width={width} height={svgH} role="img" aria-hidden="true"
        style={{ display: 'block', overflow: 'visible' }}
      >
        {/* Income bar (hidden when 0% share) */}
        {!isZeroIncome && (
          <g>
            {/* Gold base */}
            <rect x={0} y={0} width={scale(isSurplus ? overlap : income)} height={barH}
              rx={3} fill={GOLD}
            />
            {/* Green surplus segment */}
            {isSurplus && scale(income) > scale(overlap) && (
              <rect x={scale(overlap)} y={0}
                width={scale(income) - scale(overlap)} height={barH}
                rx={3} fill={GREEN}
              />
            )}
            {/* Label */}
            <text
              x={scale(income) > 200 ? 8 : scale(income) + 8}
              y={barH / 2}
              dominantBaseline="central"
              style={{
                fontFamily: '"Source Sans Pro", sans-serif', fontSize: 13,
                fill: scale(income) > 200 ? WHITE : NAVY,
              }}
            >
              {incomeLabel}
            </text>
          </g>
        )}

        {/* Expense bar */}
        <g transform={`translate(0,${isZeroIncome ? 0 : barH + gap})`}>
          {isZeroIncome ? (
            /* 0% share: full red bar */
            <rect x={0} y={0} width={scale(expenses)} height={barH}
              rx={3} fill={RED}
            />
          ) : (
            <>
              {/* Navy base */}
              <rect x={0} y={0}
                width={scale(isShortfall ? overlap : expenses)} height={barH}
                rx={3} fill={NAVY}
              />
              {/* Red shortfall segment */}
              {isShortfall && scale(expenses) > scale(overlap) && (
                <rect x={scale(overlap)} y={0}
                  width={scale(expenses) - scale(overlap)} height={barH}
                  rx={3} fill={RED}
                />
              )}
            </>
          )}
          {/* Label */}
          <text
            x={scale(expenses) > 200 ? 8 : scale(expenses) + 8}
            y={barH / 2}
            dominantBaseline="central"
            style={{
              fontFamily: '"Source Sans Pro", sans-serif', fontSize: 13,
              fill: scale(expenses) > 200 ? (isZeroIncome ? WHITE : PARCHMENT) : NAVY,
            }}
          >
            {expenseLabel}
          </text>
        </g>
      </svg>

      {/* Screen-reader table */}
      <div style={srOnly}>
        <table>
          <caption>Income vs. expenses comparison</caption>
          <thead><tr><th>Category</th><th>Amount</th></tr></thead>
          <tbody>
            {!isZeroIncome && <tr><td>Estimated monthly income</td><td>{fmt(income)}</td></tr>}
            <tr><td>Estimated monthly expenses</td><td>{fmt(expenses)}</td></tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════
// Expense Pie Chart
// ════════════════════════════════════════════════════════════════

function ExpensePieChart({ expenses, isMobile }) {
  const data = EXPENSE_FIELDS
    .map((f, i) => ({ name: f.label.split(' (')[0], value: expenses[f.key] || 0, color: PIE_COLORS[i] }))
    .filter((d) => d.value > 0);

  if (data.length === 0) return null;

  const total = data.reduce((s, d) => s + d.value, 0);
  const size = isMobile ? 250 : 300;

  const renderLabel = isMobile
    ? undefined
    : ({ name, value }) => `${name}: ${fmt(value)} (${((value / total) * 100).toFixed(0)}%)`;

  return (
    <div style={{ marginBottom: 32 }}>
      <ResponsiveContainer width="100%" height={isMobile ? 340 : size + 20}>
        <PieChart>
          <Pie
            data={data}
            dataKey="value"
            nameKey="name"
            cx="50%"
            cy="50%"
            outerRadius={size / 2 - 30}
            label={renderLabel}
            labelLine={!isMobile}
            style={{ fontFamily: '"Source Sans Pro", sans-serif', fontSize: 12 }}
          >
            {data.map((d, i) => (
              <Cell key={d.name} fill={d.color} />
            ))}
          </Pie>
          {isMobile && (
            <Legend
              formatter={(value, entry) => {
                const item = data.find((d) => d.name === value);
                if (!item) return value;
                return `${value}: ${fmt(item.value)} (${((item.value / total) * 100).toFixed(0)}%)`;
              }}
              wrapperStyle={{ fontFamily: '"Source Sans Pro", sans-serif', fontSize: 13, color: NAVY }}
            />
          )}
        </PieChart>
      </ResponsiveContainer>

      {/* Screen-reader table */}
      <div style={srOnly}>
        <table>
          <caption>Expense breakdown by category</caption>
          <thead><tr><th>Category</th><th>Amount</th><th>Percentage</th></tr></thead>
          <tbody>
            {data.map((d) => (
              <tr key={d.name}>
                <td>{d.name}</td>
                <td>{fmt(d.value)}</td>
                <td>{((d.value / total) * 100).toFixed(1)}%</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════
// Main Component
// ════════════════════════════════════════════════════════════════

export default function BudgetGapCalculator() {
  const {
    budgetGap,
    setBudgetGapInputs,
    completeBudgetGap,
    setEmailCaptured,
    resetBudgetGap,
    readinessAssessment,
  } = useM1Store();

  // ── Local UI state ──
  const [phase, setPhase] = useState('form'); // form | loading | results
  const [showModal, setShowModal] = useState(false);
  const [email, setEmail] = useState('');
  const [newsletter, setNewsletter] = useState(false);
  const [emailError, setEmailError] = useState('');
  const [tooltipOpen, setTooltipOpen] = useState(false);
  const [touched, setTouched] = useState({});
  const [isMobile, setIsMobile] = useState(false);
  const resultsRef = useRef(null);

  // ── Form field values from store (with defaults) ──
  const inputs = budgetGap.inputs || {};
  const grossIncome = inputs.grossIncome ?? '';
  const payFrequency = inputs.payFrequency ?? 'monthly';
  const expectedShare = inputs.expectedShare ?? 50;
  const expenses = {
    housing: inputs.housing ?? '',
    utilities: inputs.utilities ?? 0,
    groceries: inputs.groceries ?? 0,
    transportation: inputs.transportation ?? 0,
    healthInsurance: inputs.healthInsurance ?? 0,
    childcare: inputs.childcare ?? 0,
    debtPayments: inputs.debtPayments ?? 0,
    personal: inputs.personal ?? 0,
  };

  // ── Responsive check ──
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 640);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  // ── Hydrate: if already completed, jump to results ──
  useEffect(() => {
    const s = useM1Store.getState().budgetGap;
    if (s.completed && s.results) setPhase('results');
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Computed values ──
  const grossNum = typeof grossIncome === 'number' ? grossIncome : parseFloat(grossIncome) || 0;
  const monthlyGross = convertToMonthly(grossNum, payFrequency);
  const adjustedMonthlyIncome = monthlyGross * (expectedShare / 100);

  const totalExpenses = EXPENSE_FIELDS.reduce((sum, f) => {
    const v = expenses[f.key];
    return sum + (typeof v === 'number' ? v : parseFloat(v) || 0);
  }, 0);

  const monthlyGap = adjustedMonthlyIncome - totalExpenses;
  const gapPercent = adjustedMonthlyIncome === 0
    ? null
    : (monthlyGap / adjustedMonthlyIncome) * 100;

  const isBreakeven = Math.abs(monthlyGap) <= 25;

  // ── Debounced display values for live previews (150ms) ──
  const [displayIncome, setDisplayIncome] = useState(adjustedMonthlyIncome);
  const [displayExpenses, setDisplayExpenses] = useState(totalExpenses);
  useEffect(() => {
    const t = setTimeout(() => setDisplayIncome(adjustedMonthlyIncome), 150);
    return () => clearTimeout(t);
  }, [adjustedMonthlyIncome]);
  useEffect(() => {
    const t = setTimeout(() => setDisplayExpenses(totalExpenses), 150);
    return () => clearTimeout(t);
  }, [totalExpenses]);

  // ── Field updater ──
  const setField = useCallback(
    (key, val) => setBudgetGapInputs({ [key]: val }),
    [setBudgetGapInputs]
  );

  const markTouched = useCallback(
    (key) => setTouched((p) => ({ ...p, [key]: true })),
    []
  );

  // ── Validation ──
  const incomeError =
    touched.grossIncome && (grossNum <= 0)
      ? 'Enter your household\u2019s gross income to continue.'
      : '';
  const housingTouched = touched.housing;
  const housingVal = typeof expenses.housing === 'number' ? expenses.housing : parseFloat(expenses.housing);
  const housingError =
    housingTouched && (isNaN(housingVal) || expenses.housing === '')
      ? 'Enter your estimated housing cost (enter 0 if unsure).'
      : '';

  const canSubmit = grossNum > 0 && expectedShare >= 0 && !isNaN(housingVal) && expenses.housing !== '';

  // ── Frequency label & dynamic helper text ──
  const freqDef = PAY_FREQUENCIES.find((f) => f.value === payFrequency) || PAY_FREQUENCIES[3];
  const INCOME_HELPER_SUFFIX = ' Include salary, bonuses, and any other regular income.';
  const grossIncomeHelper = ({
    weekly: 'This is the total income your household brings in each week, before taxes or deductions.',
    biweekly: 'This is the total income your household brings in every two weeks, before taxes or deductions.',
    semimonthly: 'This is the total income your household brings in twice a month, before taxes or deductions.',
    monthly: 'This is the total income your household brings in each month, before taxes or deductions.',
  })[payFrequency] + INCOME_HELPER_SUFFIX;

  // ── Build the full data-pipeline results object ──
  // completedAt is set at call time (inside setTimeout) so the timestamp
  // reflects the moment results are actually displayed.
  const buildPipelineResults = useCallback(() => {
    const exp = useM1Store.getState().budgetGap.inputs || {};
    return {
      completedAt: new Date().toISOString(),
      grossMonthlyIncome: grossNum,
      expectedSharePercent: expectedShare,
      payFrequency,
      adjustedMonthlyIncome: Math.round(adjustedMonthlyIncome * 100) / 100,
      expenses: {
        housing: typeof exp.housing === 'number' ? exp.housing : parseFloat(exp.housing) || 0,
        utilities: typeof exp.utilities === 'number' ? exp.utilities : parseFloat(exp.utilities) || 0,
        groceries: typeof exp.groceries === 'number' ? exp.groceries : parseFloat(exp.groceries) || 0,
        transportation: typeof exp.transportation === 'number' ? exp.transportation : parseFloat(exp.transportation) || 0,
        healthInsurance: typeof exp.healthInsurance === 'number' ? exp.healthInsurance : parseFloat(exp.healthInsurance) || 0,
        childcare: typeof exp.childcare === 'number' ? exp.childcare : parseFloat(exp.childcare) || 0,
        debtPayments: typeof exp.debtPayments === 'number' ? exp.debtPayments : parseFloat(exp.debtPayments) || 0,
        personal: typeof exp.personal === 'number' ? exp.personal : parseFloat(exp.personal) || 0,
      },
      totalMonthlyExpenses: Math.round(totalExpenses * 100) / 100,
      monthlyGap: Math.round(monthlyGap * 100) / 100,
      gapPercent: gapPercent !== null ? Math.round(gapPercent * 100) / 100 : null,
    };
  }, [grossNum, expectedShare, payFrequency, adjustedMonthlyIncome, totalExpenses, monthlyGap, gapPercent]);

  // ── Submit form → show modal or results ──
  const handleSeeResults = useCallback(() => {
    if (!canSubmit) return;
    // Returning user: skip email gate
    if (budgetGap.emailCaptured) {
      setPhase('loading');
      setTimeout(() => {
        completeBudgetGap(buildPipelineResults());
        setPhase('results');
        setTimeout(() => resultsRef.current?.scrollIntoView({ behavior: 'smooth' }), 50);
      }, 400);
    } else {
      setShowModal(true);
    }
  }, [canSubmit, budgetGap.emailCaptured, buildPipelineResults, completeBudgetGap]);

  // ── Email submit ──
  const handleEmailSubmit = useCallback(async () => {
    if (!isValidEmail(email)) {
      setEmailError('Enter a valid email address.');
      return;
    }
    setEmailError('');

    const gapTier = gapPercent === null ? 'shortfall'
      : gapPercent > 20 ? 'comfortable'
      : gapPercent >= 0 ? 'moderate'
      : 'shortfall';

    // TODO: Replace with actual CRM API call (ConvertKit or ActiveCampaign).
    // Endpoint: POST /api/crm-lead
    // Payload:
    //   email, tags: ['M1-budget-gap-lead', ...(newsletter ? ['newsletter-opt-in'] : []),
    //   ...(expectedShare === 0 ? ['edge-case-zero-share'] : [])],
    //   customFields: { budget_gap_result: monthlyGap, budget_gap_tier: gapTier }
    //
    // On CRM failure: show results immediately (never block UX).
    // Queue failed submission to /api/crm-retry (server-side 3x exponential backoff:
    // 30s, 2min, 10min). If all retries fail, write to Supabase `crm_failures` table.
    try {
      console.info('[BudgetGap] CRM stub: would send', {
        email, gapTier, monthlyGap, newsletter, zeroShare: expectedShare === 0,
      });
    } catch {
      // Intentionally swallowed — never block results on CRM failure
    }

    setEmailCaptured();
    setShowModal(false);
    setPhase('loading');
    setTimeout(() => {
      completeBudgetGap(buildPipelineResults());
      setPhase('results');
      setTimeout(() => resultsRef.current?.scrollIntoView({ behavior: 'smooth' }), 50);
    }, 400);
  }, [email, newsletter, expectedShare, monthlyGap, gapPercent, setEmailCaptured, completeBudgetGap, buildPipelineResults]);

  // ── Recalculate ──
  const handleRecalculate = useCallback(() => {
    // Keep inputs, reset completion so she can re-run
    const currentInputs = useM1Store.getState().budgetGap.inputs;
    resetBudgetGap();
    setBudgetGapInputs(currentInputs);
    // Email is already captured, so re-submitting skips the modal
    setEmailCaptured();
    setPhase('form');
  }, [resetBudgetGap, setBudgetGapInputs, setEmailCaptured]);

  // ── Contextual header from assessment ──
  const showAssessmentHeader =
    readinessAssessment?.completed &&
    readinessAssessment?.results?.tier === 'exploring';

  // ════════════════════════════════════════════════════════════
  // RENDER: Loading spinner
  // ════════════════════════════════════════════════════════════
  if (phase === 'loading') {
    return (
      <div style={{
        display: 'flex', justifyContent: 'center', alignItems: 'center',
        minHeight: '60vh', backgroundColor: PARCHMENT,
      }}>
        <div style={{
          width: 48, height: 48, border: `4px solid ${GOLD}33`,
          borderTopColor: GOLD, borderRadius: '50%',
          animation: 'cpSpin 0.8s linear infinite',
        }} />
        <style>{`@keyframes cpSpin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  // ════════════════════════════════════════════════════════════
  // RENDER: Results screen
  // ════════════════════════════════════════════════════════════
  if (phase === 'results') {
    const r = budgetGap.results;
    if (!r) return null;

    const { monthlyGap: gap, gapPercent: gp, adjustedMonthlyIncome: inc, totalMonthlyExpenses: exp } = r;
    const brk = Math.abs(gap) <= 25;
    const color = getGapColor(gap, brk);

    let gapDisplay;
    if (brk) {
      gapDisplay = '\u2248 $0/month \u2014 right at the line';
    } else if (gap >= 0) {
      gapDisplay = `+${fmt(gap)}/month`;
    } else {
      gapDisplay = `\u2212${fmt(Math.abs(gap))}/month`;
    }

    return (
      <div ref={resultsRef} style={{ backgroundColor: PARCHMENT, minHeight: '60vh', padding: '40px 16px' }}>
        <div style={{ maxWidth: 640, margin: '0 auto' }}>

          {/* ── Gap number ── */}
          <div style={{ textAlign: 'center', marginBottom: 16 }}>
            <p style={{
              fontFamily: '"Playfair Display", serif',
              fontSize: isMobile ? 36 : 48,
              fontWeight: 700, color, margin: 0,
            }}>
              {gapDisplay}
            </p>
          </div>

          {/* ── Verdict ── */}
          <p style={{
            fontFamily: '"Source Sans Pro", sans-serif', fontSize: 18,
            color: NAVY, textAlign: 'center', lineHeight: 1.6,
            margin: '0 0 32px', maxWidth: 540, marginLeft: 'auto', marginRight: 'auto',
          }}>
            {getVerdict(gp)}
          </p>

          {/* ── Horizontal bar chart ── */}
          <GapBarChart income={inc} expenses={exp} />

          {/* ── Pie chart ── */}
          <ExpensePieChart
            expenses={budgetGap.inputs || {}}
            isMobile={isMobile}
          />

          {/* ── M2 upsell CTA ── */}
          <div style={{
            borderTop: `2px solid ${NAVY}`,
            backgroundColor: PARCHMENT,
            padding: '28px 24px',
            marginBottom: 24,
          }}>
            <h3 style={{
              fontFamily: '"Playfair Display", serif', fontSize: 22,
              color: NAVY, fontWeight: 700, margin: '0 0 8px',
            }}>
              Want to go deeper?
            </h3>
            <p style={{
              fontFamily: '"Source Sans Pro", sans-serif', fontSize: 15,
              color: NAVY, lineHeight: 1.6, margin: '0 0 20px',
            }}>
              {getM2CTA(gp)}
            </p>
            <a href="/modules/m2" style={{
              display: 'inline-block', backgroundColor: NAVY, color: PARCHMENT,
              fontFamily: '"Source Sans Pro", sans-serif', fontWeight: 600,
              fontSize: 16, padding: '14px 32px', borderRadius: 4, textDecoration: 'none',
            }}>
              Explore Module 2 &rarr;
            </a>
            <br />
            <a href="/modules/m1/readiness" style={{
              fontFamily: '"Source Sans Pro", sans-serif', fontSize: 14,
              color: NAVY, textDecoration: 'underline', opacity: 0.6,
              display: 'inline-block', marginTop: 12,
            }}>
              Or start with the Life Transition Readiness Assessment to see
              where you stand across all five financial domains.
            </a>
          </div>

          {/* ── Recalculate ── */}
          <div style={{ textAlign: 'center', marginBottom: 24 }}>
            <button onClick={handleRecalculate} style={{
              background: 'none', border: 'none',
              fontFamily: '"Source Sans Pro", sans-serif', fontSize: 14,
              color: NAVY, textDecoration: 'underline', cursor: 'pointer',
              opacity: 0.6, padding: 0,
            }}>
              Recalculate with new numbers
            </button>
          </div>

          {/* ── Disclaimer ── */}
          <p style={{
            fontFamily: '"Source Sans Pro", sans-serif', fontSize: 12,
            color: `${NAVY}99`, lineHeight: 1.6, textAlign: 'center',
            maxWidth: 560, margin: '0 auto',
          }}>
            {DISCLAIMER}
          </p>
        </div>
      </div>
    );
  }

  // ════════════════════════════════════════════════════════════
  // RENDER: Form
  // ════════════════════════════════════════════════════════════
  return (
    <div style={{ backgroundColor: PARCHMENT, minHeight: '60vh', padding: '40px 16px' }}>
      <div style={{ maxWidth: 640, margin: '0 auto' }}>

        {/* ── Contextual header from assessment ── */}
        {showAssessmentHeader && (
          <p style={{
            fontFamily: '"Playfair Display", serif', fontSize: 20,
            color: NAVY, fontWeight: 700, textAlign: 'center',
            marginBottom: 8,
          }}>
            You&rsquo;ve taken the first step. Now let&rsquo;s look at the numbers.
          </p>
        )}

        {/* ── Page title ── */}
        <h1 style={{
          fontFamily: '"Playfair Display", serif',
          fontSize: 'clamp(24px, 5vw, 32px)',
          color: NAVY, fontWeight: 700, margin: '0 0 8px', textAlign: 'center',
        }}>
          Budget Gap Calculator
        </h1>
        <p style={{
          fontFamily: '"Source Sans Pro", sans-serif', fontSize: 16,
          color: NAVY, textAlign: 'center', lineHeight: 1.6, margin: '0 0 32px',
        }}>
          Can I afford to live on my own? Enter your numbers to find out.
        </p>

        {/* ══════════════════════════════════════════════════════ */}
        {/* SECTION A — Income                                    */}
        {/* ══════════════════════════════════════════════════════ */}
        <h2 style={{
          fontFamily: '"Playfair Display", serif', fontSize: 20,
          color: NAVY, fontWeight: 700, margin: '0 0 20px',
          borderBottom: `1px solid ${NAVY}15`, paddingBottom: 8,
        }}>
          Income
        </h2>

        {/* Pay frequency */}
        <div style={{ marginBottom: 16 }}>
          <label htmlFor="payFrequency" style={labelStyle}>
            Pay frequency *
          </label>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <select
              id="payFrequency"
              value={payFrequency}
              onChange={(e) => setField('payFrequency', e.target.value)}
              style={{
                ...baseInput, width: 'auto', minWidth: 180,
                cursor: 'pointer', appearance: 'auto',
              }}
            >
              {PAY_FREQUENCIES.map((f) => (
                <option key={f.value} value={f.value}>{f.label}</option>
              ))}
            </select>
            <button
              type="button"
              aria-label="Pay frequency explanation"
              aria-expanded={tooltipOpen}
              onClick={() => setTooltipOpen((p) => !p)}
              style={{
                background: 'none', border: `1px solid ${NAVY}33`,
                borderRadius: '50%', width: 24, height: 24,
                fontFamily: '"Source Sans Pro", sans-serif', fontSize: 14,
                color: NAVY, cursor: 'pointer', display: 'flex',
                alignItems: 'center', justifyContent: 'center',
                opacity: 0.6, flexShrink: 0,
              }}
            >
              &#9432;
            </button>
          </div>
          {tooltipOpen && (
            <p style={{
              ...helperStyle, backgroundColor: `${NAVY}08`, padding: '10px 12px',
              borderRadius: 4, marginTop: 8,
            }}>
              {FREQ_TOOLTIP}
            </p>
          )}
        </div>

        {/* Gross income */}
        <CurrencyField
          id="grossIncome"
          label={freqDef.fieldLabel}
          value={grossIncome}
          onChange={(v) => setField('grossIncome', v)}
          onFieldBlur={() => markTouched('grossIncome')}
          helper={grossIncomeHelper}
          error={incomeError}
          required
        />

        {/* Expected share slider */}
        <div style={{ marginBottom: 16 }}>
          <label htmlFor="expectedShare" style={labelStyle}>
            Your expected share (%) *
          </label>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <style>{`
              #expectedShare {
                -webkit-appearance: none;
                appearance: none;
                flex: 1;
                height: 6px;
                border-radius: 3px;
                cursor: pointer;
                outline: none;
                background: linear-gradient(
                  to right,
                  ${GOLD} 0%,
                  ${GOLD} ${expectedShare}%,
                  ${NAVY}1A ${expectedShare}%,
                  ${NAVY}1A 100%
                );
              }
              #expectedShare::-webkit-slider-thumb {
                -webkit-appearance: none;
                width: 20px;
                height: 20px;
                border-radius: 50%;
                background: ${WHITE};
                border: 2px solid ${NAVY}44;
                cursor: pointer;
                box-shadow: 0 1px 3px rgba(0,0,0,0.15);
              }
              #expectedShare::-moz-range-thumb {
                width: 20px;
                height: 20px;
                border-radius: 50%;
                background: ${WHITE};
                border: 2px solid ${NAVY}44;
                cursor: pointer;
                box-shadow: 0 1px 3px rgba(0,0,0,0.15);
              }
              #expectedShare::-moz-range-track {
                height: 6px;
                border-radius: 3px;
                background: ${NAVY}1A;
              }
              #expectedShare::-moz-range-progress {
                height: 6px;
                border-radius: 3px;
                background: ${GOLD};
              }
            `}</style>
            <input
              id="expectedShare"
              type="range"
              min={0}
              max={100}
              step={1}
              value={expectedShare}
              onChange={(e) => setField('expectedShare', Number(e.target.value))}
              aria-label="Your expected share of household income"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={expectedShare}
            />
            <input
              type="number"
              min={0}
              max={100}
              value={expectedShare}
              onChange={(e) => {
                const v = Math.max(0, Math.min(100, Number(e.target.value) || 0));
                setField('expectedShare', v);
              }}
              aria-label="Expected share percentage"
              style={{
                ...baseInput, width: 64, textAlign: 'center', padding: '8px 4px',
              }}
            />
            <span style={{
              fontFamily: '"Source Sans Pro", sans-serif', fontSize: 16,
              color: NAVY, userSelect: 'none',
            }}>%</span>
          </div>
          <p style={helperStyle}>
            If you&rsquo;re not sure, 50% is a reasonable starting point. This isn&rsquo;t
            a legal determination &mdash; it&rsquo;s a planning number.
          </p>

          {/* 0% share warning */}
          {expectedShare === 0 && (
            <p role="alert" style={{
              fontFamily: '"Source Sans Pro", sans-serif', fontSize: 13,
              color: '#B8860B', margin: '8px 0 0', lineHeight: 1.5,
              padding: '8px 12px', backgroundColor: '#FFF8DC', borderRadius: 4,
              border: '1px solid #DAA52033',
            }}>
              A 0% share means no income in this estimate. If you&rsquo;re unsure of
              your share, 50% is a reasonable planning starting point.
            </p>
          )}
        </div>

        {/* Live income preview */}
        <div style={{
          fontFamily: '"Source Sans Pro", sans-serif', fontSize: 16,
          color: NAVY, fontWeight: 600, padding: '12px 16px',
          backgroundColor: `${GOLD}12`, borderRadius: 4, marginBottom: 32,
          borderLeft: `4px solid ${GOLD}`,
        }}>
          Your estimated monthly income:{' '}
          <strong>{fmt(displayIncome)}</strong>
        </div>

        {/* ══════════════════════════════════════════════════════ */}
        {/* SECTION B — Monthly Expenses                          */}
        {/* ══════════════════════════════════════════════════════ */}
        <h2 style={{
          fontFamily: '"Playfair Display", serif', fontSize: 20,
          color: NAVY, fontWeight: 700, margin: '0 0 20px',
          borderBottom: `1px solid ${NAVY}15`, paddingBottom: 8,
        }}>
          Monthly Expenses
        </h2>

        {EXPENSE_FIELDS.map((f) => (
          <CurrencyField
            key={f.key}
            id={`expense-${f.key}`}
            label={f.label}
            value={expenses[f.key]}
            onChange={(v) => setField(f.key, v)}
            onFieldBlur={f.key === 'housing' ? () => markTouched('housing') : undefined}
            helper={f.helper}
            error={f.key === 'housing' ? housingError : ''}
            required={f.required}
          />
        ))}

        {/* Live expense total */}
        <div style={{
          fontFamily: '"Source Sans Pro", sans-serif', fontSize: 16,
          color: NAVY, fontWeight: 600, padding: '12px 16px',
          backgroundColor: `${NAVY}08`, borderRadius: 4, marginBottom: 32,
          borderLeft: `4px solid ${NAVY}`,
        }}>
          Your estimated monthly expenses:{' '}
          <strong>{fmt(displayExpenses)}</strong>
        </div>

        {/* ── See my results button ── */}
        <button
          onClick={handleSeeResults}
          disabled={!canSubmit}
          style={{
            display: 'block', width: '100%', maxWidth: 400,
            margin: '0 auto 32px', padding: '16px 0',
            fontFamily: '"Source Sans Pro", sans-serif', fontWeight: 700,
            fontSize: 18, border: 'none', borderRadius: 4, cursor: canSubmit ? 'pointer' : 'default',
            backgroundColor: canSubmit ? GOLD : `${NAVY}4D`,
            color: canSubmit ? NAVY : `${PARCHMENT}AA`,
            transition: 'background-color 0.2s, opacity 0.2s',
          }}
        >
          See my results
        </button>

        {/* ── Form disclaimer ── */}
        <p style={{
          fontFamily: '"Source Sans Pro", sans-serif', fontSize: 12,
          color: `${NAVY}99`, lineHeight: 1.6, textAlign: 'center',
          maxWidth: 560, margin: '0 auto',
        }}>
          {DISCLAIMER}
        </p>
      </div>

      {/* ══════════════════════════════════════════════════════ */}
      {/* Email Gate Modal                                      */}
      {/* ══════════════════════════════════════════════════════ */}
      {showModal && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Enter your email to see results"
          style={{
            position: 'fixed', inset: 0, zIndex: 1000,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            backgroundColor: 'rgba(0,0,0,0.5)',
          }}
          onClick={(e) => { if (e.target === e.currentTarget) setShowModal(false); }}
        >
          <div style={{
            backgroundColor: WHITE, borderRadius: 8, padding: '32px 28px',
            maxWidth: 440, width: '90%', position: 'relative',
          }}>
            {/* Close button */}
            <button
              onClick={() => setShowModal(false)}
              aria-label="Close"
              style={{
                position: 'absolute', top: 12, right: 12,
                background: 'none', border: 'none', fontSize: 22,
                color: `${NAVY}66`, cursor: 'pointer', padding: '4px 8px',
              }}
            >
              &times;
            </button>

            <h3 style={{
              fontFamily: '"Playfair Display", serif', fontSize: 24,
              color: NAVY, fontWeight: 700, margin: '0 0 8px',
            }}>
              Your results are ready.
            </h3>
            <p style={{
              fontFamily: '"Source Sans Pro", sans-serif', fontSize: 16,
              color: NAVY, lineHeight: 1.5, margin: '0 0 20px',
            }}>
              Enter your email and we&rsquo;ll show your results now &mdash;
              and send you a copy you can refer back to.
            </p>

            {/* Email input */}
            <div style={{ marginBottom: 16 }}>
              <label htmlFor="emailGate" style={labelStyle}>Email address</label>
              <input
                id="emailGate"
                type="email"
                value={email}
                onChange={(e) => { setEmail(e.target.value); setEmailError(''); }}
                onKeyDown={(e) => { if (e.key === 'Enter') handleEmailSubmit(); }}
                placeholder="you@example.com"
                style={{
                  ...baseInput,
                  border: emailError ? "1px solid " + RED : baseInput.border,
                }}
                aria-invalid={emailError ? 'true' : undefined}
                aria-describedby={emailError ? 'emailGateError' : undefined}
                autoFocus
              />
              {emailError && (
                <p id="emailGateError" role="alert" style={errorStyle}>
                  {emailError}
                </p>
              )}
            </div>

            {/* Newsletter checkbox */}
            <label style={{
              display: 'flex', alignItems: 'flex-start', gap: 8,
              fontFamily: '"Source Sans Pro", sans-serif', fontSize: 14,
              color: NAVY, cursor: 'pointer', marginBottom: 20,
            }}>
              <input
                type="checkbox"
                checked={newsletter}
                onChange={(e) => setNewsletter(e.target.checked)}
                style={{ marginTop: 3, accentColor: GOLD }}
              />
              Send me ClearPath&rsquo;s free weekly financial clarity tips.
            </label>

            {/* Submit */}
            <button
              onClick={handleEmailSubmit}
              style={{
                display: 'block', width: '100%', padding: '14px 0',
                backgroundColor: NAVY, color: PARCHMENT,
                fontFamily: '"Source Sans Pro", sans-serif', fontWeight: 600,
                fontSize: 16, border: 'none', borderRadius: 4,
                cursor: 'pointer',
              }}
            >
              Show my results
            </button>

            {/* Privacy line */}
            <p style={{
              fontFamily: '"Source Sans Pro", sans-serif', fontSize: 12,
              color: `${NAVY}99`, textAlign: 'center', margin: '12px 0 0',
            }}>
              We&rsquo;ll never share your email. Unsubscribe anytime.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
