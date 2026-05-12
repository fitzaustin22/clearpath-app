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
import { ResultsPanel } from './ResultsPanel.jsx';
import { Banner } from './inputs/_fields.jsx';
import {
  NAVY, GOLD, PARCHMENT, WHITE, SOURCE, BORDER,
} from './_styles.js';

const SP3_USER_MESSAGE =
  "Equal parenting time isn't supported at v1 — please enter different overnight " +
  "counts for each party (e.g., 183/182 for a near-50/50 split). Future updates " +
  "will support equal-custody calculations.";

const GENERIC_CALC_ERROR =
  'An error occurred calculating support. Please verify your inputs and try again. ' +
  'If the issue persists, the inputs may be in an unsupported configuration.';

export function SupportEstimator({ disablePrePop = false }) {
  const inputs = useM5Store((s) => s.supportEstimator.inputs);
  const results = useM5Store((s) => s.supportEstimator.results);
  const replaceInputs = useM5Store((s) => s.replaceSupportEstimatorInputs);
  const setPrePopSources = useM5Store((s) => s.setSupportEstimatorPrePopSources);
  const setResults = useM5Store((s) => s.setSupportEstimatorResults);

  // Select the primitive field directly to get a stable reference across renders.
  // Returning a new object literal from the selector would cause Zustand's snapshot
  // comparison to always report "changed" → infinite re-render loop.
  const payStubDecoder = useM3Store((s) => s.payStubDecoder);

  const [calcError, setCalcError] = useState(null);

  // One-time pre-pop on mount, per §6.2 — gated by isInputsFreshDefault.
  useEffect(() => {
    if (disablePrePop) return;
    if (isInputsFreshDefault(inputs)) {
      const pre = prePopulateSupportEstimatorInputs({
        m1Store: null,
        m2Store: null,
        m3Store: { payStubDecoder },
      });
      // Only commit when we actually have a non-null source.
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

      <div style={{ marginTop: 20, marginBottom: 24 }}>
        <button
          type="button"
          onClick={handleCalculate}
          disabled={!canCalculate}
          style={{
            width: '100%',
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
        {!canCalculate && (
          <p style={{ fontSize: 13, color: '#6B7280', margin: '8px 0 0' }}>
            Resolve the parenting-time error above to enable calculation.
          </p>
        )}
      </div>

      <ResultsPanel results={results} inputs={inputs} />
    </div>
  );
}

export default SupportEstimator;
