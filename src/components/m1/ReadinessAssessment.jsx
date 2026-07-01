'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { Clock, Lock, Heart, Check, ArrowLeft } from 'lucide-react';
import { useM1Store } from '@/src/stores/m1Store';
import useBlueprintStore from '@/src/stores/blueprintStore';
import { T } from '@/src/lib/brand/tokens';

// ════════════════════════════════════════════════════════════════
// Life Transition Readiness Assessment
//
// Visual + UX redesign (Claude Design handoff). The MEASURED SURFACE is
// preserved byte-for-byte from the prior component: the 5 domains, 10 questions
// + their domain mapping, the 0–3 Likert scale, per-domain/total scoring, the
// ≤10/≤20/else tier thresholds, the ≤3 weak-domain rule, the tier headlines /
// subtext, the recommendation copy, and the per-tier CTAs + routes. Only the
// look and flow change: a new Welcome screen, a restyled one-question-per-screen
// flow, and a Results snapshot whose radar chart is replaced by animated
// horizontal readiness bars.
//
// Fonts come from next/font (--font-playfair / Newsreader / Inter via the T.*
// font tokens); colors are brand tokens (no hardcoded hexes).
// ════════════════════════════════════════════════════════════════

const PLAYFAIR = "var(--font-playfair), 'Playfair Display', Georgia, serif";
const GOLD_GRADIENT = `linear-gradient(90deg, ${T.GOLD}, ${T.GOLD_SOFT})`;

// ─── Domain definitions (preserved) ────────────────────────────
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
      'Module 2 helps you map everything you own and owe — including debts you may not know about.',
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

// ─── Questions (preserved) ─────────────────────────────────────
const QUESTIONS = [
  { id: 'q1', domain: 'incomeAwareness', text: "Do you know your household’s gross monthly income?" },
  { id: 'q2', domain: 'incomeAwareness', text: 'Can you name every income source — salary, bonus, RSUs, rental income, side income?' },
  { id: 'q3', domain: 'debtAwareness', text: 'Do you know the total balance on all joint debts?' },
  { id: 'q4', domain: 'debtAwareness', text: 'Do you know which debts are in your name only vs. joint?' },
  { id: 'q5', domain: 'assetAwareness', text: "Could you list your household’s retirement accounts and approximate balances?" },
  { id: 'q6', domain: 'assetAwareness', text: "Do you know what property you own and how it’s titled?" },
  { id: 'q7', domain: 'documentAccess', text: 'Do you have access to the last 3 years of tax returns?' },
  { id: 'q8', domain: 'documentAccess', text: 'Do you know where to find statements for every bank, investment, and retirement account?' },
  { id: 'q9', domain: 'professionalReadiness', text: 'Do you have your own attorney or know how to find one?' },
  { id: 'q10', domain: 'professionalReadiness', text: 'Have you spoken to a financial professional about divorce?' },
];

// ─── Likert scale (preserved) ──────────────────────────────────
const LIKERT = [
  { score: 0, label: 'I have no idea' },
  { score: 1, label: "I think so, but I’m not sure" },
  { score: 2, label: 'I have a general sense' },
  { score: 3, label: 'I know this with confidence' },
];

// ─── Tier headline + subtext (preserved) ───────────────────────
const TIERS = {
  exploring: {
    headline: "You’re at the beginning.",
    subtext:
      "That’s exactly where ClearPath starts. Most women are right here — and that’s not a problem, it’s a starting point.",
  },
  preparing: {
    headline: 'You know more than you think.',
    subtext:
      "But there are gaps that could cost you. The good news: they’re fixable, and now you can see exactly where they are.",
  },
  ready: {
    headline: 'You have strong financial awareness.',
    subtext:
      'ClearPath can help you put it to work — whether that means organizing what you know or modeling the decisions ahead.',
  },
};

// Preserved verbatim from the prior component (adjudicated: keep production copy).
const ALL_STRONG_MESSAGE =
  "You’re well-positioned. Full Access gives you AI-guided access to the full curriculum — from budgeting to settlement strategy.";

// ─── Motion / timing ───────────────────────────────────────────
const AUTO_ADVANCE_MS = 520;   // pause after a selection before advancing
const CROSSFADE_MS = 200;      // opacity transition duration
const CROSSFADE_SWAP_MS = 190; // swap question content mid-fade
const LOADING_MS = 600;        // "putting your snapshot together" beat
const REVEAL_MS = 120;         // delay before the result bars animate in
const INPUT_LOCK_MS = 250;     // ignore taps on a freshly-shown question (mistap guard)

// ════════════════════════════════════════════════════════════════
// Pure scoring helpers (exported for direct preservation testing)
// ════════════════════════════════════════════════════════════════
export function classify(totalScore) {
  if (totalScore <= 10) return 'exploring';
  if (totalScore <= 20) return 'preparing';
  return 'ready';
}

export function computeResults(answers) {
  const domainScores = {};
  for (const d of DOMAINS) domainScores[d.key] = 0;
  for (const a of answers) {
    const q = QUESTIONS.find((qn) => qn.id === a.questionId);
    if (q) domainScores[q.domain] += a.score;
  }
  const totalScore = Object.values(domainScores).reduce((s, v) => s + v, 0);
  return { totalScore, domainScores, tier: classify(totalScore) };
}

function descriptor(score) {
  if (score <= 1) return 'Just getting started';
  if (score <= 3) return 'Coming into focus';
  if (score <= 5) return 'On solid ground';
  return 'Fully confident';
}

// ─── Shared style atoms ────────────────────────────────────────
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

const eyebrowStyle = {
  fontFamily: T.FONT_BODY,
  fontSize: 11,
  fontWeight: 700,
  textTransform: 'uppercase',
  letterSpacing: '0.13em',
  color: T.PILL_TEXT,
};

// ════════════════════════════════════════════════════════════════
// Component
// ════════════════════════════════════════════════════════════════
// `embedded` (default false = standalone): when rendered inline on the M1
// landing, the per-tier Budget-Gap CTA smooth-scrolls to the sibling section the
// landing owns (id passed via inPageTargetId) instead of routing to the
// standalone sub-route. Standalone render keeps native route navigation.
export default function ReadinessAssessment({ embedded = false, inPageTargetId = 'm1-budget-gap-section' }) {
  const {
    readinessAssessment,
    setReadinessAnswer,
    completeReadinessAssessment,
    resetReadinessAssessment,
    budgetGap,
  } = useM1Store();

  const [phase, setPhase] = useState('welcome'); // welcome | questions | loading | results
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [qOpacity, setQOpacity] = useState(1);
  const [revealed, setRevealed] = useState(false);
  const [locked, setLocked] = useState(false);
  const [focusedOption, setFocusedOption] = useState(-1);
  const [hoveredOption, setHoveredOption] = useState(-1);
  // Reduced-motion drives the accessible manual-Continue path (no timed
  // auto-advance, no crossfade). Read lazily — it never affects the first
  // (welcome) render, so there is no SSR/client hydration mismatch.
  const [reduceMotion, setReduceMotion] = useState(
    () =>
      typeof window !== 'undefined' &&
      typeof window.matchMedia === 'function' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches
  );

  const advanceT = useRef(null);
  const fadeT = useRef(null);
  const loadT = useRef(null);
  const revealT = useRef(null);
  const lockT = useRef(null);
  const optionRefs = useRef([]);
  const questionHeadingRef = useRef(null);
  const resultsHeadingRef = useRef(null);

  const autoAdvance = !reduceMotion;

  // ── In-page nav (D1 split): embedded ⇒ the Budget-Gap CTA scrolls to the
  // landing's Budget Gap section instead of navigating; standalone keeps the
  // route. The landing owns the target id (passed as a prop), so the component
  // never traverses parent DOM — it just resolves an id the landing declared. ──
  const budgetGapHref = embedded ? `#${inPageTargetId}` : '/modules/m1/budget-gap';
  const handleBudgetGapNav = embedded
    ? (e) => {
        e.preventDefault();
        document.getElementById(inPageTargetId)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    : undefined;

  // ── Keep reduced-motion preference live ──
  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return;
    const mql = window.matchMedia('(prefers-reduced-motion: reduce)');
    const onChange = (e) => setReduceMotion(e.matches);
    mql.addEventListener?.('change', onChange);
    return () => mql.removeEventListener?.('change', onChange);
  }, []);

  // ── Post-hydration jump: a returning, completed user lands on Results (D4),
  //    not behind the Welcome screen. Done in an effect (not a lazy phase
  //    initializer) so SSR and the first client render agree on 'welcome'. ──
  useEffect(() => {
    const ra = useM1Store.getState().readinessAssessment;
    if (ra.completed && ra.results) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- intentional post-hydration jump (D4); mirrors BudgetGapCalculator
      setPhase('results');
      revealT.current = setTimeout(() => setRevealed(true), REVEAL_MS);
    }
    return () => {
      clearTimeout(advanceT.current);
      clearTimeout(fadeT.current);
      clearTimeout(loadT.current);
      clearTimeout(revealT.current);
      clearTimeout(lockT.current);
    };
  }, []);

  // ── Focus management: re-home keyboard focus whenever the screen changes so it
  //    is never dropped to <body> on a transition (begin / advance / back /
  //    retake / results). Focus the new heading — it announces the question (or
  //    result) and doesn't read as a pre-selected option. Pointer users see no
  //    outline (programmatic focus doesn't trigger :focus-visible). ──
  useEffect(() => {
    if (phase === 'questions') questionHeadingRef.current?.focus();
    else if (phase === 'results') resultsHeadingRef.current?.focus();
  }, [phase, currentQuestion]);

  const firstUnanswered = useCallback(() => {
    const answered = new Set(
      (useM1Store.getState().readinessAssessment.answers || []).map((a) => a.questionId)
    );
    const idx = QUESTIONS.findIndex((q) => !answered.has(q.id));
    return idx === -1 ? 0 : idx;
  }, []);

  // ── Finish: score, persist, write the blueprint, reveal results ──
  const enterResults = useCallback(
    (answers) => {
      const results = computeResults(answers);
      completeReadinessAssessment(results);

      // §1 Personal Profile (assessment half) — preserved side effect.
      const currentBudgetGap = useM1Store.getState().budgetGap;
      useBlueprintStore.getState().updatePersonalProfile({
        assessment: { ...results, completedAt: new Date().toISOString() },
        budgetGap:
          currentBudgetGap?.completed && currentBudgetGap.results
            ? currentBudgetGap.results
            : null,
      });

      if (reduceMotion) {
        setPhase('results');
        setRevealed(true);
        return;
      }
      setPhase('loading');
      clearTimeout(loadT.current);
      loadT.current = setTimeout(() => {
        setPhase('results');
        clearTimeout(revealT.current);
        revealT.current = setTimeout(() => setRevealed(true), REVEAL_MS);
      }, LOADING_MS);
    },
    [completeReadinessAssessment, reduceMotion]
  );

  // ── Advance to the next question, or finish ──
  const advance = useCallback(() => {
    if (currentQuestion < QUESTIONS.length - 1) {
      if (reduceMotion) {
        setCurrentQuestion((p) => p + 1);
        setFocusedOption(-1);
        return;
      }
      setQOpacity(0);
      clearTimeout(fadeT.current);
      fadeT.current = setTimeout(() => {
        setCurrentQuestion((p) => p + 1);
        setFocusedOption(-1);
        setQOpacity(1);
        // Mistap guard: briefly ignore taps on the freshly-shown question so a
        // stray tap can't auto-answer the next screen (replaces the old
        // desktop-only auto-advance split).
        setLocked(true);
        clearTimeout(lockT.current);
        lockT.current = setTimeout(() => setLocked(false), INPUT_LOCK_MS);
      }, CROSSFADE_SWAP_MS);
    } else {
      const answers = useM1Store.getState().readinessAssessment.answers;
      if (answers.length < QUESTIONS.length) return;
      enterResults(answers);
    }
  }, [currentQuestion, reduceMotion, enterResults]);

  // ── Select a Likert option ──
  const handleSelect = useCallback(
    (score) => {
      if (locked) return;
      const q = QUESTIONS[currentQuestion];
      if (!q) return;
      setReadinessAnswer(q.id, score);
      setFocusedOption(LIKERT.findIndex((l) => l.score === score));
      if (autoAdvance) {
        clearTimeout(advanceT.current);
        advanceT.current = setTimeout(() => advance(), AUTO_ADVANCE_MS);
      }
    },
    [locked, currentQuestion, autoAdvance, advance, setReadinessAnswer]
  );

  // ── Begin (welcome → first unanswered question) ──
  const begin = useCallback(() => {
    clearTimeout(advanceT.current);
    setCurrentQuestion(firstUnanswered());
    setFocusedOption(-1);
    setQOpacity(1);
    setLocked(false);
    setPhase('questions');
  }, [firstUnanswered]);

  // ── Back (Q1 → welcome; else previous question) ──
  const goBack = useCallback(() => {
    clearTimeout(advanceT.current);
    if (currentQuestion === 0) {
      setPhase('welcome');
      return;
    }
    if (reduceMotion) {
      setCurrentQuestion((p) => Math.max(0, p - 1));
      setFocusedOption(-1);
      return;
    }
    setQOpacity(0);
    clearTimeout(fadeT.current);
    fadeT.current = setTimeout(() => {
      setCurrentQuestion((p) => Math.max(0, p - 1));
      setFocusedOption(-1);
      setQOpacity(1);
    }, CROSSFADE_SWAP_MS);
  }, [currentQuestion, reduceMotion]);

  // ── Retake (clears store, restarts at Q1) ──
  const handleRetake = useCallback(() => {
    clearTimeout(advanceT.current);
    clearTimeout(fadeT.current);
    clearTimeout(loadT.current);
    clearTimeout(revealT.current);
    clearTimeout(lockT.current);
    resetReadinessAssessment();
    setCurrentQuestion(0);
    setFocusedOption(-1);
    setRevealed(false);
    setLocked(false);
    setQOpacity(1);
    setPhase('questions');
  }, [resetReadinessAssessment]);

  // ── Keyboard nav within the option radiogroup ──
  const handleKeyDown = useCallback(
    (e) => {
      if (e.key === 'ArrowDown' || e.key === 'ArrowRight') {
        e.preventDefault();
        setFocusedOption((p) => {
          const next = Math.min((p < 0 ? -1 : p) + 1, LIKERT.length - 1);
          optionRefs.current[next]?.focus();
          return next;
        });
      } else if (e.key === 'ArrowUp' || e.key === 'ArrowLeft') {
        e.preventDefault();
        setFocusedOption((p) => {
          const next = Math.max((p < 0 ? 0 : p) - 1, 0);
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

  // ── Derived ──
  const currentQ = QUESTIONS[currentQuestion];
  const currentDomain = currentQ ? DOMAINS.find((d) => d.key === currentQ.domain) : null;
  const selectedScore = readinessAssessment.answers.find(
    (a) => a.questionId === currentQ?.id
  )?.score;
  const hasSelection = selectedScore !== undefined;
  const isLast = currentQuestion === QUESTIONS.length - 1;

  const styleTag = (
    <style>{`
      @keyframes cp-spin { to { transform: rotate(360deg); } }
      @keyframes cp-rise { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: none; } }
      .cp-ra :focus-visible { outline: 2px solid ${T.GOLD}; outline-offset: 3px; border-radius: 6px; }
      .cp-ra-primary { background: ${T.NAVY}; transition: background-color 120ms ease; }
      .cp-ra-primary:hover { background: ${T.NAVY_DEEP}; }
      .cp-ra-back:hover { background: ${T.GOLD_TINT_SUBTLE}; }
    `}</style>
  );

  const pageRoot = (children) => (
    <div
      className="cp-ra"
      style={{
        backgroundColor: T.PARCHMENT,
        minHeight: '60vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        padding: '0 18px',
        color: T.NAVY,
        fontFamily: T.FONT_BODY,
      }}
    >
      {styleTag}
      {children}
    </div>
  );

  // ════════════════════════════════════════════════════════════
  // WELCOME
  // ════════════════════════════════════════════════════════════
  if (phase === 'welcome') {
    const cards = [
      { Icon: Clock, title: 'About 5 minutes', sub: 'Go at your own pace' },
      { Icon: Lock, title: 'Completely private', sub: 'Your answers stay with you' },
      { Icon: Heart, title: 'No right answers', sub: 'Just honest ones' },
    ];
    return pageRoot(
      <div
        style={{
          width: '100%',
          maxWidth: 600,
          margin: '0 auto',
          padding: 'clamp(44px,9vh,88px) 0 56px',
          textAlign: 'center',
        }}
      >
        <div style={{ ...eyebrowStyle, marginBottom: 22 }}>Life Transition Readiness</div>

        <h1
          style={{
            fontFamily: PLAYFAIR,
            fontWeight: 700,
            fontSize: 'clamp(31px,6.4vw,46px)',
            lineHeight: 1.12,
            letterSpacing: '-0.015em',
            color: T.NAVY,
            margin: '0 0 22px',
          }}
        >
          Divorce brings a lot of unknowns.
          <br />
          <span style={{ fontStyle: 'italic', fontWeight: 600, color: T.GOLD }}>
            This is where you start sorting them out.
          </span>
        </h1>

        <p
          style={{
            fontFamily: T.FONT_BODY,
            fontSize: 'clamp(16px,2.6vw,18px)',
            lineHeight: 1.65,
            color: T.INK_2,
            margin: '0 auto 38px',
            maxWidth: 480,
          }}
        >
          A few quiet questions to help you see where you stand today &mdash; across your income,
          debts, assets, documents, and the people in your corner. Nothing to prepare, and nothing
          to get wrong.
        </p>

        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: 14,
            justifyContent: 'center',
            marginBottom: 40,
          }}
        >
          {cards.map(({ Icon, title, sub }) => (
            <div
              key={title}
              style={{
                flex: '1 1 150px',
                minWidth: 150,
                maxWidth: 178,
                background: T.CARD,
                border: `1px solid ${T.LINE}`,
                borderRadius: 12,
                boxShadow: T.SHADOW_CARD,
                padding: '22px 16px',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 11,
              }}
            >
              <span
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: 999,
                  background: T.PARCHMENT_DEEP,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Icon size={22} strokeWidth={2} color={T.NAVY} aria-hidden="true" />
              </span>
              <span style={{ fontSize: 14.5, fontWeight: 600, color: T.NAVY }}>{title}</span>
              <span style={{ fontSize: 12.5, color: T.MUTED, lineHeight: 1.4 }}>{sub}</span>
            </div>
          ))}
        </div>

        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 26 }}>
          <button
            type="button"
            onClick={begin}
            className="cp-ra-primary"
            style={{
              color: T.CARD,
              fontFamily: T.FONT_BODY,
              fontWeight: 600,
              fontSize: 16,
              border: 'none',
              borderRadius: 8,
              padding: '14px 30px',
              cursor: 'pointer',
            }}
          >
            Begin the assessment&nbsp;&nbsp;&rarr;
          </button>
        </div>

        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 9,
            justifyContent: 'center',
          }}
        >
          <span
            style={{
              width: 20,
              height: 20,
              borderRadius: 999,
              background: T.GOLD_TINT,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            <Check size={12} strokeWidth={3} color={T.GOLD} aria-hidden="true" />
          </span>
          <span style={{ fontSize: 13, color: T.MUTED }}>
            Built by a Certified Divorce Financial Analyst&reg;
          </span>
        </div>
      </div>
    );
  }

  // ════════════════════════════════════════════════════════════
  // LOADING
  // ════════════════════════════════════════════════════════════
  if (phase === 'loading') {
    return pageRoot(
      <div
        role="status"
        aria-live="polite"
        aria-atomic="true"
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 20,
          minHeight: '60vh',
        }}
      >
        <div
          aria-hidden="true"
          style={{
            width: 44,
            height: 44,
            border: `3px solid ${T.GOLD_TINT}`,
            borderTopColor: T.GOLD,
            borderRadius: '50%',
            animation: 'cp-spin 0.8s linear infinite',
          }}
        />
        <span style={{ fontFamily: T.FONT_DISPLAY, fontStyle: 'italic', fontSize: 17, color: T.INK_2 }}>
          Putting your snapshot together&hellip;
        </span>
      </div>
    );
  }

  // ════════════════════════════════════════════════════════════
  // RESULTS
  // ════════════════════════════════════════════════════════════
  if (phase === 'results') {
    const results = readinessAssessment.results;
    if (!results) return pageRoot(null);

    const { domainScores, tier } = results;
    const tierCopy = TIERS[tier];
    const weakDomains = DOMAINS.filter((d) => domainScores[d.key] <= 3);
    const allStrong = weakDomains.length === 0;
    const budgetGapCompleted = budgetGap?.completed;
    const fillTransition = reduceMotion ? 'none' : 'width 750ms cubic-bezier(.22,.61,.36,1)';

    return pageRoot(
      <div
        style={{
          width: '100%',
          maxWidth: 640,
          margin: '0 auto',
          padding: 'clamp(32px,7vh,60px) 0 52px',
        }}
      >
        {/* ── Header ── */}
        <div style={{ textAlign: 'center', marginBottom: 34 }}>
          <div style={{ ...eyebrowStyle, marginBottom: 18 }}>Your Readiness Snapshot</div>
          <h1
            ref={resultsHeadingRef}
            tabIndex={-1}
            style={{
              fontFamily: PLAYFAIR,
              fontWeight: 700,
              fontSize: 'clamp(28px,5.6vw,40px)',
              lineHeight: 1.14,
              letterSpacing: '-0.015em',
              color: T.NAVY,
              margin: '0 0 14px',
              outline: 'none',
            }}
          >
            {tierCopy.headline}
          </h1>
          <p
            style={{
              fontFamily: T.FONT_BODY,
              fontSize: 'clamp(16px,2.6vw,18px)',
              lineHeight: 1.6,
              color: T.INK_2,
              margin: '0 auto',
              maxWidth: 500,
            }}
          >
            {tierCopy.subtext}
          </p>
        </div>

        {/* ── Readiness map ── */}
        <div
          style={{
            background: T.CARD,
            border: `1px solid ${T.LINE}`,
            borderRadius: 12,
            boxShadow: T.SHADOW_CARD,
            padding: '28px 26px',
            marginBottom: 30,
          }}
        >
          <div
            style={{
              fontFamily: T.FONT_BODY,
              fontSize: 11,
              fontWeight: 700,
              textTransform: 'uppercase',
              letterSpacing: '0.1em',
              color: T.NAVY,
              marginBottom: 6,
            }}
          >
            Where you stand today
          </div>
          <p
            style={{
              fontFamily: T.FONT_DISPLAY,
              fontStyle: 'italic',
              fontSize: 15,
              color: T.MUTED,
              margin: '0 0 24px',
              lineHeight: 1.5,
            }}
          >
            A starting map &mdash; not a grade. It simply shows your footing in each area.
          </p>

          {DOMAINS.map((d) => {
            const score = domainScores[d.key];
            const pct = revealed ? Math.round((score / 6) * 100) : 0;
            return (
              <div key={d.key} data-testid="readiness-bar" style={{ marginBottom: 22 }}>
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'baseline',
                    gap: 12,
                    marginBottom: 9,
                  }}
                >
                  <span style={{ fontFamily: T.FONT_BODY, fontSize: 15, fontWeight: 600, color: T.NAVY }}>
                    {d.label}
                  </span>
                  <span
                    style={{
                      fontFamily: T.FONT_NUMERIC,
                      fontVariantNumeric: 'tabular-nums',
                      fontSize: 15,
                      fontWeight: 600,
                      color: T.INK_2,
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {score} / 6
                  </span>
                </div>
                <div
                  style={{
                    height: 10,
                    background: T.NAVY_06,
                    borderRadius: 999,
                    overflow: 'hidden',
                  }}
                >
                  <div
                    style={{
                      width: `${pct}%`,
                      height: '100%',
                      borderRadius: 999,
                      background: GOLD_GRADIENT,
                      transition: fillTransition,
                    }}
                  />
                </div>
                <div style={{ fontFamily: T.FONT_BODY, fontSize: 12.5, color: T.MUTED, marginTop: 7 }}>
                  {descriptor(score)}
                </div>
              </div>
            );
          })}
        </div>

        {/* ── Screen-reader scores table (preserved) ── */}
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

        {/* ── All-strong message OR weak-domain cards ── */}
        {allStrong ? (
          <p
            style={{
              fontFamily: T.FONT_BODY,
              fontSize: 16,
              lineHeight: 1.6,
              color: T.NAVY,
              textAlign: 'center',
              margin: '0 auto 30px',
              maxWidth: 520,
            }}
          >
            {ALL_STRONG_MESSAGE}
          </p>
        ) : (
          <div style={{ marginBottom: 30 }}>
            <div style={{ ...eyebrowStyle, color: T.PILL_TEXT, marginBottom: 14, letterSpacing: '0.1em' }}>
              Where to start
            </div>
            {weakDomains.map((d) => (
              <div
                key={d.key}
                style={{
                  background: T.CARD,
                  border: `1px solid ${T.LINE}`,
                  borderLeft: `4px solid ${T.GOLD}`,
                  borderRadius: 10,
                  boxShadow: T.SHADOW_CARD,
                  padding: '18px 20px',
                  marginBottom: 12,
                }}
              >
                <div
                  style={{
                    fontFamily: T.FONT_BODY,
                    fontSize: 14,
                    fontWeight: 700,
                    color: T.NAVY,
                    marginBottom: 5,
                  }}
                >
                  {d.label} &mdash; {domainScores[d.key]}/6
                </div>
                <div style={{ fontFamily: T.FONT_BODY, fontSize: 15, lineHeight: 1.55, color: T.INK_2 }}>
                  {d.recommendation}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ── Per-tier CTA ── */}
        <div style={{ textAlign: 'center', marginBottom: 18 }}>
          {tier === 'exploring' && (
            <>
              <p
                style={{
                  fontFamily: T.FONT_DISPLAY,
                  fontStyle: 'italic',
                  fontSize: 16,
                  lineHeight: 1.6,
                  color: T.INK_2,
                  margin: '0 auto 22px',
                  maxWidth: 500,
                }}
              >
                Ready for the next step? The Budget Gap Calculator answers the question most women
                start with: <em>Can I afford to live on my own?</em>
              </p>
              <PrimaryLink href={budgetGapHref} onClick={handleBudgetGapNav}>
                Take the Budget Gap Calculator&nbsp;&nbsp;&rarr;
              </PrimaryLink>
            </>
          )}

          {tier === 'preparing' && (
            <>
              {weakDomains.length > 0 && (
                <p
                  style={{
                    fontFamily: T.FONT_BODY,
                    fontSize: 15,
                    lineHeight: 1.6,
                    color: T.INK_2,
                    margin: '0 auto 22px',
                    maxWidth: 480,
                  }}
                >
                  Start with your lowest-scoring areas above, or continue exploring:
                </p>
              )}
              {!budgetGapCompleted && (
                <PrimaryLink href={budgetGapHref} onClick={handleBudgetGapNav}>
                  Take the Budget Gap Calculator&nbsp;&nbsp;&rarr;
                </PrimaryLink>
              )}
            </>
          )}

          {tier === 'ready' && (
            <>
              <div style={{ marginBottom: 14 }}>
                <PrimaryLink href="/upgrade?plan=navigator">Explore Full Access&nbsp;&nbsp;&rarr;</PrimaryLink>
              </div>
              <a
                href="/upgrade?plan=essentials"
                style={{
                  fontFamily: T.FONT_BODY,
                  fontSize: 14,
                  color: T.INK_2,
                  textDecoration: 'underline',
                  textUnderlineOffset: 3,
                  padding: 4,
                }}
              >
                Or start with Essentials
              </a>
            </>
          )}
        </div>

        {/* ── Retake ── */}
        <div style={{ textAlign: 'center', margin: '14px 0 26px' }}>
          <button
            type="button"
            onClick={handleRetake}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              fontFamily: T.FONT_BODY,
              fontSize: 13.5,
              color: T.MUTED,
              textDecoration: 'underline',
              textUnderlineOffset: 3,
              padding: 4,
            }}
          >
            Retake assessment
          </button>
        </div>

        {/* ── Disclaimer (gold rail) ── */}
        <div
          style={{
            background: T.GOLD_TINT,
            border: `1px solid ${T.GOLD_BORDER}`,
            borderLeft: `3px solid ${T.GOLD}`,
            borderRadius: 8,
            padding: '16px 18px',
          }}
        >
          <div
            style={{
              fontFamily: T.FONT_BODY,
              fontSize: 12,
              fontWeight: 700,
              textTransform: 'uppercase',
              letterSpacing: '0.1em',
              color: T.PILL_TEXT,
              marginBottom: 6,
            }}
          >
            Not legal advice
          </div>
          <p style={{ margin: 0, fontFamily: T.FONT_BODY, fontSize: 13.5, lineHeight: 1.6, color: T.INK_2 }}>
            This assessment is for educational and self-reflection purposes only. It does not
            constitute financial, legal, or tax advice. Your responses are not shared with any third
            party. For guidance specific to your situation, consult a Certified Divorce Financial
            Analyst&reg; or attorney.
          </p>
        </div>
      </div>
    );
  }

  // ════════════════════════════════════════════════════════════
  // QUESTIONS
  // ════════════════════════════════════════════════════════════
  const progressPct = ((currentQuestion + 1) / QUESTIONS.length) * 100;

  return pageRoot(
    <div
      style={{
        width: '100%',
        maxWidth: 600,
        margin: '0 auto',
        padding: 'clamp(28px,6vh,52px) 0 48px',
      }}
    >
      {/* ── Progress ── */}
      <div style={{ marginBottom: 30 }}>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: 10,
          }}
        >
          <span
            style={{
              fontFamily: T.FONT_BODY,
              fontSize: 11,
              fontWeight: 700,
              textTransform: 'uppercase',
              letterSpacing: '0.11em',
              color: T.PILL_TEXT,
            }}
          >
            Question {currentQuestion + 1} of {QUESTIONS.length}
          </span>
          <button
            type="button"
            onClick={goBack}
            className="cp-ra-back"
            aria-label={
              currentQuestion === 0 ? 'Back to the welcome screen' : 'Back to the previous question'
            }
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              fontFamily: T.FONT_BODY,
              fontSize: 13,
              color: T.INK_2,
              padding: '4px 6px',
              display: 'flex',
              alignItems: 'center',
              gap: 5,
              borderRadius: 6,
            }}
          >
            <ArrowLeft size={15} strokeWidth={2} aria-hidden="true" /> Back
          </button>
        </div>
        <div
          role="progressbar"
          aria-valuenow={currentQuestion + 1}
          aria-valuemin={1}
          aria-valuemax={QUESTIONS.length}
          aria-label={`Question ${currentQuestion + 1} of ${QUESTIONS.length}`}
          style={{ height: 6, background: T.NAVY_12, borderRadius: 999, overflow: 'hidden' }}
        >
          <div
            style={{
              height: '100%',
              width: `${progressPct}%`,
              background: GOLD_GRADIENT,
              borderRadius: 999,
              transition: reduceMotion ? 'none' : 'width 350ms ease',
            }}
          />
        </div>
      </div>

      {/* ── Question + options (crossfade) ── */}
      <div style={{ opacity: qOpacity, transition: reduceMotion ? 'none' : `opacity ${CROSSFADE_MS}ms ease` }}>
        <div
          style={{
            fontFamily: T.FONT_BODY,
            fontSize: 11,
            fontWeight: 700,
            textTransform: 'uppercase',
            letterSpacing: '0.11em',
            color: T.GOLD,
            marginBottom: 14,
          }}
        >
          {currentDomain ? currentDomain.label : ''}
        </div>

        <h2
          ref={questionHeadingRef}
          tabIndex={-1}
          style={{
            fontFamily: T.FONT_DISPLAY,
            fontWeight: 600,
            fontSize: 'clamp(24px,4.6vw,31px)',
            lineHeight: 1.28,
            color: T.NAVY,
            margin: '0 0 28px',
            outline: 'none',
          }}
        >
          {currentQ ? currentQ.text : ''}
        </h2>

        <div
          role="radiogroup"
          aria-label={`Answers for question ${currentQuestion + 1}`}
          onKeyDown={handleKeyDown}
          style={{ display: 'flex', flexDirection: 'column', gap: 12 }}
        >
          {LIKERT.map((opt, idx) => {
            const selected = selectedScore === opt.score;
            const hovered = hoveredOption === idx && !selected;
            return (
              <button
                key={opt.score}
                ref={(el) => {
                  optionRefs.current[idx] = el;
                }}
                type="button"
                role="radio"
                aria-checked={selected}
                tabIndex={focusedOption === idx || (focusedOption === -1 && idx === 0) ? 0 : -1}
                onClick={() => handleSelect(opt.score)}
                onFocus={() => setFocusedOption(idx)}
                onMouseEnter={() => setHoveredOption(idx)}
                onMouseLeave={() => setHoveredOption(-1)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: 14,
                  width: '100%',
                  textAlign: 'left',
                  minHeight: 62,
                  padding: '18px 22px',
                  boxSizing: 'border-box',
                  fontFamily: T.FONT_BODY,
                  fontSize: 16.5,
                  lineHeight: 1.4,
                  color: T.NAVY,
                  borderRadius: 11,
                  cursor: 'pointer',
                  transition: 'all 140ms ease',
                  boxShadow: hovered ? '0 2px 8px rgba(27,42,74,0.10)' : T.SHADOW_CARD,
                  background: selected ? T.GOLD_TINT : T.CARD,
                  border: selected
                    ? `1px solid ${T.GOLD}`
                    : `1px solid ${hovered ? T.GOLD : T.LINE}`,
                  borderLeft: `4px solid ${selected ? T.GOLD : hovered ? T.GOLD : T.LINE}`,
                }}
              >
                <span>{opt.label}</span>
                <Check
                  size={22}
                  strokeWidth={3}
                  color={T.GOLD}
                  aria-hidden="true"
                  style={{ flexShrink: 0, opacity: selected ? 1 : 0, transition: 'opacity 140ms ease' }}
                />
              </button>
            );
          })}
        </div>

        {/* Manual Continue — shown only when auto-advance is off (reduced motion). */}
        {!autoAdvance && hasSelection && (
          <button
            type="button"
            onClick={advance}
            className="cp-ra-primary"
            style={{
              width: '100%',
              marginTop: 22,
              padding: 15,
              color: T.CARD,
              fontFamily: T.FONT_BODY,
              fontWeight: 600,
              fontSize: 16,
              border: 'none',
              borderRadius: 8,
              cursor: 'pointer',
            }}
          >
            {isLast ? 'See my snapshot  →' : 'Continue  →'}
          </button>
        )}

        <p
          style={{
            textAlign: 'center',
            fontFamily: T.FONT_DISPLAY,
            fontStyle: 'italic',
            fontSize: 14,
            color: T.MUTED,
            margin: '24px 0 0',
          }}
        >
          There are no right answers here &mdash; just answer honestly.
        </p>
      </div>
    </div>
  );
}

// Navy pill link used for the per-tier CTAs. Anchor in both modes: standalone
// uses a real route href; embedded uses an in-page hash href + an onClick that
// smooth-scrolls (progressive enhancement — the hash anchor still jumps if JS
// is off). onClick is optional so route CTAs (no handler) are unaffected.
function PrimaryLink({ href, children, onClick }) {
  return (
    <a
      href={href}
      onClick={onClick}
      className="cp-ra-primary"
      style={{
        display: 'inline-block',
        color: T.CARD,
        fontFamily: T.FONT_BODY,
        fontWeight: 600,
        fontSize: 16,
        padding: '14px 30px',
        borderRadius: 8,
        textDecoration: 'none',
      }}
    >
      {children}
    </a>
  );
}
