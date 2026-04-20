'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts';
import { useM4Store } from '@/src/stores/m4Store';
import { useM3Store } from '@/src/stores/m3Store';
import useBlueprintStore from '@/src/stores/blueprintStore';

// ============================================================
// TAX YEAR CONFIGURATION
// To update for a new tax year:
// 1. Update TAX_YEAR constant
// 2. Update bracket thresholds in TAX_BRACKETS
// 3. Update STANDARD_DEDUCTIONS
// 4. Update CHILD_TAX_CREDIT
// Source: IRS Revenue Procedure (published annually in October)
// Current source: IRS Revenue Procedure 2025-32 (for tax year 2026)
// ============================================================

const TAX_YEAR = 2026;

const TAX_BRACKETS = {
  single: [
    { min: 0,      max: 12400,    rate: 0.10 },
    { min: 12400,  max: 50400,    rate: 0.12 },
    { min: 50400,  max: 105700,   rate: 0.22 },
    { min: 105700, max: 201775,   rate: 0.24 },
    { min: 201775, max: 256225,   rate: 0.32 },
    { min: 256225, max: 640600,   rate: 0.35 },
    { min: 640600, max: Infinity, rate: 0.37 },
  ],
  mfj: [
    { min: 0,      max: 24800,    rate: 0.10 },
    { min: 24800,  max: 100800,   rate: 0.12 },
    { min: 100800, max: 211400,   rate: 0.22 },
    { min: 211400, max: 403550,   rate: 0.24 },
    { min: 403550, max: 512450,   rate: 0.32 },
    { min: 512450, max: 768700,   rate: 0.35 },
    { min: 768700, max: Infinity, rate: 0.37 },
  ],
  mfs: [
    { min: 0,      max: 12400,    rate: 0.10 },
    { min: 12400,  max: 50400,    rate: 0.12 },
    { min: 50400,  max: 105700,   rate: 0.22 },
    { min: 105700, max: 201775,   rate: 0.24 },
    { min: 201775, max: 256225,   rate: 0.32 },
    { min: 256225, max: 384350,   rate: 0.35 },
    { min: 384350, max: Infinity, rate: 0.37 },
  ],
  hoh: [
    { min: 0,      max: 17700,    rate: 0.10 },
    { min: 17700,  max: 67450,    rate: 0.12 },
    { min: 67450,  max: 105700,   rate: 0.22 },
    { min: 105700, max: 201775,   rate: 0.24 },
    { min: 201775, max: 256200,   rate: 0.32 },
    { min: 256200, max: 640600,   rate: 0.35 },
    { min: 640600, max: Infinity, rate: 0.37 },
  ],
};

const STANDARD_DEDUCTIONS = {
  single: 16100,
  mfj: 32200,
  mfs: 16100,
  hoh: 24150,
};

const CHILD_TAX_CREDIT = 2200; // per qualifying child, 2026

// ─── Brand tokens ─────────────────────────────────────────────────────────────
const NAVY       = '#1B2A4A';
const GOLD       = '#C8A96E';
const PARCHMENT  = '#FAF8F2';
const WHITE      = '#FFFFFF';
const AMBER      = '#D4A843';
const GREEN      = '#2D8A4E';
const RED        = '#C0392B';
const MUTED      = '#6B7280';
const SOURCE     = '"Source Sans Pro", -apple-system, system-ui, sans-serif';
const PLAYFAIR   = '"Playfair Display", Georgia, serif';

const STATUS_COLORS = {
  mfj:    NAVY,
  mfs:    '#9B7D6A',
  single: '#4A6FA5',
  hoh:    GOLD,
};

const STATUS_LABELS = {
  mfj:    'Married Filing Jointly',
  mfs:    'Married Filing Separately',
  single: 'Single',
  hoh:    'Head of Household',
};

const STATUS_SHORT = {
  mfj:    'MFJ',
  mfs:    'MFS',
  single: 'Single',
  hoh:    'HoH',
};

const INELIGIBLE_REASONS = {
  mfj:    'Requires being married on Dec 31',
  mfs:    'Requires being married on Dec 31',
  single: 'Requires being unmarried on Dec 31',
  hoh:    'Requires qualifying child and paying >50% of household costs',
};


// ─── Calculation logic ────────────────────────────────────────────────────────
function calculateProgressiveTax(taxableIncome, brackets) {
  let tax = 0;
  for (const bracket of brackets) {
    if (taxableIncome <= bracket.min) break;
    const taxableInBracket = Math.min(taxableIncome, bracket.max) - bracket.min;
    tax += taxableInBracket * bracket.rate;
  }
  return Math.round(tax * 100) / 100;
}

function getMarginalRate(taxableIncome, brackets) {
  for (let i = brackets.length - 1; i >= 0; i--) {
    if (taxableIncome > brackets[i].min) return brackets[i].rate;
  }
  return brackets[0].rate;
}

function determineEligibility(inputs) {
  const { divorceTimeline, hasQualifyingChild, paidMoreThanHalfHouseholdCosts, separatedLastSixMonths } = inputs;
  const divorced = divorceTimeline === 'beforeDec31';
  const notSure  = divorceTimeline === 'notSure';
  const abandonedSpouse = hasQualifyingChild && paidMoreThanHalfHouseholdCosts && separatedLastSixMonths;

  return {
    mfj:    !divorced,
    mfs:    !divorced,
    single: divorced || notSure,
    hoh:    (divorced && hasQualifyingChild && paidMoreThanHalfHouseholdCosts)
            || abandonedSpouse || notSure,
  };
}

function calculateAllScenarios(inputs) {
  const { grossAnnualIncome, spouseGrossAnnualIncome, otherIncome, dependents } = inputs;
  const combinedIncome = grossAnnualIncome + spouseGrossAnnualIncome + otherIncome;
  const scenarios = {};

  for (const status of ['mfj', 'mfs', 'single', 'hoh']) {
    let taxableIncome;
    if (status === 'mfj') {
      taxableIncome = combinedIncome - STANDARD_DEDUCTIONS.mfj;
    } else if (status === 'mfs') {
      taxableIncome = grossAnnualIncome + otherIncome / 2 - STANDARD_DEDUCTIONS.mfs;
    } else {
      taxableIncome = grossAnnualIncome + otherIncome / 2 - STANDARD_DEDUCTIONS[status];
    }
    taxableIncome = Math.max(0, taxableIncome);

    const federalTax = calculateProgressiveTax(taxableIncome, TAX_BRACKETS[status]);
    const grossForRate = taxableIncome + STANDARD_DEDUCTIONS[status];
    const effectiveRate = grossForRate > 0 ? (federalTax / grossForRate) * 100 : 0;
    const marginalRate = getMarginalRate(taxableIncome, TAX_BRACKETS[status]);

    let childTaxCredit = 0;
    if (status !== 'mfs') {
      childTaxCredit = dependents * CHILD_TAX_CREDIT;
    }
    const netTax = Math.max(0, federalTax - childTaxCredit);

    scenarios[status] = {
      taxableIncome,
      federalTax,
      childTaxCredit,
      netTax,
      effectiveRate: parseFloat(effectiveRate.toFixed(2)),
      marginalRate: marginalRate * 100,
      standardDeduction: STANDARD_DEDUCTIONS[status],
    };
  }

  const eligible = determineEligibility(inputs);
  const eligibleScenarios = Object.entries(scenarios).filter(([s]) => eligible[s]);
  const sorted = [...eligibleScenarios].sort(([, a], [, b]) => a.netTax - b.netTax);
  const bestOption = sorted[0];
  const worstOption = sorted[sorted.length - 1];
  const maxSavings = worstOption && bestOption ? worstOption[1].netTax - bestOption[1].netTax : 0;

  return {
    scenarios,
    eligible,
    bestOption: bestOption?.[0] || null,
    maxSavings,
  };
}

// ─── Formatters ───────────────────────────────────────────────────────────────
function fmtCurrency(n) {
  if (n == null || isNaN(n)) return '$0';
  const rounded = Math.round(n);
  return (rounded < 0 ? '-$' : '$') + Math.abs(rounded).toLocaleString('en-US');
}

function parseCurrency(str) {
  const cleaned = String(str).replace(/[$,\s]/g, '');
  const val = parseFloat(cleaned);
  return isNaN(val) ? 0 : val;
}

// ─── Small shared UI pieces ───────────────────────────────────────────────────
function CurrencyInput({ id, label, helper, value, onChange, disabled, required }) {
  const [display, setDisplay] = useState(value > 0 ? String(value) : '');

  useEffect(() => {
    setDisplay(value > 0 ? String(value) : '');
  }, [value]);

  return (
    <div style={{ marginBottom: 18 }}>
      <label
        htmlFor={id}
        style={{
          display: 'block',
          fontFamily: SOURCE,
          fontSize: 14,
          fontWeight: 600,
          color: NAVY,
          marginBottom: 6,
        }}
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
            onChange(parseCurrency(cleaned));
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
        <p style={{ fontFamily: SOURCE, fontSize: 13, color: MUTED, margin: '6px 0 0' }}>
          {helper}
        </p>
      )}
    </div>
  );
}

function Stepper({ id, label, value, onChange, disabled, min = 0, max = 10 }) {
  return (
    <div style={{ marginBottom: 18 }}>
      <label
        htmlFor={id}
        style={{
          display: 'block',
          fontFamily: SOURCE,
          fontSize: 14,
          fontWeight: 600,
          color: NAVY,
          marginBottom: 6,
        }}
      >
        {label}
      </label>
      <div style={{ display: 'inline-flex', alignItems: 'center', border: '1px solid #CBD5E1', borderRadius: 6, overflow: 'hidden' }}>
        <button
          type="button"
          disabled={disabled || value <= min}
          onClick={() => onChange(Math.max(min, value - 1))}
          style={{
            padding: '10px 14px',
            backgroundColor: disabled ? '#F3F4F6' : WHITE,
            border: 'none',
            fontFamily: SOURCE,
            fontSize: 18,
            color: NAVY,
            cursor: disabled || value <= min ? 'not-allowed' : 'pointer',
          }}
          aria-label="Decrease"
        >
          −
        </button>
        <div
          style={{
            minWidth: 48,
            padding: '10px 14px',
            textAlign: 'center',
            fontFamily: SOURCE,
            fontSize: 16,
            color: NAVY,
            borderLeft: '1px solid #CBD5E1',
            borderRight: '1px solid #CBD5E1',
            backgroundColor: disabled ? '#F3F4F6' : PARCHMENT,
          }}
        >
          {value}
        </div>
        <button
          type="button"
          disabled={disabled || value >= max}
          onClick={() => onChange(Math.min(max, value + 1))}
          style={{
            padding: '10px 14px',
            backgroundColor: disabled ? '#F3F4F6' : WHITE,
            border: 'none',
            fontFamily: SOURCE,
            fontSize: 18,
            color: NAVY,
            cursor: disabled || value >= max ? 'not-allowed' : 'pointer',
          }}
          aria-label="Increase"
        >
          +
        </button>
      </div>
    </div>
  );
}

function YesNoToggle({ id, label, value, onChange, disabled }) {
  return (
    <div style={{ marginBottom: 18 }}>
      <div
        style={{
          fontFamily: SOURCE,
          fontSize: 14,
          fontWeight: 600,
          color: NAVY,
          marginBottom: 8,
        }}
      >
        {label}
      </div>
      <div style={{ display: 'inline-flex', border: '1px solid #CBD5E1', borderRadius: 6, overflow: 'hidden' }}>
        {[
          { val: true,  label: 'Yes' },
          { val: false, label: 'No'  },
        ].map((opt, idx) => (
          <button
            key={opt.label}
            type="button"
            disabled={disabled}
            onClick={() => onChange(opt.val)}
            style={{
              padding: '10px 24px',
              backgroundColor: value === opt.val ? NAVY : WHITE,
              color: value === opt.val ? PARCHMENT : NAVY,
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

function InfoBanner({ children, variant = 'gold' }) {
  const bg = variant === 'gold' ? '#FBF4E3' : '#F0F4FA';
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

function SectionHeader({ letter, title }) {
  return (
    <div style={{ marginTop: 28, marginBottom: 12 }}>
      <h2
        style={{
          fontFamily: PLAYFAIR,
          fontWeight: 700,
          fontSize: 20,
          color: NAVY,
          margin: 0,
        }}
      >
        <span style={{ color: GOLD, marginRight: 8 }}>{letter}.</span>
        {title}
      </h2>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────
export default function FilingStatusOptimizer({ userTier = 'essentials' }) {
  const lockedOut = userTier !== 'navigator' && userTier !== 'signature';

  const filingStatusOptimizer = useM4Store((s) => s.filingStatusOptimizer);
  const setFilingStatusInputs = useM4Store((s) => s.setFilingStatusInputs);
  const setFilingStatusResults = useM4Store((s) => s.setFilingStatusResults);
  const setPrePopulated = useM4Store((s) => s.setPrePopulated);

  const payStubResults = useM3Store((s) => s.payStubDecoder?.results);

  const updateTaxAnalysis = useBlueprintStore((s) => s.updateTaxAnalysis);

  const inputs = filingStatusOptimizer.inputs;
  const storedResults = filingStatusOptimizer.results;

  const [prePopBanner, setPrePopBanner] = useState(null);

  // Pre-populate from M3 on mount (navigator/signature only)
  useEffect(() => {
    if (lockedOut) return;
    if (!payStubResults?.grossMonthlyIncome) return;
    const annual = Math.round(payStubResults.grossMonthlyIncome * 12);
    if (annual <= 0) return;

    const alreadyPrePopped = filingStatusOptimizer.prePopulated.fromM3;
    const userHasEntered = filingStatusOptimizer.inputs.grossAnnualIncome > 0 && alreadyPrePopped;
    if (userHasEntered) return;

    if (!alreadyPrePopped) {
      setFilingStatusInputs({ grossAnnualIncome: annual });
      setPrePopulated('filingStatusOptimizer', 'fromM3');
      setPrePopBanner(annual);
    } else if (filingStatusOptimizer.inputs.grossAnnualIncome === annual) {
      setPrePopBanner(annual);
    }
  }, [
    lockedOut,
    payStubResults,
    filingStatusOptimizer.prePopulated.fromM3,
    filingStatusOptimizer.inputs.grossAnnualIncome,
    setFilingStatusInputs,
    setPrePopulated,
  ]);

  const results = storedResults;

  const canCalculate =
    inputs.grossAnnualIncome > 0 &&
    inputs.divorceTimeline != null;

  const handleCalculate = useCallback(() => {
    if (lockedOut) return;
    const out = calculateAllScenarios(filingStatusOptimizer.inputs);
    setFilingStatusResults(out);
    updateTaxAnalysis({
      bestOption: out.bestOption,
      scenarios: out.scenarios,
      maxSavings: out.maxSavings,
      divorceTimeline: filingStatusOptimizer.inputs.divorceTimeline,
    });
  }, [lockedOut, filingStatusOptimizer.inputs, setFilingStatusResults, updateTaxAnalysis]);

  // If locked out (free/essentials), redirect-esque UX
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
          Filing Status Optimizer
        </h1>
        <p style={{ fontSize: 16, color: `${NAVY}B3`, margin: '0 0 24px' }}>
          This tool is available to Full Access members.
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

  const disabled = false;

  // Divorce timeline callout text
  let timelineCallout = null;
  if (inputs.divorceTimeline === 'beforeDec31') {
    timelineCallout = "If your divorce is final by December 31, you'll file as Single or Head of Household for the entire year — even if you were married for most of it.";
  } else if (inputs.divorceTimeline === 'afterJan1') {
    timelineCallout = "If your divorce is finalized after January 1, you're considered married for the prior tax year. You'll file as Married Filing Jointly or Married Filing Separately.";
  } else if (inputs.divorceTimeline === 'notSure') {
    timelineCallout = 'The timing of your divorce can significantly affect your taxes. This tool helps you see exactly how much.';
  }

  const abandonedSpouseTriggered =
    inputs.hasQualifyingChild &&
    inputs.paidMoreThanHalfHouseholdCosts &&
    inputs.separatedLastSixMonths &&
    inputs.divorceTimeline !== 'beforeDec31';

  return (
    <div
      style={{
        maxWidth: 800,
        margin: '0 auto',
        padding: '32px 20px 80px',
        fontFamily: SOURCE,
        color: NAVY,
        position: 'relative',
      }}
    >
      {/* Header */}
      <h1
        style={{
          fontFamily: PLAYFAIR,
          fontWeight: 700,
          fontSize: 28,
          color: NAVY,
          margin: '0 0 8px',
        }}
      >
        Filing Status Optimizer
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
        Compare how different filing statuses affect your federal taxes — and why the date of your divorce matters.
      </p>

      {/* Pre-population banner */}
      {prePopBanner != null && (
        <InfoBanner variant="gold">
          Income pre-filled from your Pay Stub Decoder results ({fmtCurrency(prePopBanner)}/year).
        </InfoBanner>
      )}

      {/* Section A — Income */}
      <SectionHeader letter="A" title="Your Income" />
      <CurrencyInput
        id="fso-a1"
        label="Your gross annual income"
        helper="Total income from wages, salary, self-employment — before taxes and deductions."
        value={inputs.grossAnnualIncome}
        disabled={disabled}
        required
        onChange={(v) => setFilingStatusInputs({ grossAnnualIncome: v })}
      />
      <CurrencyInput
        id="fso-a2"
        label="Spouse's gross annual income"
        helper="Your spouse's total pre-tax income. Used only for Married Filing Jointly scenarios."
        value={inputs.spouseGrossAnnualIncome}
        disabled={disabled}
        onChange={(v) => setFilingStatusInputs({ spouseGrossAnnualIncome: v })}
      />
      <CurrencyInput
        id="fso-a3"
        label="Other income"
        helper="Interest, dividends, rental income, or other non-wage income. Split evenly in MFS/Single scenarios."
        value={inputs.otherIncome}
        disabled={disabled}
        onChange={(v) => setFilingStatusInputs({ otherIncome: v })}
      />

      {/* Section B — Filing Status Qualifiers */}
      <SectionHeader letter="B" title="Filing Status Qualifiers" />
      <InfoBanner variant="navy">
        Head of Household status often produces significantly lower taxes than Single. To qualify, you need a qualifying child living with you and you must pay more than half of household costs.
      </InfoBanner>
      <Stepper
        id="fso-b1"
        label="Number of dependent children"
        value={inputs.dependents}
        disabled={disabled}
        onChange={(v) => setFilingStatusInputs({ dependents: v })}
        min={0}
        max={10}
      />
      <YesNoToggle
        id="fso-b2"
        label="Do you have a qualifying child living with you more than half the year?"
        value={inputs.hasQualifyingChild}
        disabled={disabled}
        onChange={(v) => setFilingStatusInputs({ hasQualifyingChild: v })}
      />
      <YesNoToggle
        id="fso-b3"
        label="Do you pay more than half the cost of maintaining your household?"
        value={inputs.paidMoreThanHalfHouseholdCosts}
        disabled={disabled}
        onChange={(v) => setFilingStatusInputs({ paidMoreThanHalfHouseholdCosts: v })}
      />
      <YesNoToggle
        id="fso-b4"
        label="Have you and your spouse lived apart for the last 6 months?"
        value={inputs.separatedLastSixMonths}
        disabled={disabled}
        onChange={(v) => setFilingStatusInputs({ separatedLastSixMonths: v })}
      />

      {/* Section C — Divorce Timing */}
      <SectionHeader letter="C" title="Divorce Timing" />
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: 10,
          marginBottom: 16,
        }}
      >
        {[
          { val: 'beforeDec31', label: 'Before December 31 this year' },
          { val: 'afterJan1',   label: 'After January 1 next year' },
          { val: 'notSure',     label: 'Not sure yet' },
        ].map((opt) => (
          <label
            key={opt.val}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              padding: '12px 14px',
              border: `1px solid ${inputs.divorceTimeline === opt.val ? NAVY : '#CBD5E1'}`,
              borderRadius: 6,
              cursor: disabled ? 'not-allowed' : 'pointer',
              backgroundColor: inputs.divorceTimeline === opt.val ? '#F0F4FA' : WHITE,
              opacity: disabled ? 0.75 : 1,
            }}
          >
            <input
              type="radio"
              name="divorceTimeline"
              value={opt.val}
              disabled={disabled}
              checked={inputs.divorceTimeline === opt.val}
              onChange={() => setFilingStatusInputs({ divorceTimeline: opt.val })}
              style={{ accentColor: NAVY }}
            />
            <span style={{ fontFamily: SOURCE, fontSize: 15, color: NAVY }}>{opt.label}</span>
          </label>
        ))}
      </div>

      {timelineCallout && (
        <div
          style={{
            borderLeft: `4px solid ${GOLD}`,
            backgroundColor: PARCHMENT,
            padding: '12px 16px',
            marginBottom: 20,
            fontFamily: SOURCE,
            fontSize: 14,
            color: NAVY,
            borderRadius: 4,
            lineHeight: 1.55,
          }}
        >
          {timelineCallout}
        </div>
      )}

      {/* Calculate button */}
      <div style={{ marginTop: 24, marginBottom: 12 }}>
        <button
          type="button"
          disabled={!canCalculate || disabled}
          onClick={handleCalculate}
          style={{
            width: '100%',
            maxWidth: 280,
            padding: '14px 28px',
            fontFamily: SOURCE,
            fontWeight: 700,
            fontSize: 16,
            color: NAVY,
            backgroundColor: canCalculate && !disabled ? GOLD : '#E5E7EB',
            border: 'none',
            borderRadius: 8,
            cursor: canCalculate && !disabled ? 'pointer' : 'not-allowed',
            letterSpacing: 0.3,
          }}
        >
          Compare Filing Statuses
        </button>
      </div>

      {/* Results */}
      {results && <ResultsBlock results={results} abandonedSpouseTriggered={abandonedSpouseTriggered} userTier={userTier} />}

      {/* Disclaimer */}
      <div
        style={{
          marginTop: 40,
          padding: '16px 18px',
          backgroundColor: '#F3F4F6',
          borderRadius: 6,
          fontFamily: SOURCE,
          fontSize: 13,
          color: MUTED,
          lineHeight: 1.55,
        }}
      >
        This tool provides simplified federal tax estimates for educational purposes only. It does not account for state taxes, itemized deductions, AMT, phase-outs, or other factors that affect your actual tax liability. Tax Year: {TAX_YEAR} (federal only). For filing decisions, consult a CPA or tax attorney.
      </div>

    </div>
  );
}

// ─── Results block ────────────────────────────────────────────────────────────
function ResultsBlock({ results, abandonedSpouseTriggered, userTier }) {
  const { scenarios, eligible, bestOption, maxSavings } = results;
  const worstEligible = Object.entries(scenarios)
    .filter(([s]) => eligible[s])
    .sort(([, a], [, b]) => b.netTax - a.netTax)[0];

  const chartData = Object.entries(scenarios)
    .filter(([s]) => eligible[s])
    .map(([status, data]) => ({
      name: STATUS_SHORT[status],
      status,
      netTax: Math.round(data.netTax),
      fill: STATUS_COLORS[status],
    }));

  return (
    <div style={{ marginTop: 28 }}>
      {/* Output 1: Comparison Table */}
      <h2
        style={{
          fontFamily: PLAYFAIR,
          fontWeight: 700,
          fontSize: 22,
          color: NAVY,
          margin: '0 0 16px',
        }}
      >
        Scenario Comparison
      </h2>
      <div
        style={{
          overflowX: 'auto',
          marginBottom: 20,
          borderRadius: 8,
          border: '1px solid #E5E7EB',
        }}
      >
        <table
          style={{
            width: '100%',
            minWidth: 560,
            borderCollapse: 'collapse',
            fontFamily: SOURCE,
            fontSize: 14,
            color: NAVY,
          }}
        >
          <thead>
            <tr>
              <th
                style={{
                  textAlign: 'left',
                  padding: '12px 14px',
                  backgroundColor: NAVY,
                  color: PARCHMENT,
                  fontWeight: 600,
                  fontSize: 13,
                  letterSpacing: 0.3,
                }}
              >
                Metric
              </th>
              {['mfj', 'mfs', 'single', 'hoh'].map((status) => {
                const isBest = status === bestOption;
                return (
                  <th
                    key={status}
                    style={{
                      textAlign: 'center',
                      padding: '12px 14px',
                      backgroundColor: NAVY,
                      color: PARCHMENT,
                      fontWeight: 600,
                      fontSize: 13,
                      borderLeft: isBest ? `3px solid ${GOLD}` : 'none',
                      position: 'relative',
                    }}
                  >
                    <div>{STATUS_SHORT[status]}</div>
                    {isBest && (
                      <div
                        style={{
                          display: 'inline-block',
                          marginTop: 4,
                          backgroundColor: GOLD,
                          color: NAVY,
                          fontSize: 10,
                          fontWeight: 700,
                          padding: '2px 8px',
                          borderRadius: 999,
                          letterSpacing: 0.3,
                        }}
                      >
                        LOWEST TAX
                      </div>
                    )}
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {[
              { key: 'eligible',          label: 'Eligible?' },
              { key: 'standardDeduction', label: 'Standard Deduction' },
              { key: 'taxableIncome',     label: 'Taxable Income' },
              { key: 'federalTax',        label: 'Federal Tax' },
              { key: 'childTaxCredit',    label: 'Child Tax Credit' },
              { key: 'netTax',            label: 'Net Tax' },
              { key: 'effectiveRate',     label: 'Effective Rate' },
              { key: 'marginalRate',      label: 'Marginal Rate' },
            ].map((row, rowIdx) => (
              <tr
                key={row.key}
                style={{
                  backgroundColor: rowIdx % 2 === 0 ? WHITE : '#FAFAFA',
                  borderTop: '1px solid #E5E7EB',
                }}
              >
                <td style={{ padding: '10px 14px', fontWeight: 600, color: NAVY }}>
                  {row.label}
                </td>
                {['mfj', 'mfs', 'single', 'hoh'].map((status) => {
                  const isEligible = eligible[status];
                  const isBest = status === bestOption;
                  const data = scenarios[status];

                  const baseStyle = {
                    textAlign: 'center',
                    padding: '10px 14px',
                    borderLeft: isBest ? `3px solid ${GOLD}` : 'none',
                  };
                  const ineligibleStyle = !isEligible
                    ? {
                        backgroundImage:
                          'repeating-linear-gradient(45deg, #F3F4F6, #F3F4F6 6px, #E5E7EB 6px, #E5E7EB 12px)',
                        color: MUTED,
                      }
                    : {};
                  const cellStyle = { ...baseStyle, ...ineligibleStyle };

                  if (row.key === 'eligible') {
                    return (
                      <td key={status} style={cellStyle}>
                        {isEligible ? (
                          <span style={{ color: GREEN, fontWeight: 700 }}>Yes</span>
                        ) : (
                          <span style={{ color: MUTED, fontSize: 12 }}>
                            No
                            <div style={{ fontSize: 11, fontWeight: 400, marginTop: 2 }}>
                              {INELIGIBLE_REASONS[status]}
                            </div>
                          </span>
                        )}
                      </td>
                    );
                  }

                  if (!isEligible) {
                    return (
                      <td key={status} style={cellStyle}>
                        —
                      </td>
                    );
                  }

                  let display;
                  if (row.key === 'effectiveRate' || row.key === 'marginalRate') {
                    display = `${data[row.key].toFixed(row.key === 'marginalRate' ? 0 : 2)}%`;
                  } else {
                    display = fmtCurrency(data[row.key]);
                  }

                  return (
                    <td
                      key={status}
                      style={{
                        ...cellStyle,
                        fontWeight: row.key === 'netTax' ? 700 : 400,
                        color: row.key === 'netTax' && isBest ? GREEN : NAVY,
                      }}
                    >
                      {display}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {eligible.mfs && (
        <div
          style={{
            backgroundColor: '#FEF7E6',
            borderLeft: `4px solid ${AMBER}`,
            padding: '12px 16px',
            marginBottom: 20,
            fontFamily: SOURCE,
            fontSize: 13,
            color: NAVY,
            borderRadius: 4,
            lineHeight: 1.5,
          }}
        >
          <strong>⚠ Married Filing Separately:</strong> MFS typically results in the highest tax. However, it may protect you from liability for your spouse's tax errors.
        </div>
      )}

      {/* Output 2: Tax Savings Summary */}
      {bestOption && worstEligible && (
        <div
          style={{
            backgroundColor: PARCHMENT,
            border: `1px solid ${GOLD}`,
            borderRadius: 8,
            padding: '16px 20px',
            marginBottom: 20,
            fontFamily: SOURCE,
            fontSize: 15,
            color: NAVY,
            lineHeight: 1.55,
          }}
        >
          {maxSavings < 500 ? (
            <span>Your filing status options produce similar tax outcomes — the difference is less than $500.</span>
          ) : (
            <span>
              <strong>{STATUS_LABELS[bestOption]}</strong> would result in{' '}
              <strong style={{ color: GREEN }}>{fmtCurrency(maxSavings)}</strong> less in federal taxes compared to{' '}
              <strong>{STATUS_LABELS[worstEligible[0]]}</strong>.
            </span>
          )}
        </div>
      )}

      {/* Output 3: Dec 31 Rule card */}
      <div
        style={{
          borderLeft: `3px solid ${NAVY}`,
          backgroundColor: PARCHMENT,
          padding: 16,
          marginBottom: 20,
          borderRadius: 4,
        }}
      >
        <h4
          style={{
            fontFamily: SOURCE,
            fontWeight: 600,
            fontSize: 16,
            color: NAVY,
            margin: '0 0 8px',
          }}
        >
          The December 31 Rule
        </h4>
        <p style={{ fontFamily: SOURCE, fontSize: 14, color: NAVY, margin: 0, lineHeight: 1.55 }}>
          Your marital status on December 31 determines your filing status for the entire year. A divorce finalized December 30 vs. January 2 can mean thousands of dollars in tax differences.
        </p>
      </div>

      {/* Abandoned spouse prompt */}
      {abandonedSpouseTriggered && (
        <div
          style={{
            borderLeft: `4px solid ${GOLD}`,
            backgroundColor: '#FBF4E3',
            padding: '12px 16px',
            marginBottom: 20,
            fontFamily: SOURCE,
            fontSize: 14,
            color: NAVY,
            borderRadius: 4,
            lineHeight: 1.55,
          }}
        >
          You may qualify as an "abandoned spouse" under IRC §7703(b). This means you can file as Head of Household even while legally married — typically resulting in lower taxes than Married Filing Separately.
        </div>
      )}

      {/* Output 4: Bar chart */}
      <div
        style={{
          backgroundColor: WHITE,
          border: '1px solid #E5E7EB',
          borderRadius: 8,
          padding: '20px 16px',
          marginBottom: 24,
        }}
      >
        <h3
          style={{
            fontFamily: PLAYFAIR,
            fontWeight: 700,
            fontSize: 18,
            color: NAVY,
            margin: '0 0 12px',
          }}
        >
          Net Federal Tax by Filing Status
        </h3>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={chartData} margin={{ top: 16, right: 16, bottom: 16, left: 8 }}>
            <XAxis dataKey="name" tick={{ fontFamily: SOURCE, fontSize: 13, fill: NAVY }} />
            <YAxis
              tickFormatter={(v) => fmtCurrency(v)}
              tick={{ fontFamily: SOURCE, fontSize: 12, fill: NAVY }}
              width={80}
            />
            <Tooltip
              formatter={(value) => [fmtCurrency(value), 'Net Tax']}
              contentStyle={{ fontFamily: SOURCE, fontSize: 13 }}
            />
            <Bar dataKey="netTax" radius={[4, 4, 0, 0]}>
              {chartData.map((entry) => (
                <Cell key={entry.status} fill={entry.fill} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

    </div>
  );
}
