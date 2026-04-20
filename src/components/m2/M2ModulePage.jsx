'use client';

import { useEffect, useState } from 'react';
import { useM2Store } from '@/src/stores/m2Store';
import { useM1Store } from '@/src/stores/m1Store';
import M2ToolCard from './M2ToolCard';

// ─── Brand tokens ──────────────────────────────────────────────────────────────
const NAVY = '#1B2A4A';
const GOLD = '#C8A96E';
const PARCHMENT = '#FAF8F2';
const SOURCE = '"Source Sans Pro", -apple-system, system-ui, sans-serif';
const PLAYFAIR = '"Playfair Display", Georgia, serif';

const DOMAIN_LABELS = {
  debtAwareness: 'Debt Awareness',
  assetAwareness: 'Asset Awareness',
  documentAccess: 'Document Access',
};

// ─── Responsive hook ─────────────────────────────────────────────────────────
function useIsDesktop(breakpoint = 640) {
  const [isDesktop, setIsDesktop] = useState(false);
  useEffect(() => {
    const mql = window.matchMedia(`(min-width: ${breakpoint}px)`);
    const update = () => setIsDesktop(mql.matches);
    update();
    mql.addEventListener('change', update);
    return () => mql.removeEventListener('change', update);
  }, [breakpoint]);
  return isDesktop;
}

// ─── Stepper ─────────────────────────────────────────────────────────────────
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

// ─── Tier indicator ──────────────────────────────────────────────────────────
function TierIndicator({ userTier }) {
  let content;
  if (userTier === 'essentials') {
    content = (
      <>
        You have access to all three worksheets. Upgrade to Full Access for AI-guided
        classification and education.{' '}
        <a
          href="/pricing"
          style={{
            color: GOLD,
            textDecoration: 'underline',
            fontWeight: 600,
          }}
        >
          Learn about Full Access →
        </a>
      </>
    );
  } else if (userTier === 'navigator') {
    content = 'You have full access including AI-powered classification and education.';
  } else if (userTier === 'signature') {
    content =
      'You have full access. Your CDFA practitioner will use your inventory data to build your Marital Balance Sheet.';
  } else {
    content = null;
  }

  if (!content) return null;

  return (
    <div
      style={{
        backgroundColor: `${NAVY}08`,
        borderRadius: 8,
        padding: '12px 16px',
        marginTop: 24,
        fontFamily: SOURCE,
        fontSize: 14,
        color: NAVY,
      }}
    >
      {content}
    </div>
  );
}

// ─── Main page ───────────────────────────────────────────────────────────────
export default function M2ModulePage({ userTier = 'essentials' }) {
  const isDesktop = useIsDesktop();

  const documentChecklist = useM2Store((s) => s.documentChecklist);
  const maritalEstateInventory = useM2Store((s) => s.maritalEstateInventory);
  const personalPropertyInventory = useM2Store((s) => s.personalPropertyInventory);
  const m1DomainScores = useM1Store((s) => s.readinessAssessment?.results?.domainScores ?? null);

  const tool1Complete = documentChecklist.overallProgress === 100;
  const tool2Complete = maritalEstateInventory.completenessScore > 90;
  const tool3Complete = personalPropertyInventory.inventoryCompleteness > 80;

  const steps = [
    { label: 'Gather documents', completed: tool1Complete },
    { label: 'Build inventory', completed: tool2Complete },
    { label: 'Personal property', completed: tool3Complete },
  ];

  // ─── M1 domain score gap message ───────────────────────────────────────
  let domainGapMessage = null;
  if (documentChecklist.startedAt === null && m1DomainScores) {
    const weakDomains = [];
    if (m1DomainScores.debtAwareness != null && m1DomainScores.debtAwareness <= 3) {
      weakDomains.push('debtAwareness');
    }
    if (m1DomainScores.assetAwareness != null && m1DomainScores.assetAwareness <= 3) {
      weakDomains.push('assetAwareness');
    }
    if (m1DomainScores.documentAccess != null && m1DomainScores.documentAccess <= 3) {
      weakDomains.push('documentAccess');
    }
    if (weakDomains.length > 0) {
      const labels = weakDomains.map((d) => DOMAIN_LABELS[d]).join(', ');
      domainGapMessage = `Your readiness assessment showed some gaps in ${labels}. That's exactly what Module 2 is designed to fix. Start with the Documentation Checklist.`;
    }
  }

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
            Know What You Own
          </h1>
          <p
            style={{
              fontFamily: SOURCE,
              fontSize: 16,
              color: NAVY,
              opacity: 0.8,
              maxWidth: 640,
              margin: 0,
              marginTop: 12,
              lineHeight: 1.5,
            }}
          >
            Before you can make good decisions about dividing assets, you need a
            complete picture of what exists. This module walks you through three
            steps: gathering your documents, building your asset inventory, and
            cataloging your personal property.
          </p>
        </section>

        {/* Section 2 — Stepper */}
        <section style={{ marginTop: 32 }}>
          <Stepper steps={steps} isDesktop={isDesktop} />
        </section>

        {/* Section 3 — Tier indicator */}
        <TierIndicator userTier={userTier} />

        {/* Section 4 — Tool cards */}
        <section style={{ marginTop: 40 }}>
          {/* M1 domain score gap message — shown on first visit if weak domains detected */}
          {domainGapMessage && (
            <div
              style={{
                backgroundColor: PARCHMENT,
                borderLeft: `3px solid ${GOLD}`,
                padding: 16,
                borderRadius: '0 8px 8px 0',
                fontFamily: SOURCE,
                fontSize: 14,
                color: NAVY,
                lineHeight: 1.5,
                marginTop: 0,
                marginBottom: 16,
              }}
            >
              {domainGapMessage}
            </div>
          )}
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
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: 16,
              alignItems: 'center',
            }}
          >
            <M2ToolCard
              toolNumber={1}
              title="Documentation Checklist"
              description="Track every document you need — tax returns, account statements, deeds, and more."
              href="/modules/m2/checklist"
              progress={documentChecklist.overallProgress}
              startedAt={documentChecklist.startedAt}
              isComplete={tool1Complete}
              isLocked={false}
            />
            <M2ToolCard
              toolNumber={2}
              title="Marital Estate Inventory"
              description="Map every asset and debt, classify them, and see the full picture of your marital estate."
              href="/modules/m2/inventory"
              progress={maritalEstateInventory.completenessScore}
              startedAt={maritalEstateInventory.startedAt}
              isComplete={tool2Complete}
              isLocked={false}
            />
            <M2ToolCard
              toolNumber={3}
              title="Personal Property Inventory"
              description="Go room by room through your household and catalog what's there."
              href="/modules/m2/personal-property"
              progress={personalPropertyInventory.inventoryCompleteness}
              startedAt={personalPropertyInventory.startedAt}
              isComplete={tool3Complete}
              isLocked={false}
            />
          </div>
        </section>

      </div>
    </div>
  );
}
