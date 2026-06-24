'use client';

// Module 2 "Know What You Own" landing — Primary design (sidebar + journey spine).
// Presentational client island: the server page (page.jsx) resolves the user's
// tier (Clerk + Supabase) and passes it in; per-worksheet completion comes from
// the real useM2Store and the Blueprint count from useBlueprintStore. Every state
// (node style, status pill, CTA variant, pulse, spine fill, "N of 12", showUpgrade)
// is derived from those real values via deriveModule2Journey — never hardcoded.
//
// Chrome (navy header, footer disclaimer, sticky BlueprintBar) is provided by the
// (app) layout; this only reskins the <main> body and does NOT repeat the
// disclaimer. Brand values come from the central token map (T); journey/spine
// specifics live in ModuleJourney.

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, ArrowRight, Lock } from 'lucide-react';
import { T } from '@/src/lib/brand/tokens';
import { useM2Store } from '@/src/stores/m2Store';
import useBlueprintStore from '@/src/stores/blueprintStore';
import ModuleJourney from './ModuleJourney';
import {
  deriveModule2Journey,
  shouldShowUpgrade,
  countBlueprintComplete,
} from './deriveModule2Journey';

const EYEBROW = {
  fontFamily: T.FONT_BODY,
  fontSize: 11,
  fontWeight: 700,
  textTransform: 'uppercase',
  letterSpacing: '0.9px',
  color: T.PILL_TEXT,
};

// Readiness gaps. Static for v1 (the design shows the three module themes with
// generic copy); the real per-user weak domains live in
// m1Store.readinessAssessment.results.domainScores and can drive these later.
const READINESS_GAPS = ['Debt Awareness', 'Asset Awareness', 'Document Access'];

const CSS = `
.cp-m2-grid { display: grid; grid-template-columns: 1fr 332px; gap: 48px; align-items: start; }
.cp-m2-aside { position: sticky; top: 96px; display: flex; flex-direction: column; gap: 20px; }
.cp-m2-back, .cp-m2-elink { transition: color 120ms ease; }
.cp-m2-back:hover, .cp-m2-elink:hover { color: ${T.GOLD}; }
.cp-m2-cta-primary, .cp-m2-cta-secondary, .cp-m2-promo-btn { transition: background-color 120ms ease, border-color 120ms ease; }
.cp-m2-cta-primary:hover { background: #bb9a59; }
.cp-m2-cta-secondary:hover { border-color: ${T.GOLD}; background: ${T.PARCHMENT}; }
.cp-m2-promo-btn:hover { background: ${T.GOLD_SOFT}; }
@keyframes cp-m2-grow { from { transform: scaleX(0); } to { transform: scaleX(1); } }
@keyframes cp-m2-pulse {
  0% { box-shadow: 0 0 0 0 rgba(200,169,110,.45); }
  70% { box-shadow: 0 0 0 8px rgba(200,169,110,0); }
  100% { box-shadow: 0 0 0 0 rgba(200,169,110,0); }
}
@media (prefers-reduced-motion: no-preference) {
  .cp-m2-grow { animation: cp-m2-grow .6s ease-out; }
  .cp-m2-pulse { animation: cp-m2-pulse 2.4s ease-out infinite; }
}
@media (max-width: 980px) {
  .cp-m2-grid { grid-template-columns: 1fr; }
  .cp-m2-aside { position: static; }
}
@media (max-width: 640px) {
  .cp-m2-container { padding: 24px 20px 48px; }
}
`;

function BlueprintSidebarCard({ blueprintComplete }) {
  return (
    <div
      style={{
        background: T.CARD,
        border: `1px solid ${T.LINE}`,
        borderRadius: 12,
        boxShadow: T.SHADOW_CARD,
        padding: 24,
      }}
    >
      <div style={{ ...EYEBROW, marginBottom: 16 }}>Your Blueprint</div>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 16 }}>
        <span
          data-testid="m2-blueprint-count"
          style={{ fontFamily: T.FONT_DISPLAY, fontWeight: 700, fontSize: 40, lineHeight: 1, color: T.NAVY }}
        >
          {blueprintComplete}
        </span>
        <span style={{ fontSize: 15, color: T.INK_2 }}>of 12 sections</span>
      </div>
      <div style={{ display: 'flex', gap: 5, marginBottom: 18 }}>
        {Array.from({ length: 12 }).map((_, i) => (
          <span
            key={i}
            data-testid="m2-blueprint-tick"
            style={{
              flex: 1,
              height: 6,
              borderRadius: 999,
              background: i < blueprintComplete ? T.GOLD : T.LINE,
            }}
          />
        ))}
      </div>
      <Link
        href="/blueprint"
        className="cp-m2-elink"
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 7,
          fontSize: 13,
          fontWeight: 600,
          color: T.NAVY,
          textDecoration: 'none',
        }}
      >
        View your Blueprint <ArrowRight size={14} aria-hidden="true" />
      </Link>
    </div>
  );
}

function UpgradePromoCard() {
  return (
    <div
      style={{
        background: T.NAVY,
        borderRadius: 12,
        boxShadow: '0 20px 40px rgba(28, 28, 25, 0.10)',
        padding: 24,
        color: '#fff',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
        <span
          style={{
            width: 34,
            height: 34,
            borderRadius: 8,
            background: 'rgba(200, 169, 110, 0.16)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: T.GOLD,
          }}
        >
          <Lock size={17} aria-hidden="true" />
        </span>
        <span style={{ ...EYEBROW, color: T.GOLD }}>Full Access</span>
      </div>
      <p style={{ fontFamily: T.FONT_DISPLAY, fontSize: 18, lineHeight: 1.35, margin: '0 0 8px', color: '#fff' }}>
        Unlock AI-guided classification.
      </p>
      <p style={{ fontSize: 13.5, lineHeight: 1.55, color: 'rgba(255, 255, 255, 0.62)', margin: '0 0 18px' }}>
        You already have all three worksheets. Upgrade for guided classification and education across the
        whole module.
      </p>
      <Link
        href="/upgrade"
        className="cp-m2-promo-btn"
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 8,
          background: T.GOLD,
          color: T.NAVY,
          fontSize: 13.5,
          fontWeight: 600,
          textDecoration: 'none',
          borderRadius: 8,
          padding: '10px 16px',
        }}
      >
        Learn about Full Access <ArrowRight size={14} aria-hidden="true" />
      </Link>
    </div>
  );
}

function AskTheoCard() {
  return (
    <div
      data-testid="m2-theo-card"
      style={{
        background: T.CARD,
        border: `1px solid ${T.LINE}`,
        borderRadius: 12,
        padding: '18px 22px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 12,
      }}
    >
      <div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 3 }}>
          <span style={{ fontSize: 13.5, fontWeight: 600, color: T.NAVY }}>Ask Theo</span>
          <span
            style={{
              fontSize: 10,
              fontWeight: 700,
              textTransform: 'uppercase',
              letterSpacing: '0.7px',
              color: T.PILL_TEXT,
              background: T.PARCHMENT_DEEP,
              borderRadius: 999,
              padding: '3px 9px',
              whiteSpace: 'nowrap',
            }}
          >
            Coming soon
          </span>
        </div>
        <div style={{ fontSize: 13, color: T.MUTED, lineHeight: 1.45 }}>
          Your guided assistant for this module — arriving shortly.
        </div>
      </div>
      <span
        aria-hidden="true"
        style={{
          width: 36,
          height: 36,
          flex: 'none',
          borderRadius: 999,
          background: T.PARCHMENT_DEEP,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontFamily: T.FONT_DISPLAY,
          fontWeight: 700,
          fontSize: 15,
          color: T.PILL_TEXT,
          opacity: 0.55,
        }}
      >
        T
      </span>
    </div>
  );
}

export default function M2ModulePage({ userTier = 'free' }) {
  // Hydration guard: useM2Store / useBlueprintStore persist to localStorage, so
  // the server renders the empty (not-started) state. Render that until mount,
  // then read the real values — server and first client render match (no flash/
  // hydration mismatch). Mirrors DashboardPathView.
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- one-shot post-mount flip; SSR-safe hydration gate, mirrors DashboardPathView
    setHydrated(true);
  }, []);

  const docProgress = useM2Store((s) => s.documentChecklist.overallProgress);
  const meiProgress = useM2Store((s) => s.maritalEstateInventory.completenessScore);
  const ppiProgress = useM2Store((s) => s.personalPropertyInventory.inventoryCompleteness);
  const sections = useBlueprintStore((s) => s.sections);

  const journey = deriveModule2Journey({
    progress: {
      documentChecklist: docProgress,
      maritalEstateInventory: meiProgress,
      personalPropertyInventory: ppiProgress,
    },
    hydrated,
  });
  const blueprintComplete = hydrated ? countBlueprintComplete(sections) : 0;
  const showUpgrade = shouldShowUpgrade(userTier);

  return (
    <main style={{ background: T.PARCHMENT, minHeight: 'calc(100vh - 140px)' }}>
      <style>{CSS}</style>
      <div className="cp-m2-container" style={{ maxWidth: 1180, margin: '0 auto', padding: '32px 40px 64px' }}>
        <Link
          href="/dashboard"
          className="cp-m2-back"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 7,
            fontSize: 13,
            color: T.INK_2,
            textDecoration: 'none',
            marginBottom: 28,
          }}
        >
          <ArrowLeft size={15} aria-hidden="true" /> Back to Dashboard
        </Link>

        <div className="cp-m2-grid">
          {/* LEFT COLUMN */}
          <div>
            {/* Hero */}
            <div style={{ marginBottom: 36 }}>
              <div style={{ ...EYEBROW, marginBottom: 14 }}>Module 02 · Your Tools</div>
              <h1
                style={{
                  fontFamily: T.FONT_DISPLAY,
                  fontWeight: 700,
                  fontSize: 'clamp(32px, 5vw, 44px)',
                  lineHeight: 1.06,
                  letterSpacing: '-0.01em',
                  color: T.NAVY,
                  margin: '0 0 18px',
                }}
              >
                Know what you <span style={{ fontStyle: 'italic', color: T.GOLD }}>own</span>.
              </h1>
              <p style={{ fontSize: 16, lineHeight: 1.62, color: T.INK_2, maxWidth: 600, margin: 0 }}>
                Before you can make good decisions about dividing assets, you need a complete picture of
                what exists. This module walks you through three steps — gathering your documents, building
                your asset inventory, and cataloging your personal property.
              </p>
            </div>

            {/* Readiness callout */}
            <div
              style={{
                position: 'relative',
                background: T.GOLD_TINT,
                border: `1px solid ${T.GOLD_BORDER}`,
                borderRadius: 12,
                padding: '22px 24px 22px 26px',
                overflow: 'hidden',
                marginBottom: 40,
              }}
            >
              <div aria-hidden="true" style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: 3, background: T.GOLD }} />
              <div style={{ ...EYEBROW, marginBottom: 10 }}>From your readiness assessment</div>
              <p style={{ fontSize: 14.5, lineHeight: 1.6, color: T.NAVY, margin: '0 0 14px' }}>
                Your assessment showed some gaps — exactly what Module 2 is designed to close. Start with the
                Documentation Checklist and work down.
              </p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {READINESS_GAPS.map((gap) => (
                  <span
                    key={gap}
                    style={{
                      fontSize: 12,
                      fontWeight: 600,
                      color: T.PILL_TEXT,
                      background: T.PARCHMENT_DEEP,
                      borderRadius: 999,
                      padding: '5px 12px',
                    }}
                  >
                    {gap}
                  </span>
                ))}
              </div>
            </div>

            {/* Path label */}
            <div style={{ ...EYEBROW, color: T.NAVY, marginBottom: 24, display: 'flex', alignItems: 'center', gap: 14 }}>
              The path through this module
              <span aria-hidden="true" style={{ flex: 1, height: 1, background: T.LINE }} />
            </div>

            {/* Worksheet journey */}
            <ModuleJourney steps={journey.steps} spineGoldPct={journey.spineGoldPct} />
          </div>

          {/* RIGHT SIDEBAR */}
          <aside className="cp-m2-aside">
            <BlueprintSidebarCard blueprintComplete={blueprintComplete} />
            {showUpgrade && <UpgradePromoCard />}
            <AskTheoCard />
          </aside>
        </div>
      </div>
    </main>
  );
}
