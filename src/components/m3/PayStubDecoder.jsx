'use client';

import { useState, useEffect, Fragment } from 'react';
import Link from 'next/link';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  LabelList,
  ResponsiveContainer,
} from 'recharts';
import {
  useM3Store,
  DEFAULT_DEDUCTIONS,
  PAY_FREQUENCY_DEFAULTS,
  SS_WAGE_CAP,
  SS_TAX_RATE,
  ANNUAL_401K_LIMIT,
  CATCH_UP_401K_LIMIT,
} from '@/src/stores/m3Store';
import { useM1Store } from '@/src/stores/m1Store';

// ─── Brand tokens ─────────────────────────────────────────────────────────────
const NAVY     = '#1B2A4A';
const GOLD     = '#C8A96E';
const PARCHMENT = '#FAF8F2';
const WHITE    = '#FFFFFF';
const AMBER    = '#D4A843';
const GREEN    = '#2D8A4E';
const RED      = '#C0392B';
const SOURCE   = '"Source Sans Pro", -apple-system, system-ui, sans-serif';
const PLAYFAIR = '"Playfair Display", Georgia, serif';

const CHART_SEGMENT_COLORS = {
  fedTax:       NAVY,
  stateTax:     '#4A6FA5',
  ss:           '#6B8E9B',
  medicare:     '#5C7A6E',
  medDental:    '#8B6F47',
  voluntary:    GOLD,
  takeHome:     GREEN,
};

// ─── Helpers ──────────────────────────────────────────────────────────────────
function fmtShort(n) {
  if (n == null || isNaN(n)) return '$0';
  const abs = Math.abs(Math.round(n));
  return (n < 0 ? '-$' : '$') + abs.toLocaleString('en-US');
}

function fmtFull(n) {
  if (n == null || isNaN(n)) return '$0.00';
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
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
  const [bp, setBp] = useState({ isDesktop: false, isMedium: false });
  useEffect(() => {
    const update = () => setBp({
      isDesktop: window.innerWidth >= 1024,
      isMedium: window.innerWidth >= 640,
    });
    update();
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, []);
  return bp;
}

// ─── Toggle ───────────────────────────────────────────────────────────────────
function Toggle({ id, checked, onChange, label }) {
  return (
    <label
      htmlFor={id}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 8,
        cursor: 'pointer',
        fontFamily: SOURCE,
        fontSize: 14,
        color: NAVY,
        userSelect: 'none',
      }}
    >
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        id={id}
        onClick={() => onChange(!checked)}
        style={{
          width: 40,
          height: 22,
          borderRadius: 11,
          border: 'none',
          backgroundColor: checked ? GOLD : '#B0B8C8',
          position: 'relative',
          cursor: 'pointer',
          transition: 'background-color 0.2s',
          flexShrink: 0,
          padding: 0,
        }}
      >
        <span
          style={{
            position: 'absolute',
            top: 3,
            left: checked ? 21 : 3,
            width: 16,
            height: 16,
            borderRadius: '50%',
            backgroundColor: WHITE,
            transition: 'left 0.2s',
            display: 'block',
          }}
        />
      </button>
      {label}
    </label>
  );
}

// ─── CurrencyInput ────────────────────────────────────────────────────────────
function CurrencyInput({ id, value, onChange, placeholder = '0.00', disabled = false }) {
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

// ─── Section Header ───────────────────────────────────────────────────────────
function SectionHeader({ number, title, isComplete, isOpen, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-expanded={isOpen}
      style={{
        width: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '14px 20px',
        backgroundColor: WHITE,
        border: 'none',
        borderBottom: `1px solid #E8EBF0`,
        cursor: 'pointer',
        textAlign: 'left',
        gap: 12,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <div
          style={{
            width: 30,
            height: 30,
            borderRadius: '50%',
            backgroundColor: isComplete ? GREEN : isOpen ? NAVY : '#E8EBF0',
            color: isComplete || isOpen ? WHITE : '#8A94A6',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontFamily: PLAYFAIR,
            fontWeight: 700,
            fontSize: 13,
            flexShrink: 0,
          }}
        >
          {isComplete ? '✓' : number}
        </div>
        <span
          style={{
            fontFamily: PLAYFAIR,
            fontWeight: 700,
            fontSize: 16,
            color: NAVY,
          }}
        >
          {title}
        </span>
      </div>
      <span
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
    </button>
  );
}

// ─── Callout ──────────────────────────────────────────────────────────────────
function Callout({ text, variant = 'gold' }) {
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
      }}
    >
      <p style={{ fontFamily: SOURCE, fontSize: 13, color: NAVY, margin: 0, lineHeight: 1.5 }}>
        {text}
      </p>
    </div>
  );
}

// ─── Income Summary ───────────────────────────────────────────────────────────
function IncomeSummary({ inputs, results, isSticky }) {
  const paychecks = inputs.useCustomPaychecks
    ? (inputs.paychecksPerYear || 0)
    : (PAY_FREQUENCY_DEFAULTS[inputs.payFrequency] || 0);

  const gross = paychecks && inputs.grossPayPerCheck
    ? round2((inputs.grossPayPerCheck * paychecks) / 12)
    : 0;

  const reqDed = round2(
    inputs.deductions
      .filter((d) => !d.isVoluntary)
      .reduce((s, d) => s + (d.perPaycheck * paychecks) / 12, 0)
  );
  const volDed = round2(
    inputs.deductions
      .filter((d) => d.isVoluntary)
      .reduce((s, d) => s + (d.perPaycheck * paychecks) / 12, 0)
  );
  const totalDed = round2(reqDed + volDed);
  const net = round2(gross - totalDed);
  const takeHome = round2(net + volDed);
  const otherIncome = round2(
    inputs.otherIncomeSources.reduce((s, src) => s + (src.monthlyAmount || 0), 0)
  );
  const total = round2(takeHome + otherIncome);

  const r = results || {
    grossMonthlyIncome: gross,
    monthlyDeductions: { required: reqDed, voluntary: volDed },
    netMonthlyIncome: net,
    takeHomePay: takeHome,
    otherIncomeMonthly: otherIncome,
    totalMonthlyIncomeAllSources: total,
  };

  const SummaryRow = ({ label, value, opts = {} }) => (
    <div
      style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'baseline',
        padding: '5px 0',
        borderTop: opts.border ? `1px solid #E8EBF0` : 'none',
      }}
    >
      <span
        style={{
          fontFamily: SOURCE,
          fontSize: opts.large ? 14 : 12,
          color: opts.gold ? GOLD : NAVY,
          opacity: opts.muted ? 0.65 : 1,
          textDecoration: opts.strikethrough ? 'line-through' : 'none',
          fontWeight: opts.bold ? 600 : 400,
        }}
      >
        {label}
      </span>
      <span
        style={{
          fontFamily: SOURCE,
          fontSize: opts.large ? 15 : 12,
          color: opts.gold ? GOLD : NAVY,
          fontWeight: opts.bold ? 700 : 400,
        }}
      >
        {fmtFull(value)}
      </span>
    </div>
  );

  return (
    <div
      style={{
        backgroundColor: WHITE,
        border: `1px solid #E8EBF0`,
        borderRadius: 10,
        padding: 20,
        ...(isSticky ? { position: 'sticky', top: 20 } : {}),
      }}
    >
      <div
        style={{
          fontFamily: PLAYFAIR,
          fontWeight: 700,
          fontSize: 16,
          color: NAVY,
          marginBottom: 14,
        }}
      >
        Income Summary
      </div>
      <SummaryRow label="Gross Monthly Income" value={r.grossMonthlyIncome} />
      <SummaryRow
        label="− Required Deductions"
        value={-r.monthlyDeductions.required}
        opts={{ muted: true }}
      />
      <SummaryRow
        label="− Voluntary Deductions"
        value={-r.monthlyDeductions.voluntary}
        opts={{ gold: true, strikethrough: true }}
      />
      <SummaryRow
        label="= Net Monthly Income"
        value={r.netMonthlyIncome}
        opts={{ bold: true, border: true }}
      />
      <SummaryRow
        label="+ Voluntary Added Back"
        value={r.monthlyDeductions.voluntary}
        opts={{ gold: true }}
      />
      <SummaryRow
        label="= Take-Home Pay"
        value={r.takeHomePay}
        opts={{ bold: true, large: true, border: true }}
      />
      <SummaryRow label="+ Other Income" value={r.otherIncomeMonthly} />
      <div style={{ borderTop: `2px solid ${GOLD}`, marginTop: 6, paddingTop: 10 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
          <span style={{ fontFamily: SOURCE, fontSize: 12, fontWeight: 600, color: NAVY }}>
            Total Monthly Income
          </span>
          <span style={{ fontFamily: PLAYFAIR, fontSize: 26, fontWeight: 700, color: NAVY, lineHeight: 1 }}>
            {fmtFull(r.totalMonthlyIncomeAllSources)}
          </span>
        </div>
      </div>
    </div>
  );
}

// ─── Deduction Chart ──────────────────────────────────────────────────────────
function DeductionChart({ results }) {
  if (!results || !results.grossMonthlyIncome) return null;

  const gross = results.grossMonthlyIncome;
  const bd = results.deductionBreakdown;

  const fedTax    = bd.find((d) => d.id === 'fedTax')?.monthly || 0;
  const stateTax  = bd.find((d) => d.id === 'stateTax')?.monthly || 0;
  const ss        = bd.find((d) => d.id === 'socialSecurity')?.monthly || 0;
  const medicare  = bd.find((d) => d.id === 'medicare')?.monthly || 0;
  const medDental = (bd.find((d) => d.id === 'medical')?.monthly || 0)
                  + (bd.find((d) => d.id === 'dental')?.monthly || 0);
  const voluntary = results.monthlyDeductions.voluntary;
  const takeHome  = results.takeHomePay;

  const data = [{ name: 'Income', fedTax, stateTax, ss, medicare, medDental, voluntary, takeHome }];

  const segments = [
    { key: 'takeHome',  label: 'Take-home',       color: GREEN },
    { key: 'voluntary', label: 'Voluntary',        color: GOLD },
    { key: 'medDental', label: 'Medical/Dental',   color: '#8B6F47' },
    { key: 'medicare',  label: 'Medicare',         color: '#5C7A6E' },
    { key: 'ss',        label: 'Social Security',  color: '#6B8E9B' },
    { key: 'stateTax',  label: 'State Tax',        color: '#4A6FA5' },
    { key: 'fedTax',    label: 'Federal Tax',      color: NAVY },
  ];

  const renderLabel = (segColor) => ({ x, y, width, height, value }) => {
    if (!value || width < 52) return null;
    const pct = gross > 0 ? Math.round((value / gross) * 100) : 0;
    const textColor = segColor === GOLD ? NAVY : WHITE;
    return (
      <text
        x={x + width / 2}
        y={y + height / 2}
        fill={textColor}
        textAnchor="middle"
        dominantBaseline="central"
        fontSize={10}
        fontFamily="Source Sans Pro, sans-serif"
      >
        {fmtShort(value)} ({pct}%)
      </text>
    );
  };

  return (
    <div>
      <div
        style={{
          fontFamily: PLAYFAIR,
          fontWeight: 700,
          fontSize: 16,
          color: NAVY,
          marginBottom: 12,
        }}
      >
        Deduction Breakdown
      </div>
      <ResponsiveContainer width="100%" height={80}>
        <BarChart
          layout="vertical"
          data={data}
          margin={{ top: 0, right: 0, bottom: 0, left: 0 }}
          barSize={52}
        >
          <XAxis type="number" hide />
          <YAxis type="category" dataKey="name" hide />
          {segments.map((seg) => (
            <Bar key={seg.key} dataKey={seg.key} stackId="a" fill={seg.color} name={seg.label}>
              <LabelList content={renderLabel(seg.color)} />
            </Bar>
          ))}
        </BarChart>
      </ResponsiveContainer>
      {/* Legend */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px 14px', marginTop: 10 }}>
        {segments
          .filter((seg) => data[0][seg.key] > 0)
          .map((seg) => (
            <div key={seg.key} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
              <div
                style={{
                  width: 10,
                  height: 10,
                  borderRadius: 2,
                  backgroundColor: seg.color,
                  border: seg.color === GOLD ? `1px solid #A88844` : 'none',
                }}
              />
              <span style={{ fontFamily: SOURCE, fontSize: 12, color: NAVY }}>{seg.label}</span>
            </div>
          ))}
      </div>
      {/* Visually hidden accessible table */}
      <table
        style={{ position: 'absolute', left: -9999, top: 'auto', width: 1, height: 1, overflow: 'hidden' }}
        aria-label="Income deduction breakdown data"
      >
        <thead>
          <tr>
            <th>Category</th>
            <th>Monthly Amount</th>
            <th>Percent of Gross</th>
          </tr>
        </thead>
        <tbody>
          {segments.map((seg) => (
            <tr key={seg.key}>
              <td>{seg.label}</td>
              <td>{fmtFull(data[0][seg.key])}</td>
              <td>
                {gross > 0 ? Math.round((data[0][seg.key] / gross) * 100) : 0}%
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function PayStubDecoder({ userTier = 'essentials' }) {
  const { isDesktop, isMedium } = useBreakpoint();

  const payStubDecoder      = useM3Store((s) => s.payStubDecoder);
  const setPayStubField     = useM3Store((s) => s.setPayStubField);
  const addDeduction        = useM3Store((s) => s.addDeduction);
  const removeDeduction     = useM3Store((s) => s.removeDeduction);
  const addOtherIncomeSource    = useM3Store((s) => s.addOtherIncomeSource);
  const removeOtherIncomeSource = useM3Store((s) => s.removeOtherIncomeSource);
  const calculatePayStubResults = useM3Store((s) => s.calculatePayStubResults);

  const m1BudgetGap = useM1Store((s) => s.budgetGap);

  const { inputs, results } = payStubDecoder;

  const [openSections, setOpenSections] = useState({ A: true, B: false, C: false, D: false });
  const [addingDed, setAddingDed] = useState(false);
  const [newDed, setNewDed] = useState({ label: '', perPaycheck: 0, isVoluntary: false, isPreTax: false });
  const [prefilledFromM1, setPrefilledFromM1] = useState(false);

  // ─── M1 → M3 Tool 1 pre-population (TC-9) ─────────────────────────────────
  useEffect(() => {
    if (prefilledFromM1) return;
    if (!m1BudgetGap?.completed) return;
    if (inputs.payFrequency !== null || inputs.grossPayPerCheck !== null) return;

    const m1Freq = m1BudgetGap.inputs?.payFrequency;
    const m1Gross = m1BudgetGap.inputs?.grossIncome;

    if (m1Freq) {
      setPayStubField('inputs.payFrequency', m1Freq);
      const paycheckMap = { weekly: 52, biweekly: 26, semimonthly: 24, monthly: 12 };
      const paychecks = paycheckMap[m1Freq];
      if (paychecks) {
        setPayStubField('inputs.paychecksPerYear', paychecks);
      }
    }
    if (m1Gross !== undefined && m1Gross !== null && m1Gross !== '') {
      setPayStubField('inputs.grossPayPerCheck', parseFloat(m1Gross) || 0);
    }

    setPrefilledFromM1(true);
  }, [m1BudgetGap, inputs.payFrequency, inputs.grossPayPerCheck, setPayStubField, prefilledFromM1]);

  const toggleSection = (key) =>
    setOpenSections((prev) => ({ ...prev, [key]: !prev[key] }));

  // Derived values
  const paychecks = inputs.useCustomPaychecks
    ? (inputs.paychecksPerYear || 0)
    : (PAY_FREQUENCY_DEFAULTS[inputs.payFrequency] || 0);

  const grossAnnual = inputs.grossPayPerCheck && paychecks
    ? inputs.grossPayPerCheck * paychecks
    : 0;

  const liveGrossMonthly = grossAnnual / 12;

  const sectionAComplete =
    !!inputs.payFrequency &&
    (inputs.useCustomPaychecks ? inputs.paychecksPerYear > 0 : true);
  const sectionBComplete = inputs.grossPayPerCheck > 0;
  const sectionCComplete = inputs.deductions.some(d => d.perPaycheck > 0);

  const otherIncomeTotal = inputs.otherIncomeSources.reduce(
    (s, src) => s + (src.monthlyAmount || 0),
    0
  );

  const canCalculate = inputs.hasEmploymentIncome
    ? sectionAComplete && sectionBComplete
    : otherIncomeTotal > 0 || inputs.noIncomeConfirmed;

  const DED_SUGGESTIONS = [
    'Bonds', 'Credit Union', 'Loan Repayment', 'Union Dues', 'Charitable Contributions', 'Other',
  ];

  // ─── Section A ─────────────────────────────────────────────────────────────
  const sectionAContent = (
    <div style={{ padding: '20px 20px 12px' }}>
      {/* Pay frequency */}
      <div style={{ marginBottom: 16 }}>
        <label
          htmlFor="payFrequency"
          style={{ fontFamily: SOURCE, fontSize: 13, fontWeight: 600, color: NAVY, display: 'block', marginBottom: 4 }}
        >
          Pay Frequency <span style={{ color: RED }}>*</span>
        </label>
        <select
          id="payFrequency"
          value={inputs.payFrequency || ''}
          onChange={(e) =>
            setPayStubField('inputs.payFrequency', e.target.value || null)
          }
          style={{
            width: '100%',
            padding: '9px 36px 9px 12px',
            fontFamily: SOURCE,
            fontSize: 14,
            color: inputs.payFrequency ? NAVY : '#9AA0AA',
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
          <option value="">Select pay frequency…</option>
          <option value="weekly">Weekly (52 paychecks/year)</option>
          <option value="biweekly">Biweekly (26 paychecks/year)</option>
          <option value="semimonthly">Semi-monthly (24 paychecks/year)</option>
          <option value="monthly">Monthly (12 paychecks/year)</option>
        </select>
        <Callout text="Biweekly means you're paid every two weeks (26 paychecks/year). Semi-monthly means twice a month on set dates (24 paychecks/year). Getting this wrong is the #1 income error in divorce." />
      </div>

      {/* Custom paycheck count */}
      <div style={{ marginBottom: 12 }}>
        <Toggle
          id="useCustomPaychecks"
          checked={!inputs.useCustomPaychecks}
          onChange={(val) => setPayStubField('inputs.useCustomPaychecks', !val)}
          label="Use standard paycheck count"
        />
        {inputs.useCustomPaychecks && (
          <div style={{ marginTop: 12 }}>
            <label
              htmlFor="paychecksPerYear"
              style={{ fontFamily: SOURCE, fontSize: 13, fontWeight: 600, color: NAVY, display: 'block', marginBottom: 4 }}
            >
              Actual paychecks per year <span style={{ color: RED }}>*</span>
            </label>
            <input
              id="paychecksPerYear"
              type="number"
              min={1}
              max={52}
              value={inputs.paychecksPerYear || ''}
              onChange={(e) => {
                const n = parseInt(e.target.value, 10);
                setPayStubField(
                  'inputs.paychecksPerYear',
                  isNaN(n) ? null : Math.min(52, Math.max(1, n))
                );
              }}
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
            <p style={{ fontFamily: SOURCE, fontSize: 12, color: NAVY, opacity: 0.65, marginTop: 4, marginBottom: 0 }}>
              If you're a seasonal employee, part-time, or started mid-year, your actual paycheck count may differ. Count the pay stubs you received last year, or check with your employer.
            </p>
          </div>
        )}
        {!inputs.useCustomPaychecks && inputs.payFrequency && (
          <p style={{ fontFamily: SOURCE, fontSize: 12, color: NAVY, opacity: 0.65, marginTop: 6, marginBottom: 0 }}>
            Standard: {PAY_FREQUENCY_DEFAULTS[inputs.payFrequency]} paychecks/year
          </p>
        )}
      </div>
    </div>
  );

  // ─── Section B ─────────────────────────────────────────────────────────────
  const sectionBContent = (
    <div style={{ padding: '20px 20px 12px' }}>
      <div style={{ marginBottom: liveGrossMonthly > 0 ? 12 : 16 }}>
        <label
          htmlFor="grossPay"
          style={{ fontFamily: SOURCE, fontSize: 13, fontWeight: 600, color: NAVY, display: 'block', marginBottom: 4 }}
        >
          Gross pay per paycheck <span style={{ color: RED }}>*</span>
        </label>
        <CurrencyInput
          id="grossPay"
          value={inputs.grossPayPerCheck || 0}
          onChange={(val) => setPayStubField('inputs.grossPayPerCheck', val)}
        />
        <p style={{ fontFamily: SOURCE, fontSize: 12, color: NAVY, opacity: 0.65, marginTop: 4, marginBottom: 0 }}>
          This is the amount before any deductions — the largest number on your pay stub, usually labeled "Gross Pay" or "Total Earnings."
        </p>
      </div>
      {liveGrossMonthly > 0 && (
        <div
          style={{
            backgroundColor: PARCHMENT,
            border: `1px solid #E2D9C8`,
            borderRadius: 8,
            padding: '12px 16px',
            marginBottom: 12,
          }}
        >
          <span style={{ fontFamily: SOURCE, fontSize: 14, color: NAVY }}>
            Your gross monthly income:{' '}
            <strong style={{ fontFamily: PLAYFAIR, fontSize: 20 }}>
              {fmtShort(liveGrossMonthly)}
            </strong>
            {'  '}
            <span style={{ opacity: 0.65 }}>
              ({fmtShort(grossAnnual)}/year)
            </span>
          </span>
        </div>
      )}
    </div>
  );

  // ─── Section C ─────────────────────────────────────────────────────────────
  const sectionCContent = (
    <div style={{ padding: '20px 20px 12px' }}>
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
              <th style={{ textAlign: 'left', padding: '6px 8px 6px 0', color: NAVY, fontWeight: 600, width: '38%' }}>
                Deduction
              </th>
              <th style={{ textAlign: 'right', padding: '6px 8px', color: NAVY, fontWeight: 600, width: '26%' }}>
                Per Paycheck
              </th>
              <th style={{ textAlign: 'right', padding: '6px 8px', color: NAVY, fontWeight: 600, width: '16%' }}>
                Monthly
              </th>
              <th style={{ textAlign: 'right', padding: '6px 0', color: NAVY, fontWeight: 600, width: '20%' }}>
                Annual
              </th>
            </tr>
          </thead>
          <tbody>
            {inputs.deductions.map((ded, idx) => {
              const monthly = paychecks ? round2((ded.perPaycheck * paychecks) / 12) : null;
              const annual  = paychecks ? round2(ded.perPaycheck * paychecks) : null;
              const isDefault = DEFAULT_DEDUCTIONS.some((d) => d.id === ded.id);
              const is401k = ded.id === '401k';
              const isSS = ded.id === 'socialSecurity';
              const showSSWarn = isSS && grossAnnual > SS_WAGE_CAP;

              return (
                <Fragment key={ded.id}>
                  <tr style={{ borderBottom: `1px solid #F0F2F5` }}>
                    <td style={{ padding: '10px 8px 10px 0', color: NAVY }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                        <span>{ded.label}</span>
                        {ded.isVoluntary && (
                          <span
                            style={{
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
                      </div>
                    </td>
                    <td style={{ padding: '10px 8px', textAlign: 'right' }}>
                      <div style={{ minWidth: 88, display: 'inline-block' }}>
                        <CurrencyInput
                          id={`ded-${ded.id}`}
                          value={ded.perPaycheck}
                          onChange={(val) =>
                            setPayStubField(`inputs.deductions.${idx}.perPaycheck`, val)
                          }
                        />
                      </div>
                    </td>
                    <td style={{ padding: '10px 8px', textAlign: 'right', color: NAVY, opacity: 0.75 }}>
                      {monthly != null ? fmtFull(monthly) : '—'}
                    </td>
                    <td style={{ padding: '10px 0', textAlign: 'right' }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 6 }}>
                        <span style={{ color: NAVY, opacity: 0.75 }}>
                          {annual != null ? fmtFull(annual) : '—'}
                        </span>
                        {!isDefault && (
                          <button
                            type="button"
                            onClick={() => removeDeduction(ded.id)}
                            aria-label={`Remove ${ded.label}`}
                            style={{
                              border: 'none',
                              background: 'none',
                              cursor: 'pointer',
                              color: RED,
                              fontSize: 18,
                              lineHeight: 1,
                              padding: '0 2px',
                            }}
                          >
                            ×
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                  {is401k && (
                    <tr>
                      <td colSpan={4} style={{ padding: '0 0 10px' }}>
                        <Callout text="This deduction is voluntary. In divorce financial analysis, voluntary retirement contributions are added back to calculate your true take-home pay. This doesn't mean you should stop contributing — it means the court considers this money available for support calculations." />
                      </td>
                    </tr>
                  )}
                  {showSSWarn && (
                    <tr>
                      <td colSpan={4} style={{ padding: '0 0 10px' }}>
                        <Callout
                          variant="amber"
                          text={`Social Security tax stops after you earn $${SS_WAGE_CAP.toLocaleString()}. Your monthly deduction should be averaged: ($${SS_WAGE_CAP.toLocaleString()} × ${(SS_TAX_RATE * 100).toFixed(1)}%) / 12 = $${((SS_WAGE_CAP * SS_TAX_RATE) / 12).toFixed(2)}.`}
                        />
                      </td>
                    </tr>
                  )}
                </Fragment>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Add deduction */}
      {!addingDed ? (
        <button
          type="button"
          onClick={() => setAddingDed(true)}
          style={{
            marginTop: 10,
            marginBottom: 12,
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
      ) : (
        <div
          style={{
            marginTop: 12,
            marginBottom: 12,
            backgroundColor: PARCHMENT,
            border: `1px solid #E2D9C8`,
            borderRadius: 8,
            padding: 16,
          }}
        >
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 12 }}>
            <div style={{ flex: '1 1 150px' }}>
              <label
                htmlFor="newDedLabel"
                style={{ fontFamily: SOURCE, fontSize: 13, fontWeight: 600, color: NAVY, display: 'block', marginBottom: 4 }}
              >
                Label
              </label>
              <input
                id="newDedLabel"
                list="ded-suggestions"
                value={newDed.label}
                onChange={(e) => setNewDed((p) => ({ ...p, label: e.target.value }))}
                placeholder="e.g. Union Dues"
                style={{
                  width: '100%',
                  padding: '8px 10px',
                  fontFamily: SOURCE,
                  fontSize: 13,
                  color: NAVY,
                  border: `1px solid #C8D0DC`,
                  borderRadius: 6,
                  boxSizing: 'border-box',
                }}
              />
              <datalist id="ded-suggestions">
                {DED_SUGGESTIONS.map((s) => (
                  <option key={s} value={s} />
                ))}
              </datalist>
            </div>
            <div style={{ flex: '0 0 120px' }}>
              <label
                htmlFor="newDedAmt"
                style={{ fontFamily: SOURCE, fontSize: 13, fontWeight: 600, color: NAVY, display: 'block', marginBottom: 4 }}
              >
                Per Paycheck
              </label>
              <CurrencyInput
                id="newDedAmt"
                value={newDed.perPaycheck}
                onChange={(val) => setNewDed((p) => ({ ...p, perPaycheck: val }))}
              />
            </div>
          </div>
          <div style={{ display: 'flex', gap: 20, marginBottom: 14 }}>
            <Toggle
              id="newDedVoluntary"
              checked={newDed.isVoluntary}
              onChange={(val) => setNewDed((p) => ({ ...p, isVoluntary: val }))}
              label="Voluntary"
            />
            <Toggle
              id="newDedPreTax"
              checked={newDed.isPreTax}
              onChange={(val) => setNewDed((p) => ({ ...p, isPreTax: val }))}
              label="Pre-tax"
            />
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              type="button"
              onClick={() => {
                if (!newDed.label.trim()) return;
                addDeduction({
                  label: newDed.label.trim(),
                  perPaycheck: newDed.perPaycheck,
                  isVoluntary: newDed.isVoluntary,
                  isPreTax: newDed.isPreTax,
                });
                setNewDed({ label: '', perPaycheck: 0, isVoluntary: false, isPreTax: false });
                setAddingDed(false);
              }}
              style={{
                fontFamily: SOURCE,
                fontSize: 13,
                backgroundColor: NAVY,
                color: WHITE,
                border: 'none',
                borderRadius: 6,
                padding: '8px 18px',
                cursor: 'pointer',
              }}
            >
              Add
            </button>
            <button
              type="button"
              onClick={() => {
                setAddingDed(false);
                setNewDed({ label: '', perPaycheck: 0, isVoluntary: false, isPreTax: false });
              }}
              style={{
                fontFamily: SOURCE,
                fontSize: 13,
                backgroundColor: 'transparent',
                color: NAVY,
                border: `1px solid #C8D0DC`,
                borderRadius: 6,
                padding: '8px 18px',
                cursor: 'pointer',
              }}
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );

  // ─── Section D ─────────────────────────────────────────────────────────────
  const sectionDContent = (
    <div style={{ padding: '20px 20px 12px' }}>
      {inputs.otherIncomeSources.length === 0 && (
        <p style={{ fontFamily: SOURCE, fontSize: 13, color: NAVY, opacity: 0.65, marginTop: 0, marginBottom: 14 }}>
          Add any income not on your primary pay stub — part-time work, child support, rental income, etc.
        </p>
      )}
      {inputs.otherIncomeSources.map((src, idx) => (
        <div
          key={src.id}
          style={{
            backgroundColor: PARCHMENT,
            border: `1px solid #E2D9C8`,
            borderRadius: 8,
            padding: 14,
            marginBottom: 10,
          }}
        >
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 10 }}>
            <div style={{ flex: '1 1 150px' }}>
              <label
                htmlFor={`src-label-${src.id}`}
                style={{ fontFamily: SOURCE, fontSize: 13, fontWeight: 600, color: NAVY, display: 'block', marginBottom: 4 }}
              >
                Source
              </label>
              <input
                id={`src-label-${src.id}`}
                value={src.source}
                onChange={(e) =>
                  setPayStubField(`inputs.otherIncomeSources.${idx}.source`, e.target.value)
                }
                placeholder="e.g. Child Support"
                style={{
                  width: '100%',
                  padding: '8px 10px',
                  fontFamily: SOURCE,
                  fontSize: 13,
                  color: NAVY,
                  border: `1px solid #C8D0DC`,
                  borderRadius: 6,
                  boxSizing: 'border-box',
                }}
              />
            </div>
            <div style={{ flex: '0 0 130px' }}>
              <label
                htmlFor={`src-amt-${src.id}`}
                style={{ fontFamily: SOURCE, fontSize: 13, fontWeight: 600, color: NAVY, display: 'block', marginBottom: 4 }}
              >
                Monthly Amount
              </label>
              <CurrencyInput
                id={`src-amt-${src.id}`}
                value={src.monthlyAmount}
                onChange={(val) =>
                  setPayStubField(`inputs.otherIncomeSources.${idx}.monthlyAmount`, val)
                }
              />
            </div>
            <div style={{ flex: '0 0 auto', display: 'flex', alignItems: 'flex-end', paddingBottom: 2 }}>
              <Toggle
                id={`src-taxable-${src.id}`}
                checked={src.isTaxable}
                onChange={(val) =>
                  setPayStubField(`inputs.otherIncomeSources.${idx}.isTaxable`, val)
                }
                label="Taxable"
              />
            </div>
            <div style={{ flex: '0 0 auto', display: 'flex', alignItems: 'flex-end' }}>
              <button
                type="button"
                onClick={() => removeOtherIncomeSource(src.id)}
                aria-label={`Remove ${src.source || 'income source'}`}
                style={{
                  border: 'none',
                  background: 'none',
                  cursor: 'pointer',
                  color: RED,
                  fontSize: 20,
                  lineHeight: 1,
                  padding: '0 4px',
                }}
              >
                ×
              </button>
            </div>
          </div>
          {!src.isTaxable && (
            <p style={{ fontFamily: SOURCE, fontSize: 11, color: NAVY, opacity: 0.7, margin: 0, lineHeight: 1.5 }}>
              Child support received is not taxable. Spousal support received under pre-2019 agreements is taxable; post-2018 agreements it's not. Interest and rental income are taxable.
            </p>
          )}
        </div>
      ))}
      <button
        type="button"
        onClick={() =>
          addOtherIncomeSource({ source: '', monthlyAmount: 0, isTaxable: true })
        }
        style={{
          fontFamily: SOURCE,
          fontSize: 13,
          color: GOLD,
          background: 'none',
          border: `1px solid ${GOLD}`,
          borderRadius: 6,
          padding: '6px 14px',
          cursor: 'pointer',
          marginBottom: 8,
        }}
      >
        + Add Income Source
      </button>
    </div>
  );

  // ─── Sections panel ────────────────────────────────────────────────────────
  const noIncomeCollapsed = (
    <div style={{ padding: '12px 20px', fontFamily: SOURCE, fontSize: 13, color: NAVY, opacity: 0.55 }}>
      No employment income
    </div>
  );

  const sectionsPanel = (
    <div
      style={{
        backgroundColor: WHITE,
        border: `1px solid #E8EBF0`,
        borderRadius: 10,
        overflow: 'hidden',
        marginBottom: 16,
      }}
    >
      {/* Section A */}
      <SectionHeader
        number="A"
        title="Pay Schedule"
        isComplete={sectionAComplete}
        isOpen={openSections.A}
        onClick={() => toggleSection('A')}
      />
      {openSections.A && (inputs.hasEmploymentIncome ? sectionAContent : noIncomeCollapsed)}

      {/* Section B */}
      <SectionHeader
        number="B"
        title="Gross Pay"
        isComplete={sectionBComplete}
        isOpen={openSections.B}
        onClick={() => toggleSection('B')}
      />
      {openSections.B && (inputs.hasEmploymentIncome ? sectionBContent : noIncomeCollapsed)}

      {/* Section C */}
      <SectionHeader
        number="C"
        title="Deductions"
        isComplete={sectionCComplete}
        isOpen={openSections.C}
        onClick={() => toggleSection('C')}
      />
      {!openSections.C && !sectionCComplete && inputs.hasEmploymentIncome && (
        <p style={{ color: '#C8A96E', fontStyle: 'italic', fontSize: '0.875rem', margin: '0 0 4px', padding: '4px 20px 8px 20px', fontFamily: SOURCE }}>
          Don't forget to enter your paycheck deductions — taxes, insurance, and retirement contributions.
        </p>
      )}
      {openSections.C && (inputs.hasEmploymentIncome ? sectionCContent : noIncomeCollapsed)}

      {/* Section D — always active */}
      <SectionHeader
        number="D"
        title="Other Income"
        isComplete={inputs.otherIncomeSources.length > 0}
        isOpen={openSections.D}
        onClick={() => toggleSection('D')}
      />
      {openSections.D && sectionDContent}
    </div>
  );

  // ─── Calculate button + no-income confirmation ─────────────────────────────
  const calculateRow = (
    <>
      {!inputs.hasEmploymentIncome && otherIncomeTotal === 0 && (
        <div
          style={{
            backgroundColor: PARCHMENT,
            border: `1px solid #E2D9C8`,
            borderRadius: 8,
            padding: '12px 16px',
            marginBottom: 14,
            display: 'flex',
            alignItems: 'flex-start',
            gap: 10,
          }}
        >
          <input
            type="checkbox"
            id="noIncomeConfirmed"
            checked={inputs.noIncomeConfirmed}
            onChange={(e) =>
              setPayStubField('inputs.noIncomeConfirmed', e.target.checked)
            }
            style={{ marginTop: 2, cursor: 'pointer', accentColor: NAVY }}
          />
          <label
            htmlFor="noIncomeConfirmed"
            style={{ fontFamily: SOURCE, fontSize: 13, color: NAVY, cursor: 'pointer', lineHeight: 1.5 }}
          >
            I confirm I have no income sources
          </label>
        </div>
      )}
      <button
        type="button"
        onClick={() => calculatePayStubResults()}
        disabled={!canCalculate}
        style={{
          width: '100%',
          padding: '15px',
          backgroundColor: canCalculate ? NAVY : '#B0B8C8',
          color: WHITE,
          fontFamily: PLAYFAIR,
          fontWeight: 700,
          fontSize: 18,
          border: 'none',
          borderRadius: 10,
          cursor: canCalculate ? 'pointer' : 'not-allowed',
          transition: 'background-color 0.2s',
        }}
      >
        Calculate My Income
      </button>
    </>
  );

  // ─── Results ───────────────────────────────────────────────────────────────
  const resultsSection = results && (
    <div style={{ marginTop: 32 }}>
      {/* Income Summary Card */}
      <div
        style={{
          backgroundColor: WHITE,
          border: `1px solid #E8EBF0`,
          borderRadius: 12,
          padding: '24px 28px',
          marginBottom: 24,
        }}
      >
        <h2
          style={{
            fontFamily: PLAYFAIR,
            fontWeight: 700,
            fontSize: 22,
            color: NAVY,
            marginTop: 0,
            marginBottom: 20,
          }}
        >
          Your Income Breakdown
        </h2>
        <div style={{ maxWidth: 500 }}>
          {[
            { label: 'Gross Monthly Income',       val: results.grossMonthlyIncome,              opts: {} },
            { label: '− Required Deductions',      val: -results.monthlyDeductions.required,     opts: { muted: true } },
            { label: '− Voluntary Deductions',     val: -results.monthlyDeductions.voluntary,    opts: { gold: true, strikethrough: true } },
            null,
            { label: '= Net Monthly Income',       val: results.netMonthlyIncome,                opts: { bold: true } },
            { label: '+ Voluntary Added Back',     val: results.monthlyDeductions.voluntary,     opts: { gold: true } },
            null,
            { label: '= Take-Home Pay',            val: results.takeHomePay,                     opts: { bold: true, large: true } },
            { label: '+ Other Income',             val: results.otherIncomeMonthly,              opts: {} },
          ].map((item, i) => {
            if (!item)
              return (
                <div
                  key={`divider-${i}`}
                  style={{ height: 1, backgroundColor: '#E8EBF0', margin: '8px 0' }}
                />
              );
            return (
              <div
                key={item.label}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'baseline',
                  padding: '5px 0',
                }}
              >
                <span
                  style={{
                    fontFamily: SOURCE,
                    fontSize: item.opts.large ? 15 : 14,
                    color: item.opts.gold ? GOLD : NAVY,
                    opacity: item.opts.muted ? 0.65 : 1,
                    textDecoration: item.opts.strikethrough ? 'line-through' : 'none',
                    fontWeight: item.opts.bold ? 600 : 400,
                  }}
                >
                  {item.label}
                </span>
                <span
                  style={{
                    fontFamily: item.opts.large ? PLAYFAIR : SOURCE,
                    fontSize: item.opts.large ? 20 : 14,
                    color: item.opts.gold ? GOLD : NAVY,
                    fontWeight: item.opts.bold ? 700 : 400,
                  }}
                >
                  {fmtFull(Math.abs(item.val))}
                </span>
              </div>
            );
          })}

          {/* Total row */}
          <div
            style={{
              borderTop: `2px solid ${GOLD}`,
              marginTop: 8,
              paddingTop: 12,
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'baseline',
            }}
          >
            <span style={{ fontFamily: SOURCE, fontSize: 16, fontWeight: 600, color: NAVY }}>
              = Total Monthly Income
            </span>
            <span style={{ fontFamily: PLAYFAIR, fontSize: 36, fontWeight: 700, color: NAVY, lineHeight: 1 }}>
              {fmtFull(results.totalMonthlyIncomeAllSources)}
            </span>
          </div>
        </div>

        <div style={{ marginTop: 16 }}>
          <Callout text="In divorce financial analysis, take-home pay — not net income from your paycheck — is the number that matters. Voluntary deductions like 401(k) contributions are considered available income for support calculations." />
        </div>
      </div>

      {/* Deduction Breakdown Chart */}
      <div
        style={{
          backgroundColor: WHITE,
          border: `1px solid #E8EBF0`,
          borderRadius: 12,
          padding: '24px 28px',
          marginBottom: 24,
        }}
      >
        <DeductionChart results={results} />
      </div>

      {/* Warning flags */}
      {results.warnings.length > 0 && (
        <div style={{ marginBottom: 24 }}>
          {results.warnings.map((w, i) => (
            <div
              key={i}
              role="alert"
              style={{
                backgroundColor: '#FFFAEC',
                border: `1px solid ${AMBER}`,
                borderLeft: `4px solid ${AMBER}`,
                borderRadius: '0 8px 8px 0',
                padding: '12px 16px',
                marginBottom: 8,
                fontFamily: SOURCE,
                fontSize: 13,
                color: NAVY,
                lineHeight: 1.5,
              }}
            >
              <span style={{ fontWeight: 600, color: '#7A5010' }}>⚠ Heads up: </span>
              {w}
            </div>
          ))}
        </div>
      )}

      {/* CTA Card */}
      <div
        style={{
          backgroundColor: NAVY,
          borderRadius: 12,
          padding: '28px 32px',
          textAlign: 'center',
          marginBottom: 32,
        }}
      >
        <h3
          style={{
            fontFamily: PLAYFAIR,
            fontWeight: 700,
            fontSize: 22,
            color: PARCHMENT,
            marginTop: 0,
            marginBottom: 10,
          }}
        >
          Now see what your expenses look like.
        </h3>
        <p
          style={{
            fontFamily: SOURCE,
            fontSize: 15,
            color: PARCHMENT,
            opacity: 0.85,
            marginBottom: 24,
            lineHeight: 1.6,
          }}
        >
          The Budget Modeler compares what you spend now as a married household to what
          you&rsquo;ll spend on your own — and shows you exactly where the numbers change.
        </p>
        <Link
          href="/modules/m3/budget"
          style={{
            display: 'inline-block',
            backgroundColor: GOLD,
            color: NAVY,
            fontFamily: SOURCE,
            fontWeight: 700,
            fontSize: 16,
            padding: '14px 32px',
            borderRadius: 8,
            textDecoration: 'none',
          }}
        >
          Build My Budget →
        </Link>
      </div>
    </div>
  );

  // ─── Form content (shared) ─────────────────────────────────────────────────
  const formContent = (
    <div>
      {/* No-income toggle */}
      <div
        style={{
          backgroundColor: WHITE,
          border: `1px solid #E8EBF0`,
          borderRadius: 10,
          padding: '14px 20px',
          marginBottom: 14,
        }}
      >
        <Toggle
          id="hasEmploymentIncome"
          checked={inputs.hasEmploymentIncome}
          onChange={(val) => setPayStubField('inputs.hasEmploymentIncome', val)}
          label="I have employment income"
        />
      </div>

      {sectionsPanel}
      {calculateRow}
    </div>
  );

  // ─── Render ────────────────────────────────────────────────────────────────
  return (
    <div style={{ backgroundColor: PARCHMENT, minHeight: '100vh', paddingBottom: 56 }}>
      {/* Page header */}
      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '20px 20px 0' }}>
        <Link
          href="/modules/m3"
          style={{
            fontFamily: SOURCE,
            fontSize: 14,
            color: NAVY,
            opacity: 0.65,
            textDecoration: 'none',
            display: 'inline-flex',
            alignItems: 'center',
            gap: 4,
          }}
        >
          ← Back to Know What You Spend
        </Link>
        <h1
          style={{
            fontFamily: PLAYFAIR,
            fontWeight: 700,
            fontSize: isMedium ? 32 : 26,
            color: NAVY,
            marginTop: 18,
            marginBottom: 6,
          }}
        >
          Pay Stub Decoder
        </h1>
        <p
          style={{
            fontFamily: SOURCE,
            fontSize: 15,
            color: NAVY,
            opacity: 0.72,
            marginBottom: 28,
            maxWidth: 620,
          }}
        >
          Turn your pay stub into a clear monthly income picture — and understand exactly
          what counts in divorce financial analysis.
        </p>
      </div>

      {/* Main layout */}
      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '0 20px' }}>
        {isDesktop ? (
          /* Desktop: two-column */
          <div style={{ display: 'flex', gap: 28, alignItems: 'flex-start' }}>
            <div style={{ flex: '0 0 60%', minWidth: 0 }}>
              {formContent}
              {resultsSection}
            </div>
            <div style={{ flex: '0 0 calc(40% - 28px)', minWidth: 0 }}>
              <IncomeSummary inputs={inputs} results={results} isSticky />
            </div>
          </div>
        ) : (
          /* Tablet / Mobile: single column */
          <div style={{ maxWidth: isMedium ? 700 : '100%', margin: '0 auto' }}>
            {formContent}
            <div style={{ marginTop: 20, marginBottom: 24 }}>
              <IncomeSummary inputs={inputs} results={results} isSticky={false} />
            </div>
            {resultsSection}
          </div>
        )}
      </div>

      {/* Footer disclaimer */}
      <div style={{ maxWidth: 1100, margin: '32px auto 0', padding: '0 20px' }}>
        <p
          style={{
            fontFamily: SOURCE,
            fontSize: 12,
            color: NAVY,
            opacity: 0.6,
            lineHeight: 1.65,
            borderTop: `1px solid #E8EBF0`,
            paddingTop: 16,
            margin: 0,
          }}
        >
          This tool is for educational and planning purposes only. It provides estimates
          based on the numbers you enter. Actual take-home pay depends on filing status,
          exemptions, and state tax rules. Voluntary deduction treatment varies by
          jurisdiction. For guidance specific to your situation, consult a Certified
          Divorce Financial Analyst® or attorney.
        </p>
      </div>
    </div>
  );
}
