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
