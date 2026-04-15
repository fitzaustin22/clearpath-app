'use client';

import { useEffect, useMemo, useState } from 'react';
import { useUser } from '@clerk/nextjs';
import { useRouter } from 'next/navigation';
import useBlueprintStore from '@/src/stores/blueprintStore';
import BlueprintSection from '@/src/components/blueprint/BlueprintSection';
import S1PersonalProfile from '@/src/components/blueprint/sections/S1PersonalProfile';
import S2IncomeAnalysis from '@/src/components/blueprint/sections/S2IncomeAnalysis';
import S3AssetInventory from '@/src/components/blueprint/sections/S3AssetInventory';
import S4TaxAnalysis from '@/src/components/blueprint/sections/S4TaxAnalysis';
import S5PropertyDivision from '@/src/components/blueprint/sections/S5PropertyDivision';
import S6RetirementDivision from '@/src/components/blueprint/sections/S6RetirementDivision';
import S7ExpenseAnalysis from '@/src/components/blueprint/sections/S7ExpenseAnalysis';
import S8SupportAnalysis from '@/src/components/blueprint/sections/S8SupportAnalysis';
import S9HomeDecision from '@/src/components/blueprint/sections/S9HomeDecision';
import S10NegotiationStrategy from '@/src/components/blueprint/sections/S10NegotiationStrategy';
import S11SettlementEvaluation from '@/src/components/blueprint/sections/S11SettlementEvaluation';
import S12ActionPlan from '@/src/components/blueprint/sections/S12ActionPlan';

const NAVY = '#1B2A4A';
const GOLD = '#C8A96E';
const PARCHMENT = '#FAF8F2';

const SECTION_ORDER = ['s1', 's2', 's3', 's4', 's5', 's6', 's7', 's8', 's9', 's10', 's11', 's12'];

const MODULE_NAMES = {
  m1: 'Module 1',
  m2: 'Module 2',
  m3: 'Module 3',
  m4: 'Module 4',
  m5: 'Module 5',
  m6: 'Module 6',
  m7: 'Module 7',
  'm2+m4': 'Modules 2 and 4',
};

const SECTION_RENDERERS = {
  s1: S1PersonalProfile,
  s2: S2IncomeAnalysis,
  s3: S3AssetInventory,
  s4: S4TaxAnalysis,
  s5: S5PropertyDivision,
  s6: S6RetirementDivision,
  s7: S7ExpenseAnalysis,
  s8: S8SupportAnalysis,
  s9: S9HomeDecision,
  s10: S10NegotiationStrategy,
  s11: S11SettlementEvaluation,
  s12: S12ActionPlan,
};

function formatLastUpdated(iso) {
  if (!iso) return 'Not yet started';
  try {
    const d = new Date(iso);
    return d.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
  } catch {
    return 'Not yet started';
  }
}

function computeBackLabel(referrer) {
  if (typeof referrer !== 'string' || referrer.length === 0) {
    return { label: '← Back to Dashboard', dest: '/dashboard' };
  }
  const modMatch = referrer.match(/\/modules\/m(\d+)/);
  if (modMatch) {
    return { label: `← Back to Module ${modMatch[1]}`, dest: null };
  }
  if (referrer.includes('/dashboard')) {
    return { label: '← Back to Dashboard', dest: '/dashboard' };
  }
  return { label: '← Back to Dashboard', dest: '/dashboard' };
}

function statusMessage(completedCount, sections) {
  const nextSection = SECTION_ORDER.map((k) => sections[k]).find((s) => s.status !== 'complete');
  const nextLabel = nextSection ? MODULE_NAMES[nextSection.sourceModule] || 'the next module' : '';

  if (completedCount === 0) {
    return 'Your Blueprint is ready to build. Start with Module 1 to begin.';
  }
  if (completedCount >= 1 && completedCount <= 3) {
    return `${completedCount} of 12 sections populated. Continue with ${nextLabel} to add more.`;
  }
  if (completedCount >= 4 && completedCount <= 7) {
    return `Your financial picture is taking shape. ${completedCount} of 12 sections populated.`;
  }
  if (completedCount >= 8 && completedCount <= 11) {
    return `Almost there. ${completedCount} of 12 sections populated.`;
  }
  return 'Your Blueprint is complete. Module 7 will generate the final document.';
}

export default function BlueprintView() {
  const router = useRouter();
  const { user } = useUser();

  const sections = useBlueprintStore((state) => state.sections);
  const lastUpdated = useBlueprintStore((state) => state.lastUpdated);
  const getCompletedCount = useBlueprintStore((state) => state.getCompletedCount);
  const getProgressLabel = useBlueprintStore((state) => state.getProgressLabel);

  const [hydrated, setHydrated] = useState(false);
  const [back, setBack] = useState({ label: '← Back to Dashboard', dest: '/dashboard' });

  useEffect(() => {
    if (useBlueprintStore.persist?.hasHydrated?.()) {
      setHydrated(true);
      return;
    }
    const unsub = useBlueprintStore.persist?.onFinishHydration?.(() => setHydrated(true));
    return unsub;
  }, []);

  useEffect(() => {
    if (typeof document === 'undefined') return;
    setBack(computeBackLabel(document.referrer || ''));
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const hash = window.location.hash;
    if (hash && hash.startsWith('#section-')) {
      const el = document.getElementById(hash.slice(1));
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'start' });
        return;
      }
    }
    window.scrollTo({ top: 0, behavior: 'auto' });
  }, [hydrated]);

  const handleBack = () => {
    if (typeof window !== 'undefined' && window.history.length > 1) {
      router.back();
    } else {
      router.push(back.dest || '/dashboard');
    }
  };

  const completed = hydrated ? getCompletedCount() : 0;
  const progressLabel = hydrated ? getProgressLabel() : '0 of 12 sections';
  const userName = user ? `${user.firstName || ''} ${user.lastName || ''}`.trim() : '';
  const lastUpdatedLabel = hydrated ? formatLastUpdated(lastUpdated) : 'Not yet started';
  const statusText = useMemo(
    () => (hydrated ? statusMessage(completed, sections) : statusMessage(0, sections)),
    [hydrated, completed, sections]
  );

  const renderCircle = (key) => {
    const status = hydrated ? sections[key].status : 'empty';
    const base = {
      width: 8,
      height: 8,
      borderRadius: '50%',
      flexShrink: 0,
      display: 'inline-block',
    };
    if (status === 'complete') {
      return <span key={key} style={{ ...base, backgroundColor: GOLD }} aria-label={`${sections[key].label}: complete`} />;
    }
    if (status === 'partial') {
      return (
        <span
          key={key}
          style={{ ...base, backgroundColor: 'transparent', border: `1.5px solid ${GOLD}` }}
          aria-label={`${sections[key].label}: partial`}
        />
      );
    }
    return (
      <span
        key={key}
        style={{ ...base, backgroundColor: 'rgba(27,42,74,0.15)' }}
        aria-label={`${sections[key].label}: empty`}
      />
    );
  };

  return (
    <>
      <style>{`
        @media (max-width: 640px) {
          .clearpath-blueprint-root {
            padding-left: 24px !important;
            padding-right: 24px !important;
          }
          .clearpath-blueprint-title {
            font-size: 28px !important;
          }
        }
        @media print {
          .clearpath-blueprint-root {
            max-width: 100% !important;
            background-image: none !important;
          }
          .clearpath-blueprint-back,
          .clearpath-blueprint-interactive {
            display: none !important;
          }
          .blueprint-section {
            break-inside: avoid;
          }
        }
      `}</style>
      <div
        className="clearpath-blueprint-root"
        style={{
          backgroundColor: '#FFFFFF',
          maxWidth: 720,
          margin: '0 auto',
          paddingLeft: 48,
          paddingRight: 48,
          paddingTop: 40,
          paddingBottom: 120,
          minHeight: '100vh',
          backgroundImage:
            'linear-gradient(rgba(27,42,74,0.02) 1px, transparent 1px), linear-gradient(90deg, rgba(27,42,74,0.02) 1px, transparent 1px)',
          backgroundSize: '20px 20px',
          fontFamily: "var(--font-source-sans), 'Source Sans Pro', sans-serif",
        }}
      >
        <button
          type="button"
          onClick={handleBack}
          className="clearpath-blueprint-back"
          style={{
            background: 'transparent',
            border: 'none',
            padding: 0,
            margin: 0,
            marginBottom: 24,
            fontFamily: 'inherit',
            fontSize: 14,
            fontWeight: 400,
            color: 'rgba(27,42,74,0.6)',
            cursor: 'pointer',
          }}
        >
          {back.label}
        </button>

        <header style={{ marginBottom: 28 }}>
          <h1
            className="clearpath-blueprint-title"
            style={{
              margin: 0,
              fontFamily: "var(--font-playfair), 'Playfair Display', serif",
              fontWeight: 700,
              fontSize: 36,
              lineHeight: 1.15,
              color: NAVY,
            }}
          >
            ClearPath Financial Blueprint
          </h1>
          <p
            style={{
              margin: '12px 0 0 0',
              fontFamily: 'inherit',
              fontWeight: 400,
              fontSize: 18,
              color: 'rgba(27,42,74,0.6)',
            }}
          >
            {userName}
          </p>
          <p
            style={{
              margin: '6px 0 0 0',
              fontFamily: 'inherit',
              fontWeight: 400,
              fontSize: 14,
              color: 'rgba(27,42,74,0.4)',
            }}
          >
            Draft — Last updated {lastUpdatedLabel}
          </p>
        </header>

        <div
          style={{
            backgroundColor: PARCHMENT,
            borderRadius: 8,
            padding: 12,
            marginBottom: 48,
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            flexWrap: 'wrap',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            {SECTION_ORDER.map(renderCircle)}
          </div>
          <span
            style={{
              fontFamily: 'inherit',
              fontWeight: 400,
              fontSize: 14,
              color: 'rgba(27,42,74,0.6)',
            }}
          >
            {progressLabel}
          </span>
        </div>

        <div>
          {SECTION_ORDER.map((key) => {
            const section = sections[key];
            const Renderer = SECTION_RENDERERS[key];
            const number = parseInt(key.replace('s', ''), 10);
            return (
              <BlueprintSection
                key={key}
                id={`section-${number}`}
                number={number}
                label={section.label}
                status={hydrated ? section.status : 'empty'}
                sourceModule={section.sourceModule}
              >
                <Renderer data={section.data} status={section.status} />
              </BlueprintSection>
            );
          })}
        </div>

        <footer style={{ marginTop: 24 }}>
          <div style={{ borderTop: '1px solid rgba(200,169,110,0.4)', paddingTop: 24 }}>
            <h2
              style={{
                margin: 0,
                fontFamily: "var(--font-playfair), 'Playfair Display', serif",
                fontWeight: 700,
                fontSize: 18,
                color: NAVY,
              }}
            >
              Blueprint Status
            </h2>
            <p
              style={{
                margin: '10px 0 0 0',
                fontFamily: 'inherit',
                fontWeight: 400,
                fontSize: 15,
                color: 'rgba(27,42,74,0.6)',
                lineHeight: 1.5,
              }}
            >
              {statusText}
            </p>
          </div>

          <p
            style={{
              marginTop: 48,
              marginBottom: 0,
              fontFamily: 'inherit',
              fontWeight: 400,
              fontSize: 13,
              fontStyle: 'italic',
              color: 'rgba(27,42,74,0.3)',
              lineHeight: 1.5,
            }}
          >
            This document is a working draft for educational and planning purposes only. It
            does not constitute financial, legal, or tax advice. The calculations and
            estimates shown are simplified and may not reflect your actual financial
            situation. For guidance specific to your circumstances, consult a Certified
            Divorce Financial Analyst®, CPA, or attorney.
          </p>
        </footer>
      </div>
    </>
  );
}
