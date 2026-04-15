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
    } else {
      setM2Banner(null);
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
    } else {
      setTool1Banner(null);
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
        <Panel1TaxDiscount results={results} inputs={inputs} />
        {/* PANEL-2 */}
        {/* PANEL-3 */}
        {/* PANEL-4 */}
        {/* PANEL-5 */}
      </div>

      {/* Print button + disclaimer + print stylesheet — filled in Task 10 */}
    </div>
  );
}

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
