'use client';

/**
 * QDROBranchDC — DC branch capture (§8.5.4 / §8.10.2). Three questions:
 *
 *  Q1  Allocation — radio (percentage / fixed_dollar) + a dependent
 *      numeric field for the chosen value (§8.5.4.1). Mechanical, no
 *      education wrapper.
 *  Q2  Receipt method — radio, ALTERNATE-PAYEE ONLY (§8.5.4.2 / A11 /
 *      Q-B4). Hidden entirely for a participant (not in the DOM);
 *      participant-DC persists receiptMethod: null. Carries tax
 *      consequences → QDROWhyThisMatters education wrapper (D3 / Q-B6).
 *  Q3  Valuation date — radio + a dependent date picker for the
 *      date-bearing types (§8.5.4.3 / §8.10.2). Mechanical.
 *
 * Q-B3: the dependent numeric (Q1) and date (Q3) are rendered via
 * composition `{cond && <Field/>}`. They are visually nested under the
 * parent radio — gold left-accent + indent + a contextual label — so the
 * parent→child association is unambiguous. Composition reads correctly;
 * no escalation to WizardConditionalField is needed.
 *
 * Question numbering is stable Q1/Q2/Q3 by DC_QUESTIONS position; the
 * participant simply omits Q2 (gap, NOT renumbered — Q-B4).
 *
 * Locked wording is consumed from the PR1 DC_QUESTIONS constant. Persist
 * is the PVA per-keystroke partial-merge idiom; §10.7 pre-pop badge +
 * presentation-layer clear-on-override (no store mutation — out of PR3
 * scope), mirroring the QDROAssetCard precedent.
 *
 * @param {object} props
 * @param {string} props.assetId qdroDecision.assets key
 * @param {'participant'|'alternatePayee'} props.userRole §8.2 perspective
 * @returns {JSX.Element | null}
 */

import { useEffect, useState } from 'react';
import { useM5Store } from '@/src/stores/m5Store';
import { DC_QUESTIONS } from '@/src/lib/qdro';
import WizardSection from '@/src/components/wizard/WizardSection';
import WizardRadio from '@/src/components/wizard/WizardRadio';
import WizardField from '@/src/components/wizard/WizardField';
import WizardDate from '@/src/components/wizard/WizardDate';
import { T } from '@/src/lib/brand/tokens';
import QDROWhyThisMatters from './QDROWhyThisMatters.jsx';

const PREPOP_BADGE_COPY = {
  'm2.pensionClaim': 'from M2 pension claim — review or override',
  'm2.retirementAsset': 'from M2 retirement asset — review or override',
};

// §8.5.4.1 — values spec-locked (PR1); labels/descriptions build-phase.
const ALLOCATION_OPTIONS = [
  {
    value: 'percentage',
    label: 'Percentage of the account',
    description: "The alternate payee receives a percentage of the balance.",
  },
  {
    value: 'fixed_dollar',
    label: 'Fixed dollar amount',
    description: 'The alternate payee receives a stated dollar amount.',
  },
];

// §8.5.4.2 — spec-locked option semantics preserved in the copy.
const RECEIPT_METHOD_OPTIONS = [
  {
    value: 'rollover_ira',
    label: 'Rollover to IRA',
    description: 'No current tax — the share moves directly into an IRA.',
  },
  {
    value: 'cash_72t',
    label: 'Cash distribution under §72(t)',
    description:
      'No early-withdrawal penalty; ordinary income tax still applies.',
  },
  {
    value: 'leave_in_plan',
    label: 'Leave in plan if permitted',
    description: 'Keep a sub-account in the plan where the plan allows it.',
  },
  {
    value: 'not_yet_decided',
    label: 'Not yet decided',
    description: 'Decide later with your attorney or CDFA.',
  },
];

// §8.5.4.3 — values spec-locked (PR1); labels/descriptions build-phase.
const VALUATION_DATE_OPTIONS = [
  {
    value: 'divorce',
    label: 'Date of divorce',
    description: 'Value the share as of the divorce date.',
  },
  {
    value: 'separation',
    label: 'Date of separation',
    description: 'Value the share as of the separation date.',
  },
  {
    value: 'other',
    label: 'Another specified date',
    description: 'The order names a different valuation date.',
  },
  {
    value: 'no_specific',
    label: 'No specific date',
    description: 'The order does not fix a valuation date.',
  },
  {
    value: 'not_yet_decided',
    label: 'Not yet decided',
    description: 'Decide later with your attorney or CDFA.',
  },
];

// §8.10.2 — valuationDate.date is ISO8601 only for these types.
const DATE_BEARING_TYPES = new Set(['divorce', 'separation', 'other']);

const Q1_IDX = DC_QUESTIONS.findIndex((q) => q.id === 'allocation');
const Q2_IDX = DC_QUESTIONS.findIndex((q) => q.id === 'receiptMethod');
const Q3_IDX = DC_QUESTIONS.findIndex((q) => q.id === 'valuationDate');
const Q1 = DC_QUESTIONS[Q1_IDX];
const Q2 = DC_QUESTIONS[Q2_IDX];
const Q3 = DC_QUESTIONS[Q3_IDX];

function PrePopBadge({ text }) {
  return (
    <div style={{ marginBottom: '8px' }}>
      <span
        data-testid="qdro-prepop-badge"
        title={text}
        style={{
          display: 'inline-block',
          maxWidth: '260px',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
          verticalAlign: 'bottom',
          fontSize: '10px',
          fontWeight: 700,
          letterSpacing: '0.4px',
          color: T.PILL_TEXT,
          backgroundColor: T.PARCHMENT_DEEP,
          padding: '2px 8px',
          borderRadius: '999px',
          fontFamily: T.FONT_BODY,
        }}
      >
        {text}
      </span>
    </div>
  );
}

// Gold left-accent + indent — the visual tie binding a dependent field to
// the radio choice directly above it (Q-B3 parent→child connection).
function NestedField({ children }) {
  return (
    <div
      data-testid="qdro-dc-nested-field"
      style={{
        marginTop: '10px',
        marginLeft: '4px',
        paddingLeft: '14px',
        borderLeft: `3px solid ${T.GOLD}`,
      }}
    >
      {children}
    </div>
  );
}

export default function QDROBranchDC({ assetId, userRole }) {
  const asset = useM5Store((s) => s.qdroDecision.assets[assetId]);
  const updateQDRODecision = useM5Store((s) => s.updateQDRODecision);
  const [overridden, setOverridden] = useState(() => new Set());

  const decisions = asset?.decisions ?? {};
  const isParticipant = userRole === 'participant';
  const receiptMethod = decisions.receiptMethod;

  // §8.5.4.2 / A11 / TC-QDG-3 — participant-DC persists receiptMethod: null
  // (the participant does not decide how the AP receives their portion).
  // Honored via the existing partial-merge setter, not a store change.
  useEffect(() => {
    if (!asset) return;
    if (isParticipant && receiptMethod !== null) {
      updateQDRODecision(assetId, { receiptMethod: null });
    }
  }, [asset, assetId, isParticipant, receiptMethod, updateQDRODecision]);

  if (!asset) return null;

  const badgeFor = (field) => {
    if (overridden.has(field)) return null;
    const src = asset._prePopSources?.[field]?.source;
    if (!src) return null;
    return PREPOP_BADGE_COPY[src] ?? null;
  };

  const markOverridden = (field) => {
    if (!overridden.has(field)) {
      setOverridden((prev) => new Set(prev).add(field));
    }
  };

  const persist = (field, value) => {
    markOverridden(field);
    updateQDRODecision(assetId, { [field]: value });
  };

  const allocationType = decisions.allocationType;
  const valuationType = decisions.valuationDate?.type;

  const setValuationType = (type) => {
    markOverridden('valuationDate');
    const keepDate = DATE_BEARING_TYPES.has(type)
      ? (decisions.valuationDate?.date ?? null)
      : null;
    updateQDRODecision(assetId, {
      valuationDate: { type, date: keepDate },
    });
  };

  const setValuationDate = (date) => {
    markOverridden('valuationDate');
    updateQDRODecision(assetId, {
      valuationDate: { type: valuationType ?? 'not_yet_decided', date },
    });
  };

  return (
    <div data-testid="qdro-branch-dc">
      <div data-testid="qdro-dc-q1">
        <WizardSection title={`Question ${Q1_IDX + 1} — Allocation`} first>
          {badgeFor('allocationType') ? (
            <PrePopBadge text={badgeFor('allocationType')} />
          ) : null}
          <WizardRadio
            field="allocationType"
            legend={Q1.wording}
            variant="stacked"
            value={allocationType ?? undefined}
            onChange={(_f, v) => persist('allocationType', v)}
            options={ALLOCATION_OPTIONS}
            data-testid="qdro-dc-allocation-radio"
          />
          {allocationType ? (
            <NestedField>
              <WizardField
                label={
                  allocationType === 'percentage'
                    ? "Alternate payee's percentage"
                    : "Alternate payee's dollar amount"
                }
                field="allocationValue"
                numeric
                prefix={allocationType === 'fixed_dollar' ? '$' : undefined}
                suffix={allocationType === 'percentage' ? '%' : undefined}
                value={decisions.allocationValue ?? ''}
                onChange={(_f, v) =>
                  persist('allocationValue', v === '' ? null : Number(v))
                }
                data-testid="qdro-dc-allocation-value"
              />
            </NestedField>
          ) : null}
        </WizardSection>
      </div>

      {isParticipant ? null : (
        <div data-testid="qdro-dc-q2">
          <WizardSection title={`Question ${Q2_IDX + 1} — Receipt method`}>
            {badgeFor('receiptMethod') ? (
              <PrePopBadge text={badgeFor('receiptMethod')} />
            ) : null}
            <WizardRadio
              field="receiptMethod"
              legend={Q2.wording}
              variant="stacked"
              value={receiptMethod ?? undefined}
              onChange={(_f, v) => persist('receiptMethod', v)}
              options={RECEIPT_METHOD_OPTIONS}
              data-testid="qdro-dc-receipt-radio"
            />
            <QDROWhyThisMatters triggerText="Why this matters">
              <p style={{ margin: 0 }}>
                How you take your share has very different tax outcomes. A
                direct rollover to an IRA stays tax-deferred. A cash
                distribution under §72(t) avoids the 10% early-withdrawal
                penalty but is taxed as ordinary income in the year you
                receive it. Leaving the funds in the plan (when permitted)
                preserves deferral but ties you to the plan&apos;s rules.
              </p>
            </QDROWhyThisMatters>
          </WizardSection>
        </div>
      )}

      <div data-testid="qdro-dc-q3">
        <WizardSection title={`Question ${Q3_IDX + 1} — Valuation date`}>
          {badgeFor('valuationDate') ? (
            <PrePopBadge text={badgeFor('valuationDate')} />
          ) : null}
          <WizardRadio
            field="valuationDateType"
            legend={Q3.wording}
            variant="stacked"
            value={valuationType ?? undefined}
            onChange={(_f, v) => setValuationType(v)}
            options={VALUATION_DATE_OPTIONS}
            data-testid="qdro-dc-valuation-radio"
          />
          {valuationType && DATE_BEARING_TYPES.has(valuationType) ? (
            <NestedField>
              <WizardDate
                label="Valuation date"
                field="valuationDateValue"
                value={decisions.valuationDate?.date ?? ''}
                onChange={(_f, v) => setValuationDate(v)}
                data-testid="qdro-dc-valuation-date"
              />
            </NestedField>
          ) : null}
        </WizardSection>
      </div>
    </div>
  );
}
