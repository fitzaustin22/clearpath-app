'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useM3Store } from '@/src/stores/m3Store';
import { useM1Store } from '@/src/stores/m1Store';

// ─── Brand tokens ──────────────────────────────────────────────────────────────
const NAVY = '#1B2A4A';
const GOLD = '#C8A96E';
const PARCHMENT = '#FAF8F2';
const WHITE = '#FFFFFF';
const GREEN = '#2D8A4E';
const AMBER = '#D97706';
const SOURCE = '"Source Sans Pro", -apple-system, system-ui, sans-serif';
const PLAYFAIR = '"Playfair Display", Georgia, serif';

// ─── Responsive breakpoints ───────────────────────────────────────────────────
function useBreakpoints() {
  const [bp, setBp] = useState({ isDesktop: false, isMedium: false });
  useEffect(() => {
    const update = () => {
      setBp({
        isDesktop: window.innerWidth >= 1024,
        isMedium: window.innerWidth >= 640,
      });
    };
    update();
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, []);
  return bp;
}

// ─── Inline SVG icons ─────────────────────────────────────────────────────────
function IconFileText({ size = 24, color = NAVY }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14 2 14 8 20 8" />
      <line x1="16" y1="13" x2="8" y2="13" />
      <line x1="16" y1="17" x2="8" y2="17" />
      <line x1="10" y1="9" x2="8" y2="9" />
    </svg>
  );
}

function IconBarChart({ size = 24, color = NAVY }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="14" width="4" height="7" />
      <rect x="9" y="9" width="4" height="12" />
      <rect x="16" y="4" width="4" height="17" />
    </svg>
  );
}

function IconClipboardList({ size = 24, color = NAVY }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="8" y="2" width="8" height="4" rx="1" ry="1" />
      <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />
      <line x1="9" y1="11" x2="15" y2="11" />
      <line x1="9" y1="15" x2="15" y2="15" />
      <polyline points="9 7 9 9" />
    </svg>
  );
}

// ─── Stepper ──────────────────────────────────────────────────────────────────
function Stepper({ steps, isDesktop }) {
  const circleSize = 32;

  if (isDesktop) {
    return (
      <div
        style={{
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
          maxWidth: 600,
          margin: '0 auto',
          position: 'relative',
        }}
      >
        {steps.map((step, idx) => {
          const isLast = idx === steps.length - 1;
          return (
            <div
              key={step.label}
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                flex: 1,
                position: 'relative',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', width: '100%' }}>
                <div style={{ flex: 1, height: 2, backgroundColor: idx === 0 ? 'transparent' : `${NAVY}33` }} />
                <div
                  style={{
                    width: circleSize,
                    height: circleSize,
                    borderRadius: '50%',
                    border: `2px solid ${NAVY}`,
                    backgroundColor: step.completed ? NAVY : PARCHMENT,
                    color: step.completed ? PARCHMENT : NAVY,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontFamily: SOURCE,
                    fontWeight: 600,
                    fontSize: 14,
                    flexShrink: 0,
                  }}
                >
                  {idx + 1}
                </div>
                <div style={{ flex: 1, height: 2, backgroundColor: isLast ? 'transparent' : `${NAVY}33` }} />
              </div>
              <span
                style={{
                  fontFamily: SOURCE,
                  fontSize: 13,
                  color: NAVY,
                  opacity: 0.7,
                  marginTop: 8,
                  textAlign: 'center',
                }}
              >
                {step.label}
              </span>
            </div>
          );
        })}
      </div>
    );
  }

  // Mobile: vertical layout
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'flex-start',
        gap: 0,
      }}
    >
      {steps.map((step, idx) => {
        const isLast = idx === steps.length - 1;
        return (
          <div
            key={step.label}
            style={{
              display: 'flex',
              alignItems: 'flex-start',
              gap: 12,
            }}
          >
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                flexShrink: 0,
              }}
            >
              <div
                style={{
                  width: circleSize,
                  height: circleSize,
                  borderRadius: '50%',
                  border: `2px solid ${NAVY}`,
                  backgroundColor: step.completed ? NAVY : PARCHMENT,
                  color: step.completed ? PARCHMENT : NAVY,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontFamily: SOURCE,
                  fontWeight: 600,
                  fontSize: 14,
                }}
              >
                {idx + 1}
              </div>
              {!isLast && (
                <div
                  style={{
                    width: 2,
                    height: 32,
                    backgroundColor: `${NAVY}33`,
                  }}
                />
              )}
            </div>
            <span
              style={{
                fontFamily: SOURCE,
                fontSize: 13,
                color: NAVY,
                opacity: 0.7,
                paddingTop: 6,
                paddingBottom: isLast ? 0 : 32,
              }}
            >
              {step.label}
            </span>
          </div>
        );
      })}
    </div>
  );
}

// ─── Tool Card ────────────────────────────────────────────────────────────────
function ToolCard({ icon, title, description, href, badgeLabel, badgeVariant }) {
  let chipBg, chipColor;
  if (badgeVariant === 'complete') {
    chipBg = GREEN;
    chipColor = WHITE;
  } else if (badgeVariant === 'inprogress') {
    chipBg = `${AMBER}22`;
    chipColor = AMBER;
  } else {
    chipBg = `${NAVY}18`;
    chipColor = `${NAVY}99`;
  }

  return (
    <Link
      href={href}
      style={{ textDecoration: 'none', display: 'block' }}
    >
      <div
        style={{
          backgroundColor: WHITE,
          border: `1px solid ${NAVY}1A`,
          borderRadius: 12,
          padding: 24,
          cursor: 'pointer',
          transition: 'box-shadow 0.2s ease',
          height: '100%',
          boxSizing: 'border-box',
          fontFamily: SOURCE,
          color: NAVY,
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.boxShadow = `0 4px 16px ${NAVY}14`;
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.boxShadow = 'none';
        }}
      >
        {/* Icon + badge row */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <div
            style={{
              width: 40,
              height: 40,
              borderRadius: 8,
              backgroundColor: `${NAVY}0C`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            {icon}
          </div>
          <span
            style={{
              backgroundColor: chipBg,
              color: chipColor,
              borderRadius: 20,
              padding: '4px 12px',
              fontFamily: SOURCE,
              fontWeight: 600,
              fontSize: 12,
            }}
          >
            {badgeLabel}
          </span>
        </div>

        {/* Title */}
        <h3
          style={{
            fontFamily: PLAYFAIR,
            fontWeight: 700,
            fontSize: 18,
            color: NAVY,
            margin: 0,
            marginBottom: 8,
          }}
        >
          {title}
        </h3>

        {/* Description */}
        <p
          style={{
            fontFamily: SOURCE,
            fontSize: 14,
            color: NAVY,
            opacity: 0.7,
            margin: 0,
            lineHeight: 1.5,
          }}
        >
          {description}
        </p>

        {/* Arrow */}
        <div
          style={{
            marginTop: 16,
            textAlign: 'right',
            fontFamily: SOURCE,
            fontWeight: 600,
            fontSize: 16,
            color: GOLD,
          }}
        >
          →
        </div>
      </div>
    </Link>
  );
}

// ─── Dismissable Callout ──────────────────────────────────────────────────────
function DismissableCallout({ text, onDismiss }) {
  return (
    <div
      style={{
        backgroundColor: '#FDF8EF',
        borderLeft: `3px solid ${GOLD}`,
        padding: '12px 16px',
        borderRadius: '0 8px 8px 0',
        fontFamily: SOURCE,
        fontSize: 14,
        color: NAVY,
        lineHeight: 1.5,
        marginBottom: 12,
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'space-between',
        gap: 12,
      }}
    >
      <span>{text}</span>
      <button
        onClick={onDismiss}
        style={{
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          color: `${NAVY}66`,
          fontFamily: SOURCE,
          fontSize: 16,
          lineHeight: 1,
          padding: '0 2px',
          flexShrink: 0,
        }}
        aria-label="Dismiss"
      >
        ×
      </button>
    </div>
  );
}

// ─── Data Flow Callout (non-dismissable) ─────────────────────────────────────
function DataFlowCallout() {
  return (
    <div
      style={{
        backgroundColor: `${NAVY}08`,
        border: `1px solid ${NAVY}18`,
        borderRadius: 8,
        padding: '12px 16px',
        fontFamily: SOURCE,
        fontSize: 14,
        color: NAVY,
        lineHeight: 1.5,
      }}
    >
      Your tools build on each other: income from the Pay Stub Decoder flows into the Budget Modeler, and both feed the Financial Affidavit Builder. Complete them in order for the best experience.
    </div>
  );
}

// ─── Progress badge helpers ───────────────────────────────────────────────────
function hasBudgetColumnData(column) {
  return Object.values(column).some((category) =>
    Object.values(category).some((v) => v > 0)
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────
export default function M3ModulePage({ userTier = 'essentials' }) {
  const { isDesktop, isMedium } = useBreakpoints();

  // Hydration guard (Zustand persist SSR safety)
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => {
    setHydrated(true);
  }, []);

  // Store selectors
  const payStubDecoder = useM3Store((s) => s.payStubDecoder);
  const budgetModeler = useM3Store((s) => s.budgetModeler);
  const affidavitBuilder = useM3Store((s) => s.affidavitBuilder);
  const m1DomainScores = useM1Store(
    (s) => s.readinessAssessment?.results?.domainScores ?? null
  );

  // Gap message dismiss state
  const [budgetAwarenessDismissed, setBudgetAwarenessDismissed] = useState(false);
  const [debtAwarenessDismissed, setDebtAwarenessDismissed] = useState(false);

  if (!hydrated) {
    return (
      <div style={{ padding: 24, fontFamily: SOURCE, color: NAVY }}>
        Loading…
      </div>
    );
  }

  // ─── Pay Stub badge ──────────────────────────────────────────────────────
  const payStubInputted =
    payStubDecoder.inputs.payFrequency !== null ||
    payStubDecoder.inputs.grossPayPerCheck !== null;
  let payStubBadgeLabel, payStubBadgeVariant;
  if (payStubDecoder.completed) {
    payStubBadgeLabel = 'Complete ✓';
    payStubBadgeVariant = 'complete';
  } else if (payStubInputted) {
    payStubBadgeLabel = 'In progress';
    payStubBadgeVariant = 'inprogress';
  } else {
    payStubBadgeLabel = 'Not started';
    payStubBadgeVariant = 'notstarted';
  }

  // ─── Budget Modeler badge ────────────────────────────────────────────────
  const budgetHasData =
    hasBudgetColumnData(budgetModeler.current) ||
    hasBudgetColumnData(budgetModeler.projected);
  let budgetBadgeLabel, budgetBadgeVariant;
  if (budgetModeler.results !== null) {
    budgetBadgeLabel = 'Complete ✓';
    budgetBadgeVariant = 'complete';
  } else if (budgetHasData) {
    budgetBadgeLabel = 'In progress';
    budgetBadgeVariant = 'inprogress';
  } else {
    budgetBadgeLabel = 'Not started';
    budgetBadgeVariant = 'notstarted';
  }

  // ─── Affidavit Builder badge ─────────────────────────────────────────────
  const { incomeComplete, expensesComplete, assetsComplete, liabilitiesComplete } =
    affidavitBuilder.progress;
  const affidavitAllComplete =
    incomeComplete && expensesComplete && assetsComplete && liabilitiesComplete;
  const affidavitHasData =
    incomeComplete ||
    expensesComplete ||
    assetsComplete ||
    liabilitiesComplete ||
    affidavitBuilder.sections.income.netMonthlyIncomeAllSources > 0 ||
    affidavitBuilder.sections.expenses.totalMonthlyExpenses > 0 ||
    affidavitBuilder.sections.assets.loaded ||
    affidavitBuilder.sections.liabilities.loaded;
  let affidavitBadgeLabel, affidavitBadgeVariant;
  if (affidavitAllComplete) {
    affidavitBadgeLabel = 'Complete ✓';
    affidavitBadgeVariant = 'complete';
  } else if (affidavitHasData) {
    affidavitBadgeLabel = 'In progress';
    affidavitBadgeVariant = 'inprogress';
  } else {
    affidavitBadgeLabel = 'Not started';
    affidavitBadgeVariant = 'notstarted';
  }

  // ─── Stepper steps ───────────────────────────────────────────────────────
  const steps = [
    { label: 'Decode Your Pay Stub', completed: payStubDecoder.completed },
    { label: 'Model Your Budget', completed: budgetModeler.completed },
    { label: 'Build Your Affidavit', completed: affidavitBuilder.completed },
  ];

  // ─── Card grid columns ───────────────────────────────────────────────────
  const cardGridStyle = {
    display: 'grid',
    gridTemplateColumns: isDesktop ? 'repeat(3, 1fr)' : isMedium ? 'repeat(2, 1fr)' : '1fr',
    gap: 16,
  };

  return (
    <div
      style={{
        backgroundColor: PARCHMENT,
        minHeight: '100vh',
        fontFamily: SOURCE,
        color: NAVY,
        padding: isDesktop ? '60px 40px' : '40px 20px',
      }}
    >
      <div style={{ maxWidth: 960, margin: '0 auto' }}>

        {/* Back link */}
        <Link
          href="/dashboard"
          style={{
            fontFamily: SOURCE,
            fontSize: 14,
            color: NAVY,
            opacity: 0.6,
            textDecoration: 'none',
            display: 'inline-block',
            marginBottom: 24,
          }}
        >
          ← Back to Dashboard
        </Link>

        {/* Section 1 — Module header */}
        <section>
          <h1
            style={{
              fontFamily: PLAYFAIR,
              fontWeight: 700,
              fontSize: 28,
              color: NAVY,
              margin: 0,
            }}
          >
            Know What You Spend
          </h1>
          <p
            style={{
              fontFamily: SOURCE,
              fontSize: 16,
              color: NAVY,
              opacity: 0.78,
              maxWidth: 640,
              margin: 0,
              marginTop: 12,
              lineHeight: 1.5,
            }}
          >
            Understand your income, track your expenses, and prepare the financial
            data your attorney needs.
          </p>
        </section>

        {/* Section 2 — Stepper */}
        <section style={{ marginTop: 32 }}>
          <Stepper steps={steps} isDesktop={isDesktop} />
        </section>

        {/* Section 3 — Tool cards */}
        <section style={{ marginTop: 40 }}>
          <div
            style={{
              fontFamily: SOURCE,
              fontWeight: 600,
              fontSize: 13,
              color: NAVY,
              opacity: 0.5,
              textTransform: 'uppercase',
              letterSpacing: '0.08em',
              marginBottom: 16,
            }}
          >
            Your Tools
          </div>
          <div style={cardGridStyle}>
            <ToolCard
              icon={<IconFileText size={20} color={NAVY} />}
              title="Pay Stub Decoder"
              description="Learn to read your pay stub correctly — pay frequency, deductions, and take-home pay."
              href="/modules/m3/pay-stub"
              badgeLabel={payStubBadgeLabel}
              badgeVariant={payStubBadgeVariant}
            />
            <ToolCard
              icon={<IconBarChart size={20} color={NAVY} />}
              title="Budget Modeler"
              description="Compare your current household expenses to what life will cost on your own."
              href="/modules/m3/budget"
              badgeLabel={budgetBadgeLabel}
              badgeVariant={budgetBadgeVariant}
            />
            <ToolCard
              icon={<IconClipboardList size={20} color={NAVY} />}
              title="Financial Affidavit Builder"
              description="Organize your income, expenses, assets, and liabilities in the format your attorney needs."
              href="/modules/m3/affidavit"
              badgeLabel={affidavitBadgeLabel}
              badgeVariant={affidavitBadgeVariant}
            />
          </div>
        </section>

        {/* Section 4 — Data flow callout */}
        <section style={{ marginTop: 24 }}>
          <DataFlowCallout />
        </section>

        {/* Section 5 — M1 domain score gap messages */}
        {m1DomainScores && (
          <section style={{ marginTop: 16 }}>
            {m1DomainScores.budgetAwareness != null &&
              m1DomainScores.budgetAwareness <= 3 &&
              !budgetAwarenessDismissed && (
                <DismissableCallout
                  text="Your budget awareness score suggests this module will be especially valuable. Many women discover expenses they didn't know about."
                  onDismiss={() => setBudgetAwarenessDismissed(true)}
                />
              )}
            {m1DomainScores.debtAwareness != null &&
              m1DomainScores.debtAwareness <= 3 &&
              !debtAwarenessDismissed && (
                <DismissableCallout
                  text="Your debt awareness score is low — the Budget Modeler and Affidavit Builder will help you identify and organize all obligations."
                  onDismiss={() => setDebtAwarenessDismissed(true)}
                />
              )}
          </section>
        )}

      </div>
    </div>
  );
}
