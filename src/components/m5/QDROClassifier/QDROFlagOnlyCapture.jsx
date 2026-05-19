'use client';

/**
 * QDROFlagOnlyCapture — full §8.5.6 flag-only starter-Q capture for the 3
 * deferred plan types (gov_civilian / military / state_municipal). Replaces
 * the bare <QDGConsultSpecialist /> for these branches in QDROBranchCapture
 * (PR4): the consolidated §8.5.6 consult-specialist callout still renders
 * (reused verbatim from QDGConsultSpecialist — single source of truth),
 * now followed by the 3 starter questions as free-text inputs.
 *
 * PR4-5: WizardField has no multi-line variant, so the inputs are native
 * <textarea>s styled to the WizardField token idiom (T.LINE_STRONG resting
 * border; T.GOLD border + T.GOLD_FOCUS_RING ring on focus). Verbatim Q
 * wording is consumed from the PR1 getFlagOnlyBranch constant; persistence
 * is the per-question partial-merge m5Store.setQDROFlagOnlyAnswers
 * (locked §8.10.2 Array<{questionId,response}> shape).
 *
 * Fails closed (renders nothing) for any non-flag planType or absent asset.
 *
 * @param {object} props
 * @param {string} props.assetId qdroDecision.assets key
 * @param {string} props.planType gov_civilian | military | state_municipal
 * @returns {JSX.Element | null}
 */

import { useId, useState } from 'react';
import { useM5Store } from '@/src/stores/m5Store';
import { getFlagOnlyBranch } from '@/src/lib/qdro';
import WizardSection from '@/src/components/wizard/WizardSection';
import { QDGConsultSpecialist } from './callouts';
import { T } from '@/src/lib/brand/tokens';

function FlagTextarea({ wording, value, onChange }) {
  const id = useId();
  const [focused, setFocused] = useState(false);
  return (
    <div style={{ marginBottom: '16px' }}>
      <label
        htmlFor={id}
        style={{
          display: 'block',
          fontSize: '12.5px',
          fontWeight: 600,
          color: T.INK,
          marginBottom: '6px',
        }}
      >
        {wording}
      </label>
      <textarea
        id={id}
        data-testid="qdro-flag-only-input"
        rows={3}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        style={{
          width: '100%',
          boxSizing: 'border-box',
          minHeight: '72px',
          resize: 'vertical',
          borderRadius: '7px',
          border: `1px solid ${focused ? T.GOLD : T.LINE_STRONG}`,
          outline: focused ? `3px solid ${T.GOLD_FOCUS_RING}` : 'none',
          padding: '10px 12px',
          fontSize: '14px',
          fontFamily: T.FONT_BODY,
          lineHeight: 1.5,
          color: T.INK,
          backgroundColor: T.CARD,
          transition: 'border-color 120ms ease, outline-color 120ms ease',
        }}
      />
    </div>
  );
}

export default function QDROFlagOnlyCapture({ assetId, planType }) {
  const branch = getFlagOnlyBranch(planType);
  const asset = useM5Store((s) => s.qdroDecision.assets[assetId]);
  const setQDROFlagOnlyAnswers = useM5Store((s) => s.setQDROFlagOnlyAnswers);

  if (!branch || !asset) return null;

  const responses = asset.decisions?.starterQuestionResponses ?? [];
  const valueFor = (qid) => responses.find((r) => r.questionId === qid)?.response ?? '';

  return (
    <div data-testid="qdro-flag-only-capture">
      <QDGConsultSpecialist planType={planType} />
      <WizardSection title="Starter questions for your attorney">
        <fieldset style={{ border: 'none', margin: 0, padding: 0 }}>
          <legend
            style={{
              padding: 0,
              marginBottom: '12px',
              fontSize: '13px',
              lineHeight: 1.5,
              color: T.INK_2,
              fontFamily: T.FONT_BODY,
            }}
          >
            Capture what you can now; anything you leave blank is a starting point for
            your drafting attorney.
          </legend>
          {branch.starterQuestions.map((q) => (
            <FlagTextarea
              key={q.id}
              wording={q.wording}
              value={valueFor(q.id)}
              onChange={(v) => setQDROFlagOnlyAnswers(assetId, { [q.id]: v })}
            />
          ))}
        </fieldset>
      </WizardSection>
    </div>
  );
}
