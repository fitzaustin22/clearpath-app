// src/lib/supportRange/prefill.js
//
// Pure prefill for the Support Estimator wizard. Snapshots are passed in (no
// store imports) so this stays unit-testable and leaves src/stores/prePopulate.js
// untouched. incomeYou ← M3 Pay Stub Decoder gross MONTHLY; incomeSpouse ← M4
// Filing Status Optimizer spouse gross ANNUAL ÷ 12 (only when > 0).

export function makeInitialSupportRangeInputs() {
  return {
    region: 'MD',
    incomeYou: '',
    incomeSpouse: '',
    numChildren: '2',
    parentingPct: 65,
    childcare: '',
    health: '',
    marriageYears: '',
    existingSupport: '',
  };
}

export function prePopulateSupportRange({ m3, m4 } = {}) {
  const inputs = makeInitialSupportRangeInputs();
  const sources = { incomeYou: null, incomeSpouse: null };

  const youMonthly = m3?.payStubDecoder?.results?.grossMonthlyIncome;
  if (Number.isFinite(youMonthly) && youMonthly > 0) {
    inputs.incomeYou = String(Math.round(youMonthly));
    sources.incomeYou = { label: 'from M3 Pay Stub Decoder', source: 'm3.payStubDecoder' };
  }

  const spouseAnnual = m4?.filingStatusOptimizer?.inputs?.spouseGrossAnnualIncome;
  if (Number.isFinite(spouseAnnual) && spouseAnnual > 0) {
    inputs.incomeSpouse = String(Math.round(spouseAnnual / 12));
    sources.incomeSpouse = { label: 'from M4 Filing Status Optimizer', source: 'm4.filingStatusOptimizer' };
  }

  return { inputs, sources };
}

export function isSupportRangeFreshDefault(inputs) {
  const d = makeInitialSupportRangeInputs();
  return Object.keys(d).every((k) => inputs?.[k] === d[k]);
}
