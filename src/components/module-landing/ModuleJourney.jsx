'use client';

// ModuleJourney — the vertical "journey spine" for a module landing page (Primary
// design). A 2px spine runs behind the steps; each step is a 44px numbered node
// beside a worksheet card. There is no existing primitive for the spine/nodes/
// pulse, so this is co-located in the shared module-landing system. The card
// surface reuses WizardCard; the step view-model (status, node style, pulse, CTA
// variant) is computed by deriveModuleJourney and passed in via `steps`. Renders
// N steps (not hardcoded to three). The pulse/grow @keyframes live in the parent
// ModuleLanding CSS (cp-ml-*); this only attaches the class names.

import Link from 'next/link';
import { ArrowRight, Check, Lock } from 'lucide-react';
import { T } from '@/src/lib/brand/tokens';
import WizardCard from '@/src/components/wizard/WizardCard';

// Elevated shadow for the in-progress card. No token exists for this exact value
// (T.SHADOW_CARD is the resting surface); inlined per the design's "elevated card".
const SHADOW_ELEVATED = '0 8px 24px rgba(27, 42, 74, 0.07)';
const PILL_INPROGRESS_BG = 'rgba(200, 169, 110, 0.14)';

function JourneyNode({ node, step, module }) {
  const base = {
    position: 'relative',
    zIndex: 2,
    width: 44,
    height: 44,
    flex: 'none',
    borderRadius: 999,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontFamily: T.FONT_DISPLAY,
    fontWeight: 700,
    fontSize: 18,
  };

  if (node === 'locked') {
    // Locked node: the lock glyph replaces the number on a parchment-deep fill, at
    // the SAME 44px node size as every other node (no resize). No border — it reads
    // quieter than the outlined not-started/next nodes. Gold-brown stroke (PILL_TEXT).
    return (
      <div
        data-testid={`${module}-locked-node`}
        style={{ ...base, background: T.PARCHMENT_DEEP, color: T.PILL_TEXT }}
      >
        <Lock size={20} strokeWidth={2.2} aria-hidden="true" />
      </div>
    );
  }
  if (node === 'active') {
    return (
      <div
        className="cp-ml-pulse"
        style={{ ...base, background: T.GOLD, border: `2px solid ${T.GOLD}`, color: T.NAVY }}
      >
        {step}
      </div>
    );
  }
  if (node === 'complete') {
    return (
      <div style={{ ...base, background: T.GOLD, border: `2px solid ${T.GOLD}`, color: T.NAVY }}>
        <Check size={20} strokeWidth={2.5} aria-hidden="true" />
      </div>
    );
  }
  if (node === 'next') {
    return (
      <div style={{ ...base, background: T.CARD, border: `2px solid ${T.GOLD}`, color: T.NAVY }}>
        {step}
      </div>
    );
  }
  // 'muted'
  return (
    <div style={{ ...base, background: T.CARD, border: `2px solid ${T.LINE}`, color: T.MUTED }}>
      {step}
    </div>
  );
}

function StatusPill({ status }) {
  const base = {
    flex: 'none',
    whiteSpace: 'nowrap',
    fontSize: 11,
    borderRadius: 999,
    padding: '5px 12px',
    marginTop: 2,
  };
  if (status === 'in_progress') {
    return (
      <span
        style={{
          ...base,
          display: 'inline-flex',
          alignItems: 'center',
          gap: 6,
          fontWeight: 700,
          color: T.PILL_TEXT,
          background: PILL_INPROGRESS_BG,
          border: `1px solid ${T.GOLD_BORDER}`,
        }}
      >
        <span style={{ width: 6, height: 6, borderRadius: 999, background: T.GOLD }} />
        In progress
      </span>
    );
  }
  if (status === 'complete') {
    return (
      <span
        style={{
          ...base,
          display: 'inline-flex',
          alignItems: 'center',
          gap: 5,
          fontWeight: 700,
          color: T.PILL_TEXT,
          background: T.PARCHMENT_DEEP,
          border: `1px solid ${T.GOLD_BORDER}`,
        }}
      >
        <Check size={12} strokeWidth={2.5} aria-hidden="true" />
        Complete
      </span>
    );
  }
  // not_started
  return (
    <span
      style={{
        ...base,
        fontWeight: 600,
        color: T.INK_2,
        background: T.PARCHMENT,
        border: `1px solid ${T.LINE}`,
      }}
    >
      Not started
    </span>
  );
}

function WorksheetProgress({ pct }) {
  const value = Math.round(pct);
  return (
    <div style={{ marginBottom: 18 }}>
      <div
        style={{
          display: 'flex',
          alignItems: 'baseline',
          justifyContent: 'space-between',
          marginBottom: 7,
        }}
      >
        <span
          style={{
            fontSize: 11,
            fontWeight: 700,
            textTransform: 'uppercase',
            letterSpacing: '0.6px',
            color: T.INK_2,
          }}
        >
          Worksheet progress
        </span>
        <span style={{ fontFamily: T.FONT_DISPLAY, fontWeight: 700, fontSize: 15, color: T.NAVY }}>
          {value}% complete
        </span>
      </div>
      <div style={{ height: 8, borderRadius: 999, background: T.PARCHMENT_DEEP, overflow: 'hidden' }}>
        <div
          className="cp-ml-grow"
          style={{
            height: '100%',
            width: `${value}%`,
            borderRadius: 999,
            background: `linear-gradient(90deg, ${T.GOLD}, ${T.GOLD_SOFT})`,
            transformOrigin: 'left',
          }}
        />
      </div>
    </div>
  );
}

function WorksheetCTA({ href, label, variant }) {
  const base = {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 8,
    fontSize: 14,
    fontWeight: 600,
    textDecoration: 'none',
    borderRadius: 8,
    padding: '10px 18px',
  };
  const variantStyle =
    variant === 'primary'
      ? { background: T.GOLD, color: T.NAVY }
      : { background: T.CARD, color: T.NAVY, border: `1px solid ${T.LINE_STRONG}` };
  return (
    <Link
      href={href}
      className={variant === 'primary' ? 'cp-ml-cta-primary' : 'cp-ml-cta-secondary'}
      style={{ ...base, ...variantStyle }}
    >
      {label}
      <ArrowRight size={15} aria-hidden="true" />
    </Link>
  );
}

// Option C — quiet inline unlock. A locked worksheet is a soft gold-tint card (no
// shadow) holding the tool name (clear navy, NOT greyed), a single "Included in Full
// Access" sub-line, and one understated "Unlock →" link routing to the upgrade
// target. No progress bar, no benefit bullets, no pricing, no button — the sidebar
// Full Access card is the only place that sells. Spec: locked-worksheet handoff README.
function LockedWorksheetCard({ step, module }) {
  return (
    <div
      data-testid={`${module}-locked-card`}
      style={{
        flex: 1,
        display: 'flex',
        alignItems: 'center',
        gap: 14,
        background: T.GOLD_TINT,
        border: `1px solid ${T.GOLD_BORDER}`,
        borderRadius: 12,
        padding: '15px 18px',
        // Intentionally no boxShadow — quieter than the active/resting cards.
      }}
    >
      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          style={{
            fontFamily: T.FONT_DISPLAY,
            fontWeight: 600,
            fontSize: 17,
            color: T.NAVY,
          }}
        >
          {step.title}
        </div>
        <div
          style={{
            fontFamily: T.FONT_BODY,
            fontSize: 12.5,
            color: T.PILL_TEXT,
            marginTop: 2,
          }}
        >
          {step.subLine}
        </div>
      </div>
      <Link
        href={step.href}
        className="cp-ml-elink"
        style={{
          flex: 'none',
          whiteSpace: 'nowrap',
          display: 'inline-flex',
          alignItems: 'center',
          gap: 5,
          fontFamily: T.FONT_BODY,
          fontSize: 13,
          fontWeight: 700,
          color: T.PILL_TEXT,
          textDecoration: 'none',
        }}
      >
        {step.ctaLabel}
        <ArrowRight size={14} aria-hidden="true" />
      </Link>
    </div>
  );
}

function JourneyStep({ step, isLast, module }) {
  // Locked: the Option C quiet treatment (lock node + gold-tint unlock card). This
  // arm only fires for a worksheet the config marked `gated` for a user below the
  // tier gate — no shipped module does, so M2/M3 never reach it (byte-identical).
  if (step.status === 'locked') {
    return (
      <div
        style={{
          position: 'relative',
          display: 'flex',
          gap: 22,
          marginBottom: isLast ? 0 : 18,
        }}
      >
        <JourneyNode node="locked" step={step.step} module={module} />
        <LockedWorksheetCard step={step} module={module} />
      </div>
    );
  }

  const inProgress = step.status === 'in_progress';
  const eyebrowColor = inProgress ? T.PILL_TEXT : T.MUTED;
  const cardStyle = {
    flex: 1,
    maxWidth: 'none',
    padding: '22px 24px',
    ...(inProgress
      ? { border: `1px solid ${T.GOLD_BORDER}`, boxShadow: SHADOW_ELEVATED }
      : {}),
  };

  return (
    <div
      style={{
        position: 'relative',
        display: 'flex',
        gap: 22,
        marginBottom: isLast ? 0 : 18,
      }}
    >
      <JourneyNode node={step.node} step={step.step} module={module} />
      <WizardCard style={cardStyle} data-testid={`${module}-journey-card`}>
        <div
          style={{
            display: 'flex',
            alignItems: 'flex-start',
            justifyContent: 'space-between',
            gap: 16,
            marginBottom: 8,
          }}
        >
          <div>
            <div
              style={{
                fontSize: 10.5,
                fontWeight: 700,
                textTransform: 'uppercase',
                letterSpacing: '0.9px',
                color: eyebrowColor,
                marginBottom: 6,
              }}
            >
              {step.eyebrow}
            </div>
            <h3
              style={{
                fontFamily: T.FONT_DISPLAY,
                fontWeight: 600,
                fontSize: 21,
                color: T.NAVY,
                margin: 0,
              }}
            >
              {step.title}
            </h3>
          </div>
          <StatusPill status={step.status} />
        </div>
        <p
          style={{
            fontSize: 14,
            lineHeight: 1.55,
            color: T.INK_2,
            margin: `0 0 ${inProgress ? 16 : 18}px`,
          }}
        >
          {step.description}
        </p>
        {inProgress && <WorksheetProgress pct={step.progress} />}
        <WorksheetCTA href={step.href} label={step.ctaLabel} variant={step.ctaVariant} />
      </WizardCard>
    </div>
  );
}

export default function ModuleJourney({ steps, spineGoldPct = 0, module = 'module' }) {
  const stop = Math.max(0, Math.min(100, spineGoldPct));
  return (
    <div style={{ position: 'relative' }} data-testid={`${module}-journey`}>
      {/* The spine: gold from the top down to the journey-progress mark, then hairline. */}
      <div
        aria-hidden="true"
        style={{
          position: 'absolute',
          left: 21,
          top: 24,
          bottom: 24,
          width: 2,
          background: `linear-gradient(${T.GOLD} 0%, ${T.GOLD} ${stop}%, ${T.LINE} ${stop}%, ${T.LINE} 100%)`,
        }}
      />
      {steps.map((step, i) => (
        <JourneyStep
          key={step.key}
          step={step}
          isLast={i === steps.length - 1}
          module={module}
        />
      ))}
    </div>
  );
}
