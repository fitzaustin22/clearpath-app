'use client';

// "The Path to Clarity" — the re-skinned logged-in dashboard body. Presentational
// only: it preserves every existing data path. Tier comes from the server page
// (Clerk + Supabase, unchanged) as a prop; module/Blueprint progress comes from
// the real blueprintStore, and ALL states/numbers (station statuses, currentIndex,
// gold-trail length, "N of 12", percent, the next-step card) are derived from it
// via deriveJourney — never from mock arrays.
//
// Server -> client island: the dashboard page is a server component; this reads the
// client-side (localStorage-persisted) blueprintStore, so it hydration-guards
// exactly like BlueprintView — rendering the empty state until the store rehydrates.

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { T } from '@/src/lib/brand/tokens';
import useBlueprintStore from '@/src/stores/blueprintStore';
import { deriveJourney } from './deriveJourney';
import { deriveCopy } from './deriveCopy';
import PathMap from './PathMap';

const PLAYFAIR = "var(--font-playfair), 'Playfair Display', Georgia, serif";

const EYEBROW = {
  fontFamily: T.FONT_BODY, fontSize: 11, fontWeight: 700,
  letterSpacing: 1, textTransform: 'uppercase', color: T.PILL_TEXT,
};

const CSS = `
.cp-dash-focusable:focus { outline: none; }
.cp-dash-focusable:focus-visible {
  outline: none;
  box-shadow: 0 0 0 1.5px ${T.GOLD}, 0 0 0 4px ${T.GOLD_FOCUS_RING};
}
.cp-dash-station:hover .cp-dash-node { transform: translateY(-1px); }
.cp-dash-nextstep:hover .cp-dash-primarybtn { background: #0F1A2E; }
.cp-dash-blueprint:hover { transform: translateY(-1px); box-shadow: 0 6px 18px rgba(27,42,74,0.10); }
.cp-dash-actionrow { display: grid; grid-template-columns: 1.55fr 1fr; gap: 22px; }
.cp-dash-nextstep { display: flex; align-items: center; justify-content: space-between; gap: 20px; }
@media (prefers-reduced-motion: no-preference) {
  .cp-dash-node { transition: transform 120ms ease, box-shadow 120ms ease; }
  .cp-dash-primarybtn { transition: background-color 120ms ease; }
  .cp-dash-blueprint { transition: transform 120ms ease, box-shadow 120ms ease; }
  .cp-dash-trail { stroke-dasharray: 1; stroke-dashoffset: 0; animation: cp-dash-draw 600ms ease-out; }
  @keyframes cp-dash-draw { from { stroke-dashoffset: 1; } to { stroke-dashoffset: 0; } }
  .cp-dash-halo { animation: cp-dash-halo-pulse 600ms ease-out 1; }
  @keyframes cp-dash-halo-pulse {
    0%   { box-shadow: 0 0 0 6px ${T.GOLD_FOCUS_RING}, ${T.SHADOW_CARD}; }
    45%  { box-shadow: 0 0 0 14px rgba(200,169,110,0), ${T.SHADOW_CARD}; }
    100% { box-shadow: 0 0 0 6px ${T.GOLD_FOCUS_RING}, ${T.SHADOW_CARD}; }
  }
}
@media (max-width: 768px) { .cp-dash-actionrow { grid-template-columns: 1fr; } }
@media (max-width: 520px) { .cp-dash-nextstep { flex-direction: column; align-items: flex-start; gap: 14px; } }
`;

function NextStepCard({ nextStep }) {
  return (
    <Link
      href={nextStep.href}
      aria-label={`${nextStep.ctaLabel}: ${nextStep.title}`}
      className="cp-dash-nextstep cp-dash-focusable"
      style={{ textDecoration: 'none', background: T.GOLD_TINT, border: `1px solid ${T.GOLD_BORDER}`, borderRadius: 12, padding: '22px 26px' }}
    >
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={EYEBROW}>Your next step</div>
        <div style={{ fontFamily: T.FONT_DISPLAY, fontWeight: 700, fontSize: 22, color: T.NAVY, margin: '7px 0 3px' }}>{nextStep.title}</div>
        <div style={{ fontFamily: T.FONT_BODY, fontSize: 14, color: T.INK_2, lineHeight: 1.5 }}>{nextStep.blurb}</div>
      </div>
      <span
        className="cp-dash-primarybtn"
        style={{ background: T.NAVY, color: '#fff', borderRadius: 8, padding: '13px 22px', fontFamily: T.FONT_BODY, fontSize: 14, fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: 8, whiteSpace: 'nowrap', flexShrink: 0 }}
      >
        {nextStep.ctaLabel} <ArrowRight size={16} color="#fff" aria-hidden="true" />
      </span>
    </Link>
  );
}

function BlueprintCard({ blueprint }) {
  const { done, total, percent } = blueprint;
  return (
    <Link
      href="/blueprint"
      aria-label={`Your Blueprint: ${done} of ${total} sections complete, ${percent} percent.`}
      className="cp-dash-blueprint cp-dash-focusable"
      style={{ display: 'block', textDecoration: 'none', background: T.CARD, border: `1px solid ${T.LINE}`, borderRadius: 12, padding: '20px 24px', boxShadow: T.SHADOW_CARD }}
    >
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
        <div style={EYEBROW}>Your Blueprint</div>
        <span style={{ fontFamily: T.FONT_BODY, fontSize: 12.5, color: T.MUTED }}>{done} of {total} sections</span>
      </div>
      <div style={{ height: 8, borderRadius: 999, background: T.PARCHMENT_DEEP, margin: '13px 0 10px', overflow: 'hidden' }}>
        <div style={{ width: `${percent}%`, height: '100%', borderRadius: 999, background: `linear-gradient(90deg, ${T.GOLD}, ${T.GOLD_SOFT})` }} />
      </div>
      <div style={{ fontFamily: T.FONT_BODY, fontSize: 13, color: T.INK_2, lineHeight: 1.5 }}>Each step you finish writes another page of your Blueprint.</div>
    </Link>
  );
}

export default function DashboardPathView({ userTier = 'free' }) {
  const sections = useBlueprintStore((s) => s.sections);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    if (useBlueprintStore.persist?.hasHydrated?.()) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- sync hydrate avoids an SSR/client flash; mirrors BlueprintView's hydration guard
      setHydrated(true);
      return undefined;
    }
    const unsub = useBlueprintStore.persist?.onFinishHydration?.(() => setHydrated(true));
    return unsub;
  }, []);

  const journey = deriveJourney({ sections, userTier, hydrated });
  const { headline, subhead } = deriveCopy(journey);
  const tierLabel = userTier.charAt(0).toUpperCase() + userTier.slice(1);

  return (
    <main style={{ background: T.PARCHMENT, minHeight: 'calc(100vh - 140px)' }}>
      <style>{CSS}</style>
      <div style={{ maxWidth: 1240, margin: '0 auto', padding: '40px 56px 26px', display: 'flex', flexDirection: 'column', minHeight: 'calc(100vh - 140px)', boxSizing: 'border-box' }}>
        {/* Header band. The tier pill is preserved verbatim from the prior dashboard
            (navy bg / gold text, capitalised tier) per "do not alter the tier pill". */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16 }}>
          <div style={EYEBROW}>Your path</div>
          <span style={{ backgroundColor: T.NAVY, color: T.GOLD, padding: '4px 12px', borderRadius: 20, fontSize: '0.85rem', fontWeight: 700, whiteSpace: 'nowrap' }}>{tierLabel}</span>
        </div>
        <h1 style={{ fontFamily: PLAYFAIR, fontWeight: 700, fontSize: 38, color: T.NAVY, margin: '10px 0 6px', lineHeight: 1.12, letterSpacing: '-0.01em' }}>{headline}</h1>
        <p style={{ fontFamily: T.FONT_BODY, fontSize: 16, color: T.INK_2, margin: 0, lineHeight: 1.6, maxWidth: 620 }}>{subhead}</p>

        {/* Hero path map — vertically centred in the flex-grow zone. */}
        <div style={{ flex: '1 1 auto', display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '38px 0 30px' }}>
          <PathMap modules={journey.modules} doneTrailEndIndex={journey.doneTrailEndIndex} />
        </div>

        {/* Action row */}
        <div className="cp-dash-actionrow">
          <NextStepCard nextStep={journey.nextStep} />
          <BlueprintCard blueprint={journey.blueprint} />
        </div>

        {/* Compliance disclaimer — quiet, always present, verbatim. */}
        <div style={{ marginTop: 24, display: 'flex', gap: 12, padding: '0 0 0 14px', borderLeft: `2px solid ${T.GOLD}` }}>
          <div>
            <div style={{ fontFamily: T.FONT_BODY, fontSize: 9.5, fontWeight: 700, letterSpacing: 0.9, textTransform: 'uppercase', color: T.PILL_TEXT, marginBottom: 3 }}>Not legal advice</div>
            <div style={{ fontFamily: T.FONT_BODY, fontSize: 11.5, color: T.MUTED, lineHeight: 1.5, maxWidth: 520 }}>ClearPath Divorce Financial LLC is not a law firm and does not provide legal advice.</div>
          </div>
        </div>
      </div>
    </main>
  );
}
