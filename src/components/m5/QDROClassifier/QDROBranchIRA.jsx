'use client';

/**
 * QDROBranchIRA — IRA branch capture (§8.5.5 / §8.10.2). Three items:
 *
 *  Q1  §408(d)(6) transfer-mechanic informational block — read-only, no
 *      input (§8.5.5.1).
 *  Q2  decree-language confirmation radio (§8.5.5.2).
 *  Q3  custodian free-text + optional notes (§8.5.5.3).
 *
 * No perspective conditioning (D2 / §8.5.1) — the IRA set renders
 * identically regardless of userRole, so this component does not take a
 * userRole prop. Locked question wording is consumed from the PR1
 * IRA_QUESTIONS constant (single source of truth). Persistence is the PVA
 * per-keystroke partial-merge idiom via m5Store.updateQDRODecision.
 *
 * §10.7 provenance: a per-field pre-pop badge surfaces while
 * _prePopSources[field] is present and the user has not yet overridden
 * that field this session; the clear-on-override is honored purely at the
 * presentation layer (no store mutation — stores are out of PR3 scope),
 * mirroring the QDROAssetCard precedent.
 *
 * @param {object} props
 * @param {string} props.assetId qdroDecision.assets key
 * @returns {JSX.Element | null}
 */

import { useState } from 'react';
import { useM5Store } from '@/src/stores/m5Store';
import { IRA_QUESTIONS } from '@/src/lib/qdro';
import WizardSection from '@/src/components/wizard/WizardSection';
import WizardRadio from '@/src/components/wizard/WizardRadio';
import WizardField from '@/src/components/wizard/WizardField';
import { T } from '@/src/lib/brand/tokens';

// §10.7 source-attribution copy (matches the QDROAssetCard precedent).
const PREPOP_BADGE_COPY = {
  'm2.pensionClaim': 'from M2 pension claim — review or override',
  'm2.retirementAsset': 'from M2 retirement asset — review or override',
};

// §8.5.5.2 decree-language options. Values are spec-locked (PR1); the
// labels/descriptions are build-phase educational copy (§8.8.1).
const DECREE_LANGUAGE_OPTIONS = [
  {
    value: 'yes',
    label: 'Yes',
    description:
      "The decree (or proposed decree) explicitly uses the 'incident to divorce' characterization.",
  },
  {
    value: 'no',
    label: 'No',
    description: 'The decree does not characterize the transfer that way.',
  },
  {
    value: 'not_yet_drafted',
    label: 'Not yet drafted',
    description: 'This decree provision has not been written yet.',
  },
  {
    value: 'not_sure',
    label: 'Not sure',
    description: "You have not confirmed the decree's exact wording.",
  },
];

const Q1 = IRA_QUESTIONS.find((q) => q.id === 'transferMechanic');
const Q2 = IRA_QUESTIONS.find((q) => q.id === 'decreeLanguageConfirmed');
const Q3 = IRA_QUESTIONS.find((q) => q.id === 'custodian');

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

export default function QDROBranchIRA({ assetId }) {
  const asset = useM5Store((s) => s.qdroDecision.assets[assetId]);
  const updateQDRODecision = useM5Store((s) => s.updateQDRODecision);
  const [overridden, setOverridden] = useState(() => new Set());

  if (!asset) return null;

  const decisions = asset.decisions ?? {};

  const badgeFor = (field) => {
    if (overridden.has(field)) return null;
    const src = asset._prePopSources?.[field]?.source;
    if (!src) return null;
    return PREPOP_BADGE_COPY[src] ?? null;
  };

  const persist = (field, value) => {
    if (!overridden.has(field)) {
      setOverridden((prev) => new Set(prev).add(field));
    }
    updateQDRODecision(assetId, { [field]: value });
  };

  return (
    <div data-testid="qdro-branch-ira">
      <WizardSection title="How an IRA is divided" first>
        <div
          data-testid="qdro-branch-ira-q1"
          style={{
            background: T.PARCHMENT,
            border: `1px solid ${T.LINE}`,
            borderRadius: 6,
            padding: '12px 14px',
            fontFamily: T.FONT_BODY,
            fontSize: '13px',
            lineHeight: 1.5,
            color: T.INK_2,
          }}
        >
          {Q1.wording}
        </div>
      </WizardSection>

      <WizardSection title="Decree language">
        {badgeFor('decreeLanguageConfirmed') ? (
          <PrePopBadge text={badgeFor('decreeLanguageConfirmed')} />
        ) : null}
        <WizardRadio
          field="decreeLanguageConfirmed"
          legend={Q2.wording}
          variant="stacked"
          value={decisions.decreeLanguageConfirmed ?? undefined}
          onChange={(_f, v) => persist('decreeLanguageConfirmed', v)}
          options={DECREE_LANGUAGE_OPTIONS}
          data-testid="qdro-ira-decree-radio"
        />
      </WizardSection>

      <WizardSection title="Custodian">
        {badgeFor('custodian') ? (
          <PrePopBadge text={badgeFor('custodian')} />
        ) : null}
        <WizardField
          label={Q3.wording}
          field="custodian"
          value={decisions.custodian ?? ''}
          onChange={(_f, v) => persist('custodian', v)}
          data-testid="qdro-ira-custodian"
        />
        <div style={{ marginTop: '12px' }}>
          {badgeFor('custodianNotes') ? (
            <PrePopBadge text={badgeFor('custodianNotes')} />
          ) : null}
          <WizardField
            label="Notes (optional)"
            field="custodianNotes"
            value={decisions.custodianNotes ?? ''}
            onChange={(_f, v) => persist('custodianNotes', v)}
            data-testid="qdro-ira-custodian-notes"
          />
        </div>
      </WizardSection>
    </div>
  );
}
