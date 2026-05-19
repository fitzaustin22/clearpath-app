'use client';

/**
 * QDROStillNotSureDiagnostic — §8.3.5 (lines 2793–2797) + Q-C6.
 *
 * The "still not sure" disambiguation affordance for the plan-type
 * classifier. Inline expand ONLY (Q-C6: no modal, no separate route) below
 * the plan-type radio group. Three yes/no questions feed PR1's
 * `diagnosePlanType` (consumed, not re-derived), which returns a best-guess
 * radio-choice id + plain-language rationale. No hard validation: the user
 * may accept the surfaced guess or just collapse the panel (dismiss).
 *
 * The trigger is a disclosure <button> (aria-expanded / aria-controls) —
 * the a11y-correct primitive for inline expand, not an anchor. `onAccept`
 * receives the best-guess radio-choice id (e.g. 'db_pension'); the parent
 * routes it to a planType exactly as it routes a manual radio selection.
 *
 * @param {object} props
 * @param {(radioChoiceId: string) => void} [props.onAccept] accept handler
 * @returns {JSX.Element}
 */

import { useId, useState } from 'react';
import WizardRadio from '@/src/components/wizard/WizardRadio';
import { diagnosePlanType } from '@/src/lib/qdro';
import { T } from '@/src/lib/brand/tokens';

// §8.3.5 three diagnostic questions. The spec's W-2 "box 12 code match X/Y"
// is an explicit placeholder (codes not locked); phrased as the employer-
// plan-contribution signal the diagnostic actually keys on.
const QUESTIONS = [
  {
    field: 'q1',
    legend: 'Does it pay a monthly benefit at retirement?',
    yes: 'q1_yes',
    no: 'q1_no',
  },
  {
    field: 'q2',
    legend: 'Does it have an account balance?',
    yes: 'q2_yes',
    no: 'q2_no',
  },
  {
    field: 'q3',
    legend:
      'Does it appear on your W-2 box 12 as an employer retirement-plan contribution?',
    yes: 'q3_yes',
    no: 'q3_no',
  },
];

const yesNoOptions = (q) => [
  { value: q.yes, label: 'Yes' },
  { value: q.no, label: 'No' },
];

export default function QDROStillNotSureDiagnostic({ onAccept }) {
  const panelId = useId();
  const [expanded, setExpanded] = useState(false);
  const [answers, setAnswers] = useState({});
  const [result, setResult] = useState(null);

  const setAnswer = (field, value) =>
    setAnswers((prev) => ({ ...prev, [field]: value }));

  const runDiagnostic = () => {
    setResult(
      diagnosePlanType({
        paysMonthlyAtRetirement: answers.q1 === 'q1_yes',
        hasAccountBalance: answers.q2 === 'q2_yes',
        w2Box12CodeMatches: answers.q3 === 'q3_yes',
      }),
    );
  };

  return (
    <div data-testid="qdro-still-not-sure" style={{ marginTop: '10px' }}>
      <button
        type="button"
        aria-expanded={expanded}
        aria-controls={panelId}
        onClick={() => setExpanded((v) => !v)}
        style={{
          padding: 0,
          background: 'none',
          border: 'none',
          color: T.NAVY,
          fontFamily: T.FONT_BODY,
          fontSize: '13px',
          fontWeight: 600,
          textDecoration: 'underline',
          cursor: 'pointer',
        }}
      >
        Still not sure?
      </button>

      {expanded ? (
        <div
          id={panelId}
          data-testid="qdro-diagnostic-panel"
          style={{
            marginTop: '10px',
            padding: '12px 14px',
            background: T.PARCHMENT,
            border: `1px solid ${T.LINE}`,
            borderRadius: 8,
            display: 'flex',
            flexDirection: 'column',
            gap: '12px',
          }}
        >
          {QUESTIONS.map((q) => (
            <WizardRadio
              key={q.field}
              field={q.field}
              legend={q.legend}
              variant="segmented"
              value={answers[q.field]}
              onChange={setAnswer}
              options={yesNoOptions(q)}
              data-testid={`qdro-diagnostic-${q.field}`}
            />
          ))}

          <div>
            <button
              type="button"
              onClick={runDiagnostic}
              style={{
                minHeight: '40px',
                padding: '0 1rem',
                background: T.NAVY,
                border: `1px solid ${T.NAVY}`,
                color: T.PARCHMENT,
                fontFamily: T.FONT_BODY,
                fontSize: '14px',
                fontWeight: 600,
                cursor: 'pointer',
                borderRadius: 6,
              }}
            >
              See best guess
            </button>
          </div>

          {result ? (
            <div
              data-testid="qdro-diagnostic-result"
              style={{
                padding: '10px 12px',
                background: T.CARD,
                border: `1px solid ${T.LINE_STRONG}`,
                borderRadius: 6,
              }}
            >
              <p
                style={{
                  margin: 0,
                  fontSize: '13px',
                  lineHeight: 1.5,
                  color: T.INK_2,
                }}
              >
                {result.rationale}
              </p>
              {result.bestGuess ? (
                <button
                  type="button"
                  onClick={() => onAccept?.(result.bestGuess)}
                  style={{
                    marginTop: '10px',
                    minHeight: '40px',
                    padding: '0 1rem',
                    background: T.CARD,
                    border: `1px solid ${T.NAVY}`,
                    color: T.NAVY,
                    fontFamily: T.FONT_BODY,
                    fontSize: '14px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    borderRadius: 6,
                  }}
                >
                  Use this classification
                </button>
              ) : null}
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
