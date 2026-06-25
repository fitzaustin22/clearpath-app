'use client';

// ModuleLanding — the shared "Primary" module landing layout (sidebar + journey
// spine), extracted from the shipped M2 page so every module landing renders the
// same chrome from a ModuleLandingConfig + a normalized progress array. The
// per-module island resolves the user's tier (server page) and the per-worksheet
// progress (its adapter); this turns config + progress into the screen. Every
// dynamic state (node style, status pill, CTA variant, pulse, spine fill,
// "N of 12", showUpgrade) is derived from those real values via
// deriveModuleJourney — never hardcoded.
//
// Chrome owned elsewhere: the navy header, footer disclaimer, and sticky
// BlueprintBar are provided by the (app) layout; this only reskins the <main>
// body and does NOT repeat the disclaimer. Brand values come from the central
// token map (T); journey/spine specifics live in ModuleJourney. The Blueprint
// count and hydration guard are shared (not module-specific) and live here.

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, ArrowRight, Lock } from 'lucide-react';
import { T } from '@/src/lib/brand/tokens';
import useBlueprintStore from '@/src/stores/blueprintStore';
import ModuleJourney from './ModuleJourney';
import {
  deriveModuleJourney,
  shouldShowUpgrade,
  countBlueprintComplete,
} from './deriveModuleJourney';

const EYEBROW = {
  fontFamily: T.FONT_BODY,
  fontSize: 11,
  fontWeight: 700,
  textTransform: 'uppercase',
  letterSpacing: '0.9px',
  color: T.PILL_TEXT,
};

const CSS = `
.cp-ml-grid { display: grid; grid-template-columns: 1fr 332px; gap: 48px; align-items: start; }
.cp-ml-aside { position: sticky; top: 96px; display: flex; flex-direction: column; gap: 20px; }
.cp-ml-back, .cp-ml-elink { transition: color 120ms ease; }
.cp-ml-back:hover, .cp-ml-elink:hover { color: ${T.GOLD}; }
.cp-ml-cta-primary, .cp-ml-cta-secondary, .cp-ml-promo-btn { transition: background-color 120ms ease, border-color 120ms ease; }
.cp-ml-cta-primary:hover { background: #bb9a59; }
.cp-ml-cta-secondary:hover { border-color: ${T.GOLD}; background: ${T.PARCHMENT}; }
.cp-ml-promo-btn:hover { background: ${T.GOLD_SOFT}; }
@keyframes cp-ml-grow { from { transform: scaleX(0); } to { transform: scaleX(1); } }
@keyframes cp-ml-pulse {
  0% { box-shadow: 0 0 0 0 rgba(200,169,110,.45); }
  70% { box-shadow: 0 0 0 8px rgba(200,169,110,0); }
  100% { box-shadow: 0 0 0 0 rgba(200,169,110,0); }
}
@media (prefers-reduced-motion: no-preference) {
  .cp-ml-grow { animation: cp-ml-grow .6s ease-out; }
  .cp-ml-pulse { animation: cp-ml-pulse 2.4s ease-out infinite; }
}
@media (max-width: 980px) {
  .cp-ml-grid { grid-template-columns: 1fr; }
  .cp-ml-aside { position: static; }
}
@media (max-width: 640px) {
  .cp-ml-container { padding: 24px 20px 48px; }
}
`;

function BlueprintSidebarCard({ module, blueprintComplete, blueprintHref }) {
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
          data-testid={`${module}-blueprint-count`}
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
            data-testid={`${module}-blueprint-tick`}
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
        href={blueprintHref}
        className="cp-ml-elink"
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

function UpgradePromoCard({ upgrade, upgradeHref }) {
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
        {upgrade.headline}
      </p>
      <p style={{ fontSize: 13.5, lineHeight: 1.55, color: 'rgba(255, 255, 255, 0.62)', margin: '0 0 18px' }}>
        {upgrade.body}
      </p>
      <Link
        href={upgradeHref}
        className="cp-ml-promo-btn"
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
        {upgrade.ctaCopy} <ArrowRight size={14} aria-hidden="true" />
      </Link>
    </div>
  );
}

function AskTheoCard({ module }) {
  return (
    <div
      data-testid={`${module}-theo-card`}
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

// Splits a headline into [before, goldWord, after] so the gold-italic accent word
// renders identically to the bespoke M2 markup. The first occurrence is accented —
// configs must use a goldWord that is a unique whole word in `text` (see the
// ModuleLandingConfig.headline typedef), else a substring inside an earlier word
// would be accented.
function splitHeadline({ text, goldWord }) {
  const idx = text.indexOf(goldWord);
  if (idx === -1) return { pre: text, gold: '', post: '' };
  return {
    pre: text.slice(0, idx),
    gold: goldWord,
    post: text.slice(idx + goldWord.length),
  };
}

/**
 * @param {object} props
 * @param {import('./types').ModuleLandingConfig} props.config  static content.
 * @param {Array<{id:string, status:string, pct:number}>} props.progress  normalized
 *        per-worksheet progress from the module's adapter (one entry per worksheet).
 * @param {string} [props.userTier='free']  resolved by the server page (Clerk -> Supabase).
 */
export default function ModuleLanding({ config, progress, userTier = 'free' }) {
  // Hydration guard: the progress adapter and useBlueprintStore persist to
  // localStorage, so the server renders the empty (not-started) state. Render that
  // until mount, then read the real values — server and first client render match
  // (no flash / hydration mismatch). Mirrors DashboardPathView.
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- one-shot post-mount flip; SSR-safe hydration gate, mirrors DashboardPathView
    setHydrated(true);
  }, []);

  const sections = useBlueprintStore((s) => s.sections);

  const journey = deriveModuleJourney({
    worksheets: config.worksheets,
    progress,
    hydrated,
  });
  const blueprintComplete = hydrated ? countBlueprintComplete(sections) : 0;
  const showUpgrade =
    !!config.upgrade && shouldShowUpgrade(userTier, config.tierGate);
  const headline = splitHeadline(config.headline);

  return (
    <main style={{ background: T.PARCHMENT, minHeight: 'calc(100vh - 140px)' }}>
      <style>{CSS}</style>
      <div className="cp-ml-container" style={{ maxWidth: 1180, margin: '0 auto', padding: '32px 40px 64px' }}>
        <Link
          href={config.links.dashboard}
          className="cp-ml-back"
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

        <div className="cp-ml-grid">
          {/* LEFT COLUMN */}
          <div>
            {/* Hero */}
            <div style={{ marginBottom: 36 }}>
              <div style={{ ...EYEBROW, marginBottom: 14 }}>{config.eyebrow}</div>
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
                {headline.pre}
                <span style={{ fontStyle: 'italic', color: T.GOLD }}>{headline.gold}</span>
                {headline.post}
              </h1>
              <p style={{ fontSize: 16, lineHeight: 1.62, color: T.INK_2, maxWidth: 600, margin: 0 }}>
                {config.lead}
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
                {config.readiness.copy}
              </p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {config.readiness.pills.map((gap) => (
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
            <ModuleJourney
              steps={journey.steps}
              spineGoldPct={journey.spineGoldPct}
              module={config.module}
            />
          </div>

          {/* RIGHT SIDEBAR */}
          <aside className="cp-ml-aside">
            <BlueprintSidebarCard
              module={config.module}
              blueprintComplete={blueprintComplete}
              blueprintHref={config.links.blueprint}
            />
            {showUpgrade && (
              <UpgradePromoCard upgrade={config.upgrade} upgradeHref={config.links.upgrade} />
            )}
            <AskTheoCard module={config.module} />
          </aside>
        </div>
      </div>
    </main>
  );
}
