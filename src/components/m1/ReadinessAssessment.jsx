'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useM1Store } from '@/src/stores/m1Store';
import useBlueprintStore from '@/src/stores/blueprintStore';
import {
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  ResponsiveContainer,
} from 'recharts';

// ─── Brand tokens ──────────────────────────────────────────────
const NAVY = '#1B2A4A';
const GOLD = '#C8A96E';
const PARCHMENT = '#FAF8F2';
const WHITE = '#FFFFFF';

// ─── Domain definitions ────────────────────────────────────────
const DOMAINS = [
  {
    key: 'incomeAwareness',
    label: 'Income Awareness',
    module: 'M3',
    recommendation:
      'Module 3 walks you through every income source and what it means for your budget.',
  },
  {
    key: 'debtAwareness',
    label: 'Debt Awareness',
    module: 'M2',
    recommendation:
      'Module 2 helps you map everything you own and owe \u2014 including debts you may not know about.',
  },
  {
    key: 'assetAwareness',
    label: 'Asset Awareness',
    module: 'M2',
    recommendation:
      'Module 2 builds your complete asset picture, from retirement accounts to real estate.',
  },
  {
    key: 'documentAccess',
    label: 'Document Access',
    module: 'M2',
    recommendation:
      'Module 2 includes a document checklist so you know exactly what to gather and where to find it.',
  },
  {
    key: 'professionalReadiness',
    label: 'Professional Readiness',
    module: 'M6',
    recommendation:
      'Module 6 covers how to find and work with an attorney and financial professional.',
  },
];

// ─── Questions ─────────────────────────────────────────────────
const QUESTIONS = [
  { id: 'q1', domain: 'incomeAwareness', text: "Do you know your household\u2019s gross monthly income?" },
  { id: 'q2', domain: 'incomeAwareness', text: 'Can you name every income source \u2014 salary, bonus, RSUs, rental income, side income?' },
  { id: 'q3', domain: 'debtAwareness', text: 'Do you know the total balance on all joint debts?' },
  { id: 'q4', domain: 'debtAwareness', text: 'Do you know which debts are in your name only vs. joint?' },
  { id: 'q5', domain: 'assetAwareness', text: "Could you list your household\u2019s retirement accounts and approximate balances?" },
  { id: 'q6', domain: 'assetAwareness', text: "Do you know what property you own and how it\u2019s titled?" },
  { id: 'q7', domain: 'documentAccess', text: 'Do you have access to the last 3 years of tax returns?' },
  { id: 'q8', domain: 'documentAccess', text: 'Do you know where to find statements for every bank, investment, and retirement account?' },
  { id: 'q9', domain: 'professionalReadiness', text: 'Do you have your own attorney or know how to find one?' },
  { id: 'q10', domain: 'professionalReadiness', text: 'Have you spoken to a financial professional about divorce?' },
];

// ─── Likert scale ──────────────────────────────────────────────
const LIKERT = [
  { score: 0, label: 'I have no idea' },
  { score: 1, label: "I think so, but I\u2019m not sure" },
  { score: 2, label: 'I have a general sense' },
  { score: 3, label: 'I know this with confidence' },
];

// ─── Tier copy ─────────────────────────────────────────────────
const TIERS = {
  exploring: {
    headline: "You\u2019re at the beginning.",
    subtext:
      "That\u2019s exactly where ClearPath starts. Most women are right here \u2014 and that\u2019s not a problem, it\u2019s a starting point.",
  },
  preparing: {
    headline: 'You know more than you think.',
    subtext:
      "But there are gaps that could cost you. The good news: they\u2019re fixable, and now you can see exactly where they are.",
  },
  ready: {
    headline: 'You have strong financial awareness.',
    subtext:
      'ClearPath can help you put it to work \u2014 whether that means organizing what you know or modeling the decisions ahead.',
  },
};

// ─── Scoring helpers ───────────────────────────────────────────

function classify(totalScore) {
  if (totalScore <= 10) return 'exploring';
  if (totalScore <= 20) return 'preparing';
  return 'ready';
}

function computeResults(answers) {
  const domainScores = {};
  for (const d of DOMAINS) domainScores[d.key] = 0;
  for (const a of answers) {
    const q = QUESTIONS.find((qn) => qn.id === a.questionId);
    if (q) domainScores[q.domain] += a.score;
  }
  const totalScore = Object.values(domainScores).reduce((s, v) => s + v, 0);
  return { totalScore, domainScores, tier: classify(totalScore) };
}

// ─── Shared styles ─────────────────────────────────────────────

const srOnly = {
  position: 'absolute',
  width: '1px',
  height: '1px',
  padding: 0,
  margin: '-1px',
  overflow: 'hidden',
  clip: 'rect(0,0,0,0)',
  whiteSpace: 'nowrap',
  borderWidth: 0,
};

// ════════════════════════════════════════════════════════════════
// Component
// ════════════════════════════════════════════════════════════════

export default function ReadinessAssessment() {
  const {
    readinessAssessment,
    setReadinessAnswer,
    completeReadinessAssessment,
    resetReadinessAssessment,
    budgetGap,
  } = useM1Store();

  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [phase, setPhase] = useState('questions'); // questions | loading | results
  const [isDesktop, setIsDesktop] = useState(false);
  const [focusedOption, setFocusedOption] = useState(-1);
  const autoAdvanceRef = useRef(null);
  const optionRefs = useRef([]);

  // ── Hydrate from persisted store ──
  useEffect(() => {
    const state = useM1Store.getState().readinessAssessment;
    if (state.completed && state.results) {
      setPhase('results');
      return;
    }
    // Resume at first unanswered question
    const answeredIds = new Set((state.answers || []).map((a) => a.questionId));
    const idx = QUESTIONS.findIndex((q) => !answeredIds.has(q.id));
    setCurrentQuestion(idx === -1 ? QUESTIONS.length - 1 : idx);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Desktop detection ──
  useEffect(() => {
    const check = () => setIsDesktop(window.innerWidth > 1024);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  // ── Cleanup auto-advance timer ──
  useEffect(() => {
    return () => {
      if (autoAdvanceRef.current) clearTimeout(autoAdvanceRef.current);
    };
  }, []);

  // ── Derived values ──
  const currentQ = QUESTIONS[currentQuestion];
  const selectedScore = readinessAssessment.answers.find(
    (a) => a.questionId === currentQ?.id
  )?.score;
  const hasSelection = selectedScore !== undefined;

  // ── Advance to next question or finish ──
  const advance = useCallback(() => {
    if (currentQuestion < QUESTIONS.length - 1) {
      setCurrentQuestion((p) => p + 1);
      setFocusedOption(-1);
    } else {
      // Final question — score and show loading
      const answers = useM1Store.getState().readinessAssessment.answers;
      if (answers.length < QUESTIONS.length) return;
      const results = computeResults(answers);
      completeReadinessAssessment(results);

      // Write to Blueprint (§1 Personal Profile — assessment half)
      const currentBudgetGap = useM1Store.getState().budgetGap;
      useBlueprintStore.getState().updatePersonalProfile({
        assessment: { ...results, completedAt: new Date().toISOString() },
        budgetGap:
          currentBudgetGap?.completed && currentBudgetGap.results
            ? currentBudgetGap.results
            : null,
      });

      setPhase('loading');
      setTimeout(() => setPhase('results'), 400);
    }
  }, [currentQuestion, completeReadinessAssessment]);

  // ── Select a Likert option ──
  const handleSelect = useCallback(
    (score) => {
      setReadinessAnswer(currentQ.id, score);
      setFocusedOption(score);

      if (isDesktop) {
        if (autoAdvanceRef.current) clearTimeout(autoAdvanceRef.current);
        autoAdvanceRef.current = setTimeout(() => advance(), 600);
      }
    },
    [currentQ, isDesktop, advance, setReadinessAnswer]
  );

  // ── Back button ──
  const goBack = useCallback(() => {
    if (autoAdvanceRef.current) clearTimeout(autoAdvanceRef.current);
    setCurrentQuestion((p) => Math.max(0, p - 1));
    setFocusedOption(-1);
  }, []);

  // ── Keyboard nav for option list ──
  const handleKeyDown = useCallback(
    (e) => {
      if (e.key === 'ArrowDown' || e.key === 'ArrowRight') {
        e.preventDefault();
        setFocusedOption((p) => {
          const next = Math.min(p + 1, LIKERT.length - 1);
          optionRefs.current[next]?.focus();
          return next;
        });
      } else if (e.key === 'ArrowUp' || e.key === 'ArrowLeft') {
        e.preventDefault();
        setFocusedOption((p) => {
          const next = Math.max(p - 1, 0);
          optionRefs.current[next]?.focus();
          return next;
        });
      } else if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        if (focusedOption >= 0 && focusedOption < LIKERT.length) {
          handleSelect(LIKERT[focusedOption].score);
        }
      }
    },
    [focusedOption, handleSelect]
  );

  // ── Retake ──
  const handleRetake = useCallback(() => {
    resetReadinessAssessment();
    setCurrentQuestion(0);
    setFocusedOption(-1);
    setPhase('questions');
  }, [resetReadinessAssessment]);

  // ════════════════════════════════════════════════════════════
  // RENDER: Loading spinner
  // ════════════════════════════════════════════════════════════
  if (phase === 'loading') {
    return (
      <div
        style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          minHeight: '60vh',
          backgroundColor: PARCHMENT,
        }}
      >
        <div
          style={{
            width: 48,
            height: 48,
            border: `4px solid ${GOLD}33`,
            borderTopColor: GOLD,
            borderRadius: '50%',
            animation: 'cp-spin 0.8s linear infinite',
          }}
        />
        <style>{`@keyframes cp-spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  // ════════════════════════════════════════════════════════════
  // RENDER: Results screen
  // ════════════════════════════════════════════════════════════
  if (phase === 'results') {
    const results = readinessAssessment.results;
    if (!results) return null;

    const { totalScore, domainScores, tier } = results;
    const tierCopy = TIERS[tier];

    const chartData = DOMAINS.map((d) => ({
      domain: d.label,
      score: domainScores[d.key],
      fullMark: 6,
    }));

    const weakDomains = DOMAINS.filter((d) => domainScores[d.key] <= 3);
    const allStrong = weakDomains.length === 0;

    const altText = `Radar chart showing your scores across five financial awareness domains: ${DOMAINS.map(
      (d) => `${d.label} ${domainScores[d.key]}/6`
    ).join(', ')}.`;

    const budgetGapCompleted = budgetGap?.completed;

    return (
      <div
        style={{
          backgroundColor: PARCHMENT,
          minHeight: '60vh',
          padding: '40px 16px',
        }}
      >
        <div
          style={{
            maxWidth: 640,
            margin: '0 auto',
          }}
        >
          {/* ── Tier headline ── */}
          <div style={{ textAlign: 'center', marginBottom: 32 }}>
            <h1
              style={{
                fontFamily: '"Playfair Display", serif',
                fontSize: 'clamp(24px, 5vw, 36px)',
                color: NAVY,
                margin: '0 0 12px',
                fontWeight: 700,
              }}
            >
              {tierCopy.headline}
            </h1>
            <p
              style={{
                fontFamily: '"Source Sans Pro", sans-serif',
                fontSize: 'clamp(16px, 3vw, 18px)',
                color: NAVY,
                margin: 0,
                lineHeight: 1.6,
              }}
            >
              {tierCopy.subtext}
            </p>
          </div>

          {/* ── Radar chart ── */}
          <div aria-hidden="true" style={{ marginBottom: 8 }}>
            <ResponsiveContainer width="100%" height={Math.min(400, 320)}>
              <RadarChart data={chartData} cx="50%" cy="50%" outerRadius="70%">
                <PolarGrid stroke={`${NAVY}22`} />
                <PolarAngleAxis
                  dataKey="domain"
                  tick={{
                    fill: NAVY,
                    fontFamily: '"Source Sans Pro", sans-serif',
                    fontSize: 12,
                  }}
                />
                <PolarRadiusAxis
                  domain={[0, 6]}
                  tickCount={4}
                  tick={{ fill: `${NAVY}88`, fontSize: 10 }}
                  axisLine={false}
                />
                <Radar
                  dataKey="score"
                  stroke={GOLD}
                  fill={GOLD}
                  fillOpacity={0.3}
                  strokeWidth={2}
                />
              </RadarChart>
            </ResponsiveContainer>
          </div>

          {/* ── Screen-reader accessible table ── */}
          <div style={srOnly}>
            <table>
              <caption>Your scores across five financial awareness domains.</caption>
              <thead>
                <tr>
                  <th>Domain</th>
                  <th>Score</th>
                </tr>
              </thead>
              <tbody>
                {DOMAINS.map((d) => (
                  <tr key={d.key}>
                    <td>{d.label}</td>
                    <td>{domainScores[d.key]} out of 6</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* ── Domain recommendations ── */}
          <div style={{ marginBottom: 32 }}>
            {allStrong ? (
              <p
                style={{
                  fontFamily: '"Source Sans Pro", sans-serif',
                  fontSize: 16,
                  color: NAVY,
                  lineHeight: 1.6,
                  textAlign: 'center',
                }}
              >
                You&rsquo;re well-positioned. Full Access gives you
                AI-guided access to the full curriculum &mdash; from budgeting
                to settlement strategy.
              </p>
            ) : (
              weakDomains.map((d) => (
                <div
                  key={d.key}
                  style={{
                    backgroundColor: WHITE,
                    border: `1px solid ${NAVY}1A`,
                    borderLeft: `4px solid ${GOLD}`,
                    borderRadius: 4,
                    padding: '16px 20px',
                    marginBottom: 12,
                  }}
                >
                  <p
                    style={{
                      margin: '0 0 4px',
                      fontFamily: '"Source Sans Pro", sans-serif',
                      fontSize: 14,
                      fontWeight: 600,
                      color: NAVY,
                    }}
                  >
                    {d.label} &mdash; {domainScores[d.key]}/6
                  </p>
                  <p
                    style={{
                      margin: 0,
                      fontFamily: '"Source Sans Pro", sans-serif',
                      fontSize: 15,
                      color: NAVY,
                      lineHeight: 1.5,
                    }}
                  >
                    {d.recommendation}
                  </p>
                </div>
              ))
            )}
          </div>

          {/* ── CTA by tier ── */}
          <div style={{ textAlign: 'center', marginBottom: 32 }}>
            {tier === 'exploring' && (
              <a
                href="/modules/m1/budget-gap"
                style={{
                  display: 'inline-block',
                  backgroundColor: NAVY,
                  color: PARCHMENT,
                  fontFamily: '"Source Sans Pro", sans-serif',
                  fontWeight: 600,
                  fontSize: 16,
                  padding: '14px 32px',
                  borderRadius: 4,
                  textDecoration: 'none',
                }}
              >
                Take the Budget Gap Calculator
              </a>
            )}

            {tier === 'preparing' && (
              <>
                {weakDomains.length > 0 && (
                  <p
                    style={{
                      fontFamily: '"Source Sans Pro", sans-serif',
                      fontSize: 15,
                      color: NAVY,
                      marginBottom: 16,
                    }}
                  >
                    Start with your lowest-scoring areas above, or continue
                    exploring:
                  </p>
                )}
                {!budgetGapCompleted && (
                  <a
                    href="/modules/m1/budget-gap"
                    style={{
                      display: 'inline-block',
                      backgroundColor: NAVY,
                      color: PARCHMENT,
                      fontFamily: '"Source Sans Pro", sans-serif',
                      fontWeight: 600,
                      fontSize: 16,
                      padding: '14px 32px',
                      borderRadius: 4,
                      textDecoration: 'none',
                    }}
                  >
                    Take the Budget Gap Calculator
                  </a>
                )}
              </>
            )}

            {tier === 'ready' && (
              <>
                <a
                  href="/upgrade?plan=navigator"
                  style={{
                    display: 'inline-block',
                    backgroundColor: NAVY,
                    color: PARCHMENT,
                    fontFamily: '"Source Sans Pro", sans-serif',
                    fontWeight: 600,
                    fontSize: 16,
                    padding: '14px 32px',
                    borderRadius: 4,
                    textDecoration: 'none',
                    marginBottom: 12,
                  }}
                >
                  Explore Full Access
                </a>
                <br />
                <a
                  href="/upgrade?plan=essentials"
                  style={{
                    fontFamily: '"Source Sans Pro", sans-serif',
                    fontSize: 14,
                    color: NAVY,
                    textDecoration: 'underline',
                    opacity: 0.7,
                  }}
                >
                  Or start with Essentials
                </a>
              </>
            )}
          </div>

          {/* ── Exploring tier: always show Budget Gap CTA text ── */}
          {tier === 'exploring' && (
            <p
              style={{
                fontFamily: '"Source Sans Pro", sans-serif',
                fontSize: 15,
                color: NAVY,
                lineHeight: 1.6,
                textAlign: 'center',
                fontStyle: 'italic',
                marginBottom: 32,
              }}
            >
              Ready for the next step? The Budget Gap Calculator answers the
              question most women start with:{' '}
              <em>Can I afford to live on my own?</em>
            </p>
          )}

          {/* ── Retake link ── */}
          <div style={{ textAlign: 'center', marginBottom: 24 }}>
            <button
              onClick={handleRetake}
              style={{
                background: 'none',
                border: 'none',
                fontFamily: '"Source Sans Pro", sans-serif',
                fontSize: 14,
                color: NAVY,
                textDecoration: 'underline',
                cursor: 'pointer',
                opacity: 0.6,
                padding: 0,
              }}
            >
              Retake assessment
            </button>
          </div>

          {/* ── Disclaimer ── */}
          <p
            style={{
              fontFamily: '"Source Sans Pro", sans-serif',
              fontSize: 12,
              color: `${NAVY}99`,
              lineHeight: 1.6,
              textAlign: 'center',
              maxWidth: 560,
              margin: '0 auto',
            }}
          >
            This assessment is for educational and self-reflection purposes
            only. It does not constitute financial, legal, or tax advice. Your
            responses are not shared with any third party. For guidance specific
            to your situation, consult a Certified Divorce Financial
            Analyst&reg; or attorney.
          </p>
        </div>
      </div>
    );
  }

  // ════════════════════════════════════════════════════════════
  // RENDER: Question screen
  // ════════════════════════════════════════════════════════════
  return (
    <div
      style={{
        backgroundColor: PARCHMENT,
        minHeight: '60vh',
        padding: '40px 16px',
      }}
    >
      <div style={{ maxWidth: 640, margin: '0 auto' }}>
        {/* ── Progress bar ── */}
        <div style={{ marginBottom: 32 }}>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              marginBottom: 8,
            }}
          >
            <span
              style={{
                fontFamily: '"Source Sans Pro", sans-serif',
                fontSize: 14,
                color: `${NAVY}88`,
              }}
            >
              Question {currentQuestion + 1} of {QUESTIONS.length}
            </span>
          </div>
          <div
            role="progressbar"
            aria-valuenow={currentQuestion + 1}
            aria-valuemin={1}
            aria-valuemax={10}
            aria-label={`Question ${currentQuestion + 1} of ${QUESTIONS.length}`}
            style={{
              height: 6,
              backgroundColor: `${NAVY}15`,
              borderRadius: 3,
              overflow: 'hidden',
            }}
          >
            <div
              style={{
                height: '100%',
                width: `${((currentQuestion + 1) / QUESTIONS.length) * 100}%`,
                backgroundColor: GOLD,
                borderRadius: 3,
                transition: 'width 0.3s ease',
              }}
            />
          </div>
        </div>

        {/* ── Back button ── */}
        {currentQuestion > 0 && (
          <button
            onClick={goBack}
            aria-label="Go back to previous question"
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              fontFamily: '"Source Sans Pro", sans-serif',
              fontSize: 14,
              color: NAVY,
              padding: '0 0 16px',
              display: 'flex',
              alignItems: 'center',
              gap: 4,
              opacity: 0.6,
            }}
          >
            <span aria-hidden="true">&larr;</span> Back
          </button>
        )}

        {/* ── Question text ── */}
        <h2
          style={{
            fontFamily: '"Playfair Display", serif',
            fontSize: 'clamp(20px, 4vw, 28px)',
            color: NAVY,
            fontWeight: 700,
            marginBottom: 28,
            lineHeight: 1.35,
          }}
        >
          {currentQ.text}
        </h2>

        {/* ── Answer options ── */}
        <div
          role="radiogroup"
          aria-label={`Answers for question ${currentQuestion + 1}`}
          onKeyDown={handleKeyDown}
          style={{ display: 'flex', flexDirection: 'column', gap: 12 }}
        >
          {LIKERT.map((opt, idx) => {
            const isSelected = selectedScore === opt.score;
            return (
              <button
                key={opt.score}
                ref={(el) => { optionRefs.current[idx] = el; }}
                role="radio"
                aria-checked={isSelected}
                tabIndex={
                  focusedOption === idx || (focusedOption === -1 && idx === 0)
                    ? 0
                    : -1
                }
                onClick={() => handleSelect(opt.score)}
                style={{
                  display: 'block',
                  width: '100%',
                  textAlign: 'left',
                  padding: '16px 20px',
                  fontFamily: '"Source Sans Pro", sans-serif',
                  fontSize: 16,
                  color: NAVY,
                  backgroundColor: isSelected ? `${GOLD}1A` : WHITE,
                  border: isSelected
                    ? `1px solid ${GOLD}`
                    : `1px solid ${NAVY}1A`,
                  borderLeft: isSelected
                    ? `4px solid ${GOLD}`
                    : `1px solid ${NAVY}1A`,
                  borderRadius: 4,
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                  outline: 'none',
                }}
                onFocus={() => setFocusedOption(idx)}
              >
                {opt.label}
              </button>
            );
          })}
        </div>

        {/* ── Next button (mobile / tablet only) ── */}
        {!isDesktop && hasSelection && (
          <button
            onClick={advance}
            style={{
              display: 'block',
              width: '100%',
              marginTop: 24,
              padding: '14px 0',
              backgroundColor: NAVY,
              color: PARCHMENT,
              fontFamily: '"Source Sans Pro", sans-serif',
              fontWeight: 600,
              fontSize: 16,
              border: 'none',
              borderRadius: 4,
              cursor: 'pointer',
            }}
          >
            {currentQuestion === QUESTIONS.length - 1
              ? 'See my results'
              : 'Next \u2192'}
          </button>
        )}
      </div>
    </div>
  );
}
