'use client';

import BigNumber from '@/src/components/shared/BigNumber';
import {
  NAVY, GOLD, AMBER, GREEN, MUTED, PARCHMENT, BORDER, BORDER_DIM,
  SOURCE, PLAYFAIR,
} from './_styles.js';
import { Banner } from './inputs/_fields.jsx';

const STATE_LABEL = {
  VA: 'Virginia',
  MD: 'Maryland',
  DC: 'District of Columbia',
  NY: 'New York',
  CA: 'California',
  OTHER: 'Other (national approximation)',
};

const TEMPORAL_LABEL = {
  pendente_lite: 'Pendente lite',
  post_divorce:  'Post-divorce',
};

const DEPTH_LABEL = {
  standard:       'Standard',
  full_worksheet: 'Full Worksheet',
};

function todayISODate() {
  return new Date().toISOString().slice(0, 10);
}

function formatMoney(n) {
  if (n == null || !Number.isFinite(n)) return '$0/mo';
  return `$${Math.round(n).toLocaleString()}/mo`;
}

function PartyLabelLine({ payorLabel, payeeLabel, combinedMonthly }) {
  return (
    <div
      style={{
        fontFamily: SOURCE, fontSize: 16, fontWeight: 600,
        color: NAVY, marginTop: 12, marginBottom: 8,
        textAlign: 'center',
      }}
    >
      {payorLabel} pays{' '}
      <span style={{ color: GOLD, fontWeight: 700 }}>
        {formatMoney(combinedMonthly)}
      </span>{' '}
      combined to {payeeLabel}.
    </div>
  );
}

function ResultLine({ label, value, sub }) {
  return (
    <div style={{ flex: 1 }}>
      <div style={{ fontSize: 13, color: MUTED, fontFamily: SOURCE, marginBottom: 4 }}>
        {label}
      </div>
      <div
        style={{
          fontFamily: PLAYFAIR, fontSize: 24, fontWeight: 700,
          color: NAVY, lineHeight: 1.1,
        }}
      >
        {value}
      </div>
      {sub && (
        <div style={{ fontSize: 12, color: AMBER, marginTop: 4, fontFamily: SOURCE }}>
          {sub}
        </div>
      )}
    </div>
  );
}

export function ResultsPanel({ results, inputs }) {
  if (!results) {
    return (
      <div
        style={{
          backgroundColor: PARCHMENT,
          border: `1px dashed ${BORDER}`,
          borderRadius: 8,
          padding: 32,
          textAlign: 'center',
          fontFamily: SOURCE,
          color: MUTED,
        }}
      >
        Complete inputs to see estimate
      </div>
    );
  }

  const {
    combinedMonthly,
    childMonthly,
    spousalMonthly,
    spousalCalc,
    metadata,
  } = results;

  // Payor/payee label derivation mirrors calc engine (max gross).
  // No name field in v1 input model — use Party A / Party B.
  const partyAGross = inputs.partyA?.imputeIncome
    ? inputs.partyA?.imputedEarningCapacity ?? 0
    : inputs.partyA?.grossMonthly ?? 0;
  const partyBGross = inputs.partyB?.imputeIncome
    ? inputs.partyB?.imputedEarningCapacity ?? 0
    : inputs.partyB?.grossMonthly ?? 0;
  const payorLabel = partyAGross >= partyBGross ? 'Party A' : 'Party B';
  const payeeLabel = payorLabel === 'Party A' ? 'Party B' : 'Party A';

  const asOfDateLocal = metadata?.asOfDateForStatutoryConstants?.slice(0, 10) ?? null;
  const showAsOfSubhead = asOfDateLocal && asOfDateLocal !== todayISODate();

  const factorTestApplies = !!spousalCalc?.factorTestApplies;
  const capHit = !!spousalCalc?.cap?.hit;

  return (
    <div
      style={{
        backgroundColor: PARCHMENT,
        border: `1px solid ${BORDER}`,
        borderRadius: 8,
        padding: 24,
        marginTop: 8,
      }}
    >
      {/* Compact header: state · temporal · depth (+ optional as-of subhead) */}
      <div
        style={{
          fontSize: 12, color: MUTED, fontFamily: SOURCE,
          marginBottom: 16, textAlign: 'center',
          letterSpacing: 0.4,
        }}
      >
        {STATE_LABEL[inputs.state] ?? inputs.state}
        {' · '}
        {TEMPORAL_LABEL[inputs.temporal] ?? inputs.temporal}
        {' · '}
        {DEPTH_LABEL[inputs.depth] ?? inputs.depth}
        {showAsOfSubhead && (
          <span style={{ display: 'block', marginTop: 4 }}>
            Calculated using statutory values effective {asOfDateLocal}
          </span>
        )}
      </div>

      {/* Hero: combined monthly */}
      <BigNumber
        value={formatMoney(combinedMonthly)}
        label="Combined monthly support"
        color="gold"
        size="large"
      />

      <PartyLabelLine
        payorLabel={payorLabel}
        payeeLabel={payeeLabel}
        combinedMonthly={combinedMonthly}
      />

      {/* Line-item split */}
      <div
        style={{
          display: 'flex', gap: 16,
          marginTop: 16,
          padding: '16px 20px',
          backgroundColor: '#FFFFFF',
          border: `1px solid ${BORDER}`,
          borderRadius: 6,
        }}
      >
        <ResultLine
          label="Child support"
          value={formatMoney(childMonthly)}
        />
        <div style={{ width: 1, backgroundColor: BORDER_DIM }} />
        <ResultLine
          label="Spousal support"
          value={formatMoney(spousalMonthly)}
          sub={factorTestApplies ? 'Factor test applies — approximation only' : null}
        />
      </div>

      {/* Cap-hit annotation per §6.4.3 */}
      {capHit && (
        <div
          style={{
            marginTop: 12,
            padding: '10px 14px',
            backgroundColor: '#F0F4FA',
            border: `1px solid ${NAVY}`,
            borderRadius: 6,
            fontFamily: SOURCE, fontSize: 13, color: NAVY,
          }}
        >
          <strong>Income above NY cap.</strong> Discretionary above the statutory cap;
          court may consider additional factors.
        </div>
      )}

      {/* Generic-fallback warning per §6.4.3 + UX-5 */}
      {inputs.state === 'OTHER' && (
        <div style={{ marginTop: 12 }}>
          <Banner variant="amber">
            <strong>National approximation only.</strong> Your state's specific child support
            rules may differ significantly from the figures shown. Consult a local attorney
            for state-specific guidance.
          </Banner>
        </div>
      )}

      {/* Factor-test promoted treatment (when applicable) */}
      {factorTestApplies && (
        <div style={{ marginTop: 12 }}>
          <Banner variant="amber">
            <strong>Factor-test approximation.</strong> Spousal support is not formulaic in
            this configuration; the figure shown is a national approximation only and may
            differ materially from a court determination.
          </Banner>
        </div>
      )}
    </div>
  );
}

export default ResultsPanel;
