'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Scale, Calculator, Eye, Lock } from 'lucide-react';
import { useM4Store } from '@/src/stores/m4Store';
import useBlueprintStore from '@/src/stores/blueprintStore';

// ─── Brand tokens ──────────────────────────────────────────────────────────────
const NAVY = '#1B2A4A';
const GOLD = '#C8A96E';
const PARCHMENT = '#FAF8F2';
const WHITE = '#FFFFFF';
const GREEN = '#2D8A4E';
const SOURCE = '"Source Sans Pro", -apple-system, system-ui, sans-serif';
const PLAYFAIR = '"Playfair Display", Georgia, serif';

// ─── Tier helpers ────────────────────────────────────────────────────────────
const LOCKED_TIERS = ['free', 'essentials'];

function getTierState(userTier) {
  if (LOCKED_TIERS.includes(userTier)) return 'locked';
  return 'full';
}

// ─── Responsive hook ─────────────────────────────────────────────────────────
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

// ─── Tool definitions ────────────────────────────────────────────────────────
const TOOLS = [
  {
    id: 'filing-status',
    icon: Scale,
    title: 'Filing Status Optimizer',
    description:
      'Compare how different filing statuses affect your taxes — and why the date of your divorce matters.',
    badgeSection: '§4 Tax Analysis',
    href: '/modules/m4/filing-status',
  },
  {
    id: 'pit-tax-discount',
    icon: Calculator,
    title: 'PIT Tax Discount Calculator',
    description:
      'Calculate the proper tax discount on retirement plan division.',
    badgeSection: '§6 Retirement Plan Division',
    href: '/modules/m4/tax-discount',
  },
  {
    id: 'tax-adjusted-view',
    icon: Eye,
    title: 'Tax-Adjusted Asset View',
    description:
      'Reveal the hidden taxes in your assets — see what your property is really worth after tax.',
    badgeSection: '§5 Property Division',
    href: '/blueprint#section-5',
  },
];

// ─── Tool Card ───────────────────────────────────────────────────────────────
function ToolCard({ icon: Icon, title, description, href, badgeSection, badgeLabel, badgeVariant, locked }) {
  let chipBg, chipColor, chipBorder;
  if (badgeVariant === 'complete') {
    chipBg = GREEN;
    chipColor = WHITE;
    chipBorder = 'none';
  } else if (badgeVariant === 'preview') {
    chipBg = 'transparent';
    chipColor = GOLD;
    chipBorder = `1px solid ${GOLD}`;
  } else {
    chipBg = `${NAVY}18`;
    chipColor = `${NAVY}99`;
    chipBorder = 'none';
  }

  const card = (
    <div
      style={{
        backgroundColor: WHITE,
        border: `1px solid ${NAVY}14`,
        borderRadius: 8,
        padding: 16,
        cursor: locked ? 'default' : 'pointer',
        transition: 'box-shadow 0.2s ease',
        height: '100%',
        boxSizing: 'border-box',
        fontFamily: SOURCE,
        color: NAVY,
        opacity: locked ? 0.5 : 1,
        position: 'relative',
      }}
      onMouseEnter={(e) => {
        if (!locked) e.currentTarget.style.boxShadow = `0 4px 16px ${NAVY}14`;
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.boxShadow = 'none';
      }}
    >
      {/* Lock overlay */}
      {locked && (
        <div
          style={{
            position: 'absolute',
            top: 12,
            right: 12,
            color: `${NAVY}66`,
          }}
        >
          <Lock size={18} />
        </div>
      )}

      {/* Icon + section badge */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
        <div
          style={{
            width: 36,
            height: 36,
            borderRadius: 8,
            backgroundColor: `${NAVY}0C`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
          }}
        >
          <Icon size={18} color={NAVY} />
        </div>
        <span
          style={{
            backgroundColor: `${GOLD}22`,
            color: NAVY,
            borderRadius: 20,
            padding: '2px 8px',
            fontFamily: SOURCE,
            fontWeight: 600,
            fontSize: 11,
          }}
        >
          Builds {badgeSection}
        </span>
      </div>

      {/* Title */}
      <div
        style={{
          fontFamily: SOURCE,
          fontWeight: 600,
          fontSize: 16,
          color: NAVY,
          marginBottom: 6,
        }}
      >
        {title}
      </div>

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

      {/* Status badge */}
      {!locked && (
        <div style={{ marginTop: 12 }}>
          <span
            style={{
              backgroundColor: chipBg,
              color: chipColor,
              border: chipBorder,
              borderRadius: 20,
              padding: '3px 10px',
              fontFamily: SOURCE,
              fontWeight: 600,
              fontSize: 12,
              display: 'inline-block',
            }}
          >
            {badgeLabel}
          </span>
        </div>
      )}
    </div>
  );

  if (locked) return card;

  return (
    <Link href={href} style={{ textDecoration: 'none', display: 'block' }}>
      {card}
    </Link>
  );
}

// ─── Main page ───────────────────────────────────────────────────────────────
export default function M4ModulePage({ userTier = 'essentials' }) {
  const { isDesktop, isMedium } = useBreakpoints();
  const tierState = getTierState(userTier);

  // Hydration guard (Zustand persist SSR safety)
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => {
    setHydrated(true);
  }, []);

  // Store selectors for tool completion
  const filingStatusCompletedAt = useM4Store((s) => s.filingStatusOptimizer.completedAt);
  const pitCompletedAt = useM4Store((s) => s.pitTaxDiscount.completedAt);
  const costBasisEntries = useBlueprintStore((s) => s.costBasisEntries);

  if (!hydrated) {
    return (
      <div style={{ padding: 24, fontFamily: SOURCE, color: NAVY }}>
        Loading…
      </div>
    );
  }

  // ─── Tool badges ─────────────────────────────────────────────────────────
  function getToolBadge(toolId) {
    if (tierState === 'locked') return { label: '', variant: 'notstarted' };

    // Full access
    switch (toolId) {
      case 'filing-status':
        return filingStatusCompletedAt
          ? { label: 'Complete ✓', variant: 'complete' }
          : { label: 'Not started', variant: 'notstarted' };
      case 'pit-tax-discount':
        return pitCompletedAt
          ? { label: 'Complete ✓', variant: 'complete' }
          : { label: 'Not started', variant: 'notstarted' };
      case 'tax-adjusted-view':
        return costBasisEntries.length > 0
          ? { label: 'Complete ✓', variant: 'complete' }
          : { label: 'Not started', variant: 'notstarted' };
      default:
        return { label: 'Not started', variant: 'notstarted' };
    }
  }

  // ─── Header subtitle ────────────────────────────────────────────────────
  const subtitle =
    tierState === 'locked'
      ? 'Module 4 explores the tax implications of divorce — filing status, retirement plan division, and hidden taxes in transferred assets.'
      : "You've built the foundation. Now let's see what you've built — and add your tax picture to it.";

  // ─── Card grid ───────────────────────────────────────────────────────────
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
            Module 4: Tax Landscape
          </h1>
          <p
            style={{
              fontFamily: SOURCE,
              fontSize: 16,
              color: NAVY,
              opacity: 0.7,
              maxWidth: 640,
              margin: 0,
              marginTop: 12,
              lineHeight: 1.5,
            }}
          >
            {subtitle}
          </p>

          {/* Primary CTA — View Your Blueprint (visible for all tiers) */}
          <Link
            href="/blueprint"
            style={{
              display: 'inline-block',
              marginTop: 20,
              backgroundColor: GOLD,
              color: NAVY,
              fontFamily: SOURCE,
              fontWeight: 700,
              fontSize: 15,
              padding: '12px 24px',
              borderRadius: 8,
              textDecoration: 'none',
              letterSpacing: 0.3,
            }}
          >
            View Your Blueprint →
          </Link>
        </section>

        {/* Section 2 — Educational intro */}
        <section style={{ marginTop: 32 }}>
          <p
            style={{
              fontFamily: SOURCE,
              fontSize: 15,
              color: NAVY,
              opacity: 0.7,
              maxWidth: 600,
              margin: 0,
              lineHeight: 1.6,
            }}
          >
            Your marital status on December 31 determines your filing status for the
            entire year. The assets you receive may carry hidden tax liabilities. And
            the traditional method of discounting retirement plans can cost you tens of
            thousands. Module 4 helps you understand all three.
          </p>
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
            {TOOLS.map((tool) => {
              const badge = getToolBadge(tool.id);
              return (
                <ToolCard
                  key={tool.id}
                  icon={tool.icon}
                  title={tool.title}
                  description={tool.description}
                  href={tool.href}
                  badgeSection={tool.badgeSection}
                  badgeLabel={badge.label}
                  badgeVariant={badge.variant}
                  locked={tierState === 'locked'}
                />
              );
            })}
          </div>
        </section>

        {/* Section 4 — Tier-specific CTAs */}
        {tierState === 'locked' && (
          <section style={{ marginTop: 32 }}>
            <div
              style={{
                backgroundColor: `${NAVY}08`,
                border: `1px solid ${NAVY}18`,
                borderRadius: 8,
                padding: '16px 20px',
                fontFamily: SOURCE,
                fontSize: 14,
                color: NAVY,
                lineHeight: 1.5,
              }}
            >
              Unlock with Full Access — full curriculum access for $247/3 months
              <div style={{ marginTop: 12 }}>
                <Link
                  href="/upgrade"
                  style={{
                    display: 'inline-block',
                    backgroundColor: GOLD,
                    color: NAVY,
                    fontFamily: SOURCE,
                    fontWeight: 700,
                    fontSize: 14,
                    padding: '10px 20px',
                    borderRadius: 8,
                    textDecoration: 'none',
                  }}
                >
                  Unlock with Full Access →
                </Link>
              </div>
            </div>
          </section>
        )}

      </div>
    </div>
  );
}
