/**
 * A1 recomputers (spec §4-A1, Phase 2). Each function INDEPENDENTLY re-derives a
 * pinned audit value from the fixture's source-of-truth JSON (never from store
 * state, never from the engine's seeded output) and returns it rounded to the
 * pin's value class (D-V2-5). Importable production engines are CALLED with
 * re-derived inputs (PVA, support, HDA/§121, coverture); the three engines that
 * are component- or store-internal with no headless entry (FSO tax, M3 pay-stub
 * round2 chain, M1 budget-gap, M1 readiness classify) are faithfully replicated
 * from the verbatim source formulas, anchored on the engines' exported data
 * (TAX_BRACKETS, DEFAULT_DEDUCTIONS, PAY_FREQUENCY_DEFAULTS) where it exists.
 *
 * Derivations of record: docs/verification/V2-proposed-pins-memo-2026-06-12.md.
 */
import { LIABILITY_KEYS } from '@/src/lib/m2Sections';
import { calculatePensionValue } from '@/src/lib/pensionValuation';
import { calculateSupport } from '@/src/lib/supportEstimator';
import { aamlDurationGuidance } from '@/src/lib/supportGuidelines/aaml-spousal';
import { calculateHomeDecision } from '@/src/lib/homeDecision';
import { analyzeTranche, intrinsicValue } from '@/src/lib/coverture/coverture';
import { TAX_BRACKETS } from '@/src/components/m4/FilingStatusOptimizer';
import { DEFAULT_DEDUCTIONS, PAY_FREQUENCY_DEFAULTS } from '@/src/stores/m3Store';

// ── D-V2-5 rounding by value class ──────────────────────────────────────────
const round0 = (n) => Math.round(n); // whole-dollar (currency_projection / actual integers)
const round2 = (n) => Math.round(n * 100) / 100; // cents
const round4 = (n) => Math.round(n * 10000) / 10000; // coverture fraction (4dp)

// ── fixture readers ─────────────────────────────────────────────────────────
const m1 = (f) => f.stores?.['m1-store'] ?? {};
const m3 = (f) => f.stores?.['clearpath-m3-store'] ?? {};
const m4 = (f) => f.stores?.['clearpath-m4'] ?? {};
const m5 = (f) => f.stores?.['clearpath-m5'] ?? {};
const bp = (f) => f.stores?.['clearpath-blueprint'] ?? {};

/**
 * Valuation/preparation year, from the fixture's caseEffectiveDate — the
 * deterministic, fixture-faithful basis for §121 year-granularity ownership
 * (NOT wall-clock new Date().getFullYear(), which seedFixtureStores uses and
 * which would make the F3 §121-partial pin time-dependent). caseEffectiveDate
 * lives on the support estimator and on each pension asset; default 2026.
 */
function valuationYear(f) {
  const fromSupport = m5(f).supportEstimator?.inputs?.caseEffectiveDate;
  const assets = m5(f).pensionValuation?.assets ?? {};
  const fromPension = Object.values(assets)[0]?.inputs?.caseEffectiveDate;
  const ced = fromSupport || fromPension;
  const y = ced ? Number(String(ced).slice(0, 4)) : NaN;
  return Number.isFinite(y) ? y : 2026;
}

// ── §3 inventory asset footing (assets incl. personal property; liabilities excluded) ──
export function recomputeInventoryAssetFooting(fixture) {
  const m2 = fixture.stores?.['m2-store'] ?? {};
  const ppi = m2.personalPropertyInventory;
  let total = 0;
  for (const item of m2.maritalEstateInventory?.items ?? []) {
    if (LIABILITY_KEYS.has(item.category)) continue;
    total += Number(item.currentValue) || 0;
  }
  for (const room of ppi?.rooms ?? []) {
    for (const item of room.items ?? []) total += (Number(item.currentValue) || 0) * (item.quantity || 1);
  }
  for (const item of ppi?.highValueItems ?? []) total += (Number(item.currentValue) || 0) * (item.quantity || 1);
  return total;
}

// ── PVA (call calculatePensionValue with re-derived inputs) ─────────────────
const PVA_FLAG_ONLY_PLAN_TYPES = new Set(['multi_employer', 'gov_civilian', 'military', 'state_municipal']);
// Mirrors PVA.jsx routing R1–R6 (also mirrored in seedFixtureStores.mirrorResolvePvaPath).
function resolvePvaPath(inputs) {
  if (PVA_FLAG_ONLY_PLAN_TYPES.has(inputs.planType)) return 'flag_only';
  if (inputs.planType === 'private_db_cash_balance') return 'cash_balance';
  if (inputs.accrualStatus === 'in_pay_status') return 'in_pay_status';
  if (inputs.tierOverride) return inputs.tierOverride;
  return inputs.accrualStatus === 'frozen' ? 'tier_1' : 'tier_3';
}
function pvaResult(fixture) {
  const assets = m5(fixture).pensionValuation?.assets ?? {};
  const slot = Object.values(assets)[0];
  if (!slot?.inputs) return null;
  const path = resolvePvaPath(slot.inputs);
  return calculatePensionValue({
    ...slot.inputs,
    path,
    _frozenRoutingApplied: slot.inputs.accrualStatus === 'frozen',
  });
}
// pv.total.best — PV at base segment rate (F1 tier-3).
export function recomputePensionPVAtBaseSegmentRate(fixture) {
  return round0(pvaResult(fixture).pv.total.best);
}
// pv.marital.best — marital-share PV (F1 tier-3) AND cash-balance passthrough marital (F3).
export function recomputeMaritalPVBest(fixture) {
  return round0(pvaResult(fixture).pv.marital.best);
}
// coverture.fraction (4dp) — F1 tier-3 (0.6204) AND F3 cash-balance (0.05).
export function recomputeCovertureFraction(fixture) {
  return round4(pvaResult(fixture).coverture.fraction);
}
// ±100bp sensitivity on the marital leg (F3 cash-balance: degenerate low=high=best).
export function recomputeSensitivityMaritalLow(fixture) {
  return round0(pvaResult(fixture).pv.marital.low);
}
export function recomputeSensitivityMaritalHigh(fixture) {
  return round0(pvaResult(fixture).pv.marital.high);
}

// ── Support estimator (call calculateSupport with re-derived inputs) ────────
function supportResult(fixture) {
  const inputs = m5(fixture).supportEstimator?.inputs;
  return inputs ? calculateSupport(inputs) : null;
}
export function recomputeMdAamlSupportFigure(fixture) {
  return round0(supportResult(fixture).spousalMonthly);
}
// DC above-cap Builta/Holland extrapolation: MONTHLY, conversion-site Math.round
// (engine surfaces the raw annual/12 = 3862.98…; the rendered monthly is rounded).
export function recomputeBuiltaExtrapolatedFigure(fixture) {
  return round0(supportResult(fixture).childCalc.hollandExtrapolation);
}
// Categorical: AAML duration band LABEL — read directly from the classifier
// (the calculateSupport result carries only numeric minMonths/maxMonths).
export function recomputeMdAamlDurationBand(fixture) {
  return aamlDurationGuidance(m5(fixture).supportEstimator.inputs.marriageLengthYears).label;
}

// ── HDA / §121 (call calculateHomeDecision with re-derived inputs) ──────────
function hdaResult(fixture) {
  const hda = m5(fixture).homeDecision?.inputs;
  if (!hda) return null;
  const b = bp(fixture);
  const primaryResidence = (b.costBasisEntries ?? []).find((e) => e?.isPrimaryResidence);
  const interim = hda.interimCostSharePct == null ? 0.5 : hda.interimCostSharePct * 0.01;
  return calculateHomeDecision(
    {
      ...hda,
      interimCostSharePct: interim,
      costBasis: primaryResidence?.costBasis ?? 0,
      costBasisFilingStatus: b.costBasisFilingStatus ?? null,
      currentYear: valuationYear(fixture),
    },
    { stressTest: !!hda.stressTestUserPays100Pct },
  );
}
export function recomputeHdaScenarioBNetProceedsAfter121(fixture) {
  return round0(hdaResult(fixture).scenarios.sellNow.metadata.saleProceedsNet);
}
export function recomputeS121PartialExclusionAmount(fixture) {
  return round0(hdaResult(fixture).scenarios.sellNow.section121.excludedAmount);
}

// ── DCA coverture (pure engine, PER-TRANCHE — pins isolate the unvested-at-
//    separation tranche; the store metadata holds grant TOTALS, not these). ──
function rsuDivergentTranche(fixture) {
  const stubs = bp(fixture).deferredCompStubs ?? [];
  for (const replay of fixture.replays?.dcaAnalyses ?? []) {
    const stub = stubs.find((s) => s.id === replay.stubId);
    if (!stub || stub.strikePrice != null) continue; // RSU only (strikePrice null)
    const analysis = replay.analysis;
    const sep = new Date(analysis.separationDate).getTime();
    const tranche = (analysis.tranches ?? []).find((t) => new Date(t.vestDate).getTime() > sep);
    if (!tranche) continue;
    const r = analyzeTranche(tranche, analysis);
    return {
      hug: intrinsicValue(r.hug.maritalShares, analysis.fmv, stub.strikePrice),
      nelson: intrinsicValue(r.nelson.maritalShares, analysis.fmv, stub.strikePrice),
    };
  }
  return null;
}
export function recomputeHugTrancheValue(fixture) {
  return round0(rsuDivergentTranche(fixture).hug);
}
export function recomputeNelsonTrancheValue(fixture) {
  return round0(rsuDivergentTranche(fixture).nelson);
}

// ── FSO (component-internal engine; replicate, anchored on exported TAX_BRACKETS) ──
const STANDARD_DEDUCTIONS = { single: 16100, mfj: 32200, mfs: 16100, hoh: 24150 };
const CHILD_TAX_CREDIT = 2200;
function progressiveTax(taxableIncome, brackets) {
  let tax = 0;
  for (const b of brackets) {
    if (taxableIncome <= b.min) break;
    tax += (Math.min(taxableIncome, b.max) - b.min) * b.rate;
  }
  return round2(tax);
}
function fsoEligibility(i) {
  const divorced = i.divorceTimeline === 'beforeDec31';
  const notSure = i.divorceTimeline === 'notSure';
  const abandonedSpouse =
    i.hasQualifyingChild && i.paidMoreThanHalfHouseholdCosts && i.separatedLastSixMonths;
  return {
    mfj: !divorced,
    mfs: !divorced,
    single: divorced || notSure,
    hoh: (divorced && i.hasQualifyingChild && i.paidMoreThanHalfHouseholdCosts) || abandonedSpouse || notSure,
  };
}
export function recomputeFsoFilingStatusDelta(fixture) {
  const i = m4(fixture).filingStatusOptimizer?.inputs;
  const gross = Number(i.grossAnnualIncome) || 0;
  const spouse = Number(i.spouseGrossAnnualIncome) || 0;
  const other = Number(i.otherIncome) || 0;
  const dependents = Number(i.dependents) || 0;
  const combined = gross + spouse + other;
  const taxableFor = (status) => {
    const ti =
      status === 'mfj'
        ? combined - STANDARD_DEDUCTIONS.mfj
        : gross + other / 2 - STANDARD_DEDUCTIONS[status];
    return Math.max(0, ti);
  };
  const netTaxFor = (status) => {
    const fed = progressiveTax(taxableFor(status), TAX_BRACKETS[status]);
    const ctc = status === 'mfs' ? 0 : dependents * CHILD_TAX_CREDIT;
    return Math.max(0, fed - ctc);
  };
  const eligible = fsoEligibility(i);
  const netTaxes = Object.keys(eligible)
    .filter((s) => eligible[s])
    .map((s) => netTaxFor(s))
    .sort((a, b) => a - b);
  return round0(netTaxes[netTaxes.length - 1] - netTaxes[0]); // worst-eligible − best-eligible
}

// ── M3 pay-stub take-home (store-action engine; replicate the round2 chain) ──
const VOLUNTARY_DEDUCTION_IDS = new Set(
  DEFAULT_DEDUCTIONS.filter((d) => d.isVoluntary).map((d) => d.id),
);
export function recomputeS2NetIncomeDerivationFromPayStub(fixture) {
  const psd = m3(fixture).payStubDecoder?.inputs;
  const paychecks = psd.useCustomPaychecks ? psd.paychecksPerYear : PAY_FREQUENCY_DEFAULTS[psd.payFrequency];
  const grossMonthly = round2((Number(psd.grossPayPerCheck) || 0) * paychecks / 12);
  let required = 0;
  let voluntary = 0;
  for (const d of psd.deductions ?? []) {
    const monthly = round2((Number(d.perPaycheck) || 0) * paychecks / 12);
    if (VOLUNTARY_DEDUCTION_IDS.has(d.id)) voluntary += monthly;
    else required += monthly;
  }
  const requiredMonthly = round2(required);
  const voluntaryMonthly = round2(voluntary);
  const totalDeductionsMonthly = round2(requiredMonthly + voluntaryMonthly);
  const netMonthly = round2(grossMonthly - totalDeductionsMonthly);
  return round2(netMonthly + voluntaryMonthly); // takeHomePay (= the §2 net figure)
}

// ── M1 budget gap (component-internal; replicate) ───────────────────────────
function convertToMonthly(gross, freq) {
  if (!gross || gross <= 0) return 0;
  switch (freq) {
    case 'weekly':
      return (gross * 52) / 12;
    case 'biweekly':
      return (gross * 26) / 12;
    case 'semimonthly':
      return gross * 2;
    default:
      return gross;
  }
}
const BUDGET_EXPENSE_KEYS = ['housing', 'utilities', 'groceries', 'transportation', 'healthInsurance', 'childcare', 'debtPayments', 'personal'];
export function recomputeBudgetGapMonthlyFigure(fixture) {
  const inputs = m1(fixture).budgetGap?.inputs ?? {};
  const monthlyGross = convertToMonthly(Number(inputs.grossIncome) || 0, inputs.payFrequency || 'monthly');
  const adjusted = monthlyGross * ((inputs.expectedShare ?? 50) / 100);
  let total = 0;
  for (const k of BUDGET_EXPENSE_KEYS) total += Number(inputs[k]) || 0;
  return round2(adjusted - total);
}

// ── M1 readiness tier (component-internal classify; replicate) ──────────────
export function recomputeReadinessTierBoundaryValue(fixture) {
  const answers = m1(fixture).readinessAssessment?.answers ?? [];
  const totalScore = answers.reduce((s, a) => s + (Number(a.score) || 0), 0);
  if (totalScore <= 10) return 'exploring';
  if (totalScore <= 20) return 'preparing';
  return 'ready';
}
