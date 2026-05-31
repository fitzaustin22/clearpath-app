'use client';

import { T } from '@/src/lib/brand/tokens';
import { formatUSD } from '@/src/lib/format/currency';
import { useM6Store } from '@/src/stores/m6Store';
import useBlueprintStore from '@/src/stores/blueprintStore';
import { analyzeGrant, intrinsicValue } from '@/src/lib/coverture/coverture';
import WizardField from '@/src/components/wizard/WizardField';
import { DCA_COPY, DCA_DISCLAIMER } from './copy';
import { StepHeading, NavRow, Panel, Disclaimer } from './ui';

// Community-property states (2-letter). Used ONLY to frame the language
// (community vs. equitable) — never the math (D5).
const COMMUNITY_STATES = new Set(['AZ', 'CA', 'ID', 'LA', 'NV', 'NM', 'TX', 'WA', 'WI']);

const pct = (fraction) => `${Math.round(fraction * 100)}%`;

// One formula column. Renders the marital PORTION (share counts) + the
// intrinsic-value estimate of that portion. NEVER a post-split "you receive" figure.
function FormulaColumn({ prefix, title, desc, rows, totalShares, totalValue, c }) {
  return (
    <Panel data-testid={`dca-review-${prefix}`} style={{ backgroundColor: T.PARCHMENT }}>
      <h3 style={{ fontFamily: T.FONT_DISPLAY, fontWeight: 700, fontSize: 18, color: T.NAVY, margin: 0 }}>
        {title}
      </h3>
      <p style={{ fontFamily: T.FONT_BODY, fontSize: 13, color: T.INK_2, margin: '6px 0 12px 0', lineHeight: 1.5 }}>
        {desc}
      </p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginBottom: 12 }}>
        {rows.map((r, i) => (
          <div
            key={i}
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              fontFamily: T.FONT_BODY,
              fontSize: 13,
              color: T.INK,
            }}
          >
            <span style={{ color: T.INK_2 }}>
              Tranche {i + 1} · {pct(r.fraction)}
            </span>
            <span>{r.maritalShares} shares</span>
          </div>
        ))}
      </div>

      <div style={{ borderTop: `1px solid ${T.LINE}`, paddingTop: 10 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 6 }}>
          <span style={{ fontFamily: T.FONT_BODY, fontSize: 13, color: T.INK_2 }}>{c.maritalSharesLabel}</span>
          <span
            data-testid={`dca-${prefix}-marital-shares`}
            style={{ fontFamily: T.FONT_DISPLAY, fontWeight: 700, fontSize: 22, color: T.NAVY }}
          >
            {totalShares}
          </span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
          <span style={{ fontFamily: T.FONT_BODY, fontSize: 13, color: T.INK_2 }}>{c.intrinsicLabel}</span>
          <span
            data-testid={`dca-${prefix}-intrinsic`}
            style={{ fontFamily: T.FONT_BODY, fontWeight: 600, fontSize: 16, color: T.INK }}
          >
            {formatUSD(totalValue)}
          </span>
        </div>
      </div>
    </Panel>
  );
}

// Step 3 — Hug and Nelson side by side. The tool shows BOTH and decides nothing.
export default function StepReview({ onNext, onBack }) {
  const dcaState = useM6Store((s) => s.deferredCompAnalyzer);
  const setAnalysisField = useM6Store((s) => s.setAnalysisField);
  const stubs = useBlueprintStore((s) => s.deferredCompStubs);
  const c = DCA_COPY.review;

  const analysis = dcaState.analysis;
  if (!analysis) return null;

  const stub = stubs.find((s) => s.id === dcaState.stubId);
  const strikePrice = stub ? stub.strikePrice : null;

  const grant = analyzeGrant(analysis);
  const hugShares = grant.totals.hug.maritalShares;
  const nelsonShares = grant.totals.nelson.maritalShares;
  const hugValue = intrinsicValue(hugShares, analysis.fmv, strikePrice);
  const nelsonValue = intrinsicValue(nelsonShares, analysis.fmv, strikePrice);

  const stateCode = (analysis.state || '').trim().toUpperCase();
  const framing = !stateCode
    ? c.framingUnknown
    : COMMUNITY_STATES.has(stateCode)
      ? c.framingCommunity
      : c.framingEquitable;

  const sep = analysis.separationDate;
  const hasPostSepVest = analysis.tranches.some(
    (t) => t.vestDate && sep && new Date(t.vestDate) > new Date(sep),
  );

  return (
    <div data-testid="dca-step-review">
      <StepHeading title={c.title} subhead={c.subhead} />

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <FormulaColumn
          prefix="hug"
          title={c.hugTitle}
          desc={c.hugDesc}
          rows={grant.perTranche.map((p) => p.hug)}
          totalShares={hugShares}
          totalValue={hugValue}
          c={c}
        />
        <FormulaColumn
          prefix="nelson"
          title={c.nelsonTitle}
          desc={c.nelsonDesc}
          rows={grant.perTranche.map((p) => p.nelson)}
          totalShares={nelsonShares}
          totalValue={nelsonValue}
          c={c}
        />
      </div>

      <div
        data-testid="dca-state-framing"
        style={{
          marginTop: 16,
          fontFamily: T.FONT_BODY,
          fontSize: 13.5,
          color: T.INK_2,
          lineHeight: 1.55,
        }}
      >
        <span style={{ fontWeight: 700, color: T.NAVY }}>{c.framingHeading}</span>
        {stateCode ? ` (${stateCode})` : ''}: {framing}
      </div>

      {hasPostSepVest && (
        <div
          style={{
            marginTop: 16,
            padding: '12px 14px',
            border: `1px solid ${T.LINE}`,
            borderRadius: 8,
            backgroundColor: T.CARD,
            fontFamily: T.FONT_BODY,
            fontSize: 13.5,
            color: T.INK,
            lineHeight: 1.55,
          }}
        >
          <div style={{ fontWeight: 700, color: T.NAVY, marginBottom: 4 }}>
            {c.separateBeforeVestHeading}
          </div>
          {c.separateBeforeVest}
        </div>
      )}

      <div style={{ marginTop: 16 }}>
        <WizardField
          label={c.intentLabel}
          field="intentNote"
          value={analysis.intentNote ?? ''}
          onChange={(field, value) => setAnalysisField(field, value)}
          tooltip={c.intentHint}
          data-testid="dca-field-intent"
        />
      </div>

      <Disclaimer heading={c.disclaimerHeading}>{DCA_DISCLAIMER}</Disclaimer>

      <NavRow onBack={onBack} onNext={onNext} backLabel={c.back} nextLabel={c.continue} />
    </div>
  );
}
