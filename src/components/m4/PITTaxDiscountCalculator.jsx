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
