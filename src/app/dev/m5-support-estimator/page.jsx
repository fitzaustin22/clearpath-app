'use client';

// Dev-only route — force-dynamic to avoid Next.js static-rendering Suspense
// requirement for useSearchParams. No production performance impact since
// this route is not consumer-facing.
export const dynamic = 'force-dynamic';

import { Suspense, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { useM5Store } from '@/src/stores/m5Store';
import { SupportEstimator } from '@/src/components/m5/SupportEstimator/SupportEstimator';

// Each scenario seeds m5Store.supportEstimator.inputs. Partial keys override
// defaults; the buildScenario helper fills the rest from the §6.5.1 shape.
const SCENARIOS = {
  // VA Standard: payor $5K, payee $3K, 2 kids, post-divorce, asymmetric custody
  'va-baseline': {
    partyA: { grossMonthly: 5000, parentingTimeNights: 115 },
    partyB: { grossMonthly: 3000, parentingTimeNights: 250 },
    numChildren: 2,
    state: 'VA',
    marriageLengthYears: 8,
    temporal: 'post_divorce',
    depth: 'standard',
  },

  // NY Formula A: high earner $20K, payee $6K, 1 kid with payee
  'ny-formula-a': {
    partyA: { grossMonthly: 20000, parentingTimeNights: 100 },
    partyB: { grossMonthly: 6000,  parentingTimeNights: 265 },
    numChildren: 1,
    state: 'NY',
    marriageLengthYears: 12,
    nyCustodyConfig: 'kids_with_payee',
    temporal: 'post_divorce',
    depth: 'standard',
  },

  // CA Full Worksheet — exercises gross-to-net cascade UI
  'ca-full-worksheet': {
    partyA: { grossMonthly: 12000, parentingTimeNights: 115 },
    partyB: { grossMonthly: 4000,  parentingTimeNights: 250 },
    numChildren: 2,
    state: 'CA',
    marriageLengthYears: 10,
    temporal: 'pendente_lite',
    depth: 'full_worksheet',
    fullWorksheet: {
      partyA: { fedTax: 2500, stateTax: 800, fica: 918, otherDeductions: 0, net: 7782 },
      partyB: { fedTax: 400,  stateTax: 100, fica: 306, otherDeductions: 0, net: 3194 },
    },
  },

  // SP-3 throw guard exercise — tied parenting time + kids + non-NY
  'sp3-throw': {
    partyA: { grossMonthly: 8000, parentingTimeNights: 100 },
    partyB: { grossMonthly: 4000, parentingTimeNights: 100 },
    numChildren: 2,
    state: 'VA',
    marriageLengthYears: 10,
    temporal: 'post_divorce',
    depth: 'standard',
  },
};

const FULL_PARTY_DEFAULT = {
  grossMonthly: null,
  imputeIncome: false,
  imputedEarningCapacity: null,
  healthInsurance: 0,
  childcare: 0,
  parentingTimeNights: 0,
  otherSupportObligations: 0,
};

function buildScenario(name) {
  const s = SCENARIOS[name];
  if (!s) return null;
  return {
    partyA: { ...FULL_PARTY_DEFAULT, ...(s.partyA ?? {}) },
    partyB: { ...FULL_PARTY_DEFAULT, ...(s.partyB ?? {}) },
    numChildren: s.numChildren ?? 0,
    state: s.state ?? 'OTHER',
    marriageLengthYears: s.marriageLengthYears ?? null,
    nyCustodyConfig: s.nyCustodyConfig ?? null,
    temporal: s.temporal ?? 'post_divorce',
    depth: s.depth ?? 'standard',
    caseEffectiveDate: s.caseEffectiveDate ?? null,
    fullWorksheet: s.fullWorksheet ?? null,
  };
}

function ScenarioLoader({ children }) {
  const params = useSearchParams();
  const scenario = params.get('scenario');
  const replaceInputs = useM5Store((s) => s.replaceSupportEstimatorInputs);
  const setPrePopSources = useM5Store((s) => s.setSupportEstimatorPrePopSources);
  const setResults = useM5Store((s) => s.setSupportEstimatorResults);

  useEffect(() => {
    if (scenario && SCENARIOS[scenario]) {
      replaceInputs(buildScenario(scenario));
      setPrePopSources(null);
      setResults(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scenario]);

  return children;
}

function Header() {
  return (
    <header
      style={{
        marginBottom: 24, paddingBottom: 16,
        borderBottom: '1px solid #CBD5E1',
      }}
    >
      <h1
        style={{
          fontFamily: '"Playfair Display", Georgia, serif',
          fontSize: 24, fontWeight: 700,
          color: '#1B2A4A', margin: '0 0 6px',
        }}
      >
        /dev/m5-support-estimator
      </h1>
      <p
        style={{
          fontFamily: '"Source Sans Pro", system-ui, sans-serif',
          fontSize: 13, color: '#6B7280', margin: '0 0 10px',
        }}
      >
        URL-param-seeded scenarios for visual iteration. Scenario load also clears
        results and pre-pop sources to give each scenario a clean slate.
      </p>
      <ul
        style={{
          fontFamily: '"Source Sans Pro", system-ui, sans-serif',
          fontSize: 13, margin: 0, paddingLeft: 18,
        }}
      >
        {Object.keys(SCENARIOS).map((name) => (
          <li key={name} style={{ marginBottom: 2 }}>
            <a
              href={`?scenario=${name}`}
              style={{ color: '#1B2A4A', textDecoration: 'underline' }}
            >
              ?scenario={name}
            </a>
          </li>
        ))}
      </ul>
    </header>
  );
}

export default function DevSupportEstimatorPage() {
  return (
    <div style={{ maxWidth: 960, margin: '0 auto', padding: 24, backgroundColor: '#FFFFFF' }}>
      <Suspense fallback={null}>
        <ScenarioLoader>
          <Header />
          <SupportEstimator disablePrePop />
        </ScenarioLoader>
      </Suspense>
    </div>
  );
}
