'use client';

import { useEffect, useState } from 'react';
import { useM5Store } from '@/src/stores/m5Store';
import { useM3Store } from '@/src/stores/m3Store';
import {
  prePopulateSupportEstimatorInputs,
  isInputsFreshDefault,
} from '@/src/stores/prePopulate';
import { calculateSupport } from '@/src/lib/supportEstimator';
import { InputsPanel } from './inputs/InputsPanel.jsx';
import ResultsPanel from './ResultsPanel.jsx';
import { Banner } from './inputs/_fields.jsx';
import WizardCheckbox from '@/src/components/wizard/WizardCheckbox';
import {
  NAVY, GOLD, WHITE, SOURCE,
} from './_styles.js';
import {
  numericVA, factorTestZero, capHitNY, genericFallback,
  highEarnerCustodial, prePopBadge,
} from './__fixtures__';

const SP3_USER_MESSAGE =
  "Equal parenting time isn't supported at v1 — please enter different overnight " +
  "counts for each party (e.g., 183/182 for a near-50/50 split). Future updates " +
  "will support equal-custody calculations.";

const GENERIC_CALC_ERROR =
  'An error occurred calculating support. Please verify your inputs and try again. ' +
  'If the issue persists, the inputs may be in an unsupported configuration.';

const PARTY_FRAMING_KEY = 'clearpath:partyFraming';

function deriveGross(party) {
  if (!party) return 0;
  return party.imputeIncome ? (party.imputedEarningCapacity ?? 0) : (party.grossMonthly ?? 0);
}

// Mirrors calculateSupport.js custodial-derivation logic. Lives here so the
// orchestrator can detect high-earner-custodial without re-running the engine
// and without breaking the engine's pure-function contract.
function deriveHighEarnerIsCustodial(inputs) {
  if (!inputs?.partyA || !inputs?.partyB) return false;
  const aGross = deriveGross(inputs.partyA);
  const bGross = deriveGross(inputs.partyB);
  const payorIsPartyA = aGross >= bGross;
  let custodialIsPartyA;
  if (inputs.state === 'NY' && inputs.nyCustodyConfig) {
    custodialIsPartyA =
      (inputs.nyCustodyConfig === 'kids_with_payor' || inputs.nyCustodyConfig === 'shared')
        ? payorIsPartyA
        : !payorIsPartyA;
  } else {
    const pntA = inputs.partyA?.parentingTimeNights ?? 0;
    const pntB = inputs.partyB?.parentingTimeNights ?? 0;
    if (pntA === pntB) return false;
    custodialIsPartyA = pntA > pntB;
  }
  return payorIsPartyA === custodialIsPartyA;
}

function mapPrePopSources(raw) {
  if (!raw) return undefined;
  const a = raw['partyA.grossMonthly'] || null;
  const b = raw['partyB.grossMonthly'] || null;
  if (!a && !b) return undefined;
  return { partyA: a, partyB: b };
}

function deriveVariant(results, inputs, rawPrePopSources) {
  if (!results) return 'placeholder';
  if (inputs?.state === 'OTHER') return 'generic_fallback';
  if (results.spousalCalc?.cap?.hit) return 'cap_hit';
  if (results.spousalCalc?.factorTestApplies && results.combinedMonthly === 0) {
    return 'factor_test_zero';
  }
  if ((inputs?.numChildren ?? 0) > 0 && deriveHighEarnerIsCustodial(inputs)) {
    return 'high_earner_custodial';
  }
  if (mapPrePopSources(rawPrePopSources)) return 'pre_pop';
  return 'numeric';
}

function buildResultsPanelData(results, inputs, rawPrePopSources) {
  if (!results) return null;
  const reverseChildFlow =
    (inputs?.numChildren ?? 0) > 0 && deriveHighEarnerIsCustodial(inputs);
  return {
    combinedMonthly: reverseChildFlow ? results.spousalMonthly : results.combinedMonthly,
    childMonthly: reverseChildFlow ? null : results.childMonthly,
    spousalMonthly: results.spousalMonthly,
    metadata: {
      ...results.metadata,
      parties: {
        a: {
          name: inputs?.partyA?.name || 'Party A',
          gross: deriveGross(inputs?.partyA),
        },
        b: {
          name: inputs?.partyB?.name || 'Party B',
          gross: deriveGross(inputs?.partyB),
        },
      },
      prePopSources: mapPrePopSources(rawPrePopSources),
      stateName: inputs?.stateName,
      reverseChildFlow,
    },
    breakdown: results.breakdown ?? { callouts: [], perStepNarrative: [] },
  };
}

// ─── Dev-only seeders ──────────────────────────────────────────────────────
// `?seed=<variant>` URL param populates m5Store with fixture-derived inputs
// + faked results to trigger that variant without exercising the calc engine.
// Eliminated from production via NODE_ENV gate; intended for visual-iteration
// against the /dev/m5-support-estimator route.

const SEED_PARTY_BASE = {
  grossMonthly: null,
  imputeIncome: false,
  imputedEarningCapacity: null,
  healthInsurance: 0,
  childcare: 0,
  parentingTimeNights: 0,
  otherSupportObligations: 0,
};

function spousalCalcStub(overrides = {}) {
  return { factorTestApplies: false, cap: { hit: false }, ...overrides };
}

// Wraps a fixture (presentation shape) in the engine output shape so deriveVariant
// can read spousalCalc flags. The `formulaId` and timestamp are stub values; the
// metadata otherwise comes from the fixture (parties, stateName, etc.).
function makeSeedResults(fixture, spousalCalcOverrides) {
  return {
    combinedMonthly: fixture.combinedMonthly,
    childMonthly: fixture.childMonthly,
    spousalMonthly: fixture.spousalMonthly,
    spousalCalc: spousalCalcStub(spousalCalcOverrides),
    childCalc: null,
    alimonyFirstOrderingApplied: false,
    adjustedIncomes: null,
    metadata: {
      ...fixture.metadata,
      formulaId: 'seed.dev',
      calculationTimestamp: new Date().toISOString(),
    },
    breakdown: fixture.breakdown,
  };
}

const SEEDS = {
  placeholder: () => ({
    inputs: null,
    results: null,
    prePopSources: null,
  }),

  numeric: () => ({
    inputs: {
      partyA: { ...SEED_PARTY_BASE, grossMonthly: 8400, parentingTimeNights: 115 },
      partyB: { ...SEED_PARTY_BASE, grossMonthly: 3200, parentingTimeNights: 250 },
      numChildren: 2,
      state: 'VA',
      marriageLengthYears: 10,
      nyCustodyConfig: null,
      temporal: 'post_divorce',
      depth: 'standard',
      caseEffectiveDate: null,
      fullWorksheet: null,
    },
    results: makeSeedResults(numericVA),
    prePopSources: null,
  }),

  factor_test_zero: () => ({
    inputs: {
      partyA: { ...SEED_PARTY_BASE, grossMonthly: 8400, parentingTimeNights: 183 },
      partyB: { ...SEED_PARTY_BASE, grossMonthly: 3200, parentingTimeNights: 182 },
      numChildren: 0,
      state: 'VA',
      marriageLengthYears: 10,
      nyCustodyConfig: null,
      temporal: 'post_divorce',
      depth: 'standard',
      caseEffectiveDate: null,
      fullWorksheet: null,
    },
    results: makeSeedResults(factorTestZero, { factorTestApplies: true }),
    prePopSources: null,
  }),

  cap_hit: () => ({
    inputs: {
      partyA: { ...SEED_PARTY_BASE, grossMonthly: 24000, parentingTimeNights: 100 },
      partyB: { ...SEED_PARTY_BASE, grossMonthly: 6000, parentingTimeNights: 265 },
      numChildren: 2,
      state: 'NY',
      marriageLengthYears: 16,
      nyCustodyConfig: 'kids_with_payee',
      temporal: 'post_divorce',
      depth: 'full_worksheet',
      caseEffectiveDate: null,
      fullWorksheet: null,
    },
    results: makeSeedResults(capHitNY, { cap: { hit: true } }),
    prePopSources: null,
  }),

  generic_fallback: () => ({
    inputs: {
      partyA: { ...SEED_PARTY_BASE, grossMonthly: 7200, parentingTimeNights: 115 },
      partyB: { ...SEED_PARTY_BASE, grossMonthly: 2800, parentingTimeNights: 250 },
      numChildren: 2,
      state: 'OTHER',
      stateName: 'Texas',
      marriageLengthYears: 10,
      nyCustodyConfig: null,
      temporal: 'post_divorce',
      depth: 'standard',
      caseEffectiveDate: null,
      fullWorksheet: null,
    },
    results: makeSeedResults(genericFallback),
    prePopSources: null,
  }),

  high_earner_custodial: () => ({
    inputs: {
      partyA: { ...SEED_PARTY_BASE, grossMonthly: 18000, parentingTimeNights: 265 },
      partyB: { ...SEED_PARTY_BASE, grossMonthly: 4200, parentingTimeNights: 100 },
      numChildren: 1,
      state: 'NY',
      marriageLengthYears: 14,
      nyCustodyConfig: 'kids_with_payor',
      temporal: 'post_divorce',
      depth: 'full_worksheet',
      caseEffectiveDate: null,
      fullWorksheet: null,
    },
    results: makeSeedResults(highEarnerCustodial),
    prePopSources: null,
  }),

  pre_pop: () => ({
    inputs: {
      partyA: { ...SEED_PARTY_BASE, grossMonthly: 8400, parentingTimeNights: 115 },
      partyB: { ...SEED_PARTY_BASE, grossMonthly: 3200, parentingTimeNights: 250 },
      numChildren: 2,
      state: 'VA',
      marriageLengthYears: 10,
      nyCustodyConfig: null,
      temporal: 'post_divorce',
      depth: 'standard',
      caseEffectiveDate: null,
      fullWorksheet: null,
    },
    results: makeSeedResults(prePopBadge),
    prePopSources: {
      'partyA.grossMonthly': 'Pay Stub Decoder',
      'partyB.grossMonthly': null,
    },
  }),
};

function getSeedNameFromUrl() {
  if (typeof window === 'undefined') return null;
  if (process.env.NODE_ENV === 'production') return null;
  const seed = new URLSearchParams(window.location.search).get('seed');
  return seed && SEEDS[seed] ? seed : null;
}

export function SupportEstimator({ disablePrePop = false }) {
  const inputs = useM5Store((s) => s.supportEstimator.inputs);
  const results = useM5Store((s) => s.supportEstimator.results);
  const prePopSources = useM5Store((s) => s.supportEstimator._prePopSources);
  const replaceInputs = useM5Store((s) => s.replaceSupportEstimatorInputs);
  const setPrePopSources = useM5Store((s) => s.setSupportEstimatorPrePopSources);
  const setResults = useM5Store((s) => s.setSupportEstimatorResults);

  // Select the primitive field directly to get a stable reference across renders.
  // Returning a new object literal from the selector would cause Zustand's snapshot
  // comparison to always report "changed" → infinite re-render loop.
  const payStubDecoder = useM3Store((s) => s.payStubDecoder);

  const [calcError, setCalcError] = useState(null);

  // partyFraming: 'abstract' (Party A/B) or 'persona' (You / your spouse).
  // Persists in sessionStorage; localStorage is not used (no personal-data persistence).
  const [partyFraming, setPartyFraming] = useState('abstract');
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const saved = window.sessionStorage.getItem(PARTY_FRAMING_KEY);
    if (saved === 'persona' || saved === 'abstract') setPartyFraming(saved);
  }, []);
  useEffect(() => {
    if (typeof window === 'undefined') return;
    window.sessionStorage.setItem(PARTY_FRAMING_KEY, partyFraming);
  }, [partyFraming]);

  // Dev-only seed loader. Reads ?seed=<variant> from URL on mount and applies
  // SEEDS[variant] to the store. Eliminated from production by NODE_ENV gate.
  useEffect(() => {
    const seedName = getSeedNameFromUrl();
    if (!seedName) return;
    const seed = SEEDS[seedName]();
    useM5Store.setState((state) => ({
      supportEstimator: {
        ...state.supportEstimator,
        ...(seed.inputs ? { inputs: seed.inputs } : {}),
        results: seed.results,
        _prePopSources: seed.prePopSources,
      },
    }));
    setCalcError(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // One-time pre-pop on mount, per §6.2 — gated by isInputsFreshDefault and
  // skipped when a dev seed is active (seed manages the store directly).
  useEffect(() => {
    if (disablePrePop) return;
    if (getSeedNameFromUrl()) return;
    if (isInputsFreshDefault(inputs)) {
      const pre = prePopulateSupportEstimatorInputs({
        m1Store: null,
        m2Store: null,
        m3Store: { payStubDecoder },
      });
      if (pre._prePopSources['partyA.grossMonthly']) {
        replaceInputs(pre.inputs);
        setPrePopSources(pre._prePopSources);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // SP-3 violation detector — mirrors calc engine throw condition from §6.3.1 STEP 0b.
  const sp3Violation =
    inputs.numChildren > 0 &&
    (inputs.state !== 'NY' || inputs.nyCustodyConfig == null) &&
    (inputs.partyA?.parentingTimeNights ?? 0) === (inputs.partyB?.parentingTimeNights ?? 0);

  const handleCalculate = () => {
    setCalcError(null);
    try {
      const result = calculateSupport(inputs);
      setResults(result);
    } catch (err) {
      // Translate dev-facing throws to user-friendly copy. Never leak raw err.message.
      const msg = err?.message ?? '';
      if (msg.includes('ambiguous custodial parent')) {
        setCalcError(SP3_USER_MESSAGE);
      } else {
        setCalcError(GENERIC_CALC_ERROR);
      }
    }
  };

  const canCalculate = !sp3Violation;
  const variant = deriveVariant(results, inputs, prePopSources);
  const data = buildResultsPanelData(results, inputs, prePopSources);

  return (
    <div
      style={{
        fontFamily: SOURCE,
        backgroundColor: WHITE,
        padding: 24,
        maxWidth: 880,
        margin: '0 auto',
      }}
    >
      <header style={{ marginBottom: 24 }}>
        <h2
          style={{
            fontFamily: '"Playfair Display", Georgia, serif',
            fontSize: 28, fontWeight: 700,
            color: NAVY, margin: '0 0 6px',
          }}
        >
          Support Estimator
        </h2>
        <p style={{ fontSize: 14, color: '#6B7280', margin: 0 }}>
          Estimates combined monthly child and spousal support for state-specific guidelines
          (VA, MD, DC, NY, CA) with national approximation fallback.
        </p>
      </header>

      {calcError && (
        <Banner variant="red">
          <strong>Cannot calculate: </strong>{calcError}
        </Banner>
      )}

      <InputsPanel sp3Violation={sp3Violation} />

      <div
        style={{
          marginTop: 20, marginBottom: 16,
          display: 'flex', flexWrap: 'wrap', alignItems: 'center',
          gap: 16, justifyContent: 'space-between',
        }}
      >
        <button
          type="button"
          onClick={handleCalculate}
          disabled={!canCalculate}
          style={{
            flex: '1 1 280px',
            maxWidth: 320,
            padding: '14px 28px',
            fontFamily: SOURCE,
            fontWeight: 700,
            fontSize: 16,
            color: NAVY,
            backgroundColor: canCalculate ? GOLD : '#E5E7EB',
            border: 'none',
            borderRadius: 8,
            cursor: canCalculate ? 'pointer' : 'not-allowed',
            letterSpacing: 0.3,
          }}
        >
          Calculate support estimate
        </button>

        <WizardCheckbox
          label={'Use “You” / “your spouse”'}
          field="partyFraming"
          value={partyFraming === 'persona'}
          onChange={(_, v) => setPartyFraming(v ? 'persona' : 'abstract')}
          variant="checkbox"
          data-testid="party-framing"
        />
      </div>

      {!canCalculate && (
        <p style={{ fontSize: 13, color: '#6B7280', margin: '0 0 16px' }}>
          Resolve the parenting-time error above to enable calculation.
        </p>
      )}

      <div style={{ marginTop: 8 }}>
        <ResultsPanel
          data={data}
          variant={variant}
          partyFraming={partyFraming}
          defaultMathOpen={false}
        />
      </div>
    </div>
  );
}

export default SupportEstimator;
