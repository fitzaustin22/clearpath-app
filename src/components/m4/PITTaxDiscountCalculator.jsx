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
